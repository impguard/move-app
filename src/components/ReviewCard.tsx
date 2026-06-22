import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Linking } from 'react-native';
import { Review, FieldSetting } from '@/types';
import { formatDollar, formatRelativeDate, formatShortAddress } from '@/utils/format';
import { getHashColor } from '@/utils/colors';
import { useTheme, spacing, borderRadius, shadows, typography } from '@/theme';

interface ReviewCardProps {
  review: Review;
  fieldSettings: FieldSetting[];
  onPress: () => void;
  style?: any;
}

export function ReviewCard({ review, fieldSettings, onPress, style }: ReviewCardProps) {
  const { colors } = useTheme();

  const addressSetting = fieldSettings.find(f => f.key === 'Address');
  const fullAddress = addressSetting ? (review.fields[addressSetting.id] as string | undefined) : undefined;
  const address = fullAddress ? formatShortAddress(fullAddress) : undefined;

  const visibleSettings = fieldSettings
    .filter(f => (f.isVisibleList ?? f.isVisible ?? true) && f.key !== 'Address')
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

  const isTaken = review.status === 'taken';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        Platform.OS === 'web' && styles.cardWeb,
        style,
        isTaken && { opacity: 0.65, backgroundColor: colors.surfaceSecondary },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: spacing.sm }}>
          <Text style={[styles.address, { color: colors.text, textDecorationLine: isTaken ? 'line-through' : 'none' }]} numberOfLines={1}>
            {address || 'New Property'}
          </Text>
          {isTaken && (
            <View style={[styles.takenBadge, { backgroundColor: colors.danger + '22' }]}>
              <Text style={[styles.takenText, { color: colors.danger }]}>TAKEN</Text>
            </View>
          )}
        </View>
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

            if (setting.type === 'tag' && Array.isArray(value)) {
              if (value.length === 0) return null;
              return (
                <View key={setting.id} style={styles.chipRow}>
                  <Text style={[styles.detailLabel, styles.detailKey, { color: colors.text }]}>{setting.key}:</Text>
                  {value.map((tag: string, i: number) => {
                    const c = getHashColor(tag);
                    return (
                      <View key={i} style={[styles.coloredChip, { backgroundColor: c.bg }]}>
                        <Text style={[styles.coloredChipText, { color: c.text }]}>{tag}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            }

            if ((setting.type === 'label' || setting.type === 'address') && typeof value === 'string' && value.trim() !== '') {
              const c = getHashColor(value);
              return (
                <View key={setting.id} style={styles.chipRow}>
                  <Text style={[styles.detailLabel, styles.detailKey, { color: colors.text }]}>{setting.key}:</Text>
                  <View style={[styles.coloredChip, { backgroundColor: c.bg }]}>
                    <Text style={[styles.coloredChipText, { color: c.text }]}>{value}</Text>
                  </View>
                </View>
              );
            }

            if (setting.type === 'link' && typeof value === 'string' && value.trim() !== '') {
              return (
                <Text key={setting.id} style={[styles.detailLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  <Text style={[styles.detailKey, { color: colors.text }]}>{setting.key}: </Text>
                  <Text 
                    style={{ color: colors.primary, textDecorationLine: 'underline' }}
                    onPress={(e) => {
                      e.stopPropagation();
                      Linking.openURL(value).catch(() => {});
                    }}
                  >
                    {value}
                  </Text>
                </Text>
              );
            }

            let displayValue = String(value);
            if (setting.type === 'dollar' && typeof value === 'number') {
              displayValue = formatDollar(value);
            } else if (setting.type === 'sqft' && typeof value === 'number') {
              displayValue = `${value} sq ft`;
            } else if (setting.type === 'boolean') {
              displayValue = value ? '✓' : '✗';
            } else if (setting.type === 'pictures' && Array.isArray(value)) {
              if (value.length === 0) return null;
              displayValue = `${value.length} photos`;
            } else if (setting.type === 'beds_baths') {
              const bb = value as { beds?: number; baths?: number };
              const parts = [];
              if (bb?.beds != null) parts.push(`${bb.beds} Bed`);
              if (bb?.baths != null) parts.push(`${bb.baths} Bath`);
              if (parts.length === 0) return null;
              displayValue = parts.join(' / ');
            }

            return (
              <Text key={setting.id} style={[styles.detailLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                <Text style={[styles.detailKey, { color: colors.text }]}>{setting.key}: </Text>
                {displayValue}
              </Text>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  cardWeb: {
    width: '100%' as const,
    marginHorizontal: 0,
    marginBottom: 0,
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
  takenBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  takenText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  detailLabel: {
    ...typography.caption,
  },
  detailKey: {
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    width: '100%',
    marginBottom: spacing.xs,
  },
  coloredChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  coloredChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
