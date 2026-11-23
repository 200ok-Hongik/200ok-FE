import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { listenForegroundMessages, PUSH_STATE_EVENT, type ForegroundMessage } from '@/services/webPush';

// 웹앱이 열려 있을 때 도착한 푸시를 화면 위에 잠깐 띄운다. (이때는 FCM이 시스템 알림을 띄우지 않는다)
// 홈이 최근 알림 목록을 다시 불러올 수 있게 'ssok-push-message' 이벤트도 함께 보낸다.
export const PUSH_MESSAGE_EVENT = 'ssok-push-message';

export function PushForegroundBanner() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<ForegroundMessage | null>(null);
  const [listenKey, setListenKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const restart = () => setListenKey((key) => key + 1);
    window.addEventListener(PUSH_STATE_EVENT, restart);
    return () => window.removeEventListener(PUSH_STATE_EVENT, restart);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const stop = listenForegroundMessages((incoming) => {
      setMessage(incoming);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), 6000);
      window.dispatchEvent(new Event(PUSH_MESSAGE_EVENT));
    });
    return () => {
      stop();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [listenKey]);

  if (!message) return null;
  return (
    <Pressable accessibilityRole="alert" onPress={() => setMessage(null)} style={[styles.banner, { top: insets.top + 8 }]}>
      {!!message.title && <Text style={styles.title}>{message.title}</Text>}
      {!!message.body && <Text style={styles.body}>{message.body}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#176B41',
    boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
  },
  title: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: '#FFFFFF' },
  body: { marginTop: 2, fontSize: 13, lineHeight: 19, color: '#E6F5EC' },
});
