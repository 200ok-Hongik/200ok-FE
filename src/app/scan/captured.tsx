import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/Text';
import { SsokLogo } from '@/components/ui/SsokLogo';
import { getSeparationDescription } from '@/constants/separation';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import {
  confirmScanObjectResult,
  getScanObject,
  getScanObjects,
  getTrashCategories,
  type ScanDetail,
  type ScanObjectSummary,
  type TrashCategory,
} from '@/services/api';

const ITEM_TYPES = ['무색 페트병', '플라스틱류', '캔류', '유리병류', '비닐류', '종이류', '종이팩', '스티로폼류'] as const;

type ItemType = (typeof ITEM_TYPES)[number];
type PickerKind = 'type' | 'separation' | null;

const TABS = [
  { label: '홈', icon: 'home-outline' as const, route: '/(tabs)' as const },
  { label: '기록', icon: 'time-outline' as const, route: '/(tabs)/history' as const },
  { label: '스캔', icon: 'scan' as const, route: '/scan/camera' as const },
  { label: '가이드', icon: 'bookmark-outline' as const, route: '/(tabs)/guide' as const },
  { label: 'My', icon: 'person-outline' as const, route: '/(tabs)/mypage' as const },
];

function stateIsTrue(scan: ScanDetail, key: string) {
  const state = scan.states.find((item) => item.checkItemName.toLowerCase() === key.toLowerCase());
  return ['true', 'yes', '1', 'y'].includes(String(state?.statusValue).toLowerCase());
}

function matchItemType(category: Pick<TrashCategory, 'code' | 'name'>): ItemType | null {
  const value = `${category.code} ${category.name}`.toUpperCase();
  if (value.includes('PET') && !value.includes('PLASTIC')) return '무색 페트병';
  if (value.includes('VINYL') || value.includes('비닐')) return '비닐류';
  if (value.includes('GLASS') || value.includes('유리')) return '유리병류';
  if (value.includes('CAN') || value.includes('캔')) return '캔류';
  if (value.includes('PAPER_PACK') || value.includes('종이팩')) return '종이팩';
  if (value.includes('PAPER') || value.includes('종이')) return '종이류';
  if (value.includes('STYRO') || value.includes('스티로폼')) return '스티로폼류';
  if (value.includes('PLASTIC') || value.includes('플라스틱')) return '플라스틱류';
  return null;
}

function inferItemType(category: Pick<TrashCategory, 'code' | 'name'>): ItemType {
  return matchItemType(category) ?? '플라스틱류';
}

// 객체 선택 칩에 표시할 이름. 알려진 품목이 아니면 서버가 준 itemCode를 그대로 보여준다.
function objectLabel(object: ScanObjectSummary, index: number) {
  const code = object.finalResult?.itemCode ?? '';
  return `${index + 1}. ${matchItemType({ code, name: code }) ?? (code || '물건')}`;
}

