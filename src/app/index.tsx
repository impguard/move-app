import { EmptyState } from '@/components/EmptyState';
import { ReviewCard } from '@/components/ReviewCard';
import { ReviewsMap } from '@/components/ReviewsMap';
import { useFieldSettings } from '@/store/useFieldSettings';
import { useFilters } from '@/store/useFilters';
import { useReviews } from '@/store/useReviews';
import { useSort } from '@/store/useSort';
import { borderRadius, shadows, spacing, typography, useTheme } from '@/theme';
import { getHashColor } from '@/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

export default function ReviewListScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { fieldSettings, loading: settingsLoading } = useFieldSettings();
  const { reviews, loading: reviewsLoading, createReview, reload } = useReviews(fieldSettings);
  const { filters, searchQuery, hideTaken, updateFilters, setSearchQuery, clearFilters, _initFromUrl } = useFilters();
  const { sort, clearSort } = useSort();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showMapLabels, setShowMapLabels] = useState(true);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isUrlInitialized, setIsUrlInitialized] = useState(false);
  const params = useLocalSearchParams<{ filters?: string; search?: string; sort?: string; hideTaken?: string; view?: 'list' | 'map'; labels?: string; searchOpen?: string }>();
  const { width } = useWindowDimensions();
  const isNarrow = width < 768;

  const loading = settingsLoading || reviewsLoading;

  React.useEffect(() => {
    if (!isUrlInitialized) {
      let initF = filters;
      let initQ = searchQuery;
      let initHT = hideTaken;
      if (params.filters) {
        try { initF = JSON.parse(decodeURIComponent(params.filters)); } catch (e) { }
      }
      if (params.search !== undefined) {
        initQ = params.search;
      }
      if (params.hideTaken !== undefined) {
        initHT = params.hideTaken === '1';
      }
      _initFromUrl(initF, initQ, initHT);

      if (params.view === 'map') setViewMode('map');
      if (params.labels === '0') setShowMapLabels(false);

      setIsUrlInitialized(true);
      if (initQ || params.searchOpen === '1') setIsSearchActive(true);
    }
  }, [params, isUrlInitialized, _initFromUrl, filters, searchQuery, hideTaken]);

  React.useEffect(() => {
    if (isUrlInitialized) {
      const fStr = Object.keys(filters).length > 0 ? JSON.stringify(filters) : '';
      const sStr = sort ? JSON.stringify(sort) : '';

      const newParams: Record<string, string | undefined> = {};

      // Setting to undefined in Expo Router effectively deletes the param
      newParams.filters = fStr || undefined;
      newParams.search = searchQuery || undefined;
      newParams.sort = sStr || undefined;
      newParams.hideTaken = hideTaken ? '1' : undefined;
      newParams.view = viewMode === 'map' ? 'map' : undefined;
      newParams.labels = !showMapLabels ? '0' : undefined;
      newParams.searchOpen = isSearchActive && !searchQuery ? '1' : undefined;

      router.setParams(newParams);
    }
  }, [filters, searchQuery, sort, hideTaken, viewMode, showMapLabels, isSearchActive, isUrlInitialized, router]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const filteredReviews = useMemo(() => {
    let filtered = reviews.filter((review) => {
      if (review.status === 'draft') return false;
      if (hideTaken && review.status === 'taken') return false;

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

        if (filter.bedsMin !== undefined || filter.bedsMax !== undefined || filter.bathsMin !== undefined || filter.bathsMax !== undefined) {
          const bb = (val || {}) as any;
          if (filter.bedsMin !== undefined && ((bb.beds ?? 0) < filter.bedsMin)) return false;
          if (filter.bedsMax !== undefined && ((bb.beds ?? 0) > filter.bedsMax)) return false;
          if (filter.bathsMin !== undefined && ((bb.baths ?? 0) < filter.bathsMin)) return false;
          if (filter.bathsMax !== undefined && ((bb.baths ?? 0) > filter.bathsMax)) return false;
        }

        if (filter.bool !== undefined) {
          if (filter.bool === null) {
            // "Unknown" explicitly requested -> keep only if the field is null/undefined
            if (val !== null && val !== undefined) return false;
          } else {
            // "Yes" or "No" -> ensure boolean cast matches
            // Treat null/undefined as false if strictly checking? Actually we should probably say if it's strictly Yes/No, it must match.
            // Wait, if it's null/undefined, and they asked for "No", does it match?
            // A boolean field that is null means "Unknown". If a user filters for "No", should Unknown be included?
            // Usually, No means explicitly false.
            if (val === null || val === undefined) return false;
            if (Boolean(val) !== filter.bool) return false;
          }
        }

        if (filter.tags && filter.tags.length > 0) {
          if (!Array.isArray(val)) return false;
          const hasAllTags = filter.tags.every((t) => val.includes(t));
          if (!hasAllTags) return false;
        }

        if (filter.labels && filter.labels.length > 0) {
          if (typeof val !== 'string') return false;
          const hasLabel = filter.labels.includes(val);
          if (!hasLabel) return false;
        }
      }
      return true;
    });

    if (sort) {
      filtered.sort((a, b) => {
        const valA = a.fields[sort.fieldId];
        const valB = b.fields[sort.fieldId];

        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        const sortDir = sort.order === 'asc' ? 1 : -1;

        if (typeof valA === 'object' && valA !== null && 'beds' in valA) {
          const bbA = valA as any;
          const bbB = (valB || {}) as any;
          const scoreA = (bbA.beds || 0) * 100 + (bbA.baths || 0);
          const scoreB = (bbB.beds || 0) * 100 + (bbB.baths || 0);
          return (scoreA - scoreB) * sortDir;
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * sortDir;
        }

        return String(valA).localeCompare(String(valB)) * sortDir;
      });
    }

    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        const addressSetting = fieldSettings.find((s) => s.isCore);
        const address = addressSetting ? String(r.fields[addressSetting.id] || '') : '';
        return address.toLowerCase().includes(lowerQuery);
      });
    }

    return filtered;
  }, [reviews, filters, sort, searchQuery, hideTaken, fieldSettings]);

  const handleCreate = () => {
    router.push('/review/new');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  // Count actual active filter criteria (not just field entries)
  const activeFilterChips = useMemo(() => {
    const chips: { fieldId: string; type: 'range' | 'bool' | 'tag' | 'label' | 'beds_baths'; tagValue?: string; label: string; color?: { bg: string, text: string } }[] = [];
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

      if (f.bedsMin !== undefined || f.bedsMax !== undefined || f.bathsMin !== undefined || f.bathsMax !== undefined) {
        let label = setting.key + ': ';
        const parts = [];
        if (f.bedsMin !== undefined || f.bedsMax !== undefined) {
          let b = 'Beds ';
          if (f.bedsMin !== undefined && f.bedsMax !== undefined) b += `${f.bedsMin}–${f.bedsMax}`;
          else if (f.bedsMin !== undefined) b += `≥${f.bedsMin}`;
          else b += `≤${f.bedsMax}`;
          parts.push(b);
        }
        if (f.bathsMin !== undefined || f.bathsMax !== undefined) {
          let b = 'Baths ';
          if (f.bathsMin !== undefined && f.bathsMax !== undefined) b += `${f.bathsMin}–${f.bathsMax}`;
          else if (f.bathsMin !== undefined) b += `≥${f.bathsMin}`;
          else b += `≤${f.bathsMax}`;
          parts.push(b);
        }
        label += parts.join(', ');
        chips.push({ fieldId, type: 'beds_baths', label });
      }

      if (f.bool !== undefined) {
        let boolLabel = 'Unknown';
        if (f.bool === true) boolLabel = 'Yes';
        if (f.bool === false) boolLabel = 'No';
        chips.push({ fieldId, type: 'bool', label: `${setting.key}: ${boolLabel}` });
      }
      if (f.tags && f.tags.length > 0) {
        f.tags.forEach((tag) => {
          chips.push({ fieldId, type: 'tag', tagValue: tag, label: tag, color: getHashColor(tag) });
        });
      }
      if (f.labels && f.labels.length > 0) {
        f.labels.forEach((label) => {
          chips.push({ fieldId, type: 'label', tagValue: label, label: label, color: getHashColor(label) });
        });
      }
    }
    return chips;
  }, [filters, fieldSettings]);

  const activeFilterCount = activeFilterChips.length;

  const removeFilter = (fieldId: string, filterType: 'range' | 'bool' | 'tag' | 'label' | 'beds_baths', tagValue?: string) => {
    const newFilters: typeof filters = {};
    for (const [fid, f] of Object.entries(filters)) {
      // deep-copy each filter entry to avoid mutating originals
      newFilters[fid] = { ...f, tags: f.tags ? [...f.tags] : undefined, labels: f.labels ? [...f.labels] : undefined };
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
    } else if (filterType === 'label' && tagValue) {
      if (f.labels) {
        f.labels = f.labels.filter((t) => t !== tagValue);
        if (f.labels.length === 0) f.labels = undefined;
      }
    } else if (filterType === 'beds_baths') {
      f.bedsMin = undefined;
      f.bedsMax = undefined;
      f.bathsMin = undefined;
      f.bathsMax = undefined;
    }

    if (
      f.min === undefined &&
      f.max === undefined &&
      f.bool === undefined &&
      (!f.tags || f.tags.length === 0) &&
      (!f.labels || f.labels.length === 0) &&
      f.bedsMin === undefined &&
      f.bedsMax === undefined &&
      f.bathsMin === undefined &&
      f.bathsMax === undefined
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
              style={[styles.activeFilterChip, { backgroundColor: chip.color ? chip.color.bg : colors.primaryLight, borderColor: chip.color ? chip.color.text + '44' : colors.primary + '44', borderWidth: 1 }]}
              onPress={() => removeFilter(chip.fieldId, chip.type, chip.tagValue)}
            >
              <Text style={[styles.activeFilterText, { color: chip.color ? chip.color.text : colors.primary }]}>{chip.label}</Text>
              <Ionicons name="close-circle" size={15} color={chip.color ? chip.color.text : colors.primary} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Custom header title: "Move"
  const HeaderTitle = useCallback(() => (
    <View style={styles.headerTitleRow}>
      <Image source={require('../../assets/images/icon-transparent.png')} style={{ width: 28, height: 28 }} />
      <Text style={[styles.appTitle, { color: colors.text }]}>Move</Text>
      <Text style={[styles.versionText, { color: colors.textTertiary }]}>
        v{Constants.expoConfig?.extra?.version || '0.0.0'} ({Constants.expoConfig?.extra?.gitHash || 'dev'})
      </Text>
    </View>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [colors]);

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
            {isSearchActive ? (
              <View style={[styles.searchContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search address..."
                  placeholderTextColor={colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onBlur={() => {
                    if (searchQuery.trim() === '') {
                      setIsSearchActive(false);
                    }
                  }}
                  autoFocus
                />
                <Pressable onPress={() => { setIsSearchActive(false); setSearchQuery(''); }} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.filterBtnGroup, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, gap: 4 }]}
                onPress={() => setIsSearchActive(true)}
              >
                <Ionicons name="search" size={14} color={colors.textSecondary} />
                <Text style={[styles.filterBtnText, { color: colors.textSecondary }]}>Search</Text>
              </Pressable>
            )}

            {!isSearchActive && (
              <>
                {viewMode !== 'map' ? (
                  <View
                    style={[
                      styles.filterBtnGroup,
                      {
                        backgroundColor: sort ? colors.primary : colors.surfaceSecondary,
                        borderColor: sort ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Pressable onPress={() => router.push('/sort')} style={styles.filterBtnPressable} hitSlop={4}>
                      <Ionicons
                        name="swap-vertical"
                        size={14}
                        color={sort ? '#fff' : colors.textSecondary}
                      />
                      <Text style={[styles.filterBtnText, { color: sort ? '#fff' : colors.textSecondary }]}>
                        Sort
                      </Text>
                    </Pressable>
                    {sort && (
                      <Pressable onPress={() => clearSort()} hitSlop={4} style={{ marginLeft: 6, padding: 2 }}>
                        <Ionicons name="close-circle" size={16} color="#fff" />
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <Pressable
                    style={[
                      styles.filterBtnGroup,
                      {
                        backgroundColor: showMapLabels ? colors.primary : colors.surfaceSecondary,
                        borderColor: showMapLabels ? colors.primary : colors.border,
                        gap: 4,
                      },
                    ]}
                    onPress={() => setShowMapLabels(!showMapLabels)}
                  >
                    <Ionicons
                      name={showMapLabels ? "eye" : "eye-off"}
                      size={14}
                      color={showMapLabels ? '#fff' : colors.textSecondary}
                    />
                    <Text style={[styles.filterBtnText, { color: showMapLabels ? '#fff' : colors.textSecondary }]}>
                      Labels
                    </Text>
                  </Pressable>
                )}

                <View
                  style={[
                    styles.filterBtnGroup,
                    {
                      backgroundColor: activeFilterCount > 0 ? colors.primary : colors.surfaceSecondary,
                      borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Pressable onPress={() => router.push('/filters')} style={styles.filterBtnPressable} hitSlop={4}>
                    <Ionicons
                      name="options-outline"
                      size={14}
                      color={activeFilterCount > 0 ? '#fff' : colors.textSecondary}
                    />
                    <Text style={[styles.filterBtnText, { color: activeFilterCount > 0 ? '#fff' : colors.textSecondary }]}>
                      Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                    </Text>
                  </Pressable>
                  {activeFilterCount > 0 && (
                    <Pressable onPress={() => clearFilters()} hitSlop={4} style={{ marginLeft: 6, padding: 2 }}>
                      <Ionicons name="close-circle" size={16} color="#fff" />
                    </Pressable>
                  )}
                </View>
              </>
            )}

            {!isNarrow && activeFilterChips.map((chip, i) => (
              <Pressable
                key={i}
                style={[styles.activeFilterChip, { backgroundColor: chip.color ? chip.color.bg : colors.primaryLight, borderColor: chip.color ? chip.color.text + '44' : colors.primary + '44', borderWidth: 1 }]}
                onPress={() => removeFilter(chip.fieldId, chip.type, chip.tagValue)}
              >
                <Text style={[styles.activeFilterText, { color: chip.color ? chip.color.text : colors.primary }]}>{chip.label}</Text>
                <Ionicons name="close-circle" size={14} color={chip.color ? chip.color.text : colors.primary} />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {isNarrow && activeFilterChips.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterBarScroll, { paddingLeft: spacing.lg, paddingBottom: spacing.sm }]}
            style={{ flexGrow: 0, flexShrink: 0, marginTop: spacing.sm }}
          >
            {activeFilterChips.map((chip, i) => (
              <Pressable
                key={i}
                style={[styles.activeFilterChip, { backgroundColor: chip.color ? chip.color.bg : colors.primaryLight, borderColor: chip.color ? chip.color.text + '44' : colors.primary + '44', borderWidth: 1 }]}
                onPress={() => removeFilter(chip.fieldId, chip.type, chip.tagValue)}
              >
                <Text style={[styles.activeFilterText, { color: chip.color ? chip.color.text : colors.primary }]}>{chip.label}</Text>
                <Ionicons name="close-circle" size={14} color={chip.color ? chip.color.text : colors.primary} />
              </Pressable>
            ))}
          </ScrollView>
        )}

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
            key={Platform.OS === 'web' ? 'web-list' : `grid-${Math.max(1, Math.floor(width / 320))}`}
            numColumns={Platform.OS === 'web' ? 1 : Math.max(1, Math.floor(width / 320))}
            data={filteredReviews}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const numCols = Math.max(1, Math.floor(width / 320));
              return (
                <ReviewCard
                  review={item}
                  fieldSettings={fieldSettings}
                  onPress={() => router.push(`/review/${item.id}`)}
                  style={Platform.OS !== 'web' && numCols > 1 ? { flex: 1, marginHorizontal: 0 } : undefined}
                />
              );
            }}
            columnWrapperStyle={
              Platform.OS !== 'web' && Math.max(1, Math.floor(width / 320)) > 1
                ? { gap: spacing.lg, paddingHorizontal: spacing.lg }
                : undefined
            }
            contentContainerStyle={[
              styles.listContent,
              Platform.OS === 'web' && styles.listContentWeb,
            ]}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={[{ flex: 1 }, !isNarrow && { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }]}>
            <View style={[{ flex: 1 }, !isNarrow && { borderRadius: borderRadius.lg, overflow: 'hidden' }]}>
              <ReviewsMap
                reviews={filteredReviews}
                showLabels={showMapLabels}
                onReviewPress={(id) => router.push(`/review/${id}`)}
                fieldSettings={fieldSettings}
                getAddress={(r) => {
                  const addressSetting = fieldSettings.find((f) => f.isCore);
                  return addressSetting ? String(r.fields[addressSetting.id] || 'Unknown') : 'Unknown';
                }}
              />
            </View>
          </View>
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
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
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
    ...typography.heading,
  },
  versionText: {
    fontSize: 10,
    marginTop: 6,
    marginLeft: spacing.xs,
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
    marginVertical: spacing.md,
    paddingLeft: spacing.lg,
    zIndex: 10,
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
    zIndex: 10,
  },
  // Segment control (inside filter bar)
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 3,
    height: 32,
  },
  segmentBtn: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    height: '100%',
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
  filterBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterBtnPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: Platform.OS === 'ios' ? 1 : -1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minWidth: 150,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: 13,
    height: '100%',
    minWidth: 100,
    outlineStyle: 'none',
  } as any,
  headerIconBtn: {
    padding: spacing.sm,
  },
  // List
  listContent: {
    paddingBottom: 100,
  },
  listContentWeb: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    width: '100%',
  } as any,
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
