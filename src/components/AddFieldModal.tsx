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
import { useTheme, spacing, borderRadius, typography } from '@/theme';

interface AddFieldModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (key: string, type: FieldType, config?: { scoreMin?: number; scoreMax?: number }) => void;
}

const FIELD_TYPES: FieldType[] = [
  'label',
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
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<FieldType>('label');
  const [scoreMin, setScoreMin] = useState('1');
  const [scoreMax, setScoreMax] = useState('5');

  const handleAdd = () => {
    if (!name.trim()) return;
    const config = selectedType === 'score'
      ? { scoreMin: parseInt(scoreMin) || 1, scoreMax: parseInt(scoreMax) || 5 }
      : undefined;
    onAdd(name.trim(), selectedType, config);
    setName('');
    setSelectedType('label');
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
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>Add Field</Text>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Field Name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Garage, Pet Friendly..."
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Field Type</Text>
          <ScrollView style={styles.typeList} showsVerticalScrollIndicator={false}>
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
              onPress={handleAdd}
              style={[styles.addButton, { backgroundColor: colors.primary }, !name.trim() && styles.addButtonDisabled]}
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
