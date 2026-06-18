import React from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius } from '@/theme';

interface PictureFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function PictureField({ value, onChange }: PictureFieldProps) {
  const pickImage = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      if (Platform.OS !== 'web') {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: Platform.OS === 'web',
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((asset) => {
        if (Platform.OS === 'web' && asset.base64) {
          return `data:image/jpeg;base64,${asset.base64}`;
        }
        return asset.uri;
      });
      onChange([...value, ...newUris]);
    }
  };

  const removeImage = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.row}>
          {value.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.image} />
              <Pressable
                onPress={() => removeImage(index)}
                style={styles.removeButton}
                hitSlop={8}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={pickImage} style={styles.addButton}>
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addLabel}>Add</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  scroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  addIcon: {
    fontSize: 24,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  addLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
