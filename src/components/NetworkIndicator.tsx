import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as Network from 'expo-network';
import { useTheme, typography, spacing } from '@/theme';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addConnectionListener } from '@/store/firestoreSync';

export function NetworkIndicator() {
  const { colors } = useTheme();
  const [isNetworkConnected, setIsNetworkConnected] = useState(true);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let mounted = true;
    
    // Track Firestore specific connection state
    const unsubFirestore = addConnectionListener((connected) => {
      if (mounted) setIsFirestoreConnected(connected);
    });
    
    // For Web, use native navigator online/offline events for immediate reaction
    if (Platform.OS === 'web') {
      const handleOnline = () => setIsNetworkConnected(true);
      const handleOffline = () => setIsNetworkConnected(false);
      
      setIsNetworkConnected(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        mounted = false;
        unsubFirestore();
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // For Native, poll Expo Network state
    const checkNetwork = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) setIsNetworkConnected(state.isConnected ?? true);
      } catch (e) {
        // ignore
      }
    };
    
    checkNetwork();
    const interval = setInterval(checkNetwork, 3000);
    return () => {
      mounted = false;
      unsubFirestore();
      clearInterval(interval);
    };
  }, []);

  const isConnected = isNetworkConnected && isFirestoreConnected;

  if (isConnected) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.danger, paddingTop: Platform.OS === 'ios' ? insets.top + 6 : 6 }]}>
      <Text style={styles.text}>
        {!isNetworkConnected 
          ? 'Offline: Edits will be saved locally and sync later.'
          : 'Disconnected from database. Edits will sync when reconnected.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  text: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '600',
  },
});
