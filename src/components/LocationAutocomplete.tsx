import { borderRadius, colors, spacing, typography } from '@/theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, Platform } from 'react-native';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

interface Suggestion {
  place_id: string;
  description: string;
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

    if (!GOOGLE_API_KEY) {
      console.warn('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is missing! Google Maps autocomplete will not work.');
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${GOOGLE_API_KEY}&components=country:us`;
        
        if (Platform.OS === 'web') {
          url = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.predictions) {
          setSuggestions(data.predictions.map((p: any) => ({
            place_id: p.place_id,
            description: p.description,
          })));
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, showSuggestions]);

  const handleSelect = useCallback(async (suggestion: Suggestion) => {
    const name = suggestion.description;

    // Update internal display instantly
    setQuery(name);
    prevValueRef.current = name;
    setShowSuggestions(false);
    setSuggestions([]);

    if (!GOOGLE_API_KEY) {
      onChange(name);
      return;
    }

    // Fetch lat/lng using Place Details API
    try {
      let detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&fields=geometry&key=${GOOGLE_API_KEY}`;
      if (Platform.OS === 'web') {
        detailsUrl = `https://corsproxy.io/?${encodeURIComponent(detailsUrl)}`;
      }
      const response = await fetch(detailsUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.result?.geometry?.location) {
        const lat = data.result.geometry.location.lat;
        const lng = data.result.geometry.location.lng;
        onChange(name, lat, lng);
      } else {
        onChange(name);
      }
    } catch (e) {
      console.error('Failed to fetch place details', e);
      onChange(name);
    }
  }, [onChange]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setShowSuggestions(true);
          // Do NOT call onChange here - wait for a selection from the dropdown
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
        placeholder={placeholder || 'Search address...'}
        placeholderTextColor={colors.textTertiary}
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
      />
      {showSuggestions && (loading || suggestions.length > 0 || !GOOGLE_API_KEY) && (
        <View style={styles.suggestionsContainer}>
          {!GOOGLE_API_KEY && (
            <View style={{ padding: 10 }}>
              <Text style={{ color: colors.danger, fontSize: 12 }}>Missing API Key in .env</Text>
            </View>
          )}
          {loading && GOOGLE_API_KEY && (
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
                  {item.description}
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
