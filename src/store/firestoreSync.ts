/**
 * firestoreSync.ts
 *
 * Core sync engine. Manages Firestore subscriptions and push operations.
 * Uses last-write-wins conflict resolution based on review.updatedAt.
 *
 * Architecture:
 *  - initSync(syncKey) → starts onSnapshot listeners for reviews + fieldSettings
 *  - pushReview / removeReview / pushSettings → write individual docs to Firestore
 *  - Listeners (addReviewUpdateListener / addSettingsUpdateListener) → called when
 *    Firestore sends data that is newer than what we have locally
 */

import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { Review, FieldSetting } from '@/types';
import { getItem, setItem, REVIEWS_KEY, FIELD_SETTINGS_KEY } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────
type ReviewListener = (reviews: Review[]) => void;
type SettingsListener = (settings: FieldSetting[]) => void;

// ─── Module-level state ───────────────────────────────────────────────────────
let activeSyncKey: string | null = null;
let unsubReviews: Unsubscribe | null = null;
let unsubSettings: Unsubscribe | null = null;

const reviewListeners = new Set<ReviewListener>();
const settingsListeners = new Set<SettingsListener>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Merge local + remote reviews, keeping whichever has the newer updatedAt */
function mergeReviews(local: Review[], remote: Review[]): { merged: Review[]; changed: boolean } {
  const map = new Map<string, Review>();
  local.forEach((r) => map.set(r.id, r));

  let changed = false;
  remote.forEach((r) => {
    const existing = map.get(r.id);
    if (!existing) {
      map.set(r.id, r);
      changed = true;
    } else if (new Date(r.updatedAt) > new Date(existing.updatedAt)) {
      map.set(r.id, r);
      changed = true;
    }
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return { merged, changed };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getActiveSyncKey(): string | null {
  return activeSyncKey;
}

/** Register a callback that fires when Firestore pushes new reviews */
export function addReviewUpdateListener(fn: ReviewListener): () => void {
  reviewListeners.add(fn);
  return () => reviewListeners.delete(fn);
}

/** Register a callback that fires when Firestore pushes new field settings */
export function addSettingsUpdateListener(fn: SettingsListener): () => void {
  settingsListeners.add(fn);
  return () => settingsListeners.delete(fn);
}

/**
 * Initialize (or re-initialize) Firestore subscriptions for a given sync key.
 * Safe to call multiple times — tears down old subscriptions first.
 */
export async function initSync(syncKey: string): Promise<void> {
  if (syncKey === activeSyncKey) return;
  activeSyncKey = syncKey;

  // Tear down existing subscriptions
  if (unsubReviews) { unsubReviews(); unsubReviews = null; }
  if (unsubSettings) { unsubSettings(); unsubSettings = null; }

  // ── Reviews subscription ──────────────────────────────────────────────────
  const reviewsRef = collection(db, 'sync', syncKey, 'reviews');
  unsubReviews = onSnapshot(
    reviewsRef,
    async (snapshot) => {
      if (snapshot.empty) return;
      try {
        const remoteReviews = snapshot.docs.map((d) => d.data() as Review);
        const localReviews = (await getItem<Review[]>(REVIEWS_KEY)) || [];
        const { merged, changed } = mergeReviews(localReviews, remoteReviews);
        if (changed) {
          await setItem(REVIEWS_KEY, merged);
          reviewListeners.forEach((l) => l(merged));
        }
      } catch (e) {
        console.warn('[Sync] Reviews merge error:', e);
      }
    },
    (err) => console.warn('[Sync] Reviews snapshot error:', err)
  );

  // ── Field settings subscription ───────────────────────────────────────────
  const settingsRef = collection(db, 'sync', syncKey, 'fieldSettings');
  unsubSettings = onSnapshot(
    settingsRef,
    async (snapshot) => {
      if (snapshot.empty) {
        const localSettings = (await getItem<FieldSetting[]>(FIELD_SETTINGS_KEY)) || [];
        if (localSettings.length > 0) {
          pushSettings(localSettings);
        }
        return;
      }
      try {
        const remoteSettings = snapshot.docs
          .map((d) => d.data() as FieldSetting)
          .sort((a, b) => a.order - b.order);
        const localSettings = (await getItem<FieldSetting[]>(FIELD_SETTINGS_KEY)) || [];

        // Simple last-write-wins for settings: use remote if it has more or different entries
        const localJson = JSON.stringify(localSettings.map((s) => s.id).sort());
        const remoteJson = JSON.stringify(remoteSettings.map((s) => s.id).sort());
        if (localJson !== remoteJson || JSON.stringify(localSettings) !== JSON.stringify(remoteSettings)) {
          await setItem(FIELD_SETTINGS_KEY, remoteSettings);
          settingsListeners.forEach((l) => l(remoteSettings));
        }
      } catch (e) {
        console.warn('[Sync] Settings merge error:', e);
      }
    },
    (err) => console.warn('[Sync] Settings snapshot error:', err)
  );
}

// ─── Push operations (fire-and-forget) ────────────────────────────────────────

export async function pushReview(review: Review): Promise<void> {
  if (!activeSyncKey) return;
  try {
    await setDoc(doc(db, 'sync', activeSyncKey, 'reviews', review.id), review);
  } catch (e) {
    console.warn('[Sync] Failed to push review:', e);
  }
}

export async function removeReview(reviewId: string): Promise<void> {
  if (!activeSyncKey) return;
  try {
    await deleteDoc(doc(db, 'sync', activeSyncKey, 'reviews', reviewId));
  } catch (e) {
    console.warn('[Sync] Failed to delete review:', e);
  }
}

export async function pushSettings(settings: FieldSetting[]): Promise<void> {
  if (!activeSyncKey) return;
  try {
    await Promise.all(
      settings.map((s) =>
        setDoc(doc(db, 'sync', activeSyncKey!, 'fieldSettings', s.id), s)
      )
    );
  } catch (e) {
    console.warn('[Sync] Failed to push settings:', e);
  }
}

export async function wipeSyncData(reviews: Review[], settings: FieldSetting[]): Promise<void> {
  if (!activeSyncKey) return;
  try {
    const reviewPromises = reviews.map((r) => deleteDoc(doc(db, 'sync', activeSyncKey!, 'reviews', r.id)));
    const settingsPromises = settings.map((s) => deleteDoc(doc(db, 'sync', activeSyncKey!, 'fieldSettings', s.id)));
    await Promise.all([...reviewPromises, ...settingsPromises]);
  } catch (e) {
    console.warn('[Sync] Failed to wipe sync data:', e);
  }
}
