import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Review, FieldSetting } from '@/types';
import { formatDollar, formatRelativeDate, formatShortAddress } from '@/utils/format';
import { useTheme, spacing, borderRadius, shadows, typography } from '@/theme';

interface ReviewCardProps {
  review: Review;
  fieldSettings: FieldSetting[];
  onPress: () => void;
}

export function ReviewCard({ review, fieldSettings, onPress }: ReviewCardProps) {
  const { colors } = useTheme();

  const addressSetting = fieldSettings.find(f => f.key === 'Address');
  const fullAddress = addressSetting ? (review.fields[addressSetting.id] as string | undefined) : undefined;
  const address = fullAddress ? formatShortAddress(fullAddress) : undefined;

  const visibleSettings = fieldSettings
    .filter(f => f.isVisible && f.key !== 'Address')
    .sort((a, b) => a.order - b.order);

  const renderStars = (value: number, max: number = 5) => {
    return (
      <View style={styles.starsRow}>
        {Array.from({ length: max }, (_, i) => (
          <Text key={i} style={[styles.star, { color: i < value ? colors.star : colors.starEmpty }]}>
            ★
          </Text>
        ))}
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        Platform.OS === 'web' && styles.cardWeb,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.address, { color: colors.text }]} numberOfLines={1}>
          {address || 'New Property'}
        </Text>
        <Text style={[styles.time, { color: colors.textTertiary }]}>{formatRelativeDate(review.updatedAt)}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.detailsRow}>
          {visibleSettings.map((setting) => {
            const value = review.fields[setting.id];
            if (value === undefined || value === null || value === '') return null;

            if (setting.type === 'score') {
              return (
                <View key={setting.id} style={styles.scoreContainer}>
                  <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>{setting.key}</Text>
                  {renderStars(typeof value === 'number' ? value : 0, setting.scoreMax)}
                </View>
              );
            }

            let displayValue = String(value);
            if (setting.type === 'dollar' && typeof value === 'number') {
              displayValue = formatDollar(value);
            } else if (setting.type === 'sqft' && typeof value === 'number') {
              displayValue = `${value} sq ft`;
            } else if (setting.type === 'boolean') {
              displayValue = value ? 'Yes' : 'No';
            } else if (setting.type === 'tag' && Array.isArray(value)) {
              if (value.length === 0) return null;
              displayValue = value.join(', ');
            } else if (setting.type === 'pictures' && Array.isArray(value)) {
              if (value.length === 0) return null;
              displayValue = `${value.length} photos`;
            }

            return (
              <View key={setting.id} style={[styles.detailChip, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  <Text style={[styles.detailKey, { color: colors.text }]}>{setting.key}: </Text>
                  {displayValue}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  cardWeb: {
    maxWidth: 720,
    alignSelf: 'center' as const,
    width: '100%' as const,
    marginHorizontal: 0,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  address: {
    ...typography.heading,
    flex: 1,
    marginRight: spacing.sm,
  },
  time: {
    ...typography.small,
    marginTop: 3,
  },
  cardBody: {
    gap: spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.xs,
  },
  scoreLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginRight: spacing.sm,
    width: 60,
  },
  detailChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  detailLabel: {
    ...typography.caption,
  },
  detailKey: {
    fontWeight: '600',
  },
});
