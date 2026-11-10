import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { normalizeBbox } from '@/constants/scanDesign';
import type { ScanObjectSummary } from '@/services/api';

type Props = {
  uri?: string | null;
  bbox?: ScanObjectSummary['bbox'];
  size: number;
  style?: ViewStyle;
  // 사진을 이미 알고 있으면 Image.getSize를 다시 부르지 않는다.
  naturalSize?: { width: number; height: number };
  // tight: 물건 영역만 꽉 차게(주변이 안 보임), context: 물건 주변까지 정사각형으로 여유 있게.
  // 키가 크거나 납작한 물건을 tight로 자르면 가느다란 조각만 남아서 어색해 보인다.
  mode?: 'tight' | 'context';
};

// context 모드에서 물건 주변을 얼마나 더 보여줄지(물건의 긴 변 대비), 그리고 사진 짧은 변 대비 최소 크기
const CONTEXT_MARGIN = 1.45;
const CONTEXT_MIN_SIDE = 0.28;

// 원본 사진에서 인식된 물건 영역만 잘라 보여주는 썸네일. 서버가 누끼 이미지를 주지 않아서
// 사진을 bbox 기준으로 확대/이동해 같은 모양을 만든다. bbox를 해석할 수 없으면 사진 전체를 보여준다.
export function ObjectThumb({ uri, bbox, size, style, naturalSize, mode = 'tight' }: Props) {
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(naturalSize ?? null);

  useEffect(() => {
    if (naturalSize) {
      setNatural(naturalSize);
      return;
    }
    if (!uri) return;
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (!cancelled) setNatural({ width, height });
      },
      () => undefined
    );
    return () => {
      cancelled = true;
    };
  }, [uri, naturalSize]);

  if (!uri) {
    return (
      <View style={[styles.frame, styles.empty, { width: size, height: size }, style]}>
        <Ionicons name="image-outline" size={size * 0.4} color="#A7A7A6" />
      </View>
    );
  }

  const box = natural ? normalizeBbox(bbox, natural.width, natural.height) : null;
  if (natural && box && mode === 'context') {
    // 물건 가운데를 중심으로 정사각형 창을 잡는다. 사진 가장자리에 걸리면 창을 안쪽으로 밀어 넣는다.
    const shortSide = Math.min(natural.width, natural.height);
    const objectSide = Math.max(box.width * natural.width, box.height * natural.height) * CONTEXT_MARGIN;
    const side = Math.min(Math.max(objectSide, shortSide * CONTEXT_MIN_SIDE), shortSide);
    const centerX = (box.x + box.width / 2) * natural.width;
    const centerY = (box.y + box.height / 2) * natural.height;
    const left = Math.min(Math.max(centerX - side / 2, 0), natural.width - side);
    const top = Math.min(Math.max(centerY - side / 2, 0), natural.height - side);
    const scale = size / side;
    return (
      <View style={[styles.frame, { width: size, height: size }, style]}>
        <Image
          source={{ uri }}
          resizeMode="stretch"
          style={{ position: 'absolute', width: natural.width * scale, height: natural.height * scale, left: -left * scale, top: -top * scale }}
        />
      </View>
    );
  }

  if (natural && box) {
    // bbox 영역만 정사각형 썸네일 안에 꽉 차도록(긴 변 기준, 약간의 여백 포함) 배율을 정하고,
    // 주변에 같이 찍힌 물건이 보이지 않게 bbox 크기의 창으로 잘라낸다.
    const cropW = box.width * natural.width;
    const cropH = box.height * natural.height;
    const scale = (size * 0.9) / Math.max(cropW, cropH);
    const imageW = natural.width * scale;
    const imageH = natural.height * scale;
    const windowW = cropW * scale;
    const windowH = cropH * scale;
    return (
      <View style={[styles.frame, { width: size, height: size }, style]}>
        <View
          style={{
            position: 'absolute',
            overflow: 'hidden',
            width: windowW,
            height: windowH,
            left: (size - windowW) / 2,
            top: (size - windowH) / 2,
          }}>
          <Image
            source={{ uri }}
            resizeMode="stretch"
            style={{ position: 'absolute', width: imageW, height: imageH, left: -box.x * imageW, top: -box.y * imageH }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.frame, { width: size, height: size }, style]}>
      <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderRadius: 8, backgroundColor: '#F5F5F3' },
  empty: { alignItems: 'center', justifyContent: 'center' },
});
