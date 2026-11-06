import { describeState, isStateOn } from '@/constants/scanStates';
import type { DisposalGuide, ScanDetail, ScanObjectSummary } from '@/services/api';

// 이 값보다 신뢰도가 낮으면 "확인 필요"로 표시한다. (일반쓰레기로 인식된 물건은 신뢰도와 상관없이 확인 필요)
export const LOW_CONFIDENCE = 0.6;

export type ReviewItem = {
  objectId: string;
  // 사진 속 번호 (1부터)
  number: number;
  bbox: ScanObjectSummary['bbox'];
  detail: ScanDetail;
  categoryId: number;
  // checklistId → 사용자가 고른 상태값("true"/"false")
  values: Record<number, string>;
  // 처음부터 확인이 필요했던 물건인지
  suspicious: boolean;
  // 사용자가 수정 시트에서 확인을 마쳤는지
  checked: boolean;
};

// 서버가 0~100(퍼센트)으로 줄 수도 있어서 1보다 크면 100으로 나눈다. 0/없음은 null.
export function toRatio(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(1, value > 1 ? value / 100 : value);
}

export function itemStateText(item: Pick<ReviewItem, 'detail' | 'values'>) {
  return item.detail.states
    .map((state) => describeState(state.checkItemName, item.values[state.checklistId] ?? state.statusValue))
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
