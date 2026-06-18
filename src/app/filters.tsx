import React, { useState } from 'react';
import { View, ScrollView, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFieldSettings } from '@/store/useFieldSettings';
import { useFilters, ActiveFilters, FieldFilter } from '@/store/useFilters';
import { useReviews } from '@/store/useReviews';
import { colors, spacing, borderRadius, typography } from '@/theme';

export default function FiltersScreen() {
  const router = useRouter();
  const { fieldSettings } = useFieldSettings();
  const { reviews } = useReviews(fieldSettings);
  const { filters, updateFilters, clearFilters } = useFilters();

  const [localFilters, setLocalFilters] = useState<ActiveFilters>(filters);

  const handleApply = () => {
    updateFilters(localFilters);
    router.back();
  };

  const handleClear = () => {
    clearFilters();
    router.back();
  };

  const updateLocalFilter = (id: string, updates: Partial<FieldFilter>) => {
    setLocalFilters((prev) => {
      const current = prev[id] || {};
      const updated = { ...current, ...updates };
      // Clean up empty filters
      if (
        updated.min === undefined &&
        updated.max === undefined &&
        (updated.bool === undefined || updated.bool === null) &&
        (!updated.tags || updated.tags.length === 0)
      ) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: updated };
    });
  };

  const getUniqueTags = (settingId: string) => {
    const allTags = new Set<string>();
    reviews.forEach((r) => {
      const val = r.fields[settingId];
      if (Array.isArray(val)) {
        val.forEach((t) => allTags.add(String(t)));
      }
    });
    return Array.from(allTags);
  };

  const getPresets = (settingId: string, type: string) => {
    const values = reviews
      .map((r) => Number(r.fields[settingId]))
      .filter((v) => !isNaN(v) && v !== 0);
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return null;

    const diff = max - min;
    const step = diff / 3;
    
    // Nice rounding
    const roundTo = type === 'dollar' ? 100 : type === 'sqft' ? 50 : type === 'score' ? 0.5 : 1;
    const round = (val: number) => Math.round(val / roundTo) * roundTo;
    
    const p1Max = round(min + step);
    const p2Max = round(min + step * 2);

    const format = (val: number) => type === 'dollar' ? `$${val}` : String(val);

    return [
      { label: `Up to ${format(p1Max)}`, min: undefined, max: p1Max },
      { label: `${format(p1Max)} - ${format(p2Max)}`, min: p1Max, max: p2Max },
      { label: `Over ${format(p2Max)}`, min: p2Max, max: undefined },
    ];
  };

  const filterableSettings = fieldSettings.filter((s) =>
    ['score', 'dollar', 'sqft', 'number', 'boolean', 'tag'].includes(s.type)
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Filters',
          presentation: 'modal',
          headerLeft: () => (
            <Pressable onPress={handleClear} style={styles.headerBtn} hitSlop={8}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={handleApply} style={styles.headerBtn} hitSlop={8}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {filterableSettings.length === 0 && (
          <Text style={styles.emptyText}>No filterable properties available.</Text>
        )}

        {filterableSettings.map((setting) => {
          const currentFilter = localFilters[setting.id] || {};

          if (['score', 'dollar', 'sqft', 'number'].includes(setting.type)) {
            return (
              <View key={setting.id} style={styles.filterSection}>
                <Text style={styles.label}>{setting.key} Range</Text>
                <View style={styles.rangeRow}>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="Min"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={currentFilter.min !== undefined ? String(currentFilter.min) : ''}
                    onChangeText={(t) => {
                      const num = parseFloat(t);
                      updateLocalFilter(setting.id, { min: isNaN(num) ? undefined : num });
                    }}
                  />
                  <Text style={styles.rangeDash}>-</Text>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="Max"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={currentFilter.max !== undefined ? String(currentFilter.max) : ''}
                    onChangeText={(t) => {
                      const num = parseFloat(t);
                      updateLocalFilter(setting.id, { max: isNaN(num) ? undefined : num });
                    }}
                  />
                </View>
                {getPresets(setting.id, setting.type) && (
                  <View style={styles.presetsRow}>
                    {getPresets(setting.id, setting.type)!.map((p, i) => {
                      const isSelected = currentFilter.min === p.min && currentFilter.max === p.max;
                      return (
                        <Pressable
                          key={i}
                          style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                          onPress={() => updateLocalFilter(setting.id, { min: p.min, max: p.max })}
                        >
                          <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>{p.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          }

          if (setting.type === 'boolean') {
            return (
              <View key={setting.id} style={styles.filterSection}>
                <Text style={styles.label}>{setting.key}</Text>
                <View style={styles.boolRow}>
                  {['Any', 'Yes', 'No'].map((opt) => {
                    let isSelected = false;
                    if (opt === 'Any') isSelected = currentFilter.bool === undefined || currentFilter.bool === null;
                    if (opt === 'Yes') isSelected = currentFilter.bool === true;
                    if (opt === 'No') isSelected = currentFilter.bool === false;

                    return (
                      <Pressable
                        key={opt}
                        style={[styles.boolBtn, isSelected && styles.boolBtnSelected]}
                        onPress={() => {
                          if (opt === 'Any') updateLocalFilter(setting.id, { bool: null });
                          if (opt === 'Yes') updateLocalFilter(setting.id, { bool: true });
                          if (opt === 'No') updateLocalFilter(setting.id, { bool: false });
                        }}
                      >
                        <Text style={[styles.boolText, isSelected && styles.boolTextSelected]}>
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          }

          if (setting.type === 'tag') {
            const uniqueTags = getUniqueTags(setting.id);
            const selectedTags = currentFilter.tags || [];
            if (uniqueTags.length === 0) return null;

            return (
              <View key={setting.id} style={styles.filterSection}>
                <Text style={styles.label}>{setting.key}</Text>
                <View style={styles.tagRow}>
                  {uniqueTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                        onPress={() => {
                          let newTags = [...selectedTags];
                          if (isSelected) newTags = newTags.filter((t) => t !== tag);
                          else newTags.push(tag);
                          updateLocalFilter(setting.id, { tags: newTags.length > 0 ? newTags : undefined });
                        }}
                      >
                        <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          }

          return null;
        })}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    paddingHorizontal: spacing.md,
  },
  clearBtnText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  applyBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  filterSection: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.md,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rangeInput: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rangeDash: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  presetChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSecondary,
  },
  presetChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  presetTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  boolRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  boolBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSecondary,
  },
  boolBtnSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  boolText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  boolTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSecondary,
  },
  tagChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tagTextSelected: {
    color: colors.surface,
    fontWeight: '500',
  },
});
