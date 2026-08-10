import { Platform } from 'react-native';

export const Colors = {
  primary: '#22C55E',
  primaryDark: '#16A34A',
  primaryLight: '#DCFCE7',
  mint: '#ECFDF5',
  kakao: '#FEE500',

  background: '#FFFFFF',
  backgroundSoft: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E5E7EB',

  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  white: '#FFFFFF',

  danger: '#EF4444',
  warningBg: '#FEF3E2',
  warningText: '#B45309',

  overlay: 'rgba(15, 23, 22, 0.55)',
  scanDark: '#0B0F0E',
} as const;

export const CategoryColors: Record<string, string> = {
  plastic: '#22C55E',
  glass: '#0EA5E9',
  can: '#F59E0B',
  paper: '#8B5CF6',
  vinyl: '#64748B',
  styrofoam: '#EC4899',
};

export const Radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const FontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export const Shadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 3 },
  default: {},
}) as object;

export const BottomTabHeight = 78;
