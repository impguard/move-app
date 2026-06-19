import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, Pressable, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ReviewCard } from '@/components/ReviewCard';
import { ReviewsMap } from '@/components/ReviewsMap';
import { EmptyState } from '@/components/EmptyState';
import { useReviews } from '@/store/useReviews';
import { useFieldSettings } from '@/store/useFieldSettings';
import { useFilters } from '@/store/useFilters';
import { useTheme, spacing, borderRadius, shadows, typography } from '@/theme';

export default function ReviewListScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { fieldSettings, loading: settingsLoading } = useFieldSettings();
  const { reviews, loading: reviewsLoading, createReview, reload } = useReviews(fieldSettings);
  const { filters, updateFilters } = useFilters();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const loading = settingsLoading || reviewsLoading;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (review.status === 'draft') return false;

      for (const [fieldId, filter] of Object.entries(filters)) {
        const val = review.fields[fieldId];

        if (filter.min !== undefined) {
          const numVal = Number(val);
          if (isNaN(numVal) || numVal < filter.min) return false;
        }
        if (filter.max !== undefined) {
          const numVal = Number(val);
          if (isNaN(numVal) || numVal > filter.max) return false;
        }

        if (filter.bool !== undefined && filter.bool !== null) {
          if (Boolean(val) !== filter.bool) return false;
        }

        if (filter.tags && filter.tags.length > 0) {
          if (!Array.isArray(val)) return false;
          const hasAllTags = filter.tags.every((t) => val.includes(t));
          if (!hasAllTags) return false;
        }
      }
      return true;
    });
  }, [reviews, filters]);

  const handleCreate = async () => {
    const id = await createReview();
    router.push(`/review/${id}`);
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  // Count actual active filter criteria (not just field entries)
  const activeFilterChips = useMemo(() => {
    const chips: { fieldId: string; type: 'range' | 'bool' | 'tag'; tagValue?: string; label: string }[] = [];
    for (const [fieldId, f] of Object.entries(filters)) {
      const setting = fieldSettings.find((s) => s.id === fieldId);
      if (!setting) continue;

      if (f.min !== undefined || f.max !== undefined) {
        let label = setting.key + ': ';
        if (f.min !== undefined && f.max !== undefined) label += `${f.min} – ${f.max}`;
        else if (f.min !== undefined) label += `≥ ${f.min}`;
        else label += `≤ ${f.max}`;
        chips.push({ fieldId, type: 'range', label });
      }
      if (f.bool !== undefined && f.bool !== null) {
        chips.push({ fieldId, type: 'bool', label: `${setting.key}: ${f.bool ? 'Yes' : 'No'}` });
      }
      if (f.tags && f.tags.length > 0) {
        f.tags.forEach((tag) => {
          chips.push({ fieldId, type: 'tag', tagValue: tag, label: tag });
        });
      }
    }
    return chips;
  }, [filters, fieldSettings]);

  const activeFilterCount = activeFilterChips.length;

  const removeFilter = (fieldId: string, filterType: 'range' | 'bool' | 'tag', tagValue?: string) => {
    const newFilters: typeof filters = {};
    for (const [fid, f] of Object.entries(filters)) {
      // deep-copy each filter entry to avoid mutating originals
      newFilters[fid] = { ...f, tags: f.tags ? [...f.tags] : undefined };
    }

    const f = newFilters[fieldId];
    if (!f) return;

    if (filterType === 'range') {
      f.min = undefined;
      f.max = undefined;
    } else if (filterType === 'bool') {
      f.bool = undefined;
    } else if (filterType === 'tag' && tagValue) {
      if (f.tags) {
        f.tags = f.tags.filter((t) => t !== tagValue);
        if (f.tags.length === 0) f.tags = undefined;
      }
    }

    if (
      f.min === undefined &&
      f.max === undefined &&
      (f.bool === undefined || f.bool === null) &&
      (!f.tags || f.tags.length === 0)
    ) {
      delete newFilters[fieldId];
    }
    updateFilters(newFilters);
  };

  const renderActiveFilters = () => {
    if (activeFilterChips.length === 0) return null;

    return (
      <View style={[styles.activeFiltersContainer, { borderBottomColor: colors.borderLight }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
          {activeFilterChips.map((chip, i) => (
            <Pressable
              key={i}
              style={[styles.activeFilterChip, { backgroundColor: colors.primaryLight }]}
              onPress={() => removeFilter(chip.fieldId, chip.type, chip.tagValue)}
            >
              <Text style={[styles.activeFilterText, { color: colors.primary }]}>{chip.label}</Text>
              <Ionicons name="close-circle" size={15} color={colors.primary} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Custom header title: "Move" + filter chips inline
  const HeaderTitle = useCallback(() => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.headerTitleRow}
      style={styles.headerTitleScroll}
    >
      <Text style={[styles.appTitle, { color: colors.text }]}>Move</Text>
      {activeFilterChips.map((chip, i) => (
        <Pressable
          key={i}
          style={[styles.headerFilterChip, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '55' }]}
          onPress={() => removeFilter(chip.fieldId, chip.type, chip.tagValue)}
        >
          <Text style={[styles.headerFilterChipText, { color: colors.primary }]}>{chip.label}</Text>
          <Ionicons name="close-circle" size={13} color={colors.primary} />
        </Pressable>
      ))}
    </ScrollView>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [activeFilterChips, colors]);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <HeaderTitle />,
          headerStyle: { backgroundColor: colors.surface },
          headerRight: () => (
            <View style={styles.headerRight}>
              {/* Theme toggle */}
              <Pressable onPress={toggleTheme} style={styles.headerIconBtn} hitSlop={12}>
                <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textSecondary} />
              </Pressable>

              {/* Settings */}
              <Pressable onPress={handleSettings} style={styles.headerIconBtn} hitSlop={12}>
                <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Unified filter bar: segment toggle + filter button + chips all in one row */}
        <View style={styles.filterBar}>
          {/* Segment control */}
          <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceSecondary }]}>
            <Pressable
              style={[styles.segmentBtn, viewMode === 'list' && [styles.segmentBtnActive, { backgroundColor: colors.surface, ...shadows.sm }]]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[styles.segmentText, { color: colors.textSecondary }, viewMode === 'list' && { color: colors.primary, fontWeight: '600' }]}>List</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentBtn, viewMode === 'map' && [styles.segmentBtnActive, { backgroundColor: colors.surface, ...shadows.sm }]]}
              onPress={() => setViewMode('map')}
            >
              <Text style={[styles.segmentText, { color: colors.textSecondary }, viewMode === 'map' && { color: colors.primary, fontWeight: '600' }]}>Map</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={[styles.filterBarDivider, { backgroundColor: colors.borderLight }]} />

          {/* Scrollable section: Filters button + chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBarScroll}
            style={styles.filterBarScrollContainer}
          >
            <Pressable
              onPress={() => router.push('/filters')}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: activeFilterCount > 0 ? colors.primary : colors.surfaceSecondary,
                  borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
                },
              ]}
              hitSlop={4}
            >
              <Ionicons
                name="options-outline"
                size={14}
                color={activeFilterCount > 0 ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.filterBtnText, { color: activeFilterCount > 0 ? '#fff' : colors.textSecondary }]}>
                Filters
              </Text>
            </Pressable>

            {activeFilterChips.map((chip, i) => (
              <Pressable
                key={i}
                style={[styles.activeFilterChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '44' }]}
                onPress={() => removeFilter(chip.fieldId, chip.type, chip.tagValue)}
              >
                <Text style={[styles.activeFilterText, { color: colors.primary }]}>{chip.label}</Text>
                <Ionicons name="close-circle" size={14} color={colors.primary} />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading...</Text>
          </View>
        ) : filteredReviews.length === 0 ? (
          reviews.length > 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textTertiary }]}>No reviews match the filters.</Text>
            </View>
          ) : (
            <EmptyState />
          )
        ) : viewMode === 'list' ? (
          <FlatList
            data={filteredReviews}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ReviewCard
                review={item}
                fieldSettings={fieldSettings}
                onPress={() => router.push(`/review/${item.id}`)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              Platform.OS === 'web' && styles.listContentWeb,
            ]}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ReviewsMap
            reviews={filteredReviews}
            onReviewPress={(id) => router.push(`/review/${id}`)}
            fieldSettings={fieldSettings}
            getAddress={(r) => {
              const addressSetting = fieldSettings.find((f) => f.isCore);
              return addressSetting ? String(r.fields[addressSetting.id] || 'Unknown') : 'Unknown';
            }}
          />
        )}

        <Pressable
          onPress={handleCreate}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.primary },
            pressed && styles.fabPressed,
          ]}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
  },
  // Header title area
  headerTitleScroll: {
    flexShrink: 1,
    maxWidth: Platform.OS === 'web' ? 500 : 260,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  headerFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Unified filter bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingLeft: spacing.lg,
  },
  filterBarDivider: {
    width: 1,
    height: 20,
    marginHorizontal: spacing.sm,
  },
  filterBarScrollContainer: {
    flex: 1,
  },
  filterBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  // Segment control (inside filter bar)
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 3,
  },
  segmentBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentBtnActive: {},
  segmentText: {
    ...typography.bodyMedium,
    fontSize: 13,
  },
  // Active filter row below segment (kept as secondary display; now chips are also in title)
  activeFiltersContainer: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  activeFiltersScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  activeFilterText: {
    ...typography.caption,
    fontWeight: '600',
  },
  // Header right
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerIconBtn: {
    padding: spacing.sm,
  },
  // List
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  listContentWeb: {
    maxWidth: 720,
    alignSelf: 'center' as const,
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -1,
  },
});
