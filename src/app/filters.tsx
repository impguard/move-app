import React, { useState } from 'react';
import { View, ScrollView, Text, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Switch, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useFieldSettings } from '@/store/useFieldSettings';
import { useFilters, ActiveFilters, FieldFilter } from '@/store/useFilters';
import { useReviews } from '@/store/useReviews';
import { useTheme, spacing, borderRadius, typography } from '@/theme';
import { getHashColor } from '@/utils/colors';

export default function FiltersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { fieldSettings } = useFieldSettings();
  const { reviews } = useReviews(fieldSettings);
  const { filters, updateFilters, clearFilters, hiddenFilter, setHiddenFilter } = useFilters();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isNarrow = width < 768;
  const isFullScreen = Platform.OS !== 'web' || isNarrow;

  const [localFilters, setLocalFilters] = useState<ActiveFilters>(filters);
  const [localHiddenFilter, setLocalHiddenFilter] = useState(hiddenFilter);

  const handleApply = () => {
    updateFilters(localFilters);
    setHiddenFilter(localHiddenFilter);
    router.back();
  };

  const handleClear = () => {
    clearFilters();
    setLocalHiddenFilter('active');
    router.back();
  };

  const updateLocalFilter = (id: string, updates: Partial<FieldFilter>) => {
    setLocalFilters((prev) => {
      const current = prev[id] || {};
      const updated = { ...current, ...updates };
      if (
        updated.min === undefined &&
        updated.max === undefined &&
        updated.bool === undefined &&
        (!updated.tags || updated.tags.length === 0) &&
        (!updated.labels || updated.labels.length === 0) &&
        updated.bedsMin === undefined &&
        updated.bedsMax === undefined &&
        updated.bathsMin === undefined &&
        updated.bathsMax === undefined
      ) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: updated };
    });
  };

  const getUniqueValues = (settingId: string) => {
    const allValues = new Set<string>();
    reviews.forEach((r) => {
      const val = r.fields[settingId];
      if (Array.isArray(val)) {
        val.forEach((t) => allValues.add(String(t)));
      } else if (typeof val === 'string' && val.trim()) {
        allValues.add(val.trim());
      }
    });
    return Array.from(allValues).sort();
  };

  const getPresets = (settingId: string, type: string) => {
    const values = reviews
      .map((r) => Number(r.fields[settingId]))
      .filter((v) => !isNaN(v) && v !== 0);
    
    if (values.length === 0) return null;

    const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);
    const format = (val: number) => type === 'dollar' ? `$${val.toLocaleString()}` : String(val);

    if (uniqueValues.length === 1) {
      return [{ label: format(uniqueValues[0]), min: uniqueValues[0], max: uniqueValues[0] }];
    }
    
    if (uniqueValues.length === 2) {
      return [
        { label: format(uniqueValues[0]), min: uniqueValues[0], max: uniqueValues[0] },
        { label: format(uniqueValues[1]), min: uniqueValues[1], max: uniqueValues[1] },
      ];
    }

    const min = Math.min(...uniqueValues);
    const max = Math.max(...uniqueValues);

    const diff = max - min;
    const step = diff / 3;

    const roundTo = type === 'dollar' ? 100 : type === 'sqft' ? 50 : type === 'score' ? 0.5 : 1;
    const round = (val: number) => Math.round(val / roundTo) * roundTo;

    const p1Max = round(min + step);
    const p2Max = round(min + step * 2);

    return [
      { label: `Up to ${format(p1Max)}`, min: undefined, max: p1Max },
      { label: `${format(p1Max)} – ${format(p2Max)}`, min: p1Max, max: p2Max },
      { label: `Over ${format(p2Max)}`, min: p2Max, max: undefined },
    ];
  };

  const getBedsBathsPresets = (settingId: string, subField: 'beds' | 'baths') => {
    const values = reviews
      .map((r) => {
        const bb = r.fields[settingId] as { beds?: number; baths?: number };
        if (!bb) return NaN;
        return Number(bb[subField]);
      })
      .filter((v) => !isNaN(v) && v !== 0);

    if (values.length === 0) return null;

    const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);
    
    if (uniqueValues.length <= 4) {
      return uniqueValues.map(v => ({ label: String(v), min: v, max: v }));
    }

    const min = Math.min(...uniqueValues);
    const max = Math.max(...uniqueValues);
    const step = (max - min) / 3;
    const p1Max = Math.round(min + step);
    const p2Max = Math.round(min + step * 2);

    return [
      { label: `Up to ${p1Max}`, min: undefined, max: p1Max },
      { label: `${p1Max} – ${p2Max}`, min: p1Max, max: p2Max },
      { label: `Over ${p2Max}`, min: p2Max, max: undefined },
    ];
  };

  const filterableSettings = fieldSettings.filter((s) =>
    s.isFilterable !== false && ['score', 'dollar', 'sqft', 'number', 'boolean', 'strict_boolean', 'tag', 'label', 'beds_baths'].includes(s.type)
  );

  return (
    <>
      <Stack.Screen
        options={{
          presentation: Platform.OS === 'web' ? 'transparentModal' : 'modal',
          headerShown: false,
          animation: Platform.OS === 'web' ? 'fade' : 'default',
        }}
      />
      <View style={[styles.backdropContainer, isFullScreen && { backgroundColor: colors.background, justifyContent: 'flex-start', paddingTop: insets.top }]}>
        {Platform.OS === 'web' && (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />
        )}
        <KeyboardAvoidingView
          style={[
            styles.sheetContent,
            { backgroundColor: colors.background },
            isFullScreen && styles.sheetContentNative
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={[styles.dragHandle, { backgroundColor: colors.borderLight }]} />
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Filters</Text>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
            contentInsetAdjustmentBehavior="automatic"
          >
            <View style={[styles.filterSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Visibility Status</Text>
              <View style={styles.boolRow}>
                {(['active', 'hidden', 'all'] as const).map((opt) => {
                  const isSelected = localHiddenFilter === opt;
                  const label = opt === 'active' ? 'Active Only' : opt === 'hidden' ? 'Hidden Only' : 'Show All';
                  return (
                    <Pressable
                      key={opt}
                      style={[
                        styles.boolBtn,
                        { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
                        isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                      ]}
                      onPress={() => setLocalHiddenFilter(opt)}
                    >
                      <Text style={[styles.boolText, { color: colors.textSecondary }, isSelected && { color: colors.primary, fontWeight: '600' }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
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
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }} contentContainerStyle={styles.presetsRow}>
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
                          onPress={() => isSelected ? updateLocalFilter(setting.id, { min: undefined, max: undefined }) : updateLocalFilter(setting.id, { min: p.min, max: p.max })}
                        >
                          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={[styles.presetText, { fontWeight: '600', opacity: 0, height: 0 }]}>{p.label}</Text>
                            <Text style={[styles.presetText, { color: colors.textSecondary }, isSelected && { color: colors.primary, fontWeight: '600' }]}>
                              {p.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            );
          }
          
          if (setting.type === 'beds_baths') {
            return (
              <View key={setting.id} style={[styles.filterSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{setting.key}</Text>
                
                <Text style={[styles.label, { color: colors.textTertiary, fontSize: 12, marginTop: 4, marginBottom: 8 }]}>Beds Range</Text>
                <View style={styles.rangeRow}>
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight }]}
                    placeholder="Min"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={currentFilter.bedsMin !== undefined ? String(currentFilter.bedsMin) : ''}
                    onChangeText={(t) => {
                      const num = parseFloat(t);
                      updateLocalFilter(setting.id, { bedsMin: isNaN(num) ? undefined : num });
                    }}
                  />
                  <Text style={[styles.rangeDash, { color: colors.textSecondary }]}>–</Text>
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight }]}
                    placeholder="Max"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={currentFilter.bedsMax !== undefined ? String(currentFilter.bedsMax) : ''}
                    onChangeText={(t) => {
                      const num = parseFloat(t);
                      updateLocalFilter(setting.id, { bedsMax: isNaN(num) ? undefined : num });
                    }}
                  />
                </View>
                {getBedsBathsPresets(setting.id, 'beds') && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }} contentContainerStyle={styles.presetsRow}>
                    {getBedsBathsPresets(setting.id, 'beds')!.map((p, i) => {
                      const isSelected = currentFilter.bedsMin === p.min && currentFilter.bedsMax === p.max;
                      return (
                        <Pressable
                          key={i}
                          style={[
                            styles.presetChip,
                            { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
                            isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                          ]}
                          onPress={() => isSelected ? updateLocalFilter(setting.id, { bedsMin: undefined, bedsMax: undefined }) : updateLocalFilter(setting.id, { bedsMin: p.min, bedsMax: p.max })}
                        >
                          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={[styles.presetText, { fontWeight: '600', opacity: 0, height: 0 }]}>{p.label}</Text>
                            <Text style={[styles.presetText, { color: colors.textSecondary }, isSelected && { color: colors.primary, fontWeight: '600' }]}>
                              {p.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}

                <Text style={[styles.label, { color: colors.textTertiary, fontSize: 12, marginTop: 16, marginBottom: 8 }]}>Baths Range</Text>
                <View style={styles.rangeRow}>
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight }]}
                    placeholder="Min"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={currentFilter.bathsMin !== undefined ? String(currentFilter.bathsMin) : ''}
                    onChangeText={(t) => {
                      const num = parseFloat(t);
                      updateLocalFilter(setting.id, { bathsMin: isNaN(num) ? undefined : num });
                    }}
                  />
                  <Text style={[styles.rangeDash, { color: colors.textSecondary }]}>–</Text>
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight }]}
                    placeholder="Max"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={currentFilter.bathsMax !== undefined ? String(currentFilter.bathsMax) : ''}
                    onChangeText={(t) => {
                      const num = parseFloat(t);
                      updateLocalFilter(setting.id, { bathsMax: isNaN(num) ? undefined : num });
                    }}
                  />
                </View>
                {getBedsBathsPresets(setting.id, 'baths') && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }} contentContainerStyle={styles.presetsRow}>
                    {getBedsBathsPresets(setting.id, 'baths')!.map((p, i) => {
                      const isSelected = currentFilter.bathsMin === p.min && currentFilter.bathsMax === p.max;
                      return (
                        <Pressable
                          key={i}
                          style={[
                            styles.presetChip,
                            { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
                            isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                          ]}
                          onPress={() => isSelected ? updateLocalFilter(setting.id, { bathsMin: undefined, bathsMax: undefined }) : updateLocalFilter(setting.id, { bathsMin: p.min, bathsMax: p.max })}
                        >
                          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={[styles.presetText, { fontWeight: '600', opacity: 0, height: 0 }]}>{p.label}</Text>
                            <Text style={[styles.presetText, { color: colors.textSecondary }, isSelected && { color: colors.primary, fontWeight: '600' }]}>
                              {p.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            );
          }

          if (setting.type === 'boolean' || setting.type === 'strict_boolean') {
            const options = setting.type === 'strict_boolean'
              ? (['Any', 'Yes', 'No'] as const)
              : (['Any', 'Yes', 'No', 'Unknown'] as const);

            return (
              <View key={setting.id} style={[styles.filterSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{setting.key}</Text>
                <View style={styles.boolRow}>
                  {options.map((opt) => {
                    let isSelected = false;
                    if (opt === 'Any') isSelected = currentFilter.bool === undefined;
                    if (opt === 'Yes') isSelected = currentFilter.bool === true;
                    if (opt === 'No') isSelected = currentFilter.bool === false;
                    if (opt === 'Unknown') isSelected = currentFilter.bool === null;

                    return (
                      <Pressable
                        key={opt}
                        style={[
                          styles.boolBtn,
                          { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
                          isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                        ]}
                        onPress={() => {
                          if (opt === 'Any') updateLocalFilter(setting.id, { bool: undefined });
                          if (opt === 'Yes') updateLocalFilter(setting.id, { bool: true });
                          if (opt === 'No') updateLocalFilter(setting.id, { bool: false });
                          if (opt === 'Unknown') updateLocalFilter(setting.id, { bool: null });
                        }}
                      >
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={[styles.boolText, { fontWeight: '600', opacity: 0, height: 0 }]}>{opt}</Text>
                          <Text style={[styles.boolText, { color: colors.textSecondary }, isSelected && { color: colors.primary, fontWeight: '600' }]}>
                            {opt}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          }

          if (setting.type === 'tag' || setting.type === 'label' || setting.type === 'address') {
            const isLabel = setting.type !== 'tag';
            const uniqueTags = getUniqueValues(setting.id);
            const selectedTags = (isLabel ? currentFilter.labels : currentFilter.tags) || [];
            if (uniqueTags.length === 0) return (
              <View key={setting.id} style={[styles.filterSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{setting.key}</Text>
                <Text style={[styles.noTagsText, { color: colors.textTertiary }]}>No values exist yet. Add data to reviews first.</Text>
              </View>
            );

            return (
              <View key={setting.id} style={[styles.filterSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{setting.key} {isLabel ? '(Any of)' : '(All of)'}</Text>
                <View style={styles.tagRow}>
                  {uniqueTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    const hc = getHashColor(tag);
                    return (
                      <Pressable
                        key={tag}
                        style={[
                          styles.tagChip,
                          { backgroundColor: hc.bg, borderColor: hc.text + '44' },
                          isSelected && { backgroundColor: hc.text, borderColor: hc.text },
                        ]}
                        onPress={() => {
                          let newTags = [...selectedTags];
                          if (isSelected) newTags = newTags.filter((t) => t !== tag);
                          else newTags.push(tag);
                          
                          if (isLabel) {
                            updateLocalFilter(setting.id, { labels: newTags.length > 0 ? newTags : undefined });
                          } else {
                            updateLocalFilter(setting.id, { tags: newTags.length > 0 ? newTags : undefined });
                          }
                        }}
                      >
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={[styles.tagText, { fontWeight: '500', opacity: 0, height: 0 }]}>{tag}</Text>
                          <Text style={[styles.tagText, { color: hc.text }, isSelected && { color: '#fff', fontWeight: '500' }]}>
                            {tag}
                          </Text>
                        </View>
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
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdropContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContent: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.2)',
    elevation: 24,
  },
  sheetContentNative: {
    maxHeight: '100%',
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    boxShadow: 'none',
    elevation: 0,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 20,
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
    borderRadius: borderRadius.xl,
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
    borderRadius: borderRadius.xl,
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
    minWidth: 0,
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
    gap: spacing.sm,
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
