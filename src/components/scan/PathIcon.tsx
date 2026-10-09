import Svg, { Path } from 'react-native-svg';

import type { IconDef } from './iconPaths';

type Props = {
  icon: IconDef;
  color: string;
  // 디자인 원본 크기(1단위 = 1px)에 곱하는 배율
  scale?: number;
};

export function PathIcon({ icon, color, scale = 1 }: Props) {
  const [x, y, width, height] = icon.viewBox;

  return (
    <Svg width={width * scale} height={height * scale} viewBox={`${x} ${y} ${width} ${height}`} fill="none">
      {icon.paths.map((path, index) => (
        <Path
          key={index}
          d={path.d}
          fill={path.fill ? color : 'none'}
          fillRule={path.eo ? 'evenodd' : undefined}
          clipRule={path.eo ? 'evenodd' : undefined}
          stroke={path.stroke ? color : 'none'}
          strokeWidth={path.sw}
          strokeLinecap={path.cap}
          strokeLinejoin={path.join}
        />
      ))}
    </Svg>
  );
}
