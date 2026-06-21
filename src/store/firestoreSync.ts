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
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { Review, FieldSetting } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
type ReviewListener = (reviews: Review[]) => void;
type SettingsListener = (settings: FieldSetting[]) => void;

// ─── Module-level state ───────────────────────────────────────────────────────
let activeSyncKey: string | null = null;
let unsubReviews: Unsubscribe | null = null;
let unsubSettings: Unsubscribe | null = null;

const reviewListeners = new Set<ReviewListener>();
const settingsListeners = new Set<SettingsListener>();

let isFirestoreConnected = true;
const connectionListeners = new Set<(connected: boolean) => void>();

export function addConnectionListener(fn: (connected: boolean) => void): () => void {
  connectionListeners.add(fn);
  fn(isFirestoreConnected);
  return () => connectionListeners.delete(fn);
}

export function setFirestoreConnected(connected: boolean) {
  if (isFirestoreConnected !== connected) {
    isFirestoreConnected = connected;
    connectionListeners.forEach((l) => l(connected));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getActiveSyncKey(): string | null {
  return activeSyncKey;
}

export function addReviewUpdateListener(fn: ReviewListener): () => void {
  reviewListeners.add(fn);
  return () => reviewListeners.delete(fn);
}

export function addSettingsUpdateListener(fn: SettingsListener): () => void {
  settingsListeners.add(fn);
  return () => settingsListeners.delete(fn);
}

export async function initSync(syncKey: string): Promise<void> {
  if (syncKey === activeSyncKey) return;
  activeSyncKey = syncKey;

  if (unsubReviews) { unsubReviews(); unsubReviews = null; }
  if (unsubSettings) { unsubSettings(); unsubSettings = null; }

  const reviewsRef = collection(db, 'sync', syncKey, 'reviews');
  unsubReviews = onSnapshot(
    reviewsRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      setFirestoreConnected(!snapshot.metadata.fromCache);
      const remoteReviews = snapshot.docs.map((d) => d.data() as Review);
      // Sort by updatedAt descending
      const sorted = remoteReviews.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      reviewListeners.forEach((l) => l(sorted));
    },
    (err) => {
      console.warn('[Sync] Reviews snapshot error:', err);
      setFirestoreConnected(false);
    }
  );

  const settingsRef = collection(db, 'sync', syncKey, 'fieldSettings');
  unsubSettings = onSnapshot(
    settingsRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      setFirestoreConnected(!snapshot.metadata.fromCache);
      const remoteSettings = snapshot.docs
        .map((d) => d.data() as FieldSetting)
        .sort((a, b) => a.order - b.order);
      settingsListeners.forEach((l) => l(remoteSettings));
    },
    (err) => {
      console.warn('[Sync] Settings snapshot error:', err);
      setFirestoreConnected(false);
    }
  );
}

// ─── Push operations ────────────────────────────────────────────────────────

export async function createReviewRemote(review: Review): Promise<void> {
  if (!activeSyncKey) return;
  try {
    await setDoc(doc(db, 'sync', activeSyncKey, 'reviews', review.id), review);
  } catch (e) {
    console.warn('[Sync] Failed to push review:', e);
  }
}

export async function updateReviewFields(id: string, updates: Record<string, any>): Promise<void> {
  if (!activeSyncKey) return;
  try {
    await updateDoc(doc(db, 'sync', activeSyncKey, 'reviews', id), updates);
  } catch (e) {
    console.warn('[Sync] Failed to update review:', e);
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

export async function pushSettingsWithDeletions(settings: FieldSetting[], deletedIds: string[] = []): Promise<void> {
  if (!activeSyncKey) return;
  try {
    const batch = writeBatch(db);
    for (const s of settings) {
      batch.set(doc(db, 'sync', activeSyncKey, 'fieldSettings', s.id), s);
    }
    for (const id of deletedIds) {
      batch.delete(doc(db, 'sync', activeSyncKey, 'fieldSettings', id));
    }
    await batch.commit();
  } catch (e) {
    console.warn('[Sync] pushSettingsWithDeletions failed:', e);
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
