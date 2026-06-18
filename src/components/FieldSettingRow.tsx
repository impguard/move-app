import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FieldSetting, FIELD_TYPE_LABELS } from '@/types';
import { colors, spacing, borderRadius, typography } from '@/theme';

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
  return (
    <View style={styles.row}>
      <View style={styles.reorderButtons}>
        <Pressable
          onPress={onMoveUp}
          disabled={isFirst}
          style={[styles.arrowBtn, isFirst && styles.arrowBtnDisabled]}
        >
          <Text style={[styles.arrowText, isFirst && styles.arrowTextDisabled]}>▲</Text>
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          disabled={isLast}
          style={[styles.arrowBtn, isLast && styles.arrowBtnDisabled]}
        >
          <Text style={[styles.arrowText, isLast && styles.arrowTextDisabled]}>▼</Text>
        </Pressable>
      </View>

      <View style={styles.info}>
        <Text style={styles.fieldName}>{setting.key}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{FIELD_TYPE_LABELS[setting.type]}</Text>
        </View>
      </View>

      {!setting.isCore ? (
        <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
          <Text style={styles.deleteText}>✕</Text>
        </Pressable>
      ) : (
        <View style={styles.coreBadge}>
          <Text style={styles.coreText}>Required</Text>
        </View>
      )}

      <Pressable onPress={onToggleVisibility} style={styles.visibilityBtn} hitSlop={8}>
        <Text style={[styles.visibilityIcon, !setting.isVisible && styles.visibilityIconHidden]}>
          {setting.isVisible ? '👁' : '👁‍🗨'}
        </Text>
        <Text style={styles.visibilityText}>
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
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    color: colors.textSecondary,
  },
  arrowTextDisabled: {
    color: colors.textTertiary,
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
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary,
  },
  deleteBtn: {
    padding: spacing.sm,
  },
  deleteText: {
    fontSize: 16,
    color: colors.danger,
    fontWeight: '600',
  },
  coreBadge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  coreText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  visibilityBtn: {
    alignItems: 'center',
    marginLeft: spacing.md,
    padding: spacing.xs,
  },
  visibilityIcon: {
    fontSize: 16,
    color: colors.primary,
  },
  visibilityIconHidden: {
    color: colors.textTertiary,
    opacity: 0.5,
  },
  visibilityText: {
    fontSize: 9,
    marginTop: 2,
    color: colors.textSecondary,
  },
});
