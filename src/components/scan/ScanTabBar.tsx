import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_PADDING_BOTTOM,
  TAB_BAR_PADDING_TOP,
  TAB_ICON_SIZE,
  TAB_LABEL_FONT_SIZE,
} from '@/constants/tabBar';
import { Colors } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

// 홈 탭바((tabs)/_layout.tsx)와 같은 아이콘·이름·크기로 맞춘다. 스캔 화면에서만 탭바가 따로 그려져서,
// 모양이 다르면 탭을 누를 때마다 아이콘이 이리저리 움직여 보인다.
const TABS = [
  { label: '홈', icon: 'home-outline', route: '/(tabs)' },
  { label: '기록', icon: 'time-outline', route: '/(tabs)/history' },
  { label: '스캔', icon: 'scan-outline', route: '/scan/camera' },
  { label: '가이드', icon: 'bookmark-outline', route: '/(tabs)/guide' },
  { label: 'My', icon: 'person-outline', route: '/(tabs)/mypage' },
] as const satisfies readonly { label: string; icon: IconName; route: Href }[];

export function useScanTabBarHeight() {
  return TAB_BAR_HEIGHT;
}

export function ScanTabBar() {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const active = tab.label === '스캔';
        const color = active ? Colors.primary : Colors.textTertiary;
        return (
          <Pressable
            key={tab.label}
            accessibilityRole="button"
            accessibilityLabel={`${tab.label} 화면으로 이동`}
            hitSlop={6}
            onPress={() => router.replace(tab.route)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <Ionicons name={tab.icon} size={TAB_ICON_SIZE} color={color} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    paddingTop: TAB_BAR_PADDING_TOP,
    paddingBottom: TAB_BAR_PADDING_BOTTOM,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  // 기본 탭바는 항목 안의 간격을 자체 계산해서 아이콘이 몇 px 더 위에 놓인다. 화면에서 재서 같은 위치로 맞춘 값이다.
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 5 },
  pressed: { opacity: 0.55 },
  label: { fontSize: TAB_LABEL_FONT_SIZE, fontWeight: '700', marginTop: 1 },
});
