import { useEffect, useRef } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OverlayModal } from '@/components/ui/OverlayModal';
import { Text } from '@/components/ui/Text';
import { ScanColors } from '@/constants/scanDesign';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  // 디자인의 시트 높이(375x1028 프레임 기준 347 / 537). 내용이 더 길면 늘어난다.
  minHeight?: number;
  // 제목/부제목 아래 구분선 (우리 동네 배출 안내 시트만 사용)
  divider?: boolean;
  children: React.ReactNode;
};

// 구성품 분리 / 우리 동네 배출 안내에 쓰는 바텀시트. 어두운 40% 딤 + 큰 둥근 모서리가 디자인 특징이다.
export function ScanSheet({ visible, onClose, title, subtitle, minHeight = 347, divider, children }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(600)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  // 위쪽(손잡이·제목) 영역을 아래로 끌어내리면 시트가 닫힌다. 너무 조금 끌거나 천천히 놓으면 제자리로 돌아온다.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dragResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        // 많이 끌었거나, 어느 정도 끌면서 빠르게 튕겼을 때만 닫는다.
        if (gesture.dy > 90 || (gesture.dy > 30 && gesture.vy > 0.9)) {
          Animated.timing(translateY, { toValue: 700, duration: 160, useNativeDriver: true }).start(() => onCloseRef.current());
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, mass: 0.9 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, mass: 0.9 }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, mass: 0.9 }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(600);
      backdrop.setValue(0);
    }
  }, [visible, translateY, backdrop]);

  return (
    <OverlayModal visible={visible} onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { minHeight, paddingBottom: Math.max(insets.bottom, 16), transform: [{ translateY }] }]}>
        <View {...dragResponder.panHandlers} style={styles.dragZone}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {divider && <View style={styles.divider} />}
        </View>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.scroll}>
          {children}
        </ScrollView>
      </Animated.View>
    </OverlayModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 33,
  },
  scroll: { flexGrow: 0 },
  // 웹에서는 세로 끌기를 브라우저 스크롤이 가로채지 않게 한다.
  dragZone: { touchAction: 'none', userSelect: 'none' } as object,
  handle: { alignSelf: 'center', width: 74, height: 4, borderRadius: 2, backgroundColor: ScanColors.ink2 },
  title: { marginTop: 26, fontSize: 24, lineHeight: 30, fontWeight: '700', color: '#000000' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: ScanColors.gray },
  divider: { marginTop: 26, height: 1, backgroundColor: ScanColors.line },
});
