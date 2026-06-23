import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Switch, Pressable, Linking, StyleSheet } from 'react-native';
import { FieldSetting, Review } from '@/types';
import { ScoreInput } from '@/components/ScoreInput';
import { PictureField } from '@/components/PictureField';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { TagSuggestionsInput } from '@/components/TagSuggestionsInput';
import { getHashColor } from '@/utils/colors';
import { useTheme, spacing, borderRadius, typography } from '@/theme';

function DecimalInput({ value, onChange, placeholder, style, colors }: any) {
  const [text, setText] = useState(value != null && value !== 0 ? String(value) : '');
  const [isFocused, setIsFocused] = useState(false);
  const lastSentRef = useRef<number | null>(null);

  useEffect(() => {
    if (value != null) {
      const valStr = String(value);
      // Only update from upstream if we aren't focused AND the upstream value is different from what we last sent
      if (!isFocused && value !== lastSentRef.current) {
        if (valStr !== text && parseFloat(valStr) !== parseFloat(text || '0')) {
          setText(value === 0 ? '' : valStr);
        }
      }
    }
  }, [value, text, isFocused]);

  return (
    <TextInput
      style={style}
      value={text}
      onFocus={() => setIsFocused(true)}
      onChangeText={(val) => {
        let cleaned = val.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
        setText(cleaned);

        if (cleaned === '') {
          lastSentRef.current = 0;
          onChange(0);
        }
        else if (!cleaned.endsWith('.')) {
          const num = parseFloat(cleaned);
          lastSentRef.current = num;
          onChange(num);
        }
      }}
      onBlur={() => {
        setIsFocused(false);
        if (text.endsWith('.')) {
          const num = parseFloat(text);
          const finalVal = isNaN(num) ? 0 : num;
          setText(finalVal === 0 ? '' : String(finalVal));
          lastSentRef.current = finalVal;
          onChange(finalVal);
        }
      }}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      keyboardType="decimal-pad"
    />
  );
}

function SyncTextInput({ value, onChange, ...props }: any) {
  const [text, setText] = useState(value != null ? String(value) : '');
  const [isFocused, setIsFocused] = useState(false);
  const timeoutRef = useRef<any>(null);
  const lastSentRef = useRef<string>(value != null ? String(value) : '');

  // Only sync external changes if the user is NOT actively typing
  // and the upstream value differs from our last optimistic save
  useEffect(() => {
    const strVal = String(value ?? '');
    if (!isFocused && strVal !== text && strVal !== lastSentRef.current) {
      setText(strVal);
      lastSentRef.current = strVal; // Sync it so we don't repeatedly update
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isFocused]);

  return (
    <TextInput
      {...props}
      value={text}
      onFocus={(e) => {
        setIsFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (text !== String(value ?? '')) {
          lastSentRef.current = text;
          onChange(text);
        }
        props.onBlur?.(e);
      }}
      onChangeText={(val) => {
        setText(val);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          lastSentRef.current = val;
          onChange(val);
        }, 500);
      }}
    />
  );
}

interface FieldRendererProps {
  setting: FieldSetting;
  value: unknown;
  onChange: (value: unknown, extra?: { lat?: number; lng?: number }) => void;
  /** All saved reviews — used to derive autocomplete suggestions for tag/label fields */
  allReviews?: Review[];
}

/** Collect all unique values for a given field across all reviews */
function collectExistingValues(setting: FieldSetting, allReviews: Review[]): string[] {
  const seen = new Set<string>();
  for (const review of allReviews) {
    if (review.status === 'draft') continue;
    const val = review.fields[setting.id];
    if (setting.type === 'tag' || setting.type === 'label' || setting.type === 'address') {
      if (Array.isArray(val)) {
        val.forEach((t) => seen.add(String(t)));
      } else if (typeof val === 'string' && val.trim()) {
        seen.add(val.trim());
      }
    }
  }
  return Array.from(seen).sort();
}

