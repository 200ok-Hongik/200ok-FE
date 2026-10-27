import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { checkItemStepTitle } from '@/constants/guideSteps';
import { getTrashCategoryGuide, type TrashCategoryGuide } from '@/services/api';

export default function GuideDetailScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const [guide, setGuide] = useState<TrashCategoryGuide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const id = Number(categoryId);
    if (!Number.isFinite(id) || id <= 0) {
      setLoadError(true);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setLoadError(false);
    getTrashCategoryGuide(id)
      .then((data) => {
        if (!cancelled) setGuide(data);
      })
      .catch((error) => {
        console.warn('품목 가이드를 불러오지 못했습니다.', error);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, reloadKey]);

  // 서버의 확인 항목을 표시 순서대로 "무엇을 / 어떻게" 단계로 바꾸고, 마지막에 전체 배출 안내를 붙인다.
  const steps = useMemo(() => {
    if (!guide) return [];
    const items = [...guide.checkItems]
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .filter((item) => !!item.guideMessage)
      .map((item) => ({ key: String(item.checklistId), title: checkItemStepTitle(item.checkItemName), description: item.guideMessage }));
    if (guide.guideMessage) items.push({ key: 'final', title: '배출하기', description: guide.guideMessage });
    return items;
  }, [guide]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={27} color="#17202D" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>{guide?.category.name ?? '배출 가이드'}</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#1EA866" size="large" />
        </View>
      ) : loadError || !guide ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>가이드를 불러오지 못했어요.</Text>
          <Pressable accessibilityRole="button" onPress={() => setReloadKey((key) => key + 1)} style={styles.retryButton}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.titleRow}>
            <Text style={styles.leaf}>🍃</Text>
            <Text style={styles.title}>배출 가이드</Text>
          </View>
          <Text style={styles.subtitle}>아래 순서에 따라 배출하면 재활용률을 높일 수 있어요.</Text>

          <View style={styles.guideCard}>
            {steps.map((step) => (
              <View key={step.key} style={styles.step}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.dot} />
                  <Text style={styles.stepTitle}>{step.title}</Text>
                </View>
                <View style={styles.stepBody}>
                  <View style={styles.line} />
                  <View style={styles.descriptionBox}>
                    <Text style={styles.description}>{step.description}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {!!guide.cautionMessage && (
            <View style={styles.cautionSection}>
              <View style={styles.cautionTitleRow}>
                <Ionicons name="warning" size={19} color="#1EA866" />
                <Text style={styles.cautionTitle}>주의 사항</Text>
              </View>
              <Text style={styles.cautionIntro}>재활용률을 높이기 위해 꼭 확인해주세요.</Text>
              <View style={styles.cautionCopy}>
                <Text style={styles.cautionText}>• {guide.cautionMessage}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button label="정보 저장하기" onPress={() => router.back()} style={styles.saveButton} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  headerTitle: { color: '#17202D', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  scroll: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaf: { fontSize: 18 },
  title: { color: '#1C222B', fontSize: 19, lineHeight: 26, fontWeight: '800' },
  subtitle: { marginTop: 5, color: '#6D727A', fontSize: 12, lineHeight: 18 },
  guideCard: { marginTop: 17, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6, borderWidth: 1, borderColor: '#D7D7D7', borderRadius: 16 },
  step: { marginBottom: 15 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF8A00' },
  stepTitle: { color: '#20242A', fontSize: 14, lineHeight: 20, fontWeight: '800' },
  stepBody: { flexDirection: 'row', marginTop: 8 },
  line: { width: 2, marginLeft: 3, marginRight: 20, backgroundColor: '#FF8A00' },
  descriptionBox: { flex: 1, minHeight: 58, justifyContent: 'center', borderRadius: 9, backgroundColor: '#FFF0DF', paddingHorizontal: 17, paddingVertical: 12 },
  description: { color: '#5F6064', fontSize: 12, lineHeight: 21 },
  cautionSection: { marginTop: 65 },
  cautionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cautionTitle: { color: '#1C222B', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  cautionIntro: { marginTop: 5, color: '#6D727A', fontSize: 12, lineHeight: 18 },
  cautionCopy: { marginTop: 16, borderLeftWidth: 1, borderLeftColor: '#AAB1BC', paddingLeft: 14, gap: 7 },
  cautionText: { color: '#4F555E', fontSize: 13, lineHeight: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  errorText: { color: '#6D727A', fontSize: 14 },
  retryButton: { height: 38, paddingHorizontal: 20, borderRadius: 19, borderWidth: 1, borderColor: '#1EA866', alignItems: 'center', justifyContent: 'center' },
  retryText: { fontSize: 13, fontWeight: '700', color: '#1EA866' },
  footer: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  saveButton: { height: 52, borderRadius: 8 },
});
