import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TopTabs } from '@/components/ui/TopTabs';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { getDisposalGuide, type DisposalGuide } from '@/services/api';

export default function ScanResultScreen() {
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();
  const [guide, setGuide] = useState<DisposalGuide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState('report');
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (!scanId) return;
    let cancelled = false;

    setIsLoading(true);
    getDisposalGuide(Number(scanId))
      .then((data) => {
        if (!cancelled) setGuide(data);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('배출 방법을 불러오지 못했어요.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scanId]);

  const handleSave = () => {
    router.replace({ pathname: '/(tabs)', params: { feedback: '1', scanId: scanId ?? '' } });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'bottom']}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !guide) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'bottom']}>
        <ScreenHeader title="SSOK" />
        <Text style={styles.errorText}>{error ?? '배출 방법 정보를 찾을 수 없어요.'}</Text>
      </SafeAreaView>
    );
  }

  const confidencePercent = Math.round(guide.category.confidence * 100);
  const filledSegments = Math.round(guide.category.confidence * 10);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="SSOK" />
      <TopTabs
        tabs={[
          { label: '분석 결과', value: 'report' },
          { label: '배출 방법', value: 'guide' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'report' ? (
          <>
            <SectionTitle icon="leaf" title="분석 리포트" subtitle="이미지 분석을 통해 품목을 분류했어요." />

            <View style={styles.reportCard}>
              <View style={styles.reportIcon}>
                <Ionicons name="cube" size={28} color={Colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportTitle}>
                  이 품목은 <Text style={styles.reportAccent}>{guide.category.name}</Text> 이에요!
                </Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceBadgeText}>신뢰도 {confidencePercent}%</Text>
                </View>
                <View style={styles.confidenceBar}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.confidenceSegment, i < filledSegments && styles.confidenceSegmentFilled]}
                    />
                  ))}
                </View>
              </View>
            </View>

            {guide.checkItems.length > 0 && (
              <>
                <SectionTitle icon="sparkles" title="스캔된 상태" subtitle="재활용 가능 수준을 확인해보세요." />
                <View style={styles.stateRow}>
                  {guide.checkItems.map((c) => (
                    <View key={c.checklistId} style={styles.stateChip}>
                      <Ionicons
                        name={c.isSatisfied ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                        size={14}
                        color={Colors.warningText}
                      />
                      <Text style={styles.stateChipText}>{c.checkItemName}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <SectionTitle icon="navigate" title="배출 방법" subtitle="배출 전 아래 내용을 확인해주세요." />
            <View style={styles.disposalCard}>
              <View style={styles.disposalHeaderRow}>
                <View style={styles.disposalLocationRow}>
                  <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.disposalLocationText}>우리 동네 기준</Text>
                </View>
                <Pressable onPress={() => setRulesOpen(true)}>
                  <Text style={styles.disposalLink}>지역 규칙 보기 ›</Text>
                </Pressable>
              </View>
              <Text style={styles.disposalSchedule}>
                {guide.schedule.dischargeDays}
                {'\n'}
                {guide.schedule.dischargeTime}
              </Text>
              <Text style={styles.disposalDesc}>{guide.guideMessage}</Text>
            </View>
          </>
        ) : (
          <>
            <SectionTitle icon="leaf" title="배출 가이드" subtitle="아래 안내에 따라 배출하면 재활용률을 높일 수 있어요." />
            <View style={styles.guideCard}>
              <Text style={styles.guideMainText}>{guide.finalGuideMessage || guide.guideMessage}</Text>
            </View>

            <View style={styles.warningBox}>
              <View style={styles.warningHeaderRow}>
                <Ionicons name="warning" size={15} color={Colors.warningText} />
                <Text style={styles.warningTitle}>주의 사항</Text>
              </View>
              <Text style={styles.warningBody}>{guide.cautionMessage}</Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="정보 저장하기" onPress={handleSave} />
      </View>

      <BottomSheet
        visible={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="우리 동네 배출 안내"
        subtitle="배출 요일과 시간을 확인해보세요">
        <View style={styles.rulesGrid}>
          <RuleItem label="배출 요일" value={guide.schedule.dischargeDays} full />
          <RuleItem label="배출 시간" value={guide.schedule.dischargeTime} full />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionTitleWrap}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={15} color={Colors.primaryDark} />
        <Text style={styles.sectionTitleText}>{title}</Text>
      </View>
      <Text style={styles.sectionSubtitleText}>{subtitle}</Text>
    </View>
  );
}

function RuleItem({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <View style={[styles.ruleItem, full && styles.ruleItemFull]}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <Text style={styles.ruleValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.xl },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xl },
  sectionTitleWrap: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sectionTitleText: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  sectionSubtitleText: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2, marginLeft: 21 },

  reportCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  reportIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  reportAccent: { color: Colors.primaryDark },
  confidenceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    marginTop: Spacing.sm,
  },
  confidenceBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primaryDark },
  confidenceBar: { flexDirection: 'row', gap: 3, marginTop: Spacing.sm },
  confidenceSegment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  confidenceSegmentFilled: { backgroundColor: Colors.primary },

  stateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warningBg,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  stateChipText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.warningText },

  disposalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  disposalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  disposalLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  disposalLocationText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  disposalLink: { fontSize: FontSize.xs, color: Colors.primaryDark, fontWeight: '700' },
  disposalSchedule: {
    marginTop: Spacing.md,
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primaryDark,
    lineHeight: 28,
  },
  disposalDesc: { marginTop: Spacing.md, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  guideCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  guideMainText: { fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },

  warningBox: { marginTop: Spacing.xl, backgroundColor: Colors.backgroundSoft, borderRadius: Radius.lg, padding: Spacing.lg },
  warningHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  warningTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.warningText },
  warningBody: { fontSize: FontSize.sm, color: Colors.text, marginTop: Spacing.sm, lineHeight: 21 },

  footer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },

  rulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  ruleItem: { width: '47%', backgroundColor: Colors.backgroundSoft, borderRadius: Radius.md, padding: Spacing.md },
  ruleItemFull: { width: '100%' },
  ruleLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: '600' },
  ruleValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '700', marginTop: 4, lineHeight: 19 },
});
