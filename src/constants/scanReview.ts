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

// 화면에 보여줄 수 있는 상태만 "라벨 있음"처럼 짧은 문구 목록으로 만든다.
export function itemStateList(item: Pick<ReviewItem, 'states'>) {
  return item.states
    .map((state) => describeState(state.name, state.value))
    .filter((text): text is string => text != null);
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
  // 인식된 상태 ("라벨 있음" 등). 결과의 근거로 보여준다.
  states: string[];
  // 물건마다 서버가 따로 만든 판단 번호(decisionId)를 가진다. 배출 기록은 이 번호로 저장한다.
  items: { item: ReviewItem; categoryName: string; decisionId: number }[];
  guide: DisposalGuide;
  // 아직 지켜지지 않은 항목의 안내만 모은 "해야 할 일"
  steps: string[];
  // 품목 전체에 대한 짧은 배출 안내
  summary: string;
  // 지역 기준 배출 요일과 시간 (예: "화·목·일", "18:00~24:00")
  days: string;
  time: string;
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
  return lines;
}

// 서버의 finalGuideMessage는 위 단계들을 "/"로 이어 붙이고 배출 일정까지 붙인 긴 문장이라 그대로 보여주면 내용이 겹친다.
// 품목 전체에 대한 짧은 안내(guideMessage)를 쓰고, 그게 비어 있을 때만 finalGuideMessage를 쓴다.
function summaryFor(guide: DisposalGuide) {
  return (guide.guideMessage || guide.finalGuideMessage || '').trim();
}

// 서버는 요일을 "화,목,일"처럼 쉼표로 준다.
function prettyDays(days?: string) {
  return (days ?? '').split(',').map((day) => day.trim()).filter(Boolean).join('·');
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
      states: itemStateList(entry.item),
      items: [{ item: entry.item, categoryName: entry.categoryName, decisionId: entry.guide.decisionId }],
      guide: entry.guide,
      steps: stepsFor(entry.guide),
      summary: summaryFor(entry.guide),
      days: prettyDays(schedule?.dischargeDays),
      time: (schedule?.dischargeTime ?? '').trim(),
    });
  }
  return Array.from(groups.values());
}
