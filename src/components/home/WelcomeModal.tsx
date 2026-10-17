import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { OverlayModal } from '@/components/ui/OverlayModal';
import { Text } from '@/components/ui/Text';

// 로그인·지역 설정 직후 홈에서 한 번 뜨는 "오늘은 분리배출 하는 날!" 안내. Figma(iPhone 13 mini) 좌표를 옮겼다.
const BUBBLE =
  'M229.171 270.599H170.579C168.191 270.599 166.264 272.536 166.264 274.913V309.626C166.264 312.014 168.201 313.941 170.579 313.941H177.046V323.554C177.046 326.424 180.51 327.858 182.539 325.829L194.428 313.941H229.171C231.559 313.941 233.486 312.004 233.486 309.626V274.913C233.486 272.525 231.549 270.599 229.171 270.599Z';
const PHONE =
  'M198.692 286.351H150.759C145.655 286.351 141.514 290.491 141.514 295.585V372.963C141.514 378.067 145.655 382.197 150.759 382.197H198.692C203.796 382.197 207.936 378.067 207.936 372.963V295.585C207.936 290.491 203.796 286.351 198.692 286.351ZM194.961 375.556C194.582 375.935 194.049 376.171 193.475 376.171H155.975C154.817 376.171 153.874 375.238 153.874 374.08C153.874 373.506 154.11 372.973 154.489 372.594C154.868 372.215 155.391 371.979 155.975 371.979H193.475C194.634 371.979 195.576 372.922 195.576 374.08C195.576 374.654 195.341 375.187 194.961 375.556Z';
const PHONE_BAR =
  'M195.576 374.08C195.576 374.654 195.34 375.187 194.961 375.556C194.582 375.935 194.049 376.171 193.475 376.171H155.975C154.817 376.171 153.874 375.238 153.874 374.08C153.874 373.506 154.11 372.973 154.489 372.594C154.868 372.215 155.391 371.979 155.975 371.979H193.475C194.633 371.979 195.576 372.922 195.576 374.08Z';

// 말풍선 + 유리 질감 휴대폰 일러스트. 시안의 큰 블러 글로우는 방사형 그라데이션으로 대신한다.
function WelcomeArt() {
  return (
    <Svg width={156} height={150} viewBox="108 252 158 150" fill="none">
      <Defs>
        <RadialGradient id="welcomeGlow" cx="200" cy="300" r="78" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00D890" stopOpacity={0.4} />
          <Stop offset="0.6" stopColor="#00D890" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#00D890" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="welcomeBubble" gradientUnits="userSpaceOnUse" x1="164.471" y1="321.473" x2="230.001" y2="267.432">
          <Stop offset="0" stopColor="#00B1FF" />
          <Stop offset="1" stopColor="#00FF79" />
        </LinearGradient>
        <LinearGradient id="welcomeGlass" gradientUnits="userSpaceOnUse" x1="145.264" y1="376.786" x2="224.875" y2="321.615">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.2} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.49} />
        </LinearGradient>
        <LinearGradient id="welcomeGlassEdge" gradientUnits="userSpaceOnUse" x1="146.203" y1="293.889" x2="223.023" y2="350.811">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Circle cx={200} cy={300} r={78} fill="url(#welcomeGlow)" />
      <Path d={BUBBLE} fill="url(#welcomeBubble)" />
      <Path d={PHONE} fill="url(#welcomeGlass)" stroke="url(#welcomeGlassEdge)" strokeWidth={1.4} />
      <Path d={PHONE_BAR} fill="#FFFFFF" />
    </Svg>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function WelcomeModal({ visible, onClose }: Props) {
  return (
    <OverlayModal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <WelcomeArt />
        <Text style={styles.title}>오늘은 분리배출 하는 날!</Text>
        <Text style={styles.description}>{'버리기 전 AI로 스캔하고,\n올바르게 분리배출해 주세요.'}</Text>
        <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>확인</Text>
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
    paddingBottom: 0,
  },
  title: { marginTop: 2, fontSize: 22, lineHeight: 28, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  description: { marginTop: 10, fontSize: 16, lineHeight: 22, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  button: { marginTop: 20, width: 184, height: 48, borderRadius: 8, backgroundColor: '#26B36D', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
