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
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const lastSavedAddressRef = useRef(value);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync upstream if external change happens
  useEffect(() => {
    if (value !== lastSavedAddressRef.current) {
      lastSavedAddressRef.current = value;
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    if (!query || !showSuggestions || query === lastSavedAddressRef.current) {
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
          { headers: { 'User-Agent': 'MoveApp/1.0' } }
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

  const commitAddress = async (text: string, lat?: number, lng?: number) => {
    lastSavedAddressRef.current = text;
    setQuery(text);
    setShowSuggestions(false);

    if (lat !== undefined && lng !== undefined) {
      // We have explicit coordinates from a dropdown selection
      onChange(text, lat, lng);
    } else {
      // Auto-resolve GPS from raw text if they didn't pick a dropdown item
      if (text.trim() === '') {
        onChange(text, undefined, undefined);
        return;
      }
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
          onChange(text, parseFloat(data[0].lat), parseFloat(data[0].lon));
        } else {
          onChange(text, undefined, undefined);
        }
      } catch (e) {
        onChange(text, undefined, undefined);
      }
    }
  };

  const handleSelect = useCallback((suggestion: Suggestion) => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    commitAddress(suggestion.display_name, lat, lng);
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
          blurTimeoutRef.current = setTimeout(() => {
            if (query !== lastSavedAddressRef.current) {
              commitAddress(query);
            }
            setShowSuggestions(false);
          }, 300);
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
            keyboardShouldPersistTaps="always"
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
