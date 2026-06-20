import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { initSync } from './firestoreSync';
import { setItem, REVIEWS_KEY, FIELD_SETTINGS_KEY } from '@/store/storage';
import { createDefaultFieldSettings } from '@/utils/defaults';

const SYNC_KEY_STORAGE = '@move_sync_key';

// ─── Module-level global (shared across all hook instances) ───────────────────
let globalSyncKey: string | null = null;
const syncKeyListeners = new Set<(key: string) => void>();

function notifySyncKeyListeners(key: string) {
  globalSyncKey = key;
  syncKeyListeners.forEach((l) => l(key));
}

// ─── Bootstrap (called once on app start from SyncInitializer) ────────────────
let bootstrapped = false;

export async function bootstrapSyncKey(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  let key = await AsyncStorage.getItem(SYNC_KEY_STORAGE);
  if (!key) {
    key = uuidv4();
    await AsyncStorage.setItem(SYNC_KEY_STORAGE, key);
  }
  notifySyncKeyListeners(key);
  initSync(key); // start Firestore subscriptions
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSyncKey() {
  const [syncKey, setSyncKey] = useState<string | null>(globalSyncKey);

  useEffect(() => {
    // Sync with current global value
    if (globalSyncKey) setSyncKey(globalSyncKey);

    const listener = (key: string) => setSyncKey(key);
    syncKeyListeners.add(listener);
    return () => { syncKeyListeners.delete(listener); };
  }, []);

  /** Change to a different sync key — pulls data from that key on next snapshot */
  const changeSyncKey = useCallback(async (newKey: string): Promise<void> => {
    const trimmed = newKey.trim();
    if (!trimmed) return;
    
    // Wipe local cache when switching keys to prevent merging old workspace data
    await setItem(REVIEWS_KEY, []);
    await setItem(FIELD_SETTINGS_KEY, createDefaultFieldSettings());
    
    await AsyncStorage.setItem(SYNC_KEY_STORAGE, trimmed);
    notifySyncKeyListeners(trimmed);
    initSync(trimmed);
  }, []);

  return { syncKey, changeSyncKey };
}
