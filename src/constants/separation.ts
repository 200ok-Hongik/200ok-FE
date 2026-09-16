const SEPARATION_LABELS: Record<string, string> = {
  '무색 페트병': '뚜껑·라벨 제거',
  '플라스틱류': '라벨·금속 부속품 제거',
  '캔류': '플라스틱 뚜껑·빨대 제거',
  '유리병류': '뚜껑·마개 제거',
  '비닐류': '스티커·이물질 제거',
  '종이류': '테이프·송장·비닐창 제거',
  '종이팩': '빨대·비닐 제거',
  '스티로폼류': '테이프·라벨 제거',
  '일반쓰레기': '분리할 부속품 확인',
};

export function getSeparationLabel(itemType?: string | null) {
  return itemType ? SEPARATION_LABELS[itemType] ?? '부속품 분리' : '구성품 분리';
}
