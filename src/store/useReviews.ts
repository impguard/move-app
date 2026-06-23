import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Review, FieldSetting, getDefaultValue } from '@/types';
import { createReviewRemote, updateReviewFields, removeReview, addReviewUpdateListener } from './firestoreSync';

// ─── Module-level global state (shared across all hook instances) ─────────────
let globalReviews: Review[] = [];
let globalLoading = true;
const globalListeners = new Set<(reviews: Review[]) => void>();

// One-time Firestore listener registration
let firestoreListenerRegistered = false;

import { migrateReviews } from './migrations';

function notifyAll(reviews: Review[]) {
  const migrated = migrateReviews(reviews);
  globalReviews = migrated;
  globalListeners.forEach((l) => l(migrated));
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

  useEffect(() => {
    ensureFirestoreListener();

    const listener = (r: Review[]) => {
      setReviews(r);
      setLoading(false);
    };
    globalListeners.add(listener);

    if (!globalLoading) {
      setReviews(globalReviews);
      setLoading(false);
    }

    return () => { globalListeners.delete(listener); };
  }, []);

  // ─── Public operations ──────────────────────────────────────────────────────

  const createReview = useCallback(async (
    fieldUpdates: Record<string, unknown>,
    extra?: { lat?: number; lng?: number }
  ): Promise<string> => {
    const now = new Date().toISOString();
    
    const newReview: Review = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      status: 'saved',
      fields: fieldUpdates,
      ...(extra?.lat !== undefined ? { lat: extra.lat } : {}),
      ...(extra?.lng !== undefined ? { lng: extra.lng } : {}),
    };
    
    // Optimistic UI update
    notifyAll([newReview, ...globalReviews]);
    
    createReviewRemote(newReview); // fire-and-forget
    return newReview.id;
  }, []);

  const updateReview = useCallback(async (
    id: string,
    fieldUpdates: Record<string, unknown>,
    extra?: { lat?: number; lng?: number; status?: 'draft' | 'saved' | 'taken' }
  ) => {
    const r = globalReviews.find((rev) => rev.id === id);
    if (!r) return;
    
    const newVersion = (r.version || 0) + 1;
    const updatedAt = new Date().toISOString();
    
    // Optimistic UI update
    const changedReview: Review = {
      ...r,
      updatedAt,
      version: newVersion,
      fields: { ...r.fields, ...fieldUpdates },
      ...(extra?.lat !== undefined ? { lat: extra.lat } : {}),
      ...(extra?.lng !== undefined ? { lng: extra.lng } : {}),
      ...(extra?.status !== undefined ? { status: extra.status } : {}),
    };
    
    const updated = globalReviews.map((rev) => rev.id === id ? changedReview : rev);
    notifyAll(updated);

    // Delta update to Firestore
    const updates: Record<string, any> = { 
      updatedAt,
      version: newVersion
    };
    if (extra?.lat !== undefined) updates.lat = extra.lat;
    if (extra?.lng !== undefined) updates.lng = extra.lng;
    if (extra?.status !== undefined) updates.status = extra.status;
    
    for (const [key, val] of Object.entries(fieldUpdates)) {
      updates[`fields.${key}`] = val;
    }
    
    updateReviewFields(id, updates); // fire-and-forget
  }, []);

  const deleteReview = useCallback(async (id: string) => {
    // Optimistic UI update
    const updated = globalReviews.filter((r) => r.id !== id);
    notifyAll(updated);
    
    removeReview(id); // fire-and-forget
  }, []);

  const getReview = useCallback((id: string): Review | undefined => {
    return globalReviews.find((r) => r.id === id);
  }, []);

  const syncFieldsToReviews = useCallback(async (settings: FieldSetting[]) => {
    // This is computationally heavy to delta-sync every document.
    // However, it's only triggered when fields are added/removed.
    const settingIds = new Set(settings.map((s) => s.id));
    
    for (const review of globalReviews) {
      let changed = false;
      const fieldUpdates: Record<string, any> = {};
      
      for (const fs of settings) {
        if (!(fs.id in review.fields)) {
          fieldUpdates[fs.id] = getDefaultValue(fs.type);
          changed = true;
        }
      }
      
      // Note: we can't easily delete fields via dot notation without deleteField() from firestore.
      // But keeping stale fields in DB doesn't hurt much. The UI filters them.
      
      if (changed) {
        updateReview(review.id, fieldUpdates);
      }
    }
  }, [updateReview]);

  return {
    reviews,
    loading,
    createReview,
    updateReview,
    deleteReview,
    getReview,
    syncFieldsToReviews,
    reload: async () => {}, // No-op now since Firestore auto-loads
  };
}
