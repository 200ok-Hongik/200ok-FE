import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { confirmScanResult, getScan, type ScanDetail } from '@/services/api';

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

function inferMaterial(code: string) {
  const upper = code.toUpperCase();
  if (upper.includes('PET')) return 'PET';
  if (upper.includes('GLASS')) return '유리';
  if (upper.includes('CAN') || upper.includes('ALUMINUM')) return '알루미늄';
  if (upper.includes('PAPER')) return '종이';
  return '모르겠어요';
}

export default function ScanCapturedScreen() {
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scanId) return;
    let cancelled = false;
    setIsLoading(true);
    getScan(Number(scanId))
      .then((detail) => !cancelled && setScan(detail))
      .catch((reason) => {
        console.error(reason);
        if (!cancelled) setError('스캔 결과를 불러오지 못했어요.');
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => { cancelled = true; };
  }, [scanId]);

  const handleConfirm = async () => {
    if (!scan) return;
    try {
      setIsConfirming(true);
      await confirmScanResult(scan.scanId, {
        categoryId: scan.category.categoryId,
        states: scan.states.map((state) => ({ checklistId: state.checklistId, statusValue: state.statusValue })),
      });
      router.push({ pathname: '/scan/result', params: { scanId: String(scan.scanId) } });
    } catch (reason) {
      console.error(reason);
      setError('결과를 확정하지 못했어요. 다시 시도해주세요.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) return <SafeAreaView style={[styles.container, styles.centered]}><ActivityIndicator color={Colors.primary} size="large" /></SafeAreaView>;
  if (error || !scan) return <SafeAreaView style={[styles.container, styles.centered]}><Text style={styles.errorText}>{error ?? '스캔 정보를 찾을 수 없어요.'}</Text><Pressable onPress={() => router.back()}><Text style={styles.backText}>카메라로 돌아가기</Text></Pressable></SafeAreaView>;

  const contaminated = stateIsTrue(scan, 'isContaminated');
  const needsSeparation = stateIsTrue(scan, 'hasLabel') || stateIsTrue(scan, 'hasCap');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.photoArea}>
          {scan.imageUrl ? <Image source={{ uri: scan.imageUrl }} style={styles.photoImage} resizeMode="cover" /> : <View style={[styles.photoImage, styles.photoFallback]}><Ionicons name="image-outline" size={44} color="#FFFFFF" /></View>}
          <View style={styles.photoHeader}><Pressable hitSlop={12} onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#FFFFFF" /></Pressable><Text style={styles.logo}>SSOK</Text></View>
        </View>

        <View style={styles.resultPanel}>
          <Text style={styles.resultEyebrow}>AI가 이 물건을</Text>
          <Text style={styles.resultText}><Text style={styles.resultAccent}>{scan.category.name}</Text>으로 인식했어요.</Text>

          <View style={styles.settingsCard}>
            <SettingRow icon="water-outline" label="종류" value={scan.category.name} selectable />
            <SettingRow icon="layers-outline" label="재질" value={inferMaterial(scan.category.code)} selectable />
            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}><Ionicons name="water-outline" size={15} color={Colors.primaryDark} /><Text style={styles.settingLabel}>오염 상태</Text></View>
              <View style={styles.toggle}><View style={[styles.toggleItem, !contaminated && styles.toggleSelected]}><Text style={styles.toggleText}>깨끗함</Text></View><View style={[styles.toggleItem, contaminated && styles.toggleSelected]}><Text style={styles.toggleText}>오염됨</Text></View></View>
            </View>
            <SettingRow icon="refresh-outline" label="구성품 분리" value={needsSeparation ? '라벨, 뚜껑 분리 필요' : '분리 완료'} arrow />
          </View>

          <View style={styles.editNote}><Ionicons name="add-circle" size={15} color={Colors.primaryDark} /><Text style={styles.editNoteText}>인식 결과가 다르다면{`\n`}필요한 항목만 수정해 주세요.</Text></View>
          <View style={styles.infoList}><InfoLine text="AI는 이미지 특징과 지역 기준을 바탕으로 분석합니다. 포장 상태나 재질 혼합 여부에 따라 일부 품목은 정확한 판단이 어려울 수 있습니다." /><InfoLine text="더 정확한 분리배출을 위해 최종 확인을 권장합니다. 사용자의 확인과 피드백은 AI 품질 개선에도 반영됩니다." /></View>
          <Button label="배출 방법 확인하기" loading={isConfirming} onPress={handleConfirm} style={styles.confirmButton} />
        </View>
      </ScrollView>

      <View style={styles.tabBar}>{TABS.map((tab) => <Pressable key={tab.label} style={styles.tabItem} onPress={() => router.replace(tab.route)}><Ionicons name={tab.icon} size={19} color={tab.label === '스캔' ? Colors.primary : '#202725'} /><Text style={[styles.tabLabel, tab.label === '스캔' && styles.tabActive]}>{tab.label}</Text></Pressable>)}</View>
    </SafeAreaView>
  );
}

function SettingRow({ icon, label, value, selectable, arrow }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; selectable?: boolean; arrow?: boolean }) {
  return <View style={styles.settingRow}><View style={styles.settingLabelWrap}><Ionicons name={icon} size={15} color={Colors.primaryDark} /><Text style={styles.settingLabel}>{label}</Text></View><View style={selectable ? styles.selectValue : styles.plainValue}><Text style={styles.settingValueText} numberOfLines={1}>{value}</Text>{(selectable || arrow) && <Ionicons name="chevron-forward" size={14} color="#545B58" />}</View></View>;
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
  settingLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 }, settingLabel: { fontSize: 12, fontWeight: '700', color: Colors.text },
  selectValue: { minWidth: 98, height: 30, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderWidth: 1, borderColor: Colors.border, borderRadius: 5 },
  plainValue: { maxWidth: 170, flexDirection: 'row', alignItems: 'center', gap: 7 }, settingValueText: { flexShrink: 1, fontSize: 11, color: Colors.text },
  toggle: { height: 30, flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, borderRadius: 5, overflow: 'hidden' }, toggleItem: { minWidth: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, toggleSelected: { backgroundColor: '#DDF7EA', borderColor: Colors.primaryDark, borderWidth: 1 }, toggleText: { fontSize: 10, color: Colors.text },
  editNote: { marginTop: 16, padding: 14, borderRadius: 7, backgroundColor: '#E8F8F2', flexDirection: 'row', alignItems: 'center', gap: 12 }, editNoteText: { fontSize: 11, lineHeight: 17, color: Colors.textSecondary },
  infoList: { marginTop: 14, gap: 10 }, infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, infoText: { flex: 1, fontSize: 9, lineHeight: 14, color: Colors.textSecondary },
  confirmButton: { marginTop: 22, height: 46, borderRadius: 6 }, tabBar: { height: 62, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  tabItem: { alignItems: 'center', gap: 3, minWidth: 48 }, tabLabel: { fontSize: 9, color: '#202725' }, tabActive: { color: Colors.primary, fontWeight: '700' },
});
