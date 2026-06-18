import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Review, FieldSetting, getDefaultValue } from '@/types';
import { getItem, setItem, REVIEWS_KEY } from '@/store/storage';

export function useReviews(fieldSettings: FieldSetting[]) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    const stored = await getItem<Review[]>(REVIEWS_KEY);
    if (stored) {
      setReviews(stored);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const saveReviews = useCallback(async (updated: Review[]) => {
    setReviews(updated);
    await setItem(REVIEWS_KEY, updated);
  }, []);

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
    const updated = [newReview, ...reviews];
    await saveReviews(updated);
    return newReview.id;
  }, [fieldSettings, reviews, saveReviews]);

  const updateReview = useCallback(async (id: string, fieldUpdates: Record<string, unknown>, extra?: { lat?: number; lng?: number; status?: 'draft' | 'saved' }) => {
    const updated = reviews.map((r) => {
      if (r.id !== id) return r;
      return {
        ...r,
        updatedAt: new Date().toISOString(),
        fields: { ...r.fields, ...fieldUpdates },
        ...(extra?.lat !== undefined ? { lat: extra.lat } : {}),
        ...(extra?.lng !== undefined ? { lng: extra.lng } : {}),
        ...(extra?.status !== undefined ? { status: extra.status } : {}),
      };
    });
    await saveReviews(updated);
  }, [reviews, saveReviews]);

  const deleteReview = useCallback(async (id: string) => {
    const updated = reviews.filter((r) => r.id !== id);
    await saveReviews(updated);
  }, [reviews, saveReviews]);

  const getReview = useCallback((id: string): Review | undefined => {
    return reviews.find((r) => r.id === id);
  }, [reviews]);

  // When field settings change, ensure all reviews have all fields
  const syncFieldsToReviews = useCallback(async (settings: FieldSetting[]) => {
    let changed = false;
    const updated = reviews.map((review) => {
      const newFields = { ...review.fields };
      for (const fs of settings) {
        if (!(fs.id in newFields)) {
          newFields[fs.id] = getDefaultValue(fs.type);
          changed = true;
        }
      }
      // Remove fields that no longer exist in settings
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
      await saveReviews(updated);
    }
  }, [reviews, saveReviews]);

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
