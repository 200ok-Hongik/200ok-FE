import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'kakao' | 'dark';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  labelStyle?: TextStyle;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, icon, style, labelStyle }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'kakao' ? '#391B1B' : '#FFFFFF'} />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={variant === 'kakao' ? '#391B1B' : variant === 'secondary' ? Colors.text : '#FFFFFF'}
            />
          )}
          <Text style={[styles.label, textVariantStyles[variant], labelStyle]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
});

const variantStyles: Record<Variant, ViewStyle> = StyleSheet.create({
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  kakao: { backgroundColor: Colors.kakao },
  dark: { backgroundColor: '#111827' },
});

const textVariantStyles = StyleSheet.create({
  primary: { color: '#FFFFFF' },
  secondary: { color: Colors.text },
  kakao: { color: '#391B1B' },
  dark: { color: '#FFFFFF' },
});
