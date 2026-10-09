import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ICONS, type IconDef } from '@/components/scan/iconPaths';
import { ObjectThumb } from '@/components/scan/ObjectThumb';
import { PathIcon } from '@/components/scan/PathIcon';
import { ScanSheet } from '@/components/scan/ScanSheet';
import { SectionTitle, WarningIcon } from '@/components/scan/SectionTitle';
import { SsokLogo } from '@/components/ui/SsokLogo';
import { Text } from '@/components/ui/Text';
import { cardShadow, describeItem, ScanColors } from '@/constants/scanDesign';
import {
  getDisposalGuide,
  getObjectDisposalGuide,
  getProfile,
  getScanObject,
  getScanObjects,
  getTrashCategories,
  type DisposalGuide,
  type ScanObjectSummary,
  type TrashCategory,
  type UserProfile,
} from '@/services/api';

type Tab = 'report' | 'guide';

type CheckItem = DisposalGuide['checkItems'][number];

// 스캔된 상태 칩. 서버의 checkItemName(예: hasCap)을 디자인의 문구/아이콘으로 바꾼다. 모르는 항목은 이름을 그대로 보여준다.
const STATE_CHIPS: { names: string[]; label: string; icon: IconDef; step: string }[] = [
  { names: ['hascap', 'cap'], label: '뚜껑있음', icon: ICONS.chipCap, step: '뚜껑 제거' },
  { names: ['haslabel', 'label'], label: '라벨있음', icon: ICONS.chipLabel, step: '라벨 제거' },
  { names: ['iscontaminated', 'contaminated'], label: '오염 확인', icon: ICONS.chipDirty, step: '내용물 비우기' },
  { names: ['isempty', 'hascontent', 'hascontents', 'hasliquid', 'hasresidue'], label: '내용물 확인', icon: ICONS.chipEye, step: '내용물 비우기' },
  { names: ['iscompressed', 'iscrushed', 'compressed', 'ispressed'], label: '압착 확인', icon: ICONS.chipEye, step: '압착하기' },
  { names: ['istransparent', 'transparent'], label: '투명 확인', icon: ICONS.chipEye, step: '투명 여부 확인' },
];

function chipFor(item: CheckItem) {
  const normalized = item.checkItemName.toLowerCase().replace(/[^a-z]/g, '');
  return STATE_CHIPS.find((chip) => chip.names.includes(normalized)) ?? null;
}

