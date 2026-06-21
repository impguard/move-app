import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FieldSetting, FIELD_TYPE_LABELS } from '@/types';
import { useTheme, spacing, borderRadius, typography } from '@/theme';

interface FieldSettingRowProps {
  setting: FieldSetting;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onToggleListVisibility: () => void;
  onToggleMapVisibility: () => void;
  onToggleSortable: () => void;
  onToggleFilterable: () => void;
}

export function FieldSettingRow({
  setting,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
  onToggleListVisibility,
  onToggleMapVisibility,
  onToggleSortable,
  onToggleFilterable,
}: FieldSettingRowProps) {
  const { colors } = useTheme();

  const isSortableType = ['score', 'dollar', 'sqft', 'number', 'boolean', 'label', 'address'].includes(setting.type);
  const isFilterableType = ['score', 'dollar', 'sqft', 'number', 'boolean', 'tag', 'label', 'address'].includes(setting.type);

  // For backward compatibility, if undefined, we assume default true if the type supports it
  const isSortable = setting.isSortable !== false;
  const isFilterable = setting.isFilterable !== false;

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

      <View style={styles.toggles}>
        {isFilterableType && (
          <Pressable onPress={onToggleFilterable} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="filter" size={16} color={isFilterable ? colors.primary : colors.textTertiary} style={{ opacity: isFilterable ? 1 : 0.5 }} />
            <Text style={[styles.iconText, { color: isFilterable ? colors.primary : colors.textTertiary }]}>Filter</Text>
          </Pressable>
        )}
        {isSortableType && (
          <Pressable onPress={onToggleSortable} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="swap-vertical" size={16} color={isSortable ? colors.primary : colors.textTertiary} style={{ opacity: isSortable ? 1 : 0.5 }} />
            <Text style={[styles.iconText, { color: isSortable ? colors.primary : colors.textTertiary }]}>Sort</Text>
          </Pressable>
        )}
        <Pressable onPress={onToggleListVisibility} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="card-outline" size={16} color={setting.isVisibleList ? colors.primary : colors.textTertiary} style={{ opacity: setting.isVisibleList ? 1 : 0.5 }} />
          <Text style={[styles.iconText, { color: setting.isVisibleList ? colors.textSecondary : colors.textTertiary }]}>
            {setting.isVisibleList ? 'Card' : 'Hidden'}
          </Text>
        </Pressable>
        <Pressable onPress={onToggleMapVisibility} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="location-outline" size={16} color={setting.isVisibleMap ? colors.primary : colors.textTertiary} style={{ opacity: setting.isVisibleMap ? 1 : 0.5 }} />
          <Text style={[styles.iconText, { color: setting.isVisibleMap ? colors.textSecondary : colors.textTertiary }]}>
            {setting.isVisibleMap ? 'Pin' : 'Hidden'}
          </Text>
        </Pressable>
      </View>
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
    marginRight: spacing.sm,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
  coreBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  coreText: {
    fontSize: 11,
    fontWeight: '500',
  },
  toggles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBtn: {
    alignItems: 'center',
    width: 32,
  },
  visibilityIcon: {
    fontSize: 16,
  },
  iconText: {
    fontSize: 8,
    marginTop: 2,
    fontWeight: '500',
  },
});
