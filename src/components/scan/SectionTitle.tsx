import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Stop } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { ScanColors } from '@/constants/scanDesign';
import { ICONS } from './iconPaths';
import { PathIcon } from './PathIcon';

// 디자인의 연두색 잎사귀 모양 아이콘 (타원 3개를 60°/128°/180° 회전해 겹친 것)
export function LeafIcon() {
  const petals = [
    { rotate: 60, cx: 12.0, cy: 12.0, rx: 9.27, ry: 3.94 },
    { rotate: 128.273, cx: 11.94, cy: 11.84, rx: 9.27, ry: 3.94 },
    { rotate: 180, cx: 12.39, cy: 11.38, rx: 9.22, ry: 3.95 },
  ];

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Defs>
        {petals.map((petal, index) => (
          <LinearGradient
            key={index}
            id={`leaf${index}`}
            gradientUnits="userSpaceOnUse"
            x1={petal.cx}
            y1={petal.cy - petal.ry}
            x2={petal.cx}
            y2={petal.cy + petal.ry}>
            <Stop offset="0" stopColor="#BCE7D2" />
            <Stop offset="1" stopColor="#1E8F57" />
          </LinearGradient>
        ))}
      </Defs>
      {petals.map((petal, index) => (
        <G key={index} opacity={0.5} transform={`rotate(${petal.rotate} ${petal.cx} ${petal.cy})`}>
          <Ellipse cx={petal.cx} cy={petal.cy} rx={petal.rx} ry={petal.ry} fill={`url(#leaf${index})`} />
        </G>
      ))}
    </Svg>
  );
}

type Props = {
  title: string;
  subtitle: string;
  // 기본은 잎사귀. 주의 사항처럼 다른 아이콘을 쓰는 섹션은 직접 넘긴다.
  icon?: React.ReactNode;
};

export function SectionTitle({ title, subtitle, icon }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.icon}>{icon ?? <LeafIcon />}</View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function WarningIcon() {
  return <PathIcon icon={ICONS.warning} color={ScanColors.greenDark} />;
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', height: 24 },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  title: { fontSize: 20, lineHeight: 24, fontWeight: '700', color: ScanColors.ink },
  subtitle: { marginTop: 6, fontSize: 12, lineHeight: 16, color: ScanColors.gray },
});
