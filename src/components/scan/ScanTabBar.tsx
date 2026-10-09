import { router, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { ScanColors } from '@/constants/scanDesign';
import { ICONS } from './iconPaths';
import { PathIcon } from './PathIcon';

const TABS = [
  { label: '홈', icon: ICONS.tabHome, route: '/(tabs)' },
  { label: '기록', icon: ICONS.tabHistory, route: '/(tabs)/history' },
  { label: '스캔', icon: ICONS.tabScan, route: '/scan/camera' },
  { label: '가이드', icon: ICONS.tabGuide, route: '/(tabs)/guide' },
  { label: 'My', icon: ICONS.tabMy, route: '/(tabs)/mypage' },
] as const satisfies readonly { label: string; icon: unknown; route: Href }[];

type Props = {
  // dark: 카메라 화면(어두운 그라데이션 위), light: 흰 배경
  variant: 'dark' | 'light';
};

export const SCAN_TAB_CONTENT_HEIGHT = 58;

export function useScanTabBarHeight() {
  const insets = useSafeAreaInsets();
  return SCAN_TAB_CONTENT_HEIGHT + Math.max(insets.bottom, 12);
}

export function ScanTabBar({ variant }: Props) {
  const dark = variant === 'dark';
  const height = useScanTabBarHeight();
  const inactive = dark ? ScanColors.chipGray : ScanColors.tabInk;

  return (
    <View style={[styles.bar, { height }, !dark && styles.barLight]}>
      {dark && (
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,1)']}
          style={[StyleSheet.absoluteFill, styles.passThrough, { top: -(90 - height) }]}
        />
      )}
      <View style={styles.row}>
        {TABS.map((tab) => {
          const active = tab.label === '스캔';
          const color = active ? ScanColors.green : inactive;
          return (
            <Pressable
              key={tab.label}
              accessibilityRole="button"
              accessibilityLabel={`${tab.label} 화면으로 이동`}
              hitSlop={6}
              onPress={() => router.replace(tab.route)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <View style={styles.iconBox}>
                <PathIcon icon={tab.icon} color={color} />
              </View>
              <Text style={[styles.label, { color }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
  passThrough: { pointerEvents: 'none' },
  barLight: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 -2px 6px rgba(0,0,0,0.12)',
  },
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14 },
  item: { flex: 1, alignItems: 'center' },
  pressed: { opacity: 0.55 },
  iconBox: { height: 20, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 5, fontSize: 12, lineHeight: 14, fontWeight: '500' },
});
