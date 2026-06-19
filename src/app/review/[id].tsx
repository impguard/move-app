import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FieldRenderer } from '@/components/FieldRenderer';
import { useReviews } from '@/store/useReviews';
import { useFieldSettings } from '@/store/useFieldSettings';
import { useTheme, spacing, borderRadius, typography } from '@/theme';
import { formatShortAddress } from '@/utils/format';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { fieldSettings, loading: settingsLoading } = useFieldSettings();
  const {
    reviews,
    loading: reviewsLoading,
    updateReview,
    deleteReview,
    getReview,
    reload,
  } = useReviews(fieldSettings);

  const [localFields, setLocalFields] = useState<Record<string, unknown>>({});
  const [localExtra, setLocalExtra] = useState<{ lat?: number; lng?: number }>({});
  const [initialized, setInitialized] = useState(false);

  const review = getReview(id!);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    if (review && !initialized) {
      setLocalFields(review.fields);
      setLocalExtra({ lat: review.lat, lng: review.lng });
      setInitialized(true);
    }
  }, [review, initialized]);

  const handleFieldChange = useCallback((fieldId: string, value: unknown, extra?: { lat?: number; lng?: number }) => {
    setLocalFields((prev) => ({ ...prev, [fieldId]: value }));
    if (extra) {
      setLocalExtra((prev) => ({ ...prev, ...extra }));
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!review) return;

    const addressSetting = fieldSettings.find((f) => f.isCore);
    if (addressSetting) {
      const addrValue = localFields[addressSetting.id];
      if (!addrValue || String(addrValue).trim() === '') {
        if (Platform.OS === 'web') window.alert('Please enter a valid address.');
        else Alert.alert('Address Required', 'Please enter a valid address.');
        return;
      }
      if (localExtra.lat === undefined || localExtra.lng === undefined) {
        if (Platform.OS === 'web') {
          window.alert('Please select an address from the dropdown suggestions.');
        } else {
          Alert.alert('Select Address', 'Please pick an address from the dropdown suggestions.');
        }
        return;
      }
    }

    updateReview(id!, localFields, { ...localExtra, status: 'saved' });
    router.back();
  }, [id, review, fieldSettings, localFields, localExtra, updateReview, router]);

  const handleDelete = () => {
    const doDelete = async () => {
      await deleteReview(id!);
      router.back();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this review? This cannot be undone.')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Review',
        'Are you sure? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const loading = settingsLoading || reviewsLoading;

  // Get address for header title — use short format
  const addressField = fieldSettings.find((f) => f.key === 'Address');
  const addressValue = addressField ? (localFields[addressField.id] as string) : '';
  const shortTitle = addressValue ? formatShortAddress(addressValue) : 'New Property';

  const sortedSettings = [...fieldSettings].sort((a, b) => a.order - b.order);

  return (
    <>
      <Stack.Screen
        options={{
          title: shortTitle,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {loading || !initialized ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading...</Text>
          </View>
        ) : !review ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Review not found</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {review.hasDuplicate && (
              <View style={[styles.duplicateBanner, { backgroundColor: colors.warning + '22', borderColor: colors.warning }]}>
                <Text style={[styles.duplicateText, { color: colors.warning }]}>
                  ⚠️ This review may be a duplicate of an existing review.
                </Text>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {localExtra.lat !== undefined && localExtra.lng !== undefined && (
                <View style={[styles.coordsRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}>
                  <Text style={[styles.coordsText, { color: colors.textSecondary }]}>
                    📍 {localExtra.lat.toFixed(5)}, {localExtra.lng.toFixed(5)}
                  </Text>
                  <Pressable
                    style={[styles.mapJumpBtn, { backgroundColor: colors.primaryLight }]}
                    onPress={() => {
                      const url = `https://maps.google.com/?q=${localExtra.lat},${localExtra.lng}`;
                      import('react-native').then(({ Linking }) => Linking.openURL(url));
                    }}
                  >
                    <Text style={[styles.mapJumpText, { color: colors.primary }]}>Open Map</Text>
                  </Pressable>
                </View>
              )}

              {sortedSettings.map((setting) => (
                <FieldRenderer
                  key={setting.id}
                  setting={setting}
                  value={localFields[setting.id]}
                  onChange={(value, extra) => handleFieldChange(setting.id, value, extra)}
                  allReviews={reviews}
                />
              ))}
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {initialized && review && (
          <View style={[styles.actionBar, { backgroundColor: colors.surface }]}>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.trashBtn, pressed && { backgroundColor: colors.danger + '22' }]}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={24} color={colors.danger} />
            </Pressable>
            
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveFab,
                { backgroundColor: colors.success },
                pressed && styles.saveFabPressed,
              ]}
            >
              <Ionicons name="checkmark" size={24} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.saveFabText}>Save</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 20,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  coordsText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  mapJumpBtn: {
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  mapJumpText: {
    fontWeight: '600',
    fontSize: 13,
  },
  duplicateBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  duplicateText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  actionBar: {
    position: 'absolute',
    bottom: spacing.xxxl,
    left: spacing.xl,
    right: spacing.xl,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
    elevation: 10,
  },
  trashBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  saveFab: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: 24,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
    elevation: 4,
  },
  saveFabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  saveFabText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 4,
  },
});
