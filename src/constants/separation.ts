const SEPARATION_DESCRIPTIONS: Record<string, string> = {
  '무색 페트병': '뚜껑과 라벨을 제거해 주세요',
  '플라스틱류': '라벨과 금속 부속품을 제거해 주세요',
  '캔류': '분리할 부속품이 없다면 ‘해당 없음’을 선택해 주세요',
  '유리병류': '뚜껑과 마개를 제거해 주세요',
  '비닐류': '스티커와 이물질을 제거해 주세요',
  '종이류': '테이프, 송장, 비닐창을 제거해 주세요',
  '종이팩': '빨대와 비닐을 제거해 주세요',
  '스티로폼류': '테이프와 라벨을 제거해 주세요',
  '일반쓰레기': '분리할 수 있는 부속품을 확인해 주세요',
};

export function getSeparationDescription(itemType?: string | null) {
  return itemType ? SEPARATION_DESCRIPTIONS[itemType] ?? '분리할 부속품을 확인해 주세요' : '종류를 먼저 선택해 주세요';
}
