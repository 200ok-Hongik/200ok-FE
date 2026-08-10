import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/theme';
import { getProfile } from '@/services/api';

export default function OAuthCallbackScreen() {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    getProfile()
      .then(() => {
        if (!cancelled) router.replace('/(tabs)');
      })
      .catch((reason) => {
        console.error(reason);
        if (!cancelled) setError('로그인 정보를 확인하지 못했어요.');
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={styles.title}>{error}</Text>
            <Text style={styles.description}>카카오 로그인을 다시 시도해 주세요.</Text>
            <Pressable style={styles.retryButton} onPress={() => setAttempt((value) => value + 1)}>
              <Text style={styles.retryText}>다시 확인</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/')}>
              <Text style={styles.backText}>처음으로 돌아가기</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.title}>카카오 로그인 중이에요</Text>
            <Text style={styles.description}>사용자 정보를 확인하고 있습니다.</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 20, color: Colors.text, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  description: { marginTop: 8, color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },
  retryButton: { marginTop: 24, width: '100%', height: 48, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  backText: { marginTop: 18, color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
});
