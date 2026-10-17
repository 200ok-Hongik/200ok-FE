// 스웨거의 알림 응답에는 읽음 표시가 없어서, "마지막으로 확인한 알림 번호"를 이 기기에 기억해 새 알림 여부를 가린다.
// 웹은 localStorage에 남고, 저장소를 못 쓰는 환경에서는 앱을 다시 켜기 전까지만 기억한다.
const KEY = 'ssok.lastSeenNotificationId';
let memory = 0;

export function getLastSeenNotificationId(): number {
  try {
    const stored = globalThis.localStorage?.getItem(KEY);
    if (stored) return Number(stored) || 0;
  } catch {
    // 저장소 접근이 막힌 환경(사생활 보호 모드 등)
  }
  return memory;
}

export function setLastSeenNotificationId(id: number) {
  memory = id;
  try {
    globalThis.localStorage?.setItem(KEY, String(id));
  } catch {
    // 메모리 값만 사용한다.
  }
}
