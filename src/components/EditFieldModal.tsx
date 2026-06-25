import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { FieldType, FIELD_TYPE_LABELS, FieldSetting } from '@/types';
import { useTheme, spacing, borderRadius, typography } from '@/theme';

interface EditFieldModalProps {
  visible: boolean;
  setting: FieldSetting | null;
  onClose: () => void;
  onSave: (id: string, newName: string, newType: FieldType, config?: { scoreMin?: number; scoreMax?: number }) => void;
}

const FIELD_TYPES: FieldType[] = [
  'address',
  'label',
  'tag',
  'number',
  'dollar',
  'sqft',
  'score',
  'boolean',
  'strict_boolean',
  'text',
  'date',
  'link',
  'pictures',
  'beds_baths',
];

export function EditFieldModal({ visible, setting, onClose, onSave }: EditFieldModalProps) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<FieldType>('label');
  const [scoreMin, setScoreMin] = useState('1');
  const [scoreMax, setScoreMax] = useState('5');

  useEffect(() => {
    if (setting && visible) {
      setName(setting.key);
      setSelectedType(setting.type);
      setScoreMin(String(setting.scoreMin ?? 1));
      setScoreMax(String(setting.scoreMax ?? 5));
    }
  }, [setting, visible]);

  if (!setting) return null;

  const handleSave = () => {
    if (!name.trim()) return;

    const config = selectedType === 'score'
      ? { scoreMin: parseInt(scoreMin) || 1, scoreMax: parseInt(scoreMax) || 5 }
      : undefined;

    const saveChanges = () => {
      onSave(setting.id, name.trim(), selectedType, config);
      onClose();
    };

    if (selectedType !== setting.type) {
      if (Platform.OS === 'web') {
         if (window.confirm('Changing field type may permanently alter existing data for this field across all reviews. Are you sure you want to proceed?')) {
            saveChanges();
         }
      } else {
        Alert.alert(
          'Confirm Type Change',
          'Changing the field type may convert or clear existing data for this field across all reviews. This cannot be undone. Proceed?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Change Type', style: 'destructive', onPress: saveChanges },
          ]
        );
      }
    } else {
      saveChanges();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>Edit Field</Text>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Field Name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Garage, Pet Friendly..."
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Field Type</Text>
          <ScrollView 
            style={styles.typeList} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {FIELD_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.typeOption,
                  selectedType === type && [styles.typeOptionSelected, { backgroundColor: colors.primaryLight }],
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    { color: colors.textSecondary },
                    selectedType === type && [styles.typeOptionTextSelected, { color: colors.primary }],
                  ]}
                >
                  {FIELD_TYPE_LABELS[type]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {selectedType === 'score' && (
            <View style={styles.scoreConfig}>
              <View style={styles.scoreField}>
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Min</Text>
                <TextInput
                  style={[styles.scoreInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight }]}
                  value={scoreMin}
                  onChangeText={setScoreMin}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.scoreField}>
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Max</Text>
                <TextInput
                  style={[styles.scoreInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight }]}
                  value={scoreMax}
                  onChangeText={setScoreMax}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.cancelButton, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.addButton, { backgroundColor: colors.primary }, !name.trim() && styles.addButtonDisabled]}
              disabled={!name.trim()}
            >
              <Text style={styles.addButtonText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl + 8,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading,
    marginBottom: spacing.xl,
  },
  inputLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  textInput: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  typeList: {
    maxHeight: 200,
    marginBottom: spacing.xl,
  },
  typeOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  typeOptionSelected: {
  },
  typeOptionText: {
    ...typography.body,
  },
  typeOptionTextSelected: {
    fontWeight: '600',
  },
  scoreConfig: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  scoreField: {
    flex: 1,
  },
  scoreLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  scoreInput: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    borderWidth: 1,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.bodyMedium,
  },
  addButton: {
    flex: 2,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
  },
});