export default function ScanResultScreen() {
  const { scanId, objectId } = useLocalSearchParams<{ scanId?: string; objectId?: string }>();
  const insets = useSafeAreaInsets();
  const [guide, setGuide] = useState<DisposalGuide | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [bbox, setBbox] = useState<ScanObjectSummary['bbox'] | undefined>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<TrashCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('report');
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (!scanId) return;
    let cancelled = false;

    setIsLoading(true);
    // 다중 객체 결과는 객체별 가이드를, objectId 없이 들어온 경우만 기존 단일 조회를 사용한다.
    (objectId ? getObjectDisposalGuide(Number(scanId), objectId) : getDisposalGuide(Number(scanId)))
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

    // 아래는 화면을 꾸미는 보조 정보라서 실패해도 결과 화면은 그대로 보여준다.
    if (objectId) {
      getScanObject(Number(scanId), objectId)
        .then((detail) => !cancelled && setImageUrl(detail.imageUrl))
        .catch(() => undefined);
      getScanObjects(Number(scanId))
        .then((list) => !cancelled && setBbox(list.objects.find((object) => object.objectId === objectId)?.bbox))
        .catch(() => undefined);
    }
    getProfile()
      .then((data) => !cancelled && setProfile(data))
      .catch(() => undefined);
    getTrashCategories()
      .then((data) => !cancelled && setCategories(data))
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [scanId, objectId]);

  const handleSave = () => {
    router.replace({ pathname: '/(tabs)', params: { feedback: '1', scanId: scanId ?? '' } });
  };

  const headerTop = Math.max(insets.top, 44);
  const header = (
    <View style={{ paddingTop: headerTop }}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" hitSlop={12} onPress={() => router.back()} style={styles.back}>
          <PathIcon icon={ICONS.back} color={ScanColors.ink} />
        </Pressable>
        <SsokLogo width={51} color={ScanColors.green} />
      </View>
      <View style={styles.tabs}>
        {(
          [
            { label: '분석 결과', value: 'report' },
            { label: '배출방법', value: 'guide' },
          ] as const
        ).map((item) => (
          <Pressable key={item.value} accessibilityRole="tab" style={styles.tab} onPress={() => setTab(item.value)}>
            <Text style={[styles.tabText, tab === item.value && styles.tabTextActive]}>{item.label}</Text>
            {tab === item.value && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
        <View style={styles.tabBaseline} />
      </View>
    </View>
  );

  if (isLoading || error || !guide) {
    return (
      <View style={[styles.container, styles.centered]}>
        {error || (!isLoading && !guide) ? (
          <>
            <Text style={styles.errorText}>{error ?? '배출 방법 정보를 찾을 수 없어요.'}</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backText}>돌아가기</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={ScanColors.green} size="large" />
        )}
      </View>
    );
  }

  const info = describeItem(guide.category.code, guide.category.name);
  const confidence = Math.min(1, Math.max(0, guide.category.confidence));
  const confidencePercent = Math.round(confidence * 100);
  const filledSegments = Math.min(12, Math.floor(confidence * 11));
  const region = profile?.region;
  const regionText = region ? `${region.sido} ${region.gugun} ${region.dong} 기준` : '우리 동네 기준';

  return (
    <View style={styles.container}>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: tab === 'report' ? 22 : 29, paddingBottom: Math.max(insets.bottom, 24) + 24 }]}>
        <LinearGradient colors={['#F3F2F2', '#FFFFFF']} style={styles.topShade} />

        {tab === 'report' ? (
          <>
            <SectionTitle title="분석 리포트" subtitle="이미지 분석을 통해 품목을 분류했어요." />
            <View style={[styles.reportCard, cardShadow]}>
              <ObjectThumb uri={imageUrl} bbox={bbox} size={124} style={styles.reportThumb} />
              <View style={styles.reportCopy}>
                <Text style={styles.reportLead}>이 품목은</Text>
                <Text style={styles.reportName} numberOfLines={1}>
                  <Text style={styles.reportAccent}>{info.detail}</Text>
                  <Text style={styles.reportSuffix}> 이에요!</Text>
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>신뢰도 {confidencePercent}%</Text>
                </View>
                <View style={styles.segments}>
                  {Array.from({ length: 12 }).map((_, index) => (
                    <View key={index} style={[styles.segment, index < filledSegments && styles.segmentOn]} />
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.sectionGap}>
              <SectionTitle title="스캔된 상태" subtitle="재활용 가능 수준을 확인해보세요." />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stateRow} style={styles.stateScroll}>
              {guide.checkItems.length === 0 ? (
                <View style={[styles.stateChip, styles.stateChipOk]}>
                  <Text style={[styles.stateChipText, styles.stateChipTextOk]}>확인할 항목이 없어요</Text>
                </View>
              ) : (
                guide.checkItems.map((item) => {
                  const chip = chipFor(item);
                  const needsAction = !item.isSatisfied;
                  const color = needsAction ? ScanColors.ink : ScanColors.gray;
                  return (
                    <View key={item.checklistId} style={[styles.stateChip, !needsAction && styles.stateChipOk]}>
                      <View style={styles.stateIcon}>
                        <PathIcon icon={(chip?.icon ?? ICONS.chipEye) as IconDef} color={color} />
                      </View>
                      <Text style={[styles.stateChipText, !needsAction && styles.stateChipTextOk]}>
                        {chip?.label ?? item.checkItemName}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.thirdGap}>
              <SectionTitle title="배출 방법" subtitle="배출 전 아래 내용을 확인해주세요." />
            </View>
            <View style={[styles.disposalCard, cardShadow]}>
              <View style={styles.disposalHead}>
                <View style={styles.disposalRegion}>
                  <PathIcon icon={ICONS.pin} color={ScanColors.greenDeep} />
                  <Text style={styles.disposalRegionText} numberOfLines={1}>{regionText}</Text>
                </View>
                <Pressable onPress={() => setRulesOpen(true)} hitSlop={8}>
                  <Text style={styles.disposalLink}>지역 규칙 보기</Text>
                </Pressable>
              </View>
              <Text style={styles.schedule}>
                {guide.schedule.dischargeDays}
                {'\n'}
                {guide.schedule.dischargeTime}
              </Text>
              <View style={styles.scheduleLine} />
              <View style={styles.scheduleNote}>
                <PathIcon icon={ICONS.info} color={ScanColors.gray} />
                <Text style={styles.scheduleNoteText}>지역별 배출 일정은 변경될 수 있어요.</Text>
              </View>
              <View style={styles.guideRow}>
                <LinearGradient colors={['rgba(38,179,109,0)', 'rgba(38,179,109,0.6)']} style={styles.guideBar} />
                <Text style={styles.guideText}>{guide.guideMessage}</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <SectionTitle title="배출 가이드" subtitle="아래 순서에 따라 배출하면 재활용률을 높일 수 있어요." />
            <View style={styles.stepsCard}>
              {buildSteps(guide).map((step) => (
                <View key={step.title} style={styles.step}>
                  <View style={styles.stepHead}>
                    <View style={styles.stepDot} />
                    <Text style={styles.stepTitle}>{step.title}</Text>
                  </View>
                  <View style={styles.stepBody}>
                    <LinearGradient colors={[ScanColors.orange, 'rgba(255,225,187,0.4)']} style={styles.stepBar} />
                    <View style={styles.stepBox}>
                      <Text style={styles.stepText}>{step.body}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {!!guide.cautionMessage && (
              <View style={styles.cautionGap}>
                <SectionTitle icon={<WarningIcon />} title="주의 사항" subtitle="재활용률을 높이기 위해 꼭 확인해주세요." />
                <View style={styles.cautionRow}>
                  <LinearGradient colors={['#FFFFFF', '#797986']} style={styles.cautionBar} />
                  <Text style={styles.cautionText}>{guide.cautionMessage}</Text>
                </View>
              </View>
            )}
          </>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          style={({ pressed }) => [styles.saveButton, tab === 'report' ? { marginTop: 45 } : { marginTop: 54 }, pressed && { opacity: 0.85 }]}>
          <Text style={styles.saveText}>정보 저장하기</Text>
        </Pressable>
      </ScrollView>

      <ScanSheet
        visible={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="우리 동네 배출 안내"
        subtitle={`${region?.gugun ?? '우리 동네'}의 재활용품 배출 정보를 확인해보세요`}
        minHeight={537}
        divider>
        <View style={[styles.ruleRow, { height: 71 }]}>
          <Text style={styles.ruleLabel}>배출 요일</Text>
          <Text style={styles.ruleValue}>{guide.schedule.dischargeDays}</Text>
        </View>
        <View style={styles.ruleDivider} />
        <View style={[styles.ruleRow, { height: 79 }]}>
          <Text style={styles.ruleLabel}>배출 시간</Text>
          <Text style={styles.ruleValue}>{guide.schedule.dischargeTime}</Text>
        </View>
        {categories.length > 0 && (
          <>
            <View style={styles.ruleDivider} />
            <Text style={styles.itemsLabel}>배출 가능 품목</Text>
            <View style={styles.itemChips}>
              {categories.map((category) => (
                <View key={category.categoryId} style={styles.itemChip}>
                  <Text style={styles.itemChipText} numberOfLines={1}>{category.name}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScanSheet>
    </View>
  );
}

// 서버가 주는 항목별 안내(checkItems)를 "무엇을 / 어떻게" 단계로 바꾼다. 마지막은 항상 최종 배출 안내.
function buildSteps(guide: DisposalGuide) {
  const steps: { title: string; body: string }[] = [];
  const seen = new Set<string>();
  for (const item of guide.checkItems) {
    if (item.isSatisfied || !item.guideMessage) continue;
    const title = chipFor(item)?.step ?? item.checkItemName;
    if (seen.has(title)) {
      const existing = steps.find((step) => step.title === title);
      if (existing) existing.body += `\n${item.guideMessage}`;
      continue;
    }
    seen.add(title);
    steps.push({ title, body: item.guideMessage });
  }
  steps.push({ title: '배출하기', body: guide.finalGuideMessage || guide.guideMessage });
  return steps;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: ScanColors.gray, textAlign: 'center' },
  backText: { marginTop: 18, color: ScanColors.greenText, fontWeight: '700' },

  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 22 },
  back: { marginRight: 15, height: 32, justifyContent: 'center' },
  tabs: { height: 37, flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingTop: 8 },
  tabText: { fontSize: 14, lineHeight: 16, fontWeight: '500', color: '#000000' },
  tabTextActive: { fontWeight: '700' },
  tabUnderline: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, backgroundColor: ScanColors.ink, zIndex: 2 },
  tabBaseline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.15)', pointerEvents: 'none' },

  scroll: {},
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 22, pointerEvents: 'none' },

  reportCard: {
    marginTop: 13.5,
    marginHorizontal: 16,
    height: 169,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingLeft: 12,
    paddingTop: 24,
  },
  reportThumb: { backgroundColor: '#FFFFFF' },
  reportCopy: { marginLeft: 10, paddingTop: 14, flex: 1, paddingRight: 12 },
  reportLead: { fontSize: 14, lineHeight: 20, color: ScanColors.ink },
  reportName: { marginTop: 3, fontSize: 16, lineHeight: 28, color: ScanColors.ink },
  reportAccent: { fontSize: 22, fontWeight: '700', color: ScanColors.greenText },
  reportSuffix: { fontSize: 16, fontWeight: '500', color: ScanColors.ink },
  badge: {
    marginTop: 11,
    alignSelf: 'flex-start',
    height: 19,
    paddingHorizontal: 10,
    borderRadius: 9.5,
    backgroundColor: ScanColors.greenText,
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, lineHeight: 15, fontWeight: '500', color: '#FFFFFF' },
  segments: { marginTop: 12, flexDirection: 'row', gap: 2 },
  segment: { width: 6, height: 14, borderRadius: 3, backgroundColor: ScanColors.mintSoft },
  segmentOn: { backgroundColor: ScanColors.greenText },

  sectionGap: { marginTop: 16.5 },
  stateScroll: { marginTop: 16, flexGrow: 0 },
  stateRow: { paddingHorizontal: 16, gap: 8 },
  stateChip: {
    height: 40,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 20,
    backgroundColor: ScanColors.orange,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stateChipOk: { backgroundColor: ScanColors.line },
  stateIcon: { width: 20, alignItems: 'center', marginRight: 6 },
  stateChipText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  stateChipTextOk: { color: ScanColors.gray },

  thirdGap: { marginTop: 60 },
  disposalCard: {
    marginTop: 8.6,
    marginHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },
  disposalHead: { height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  disposalRegion: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  disposalRegionText: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: '500', color: ScanColors.greenDeep },
  disposalLink: { fontSize: 12, lineHeight: 16, color: ScanColors.greenDeep, textDecorationLine: 'underline' },
  schedule: { marginTop: 18, paddingLeft: 21, fontSize: 28, lineHeight: 32, fontWeight: '600', color: ScanColors.green },
  scheduleLine: { marginTop: 18, marginHorizontal: 1, height: 1, backgroundColor: 'rgba(38,179,109,0.6)' },
  scheduleNote: { marginTop: 13, height: 20, flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 0 },
  scheduleNoteText: { fontSize: 13, color: 'rgba(80,80,80,0.8)' },
  guideRow: { marginTop: 23, flexDirection: 'row', alignItems: 'stretch' },
  guideBar: { width: 1, marginRight: 16, marginLeft: -4 },
  guideText: { flex: 1, fontSize: 14, lineHeight: 22, color: ScanColors.ink2, paddingTop: 2 },

  stepsCard: {
    marginTop: 16,
    marginHorizontal: 16,
    paddingHorizontal: 15.5,
    paddingTop: 14,
    paddingBottom: 6,
    borderRadius: 15.5,
    borderWidth: 1,
    borderColor: ScanColors.border,
    backgroundColor: '#FFFFFF',
  },
  step: { marginBottom: 9 },
  stepHead: { height: 24, flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 8, height: 8, marginLeft: 0, marginRight: 9, borderRadius: 4, backgroundColor: ScanColors.orange },
  stepTitle: { fontSize: 14, lineHeight: 18, fontWeight: '600', color: ScanColors.ink },
  stepBody: { marginTop: 7, flexDirection: 'row' },
  stepBar: { width: 2, marginRight: 19 },
  stepBox: { flex: 1, minHeight: 54, paddingHorizontal: 17, paddingVertical: 16, borderRadius: 8, backgroundColor: ScanColors.orangeSoft, justifyContent: 'center' },
  stepText: { fontSize: 14, lineHeight: 22, color: ScanColors.ink2 },

  cautionGap: { marginTop: 55 },
  cautionRow: { marginTop: 15, marginHorizontal: 16, flexDirection: 'row', alignItems: 'stretch' },
  cautionBar: { width: 1, marginRight: 16 },
  cautionText: { flex: 1, fontSize: 15, lineHeight: 22, color: ScanColors.ink2 },

  saveButton: { marginHorizontal: 16, height: 48, borderRadius: 8, backgroundColor: ScanColors.green, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  ruleRow: { paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ruleLabel: { fontSize: 14, fontWeight: '600', color: '#000000' },
  ruleValue: { flexShrink: 1, paddingLeft: 12, textAlign: 'right', fontSize: 20, lineHeight: 26, fontWeight: '600', color: ScanColors.greenDark },
  ruleDivider: { height: 1, backgroundColor: ScanColors.line },
  itemsLabel: { marginTop: 11, paddingLeft: 5, fontSize: 12, color: ScanColors.gray },
  itemChips: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, rowGap: 8, paddingBottom: 24 },
  itemChip: { minWidth: 72, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: ScanColors.mintChip, alignItems: 'center', justifyContent: 'center' },
  itemChipText: { fontSize: 13, color: '#000000' },
});
