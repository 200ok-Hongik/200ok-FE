import { registerNotificationDevice, unregisterNotificationDevice } from '@/services/api';

// 웹 푸시(FCM). 권한 요청 → 서비스 워커 등록 → FCM 토큰 발급 → 서버에 기기 등록 순서로 동작한다.
// firebase는 서버 렌더링 때 불리면 안 되어서 쓰는 순간에만 불러온다.
export type PushState = 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on';
export type ForegroundMessage = { title: string; body: string };

const TOKEN_KEY = 'ssok.fcmToken';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};
const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY ?? '';
const isConfigured = !!(config.apiKey && config.projectId && config.messagingSenderId && config.appId && vapidKey);

// 이번에 연 화면에서 이미 서버에 등록한 토큰. 홈에 들어올 때마다 다시 보내지 않으려고 기억한다.
let registeredThisSession: string | null = null;

function readStoredToken(): string | null {
  try {
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null) {
  try {
    if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else globalThis.localStorage?.removeItem(TOKEN_KEY);
  } catch {
    // 저장소를 못 쓰면 이 화면을 닫기 전까지만 기억한다.
  }
}

// 알림을 켜거나 끈 것을 다른 화면(수신 대기 등)이 알 수 있게 한다.
export const PUSH_STATE_EVENT = 'ssok-push-state';
function notifyStateChanged() {
  window.dispatchEvent(new Event(PUSH_STATE_EVENT));
}

function isIOS() {
  const ua = navigator.userAgent;
  // iPadOS는 데스크톱 Safari처럼 보여서 터치 점수로 가려낸다.
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInstalledApp() {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

// 화면에 보여줄 상태. unsupported면 알림 켜기 버튼 자체를 숨긴다.
export function getPushState(): PushState {
  if (typeof window === 'undefined' || !isConfigured) return 'unsupported';
  // iPhone·iPad는 홈 화면에 추가한 웹앱에서만 푸시를 받을 수 있다. 그 전에는 Notification 자체가 없다.
  if (isIOS() && !isInstalledApp()) return 'needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission === 'granted' && readStoredToken()) return 'on';
  return 'off';
}

async function loadMessaging() {
  const [{ getApp, getApps, initializeApp }, messagingModule] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  if (!(await messagingModule.isSupported())) return null;
  const app = getApps().length ? getApp() : initializeApp(config);
  return { messaging: messagingModule.getMessaging(app), ...messagingModule };
}

async function registerServiceWorker() {
  const query = new URLSearchParams(config).toString();
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
}

// 토큰을 발급(이미 있으면 그대로)받아 서버에 등록한다. 토큰이 바뀌었으면 옛 토큰은 서버에서 지운다.
async function registerToken(): Promise<boolean> {
  const firebase = await loadMessaging();
  if (!firebase) return false;
  const registration = await registerServiceWorker();
  const token = await firebase.getToken(firebase.messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return false;

  const previous = readStoredToken();
  if (registeredThisSession !== token) {
    await registerNotificationDevice(token);
    registeredThisSession = token;
  }
  writeStoredToken(token);
  if (previous && previous !== token) unregisterNotificationDevice(previous).catch(() => {});
  return true;
}

// "알림 켜기" 버튼에서 부른다. 권한 요청은 사용자가 누른 직후에만 허용되는 브라우저가 많다.
export async function enablePush(): Promise<PushState> {
  const state = getPushState();
  if (state === 'unsupported' || state === 'needs-install' || state === 'blocked') return state;
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    try {
      await registerToken();
    } catch (error) {
      console.warn('푸시 알림을 켜지 못했습니다.', error);
    }
  }
  notifyStateChanged();
  return getPushState();
}

// 로그인한 뒤 홈에 들어올 때 부른다. 이미 허용된 기기에서만 조용히 토큰을 확인·갱신한다. 권한을 새로 묻지는 않는다.
export async function syncPushToken(): Promise<void> {
  if (getPushState() === 'unsupported' || getPushState() === 'needs-install') return;
  if (Notification.permission !== 'granted') return;
  try {
    await registerToken();
  } catch (error) {
    console.warn('푸시 토큰을 갱신하지 못했습니다.', error);
  }
}

// 로그아웃 직전에 부른다. 로그인 쿠키를 지우기 전에 서버에서 이 기기를 먼저 빼야 한다.
export async function disablePush(): Promise<void> {
  const token = readStoredToken();
  if (!token) return;
  try {
    await unregisterNotificationDevice(token);
  } catch (error) {
    console.warn('푸시 기기 등록 해제에 실패했습니다.', error);
  }
  registeredThisSession = null;
  writeStoredToken(null);
  notifyStateChanged();
}

// 웹앱이 열려 있는 동안 온 알림. 이때는 FCM이 시스템 알림을 띄우지 않으므로 화면에서 직접 보여준다.
export function listenForegroundMessages(callback: (message: ForegroundMessage) => void): () => void {
  let stop: (() => void) | null = null;
  let cancelled = false;
  if (getPushState() !== 'on') return () => {};
  loadMessaging()
    .then((firebase) => {
      if (!firebase || cancelled) return;
      stop = firebase.onMessage(firebase.messaging, (payload) => {
        const title = payload.notification?.title ?? payload.data?.title ?? '';
        const body = payload.notification?.body ?? payload.data?.body ?? '';
        if (title || body) callback({ title, body });
      });
    })
    .catch((error) => console.warn('푸시 알림 수신을 시작하지 못했습니다.', error));
  return () => {
    cancelled = true;
    stop?.();
  };
}
