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

// 상태바 아래에서 헤더가 시작하는 위치. 앱은 노치 높이(최소 44)를 비워 두지만,
// 웹은 브라우저가 이미 상태바 영역을 따로 차지하므로 페이지가 알려주는 안전 영역만 쓴다.
export function statusBarInset(safeAreaTop: number) {
  return Platform.OS === 'web' ? safeAreaTop : Math.max(safeAreaTop, 44);
}

export type ItemGroup = 'plastic' | 'glass' | 'can' | 'paper' | 'vinyl' | 'styrofoam' | 'other';

export type ItemInfo = { group: ItemGroup };

// 백엔드 itemCode / 카테고리 code·이름을 가이드 탭의 분류(아이콘·색)로 묶는다.
// 순서가 중요하다. (PAPER_PACK이 PAPER보다 먼저)
const ITEM_GROUP_RULES: { test: RegExp; group: ItemGroup }[] = [
  { test: /UNKNOWN|인식\s?불가/, group: 'other' },
  { test: /PET/, group: 'plastic' },
  { test: /GLASS|유리/, group: 'glass' },
  { test: /CAN|캔/, group: 'can' },
  { test: /PAPER[_ ]?PACK|종이팩/, group: 'paper' },
  { test: /PAPER|종이/, group: 'paper' },
  { test: /VINYL|비닐/, group: 'vinyl' },
  { test: /STYRO|스티로폼/, group: 'styrofoam' },
  { test: /PLASTIC|플라스틱/, group: 'plastic' },
];

export function describeItem(code?: string | null, name?: string | null): ItemInfo {
  const value = `${code ?? ''} ${name ?? ''}`.toUpperCase();
  return { group: ITEM_GROUP_RULES.find((rule) => rule.test.test(value))?.group ?? 'other' };
}

// 서버 품목 코드의 한글 이름. 서버가 이름을 비우거나 영어로 줘도 화면에는 영어 코드가 나오지 않게 한다.
const KOREAN_NAME_BY_CODE: Record<string, string> = {
  CLEAR_PET_BOTTLE: '무색 페트병',
  PLASTIC: '플라스틱',
  CAN: '캔류',
  GLASS_BOTTLE: '유리병',
  VINYL: '비닐',
  PAPER: '종이',
  PAPER_PACK: '종이팩',
  STYROFOAM: '스티로폼',
};

// 서버가 내려주는 품목 이름을 화면용 이름으로 바꾼다.
// UNKNOWN → 일반쓰레기, 한글 이름은 그대로, 이름이 없거나 영어면 코드로 한글 이름을 찾고, 그것도 없으면 일반쓰레기.
export function categoryDisplayName(code?: string | null, name?: string | null) {
  if (/UNKNOWN|인식\s?불가/.test(`${code ?? ''} ${name ?? ''}`.toUpperCase())) return '일반쓰레기';
  if (name && /[가-힣]/.test(name)) return name;
  return KOREAN_NAME_BY_CODE[(code ?? '').trim().toUpperCase()] ?? '일반쓰레기';
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

// 한 물건을 AI가 전체/뚜껑/빨대처럼 조각내서 여러 개로 인식하는 경우가 있다.
// 같은 품목이면서 이미 남긴 더 큰 물건과 많이 겹치거나, 사진에서 너무 작은 조각은 카드로 보여주지 않는다.
// bbox를 해석할 수 없는 물건은 판단할 수 없으니 그대로 둔다. 결과가 비지 않도록 최소 1개는 남긴다.
const MIN_OBJECT_AREA = 0.02;
const OVERLAP_RATIO = 0.4;

export function pruneObjects(
  objects: ScanObjectSummary[],
  imageWidth: number,
  imageHeight: number
): ScanObjectSummary[] {
  const measured = objects.map((object) => ({
    object,
    box: normalizeBbox(object.bbox, imageWidth, imageHeight),
    code: object.finalResult?.itemCode ?? '',
  }));

  const kept: typeof measured = [];
  const bySize = [...measured].sort(
    (a, b) => (b.box ? b.box.width * b.box.height : 1) - (a.box ? a.box.width * a.box.height : 1)
  );

  for (const candidate of bySize) {
    const { box } = candidate;
    if (!box) {
      kept.push(candidate);
      continue;
    }
    const area = box.width * box.height;
    if (area < MIN_OBJECT_AREA) continue;

    const isPart = kept.some((other) => {
      if (!other.box || other.code !== candidate.code) return false;
      const overlapW = Math.min(box.x + box.width, other.box.x + other.box.width) - Math.max(box.x, other.box.x);
      const overlapH = Math.min(box.y + box.height, other.box.y + other.box.height) - Math.max(box.y, other.box.y);
      if (overlapW <= 0 || overlapH <= 0) return false;
      return (overlapW * overlapH) / area >= OVERLAP_RATIO;
    });
    if (!isPart) kept.push(candidate);
  }

  const keptSet = new Set(kept.map((item) => item.object.objectId));
  const result = objects.filter((object) => keptSet.has(object.objectId));
  return result.length > 0 ? result : objects.slice(0, 1);
}