export function FieldRenderer({ setting, value, onChange, allReviews = [] }: FieldRendererProps) {
  const { colors } = useTheme();
  const [tagInputText, setTagInputText] = useState('');

  const existingValues = collectExistingValues(setting, allReviews);

  const renderInput = () => {
    if (setting.isCore) {
      return (
        <LocationAutocomplete
          value={String(value ?? '')}
          onChange={(text, lat, lng) => onChange(text, { lat, lng })}
          placeholder="Search address..."
        />
      );
    }

    switch (setting.type) {
      case 'label':
        // ── Label: single-value with suggestions ────────────────────────────
        return (
          <View>
            {/* Chips row showing the current value with a clear button */}
            {typeof value === 'string' && value !== '' && (
              <View style={styles.tagsContainer}>
                {(() => {
                  const c = getHashColor(value as string);
                  return (
                    <View style={[styles.tagChip, { backgroundColor: c.bg }]}>
                      <Text style={[styles.tagText, { color: c.text }]}>{value as string}</Text>
                      <Pressable onPress={() => onChange('')} hitSlop={8} {...{ tabIndex: -1 }}>
                        <Text style={[styles.tagRemove, { color: c.text, marginLeft: 4 }]}>✕</Text>
                      </Pressable>
                    </View>
                  );
                })()}
              </View>
            )}
            {/* Only show input when there's no value selected yet */}
            {(!value || value === '') && (
              <TagSuggestionsInput
                existingValues={existingValues}
                inputText={tagInputText}
                onInputChange={setTagInputText}
                onSubmit={(val) => {
                  onChange(val);
                  setTagInputText('');
                }}
                placeholder={`Type ${setting.key.toLowerCase()}…`}
              />
            )}
          </View>
        );

      // ── Tag: multi-value with suggestions ──────────────────────────────────
      case 'tag': {
        const tags = Array.isArray(value)
          ? (value as string[])
          : typeof value === 'string' && value
          ? [value]
          : [];

        // Filter out already-selected tags from suggestions
        const availableSuggestions = existingValues.filter((v) => !tags.includes(v));

        return (
          <View>
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((t, i) => {
                  const c = getHashColor(t);
                  return (
                    <View key={i} style={[styles.tagChip, { backgroundColor: c.bg }]}>
                      <Text style={[styles.tagText, { color: c.text }]}>{t}</Text>
                      <Pressable 
                        onPress={() => onChange(tags.filter((_, index) => index !== i))} 
                        hitSlop={8}
                        {...{ tabIndex: -1 }}
                      >
                        <Text style={[styles.tagRemove, { color: c.text, marginLeft: 4 }]}>✕</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
            <TagSuggestionsInput
              existingValues={availableSuggestions}
              inputText={tagInputText}
              onInputChange={(text) => {
                // Handle comma to add tag while typing
                if (text.endsWith(',')) {
                  const newTag = text.replace(/,/g, '').trim();
                  if (newTag && !tags.includes(newTag)) {
                    onChange([...tags, newTag]);
                  }
                  setTagInputText('');
                } else {
                  setTagInputText(text);
                }
              }}
              onSubmit={(val) => {
                if (!tags.includes(val)) {
                  onChange([...tags, val]);
                }
                setTagInputText('');
              }}
              placeholder="Type tag and press Enter (or pick from list)…"
            />
          </View>
        );
      }

      case 'text':
        return (
          <SyncTextInput
            style={[
              styles.textInput,
              styles.multilineInput,
              { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight },
            ]}
            value={value}
            onChange={onChange}
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
            <Text style={[styles.prefix, { color: colors.textSecondary }]}>$</Text>
            <DecimalInput
              style={[
                styles.textInput,
                styles.prefixInput,
                { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight },
              ]}
              value={value}
              onChange={onChange}
              placeholder="0"
              colors={colors}
            />
          </View>
        );

      case 'sqft':
        return (
          <View style={styles.suffixWrapper}>
            <DecimalInput
              style={[
                styles.textInput,
                styles.suffixInput,
                { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight },
              ]}
              value={value}
              onChange={onChange}
              placeholder="0"
              colors={colors}
            />
            <Text style={[styles.suffix, { color: colors.textSecondary }]}>sq ft</Text>
          </View>
        );

      case 'beds_baths': {
        const bb = (value || { beds: null, baths: null }) as any;
        return (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textTertiary, marginBottom: 4 }}>BEDS</Text>
              <DecimalInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight },
                ]}
                value={bb.beds}
                onChange={(beds: number) => onChange({ ...bb, beds })}
                placeholder="0"
                colors={colors}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textTertiary, marginBottom: 4 }}>BATHS</Text>
              <DecimalInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight },
                ]}
                value={bb.baths}
                onChange={(baths: number) => onChange({ ...bb, baths })}
                placeholder="0"
                colors={colors}
              />
            </View>
          </View>
        );
      }

      case 'number':
        return (
          <DecimalInput
            style={[
              styles.textInput,
              { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight },
            ]}
            value={value}
            onChange={onChange}
            placeholder="0"
            colors={colors}
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

      case 'strict_boolean':
        return (
          <View style={styles.triStateRow}>
            {(['yes', 'no'] as const).map((opt) => {
              const isSelected = 
                (opt === 'yes' && value === true) || 
                (opt === 'no' && value === false);
              
              const activeBg = opt === 'yes' ? colors.success : colors.danger;
              
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    onChange(opt === 'yes');
                  }}
                  style={[
                    styles.triStateBtn,
                    { borderColor: colors.borderLight },
                    isSelected && { backgroundColor: activeBg, borderColor: activeBg }
                  ]}
                >
                  <Text style={[
                    styles.triStateText,
                    { color: colors.textSecondary },
                    isSelected && { color: '#fff', fontWeight: '600' }
                  ]}>
                    {opt === 'yes' ? 'Yes' : 'No'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );

      case 'boolean':
        return (
          <View style={styles.triStateRow}>
            {(['yes', 'no', 'unknown'] as const).map((opt) => {
              const isSelected = 
                (opt === 'yes' && value === true) || 
                (opt === 'no' && value === false) || 
                (opt === 'unknown' && (value === null || value === undefined));
              
              const activeBg = opt === 'yes' ? colors.success : opt === 'no' ? colors.danger : colors.border;
              
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    if (opt === 'yes') onChange(true);
                    else if (opt === 'no') onChange(false);
                    else onChange(null);
                  }}
                  style={[
                    styles.triStateBtn,
                    { borderColor: colors.borderLight },
                    isSelected && { backgroundColor: activeBg, borderColor: activeBg }
                  ]}
                >
                  <Text style={[
                    styles.triStateText,
                    { color: colors.textSecondary },
                    isSelected && { color: '#fff', fontWeight: '600' }
                  ]}>
                    {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'Unknown'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );

      case 'link':
        return (
          <View style={styles.linkWrapper}>
            <TextInput
              style={[
                styles.textInput,
                styles.linkInput,
                { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight },
              ]}
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
                style={[styles.openButton, { backgroundColor: colors.primaryLight }]}
              >
                <Text style={[styles.openButtonText, { color: colors.primary }]}>Open</Text>
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
          <SyncTextInput
            style={[
              styles.textInput,
              { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.borderLight },
            ]}
            value={value}
            onChange={onChange}
            placeholder="Enter value..."
            placeholderTextColor={colors.textTertiary}
          />
        );
    }
  };

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{setting.key}</Text>
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
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    borderWidth: 1,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  tagText: {
    fontWeight: '500',
    fontSize: 14,
  },
  tagRemove: {
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
  },
  triStateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  triStateBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  triStateText: {
    ...typography.bodyMedium,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  openButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
