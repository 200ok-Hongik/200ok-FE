import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ICONS } from '@/components/scan/iconPaths';
import { PathIcon } from '@/components/scan/PathIcon';
import { ScanSheet } from '@/components/scan/ScanSheet';
import { SsokLogo } from '@/components/ui/SsokLogo';
import { Text } from '@/components/ui/Text';
import { isGeneralWasteCode } from '@/constants/generalWaste';
import { ScanColors, statusBarInset } from '@/constants/scanDesign';
import type { ReviewGroup } from '@/constants/scanReview';

type Props = {
  groups: ReviewGroup[];
  itemCount: number;
  // 사용자가 정한 지역. 모르면 빈 문자열. (예: "마포구 서교동")
  region: string;
  // "배출 가능 품목"으로 보여줄 품목 이름들
  acceptedItems: string[];
  isSaving: boolean;
  error: string | null;
  onBack: () => void;
  onSave: () => void;
};

function scheduleText(group: Pick<ReviewGroup, 'days' | 'time'>) {
  return [group.days, group.time].filter(Boolean).join(' · ');
}

// 확인을 마친 물건들을 "같은 품목 + 같은 상태"끼리 묶어 한 번에 보여준다.
export function ReviewResult({ groups, itemCount, region, acceptedItems, isSaving, error, onBack, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [rulesOpen, setRulesOpen] = useState(false);

  // 지역 규칙 시트에는 품목마다 한 줄씩만 보여준다. (같은 품목이 상태 때문에 여러 묶음이어도 일정은 같다)
  const rules = groups.filter((group, index) => groups.findIndex((other) => other.categoryName === group.categoryName) === index);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: statusBarInset(insets.top) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" hitSlop={12} onPress={onBack} style={styles.back}>
          <PathIcon icon={ICONS.back} color={ScanColors.ink} />
        </Pressable>
        <SsokLogo width={51} color={ScanColors.green} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 120 }]}>
        <Text style={styles.title}>{`${groups.length}가지로 나눠서 버려요`}</Text>
        <Text style={styles.subtitle}>{`물건 ${itemCount}개 · 번호는 사진 속 번호예요`}</Text>

        <View style={styles.regionRow}>
          <PathIcon icon={ICONS.pin} color={ScanColors.greenDeep} />
          <Text style={styles.regionText} numberOfLines={1}>{region ? `${region} 기준` : '지역을 정하면 우리 동네 배출 일정이 나와요'}</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setRulesOpen(true)}>
            <Text style={styles.regionLink}>지역 규칙 보기</Text>
          </Pressable>
        </View>

        {groups.map((group) => (
          <View key={group.key} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{group.categoryName}</Text>
              <Text style={styles.cardCount}>{`${group.items.length}개`}</Text>
            </View>
            <View style={styles.chips}>
              {group.items.map(({ item, categoryName }) => (
                <View key={item.objectId} style={styles.chip}>
                  <View style={styles.chipNumber}>
                    <Text style={styles.chipNumberText}>{item.number}</Text>
                  </View>
                  <Text style={styles.chipText} numberOfLines={1}>{categoryName}</Text>
                </View>
              ))}
            </View>

            {/* 일반쓰레기는 실제 배출 요일이 아니라 "지역 기준에 따라 배출" 같은 기본 안내라서, 일정 칸 대신 아래 설명 문장으로 보여준다. */}
            {!isGeneralWasteCode(group.guide.category.code) && !!scheduleText(group) && (
              <View style={styles.schedule}>
                <Text style={styles.scheduleLabel}>{region ? `${region} 배출 일정` : '배출 일정'}</Text>
                <Text style={styles.scheduleValue}>{scheduleText(group)}</Text>
              </View>
            )}

            {group.steps.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>이렇게 준비해 주세요</Text>
                <View style={styles.steps}>
                  {group.steps.map((step, index) => (
                    <View key={`${index}-${step}`} style={styles.stepRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {!!group.summary && (
              <View style={styles.summary}>
                <Text style={styles.summaryText}>{group.summary}</Text>
              </View>
            )}

            {group.states.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>인식된 상태</Text>
                <View style={styles.stateChips}>
                  {group.states.map((text) => (
                    <View key={text} style={styles.stateChip}>
                      <Text style={styles.stateChipText}>{text}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        ))}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={[styles.button, styles.secondary]}>
          <Text style={styles.secondaryText}>다시 확인</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={onSave}
          style={({ pressed }) => [styles.button, styles.primary, pressed && { opacity: 0.85 }]}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>정보 저장하기</Text>}
        </Pressable>
      </View>

      <ScanSheet
        visible={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="우리 동네 배출 안내"
        subtitle={`${region || '우리 동네'}의 재활용품 배출 정보를 확인해보세요`}
        minHeight={437}
        divider>
        {rules.map((group, index) => (
          <View key={group.categoryName}>
            {index > 0 && <View style={styles.ruleDivider} />}
            <View style={styles.ruleRow}>
              <Text style={styles.ruleLabel}>{group.categoryName}</Text>
              <Text style={styles.ruleValue}>{scheduleText(group) || '지역 기준에 따라 배출'}</Text>
            </View>
          </View>
        ))}
        {acceptedItems.length > 0 && (
          <>
            <View style={styles.ruleDivider} />
            <Text style={styles.itemsLabel}>배출 가능 품목</Text>
            <View style={styles.itemChips}>
              {acceptedItems.map((name) => (
                <View key={name} style={styles.itemChip}>
                  <Text style={styles.itemChipText} numberOfLines={1}>{name}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        <Text style={styles.ruleNote}>지역별 배출 일정은 바뀔 수 있어요.</Text>
      </ScanSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 22 },
  back: { marginRight: 15, height: 32, justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700', color: ScanColors.ink },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20, color: ScanColors.gray },

  regionRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  regionText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: ScanColors.ink },
  regionLink: { fontSize: 13, fontWeight: '600', color: ScanColors.greenText },

  card: {
    marginTop: 16,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ScanColors.line,
    backgroundColor: '#FFFFFF',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: ScanColors.greenText },
  cardCount: { fontSize: 13, color: ScanColors.gray },
  chips: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 30,
    paddingLeft: 4,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 15,
    backgroundColor: ScanColors.chipGray,
  },
  chipNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: ScanColors.green, alignItems: 'center', justifyContent: 'center' },
  chipNumberText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  chipText: { maxWidth: 160, fontSize: 13, fontWeight: '600', color: ScanColors.ink },

  // 배출 일정은 카드 위쪽에서 바로 눈에 띄게 한다.
  schedule: { marginTop: 16, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: ScanColors.mint },
  scheduleLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: ScanColors.greenText },
  scheduleValue: { marginTop: 4, fontSize: 18, lineHeight: 24, fontWeight: '700', color: ScanColors.greenDeep },

  sectionLabel: { marginTop: 22, fontSize: 13, lineHeight: 18, fontWeight: '700', color: ScanColors.gray },
  steps: { marginTop: 10, gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: { width: 24, height: 24, marginTop: 1, borderRadius: 12, backgroundColor: ScanColors.mintChip, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: ScanColors.greenDark },
  stepText: { flex: 1, fontSize: 16, lineHeight: 24, color: ScanColors.ink },

  summary: { marginTop: 18, padding: 14, borderRadius: 12, backgroundColor: '#F6F6F5' },
  summaryText: { fontSize: 14, lineHeight: 21, color: ScanColors.ink2 },

  stateChips: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stateChip: { height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: ScanColors.chipGray, alignItems: 'center', justifyContent: 'center' },
  stateChipText: { fontSize: 12, color: ScanColors.gray },

  error: { marginTop: 16, fontSize: 13, color: '#B42318', textAlign: 'center' },

  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: ScanColors.line,
  },
  button: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondary: { flex: 1, borderWidth: 1, borderColor: ScanColors.border, backgroundColor: '#FFFFFF' },
  secondaryText: { fontSize: 15, fontWeight: '600', color: ScanColors.ink },
  primary: { flex: 2, backgroundColor: ScanColors.green },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  ruleRow: { minHeight: 64, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  ruleLabel: { flexShrink: 0, fontSize: 15, fontWeight: '700', color: ScanColors.ink },
  ruleValue: { flexShrink: 1, fontSize: 15, lineHeight: 22, textAlign: 'right', color: ScanColors.ink2 },
  ruleDivider: { height: 1, backgroundColor: ScanColors.line },
  itemsLabel: { marginTop: 20, fontSize: 15, fontWeight: '700', color: ScanColors.ink },
  itemChips: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itemChip: { height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: ScanColors.chipGray, alignItems: 'center', justifyContent: 'center' },
  itemChipText: { fontSize: 13, color: ScanColors.ink },
  ruleNote: { marginTop: 20, marginBottom: 12, fontSize: 12, color: ScanColors.grayLight },
});
