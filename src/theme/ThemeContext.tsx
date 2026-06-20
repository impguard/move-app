import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Color Palettes ──────────────────────────────────────────────────────────

export const lightColors = {
  primary: '#4E6E58',
  primaryLight: '#DCE8E0',
  primaryDark: '#3A5242',
  background: '#F4EFEB',
  surface: '#FFFFFF',
  surfaceSecondary: '#EBE5DF',
  surfaceElevated: '#FFFFFF',
  text: '#2C3530',
  textSecondary: '#707A74',
  textTertiary: '#9BA6A0',
  border: 'rgba(78, 110, 88, 0.12)',
  borderLight: 'rgba(78, 110, 88, 0.06)',
  danger: '#C26D4D',
  dangerLight: '#F5E4DE',
  success: '#4E6E58',
  warning: '#DDA052',
  star: '#C26D4D',
  starEmpty: '#D3D8D5',
  overlay: 'rgba(44, 53, 48, 0.4)',
};

export const darkColors = {
  primary: '#A0C49D',
  primaryLight: '#2D3E33',
  primaryDark: '#C1DFBF',
  background: '#1B211D',
  surface: '#252D28',
  surfaceSecondary: '#202722',
  surfaceElevated: '#2A332D',
  text: '#E5F9E7',
  textSecondary: '#8E9C94',
  textTertiary: '#6B7870',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.04)',
  danger: '#E8A88E',
  dangerLight: '#4D3126',
  success: '#A0C49D',
  warning: '#E8B665',
  star: '#E8A88E',
  starEmpty: '#37423B',
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
