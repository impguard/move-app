import React, { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, spacing, borderRadius } from '@/theme';

interface PictureFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
  totalPicturesCount: number;
}

export function PictureField({ value, onChange, totalPicturesCount }: PictureFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { colors } = useTheme();

  const processAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setIsUploading(true);
    try {
      const uploadPromises = assets.map(async (asset) => {
        let finalUri = asset.uri;
        
        // Compress and resize the image, extracting base64
        const manipulateResult = await import('expo-image-manipulator').then(m => m.manipulateAsync(
          asset.uri,
          [{ resize: { width: 600 } }], // Aggressive resize
          { compress: 0.5, format: m.SaveFormat.JPEG, base64: true }
        ));
        
        if (manipulateResult.base64) {
          finalUri = `data:image/jpeg;base64,${manipulateResult.base64}`;
        }
        
        // Return the raw data URI directly to be embedded in the JSON document!
        return finalUri;
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

    const remaining = Math.max(0, 12 - totalPicturesCount);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.4,
    });

    if (!result.canceled && result.assets) {
      const assetsToProcess = result.assets.slice(0, remaining);
      if (assetsToProcess.length > 0) {
        await processAssets(assetsToProcess);
      }
    }
  };

  const launchCamera = async () => {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      if (Platform.OS !== 'web') Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }

    const remaining = Math.max(0, 12 - totalPicturesCount);
    if (remaining <= 0) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.4,
    });

    if (!result.canceled && result.assets) {
      await processAssets(result.assets.slice(0, remaining));
    }
  };

  const pickImage = () => {
    if (totalPicturesCount >= 12) {
      if (Platform.OS === 'web') window.alert('You have reached the limit of 12 photos per review.');
      else Alert.alert('Limit Reached', 'You have reached the limit of 12 photos per review.');
      return;
    }

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
