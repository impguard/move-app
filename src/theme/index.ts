import { Platform } from 'react-native';

// Re-export theme context and hook
export { useTheme, ThemeProvider, lightColors, darkColors } from './ThemeContext';
export type { AppColors } from './ThemeContext';

// Static tokens (not theme-dependent)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const shadows = {
  sm: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)', elevation: 2 } as any,
  md: { boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.08)', elevation: 4 } as any,
  lg: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.12)', elevation: 8 } as any,
};

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
};

// Legacy static colors export (used by StyleSheet.create at module level in some files)
// Prefer useTheme() inside components for dynamic dark/light colors.
export { lightColors as colors } from './ThemeContext';
