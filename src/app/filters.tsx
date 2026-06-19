import React, { useState } from 'react';
import { View, ScrollView, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useFieldSettings } from '@/store/useFieldSettings';
import { useFilters, ActiveFilters, FieldFilter } from '@/store/useFilters';
import { useReviews } from '@/store/useReviews';
import { useTheme, spacing, borderRadius, typography } from '@/theme';

export default function FiltersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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

    const roundTo = type === 'dollar' ? 100 : type === 'sqft' ? 50 : type === 'score' ? 0.5 : 1;
    const round = (val: number) => Math.round(val / roundTo) * roundTo;

    const p1Max = round(min + step);
    const p2Max = round(min + step * 2);

    const format = (val: number) => type === 'dollar' ? `$${val.toLocaleString()}` : String(val);

    return [
      { label: `Up to ${format(p1Max)}`, min: undefined, max: p1Max },
      { label: `${format(p1Max)} – ${format(p2Max)}`, min: p1Max, max: p2Max },
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
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
        }}
      />
      <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
        >
        {filterableSettings.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No filterable fields</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Filters are available for numeric fields (price, sqft, score, number), boolean toggles, and tag fields.
              Add these field types in Settings to enable filtering.
            </Text>
          </View>
        )}

        {filterableSettings.map((setting) => {
          const currentFilter = localFilters[setting.id] || {};

          if (['score', 'dollar', 'sqft', 'number'].includes(setting.type)) {
            return (
              <View key={setting.id} style={[styles.filterSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{setting.key} Range</Text>
                <View style={styles.rangeRow}>
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight }]}
                    placeholder="Min"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={currentFilter.min !== undefined ? String(currentFilter.min) : ''}
                    onChangeText={(t) => {
                      const num = parseFloat(t);
                      updateLocalFilter(setting.id, { min: isNaN(num) ? undefined : num });
                    }}
                  />
                  <Text style={[styles.rangeDash, { color: colors.textSecondary }]}>–</Text>
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight }]}
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
                          style={[
                            styles.presetChip,
                            { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
                            isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                          ]}
                          onPress={() => updateLocalFilter(setting.id, { min: p.min, max: p.max })}
                        >
                          <Text style={[styles.presetText, { color: colors.textSecondary }, isSelected && { color: colors.primary, fontWeight: '600' }]}>
                            {p.label}
                          </Text>
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
              <View key={setting.id} style={[styles.filterSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{setting.key}</Text>
                <View style={styles.boolRow}>
                  {(['Any', 'Yes', 'No'] as const).map((opt) => {
                    let isSelected = false;
                    if (opt === 'Any') isSelected = currentFilter.bool === undefined || currentFilter.bool === null;
                    if (opt === 'Yes') isSelected = currentFilter.bool === true;
                    if (opt === 'No') isSelected = currentFilter.bool === false;

                    return (
                      <Pressable
                        key={opt}
                        style={[
                          styles.boolBtn,
                          { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
                          isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                        ]}
                        onPress={() => {
                          if (opt === 'Any') updateLocalFilter(setting.id, { bool: null });
                          if (opt === 'Yes') updateLocalFilter(setting.id, { bool: true });
                          if (opt === 'No') updateLocalFilter(setting.id, { bool: false });
                        }}
                      >
                        <Text style={[styles.boolText, { color: colors.textSecondary }, isSelected && { color: colors.primary, fontWeight: '600' }]}>
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
            if (uniqueTags.length === 0) return (
              <View key={setting.id} style={[styles.filterSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{setting.key}</Text>
                <Text style={[styles.noTagsText, { color: colors.textTertiary }]}>No tags exist yet. Add tags to reviews first.</Text>
              </View>
            );

            return (
              <View key={setting.id} style={[styles.filterSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{setting.key}</Text>
                <View style={styles.tagRow}>
                  {uniqueTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        style={[
                          styles.tagChip,
                          { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => {
                          let newTags = [...selectedTags];
                          if (isSelected) newTags = newTags.filter((t) => t !== tag);
                          else newTags.push(tag);
                          updateLocalFilter(setting.id, { tags: newTags.length > 0 ? newTags : undefined });
                        }}
                      >
                        <Text style={[styles.tagText, { color: colors.textSecondary }, isSelected && { color: '#fff', fontWeight: '500' }]}>
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

        {/* Clear all link at the bottom */}
        {Object.keys(localFilters).length > 0 && (
          <Pressable onPress={() => { setLocalFilters({}); }} style={styles.clearAllBtn}>
            <Text style={[styles.clearAllText, { color: colors.textTertiary }]}>Clear all filters</Text>
          </Pressable>
        )}

        {/* Bottom padding for FAB */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Apply FAB */}
      <Pressable
        onPress={handleApply}
        style={({ pressed }) => [
          styles.applyFab,
          { backgroundColor: colors.success },
          pressed && styles.applyFabPressed,
        ]}
      >
        <Ionicons name="checkmark" size={28} color="#fff" />
      </Pressable>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  clearAllBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  clearAllText: {
    ...typography.caption,
  },
  applyFab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxxl,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
    elevation: 8,
  },
  applyFabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    lineHeight: 22,
  },
  filterSection: {
    marginBottom: spacing.xl,
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
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  rangeDash: {
    fontSize: 20,
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
  },
  presetText: {
    fontSize: 13,
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
  },
  boolText: {
    ...typography.bodyMedium,
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
  },
  tagText: {
    fontSize: 14,
  },
  noTagsText: {
    ...typography.caption,
    fontStyle: 'italic',
  },
});
