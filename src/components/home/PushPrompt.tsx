import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { enablePush, getPushState, PUSH_STATE_EVENT, type PushState } from '@/services/webPush';

// 알림 시트 맨 위에서 푸시 알림을 켜게 하는 줄. 켤 수 없는 환경(앱·미지원 브라우저·설정 전)에서는 아무것도 그리지 않는다.
export function PushPrompt() {
  const [state, setState] = useState<PushState>('unsupported');
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    // 서버 렌더링 결과와 맞추려고 화면이 뜬 뒤에 상태를 읽는다.
    const refresh = () => setState(getPushState());
    refresh();
    globalThis.window?.addEventListener?.(PUSH_STATE_EVENT, refresh);
    return () => globalThis.window?.removeEventListener?.(PUSH_STATE_EVENT, refresh);
  }, []);

  const handleEnable = async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      setState(await enablePush());
    } finally {
      setIsWorking(false);
    }
  };

  if (state === 'unsupported') return null;

  return (
    <View style={styles.box}>
      {state === 'off' && (
        <>
          <Text style={styles.text}>배출일에 맞춰 알림을 받아 보세요.</Text>
          <Button label="알림 켜기" icon="notifications" loading={isWorking} onPress={handleEnable} style={styles.button} />
        </>
      )}
      {state === 'on' && <Text style={styles.textOn}>이 기기에서 푸시 알림을 받고 있어요.</Text>}
      {state === 'blocked' && <Text style={styles.text}>알림이 차단되어 있어요. 브라우저(또는 기기) 설정에서 SSOK 알림을 허용해 주세요.</Text>}
      {state === 'needs-install' && (
        <Text style={styles.text}>아이폰·아이패드는 홈 화면에 추가한 SSOK에서 알림을 켤 수 있어요. 공유 버튼에서 &apos;홈 화면에 추가&apos;를 눌러 주세요.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: '#F0FAF4', gap: 10 },
  text: { fontSize: 13, lineHeight: 20, color: '#374151' },
  textOn: { fontSize: 13, lineHeight: 20, color: '#176B41', fontWeight: '600' },
  button: { height: 44, borderRadius: 10 },
});
