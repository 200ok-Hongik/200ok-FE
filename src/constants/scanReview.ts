import { describeState, isStateOn } from '@/constants/scanStates';
import type { DisposalGuide, ScanDetail, ScanObjectSummary } from '@/services/api';

export type ReviewItem = {
  objectId: string;
  // 사진 속 번호 (1부터)
  number: number;
  bbox: ScanObjectSummary['bbox'];
  detail: ScanDetail;
  categoryId: number;
  // checklistId → 사용자가 고른 상태값("true"/"false")
  values: Record<number, string>;
};

export function itemStateText(item: Pick<ReviewItem, 'detail' | 'values'>) {
  return item.detail.states
    .map((state) => describeState(state.checkItemName, item.values[state.checklistId] ?? state.statusValue))
    .filter((text): text is string => text != null)
    .join(' · ');
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
  const states = item.detail.states
    .map((state) => `${state.checkItemName}:${isStateOn(item.values[state.checklistId] ?? state.statusValue)}`)
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
