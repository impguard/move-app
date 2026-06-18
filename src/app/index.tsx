import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, Pressable, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ReviewCard } from '@/components/ReviewCard';
import { ReviewsMap } from '@/components/ReviewsMap';
import { EmptyState } from '@/components/EmptyState';
import { useReviews } from '@/store/useReviews';
import { useFieldSettings } from '@/store/useFieldSettings';
import { useFilters } from '@/store/useFilters';
import { colors, spacing, borderRadius, shadows, typography } from '@/theme';

export default function ReviewListScreen() {
  const router = useRouter();
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

  const activeFilterCount = Object.keys(filters).length;

  const removeFilter = (fieldId: string, filterType: 'range' | 'bool' | 'tag', tagValue?: string) => {
    const newFilters = { ...filters };
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

    if (f.min === undefined && f.max === undefined && (f.bool === undefined || f.bool === null) && (!f.tags || f.tags.length === 0)) {
      delete newFilters[fieldId];
    }
    updateFilters(newFilters);
  };

  const renderActiveFilters = () => {
    if (activeFilterCount === 0) return null;

    const chips: React.ReactNode[] = [];
    for (const [fieldId, f] of Object.entries(filters)) {
      const setting = fieldSettings.find((s) => s.id === fieldId);
      if (!setting) continue;

      if (f.min !== undefined || f.max !== undefined) {
        let label = setting.key + ': ';
        if (f.min !== undefined && f.max !== undefined) label += `${f.min} - ${f.max}`;
        else if (f.min !== undefined) label += `>= ${f.min}`;
        else label += `<= ${f.max}`;
        chips.push(
          <Pressable key={`${fieldId}-range`} style={styles.activeFilterChip} onPress={() => removeFilter(fieldId, 'range')}>
            <Text style={styles.activeFilterText}>{label}</Text>
            <Ionicons name="close-circle" size={16} color={colors.primary} />
          </Pressable>
        );
      }
      if (f.bool !== undefined && f.bool !== null) {
        chips.push(
          <Pressable key={`${fieldId}-bool`} style={styles.activeFilterChip} onPress={() => removeFilter(fieldId, 'bool')}>
            <Text style={styles.activeFilterText}>{setting.key}: {f.bool ? 'Yes' : 'No'}</Text>
            <Ionicons name="close-circle" size={16} color={colors.primary} />
          </Pressable>
        );
      }
      if (f.tags && f.tags.length > 0) {
        f.tags.forEach((tag) => {
          chips.push(
            <Pressable key={`${fieldId}-tag-${tag}`} style={styles.activeFilterChip} onPress={() => removeFilter(fieldId, 'tag', tag)}>
              <Text style={styles.activeFilterText}>{tag}</Text>
              <Ionicons name="close-circle" size={16} color={colors.primary} />
            </Pressable>
          );
        });
      }
    }

    return (
      <View style={styles.activeFiltersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
          {chips}
        </ScrollView>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Move',
          headerTitleStyle: {
            ...typography.title,
            fontSize: 22,
          },
          headerRight: () => (
            <View style={styles.headerRight}>
              <Pressable onPress={() => router.push('/filters')} style={styles.headerBtn} hitSlop={12}>
                <Ionicons name="options" size={24} color={colors.primary} />
                {activeFilterCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable onPress={handleSettings} style={styles.headerButton} hitSlop={12}>
                <Text style={styles.headerIcon}>⚙</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.segmentedControl}>
          <Pressable
            style={[styles.segmentBtn, viewMode === 'list' && styles.segmentBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.segmentText, viewMode === 'list' && styles.segmentTextActive]}>List</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, viewMode === 'map' && styles.segmentBtnActive]}
            onPress={() => setViewMode('map')}
          >
            <Text style={[styles.segmentText, viewMode === 'map' && styles.segmentTextActive]}>Map</Text>
          </Pressable>
        </View>

        {renderActiveFilters()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : filteredReviews.length === 0 ? (
          reviews.length > 0 ? (
             <View style={styles.loadingContainer}>
               <Text style={styles.loadingText}>No reviews match the filters.</Text>
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
            contentContainerStyle={styles.listContent}
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  segmentText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  activeFiltersContainer: {
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  activeFiltersScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  activeFilterText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  headerButton: {
    padding: spacing.sm,
    position: 'relative',
  },
  headerRight: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtn: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  headerIcon: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.danger,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
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
