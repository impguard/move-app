import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FieldSetting, FieldType } from '@/types';
import { getItem, setItem, FIELD_SETTINGS_KEY } from '@/store/storage';
import { createDefaultFieldSettings } from '@/utils/defaults';

export function useFieldSettings() {
  const [fieldSettings, setFieldSettings] = useState<FieldSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    const stored = await getItem<FieldSetting[]>(FIELD_SETTINGS_KEY);
    if (stored && stored.length > 0) {
      setFieldSettings(stored);
    } else {
      const defaults = createDefaultFieldSettings();
      await setItem(FIELD_SETTINGS_KEY, defaults);
      setFieldSettings(defaults);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(async (updated: FieldSetting[]) => {
    setFieldSettings(updated);
    await setItem(FIELD_SETTINGS_KEY, updated);
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
      order: fieldSettings.length,
      isVisible: true,
      ...(type === 'score' ? { scoreMin: config?.scoreMin ?? 1, scoreMax: config?.scoreMax ?? 5 } : {}),
    };
    const updated = [...fieldSettings, newField];
    await saveSettings(updated);
    return newField;
  }, [fieldSettings, saveSettings]);

  const updateField = useCallback(async (id: string, changes: Partial<FieldSetting>) => {
    const updated = fieldSettings.map((f) =>
      f.id === id ? { ...f, ...changes } : f
    );
    await saveSettings(updated);
  }, [fieldSettings, saveSettings]);

  const deleteField = useCallback(async (id: string) => {
    const updated = fieldSettings
      .filter((f) => f.id !== id)
      .map((f, i) => ({ ...f, order: i }));
    await saveSettings(updated);
  }, [fieldSettings, saveSettings]);

  const reorderField = useCallback(async (id: string, direction: 'up' | 'down') => {
    const idx = fieldSettings.findIndex((f) => f.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === fieldSettings.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...fieldSettings];
    const temp = updated[idx];
    updated[idx] = updated[swapIdx];
    updated[swapIdx] = temp;
    // Re-assign order values
    const reordered = updated.map((f, i) => ({ ...f, order: i }));
    await saveSettings(reordered);
  }, [fieldSettings, saveSettings]);

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
