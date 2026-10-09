import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ICONS, type IconDef } from '@/components/scan/iconPaths';
import { PathIcon } from '@/components/scan/PathIcon';
import { ScanSheet } from '@/components/scan/ScanSheet';
import { ScanTabBar, useScanTabBarHeight } from '@/components/scan/ScanTabBar';
import { SsokLogo } from '@/components/ui/SsokLogo';
import { Text } from '@/components/ui/Text';
import { cardShadow, describeItem, ScanColors } from '@/constants/scanDesign';
import {
  confirmScanObjectResult,
  getScanObject,
  getProfile,
  getScanObjects,
  getTrashCategories,
  type ChecklistItem,
  type ScanDetail,
  type TrashCategory,
} from '@/services/api';
import { getScanPhoto } from '@/services/scanPhotoStore';

// 디자인(375x812)은 사진이 476으로 길지만, 실제 기기에선 화면 높이의 40% 정도로 줄여 아래 폼이 더 많이 보이게 한다.
const PHOTO_HEIGHT_RATIO = 0.4;
const MAX_FRAME_HEIGHT = 812;

// 구성품 분리 시트의 칩. 서버 checkItemName이 정확히 무엇인지는 응답을 봐야 알 수 있어서 흔한 이름들을 함께 매칭한다.
const COMPONENT_CHIPS = [
  { key: 'transparent', label: '투명 여부', names: ['istransparent', 'transparent'] },
  { key: 'label', label: '라벨 유무', names: ['haslabel', 'label'] },
  { key: 'content', label: '내용물 비움 여부', names: ['isempty', 'hascontent', 'hascontents', 'hasliquid', 'hasresidue'] },
  { key: 'dirty', label: '오염 여부', names: ['iscontaminated', 'contaminated'] },
  { key: 'pressed', label: '압착 여부', names: ['iscompressed', 'iscrushed', 'compressed', 'ispressed'] },
  { key: 'cap', label: '뚜껑 유무', names: ['hascap', 'cap'] },
] as const;

type ChipKey = (typeof COMPONENT_CHIPS)[number]['key'];
type Flags = Record<ChipKey, boolean>;
type Picker = 'kind' | 'material' | 'component' | null;

// 분리 안내 문구에 들어가는 칩 (선택돼 있으면 "분리 필요")
const SEPARATION_KEYS: ChipKey[] = ['label', 'cap'];
const SEPARATION_NAMES: Record<string, string> = { label: '라벨', cap: '뚜껑' };

const FALLBACK_KINDS = ['플라스틱 용기', '유리병', '캔류', '종이류', '종이팩', '비닐류', '스티로폼'];

function chipKeyFor(name: string): ChipKey | null {
  const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
  const chip = COMPONENT_CHIPS.find((candidate) => (candidate.names as readonly string[]).includes(normalized));
  return chip?.key ?? null;
}

function isTrue(value: unknown) {
  return ['true', 'yes', '1', 'y'].includes(String(value).toLowerCase());
}

function flagsFromStates(states: ChecklistItem[]): Flags {
  const flags = Object.fromEntries(COMPONENT_CHIPS.map((chip) => [chip.key, false])) as Flags;
  for (const state of states) {
    const key = chipKeyFor(state.checkItemName);
    if (key) flags[key] = isTrue(state.statusValue);
  }
  return flags;
}

// "페트병 (PET)" + "으로" / "유리 (GLASS)" + "로" — 괄호 설명은 빼고 받침을 본다.
function withParticle(text: string) {
  const bare = text.replace(/\s*\([^)]*\)\s*$/, '');
  const last = bare.charCodeAt(bare.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) {
    const finalConsonant = (last - 0xac00) % 28;
    return finalConsonant === 0 || finalConsonant === 8 ? '로' : '으로';
  }
  return '으로';
}

