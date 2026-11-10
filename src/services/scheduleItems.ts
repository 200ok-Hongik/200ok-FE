import { getCalendars, getScanHistory, getScanObjects, type ScanObjectSummary } from '@/services/api';

// 오늘 배출 일정이 어떤 물건이었는지 알 수 있게, 그 물건을 찍은 사진과 위치를 찾아 준다.
export type ScheduleItemInfo = { imageUrl: string; bbox?: ScanObjectSummary['bbox'] };

// 배출 예정일 전에 스캔한 기록까지 거슬러 올라가 찾는 기간
const LOOKBACK_DAYS = 60;

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 배출 일정(calendarId)과 스캔 기록의 물건은 같은 판단 번호(decisionId)로 이어진다.
// 일정이 가리키는 판단 번호로 스캔 기록을 찾아 사진과 물건 위치를 돌려준다. 못 찾은 일정은 결과에 없다.
export async function getScheduleItemInfos(today: Date): Promise<Record<number, ScheduleItemInfo>> {
  const from = new Date(today);
  from.setDate(from.getDate() - LOOKBACK_DAYS);
  const [calendars, scans] = await Promise.all([
    getCalendars(dateKey(today), dateKey(today)),
    getScanHistory(dateKey(from), dateKey(today)),
  ]);

  const sources = new Map<number, { scanId: number; imageUrl: string; objectId: string }>();
  for (const scan of scans) {
    if (!scan.imageUrl) continue;
    for (const item of scan.items) {
      if (item.decisionId != null) sources.set(item.decisionId, { scanId: scan.scanResultId, imageUrl: scan.imageUrl, objectId: item.objectId });
    }
  }

  const matched = calendars.flatMap((calendar) => {
    const source = sources.get(calendar.disposalDecisionId);
    return source ? [{ calendarId: calendar.calendarId, ...source }] : [];
  });

  // 같은 사진에서 나온 물건이 여럿이어도 물건 위치 조회는 사진당 한 번만 한다. 실패해도 사진 전체는 보여준다.
  const objectsByScan = new Map<number, Promise<ScanObjectSummary[]>>();
  const infos: Record<number, ScheduleItemInfo> = {};
  await Promise.all(
    matched.map(async ({ calendarId, scanId, imageUrl, objectId }) => {
      if (!objectsByScan.has(scanId)) {
        objectsByScan.set(scanId, getScanObjects(scanId).then((list) => list.objects).catch(() => []));
      }
      const objects = await objectsByScan.get(scanId)!;
      infos[calendarId] = { imageUrl, bbox: objects.find((object) => object.objectId === objectId)?.bbox };
    })
  );
  return infos;
}
