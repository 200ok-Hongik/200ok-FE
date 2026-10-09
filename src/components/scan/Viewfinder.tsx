import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Box } from '@/constants/scanDesign';

// 디자인의 기본 뷰파인더 크기(252x352). 모서리 곡률·선 굵기·변 길이는 이 크기를 기준으로 비례해서 줄이고 늘린다.
const BASE_WIDTH = 252;
const ARM_X = 94;
const ARM_Y = 102;
const RADIUS = 19;
const STROKE = 2;

type Props = {
  box: Box;
  // 분석 중일 때 박스 안을 훑는 초록 스캔 효과
  scanning?: boolean;
};

export function Viewfinder({ box, scanning }: Props) {
  const { x, y, width, height } = box;
  const scale = width / BASE_WIDTH;
  const stroke = STROKE * scale;
  const inset = stroke / 2;
  const r = RADIUS * scale;
  const ax = Math.min(ARM_X * scale, width / 2 - inset);
  const ay = Math.min(ARM_Y * scale, height / 2 - inset);
  const w = width - inset;
  const h = height - inset;

  const d = [
    `M${inset + ax} ${inset}H${inset + r}A${r} ${r} 0 0 0 ${inset} ${inset + r}V${inset + ay}`,
    `M${w - ax} ${inset}H${w - r}A${r} ${r} 0 0 1 ${w} ${inset + r}V${inset + ay}`,
    `M${inset + ax} ${h}H${inset + r}A${r} ${r} 0 0 1 ${inset} ${h - r}V${h - ay}`,
    `M${w - ax} ${h}H${w - r}A${r} ${r} 0 0 0 ${w} ${h - r}V${h - ay}`,
  ].join('');

  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [opacity, x, y, width, height]);

  return (
    <Animated.View style={[styles.box, { left: x, top: y, width, height, opacity }]}>
      {scanning && <ScanSweep width={width} height={height} radius={r} />}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={d} stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={stroke} fill="none" />
      </Svg>
    </Animated.View>
  );
}

function ScanSweep({ width, height, radius }: { width: number; height: number; radius: number }) {
  const panelHeight = Math.min(155, height * 0.44);
  const travel = Math.max(0, height - panelHeight);
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(offset, { toValue: travel, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(offset, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [offset, travel]);

  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <Animated.View style={{ width, height: panelHeight, transform: [{ translateY: offset }] }}>
        <LinearGradient colors={['rgba(38,179,109,0)', 'rgba(38,179,109,0.6)']} style={StyleSheet.absoluteFill} />
        <View style={styles.sweepLine} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', pointerEvents: 'none' },
  sweepLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: '#FFFFFF' },
});
