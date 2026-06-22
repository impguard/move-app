import { borderRadius, colors, spacing, typography } from '@/theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

interface Suggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationAutocomplete({ value, onChange, placeholder }: LocationAutocompleteProps) {
  // Internal query is purely for display - it does NOT drive the parent until confirmed
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Keep query in sync if parent value changes externally (e.g. loading a saved review)
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    if (!query || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            query
          )}&format=json&addressdetails=1&limit=5`,
          {
            headers: {
              'User-Agent': 'MoveApp/1.0',
            },
          }
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, showSuggestions]);

  const handleSelect = useCallback((suggestion: Suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    const name = suggestion.display_name;

    // Update internal display
    setQuery(name);
    prevValueRef.current = name;
    setShowSuggestions(false);
    setSuggestions([]);

    // Notify parent ONCE with confirmed name + coords
    onChange(name, lat, lng);
  }, [onChange]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          if (query !== value) {
            onChange(query, undefined, undefined);
          }
          setTimeout(() => setShowSuggestions(false), 300);
        }}
        placeholder={placeholder || 'Search address...'}
        placeholderTextColor={colors.textTertiary}
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
      />
      {showSuggestions && (loading || suggestions.length > 0) && (
        <View style={styles.suggestionsContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.suggestionItem, pressed && styles.suggestionItemPressed]}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.display_name}
                </Text>
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
    zIndex: 10,
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
  suggestionsContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    borderTopWidth: 0,
    maxHeight: 200,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
    elevation: 4,
  },
  loadingContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  suggestionItem: {
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  suggestionItemPressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  suggestionText: {
    ...typography.bodyMedium,
    color: colors.text,
  },
});
