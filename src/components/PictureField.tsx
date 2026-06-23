import React, { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, spacing, borderRadius } from '@/theme';
import { uploadImageToStorage } from '@/store/storageSync';

interface PictureFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function PictureField({ value, onChange }: PictureFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { colors } = useTheme();

  const processAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setIsUploading(true);
    try {
      const uploadPromises = assets.map(async (asset) => {
        let uriToUpload = asset.uri;
        if (asset.base64) {
          uriToUpload = `data:image/jpeg;base64,${asset.base64}`;
        }
        return await uploadImageToStorage(uriToUpload);
      });
      const uploadedUris = await Promise.all(uploadPromises);
      onChange([...value, ...uploadedUris]);
    } catch (e) {
      console.warn('Upload failed', e);
      if (Platform.OS !== 'web') {
        Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
      } else {
        window.alert('Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const launchLibrary = async () => {
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
      base64: true, // Always request base64 to avoid native filesystem Blob conversion issues
    });

    if (!result.canceled && result.assets) {
      await processAssets(result.assets);
    }
  };

  const launchCamera = async () => {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      if (Platform.OS !== 'web') Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: Platform.OS === 'web',
    });

    if (!result.canceled && result.assets) {
      await processAssets(result.assets);
    }
  };

  const pickImage = () => {
    if (Platform.OS === 'web') {
      launchLibrary();
      return;
    }
    Alert.alert(
      'Add Photo',
      'Choose photo source',
      [
        { text: 'Take Photo', onPress: launchCamera },
        { text: 'Choose from Library', onPress: launchLibrary },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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
              <Image source={{ uri }} style={[styles.image, { backgroundColor: colors.surfaceSecondary }]} />
              <Pressable
                onPress={() => removeImage(index)}
                style={styles.removeButton}
                hitSlop={8}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Pressable 
            onPress={pickImage} 
            style={[styles.addButton, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]} 
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text style={[styles.addIcon, { color: colors.textTertiary }]}>+</Text>
                <Text style={[styles.addLabel, { color: colors.textTertiary }]}>Add</Text>
              </>
            )}
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
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 24,
    fontWeight: '300',
  },
  addLabel: {
    fontSize: 12,
    marginTop: 2,
  },
});
