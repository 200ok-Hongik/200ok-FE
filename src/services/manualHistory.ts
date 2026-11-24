// 기록 탭의 "+"로 직접 추가한 기록. 서버에는 직접 기록을 저장하는 API가 없어서 이 기기에만 남긴다.
// (스캔 기록은 AI 분석으로만 생기고, 배출 일정 저장은 스캔 판단 번호가 필요하다.)
// 웹은 localStorage에 남고, 저장소를 못 쓰는 환경에서는 앱을 다시 켜기 전까지만 기억한다.
export type ManualHistoryEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  itemLabel: string;
  method: string;
  isCompleted: boolean;
};

const KEY = 'ssok.manualHistory';
let memory: ManualHistoryEntry[] = [];

export function loadManualHistory(): ManualHistoryEntry[] {
  try {
    const stored = globalThis.localStorage?.getItem(KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // 저장소 접근이 막혔거나 내용이 깨진 경우
  }
  return memory;
}

export function addManualHistory(entry: ManualHistoryEntry): ManualHistoryEntry[] {
  const next = [...loadManualHistory(), entry];
  memory = next;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // 메모리 값만 사용한다.
  }
  return next;
}
