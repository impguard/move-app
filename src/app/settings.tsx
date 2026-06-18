import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { FieldSettingRow } from '@/components/FieldSettingRow';
import { AddFieldModal } from '@/components/AddFieldModal';
import { useFieldSettings } from '@/store/useFieldSettings';
import { useReviews } from '@/store/useReviews';
import { FieldType, Review, FieldSetting } from '@/types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, borderRadius, shadows, typography } from '@/theme';

export default function SettingsScreen() {
  const {
    fieldSettings,
    loading,
    addField,
    updateField,
    deleteField,
    reorderField,
    reload,
  } = useFieldSettings();
  const { syncFieldsToReviews } = useReviews(fieldSettings);
  const [modalVisible, setModalVisible] = useState(false);

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

  const sortedSettings = [...fieldSettings].sort((a, b) => a.order - b.order);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Review Fields',
        }}
      />
      <View style={styles.container}>
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

            <View style={styles.fieldList}>
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
                pressed && styles.addButtonPressed,
              ]}
            >
              <Text style={styles.addButtonIcon}>+</Text>
              <Text style={styles.addButtonText}>Add Field</Text>
            </Pressable>

            <View style={styles.dataSection}>
              <Text style={styles.dataTitle}>Data Management</Text>
              <Text style={styles.dataDesc}>Note: Photos are not included in the JSON export.</Text>
              
              <View style={styles.dataButtons}>
                <Pressable style={styles.dataBtn} onPress={handleExport}>
                  <Text style={styles.dataBtnText}>Export Data</Text>
                </Pressable>
                <Pressable style={styles.dataBtn} onPress={handleImport}>
                  <Text style={styles.dataBtnText}>Import Data</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        )}

        <AddFieldModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onAdd={handleAddField}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textTertiary,
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
    backgroundColor: colors.surface,
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
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primaryLight,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
  addButtonText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  dataSection: {
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
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
