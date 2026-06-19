import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FieldSetting, FIELD_TYPE_LABELS } from '@/types';
import { useTheme, spacing, borderRadius, typography } from '@/theme';

interface FieldSettingRowProps {
  setting: FieldSetting;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}

export function FieldSettingRow({
  setting,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
  onToggleVisibility,
}: FieldSettingRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
      <View style={styles.reorderButtons}>
        <Pressable
          onPress={onMoveUp}
          disabled={isFirst}
          style={[styles.arrowBtn, isFirst && styles.arrowBtnDisabled]}
        >
          <Text style={[styles.arrowText, { color: colors.textSecondary }, isFirst && { color: colors.textTertiary }]}>▲</Text>
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          disabled={isLast}
          style={[styles.arrowBtn, isLast && styles.arrowBtnDisabled]}
        >
          <Text style={[styles.arrowText, { color: colors.textSecondary }, isLast && { color: colors.textTertiary }]}>▼</Text>
        </Pressable>
      </View>

      <View style={styles.info}>
        <Text style={[styles.fieldName, { color: colors.text }]}>{setting.key}</Text>
        <View style={[styles.typeBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.typeText, { color: colors.primary }]}>{FIELD_TYPE_LABELS[setting.type]}</Text>
        </View>
      </View>

      {!setting.isCore ? (
        <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
          <Text style={[styles.deleteText, { color: colors.danger }]}>✕</Text>
        </Pressable>
      ) : (
        <View style={[styles.coreBadge, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.coreText, { color: colors.textTertiary }]}>Required</Text>
        </View>
      )}

      <Pressable onPress={onToggleVisibility} style={styles.visibilityBtn} hitSlop={8}>
        <Text style={[styles.visibilityIcon, { color: colors.primary }, !setting.isVisible && { color: colors.textTertiary, opacity: 0.5 }]}>
          {setting.isVisible ? '👁' : '👁‍🗨'}
        </Text>
        <Text style={[styles.visibilityText, { color: colors.textSecondary }]}>
          {setting.isVisible ? 'Visible' : 'Hidden'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  reorderButtons: {
    marginRight: spacing.md,
    gap: 2,
  },
  arrowBtn: {
    padding: 4,
  },
  arrowBtnDisabled: {
    opacity: 0.2,
  },
  arrowText: {
    fontSize: 10,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  fieldName: {
    ...typography.bodyMedium,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: spacing.sm,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
  coreBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  coreText: {
    fontSize: 11,
    fontWeight: '500',
  },
  visibilityBtn: {
    alignItems: 'center',
    marginLeft: spacing.md,
    padding: spacing.xs,
  },
  visibilityIcon: {
    fontSize: 16,
  },
  visibilityText: {
    fontSize: 9,
    marginTop: 2,
  },
});
