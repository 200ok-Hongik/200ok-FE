import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { normalizeBbox } from '@/constants/scanDesign';
import type { ScanObjectSummary } from '@/services/api';

export type BoxItem = {
  id: string;
  number: number;
  bbox: ScanObjectSummary['bbox'];
};

type Props = {
  uri?: string | null;
  naturalSize?: { width: number; height: number };
  items: BoxItem[];
  width: number;
  height: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  radius?: number;
};

const BOX_COLOR = '#26B36D';

// 사진을 영역 안에 맞춰(contain) 보여주고, 인식된 물건마다 윤곽선과 번호를 얹는다.
export function PhotoBoxes({ uri, naturalSize, items, width, height, selectedId, onSelect, radius = 0 }: Props) {
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(naturalSize ?? null);

  useEffect(() => {
    if (naturalSize) {
      setMeasured(naturalSize);
      return;
    }
    if (!uri) return;
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancelled) setMeasured({ width: w, height: h });
      },
      () => undefined
    );
    return () => {
      cancelled = true;
    };
  }, [uri, naturalSize]);

  const rect = useMemo(() => {
    if (!measured) return { x: 0, y: 0, width, height };
    const scale = Math.min(width / measured.width, height / measured.height);
    const w = measured.width * scale;
    const h = measured.height * scale;
    return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
  }, [measured, width, height]);

  // 작은 박스가 큰 박스 위에 오도록 큰 것부터 그린다.
  const boxes = useMemo(() => {
    const list = items
      .map((item) => ({ item, box: normalizeBbox(item.bbox, measured?.width ?? 0, measured?.height ?? 0) }))
      .filter((entry): entry is { item: BoxItem; box: NonNullable<typeof entry.box> } => entry.box != null);
    return list.sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height);
  }, [items, measured]);

  return (
    <View style={[styles.frame, { width, height, borderRadius: radius }]}>
      {uri ? (
        <Image
          source={{ uri }}
          resizeMode="contain"
          style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        />
      ) : null}
      {boxes.map(({ item, box }) => {
        const color = BOX_COLOR;
        const selected = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.number}번 물건`}
            onPress={() => onSelect?.(item.id)}
            style={[
              styles.box,
              {
                left: rect.x + box.x * rect.width,
                top: rect.y + box.y * rect.height,
                width: box.width * rect.width,
                height: box.height * rect.height,
                borderColor: color,
                borderWidth: selected ? 3 : 2,
                backgroundColor: selected ? 'rgba(255,255,255,0.14)' : 'transparent',
              },
            ]}>
            <View style={[styles.badge, { backgroundColor: color }]}>
              <Text style={styles.badgeText}>{item.number}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#0B0F0E' },
  box: { position: 'absolute', borderRadius: 8 },
  badge: {
    position: 'absolute',
    left: 4,
    top: 4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
});
