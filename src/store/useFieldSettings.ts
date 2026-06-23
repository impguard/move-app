import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FieldSetting, FieldType } from '@/types';
import { getItem, setItem, FIELD_SETTINGS_KEY } from '@/store/storage';
import { createDefaultFieldSettings } from '@/utils/defaults';
import { pushSettingsWithDeletions, addSettingsUpdateListener } from './firestoreSync';

// ... (skipping to hook body)
// Wait, I need to use StartLine and EndLine appropriately. Let's do a precise replace for the imports and saveSettings.

import { migrateFieldSettings } from './migrations';

// ─── Module-level global state ────────────────────────────────────────────────
let globalSettings: FieldSetting[] = [];
let globalLoading = true;
const globalListeners = new Set<(settings: FieldSetting[]) => void>();

let firestoreListenerRegistered = false;

function notifyAll(settings: FieldSetting[]) {
  const migrated = migrateFieldSettings(settings);

  globalSettings = migrated;
  globalListeners.forEach((l) => l(migrated));
}

function ensureFirestoreListener() {
  if (firestoreListenerRegistered) return;
  firestoreListenerRegistered = true;
  addSettingsUpdateListener((settings) => {
    globalLoading = false;
    if (settings.length > 0) {
      setItem(FIELD_SETTINGS_KEY, settings).catch(() => {});
    }
    notifyAll(settings);
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useFieldSettings() {
  const [fieldSettings, setFieldSettings] = useState<FieldSetting[]>(globalSettings);
  const [loading, setLoading] = useState(globalLoading);

  const loadSettings = useCallback(async () => {
    const stored = await getItem<FieldSetting[]>(FIELD_SETTINGS_KEY);
    if (stored && stored.length > 0) {
      globalLoading = false;
      notifyAll(stored);
    } else {
      const defaults = createDefaultFieldSettings();
      await setItem(FIELD_SETTINGS_KEY, defaults);
      globalLoading = false;
      notifyAll(defaults);
    }
  }, []);

  useEffect(() => {
    ensureFirestoreListener();

    const listener = (s: FieldSetting[]) => {
      setFieldSettings(s);
      setLoading(false);
    };
    globalListeners.add(listener);

    if (globalLoading) {
      loadSettings();
    } else {
      setFieldSettings(globalSettings);
      setLoading(false);
    }

    return () => { globalListeners.delete(listener); };
  }, [loadSettings]);

  const saveSettings = useCallback(async (updated: FieldSetting[], deletedIds: string[] = []) => {
    // Removed notifyAll(updated) to prevent UI blinking; we rely fully on Firestore's onSnapshot which updates local cache instantly.
    await setItem(FIELD_SETTINGS_KEY, updated);
    pushSettingsWithDeletions(updated, deletedIds); // fire-and-forget sync
  }, []);

  const addField = useCallback(async (
    key: string,
    type: FieldType,
    config?: { scoreMin?: number; scoreMax?: number }
  ): Promise<FieldSetting> => {
    const newField: FieldSetting = {
      id: uuidv4(),
      key,
      type,
      isCore: false,
      isDefault: false,
      order: globalSettings.length,
      isVisibleList: true,
      isVisibleMap: false,
      isSortable: false,
      isFilterable: true,
      ...(type === 'score' ? { scoreMin: config?.scoreMin ?? 1, scoreMax: config?.scoreMax ?? 5 } : {}),
    };
    const updated = [...globalSettings, newField];
    await saveSettings(updated);
    return newField;
  }, [saveSettings]);

  const updateField = useCallback(async (id: string, changes: Partial<FieldSetting>) => {
    const updated = globalSettings.map((f) =>
      f.id === id ? { ...f, ...changes } : f
    );
    await saveSettings(updated);
  }, [saveSettings]);

  const deleteField = useCallback(async (id: string) => {
    const updated = globalSettings
      .filter((f) => f.id !== id)
      .map((f, i) => ({ ...f, order: i }));
    await saveSettings(updated, [id]);
  }, [saveSettings]);

  const reorderField = useCallback(async (id: string, direction: 'up' | 'down') => {
    const idx = globalSettings.findIndex((f) => f.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === globalSettings.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...globalSettings];
    const temp = updated[idx];
    updated[idx] = updated[swapIdx];
    updated[swapIdx] = temp;
    const reordered = updated.map((f, i) => ({ ...f, order: i }));
    await saveSettings(reordered);
  }, [saveSettings]);

  return {
    fieldSettings,
    loading,
    addField,
    updateField,
    deleteField,
    reorderField,
    reload: loadSettings,
  };
}
