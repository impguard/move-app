import React, { useState } from 'react';
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
} from 'react-native';
import { FieldType, FIELD_TYPE_LABELS } from '@/types';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';

interface AddFieldModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (key: string, type: FieldType, config?: { scoreMin?: number; scoreMax?: number }) => void;
}

const FIELD_TYPES: FieldType[] = [
  'single-line',
  'text',
  'tag',
  'number',
  'dollar',
  'sqft',
  'score',
  'boolean',
  'link',
  'pictures',
];

export function AddFieldModal({ visible, onClose, onAdd }: AddFieldModalProps) {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<FieldType>('single-line');
  const [scoreMin, setScoreMin] = useState('1');
  const [scoreMax, setScoreMax] = useState('5');

  const handleAdd = () => {
    if (!name.trim()) return;
    const config = selectedType === 'score'
      ? { scoreMin: parseInt(scoreMin) || 1, scoreMax: parseInt(scoreMax) || 5 }
      : undefined;
    onAdd(name.trim(), selectedType, config);
    setName('');
    setSelectedType('single-line');
    setScoreMin('1');
    setScoreMax('5');
    onClose();
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
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add Field</Text>

          <Text style={styles.inputLabel}>Field Name</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Garage, Pet Friendly..."
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />

          <Text style={styles.inputLabel}>Field Type</Text>
          <ScrollView style={styles.typeList} showsVerticalScrollIndicator={false}>
            {FIELD_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.typeOption,
                  selectedType === type && styles.typeOptionSelected,
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    selectedType === type && styles.typeOptionTextSelected,
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
                <Text style={styles.scoreLabel}>Min</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={scoreMin}
                  onChangeText={setScoreMin}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.scoreField}>
                <Text style={styles.scoreLabel}>Max</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={scoreMax}
                  onChangeText={setScoreMax}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleAdd}
              style={[styles.addButton, !name.trim() && styles.addButtonDisabled]}
              disabled={!name.trim()}
            >
              <Text style={styles.addButtonText}>Add Field</Text>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.border,
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
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    backgroundColor: colors.primaryLight,
  },
  typeOptionText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  typeOptionTextSelected: {
    color: colors.primary,
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
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    backgroundColor: colors.surfaceSecondary,
  },
  cancelButtonText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  addButton: {
    flex: 2,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
  },
});
