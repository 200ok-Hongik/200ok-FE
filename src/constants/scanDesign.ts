import { Platform } from 'react-native';

import type { ScanObjectSummary } from '@/services/api';

// AI SCAN 디자인(Figma)에서 쓰는 색. 기존 theme.ts의 초록과는 값이 조금 달라서 스캔 흐름 전용으로 둔다.
export const ScanColors = {
  green: '#26B36D',
  greenText: '#22A162',
  greenDark: '#1E8F57',
  greenDeep: '#0D3F26',
  mint: '#E9F7F0',
  mintChip: '#DEF4E9',
  mintSoft: '#BCE7D2',
  orange: '#FF9000',
  orangeSoft: '#FFEED9',
  ink: '#191919',
  ink2: '#393939',
  gray: '#505050',
  grayLight: '#A7A7A6',
  line: '#E5E5E4',
  border: '#C3C3C2',
  chipGray: '#EEEEED',
  tabInk: '#1E1E1E',
} as const;

// 디자인의 카드 그림자: 오프셋 없이 blur 6, 불투명도 25%.
export const cardShadow = Platform.select({
  web: { boxShadow: '0 0 6px rgba(0,0,0,0.25)' },
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
}) as object;

export type ItemGroup = 'plastic' | 'glass' | 'can' | 'paper' | 'vinyl' | 'styrofoam' | 'other';

export type ItemInfo = {
  group: ItemGroup;
  // 카드 윗줄에 작게 보이는 영문 분류. 알려진 품목이 아니면 서버가 준 코드를 그대로 쓴다.
  eyebrow: string;
  // 카드 제목 (예: 플라스틱)
  title: string;
  // 카드/문장에 쓰는 품목 이름 (예: 페트병 (PET))
  detail: string;
  // 재질 선택값 (예: PET)
  material: string;
  // 종류 선택값 (예: 플라스틱 용기)
  kind: string;
};

// 백엔드 itemCode / 카테고리 code를 디자인에 나오는 표기로 바꾼다. 순서가 중요하다. (PAPER_PACK이 PAPER보다 먼저)
const ITEM_RULES: { test: RegExp; info: Omit<ItemInfo, 'eyebrow'> & { eyebrow?: string } }[] = [
  { test: /PET/, info: { group: 'plastic', title: '플라스틱', detail: '페트병 (PET)', material: 'PET', kind: '플라스틱 용기' } },
  { test: /GLASS|유리/, info: { group: 'glass', title: '유리병', detail: '유리 (GLASS)', material: '유리', kind: '유리병' } },
  { test: /CAN|캔/, info: { group: 'can', title: '캔류', detail: '캔 (CAN)', material: '캔', kind: '캔류' } },
  { test: /PAPER[_ ]?PACK|종이팩/, info: { group: 'paper', title: '종이팩', detail: '종이팩 (PAPER PACK)', material: '종이팩', kind: '종이팩' } },
  { test: /PAPER|종이/, info: { group: 'paper', title: '종이류', detail: '종이 (PAPER)', material: '종이', kind: '종이류' } },
  { test: /VINYL|비닐/, info: { group: 'vinyl', title: '비닐류', detail: '비닐 (VINYL)', material: '비닐', kind: '비닐류' } },
  { test: /STYRO|스티로폼/, info: { group: 'styrofoam', title: '스티로폼', detail: '스티로폼 (STYROFOAM)', material: '스티로폼', kind: '스티로폼' } },
  { test: /PLASTIC|플라스틱/, info: { group: 'plastic', title: '플라스틱', detail: '플라스틱 (PLASTIC)', material: '플라스틱', kind: '플라스틱 용기' } },
];

export function describeItem(code?: string | null, name?: string | null): ItemInfo {
  const value = `${code ?? ''} ${name ?? ''}`.toUpperCase();
  for (const rule of ITEM_RULES) {
    if (rule.test.test(value)) {
      return { ...rule.info, eyebrow: rule.info.eyebrow ?? rule.info.group };
    }
  }
  const fallback = name || code || '물건';
  return { group: 'other', eyebrow: (code || 'item').toLowerCase(), title: fallback, detail: fallback, material: fallback, kind: fallback };
}

export type Box = { x: number; y: number; width: number; height: number };

// 백엔드 bbox 단위가 스웨거에 적혀 있지 않아서 값 범위와 결과 모양으로 추정한다.
// 비율(0~1), 사진 픽셀, 0~1000 정규화, 퍼센트(0~100)를 차례로 가정해 보고,
// 사진의 1.5% 이상을 차지하는 "그럴듯한" 첫 후보를 쓴다. (예: 퍼센트 값을 픽셀로 읽으면 왼쪽 위의 점만 한 박스가 된다)
export function normalizeBbox(
  bbox: ScanObjectSummary['bbox'] | undefined,
  imageWidth: number,
  imageHeight: number
): Box | null {
  if (!bbox) return null;
  const { xMin, yMin, xMax, yMax } = bbox;
  if (![xMin, yMin, xMax, yMax].every((value) => Number.isFinite(value)) || xMax <= xMin || yMax <= yMin) return null;

  const hasSize = imageWidth > 0 && imageHeight > 0;
  const candidates: { name: string; divisorX: number; divisorY: number }[] = [
    { name: 'fraction', divisorX: 1, divisorY: 1 },
    ...(hasSize ? [{ name: 'pixel', divisorX: imageWidth, divisorY: imageHeight }] : []),
    { name: 'permille', divisorX: 1000, divisorY: 1000 },
    { name: 'percent', divisorX: 100, divisorY: 100 },
  ];

  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  let best: { box: Box; area: number; name: string } | null = null;
  for (const candidate of candidates) {
    const fx = [xMin / candidate.divisorX, xMax / candidate.divisorX];
    const fy = [yMin / candidate.divisorY, yMax / candidate.divisorY];
    if (Math.max(...fx, ...fy) > 1.01 || Math.min(...fx, ...fy) < -0.01) continue;
    const x = clamp(fx[0]);
    const y = clamp(fy[0]);
    const box = { x, y, width: clamp(fx[1]) - x, height: clamp(fy[1]) - y };
    if (box.width <= 0.01 || box.height <= 0.01) continue;
    const area = box.width * box.height;
    if (area >= 0.015) return box;
    if (!best || area > best.area) best = { box, area, name: candidate.name };
  }
  return best?.box ?? null;
}
