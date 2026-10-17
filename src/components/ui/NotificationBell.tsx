import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  // 새 알림이 있으면 종 오른쪽 위가 파이고 그 자리에 빨간 점이 들어간다.
  hasUnread: boolean;
  onPress?: () => void;
};

const BELL_COLOR = '#176B41';

// 종 몸통 + 아래 추. (Figma "Subtract" 아이콘 18x21 기준)
const CLAPPER =
  'M10.9902 19.1973C10.9449 19.6553 10.7423 20.0858 10.4141 20.4141C10.039 20.7891 9.53043 21 9 21C8.46957 21 7.96101 20.7891 7.58594 20.4141C7.21086 20.039 7 19.5304 7 19L10.9902 19.1973Z';
const BODY_TOP = 'M9 0C9.53043 0 10.039 0.210865 10.4141 0.585938C10.7891 0.96101 11 1.46957 11 2V2.29004';
const BODY_BOTTOM = 'V15L18 17V18H0V17L2 15V9C2 5.9 4.03001 3.17004 7 2.29004V2C7 1.46957 7.21086 0.96101 7.58594 0.585938C7.96101 0.210865 8.46957 0 9 0Z';
// 새 알림이 있을 때: 오른쪽 위에 점이 들어갈 자리가 파인 모양
const BODY_WITH_NOTCH = `${BODY_TOP}C11.4003 2.40865 11.783 2.56194 12.1465 2.74414C11.7393 3.31616 11.5 4.01589 11.5 4.77148C11.5 6.70448 13.067 8.27148 15 8.27148C15.3284 8.27148 15.6459 8.22518 15.9473 8.14062C15.9819 8.42305 16 8.70988 16 9${BODY_BOTTOM}`;
// 알림이 없을 때: 파인 곳 없이 매끈한 종 모양
const BODY_PLAIN = `${BODY_TOP}C13.97 3.17 16 5.9 16 9${BODY_BOTTOM}`;

export function NotificationBell({ hasUnread, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? '새 알림이 있어요' : '알림'}
      hitSlop={12}
      onPress={onPress}
      style={styles.wrap}>
      <View>
        <Svg width={18} height={21} viewBox="0 0 18 21" fill="none">
          <Path d={hasUnread ? BODY_WITH_NOTCH : BODY_PLAIN} fill={BELL_COLOR} />
          <Path d={CLAPPER} fill={BELL_COLOR} />
          {hasUnread && <Circle cx={15} cy={4.77} r={2.6} fill="#F46D75" />}
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 24, height: 26, alignItems: 'center', justifyContent: 'center' },
});
