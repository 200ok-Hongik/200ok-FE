import { defaultStateValue, describeState, isStateOn, stateKey } from '@/constants/scanStates';
import type { DisposalGuide, ScanDetail, ScanObjectSummary } from '@/services/api';

// 서버의 상태 항목. checklistId는 품목마다 따로 있어서, 품목이 바뀌면 새 품목의 번호로 다시 만들어야 한다.
export type ReviewState = { checklistId: number; name: string; value: string };

export type ReviewChecklist = { checklistId: number; checkItemName: string }[];

export type ReviewItem = {
  objectId: string;
  // 사진 속 번호 (1부터)
  number: number;
  bbox: ScanObjectSummary['bbox'];
  detail: ScanDetail;
  // 지금 고른 품목과, 그 품목의 상태 항목(사용자가 고친 값 포함)
  categoryId: number;
  states: ReviewState[];
};

export function itemStateText(item: Pick<ReviewItem, 'states'>) {
  return item.states
    .map((state) => describeState(state.name, state.value))
    .filter((text): text is string => text != null)
    .join(' · ');
}

// 품목을 바꿨을 때 새 품목의 상태 항목을 만든다. 이름이 같은 항목(예: 라벨)은 지금 값을 이어 받고,
// 새로 생긴 항목은 처음 값으로 채운다. 새 품목에 없는 항목은 버린다.
export function statesForCategory(checklist: ReviewChecklist, current: ReviewState[]): ReviewState[] {
  const carried = new Map(current.map((state) => [stateKey(state.name), state.value]));
  return checklist.map((entry) => ({
    checklistId: entry.checklistId,
    name: entry.checkItemName,
    value: carried.get(stateKey(entry.checkItemName)) ?? defaultStateValue(entry.checkItemName),
  }));
}

export type ReviewGroup = {
  key: string;
  categoryName: string;
  stateText: string;
  // 물건마다 서버가 따로 만든 판단 번호(decisionId)를 가진다. 배출 기록은 이 번호로 저장한다.
  items: { item: ReviewItem; categoryName: string; decisionId: number }[];
  guide: DisposalGuide;
  steps: string[];
  discharge: string;
};

// 같은 품목이어도 오염 상태나 라벨·뚜껑 같은 상태가 다르면 다른 묶음으로 나눈다.
function groupKey(item: ReviewItem) {
  const states = item.states
    .map((state) => `${stateKey(state.name)}:${isStateOn(state.value)}`)
    .sort()
    .join(',');
  return `${item.categoryId}|${states}`;
}

function stepsFor(guide: DisposalGuide) {
  const lines: string[] = [];
  for (const check of guide.checkItems) {
    if (!check.isSatisfied && check.guideMessage && !lines.includes(check.guideMessage)) lines.push(check.guideMessage);
  }
  const last = guide.finalGuideMessage || guide.guideMessage;
  if (last && !lines.includes(last)) lines.push(last);
  return lines;
}

export function groupResults(entries: { item: ReviewItem; guide: DisposalGuide; categoryName: string }[]): ReviewGroup[] {
  const groups = new Map<string, ReviewGroup>();
  for (const entry of entries) {
    const key = groupKey(entry.item);
    const existing = groups.get(key);
    if (existing) {
      existing.items.push({ item: entry.item, categoryName: entry.categoryName, decisionId: entry.guide.decisionId });
      continue;
    }
    const { schedule } = entry.guide;
    groups.set(key, {
      key,
      categoryName: entry.categoryName,
      stateText: itemStateText(entry.item),
      items: [{ item: entry.item, categoryName: entry.categoryName, decisionId: entry.guide.decisionId }],
      guide: entry.guide,
      steps: stepsFor(entry.guide),
      discharge: [schedule?.dischargeDays, schedule?.dischargeTime].filter(Boolean).join(' · '),
    });
  }
  return Array.from(groups.values());
}
