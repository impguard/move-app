import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
  TextInput,
  Share,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FieldSettingRow } from '@/components/FieldSettingRow';
import { AddFieldModal } from '@/components/AddFieldModal';
import { useFieldSettings } from '@/store/useFieldSettings';
import { useReviews } from '@/store/useReviews';
import { useSyncKey } from '@/store/useSyncKey';
import { wipeSyncData } from '@/store/firestoreSync';
import { setItem, REVIEWS_KEY, FIELD_SETTINGS_KEY } from '@/store/storage';
import { createDefaultFieldSettings } from '@/utils/defaults';
import { FieldType, Review, FieldSetting } from '@/types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme, colors, spacing, borderRadius, shadows, typography } from '@/theme';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const {
    fieldSettings,
    loading,
    addField,
    updateField,
    deleteField,
    reorderField,
    reload,
  } = useFieldSettings();
  const { syncFieldsToReviews, reviews, reload: reloadReviews } = useReviews(fieldSettings);
  const { syncKey, changeSyncKey } = useSyncKey();
  const [modalVisible, setModalVisible] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInputValue, setKeyInputValue] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleAddField = async (
    key: string,
    type: FieldType,
    config?: { scoreMin?: number; scoreMax?: number }
  ) => {
    const newField = await addField(key, type, config);
    // Sync new field to all existing reviews
    await syncFieldsToReviews([...fieldSettings, newField]);
  };

  const handleDeleteField = (id: string) => {
    const doDelete = async () => {
      await deleteField(id);
      // Sync removal to all reviews
      const remaining = fieldSettings.filter((f) => f.id !== id);
      await syncFieldsToReviews(remaining);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Remove this field from all reviews?')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Field',
        'This will remove this field from all reviews. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleExport = async () => {
    try {
      const data: { version: number; settings: FieldSetting[]; reviews: Review[] } = {
        version: 1,
        settings: fieldSettings,
        reviews: [], // Fetching all reviews is already done in syncFieldsToReviews but we need them all. Let's use useReviews hook properly.
      };
      
      // We need to fetch reviews
      const storedReviews = await import('@/store/storage').then(m => m.getItem<Review[]>(m.REVIEWS_KEY));
      data.reviews = storedReviews || [];

      const jsonStr = JSON.stringify(data, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'move-app-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const fileUri = FileSystem.documentDirectory + 'move-app-export.json';
        await FileSystem.writeAsStringAsync(fileUri, jsonStr);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Export Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Export Failed', 'An error occurred while exporting.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      let jsonStr = '';

      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        jsonStr = await response.text();
      } else {
        jsonStr = await FileSystem.readAsStringAsync(file.uri);
      }

      const data = JSON.parse(jsonStr);
      if (!data.reviews || !data.settings) {
        throw new Error('Invalid backup file format');
      }

      // Merge Settings
      const newSettings = [...fieldSettings];
      let settingsChanged = false;
      for (const s of (data.settings as FieldSetting[])) {
        if (!newSettings.find(ex => ex.id === s.id || ex.key === s.key)) {
          newSettings.push(s);
          settingsChanged = true;
        }
      }

      // Merge Reviews
      const storedReviews = await import('@/store/storage').then(m => m.getItem<Review[]>(m.REVIEWS_KEY)) || [];
      const newReviews = [...storedReviews];

      for (const importedReview of (data.reviews as Review[])) {
        const isDuplicate = newReviews.some(r => r.id === importedReview.id || 
          (r.fields && importedReview.fields && r.fields[newSettings[0]?.id] === importedReview.fields[newSettings[0]?.id]));
        
        const rToSave = { ...importedReview, hasDuplicate: isDuplicate };
        if (isDuplicate) {
           rToSave.id = import('uuid').then(m => m.v4()) as unknown as string; // generate new id to not overwrite but flag
        }
        newReviews.unshift(rToSave);
      }

      await import('@/store/storage').then(m => m.setItem(m.REVIEWS_KEY, newReviews));
      
      if (settingsChanged) {
        // use local hook
        await syncFieldsToReviews(newSettings);
        reload(); // reload settings
      }

      if (Platform.OS === 'web') {
        window.alert('Import successful!');
      } else {
        Alert.alert('Import Success', 'Data has been imported.');
      }

    } catch (error) {
      console.error(error);
      if (Platform.OS === 'web') {
        window.alert('Import Failed. Ensure it is a valid backup file.');
      } else {
        Alert.alert('Import Failed', 'Ensure it is a valid backup file.');
      }
    }
  };

  const handleCopyKey = async () => {
    if (!syncKey) return;
    try {
      if (Platform.OS === 'web') {
        await (navigator as any).clipboard?.writeText(syncKey);
      } else {
        await Share.share({ message: syncKey });
      }
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const handleChangeKey = async () => {
    if (!keyInputValue.trim()) return;
    await changeSyncKey(keyInputValue.trim());
    setShowKeyInput(false);
    setKeyInputValue('');
    
    // Instantly wipe UI state
    reloadReviews();
    reload();

    if (Platform.OS === 'web') {
      window.alert('Sync key updated! Downloading workspace data...');
    } else {
      Alert.alert('Sync Key Updated', 'Downloading workspace data...');
    }
  };

  const handleWipeDatabase = () => {
    const doWipe = async () => {
      try {
        await wipeSyncData(reviews, fieldSettings);
        await setItem(REVIEWS_KEY, []);
        const defaults = createDefaultFieldSettings();
        await setItem(FIELD_SETTINGS_KEY, defaults);
        reloadReviews();
        reload();
        if (Platform.OS === 'web') {
          window.alert('Database wiped and factory defaults restored.');
        } else {
          Alert.alert('Success', 'Database wiped and factory defaults restored.');
        }
      } catch (e) {
        if (Platform.OS === 'web') {
          window.alert('Failed to wipe database.');
        } else {
          Alert.alert('Error', 'Failed to wipe database.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('WARNING: This will permanently delete ALL data for this sync key across all devices, and reset fields to factory defaults. Continue?')) {
        doWipe();
      }
    } else {
      Alert.alert(
        'Wipe Database',
        'WARNING: This will permanently delete ALL data for this sync key across all devices, and reset fields to factory defaults. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Wipe', style: 'destructive', onPress: doWipe },
        ]
      );
    }
  };

  const sortedSettings = [...fieldSettings].sort((a, b) => a.order - b.order);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Review Fields',
        }}
      />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.description}>
              Configure the fields that appear on every review. Adding or removing a field affects all reviews.
            </Text>

            <View style={[styles.fieldList, { backgroundColor: colors.surface }]}>
              {sortedSettings.map((setting, index) => (
                <FieldSettingRow
                  key={setting.id}
                  setting={setting}
                  isFirst={index === 0}
                  isLast={index === sortedSettings.length - 1}
                  onMoveUp={() => reorderField(setting.id, 'up')}
                  onMoveDown={() => reorderField(setting.id, 'down')}
                  onDelete={() => handleDeleteField(setting.id)}
                  onToggleVisibility={() => updateField(setting.id, { isVisible: !setting.isVisible })}
                />
              ))}
            </View>

            <Pressable
              onPress={() => setModalVisible(true)}
              style={({ pressed }) => [
                styles.addButton,
                { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                pressed && styles.addButtonPressed,
              ]}
            >
              <Text style={[styles.addButtonIcon, { color: colors.primary }]}>+</Text>
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Field</Text>
            </Pressable>

            {/* ── Sync Section ───────────────────────────────────────────── */}
            <View style={[styles.syncSection, { borderTopColor: colors.borderLight }]}>
              <View style={styles.syncHeader}>
                <Text style={[styles.dataTitle, { color: colors.text }]}>Data Sync</Text>
                <View style={[styles.syncBadge, { backgroundColor: colors.success + '22' }]}>
                  <View style={[styles.syncDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.syncBadgeText, { color: colors.success }]}>Active</Text>
                </View>
              </View>
              <Text style={[styles.dataDesc, { color: colors.textSecondary }]}>
                Use this key to sync your data across devices. Enter it on another device to pull your reviews.
              </Text>

              <View style={[styles.keyBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Text style={[styles.keyText, { color: colors.text }]} numberOfLines={1} selectable>
                  {syncKey || 'Generating…'}
                </Text>
                <Pressable onPress={handleCopyKey} style={styles.copyBtn} hitSlop={8}>
                  <Ionicons
                    name={keyCopied ? 'checkmark-circle' : 'copy-outline'}
                    size={20}
                    color={keyCopied ? colors.success : colors.primary}
                  />
                </Pressable>
              </View>

              {!showKeyInput ? (
                <Pressable
                  onPress={() => { setShowKeyInput(true); setKeyInputValue(''); }}
                  style={[styles.changeKeyBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.changeKeyText, { color: colors.textSecondary }]}>Enter a different sync key…</Text>
                </Pressable>
              ) : (
                <View style={styles.keyInputRow}>
                  <TextInput
                    style={[styles.keyInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                    value={keyInputValue}
                    onChangeText={setKeyInputValue}
                    placeholder="Paste sync key here"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={handleChangeKey} style={[styles.keyApplyBtn, { backgroundColor: colors.primary }]}>
                    <Text style={styles.keyApplyText}>Apply</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowKeyInput(false)} style={styles.keyCancelBtn}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
              )}
            </View>

            {/* ── Data Management ────────────────────────────────────────── */}
            <View style={[styles.dataSection, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.dataTitle, { color: colors.text }]}>Data Management</Text>
              <Text style={[styles.dataDesc, { color: colors.textSecondary }]}>Note: Photos are not included in the JSON export.</Text>
              
              <View style={styles.dataButtons}>
                <Pressable style={[styles.dataBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={handleExport}>
                  <Text style={[styles.dataBtnText, { color: colors.text }]}>Export</Text>
                </Pressable>
                <Pressable style={[styles.dataBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={handleImport}>
                  <Text style={[styles.dataBtnText, { color: colors.text }]}>Import</Text>
                </Pressable>
                <Pressable style={[styles.dataBtn, { backgroundColor: colors.danger + '22' }]} onPress={handleWipeDatabase}>
                  <Text style={[styles.dataBtnText, { color: colors.danger }]}>Wipe Data</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ height: 250 }} />
          </ScrollView>
        )}

        <AddFieldModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onAdd={handleAddField}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 20,
  },
  description: {
    ...typography.caption,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  fieldList: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButtonText: {
    ...typography.bodyMedium,
  },
  // Sync section
  syncSection: {
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  keyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  keyText: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  copyBtn: {
    padding: spacing.xs,
  },
  changeKeyBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  changeKeyText: {
    fontSize: 14,
  },
  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  keyInput: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  keyApplyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  keyApplyText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  keyCancelBtn: {
    padding: spacing.xs,
  },
  // Data section
  dataSection: {
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
  },
  dataTitle: {
    ...typography.heading,
    marginBottom: spacing.xs,
  },
  dataDesc: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  dataButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dataBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  dataBtnText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
});
