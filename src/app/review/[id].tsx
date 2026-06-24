import { FieldRenderer } from '@/components/FieldRenderer';
import { useFieldSettings } from '@/store/useFieldSettings';
import { useReviews } from '@/store/useReviews';
import { borderRadius, spacing, typography, useTheme } from '@/theme';
import { getDefaultValue } from '@/types';
import { formatShortAddress } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
} from 'react-native';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const { colors } = useTheme();
  const { fieldSettings, loading: settingsLoading } = useFieldSettings();
  const {
    reviews,
    loading: reviewsLoading,
    createReview,
    updateReview,
    deleteReview,
    getReview,
    reload,
  } = useReviews(fieldSettings);

  const review = isNew ? undefined : getReview(id!);

  // ─── Local State for Create Mode ─────────────────────────────────────────────
  const [localFields, setLocalFields] = useState<Record<string, unknown>>({});
  const [localExtra, setLocalExtra] = useState<{ lat?: number; lng?: number }>({});
  
  useEffect(() => {
    if (isNew && fieldSettings.length > 0 && Object.keys(localFields).length === 0) {
      const initial: Record<string, unknown> = {};
      fieldSettings.forEach(fs => {
        initial[fs.id] = getDefaultValue(fs.type);
      });
      setLocalFields(initial);
    }
  }, [isNew, fieldSettings, localFields]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Allow Escape key to go back on Web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If an input is focused, just blur it first instead of immediately going back
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          (document.activeElement as HTMLElement).blur();
          return;
        }

        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const handleFieldChange = useCallback((fieldId: string, value: unknown, extra?: { lat?: number; lng?: number }) => {
    if (isNew) {
      setLocalFields((prev) => ({ ...prev, [fieldId]: value }));
      if (extra) setLocalExtra((prev) => ({ ...prev, ...extra }));
    } else {
      updateReview(id!, { [fieldId]: value }, { ...extra, status: 'saved' });
    }
  }, [isNew, id, updateReview]);

  const handleExtraChange = useCallback((extra: { lat?: number | undefined; lng?: number | undefined }) => {
    if (isNew) {
      setLocalExtra((prev) => ({ ...prev, ...extra }));
    } else {
      updateReview(id!, {}, extra);
    }
  }, [isNew, id, updateReview]);

  const handleSaveCreate = async () => {
    const addressSetting = fieldSettings.find((f) => f.isCore);
    if (addressSetting) {
      const addrValue = localFields[addressSetting.id];
      if (!addrValue || String(addrValue).trim() === '') {
        if (Platform.OS === 'web') window.alert('Please enter a valid address.');
        else Alert.alert('Address Required', 'Please enter a valid address.');
        return;
      }
      if (localExtra.lat === undefined || localExtra.lng === undefined || isNaN(localExtra.lat) || isNaN(localExtra.lng)) {
        if (Platform.OS === 'web') {
          window.alert('Please pick an address or enter valid GPS coordinates manually.');
        } else {
          Alert.alert('GPS Required', 'Please pick an address or enter valid GPS coordinates manually.');
        }
        return;
      }
    }

    const newId = await createReview(localFields, localExtra);
    router.setParams({ id: newId });
  };

  const handleDelete = () => {
    if (isNew) return;
    const doDelete = async () => {
      await deleteReview(id!);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
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
  const addressValue = addressField 
    ? (isNew ? localFields[addressField.id] : review?.fields[addressField.id]) as string
    : '';
  const shortTitle = addressValue ? formatShortAddress(addressValue) : 'New Property';

  const sortedSettings = [...fieldSettings].sort((a, b) => a.order - b.order);

  // Derived active values
  const activeLat = isNew ? localExtra.lat : review?.lat;
  const activeLng = isNew ? localExtra.lng : review?.lng;

  const isDuplicate = addressValue 
    ? reviews.some(r => r.id !== (isNew ? 'new' : id) && r.fields[addressField?.id || ''] === addressValue)
    : false;

  return (
    <>
      <Stack.Screen
        options={{
          title: shortTitle,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          headerLeft: () => (
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ marginLeft: Platform.OS === 'web' ? 16 : 0, marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading...</Text>
          </View>
        ) : !isNew && !review ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Review not found</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
            contentInsetAdjustmentBehavior="automatic"
          >
            {isDuplicate && (
              <View style={[styles.duplicateBanner, { backgroundColor: colors.warning + '22', borderColor: colors.warning }]}>
                <Text style={[styles.duplicateText, { color: colors.warning }]}>
                  ⚠️ Another review already exists with this exact address.
                </Text>
              </View>
            )}
            {!isNew && review?.hasDuplicate && !isDuplicate && (
              <View style={[styles.duplicateBanner, { backgroundColor: colors.warning + '22', borderColor: colors.warning }]}>
                <Text style={[styles.duplicateText, { color: colors.warning }]}>
                  ⚠️ This review may be a duplicate of an existing review.
                </Text>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {addressValue ? (
                <View style={[styles.coordsRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}>
                  <Text style={[styles.coordsIcon, { color: colors.textSecondary }]}>📍</Text>
                  <View style={styles.coordInputWrapper}>
                    <Text style={[styles.coordLabel, { color: colors.textTertiary }]}>Lat</Text>
                    <TextInput
                      style={[styles.coordInput, { color: colors.text, borderColor: colors.borderLight, backgroundColor: colors.surface }]}
                      keyboardType="numeric"
                      value={activeLat !== undefined ? String(activeLat) : ''}
                      onChangeText={(val: string) => {
                        const num = parseFloat(val);
                        handleExtraChange({ lat: isNaN(num) ? undefined : num });
                      }}
                      placeholder="Latitude"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <View style={styles.coordInputWrapper}>
                    <Text style={[styles.coordLabel, { color: colors.textTertiary }]}>Lng</Text>
                    <TextInput
                      style={[styles.coordInput, { color: colors.text, borderColor: colors.borderLight, backgroundColor: colors.surface }]}
                      keyboardType="numeric"
                      value={activeLng !== undefined ? String(activeLng) : ''}
                      onChangeText={(val: string) => {
                        const num = parseFloat(val);
                        handleExtraChange({ lng: isNaN(num) ? undefined : num });
                      }}
                      placeholder="Longitude"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  {activeLat !== undefined && activeLng !== undefined && !isNaN(activeLat) && !isNaN(activeLng) && (
                    <Pressable
                      style={[styles.mapJumpBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => {
                        const url = `https://maps.google.com/?q=${activeLat},${activeLng}`;
                        import('react-native').then(({ Linking }) => Linking.openURL(url));
                      }}
                    >
                      <Text style={[styles.mapJumpText, { color: colors.primary }]}>Open Map</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}

              {sortedSettings.map((setting, index) => (
                <View key={setting.id} style={{ zIndex: 1000 - index }}>
                  <FieldRenderer
                    setting={setting}
                    value={isNew ? localFields[setting.id] : review?.fields[setting.id]}
                    onChange={(value, extra) => handleFieldChange(setting.id, value, extra)}
                    allReviews={reviews}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Action Bar */}
        {(!loading && (isNew || review)) && (
          <View style={[styles.actionBar, { backgroundColor: colors.surface }]}>
            {!isNew ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  onPress={handleDelete}
                  style={({ pressed }) => [styles.trashBtn, pressed && { backgroundColor: colors.danger + '22' }]}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={24} color={colors.danger} />
                </Pressable>

                <Pressable
                  onPress={() => {
                    const newStatus = (review?.status === 'hidden') ? 'saved' : 'hidden';
                    updateReview(id!, {}, { status: newStatus });
                  }}
                  style={({ pressed }) => [
                    styles.hiddenBtn,
                    review?.status === 'hidden' && { backgroundColor: colors.warning + '22' },
                    pressed && { opacity: 0.7 }
                  ]}
                  hitSlop={8}
                >
                  <Ionicons 
                    name={review?.status === 'hidden' ? "eye-off" : "eye"} 
                    size={24} 
                    color={review?.status === 'hidden' ? colors.warning : colors.textSecondary} 
                  />
                </Pressable>
              </View>
            ) : (
              <View /> // Spacer
            )}

            {isNew && (
              <Pressable
                onPress={handleSaveCreate}
                style={({ pressed }) => [
                  styles.saveFab,
                  { backgroundColor: colors.success },
                  pressed && styles.saveFabPressed,
                ]}
              >
                <Ionicons name="checkmark" size={24} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.saveFabText}>Save Property</Text>
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
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
    paddingBottom: spacing.xxxl + 120, // Increased bottom padding to leave space for action bar
  },
  card: {
    borderRadius: borderRadius.xl,
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
  coordsIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  coordInputWrapper: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  coordInput: {
    height: 36,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
  },
  mapJumpBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-end',
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
  hiddenBtn: {
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
