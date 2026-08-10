import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type Option = { label: string; value: string };

type Props = {
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
};

export function PillToggle({ options, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}>
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pill: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillInactive: {
    backgroundColor: Colors.backgroundSoft,
    borderColor: Colors.border,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  labelActive: {
    color: '#FFFFFF',
  },
  labelInactive: {
    color: Colors.textSecondary,
  },
});
