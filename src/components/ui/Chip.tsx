import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function Chip({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}>
      <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipInactive: {
    backgroundColor: Colors.backgroundSoft,
    borderColor: Colors.border,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  labelActive: {
    color: Colors.primaryDark,
  },
  labelInactive: {
    color: Colors.textSecondary,
  },
});
