import { Platform } from 'react-native';

// Re-export theme context and hook
export { useTheme, ThemeProvider, lightColors, darkColors } from './ThemeContext';
export type { AppColors } from './ThemeContext';

// Static tokens (not theme-dependent)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 24,
  xl: 24,
  full: 999,
};

export const shadows = {
  sm: { boxShadow: '0px 2px 4px rgba(78, 110, 88, 0.08)', elevation: 2 } as any,
  md: { boxShadow: '0px 10px 30px -10px rgba(78, 110, 88, 0.15)', elevation: 4 } as any,
  lg: { boxShadow: '0px 15px 40px -15px rgba(78, 110, 88, 0.2)', elevation: 8 } as any,
};

export const typography = {
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  heading: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    fontWeight: '500' as const,
  },
  caption: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    fontWeight: '400' as const,
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  small: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    fontWeight: '400' as const,
  },
};

// Legacy static colors export (used by StyleSheet.create at module level in some files)
// Prefer useTheme() inside components for dynamic dark/light colors.
export { lightColors as colors } from './ThemeContext';
