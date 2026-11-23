// 웹이 아닌 환경(iOS/Android 앱)에는 웹 푸시가 없다. 웹 구현은 webPush.web.ts에 있다.
export type PushState = 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on';
export type ForegroundMessage = { title: string; body: string };

export const PUSH_STATE_EVENT = 'ssok-push-state';

export function getPushState(): PushState {
  return 'unsupported';
}
export async function enablePush(): Promise<PushState> {
  return 'unsupported';
}
export async function syncPushToken(): Promise<void> {}
export async function disablePush(): Promise<void> {}
export function listenForegroundMessages(_callback: (message: ForegroundMessage) => void): () => void {
  return () => {};
}
