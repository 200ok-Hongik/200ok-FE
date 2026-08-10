import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
};

export function Card({ children, style, noPadding }: Props) {
  return <View style={[styles.card, !noPadding && styles.padding, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow,
  },
  padding: {
    padding: Spacing.lg,
  },
});
