import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme, spacing, borderRadius, typography } from '@/theme';

interface TagSuggestionsInputProps {
  /** All previously-used values across reviews for this field */
  existingValues: string[];
  /** Current input text */
  inputText: string;
  onInputChange: (text: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  /** If true, hides the text input (suggestion-only mode, used for label single-value) */
  hideInput?: boolean;
}

export function TagSuggestionsInput({
  existingValues,
  inputText,
  onInputChange,
  onSubmit,
  placeholder,
}: TagSuggestionsInputProps) {
  const { colors } = useTheme();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<TextInput>(null);

  const filtered = inputText.trim()
    ? existingValues.filter(
        (v) =>
          v.toLowerCase().startsWith(inputText.toLowerCase()) &&
          v.toLowerCase() !== inputText.toLowerCase()
      )
    : existingValues;

  // Reset selection when input changes
  React.useEffect(() => {
    setSelectedIndex(-1);
  }, [inputText]);

  const handleSelect = useCallback(
    (val: string) => {
      onSubmit(val);
      onInputChange('');
      setShowSuggestions(false);
      inputRef.current?.blur();
    },
    [onSubmit, onInputChange]
  );

  const handleSubmitEditing = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < filtered.length) {
      handleSelect(filtered[selectedIndex]);
      return;
    }
    const trimmed = inputText.trim();
    if (trimmed) {
      onSubmit(trimmed);
      onInputChange('');
      setShowSuggestions(false);
    }
  }, [inputText, onSubmit, onInputChange, selectedIndex, filtered, handleSelect]);

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceSecondary,
            color: colors.text,
            borderColor: colors.borderLight,
          },
        ]}
        value={inputText}
        onChangeText={(t) => {
          onInputChange(t);
          setShowSuggestions(true);
        }}
        onKeyPress={(e: any) => {
          if (e.nativeEvent.key === 'ArrowDown') {
            e.preventDefault?.();
            setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
          } else if (e.nativeEvent.key === 'ArrowUp') {
            e.preventDefault?.();
            setSelectedIndex((prev) => Math.max(prev - 1, -1));
          } else if (e.nativeEvent.key === 'Tab') {
            if (selectedIndex >= 0 && selectedIndex < filtered.length) {
              handleSelect(filtered[selectedIndex]);
            } else {
              const trimmed = inputText.trim();
              if (trimmed) {
                onSubmit(trimmed);
                onInputChange('');
                setShowSuggestions(false);
              }
            }
          }
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onSubmitEditing={handleSubmitEditing}
        placeholder={placeholder ?? 'Type and press Enter (or Tab)…'}
        placeholderTextColor={colors.textTertiary}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="done"
      />

      {showSuggestions && filtered.length > 0 && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
            { boxShadow: '0px 4px 12px rgba(0,0,0,0.15)', elevation: 6 } as any,
          ]}
        >
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            renderItem={({ item, index }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.suggestion,
                  { borderBottomColor: colors.borderLight },
                  (pressed || index === selectedIndex) && { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text style={[styles.suggestionText, { color: colors.text }]}>{item}</Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 20,
  },
  input: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    borderWidth: 1,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    maxHeight: 180,
    zIndex: 999,
  },
  list: {
    flexGrow: 0,
  },
  suggestion: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: {
    ...typography.body,
  },
});
