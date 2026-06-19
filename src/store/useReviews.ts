import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Review, FieldSetting, getDefaultValue } from '@/types';
import { getItem, setItem, REVIEWS_KEY } from '@/store/storage';
import { pushReview, removeReview, addReviewUpdateListener } from './firestoreSync';

// ─── Module-level global state (shared across all hook instances) ─────────────
let globalReviews: Review[] = [];
let globalLoading = true;
const globalListeners = new Set<(reviews: Review[]) => void>();

// One-time Firestore listener registration
let firestoreListenerRegistered = false;

function notifyAll(reviews: Review[]) {
  globalReviews = reviews;
  globalListeners.forEach((l) => l(reviews));
}

function ensureFirestoreListener() {
  if (firestoreListenerRegistered) return;
  firestoreListenerRegistered = true;
  // When Firestore pushes new merged data, update global state
  addReviewUpdateListener((reviews) => {
    globalLoading = false;
    notifyAll(reviews);
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useReviews(fieldSettings: FieldSetting[]) {
  const [reviews, setReviews] = useState<Review[]>(globalReviews);
  const [loading, setLoading] = useState(globalLoading);

  const loadReviews = useCallback(async () => {
    const stored = await getItem<Review[]>(REVIEWS_KEY);
    globalLoading = false;
    notifyAll(stored || []);
  }, []);

  useEffect(() => {
    ensureFirestoreListener();

    const listener = (r: Review[]) => {
      setReviews(r);
      setLoading(false);
    };
    globalListeners.add(listener);

    if (globalLoading) {
      loadReviews();
    } else {
      setReviews(globalReviews);
      setLoading(false);
    }

    return () => { globalListeners.delete(listener); };
  }, [loadReviews]);

  // ─── Save helpers ───────────────────────────────────────────────────────────

  const persistReviews = useCallback(async (updated: Review[]) => {
    notifyAll(updated);
    await setItem(REVIEWS_KEY, updated);
  }, []);

  // ─── Public operations ──────────────────────────────────────────────────────

  const createReview = useCallback(async (): Promise<string> => {
    const now = new Date().toISOString();
    const fields: Record<string, unknown> = {};
    for (const fs of fieldSettings) {
      fields[fs.id] = getDefaultValue(fs.type);
    }
    const newReview: Review = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      fields,
    };
    const updated = [newReview, ...globalReviews];
    await persistReviews(updated);
    // Draft reviews don't need to sync until saved
    return newReview.id;
  }, [fieldSettings, persistReviews]);

  const updateReview = useCallback(async (
    id: string,
    fieldUpdates: Record<string, unknown>,
    extra?: { lat?: number; lng?: number; status?: 'draft' | 'saved' }
  ) => {
    let changedReview: Review | null = null;
    const updated = globalReviews.map((r) => {
      if (r.id !== id) return r;
      changedReview = {
        ...r,
        updatedAt: new Date().toISOString(),
        fields: { ...r.fields, ...fieldUpdates },
        ...(extra?.lat !== undefined ? { lat: extra.lat } : {}),
        ...(extra?.lng !== undefined ? { lng: extra.lng } : {}),
        ...(extra?.status !== undefined ? { status: extra.status } : {}),
      };
      return changedReview;
    });
    await persistReviews(updated);
    // Push to Firestore (only saved reviews, not drafts)
    if (changedReview && (changedReview as Review).status !== 'draft') {
      pushReview(changedReview); // fire-and-forget
    }
  }, [persistReviews]);

  const deleteReview = useCallback(async (id: string) => {
    const updated = globalReviews.filter((r) => r.id !== id);
    await persistReviews(updated);
    removeReview(id); // fire-and-forget
  }, [persistReviews]);

  const getReview = useCallback((id: string): Review | undefined => {
    return globalReviews.find((r) => r.id === id);
  }, []);

  const syncFieldsToReviews = useCallback(async (settings: FieldSetting[]) => {
    let changed = false;
    const updated = globalReviews.map((review) => {
      const newFields = { ...review.fields };
      for (const fs of settings) {
        if (!(fs.id in newFields)) {
          newFields[fs.id] = getDefaultValue(fs.type);
          changed = true;
        }
      }
      const settingIds = new Set(settings.map((s) => s.id));
      for (const key of Object.keys(newFields)) {
        if (!settingIds.has(key)) {
          delete newFields[key];
          changed = true;
        }
      }
      return changed ? { ...review, fields: newFields } : review;
    });
    if (changed) {
      await persistReviews(updated);
    }
  }, [persistReviews]);

  return {
    reviews,
    loading,
    createReview,
    updateReview,
    deleteReview,
    getReview,
    syncFieldsToReviews,
    reload: loadReviews,
  };
}
