import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Color Palettes ──────────────────────────────────────────────────────────

export const lightColors = {
  primary: '#4A90D9',
  primaryLight: '#E8F1FB',
  primaryDark: '#2E6AAD',
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F1F3',
  surfaceElevated: '#FFFFFF',
  text: '#1A1D23',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F0F1F3',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#22C55E',
  warning: '#F59E0B',
  star: '#FBBF24',
  starEmpty: '#D1D5DB',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const darkColors = {
  primary: '#60A5FA',
  primaryLight: '#1E3A5F',
  primaryDark: '#93C5FD',
  background: '#0F1117',
  surface: '#1C1F2B',
  surfaceSecondary: '#252836',
  surfaceElevated: '#2A2D3E',
  text: '#F0F2F8',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  border: '#2D3148',
  borderLight: '#252836',
  danger: '#F87171',
  dangerLight: '#450A0A',
  success: '#4ADE80',
  warning: '#FCD34D',
  star: '#FBBF24',
  starEmpty: '#374151',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export type AppColors = typeof lightColors;

// ─── Context ─────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  colors: AppColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  isDark: true,
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = '@move_app_theme';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true); // default dark

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((val) => {
      if (val !== null) {
        setIsDark(val === 'dark');
      }
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme() {
  return useContext(ThemeContext);
}