export default function ScanCapturedScreen() {
  const { scanId, objectId: objectIdParam } = useLocalSearchParams<{ scanId?: string; objectId?: string }>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useScanTabBarHeight();
  const { height: windowHeight } = useWindowDimensions();
  const photoHeight = Math.round(Math.min(windowHeight, MAX_FRAME_HEIGHT) * PHOTO_HEIGHT_RATIO);
  const [localPhotoFailed, setLocalPhotoFailed] = useState(false);

  const [objectId, setObjectId] = useState<string | null>(objectIdParam ?? null);
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [categories, setCategories] = useState<TrashCategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [flags, setFlags] = useState<Flags | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [gugun, setGugun] = useState<string | null>(null);

  // 시트 부제목에 쓰는 사용자 지역(구). 못 불러와도 화면은 그대로 동작한다.
  useEffect(() => {
    getProfile()
      .then((profile) => setGugun(profile.region?.gugun ?? null))
      .catch(() => undefined);
  }, []);

  // objectId 없이 들어오면(예: 이전 링크) 첫 번째 물건을 사용한다.
  useEffect(() => {
    if (!scanId || objectId) return;
    let cancelled = false;
    getScanObjects(Number(scanId))
      .then((list) => {
        if (cancelled) return;
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
    return () => {
      cancelled = true;
    };
  }, [scanId, objectId]);

  useEffect(() => {
    if (!scanId || !objectId) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getScanObject(Number(scanId), objectId), getTrashCategories().catch(() => [] as TrashCategory[])])
      .then(([detail, categoryList]) => {
        if (cancelled) return;
        console.info('[SSOK AI] 선택한 물건 상세:', detail);
        setScan(detail);
        setCategories(categoryList);
        setCategoryId(detail.category.categoryId);
        setFlags(flagsFromStates(detail.states));
        const unmatched = detail.states.filter((state) => !chipKeyFor(state.checkItemName)).map((state) => state.checkItemName);
        if (unmatched.length > 0) console.info('[SSOK AI] 구성품 칩과 연결되지 않은 상태 항목:', unmatched);
      })
      .catch((reason) => {
        console.error(reason);
        if (!cancelled) setError('선택한 물건의 결과를 불러오지 못했어요.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scanId, objectId]);

  const selectedCategory = useMemo<Pick<TrashCategory, 'categoryId' | 'code' | 'name'> | null>(() => {
    if (!scan) return null;
    return categories.find((category) => category.categoryId === categoryId) ?? scan.category;
  }, [categories, categoryId, scan]);

  const info = describeItem(selectedCategory?.code, selectedCategory?.name);

  const kindOptions = useMemo(() => {
    if (categories.length === 0) return FALLBACK_KINDS;
    return Array.from(new Set(categories.map((category) => describeItem(category.code, category.name).kind)));
  }, [categories]);

  const materialOptions = useMemo(
    () => categories.filter((category) => describeItem(category.code, category.name).kind === info.kind),
    [categories, info.kind]
  );

  const handleSelectKind = (kind: string) => {
    const next = categories.find((category) => describeItem(category.code, category.name).kind === kind);
    if (next) setCategoryId(next.categoryId);
    setPicker(null);
  };

  const toggleFlag = (key: ChipKey) => setFlags((current) => (current ? { ...current, [key]: !current[key] } : current));

  const handleConfirm = async () => {
    if (!scan || !objectId || !flags) return;
    try {
      setIsConfirming(true);
      const states = scan.states.map((state) => {
        const key = chipKeyFor(state.checkItemName);
        return { checklistId: state.checklistId, statusValue: key ? String(flags[key]) : state.statusValue };
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

  const header = (
    <View style={[styles.header, { top: Math.max(insets.top, 44) }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" hitSlop={12} onPress={() => router.back()} style={styles.back}>
        <PathIcon icon={ICONS.back} color="#FBFBFB" />
      </Pressable>
      <SsokLogo width={51} color="#FBFBFB" />
    </View>
  );

  if (isLoading || error || !scan || !flags) {
    return (
      <View style={[styles.container, styles.centered]}>
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backText}>카메라로 돌아가기</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={ScanColors.green} size="large" />
        )}
      </View>
    );
  }

  // 방금 찍은 사진이 있으면 그걸, 없으면(새로고침 등) 서버 이미지를 보여준다.
  const localPhoto = getScanPhoto(scanId);
  const photoUri = !localPhotoFailed && localPhoto ? localPhoto.uri : scan.imageUrl;

  const separation = SEPARATION_KEYS.filter((key) => flags[key]).map((key) => SEPARATION_NAMES[key]);
  const separationText = separation.length > 0 ? `${separation.join(', ')} 분리 필요` : '분리 필요 없음';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarHeight + 30 }}>
        <View style={[styles.photoWrap, cardShadow, { height: photoHeight }]}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.photo}
              resizeMode="cover"
              onError={() => localPhoto && setLocalPhotoFailed(true)}
            />
          ) : (
            <View style={[styles.photo, { backgroundColor: '#15231D' }]} />
          )}
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']} style={styles.photoShade} />
        </View>

        <Text style={styles.eyebrow}>AI가 이 물건을</Text>
        <Text style={styles.result}>
          <Text style={styles.resultAccent}>{info.detail}</Text>
          {withParticle(info.detail)} 인식했어요.
        </Text>

        {(picker === 'kind' || picker === 'material') && (
          <Pressable accessibilityLabel="목록 닫기" style={styles.dropdownBackdrop} onPress={() => setPicker(null)} />
        )}
        <View style={[styles.card, cardShadow, (picker === 'kind' || picker === 'material') && styles.cardRaised]}>
          <View style={[styles.row, styles.rowKind]}>
            <RowLabel icon={ICONS.rowType} label="종류" />
            <SelectBox
              value={info.kind}
              open={picker === 'kind'}
              onPress={() => setPicker(picker === 'kind' ? null : 'kind')}
              options={kindOptions.map((kind) => ({ key: kind, label: kind, selected: kind === info.kind, onSelect: () => handleSelectKind(kind) }))}
            />
          </View>
          <View style={[styles.row, styles.rowMaterial]}>
            <RowLabel icon={ICONS.rowMaterial} label="재질" />
            <SelectBox
              value={info.material}
              open={picker === 'material'}
              onPress={() => setPicker(picker === 'material' ? null : 'material')}
              options={(materialOptions.length > 0 ? materialOptions : []).map((category) => {
                const label = describeItem(category.code, category.name).material;
                return {
                  key: String(category.categoryId),
                  label,
                  selected: category.categoryId === selectedCategory?.categoryId,
                  onSelect: () => {
                    setCategoryId(category.categoryId);
                    setPicker(null);
                  },
                };
              })}
            />
          </View>
          <View style={styles.row}>
            <RowLabel icon={ICONS.rowDrop} label="오염 상태" />
            <View style={styles.toggle}>
              <Pressable onPress={() => setFlags({ ...flags, dirty: false })} style={[styles.toggleItem, !flags.dirty && styles.toggleOn]}>
                <Text style={styles.toggleText}>깨끗함</Text>
              </Pressable>
              <Pressable onPress={() => setFlags({ ...flags, dirty: true })} style={[styles.toggleItem, flags.dirty && styles.toggleOn]}>
                <Text style={styles.toggleText}>오염됨</Text>
              </Pressable>
            </View>
          </View>
          <Pressable style={[styles.row, styles.rowLast]} onPress={() => setPicker('component')}>
            <RowLabel icon={ICONS.rowRecycle} label="구성품 분리" />
            <View style={styles.rowValue}>
              <Text style={styles.rowValueText}>{separationText}</Text>
              <PathIcon icon={ICONS.chevronRight} color={ScanColors.gray} />
            </View>
          </Pressable>
        </View>

        <View style={styles.note}>
          <PathIcon icon={ICONS.plus} color={ScanColors.green} />
          <Text style={styles.noteText}>{`인식 결과가 다르다면\n필요한 항목만 수정해 주세요.`}</Text>
        </View>

        <InfoLine text={`AI는 이미지 특징과 지역 기준을 바탕으로 분석합니다.\n포장 상태나 재질 혼합 여부에 따라 일부 품목은 정확한 판단이 어려울 수 있습니다.`} first />
        <InfoLine text={`더 정확한 분리배출을 위해 최종 확인을 권장합니다.\n사용자의 확인과 피드백은 AI 품질 개선에도 반영됩니다.`} />

        <Pressable
          accessibilityRole="button"
          disabled={isConfirming}
          onPress={handleConfirm}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
          {isConfirming ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>배출 방법 확인하기</Text>}
        </Pressable>
      </ScrollView>

      {header}
      <ScanTabBar variant="light" />

      <ScanSheet
        visible={picker === 'component'}
        onClose={() => setPicker(null)}
        title="구성품 분리"
        subtitle={`${gugun ?? '우리 동네'}의 재활용품 구성품 분리 정보를 확인해보세요!`}>
        <View style={styles.chips}>
          {COMPONENT_CHIPS.map((chip) => {
            const on = flags[chip.key];
            return (
              <Pressable key={chip.key} onPress={() => toggleFlag(chip.key)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{chip.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScanSheet>

    </View>
  );
}

function RowLabel({ icon, label }: { icon: IconDef; label: string }) {
  return (
    <View style={styles.rowLabel}>
      <View style={styles.rowIcon}>
        <PathIcon icon={icon} color={ScanColors.greenText} />
      </View>
      <Text style={styles.rowLabelText}>{label}</Text>
    </View>
  );
}

type DropdownOption = { key: string; label: string; selected: boolean; onSelect: () => void };

// 선택 박스 바로 아래에 펼쳐지는 드롭다운. 목록이 길면 안에서 스크롤된다.
function SelectBox({ value, open, onPress, options }: { value: string; open: boolean; onPress: () => void; options: DropdownOption[] }) {
  return (
    <View style={styles.selectWrap}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress} style={[styles.select, open && styles.selectOpen]}>
        <Text style={styles.selectText} numberOfLines={1}>{value}</Text>
        <View style={open && styles.chevronUp}>
          <PathIcon icon={ICONS.chevronDown} color={ScanColors.gray} />
        </View>
      </Pressable>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.dropdownScroll}>
            {options.map((option) => (
              <Pressable key={option.key} onPress={option.onSelect} style={[styles.dropdownItem, option.selected && styles.dropdownItemOn]}>
                <Text style={[styles.dropdownText, option.selected && styles.dropdownTextOn]} numberOfLines={1}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function InfoLine({ text, first }: { text: string; first?: boolean }) {
  return (
    <View style={[styles.info, { marginTop: first ? 24 : 14 }]}>
      <View style={styles.infoIcon}>
        <PathIcon icon={ICONS.info} color={ScanColors.gray} />
      </View>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: ScanColors.gray, textAlign: 'center' },
  backText: { marginTop: 18, color: ScanColors.greenText, fontWeight: '700' },

  header: { position: 'absolute', left: 0, right: 0, height: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 22 },
  back: { marginRight: 15, height: 32, justifyContent: 'center' },

  photoWrap: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: '#FFFFFF' },
  photo: { width: '100%', height: '100%', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  photoShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 130, pointerEvents: 'none' },

  eyebrow: { marginTop: 40, textAlign: 'center', fontSize: 16, lineHeight: 24, fontWeight: '500', color: '#000000' },
  result: { marginTop: 3, textAlign: 'center', fontSize: 18, lineHeight: 28, fontWeight: '600', color: '#000000' },
  resultAccent: { color: ScanColors.greenText },

  card: { marginTop: 21, marginHorizontal: 16, borderRadius: 8, backgroundColor: '#FFFFFF' },
  row: {
    height: 56,
    paddingLeft: 26,
    paddingRight: 15.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: ScanColors.line,
  },
  rowKind: { zIndex: 4 },
  rowMaterial: { zIndex: 3 },
  rowLast: { height: 57, borderBottomWidth: 0, paddingRight: 23 },
  rowLabel: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 22, height: 24, marginRight: 4, alignItems: 'center', justifyContent: 'center' },
  rowLabelText: { fontSize: 14, lineHeight: 18, fontWeight: '600', color: ScanColors.ink },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowValueText: { fontSize: 13, lineHeight: 18, color: ScanColors.ink },

  selectWrap: { width: 122, height: 31 },
  select: {
    width: 122,
    height: 31,
    paddingLeft: 10.5,
    paddingRight: 7.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: ScanColors.border,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  selectOpen: { borderColor: ScanColors.greenDark },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  dropdown: {
    position: 'absolute',
    top: 35,
    left: 0,
    width: 122,
    borderWidth: 1,
    borderColor: ScanColors.border,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
    zIndex: 20,
    elevation: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  },
  dropdownScroll: { maxHeight: 188 },
  dropdownItem: { height: 36, paddingHorizontal: 10.5, justifyContent: 'center' },
  dropdownItemOn: { backgroundColor: ScanColors.mintChip },
  dropdownText: { fontSize: 13, color: ScanColors.ink },
  dropdownTextOn: { color: ScanColors.greenDark, fontWeight: '600' },
  dropdownBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 },
  cardRaised: { zIndex: 10 },
  selectText: { flex: 1, fontSize: 13, color: ScanColors.gray },
  toggle: { width: 120, height: 32, flexDirection: 'row' },
  toggleItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ScanColors.border,
    backgroundColor: '#FFFFFF',
  },
  toggleOn: { backgroundColor: ScanColors.mintChip, borderColor: '#1D8652', zIndex: 1 },
  toggleText: { fontSize: 13, color: '#000000' },

  note: {
    marginTop: 28,
    marginHorizontal: 16,
    height: 72,
    paddingLeft: 28,
    borderRadius: 8,
    backgroundColor: ScanColors.mint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 21,
  },
  noteText: { flex: 1, fontSize: 15, lineHeight: 20, color: ScanColors.ink2 },

  info: { marginHorizontal: 17, flexDirection: 'row', alignItems: 'flex-start' },
  infoIcon: { width: 13, height: 17, marginRight: 5, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, fontSize: 13, lineHeight: 17, color: 'rgba(80,80,80,0.8)' },

  button: {
    marginTop: 52,
    marginHorizontal: 16,
    height: 48,
    borderRadius: 8,
    backgroundColor: ScanColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  chips: { marginTop: 28, flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 9, paddingBottom: 24 },
  chip: { height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: ScanColors.chipGray, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: ScanColors.green },
  chipText: { fontSize: 14, fontWeight: '500', color: '#000000' },
  chipTextOn: { color: '#FFFFFF' },
});
