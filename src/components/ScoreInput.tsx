import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';

interface ScoreInputProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function ScoreInput({ value, min, max, onChange }: ScoreInputProps) {
  const count = max - min + 1;

  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, i) => {
        const score = min + i;
        const isFilled = score <= value;
        return (
          <Pressable
            key={score}
            onPress={() => onChange(score)}
            style={styles.starButton}
            hitSlop={4}
          >
            <Text style={[styles.star, isFilled ? styles.starFilled : styles.starEmpty]}>
              ★
            </Text>
          </Pressable>
        );
      })}
      <Text style={styles.label}>{value}/{max}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starButton: {
    padding: 2,
  },
  star: {
    fontSize: 28,
  },
  starFilled: {
    color: colors.star,
  },
  starEmpty: {
    color: colors.starEmpty,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
});
