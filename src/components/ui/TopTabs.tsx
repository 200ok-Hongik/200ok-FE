import { Text } from '@/components/ui/Text';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, FontSize, Spacing } from '@/constants/theme';

type Tab = { label: string; value: string };

type Props = {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
};

export function TopTabs({ tabs, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable key={tab.value} onPress={() => onChange(tab.value)} style={styles.tab}>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            <View style={[styles.underline, active && styles.underlineActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  labelActive: {
    color: Colors.text,
    fontWeight: '800',
  },
  underline: {
    marginTop: Spacing.sm,
    height: 2,
    width: '60%',
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  underlineActive: {
    backgroundColor: Colors.primary,
  },
});