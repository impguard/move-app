import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, borderRadius, typography } from '@/theme';
import { useFieldSettings } from '@/store/useFieldSettings';
import { useSort, SortState } from '@/store/useSort';

export default function SortScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { fieldSettings } = useFieldSettings();
  const { sort, updateSort, clearSort } = useSort();

  const [localSort, setLocalSort] = useState<SortState | null>(sort);

  const sortableSettings = fieldSettings.filter((s) => s.isSortable !== false && ['score', 'dollar', 'sqft', 'number', 'boolean', 'label'].includes(s.type));

  const handleApply = () => {
    if (localSort) updateSort(localSort);
    else clearSort();
    router.back();
  };

  const handleSelectField = (id: string) => {
    if (localSort?.fieldId === id) {
      setLocalSort({ fieldId: id, order: localSort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setLocalSort({ fieldId: id, order: 'desc' }); // default new sort to desc
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          presentation: Platform.OS === 'web' ? 'transparentModal' : 'modal',
          headerShown: false,
          animation: Platform.OS === 'web' ? 'fade' : 'default',
        }}
      />
      <View style={[styles.backdropContainer, Platform.OS !== 'web' && { backgroundColor: colors.background, justifyContent: 'flex-start' }]}>
        {Platform.OS === 'web' && (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />
        )}
        <View style={[
          styles.sheetContent,
          { backgroundColor: colors.background },
          Platform.OS !== 'web' && styles.sheetContentNative
        ]}>
          <View style={[styles.dragHandle, { backgroundColor: colors.borderLight }]} />
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Sort</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Pressable onPress={() => { setLocalSort(null); }} hitSlop={12}>
                <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
              </Pressable>
              <Pressable onPress={() => router.back()} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.instruction, { color: colors.textSecondary }]}>
            Select a field to sort by. Tap again to toggle between ascending and descending order.
          </Text>

          <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            {sortableSettings.map((setting, index) => {
              const isSelected = localSort?.fieldId === setting.id;
              const isLast = index === sortableSettings.length - 1;

              return (
                <Pressable
                  key={setting.id}
                  style={[
                    styles.row,
                    { borderBottomColor: colors.borderLight },
                    isSelected && { backgroundColor: colors.primaryLight },
                    isLast && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => handleSelectField(setting.id)}
                >
                  <Text style={[styles.rowText, { color: isSelected ? colors.primary : colors.text }, isSelected && { fontWeight: '600' }]}>
                    {setting.key}
                  </Text>
                  
                  {isSelected && (
                    <View style={styles.orderBadge}>
                      <Text style={[styles.orderText, { color: colors.primary }]}>
                        {localSort.order === 'asc' ? 'Ascending' : 'Descending'}
                      </Text>
                      <Ionicons 
                        name={localSort.order === 'asc' ? 'arrow-up' : 'arrow-down'} 
                        size={16} 
                        color={colors.primary} 
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Apply FAB */}
        <Pressable
          onPress={handleApply}
          style={({ pressed }) => [
            styles.applyFab,
            { backgroundColor: colors.success },
            pressed && styles.applyFabPressed,
          ]}
        >
          <Ionicons name="checkmark" size={28} color="#fff" />
        </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdropContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContent: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.2)',
    elevation: 24,
  },
  sheetContentNative: {
    maxHeight: '100%',
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    boxShadow: 'none',
    elevation: 0,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 20,
  },
  clearText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 140, // Extra padding for FAB
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  instruction: {
    ...typography.body,
    marginBottom: spacing.xl,
  },
  list: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  rowText: {
    ...typography.bodyMedium,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  orderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  applyFab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxxl,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
    elevation: 8,
  },
  applyFabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
