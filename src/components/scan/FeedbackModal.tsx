import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { OverlayModal } from '@/components/ui/OverlayModal';
import { Text } from '@/components/ui/Text';
import { ScanColors } from '@/constants/scanDesign';

type Props = {
  visible: boolean;
  loading?: boolean;
  onAnswer: (isAccurate: boolean) => void;
};

const BACK_HEART =
  'M227.689 252.317C237.797 262.425 237.791 278.837 227.689 288.939L198.618 318.01C192.759 323.869 183.254 323.869 177.395 318.01L151.378 291.993L191.06 252.311C201.169 242.203 217.58 242.209 227.683 252.311L227.689 252.317Z';
const GLASS_HEART =
  'M148.488 252.502L148.494 252.495C158.504 242.485 174.757 242.491 184.762 252.495L224.267 292.001L198.428 317.841C192.666 323.602 183.32 323.602 177.558 317.841L148.488 288.77C138.477 278.759 138.483 262.507 148.488 252.502Z';

// 하트 일러스트. 디자인의 가우시안 글로우는 react-native-svg가 blur 필터를 지원하지 않아 방사형 그라데이션으로 대신한다.
function GlowHeart() {
  return (
    <Svg width={220} height={200} viewBox="85 190 210 190">
      <Defs>
        <RadialGradient id="glow" cx="188" cy="283" r="88" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#2CC295" stopOpacity={0.42} />
          <Stop offset="0.55" stopColor="#2CC295" stopOpacity={0.14} />
          <Stop offset="1" stopColor="#2CC295" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="heartA" gradientUnits="userSpaceOnUse" x1="231.189" y1="251.694" x2="168.366" y2="309.521">
          <Stop offset="0" stopColor="#ABF8CB" />
          <Stop offset="1" stopColor="#2CC295" />
        </LinearGradient>
        <LinearGradient id="heartB" gradientUnits="userSpaceOnUse" x1="231.189" y1="251.694" x2="168.366" y2="309.521">
          <Stop offset="0" stopColor="#BCE7D2" />
          <Stop offset="1" stopColor="#26B36D" />
        </LinearGradient>
        <LinearGradient id="glassFill" gradientUnits="userSpaceOnUse" x1="186.787" y1="323.287" x2="203.901" y2="247.493">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.2} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.49} />
        </LinearGradient>
        <LinearGradient id="glassStroke" gradientUnits="userSpaceOnUse" x1="137.146" y1="272.611" x2="212.65" y2="257.979">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Circle cx={188} cy={283} r={88} fill="url(#glow)" />
      <Path d={BACK_HEART} fill="url(#heartA)" />
      <Path d={BACK_HEART} fill="url(#heartB)" />
      <Path d={GLASS_HEART} fill="url(#glassFill)" stroke="url(#glassStroke)" strokeWidth={0.5} />
    </Svg>
  );
}

// 스캔 결과 저장 후 홈에서 뜨는 "AI 인식이 정확했나요?" 피드백 모달
export function FeedbackModal({ visible, loading, onAnswer }: Props) {
  return (
    <OverlayModal visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <GlowHeart />
        <Text style={styles.title}>AI 인식이 정확했나요?</Text>
        <Text style={styles.subtitle}>{'소중한 피드백을 바탕으로\nAI의 정확도를 더욱 높여갈게요.'}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={() => onAnswer(true)}
          style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.pressed]}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>맞았어요</Text>}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={() => onAnswer(false)}
          style={({ pressed }) => [styles.button, styles.buttonSecondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>틀렸어요</Text>
        </Pressable>
      </View>
    </OverlayModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,28,28,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  title: { marginTop: -18, fontSize: 22, lineHeight: 28, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { marginTop: 12, fontSize: 16, lineHeight: 22, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  button: {
    width: 184,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 4px rgba(0,0,0,0.25)',
  },
  buttonPrimary: { marginTop: 20, backgroundColor: ScanColors.green },
  buttonSecondary: { marginTop: 16, backgroundColor: ScanColors.mintChip },
  pressed: { opacity: 0.85 },
  primaryText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  secondaryText: { fontSize: 16, fontWeight: '600', color: ScanColors.ink2 },
});
