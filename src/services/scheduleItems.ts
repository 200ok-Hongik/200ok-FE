import { getCalendars, getScanHistory, getScanObjects, type ScanObjectSummary } from '@/services/api';

// 오늘 배출 일정이 어떤 물건이었는지 알 수 있게, 그 물건의 품목과 찍은 사진(있다면)을 찾아 준다.
export type ScheduleItemInfo = {
  categoryId: number;
  decisionId: number;
  // 이 일정을 만든 스캔 기록. 오래돼서 못 찾으면 없다.
  scan?: {
    scanId: number;
    objectId: string;
    imageUrl: string;
    scannedAt: string;
    bbox?: ScanObjectSummary['bbox'];
  };
};

// 배출 예정일 전에 스캔한 기록까지 거슬러 올라가 찾는 기간
const LOOKBACK_DAYS = 60;

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 배출 일정(calendarId)과 스캔 기록의 물건은 같은 판단 번호(decisionId)로 이어진다.
// 일정이 가리키는 판단 번호로 스캔 기록을 찾아 사진과 물건 위치를 돌려준다.
// 스캔 기록을 못 찾아도 일정마다 품목 정보는 돌려주므로, 상세 화면에서 품목 안내는 보여줄 수 있다.
export async function getScheduleItemInfos(today: Date): Promise<Record<number, ScheduleItemInfo>> {
  const from = new Date(today);
  from.setDate(from.getDate() - LOOKBACK_DAYS);
  const [calendars, scans] = await Promise.all([
    getCalendars(dateKey(today), dateKey(today)),
    getScanHistory(dateKey(from), dateKey(today)),
  ]);

  const sources = new Map<number, { scanId: number; imageUrl: string; scannedAt: string; objectId: string }>();
  for (const scan of scans) {
    if (!scan.imageUrl) continue;
    for (const item of scan.items) {
      if (item.decisionId != null) {
        sources.set(item.decisionId, { scanId: scan.scanResultId, imageUrl: scan.imageUrl, scannedAt: scan.scannedAt, objectId: item.objectId });
      }
    }
  }

  // 같은 사진에서 나온 물건이 여럿이어도 물건 위치 조회는 사진당 한 번만 한다. 실패해도 사진 전체는 보여준다.
  const objectsByScan = new Map<number, Promise<ScanObjectSummary[]>>();
  const infos: Record<number, ScheduleItemInfo> = {};
  await Promise.all(
    calendars.map(async (calendar) => {
      const info: ScheduleItemInfo = { categoryId: calendar.categoryId, decisionId: calendar.disposalDecisionId };
      const source = sources.get(calendar.disposalDecisionId);
      if (source) {
        if (!objectsByScan.has(source.scanId)) {
          objectsByScan.set(source.scanId, getScanObjects(source.scanId).then((list) => list.objects).catch(() => []));
        }
        const objects = await objectsByScan.get(source.scanId)!;
        info.scan = { ...source, bbox: objects.find((object) => object.objectId === source.objectId)?.bbox };
      }
      infos[calendar.calendarId] = info;
    })
  );
  return infos;
}
