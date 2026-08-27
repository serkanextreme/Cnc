/**
 * Talas - Design tokens (dark theme only) ported from design-tokens.json
 * Colors, typography and spacing shared across all RN screens/components.
 */
export const colors = {
  background: '#111719',
  foreground: '#F3F7F5',
  card: '#182123',
  cardForeground: '#F3F7F5',
  muted: '#1D292B',
  mutedForeground: '#B5C3C2',
  border: '#344346',
  input: '#202C2E',
  primary: '#F4B942',
  primaryForeground: '#17201F',
  secondary: '#236B6A',
  secondaryForeground: '#F4FAF9',
  accent: '#55C6C3',
  accentForeground: '#102120',
  destructive: '#E7685C',
  destructiveForeground: '#FFFFFF',
  success: '#5DBB87',
  successForeground: '#102218',
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

/** Barlow Condensed loaded via @expo-google-fonts for headings/numbers,
 * IBM Plex Sans for body text - matches the web app typography. */
export const fonts = {
  headingBold: 'BarlowCondensed_700Bold',
  headingSemiBold: 'BarlowCondensed_600SemiBold',
  headingMedium: 'BarlowCondensed_500Medium',
  body: 'IBMPlexSans_400Regular',
  bodyMedium: 'IBMPlexSans_500Medium',
  bodySemiBold: 'IBMPlexSans_600SemiBold',
  bodyBold: 'IBMPlexSans_700Bold',
};

export const fontMap = {
  BarlowCondensed_700Bold: require('@expo-google-fonts/barlow-condensed/700Bold/BarlowCondensed_700Bold.ttf'),
  BarlowCondensed_600SemiBold: require('@expo-google-fonts/barlow-condensed/600SemiBold/BarlowCondensed_600SemiBold.ttf'),
  BarlowCondensed_500Medium: require('@expo-google-fonts/barlow-condensed/500Medium/BarlowCondensed_500Medium.ttf'),
  IBMPlexSans_400Regular: require('@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf'),
  IBMPlexSans_500Medium: require('@expo-google-fonts/ibm-plex-sans/500Medium/IBMPlexSans_500Medium.ttf'),
  IBMPlexSans_600SemiBold: require('@expo-google-fonts/ibm-plex-sans/600SemiBold/IBMPlexSans_600SemiBold.ttf'),
  IBMPlexSans_700Bold: require('@expo-google-fonts/ibm-plex-sans/700Bold/IBMPlexSans_700Bold.ttf'),
};

/** hex (#RRGGBB) + alpha(0-1) -> rgba() string. Mirrors Tailwind's bg-primary/10 usage. */
export function alpha(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export const toneColors = {
  ok: colors.success,
  success: colors.success,
  warn: colors.primary,
  primary: colors.primary,
  error: colors.destructive,
  destructive: colors.destructive,
  accent: colors.accent,
  neutral: colors.mutedForeground,
};
