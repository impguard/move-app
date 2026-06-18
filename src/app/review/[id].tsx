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
import { FieldRenderer } from '@/components/FieldRenderer';
import { useReviews } from '@/store/useReviews';
import { useFieldSettings } from '@/store/useFieldSettings';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

  // Initialize local fields when review loads
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

  // Get address for header title
  const addressField = fieldSettings.find((f) => f.key === 'Address');
  const addressValue = addressField ? (localFields[addressField.id] as string) : '';

  const sortedSettings = [...fieldSettings].sort((a, b) => a.order - b.order);

  return (
    <>
      <Stack.Screen
        options={{
          title: addressValue || 'New Property',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable onPress={handleDelete} style={styles.headerButton} hitSlop={12}>
                <Text style={styles.deleteIcon}>🗑</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {loading || !initialized ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : !review ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Review not found</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {review.hasDuplicate && (
              <View style={styles.duplicateBanner}>
                <Text style={styles.duplicateText}>
                  ⚠️ This review may be a duplicate of an existing review.
                </Text>
              </View>
            )}

            <View style={styles.card}>
              {review.lat !== undefined && review.lng !== undefined && (
                <Pressable
                  style={({ pressed }) => [styles.mapJumpBtn, pressed && styles.mapJumpBtnPressed]}
                  onPress={() => {
                    const url = `https://maps.google.com/?q=${review.lat},${review.lng}`;
                    import('react-native').then(({ Linking }) => Linking.openURL(url));
                  }}
                >
                  <Text style={styles.mapJumpText}>🗺 Jump to Map</Text>
                </Pressable>
              )}

              {sortedSettings.map((setting) => (
                <FieldRenderer
                  key={setting.id}
                  setting={setting}
                  value={localFields[setting.id]}
                  onChange={(value, extra) => handleFieldChange(setting.id, value, extra)}
                />
              ))}
            </View>

          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveBtnText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  headerButton: {
    padding: spacing.sm,
  },
  deleteIcon: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  hint: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  mapJumpBtn: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  mapJumpBtnPressed: {
    opacity: 0.8,
  },
  mapJumpText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  duplicateBanner: {
    backgroundColor: '#fff3cd',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#ffe69c',
  },
  duplicateText: {
    ...typography.bodyMedium,
    color: '#856404',
    fontWeight: '600',
  },
});
