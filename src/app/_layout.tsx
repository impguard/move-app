import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ThemeProvider, useTheme, typography } from '@/theme';
import { bootstrapSyncKey } from '@/store/useSyncKey';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';

SplashScreen.preventAutoHideAsync();

function SyncInitializer() {
  useEffect(() => {
    bootstrapSyncKey();
  }, []);
  return null;
}

import { NetworkIndicator } from '@/components/NetworkIndicator';

function ThemedStack() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NetworkIndicator />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTitleStyle: {
            fontFamily: typography.heading.fontFamily,
            fontWeight: '600',
            fontSize: 17,
            color: colors.text,
          },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          contentStyle: {
            backgroundColor: colors.background,
          },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <SyncInitializer />
      <ThemedStack />
    </ThemeProvider>
  );
}
