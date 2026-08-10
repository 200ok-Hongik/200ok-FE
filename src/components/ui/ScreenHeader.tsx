import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';

import { Colors, FontSize, Spacing } from '@/constants/theme';

type Props = {
  title?: string;
  onBack?: () => void;
  dark?: boolean;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, onBack, dark, right }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        hitSlop={12}
        onPress={onBack ?? (() => router.back())}
        style={[styles.iconButton, dark && styles.iconButtonDark]}>
        <Ionicons name="chevron-back" size={22} color={dark ? '#FFFFFF' : Colors.text} />
      </Pressable>
      <Text style={[styles.title, dark && styles.titleDark]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: Spacing.lg,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDark: {},
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginRight: 36,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  right: {
    position: 'absolute',
    right: Spacing.lg,
  },
});
