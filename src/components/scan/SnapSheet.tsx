import { useEffect, useRef } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScanColors } from '@/constants/scanDesign';

type Props = {
  // 펼쳤을 때 시트 높이, 접었을 때 화면에 보이는 높이
  height: number;
  collapsedHeight: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  // 손잡이·제목처럼 끌 수 있는 윗부분
  header: React.ReactNode;
  children: React.ReactNode;
  // 아래에 떠 있는 버튼에 가려지지 않게 비워 두는 높이
  bottomInset?: number;
};

const SPRING = { useNativeDriver: true, damping: 22, mass: 0.9 } as const;

// 접힌 상태(사진이 크게 보임)와 펼친 상태(목록 화면) 두 위치에 붙는 바텀시트.
// 윗부분을 위아래로 끌거나 손잡이를 눌러서 바꾼다. 접힌 상태에서는 목록 영역을 끌어도 올라온다.
export function SnapSheet({ height, collapsedHeight, expanded, onExpandedChange, header, children, bottomInset = 0 }: Props) {
  const maxY = Math.max(0, height - collapsedHeight);
  const translateY = useRef(new Animated.Value(expanded ? 0 : maxY)).current;
  const current = useRef(expanded ? 0 : maxY);
  const startY = useRef(0);
  const maxYRef = useRef(maxY);
  const expandedRef = useRef(expanded);
  const onChangeRef = useRef(onExpandedChange);
  maxYRef.current = maxY;
  expandedRef.current = expanded;
  onChangeRef.current = onExpandedChange;

  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      current.current = value;
    });
    return () => translateY.removeListener(id);
  }, [translateY]);

  // 화면 크기가 바뀌었거나 바깥에서 펼침 상태를 바꿨을 때 위치를 맞춘다.
  useEffect(() => {
    Animated.spring(translateY, { toValue: expanded ? 0 : maxY, ...SPRING }).start();
  }, [expanded, maxY, translateY]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderGrant: () => {
        translateY.stopAnimation();
        startY.current = current.current;
      },
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(Math.min(Math.max(startY.current + gesture.dy, 0), maxYRef.current));
      },
      onPanResponderRelease: (_, gesture) => {
        const end = Math.min(Math.max(startY.current + gesture.dy, 0), maxYRef.current);
        // 세게 튕기면 그 방향으로, 아니면 가까운 쪽으로 붙는다.
        const open = gesture.vy < -0.4 ? true : gesture.vy > 0.4 ? false : end < maxYRef.current / 2;
        Animated.spring(translateY, { toValue: open ? 0 : maxYRef.current, ...SPRING }).start();
        if (open !== expandedRef.current) onChangeRef.current(open);
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: expandedRef.current ? 0 : maxYRef.current, ...SPRING }).start();
      },
    })
  ).current;

  return (
    <Animated.View style={[styles.sheet, { height, transform: [{ translateY }] }]}>
      <View {...pan.panHandlers} style={styles.dragZone}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? '목록 접기' : '목록 펼치기'}
          hitSlop={10}
          onPress={() => onChangeRef.current(!expandedRef.current)}
          style={styles.handleWrap}>
          <View style={styles.handle} />
        </Pressable>
        {header}
      </View>
      <View style={styles.body} {...(expanded ? {} : pan.panHandlers)}>
        <ScrollView
          scrollEnabled={expanded}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomInset }}
          style={styles.scroll}>
          {children}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  // 웹에서는 세로 끌기를 브라우저 스크롤이 가로채지 않게 한다.
  dragZone: { touchAction: 'none', userSelect: 'none' } as object,
  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handle: { width: 56, height: 4, borderRadius: 2, backgroundColor: ScanColors.border },
  body: { flex: 1 },
  scroll: { flex: 1 },
});
