// 서버 가이드의 확인 항목 이름(checkItemName)을 "배출 순서" 제목으로 바꾼다. 모르는 항목은 이름을 그대로 보여준다.
const STEP_TITLES: Record<string, string> = {
  isTransparent: '투명 여부 확인',
  hasLabel: '라벨 제거',
  hasCap: '뚜껑 분리',
  hasStraw: '빨대 분리',
  hasTape: '테이프·부착물 제거',
  isEmpty: '내용물 비우기',
  isContaminated: '이물질 제거',
  isWet: '물기 말리기',
  isCrushed: '압착하기',
  isCompressed: '압착하기',
  isFlattened: '펼쳐서 부피 줄이기',
  isBroken: '깨진 유리 처리',
};

export function checkItemStepTitle(checkItemName: string) {
  return STEP_TITLES[checkItemName] ?? checkItemName;
}