export default function ScanCapturedScreen() {
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [objects, setObjects] = useState<ScanObjectSummary[]>([]);
  const [objectId, setObjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<TrashCategory[]>([]);
  const [itemType, setItemType] = useState<ItemType>('플라스틱류');
  const [contaminated, setContaminated] = useState(false);
  const [separation, setSeparation] = useState<'완료' | '안 함' | '해당 없음'>('완료');
  const [picker, setPicker] = useState<PickerKind>(null);

  // 1) 분석된 객체 목록. 첫 번째 객체를 기본 선택한다.
  useEffect(() => {
    if (!scanId) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getScanObjects(Number(scanId)), getTrashCategories().catch(() => [])])
      .then(([list, categoryList]) => {
        if (cancelled) return;
        console.info('[SSOK AI] 스캔 객체 목록:', list);
        setCategories(categoryList);
        setObjects(list.objects);
        if (list.objects.length === 0) {
          setError('사진에서 인식된 물건이 없어요.');
          setIsLoading(false);
          return;
        }
        setObjectId(list.objects[0].objectId);
      })
      .catch((reason) => {
        console.error(reason);
        if (cancelled) return;
        setError('스캔 결과를 불러오지 못했어요.');
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [scanId]);

  // 2) 선택한 객체의 상세. 객체를 바꾸면 해당 객체 값으로 폼을 다시 채운다.
  useEffect(() => {
    if (!scanId || !objectId) return;
    let cancelled = false;
    setIsDetailLoading(true);
    getScanObject(Number(scanId), objectId)
      .then((detail) => {
        if (cancelled) return;
        setScan(detail);
        setItemType(inferItemType(detail.category));
        setContaminated(stateIsTrue(detail, 'isContaminated'));
        setSeparation(stateIsTrue(detail, 'hasLabel') || stateIsTrue(detail, 'hasCap') ? '안 함' : '완료');
      })
      .catch((reason) => {
        console.error(reason);
        if (!cancelled) setError('선택한 물건의 결과를 불러오지 못했어요.');
      })
      .finally(() => {
        if (cancelled) return;
        setIsDetailLoading(false);
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [scanId, objectId]);

  const handleConfirm = async () => {
    if (!scan || !objectId) return;
    try {
      setIsConfirming(true);
      const selectedCategory = categories.find((category) => inferItemType(category) === itemType);
      const states = scan.states.map((state) => {
        const key = state.checkItemName.toLowerCase();
        if (key === 'iscontaminated') return { checklistId: state.checklistId, statusValue: String(contaminated) };
        if (key === 'haslabel' || key === 'hascap') return { checklistId: state.checklistId, statusValue: String(separation === '안 함') };
        return { checklistId: state.checklistId, statusValue: state.statusValue };
      });
      const confirmedResult = await confirmScanObjectResult(scan.scanId, objectId, {
        categoryId: selectedCategory?.categoryId ?? scan.category.categoryId,
        states,
      });
      console.info('[SSOK AI] 분석 결과 수정 및 확정 응답:', confirmedResult);
      router.push({ pathname: '/scan/result', params: { scanId: String(scan.scanId), objectId } });
    } catch (reason) {
      console.error(reason);
      setError('결과를 확정하지 못했어요. 다시 시도해주세요.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) return <SafeAreaView style={[styles.container, styles.centered]}><ActivityIndicator color={Colors.primary} size="large" /></SafeAreaView>;
  if (error || !scan) return <SafeAreaView style={[styles.container, styles.centered]}><Text style={styles.errorText}>{error ?? '스캔 정보를 찾을 수 없어요.'}</Text><Pressable onPress={() => router.back()}><Text style={styles.backText}>카메라로 돌아가기</Text></Pressable></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.photoArea}>
          {scan.imageUrl ? <Image source={{ uri: scan.imageUrl }} style={styles.photoImage} resizeMode="cover" /> : <View style={[styles.photoImage, styles.photoFallback]}><Ionicons name="image-outline" size={44} color="#FFFFFF" /></View>}
          <View style={styles.photoHeader}><Pressable hitSlop={12} onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#FFFFFF" /></Pressable><SsokLogo width={49} color="#FFFFFF" /></View>
        </View>

        <View style={styles.resultPanel}>
          {objects.length > 1 && (
            <View style={styles.objectSection}>
              <Text style={styles.objectTitle}>사진에서 {objects.length}개의 물건을 찾았어요. 확인할 물건을 선택해 주세요.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.objectRow}>
                {objects.map((object, index) => {
                  const selected = object.objectId === objectId;
                  return (
                    <Pressable key={object.objectId} disabled={isConfirming} onPress={() => setObjectId(object.objectId)} style={[styles.objectChip, selected && styles.objectChipSelected]}>
                      <Text style={[styles.objectChipText, selected && styles.objectChipTextSelected]}>{objectLabel(object, index)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
          {isDetailLoading ? <View style={styles.detailLoading}><ActivityIndicator color={Colors.primary} /></View> : <>
          <Text style={styles.resultEyebrow}>AI가 이 물건을</Text>
          <Text style={styles.resultText}><Text style={styles.resultAccent}>{scan.category.name}</Text>으로 인식했어요.</Text>

          <View style={styles.settingsCard}>
            <SettingRow icon="water-outline" label="종류" value={itemType} selectable onPress={() => setPicker('type')} />
            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}><Ionicons name="water-outline" size={15} color={Colors.primaryDark} /><Text style={styles.settingLabel}>오염 상태</Text></View>
              <View style={styles.toggle}><Pressable onPress={() => setContaminated(false)} style={[styles.toggleItem, !contaminated && styles.toggleSelected]}><Text style={styles.toggleText}>깨끗함</Text></Pressable><Pressable onPress={() => setContaminated(true)} style={[styles.toggleItem, contaminated && styles.toggleSelected]}><Text style={styles.toggleText}>오염됨</Text></Pressable></View>
            </View>
            <SettingRow icon="refresh-outline" label="구성품 분리" description={getSeparationDescription(itemType)} value={separation} arrow onPress={() => setPicker('separation')} />
          </View>

          <View style={styles.editNote}><Ionicons name="add-circle" size={15} color={Colors.primaryDark} /><Text style={styles.editNoteText}>인식 결과가 다르다면{`\n`}필요한 항목만 수정해 주세요.</Text></View>
          <View style={styles.infoList}><InfoLine text="AI는 이미지 특징과 지역 기준을 바탕으로 분석합니다. 포장 상태나 재질 혼합 여부에 따라 일부 품목은 정확한 판단이 어려울 수 있습니다." /><InfoLine text="더 정확한 분리배출을 위해 최종 확인을 권장합니다. 사용자의 확인과 피드백은 AI 품질 개선에도 반영됩니다." /></View>
          <Button label="배출 방법 확인하기" loading={isConfirming} onPress={handleConfirm} style={styles.confirmButton} />
          </>}
        </View>
      </ScrollView>

      <View style={styles.tabBar}>{TABS.map((tab) => <Pressable key={tab.label} style={styles.tabItem} onPress={() => router.replace(tab.route)}><Ionicons name={tab.icon} size={19} color={tab.label === '스캔' ? Colors.primary : '#202725'} /><Text style={[styles.tabLabel, tab.label === '스캔' && styles.tabActive]}>{tab.label}</Text></Pressable>)}</View>
      <BottomSheet visible={picker !== null} onClose={() => setPicker(null)} title={picker === 'type' ? '종류 선택' : '구성품 분리'}>
        {(picker === 'type' ? ITEM_TYPES : ['완료', '안 함', '해당 없음']).map((option) => (
          <Pressable key={option} style={styles.pickerOption} onPress={() => {
            if (picker === 'type') {
              const nextType = option as ItemType;
              setItemType(nextType);
            } else setSeparation(option as '완료' | '안 함' | '해당 없음');
            setPicker(null);
          }}><Text style={styles.pickerOptionText}>{option}</Text></Pressable>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

function SettingRow({ icon, label, description, value, selectable, arrow, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; description?: string; value: string; selectable?: boolean; arrow?: boolean; onPress?: () => void }) {
  return <Pressable disabled={!onPress} onPress={onPress} style={styles.settingRow}><View style={styles.settingLabelWrap}><Ionicons name={icon} size={15} color={Colors.primaryDark} /><View style={styles.settingCopy}><Text style={styles.settingLabel}>{label}</Text>{description && <Text style={styles.settingDescription}>{description}</Text>}</View></View><View style={selectable ? styles.selectValue : styles.plainValue}><Text style={styles.settingValueText} numberOfLines={1}>{value}</Text>{(selectable || arrow) && <Ionicons name="chevron-forward" size={14} color="#545B58" />}</View></Pressable>;
}

function InfoLine({ text }: { text: string }) { return <View style={styles.infoRow}><Ionicons name="information-circle-outline" size={12} color={Colors.textSecondary} /><Text style={styles.infoText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }, centered: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }, scroll: { paddingBottom: 8 },
  errorText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' }, backText: { marginTop: 18, color: Colors.primaryDark, fontWeight: '700' },
  photoArea: { height: 300, backgroundColor: '#15231D' }, photoImage: { width: '100%', height: '100%' }, photoFallback: { alignItems: 'center', justifyContent: 'center' },
  photoHeader: { position: 'absolute', top: 18, left: 18, flexDirection: 'row', alignItems: 'center', gap: 8 }, logo: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  resultPanel: { marginTop: -18, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 14 },
  resultEyebrow: { textAlign: 'center', fontSize: 12, color: Colors.text }, resultText: { marginTop: 4, textAlign: 'center', fontSize: 15, fontWeight: '600', color: Colors.text }, resultAccent: { color: Colors.primaryDark, fontWeight: '800' },
  settingsCard: { marginTop: 18, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, overflow: 'hidden' },
  settingRow: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF' },
  settingLabelWrap: { flex: 1, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }, settingCopy: { flex: 1 }, settingLabel: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: Colors.text }, settingDescription: { marginTop: 2, fontSize: 8, lineHeight: 11, color: Colors.textSecondary },
  selectValue: { minWidth: 98, height: 30, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderWidth: 1, borderColor: Colors.border, borderRadius: 5 },
  plainValue: { maxWidth: 170, flexDirection: 'row', alignItems: 'center', gap: 7 }, settingValueText: { flexShrink: 1, fontSize: 11, color: Colors.text },
  toggle: { height: 30, flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, borderRadius: 5, overflow: 'hidden' }, toggleItem: { minWidth: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, toggleSelected: { backgroundColor: '#DDF7EA', borderColor: Colors.primaryDark, borderWidth: 1 }, toggleText: { fontSize: 10, color: Colors.text },
  editNote: { marginTop: 16, padding: 14, borderRadius: 7, backgroundColor: '#E8F8F2', flexDirection: 'row', alignItems: 'center', gap: 12 }, editNoteText: { fontSize: 11, lineHeight: 17, color: Colors.textSecondary },
  infoList: { marginTop: 14, gap: 10 }, infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, infoText: { flex: 1, fontSize: 9, lineHeight: 14, color: Colors.textSecondary },
  confirmButton: { marginTop: 22, height: 46, borderRadius: 6 }, tabBar: { height: 62, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  tabItem: { alignItems: 'center', gap: 3, minWidth: 48 }, tabLabel: { fontSize: 9, color: '#202725' }, tabActive: { color: Colors.primary, fontWeight: '700' },
  objectSection: { marginBottom: 18 }, objectTitle: { fontSize: 12, fontWeight: '700', color: Colors.text }, objectRow: { gap: 8, paddingTop: 10 },
  objectChip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, objectChipSelected: { borderColor: Colors.primaryDark, backgroundColor: '#DDF7EA' },
  objectChipText: { fontSize: 12, color: Colors.textSecondary }, objectChipTextSelected: { color: Colors.primaryDark, fontWeight: '700' }, detailLoading: { height: 220, alignItems: 'center', justifyContent: 'center' },
  pickerOption: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: Colors.border }, pickerOptionText: { fontSize: 15, color: Colors.text },
});
