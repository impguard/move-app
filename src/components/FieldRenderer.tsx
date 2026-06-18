import React, { useState } from 'react';
import { View, Text, TextInput, Switch, Pressable, Linking, StyleSheet } from 'react-native';
import { FieldSetting } from '@/types';
import { ScoreInput } from '@/components/ScoreInput';
import { PictureField } from '@/components/PictureField';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { colors, spacing, borderRadius, typography } from '@/theme';

interface FieldRendererProps {
  setting: FieldSetting;
  value: unknown;
  onChange: (value: unknown, extra?: { lat?: number; lng?: number }) => void;
}

export function FieldRenderer({ setting, value, onChange }: FieldRendererProps) {
  const [tagInputText, setTagInputText] = useState('');
  const renderInput = () => {
    switch (setting.type) {
      case 'single-line':
        if (setting.isCore) {
          return (
            <LocationAutocomplete
              value={String(value ?? '')}
              onChange={(text, lat, lng) => onChange(text, { lat, lng })}
              placeholder="Search address..."
            />
          );
        }
        return (
          <TextInput
            style={styles.textInput}
            value={String(value ?? '')}
            onChangeText={(text) => onChange(text)}
            placeholder={`Enter ${setting.key.toLowerCase()}...`}
            placeholderTextColor={colors.textTertiary}
          />
        );

      case 'tag': {
        const tags = Array.isArray(value) ? (value as string[]) : (typeof value === 'string' && value ? [value] : []);
        return (
          <View>
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((t, i) => (
                  <View key={i} style={styles.tagChip}>
                    <Text style={styles.tagText}>{t}</Text>
                    <Pressable
                      onPress={() => onChange(tags.filter((_, index) => index !== i))}
                      hitSlop={8}
                    >
                      <Text style={styles.tagRemove}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <TextInput
              style={styles.textInput}
              value={tagInputText}
              onChangeText={(text) => {
                if (text.endsWith(' ') || text.endsWith(',')) {
                  const newTag = text.replace(/[, ]/g, '').trim();
                  if (newTag && !tags.includes(newTag)) {
                    onChange([...tags, newTag]);
                  }
                  setTagInputText('');
                } else {
                  setTagInputText(text);
                }
              }}
              onSubmitEditing={() => {
                const newTag = tagInputText.trim();
                if (newTag && !tags.includes(newTag)) {
                  onChange([...tags, newTag]);
                }
                setTagInputText('');
              }}
              placeholder="Type tag and press Space/Enter..."
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        );
      }

      case 'text':
        return (
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={String(value ?? '')}
            onChangeText={(text) => onChange(text)}
            placeholder={`Enter ${setting.key.toLowerCase()}...`}
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        );

      case 'dollar':
        return (
          <View style={styles.prefixWrapper}>
            <Text style={styles.prefix}>$</Text>
            <TextInput
              style={[styles.textInput, styles.prefixInput]}
              value={value ? String(value) : ''}
              onChangeText={(text) => {
                const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                onChange(isNaN(num) ? 0 : num);
              }}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
          </View>
        );

      case 'sqft':
        return (
          <View style={styles.suffixWrapper}>
            <TextInput
              style={[styles.textInput, styles.suffixInput]}
              value={value ? String(value) : ''}
              onChangeText={(text) => {
                const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                onChange(isNaN(num) ? 0 : num);
              }}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
            <Text style={styles.suffix}>sq ft</Text>
          </View>
        );

      case 'number':
        return (
          <TextInput
            style={styles.textInput}
            value={value ? String(value) : ''}
            onChangeText={(text) => {
              const num = parseFloat(text.replace(/[^0-9.]/g, ''));
              onChange(isNaN(num) ? 0 : num);
            }}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        );

      case 'score':
        return (
          <ScoreInput
            value={typeof value === 'number' ? value : (setting.scoreMin ?? 1)}
            min={setting.scoreMin ?? 1}
            max={setting.scoreMax ?? 5}
            onChange={onChange}
          />
        );

      case 'boolean':
        return (
          <View style={styles.switchRow}>
            <Switch
              value={Boolean(value)}
              onValueChange={(val) => onChange(val)}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={value ? colors.primary : colors.textTertiary}
            />
            <Text style={styles.switchLabel}>
              {value ? 'Yes' : 'No'}
            </Text>
          </View>
        );

      case 'link':
        return (
          <View style={styles.linkWrapper}>
            <TextInput
              style={[styles.textInput, styles.linkInput]}
              value={String(value ?? '')}
              onChangeText={(text) => onChange(text)}
              placeholder="https://..."
              placeholderTextColor={colors.textTertiary}
              keyboardType="url"
              autoCapitalize="none"
            />
            {!!value && String(value).length > 0 ? (
              <Pressable
                onPress={() => {
                  const url = String(value);
                  if (url.startsWith('http')) {
                    Linking.openURL(url);
                  }
                }}
                style={styles.openButton}
              >
                <Text style={styles.openButtonText}>Open</Text>
              </Pressable>
            ) : null}
          </View>
        );

      case 'pictures':
        return (
          <PictureField
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={onChange}
          />
        );

      default:
        return (
          <TextInput
            style={styles.textInput}
            value={String(value ?? '')}
            onChangeText={(text) => onChange(text)}
            placeholder={`Enter value...`}
            placeholderTextColor={colors.textTertiary}
          />
        );
    }
  };

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{setting.key}</Text>
      {renderInput()}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  tagText: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  tagRemove: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  prefixWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
    marginRight: spacing.sm,
    minWidth: 16,
  },
  prefixInput: {
    flex: 1,
  },
  suffixWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suffixInput: {
    flex: 1,
  },
  suffix: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  linkWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkInput: {
    flex: 1,
  },
  openButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  openButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
