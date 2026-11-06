import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ICONS } from '@/components/scan/iconPaths';
import { ItemEditSheet, type ItemDraft } from '@/components/scan/ItemEditSheet';
import { PathIcon } from '@/components/scan/PathIcon';
import { PhotoBoxes, type BoxItem } from '@/components/scan/PhotoBoxes';
import { ReviewResult } from '@/components/scan/ReviewResult';
import { SnapSheet } from '@/components/scan/SnapSheet';
import { SsokLogo } from '@/components/ui/SsokLogo';
import { Text } from '@/components/ui/Text';
import { buildGeneralWasteGuide, isGeneralWasteCode } from '@/constants/generalWaste';
import { categoryDisplayName, pruneObjects, ScanColors, statusBarInset } from '@/constants/scanDesign';
import { groupResults, type ReviewGroup, type ReviewItem } from '@/constants/scanReview';
import {
  confirmScanObjectResult,
  createCalendar,
  getObjectDisposalGuide,
  getScanObject,
  getScanObjects,
  getTrashCategories,
  type DisposalGuide,
  type TrashCategory,
} from '@/services/api';
import { getScanPhoto } from '@/services/scanPhotoStore';

const HEADER_HEIGHT = 56;
// 접힌 시트가 화면에 보이는 높이. 제목과 첫 물건, 아래 버튼이 들어간다.
const SHEET_COLLAPSED = 280;
const MINI_PHOTO_HEIGHT = 190;

type Step = 'review' | 'result';

export default function ScanReviewScreen() {
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();
  const sid = Number(scanId);
  const insets = useSafeAreaInsets();
  const [layout, setLayout] = useState({ width: 375, height: 812 });
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [categories, setCategories] = useState<TrashCategory[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('review');
  const [groups, setGroups] = useState<ReviewGroup[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // 일정 저장이 끝난 판단 번호. 저장 뒤 이동만 실패했을 때 같은 기록이 두 번 쌓이지 않게 한다.
  const savedDecisions = useRef(new Set<number>());

  const photo = getScanPhoto(scanId);
  const photoUri = photo?.uri ?? imageUrl;
  const naturalSize = photo?.width && photo?.height ? { width: photo.width, height: photo.height } : undefined;

  useEffect(() => {
    if (!scanId || !Number.isFinite(sid)) {
      setError('스캔 결과를 찾을 수 없어요.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [list, categoryList] = await Promise.all([
          getScanObjects(sid),
          getTrashCategories().catch(() => [] as TrashCategory[]),
        ]);
        const stored = getScanPhoto(scanId);
        // 카메라 화면과 같은 기준으로 겹치거나 작은 조각 물건을 정리한다.
        const objects = pruneObjects(list.objects, stored?.width ?? 0, stored?.height ?? 0);
        if (objects.length === 0) {
          if (!cancelled) setError('사진에서 인식된 물건이 없어요.');
          return;
        }
        const details = await Promise.all(objects.map((object) => getScanObject(sid, object.objectId)));
        if (cancelled) return;
        setCategories(categoryList);
        setImageUrl(details[0]?.imageUrl ?? null);
        setItems(
          objects.map((object, index) => {
            const detail = details[index];
            return {
              objectId: object.objectId,
              number: index + 1,
              bbox: object.bbox,
              detail,
              categoryId: detail.category.categoryId,
              values: Object.fromEntries(detail.states.map((state) => [state.checklistId, String(state.statusValue)])),
            };
          })
        );
      } catch (reason) {
        console.error(reason);
        if (!cancelled) setError('스캔 결과를 불러오지 못했어요.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scanId, sid]);

  const categoryOf = (item: ReviewItem) =>
    categories.find((category) => category.categoryId === item.categoryId) ?? item.detail.category;
  const nameOf = (item: ReviewItem) => {
    const category = categoryOf(item);
    return categoryDisplayName(category.code, category.name);
  };

  const boxItems = useMemo<BoxItem[]>(
    () => (items ?? []).map((item) => ({ id: item.objectId, number: item.number, bbox: item.bbox })),
    [items]
  );
  const editing = items?.find((item) => item.objectId === editingId) ?? null;

  const applyEdit = (draft: ItemDraft) => {
    if (!editing) return;
    setItems((current) =>
      (current ?? []).map((item) =>
        item.objectId === editing.objectId ? { ...item, categoryId: draft.categoryId, values: draft.values } : item
      )
    );
    setEditingId(null);
  };

  // 모든 물건을 확정하고 물건별 배출 안내를 받아 "같은 품목 + 같은 상태"끼리 묶는다.
  const handleConfirm = async () => {
    if (!items || isConfirming) return;
    try {
      setIsConfirming(true);
      setActionError(null);
      const entries = await Promise.all(
        items.map(async (item) => {
          const category = categoryOf(item);
          const confirmed = await confirmScanObjectResult(sid, item.objectId, {
            categoryId: item.categoryId,
            states: item.detail.states.map((state) => ({
              checklistId: state.checklistId,
              statusValue: item.values[state.checklistId] ?? String(state.statusValue),
            })),
          });
          let guide: DisposalGuide;
          try {
            guide = await getObjectDisposalGuide(sid, item.objectId);
          } catch (guideError) {
            // 일반쓰레기(인식 불가)는 서버가 가이드를 주지 않을 수 있어서 앱의 기본 안내로 대신한다.
            if (!isGeneralWasteCode(category.code) || !confirmed.decisionId) throw guideError;
            guide = buildGeneralWasteGuide(sid, confirmed.decisionId, item.categoryId);
          }
          return { item, guide, categoryName: categoryDisplayName(category.code, category.name) };
        })
      );
      setGroups(groupResults(entries));
      setStep('result');
    } catch (reason) {
      console.error(reason);
      setActionError('결과를 확정하지 못했어요. 다시 시도해주세요.');
    } finally {
      setIsConfirming(false);
    }
  };

  // 확정한 판단을 배출 기록(캘린더)에 저장하고 홈으로 간다.
  const handleSave = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      setActionError(null);
      // 같은 묶음이어도 물건마다 판단 번호가 달라서 물건별로 저장한다.
      await Promise.all(
        groups
          .flatMap((group) => group.items)
          .map(async ({ item, decisionId }) => {
            if (!decisionId || savedDecisions.current.has(decisionId)) return;
            try {
              await createCalendar(decisionId);
            } catch (calendarError) {
              // 일반쓰레기는 서버에 배출 일정이 없을 수 있다. 스캔 기록은 이미 남아 있으니 일정 저장 실패로 막지 않는다.
              if (!isGeneralWasteCode(categoryOf(item).code)) throw calendarError;
              console.warn('[SSOK] 일반쓰레기 배출 일정은 저장하지 못했어요:', calendarError);
            }
            savedDecisions.current.add(decisionId);
          })
      );
      router.replace({ pathname: '/(tabs)', params: { feedback: '1', scanId: scanId ?? '' } });
    } catch (reason) {
      console.error(reason);
      setActionError('기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  if (step === 'result' && items) {
    return (
      <ReviewResult
        groups={groups}
        itemCount={items.length}
        isSaving={isSaving}
        error={actionError}
        onBack={() => {
          setActionError(null);
          setStep('review');
        }}
        onSave={handleSave}
      />
    );
  }

  const headerTop = statusBarInset(insets.top);
  const photoTop = headerTop + HEADER_HEIGHT;
  const sheetHeight = Math.max(SHEET_COLLAPSED + 80, layout.height - photoTop);
  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>카메라로 돌아가기</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={{ position: 'absolute', left: 0, top: photoTop, right: 0 }}>
            <PhotoBoxes
              uri={photoUri}
              naturalSize={naturalSize}
              items={boxItems}
              width={layout.width}
              height={Math.max(120, layout.height - photoTop - SHEET_COLLAPSED + 24)}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </View>

          <View style={[styles.header, { top: headerTop }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" hitSlop={12} onPress={() => router.back()} style={styles.back}>
              <PathIcon icon={ICONS.back} color="#FBFBFB" />
            </Pressable>
            <SsokLogo width={51} color="#FBFBFB" />
          </View>

          {!items ? (
            <View style={styles.loading}>
              <ActivityIndicator color={ScanColors.green} size="large" />
              <Text style={styles.loadingText}>물건을 찾고 있어요…</Text>
            </View>
          ) : (
            <>
              <SnapSheet
                height={sheetHeight}
                collapsedHeight={SHEET_COLLAPSED}
                expanded={expanded}
                onExpandedChange={setExpanded}
                bottomInset={bottomPad + 88}
                header={
                  <View style={styles.sheetHead}>
                    <Text style={styles.sheetTitle}>{`물건 ${items.length}개를 찾았어요`}</Text>
                    <Text style={styles.sheetSub}>다르게 인식된 물건이 있으면 연필을 눌러 고쳐 주세요.</Text>
                  </View>
                }>
                {expanded && (
                  <View style={styles.miniPhoto}>
                    <PhotoBoxes
                      uri={photoUri}
                      naturalSize={naturalSize}
                      items={boxItems}
                      width={layout.width - 32}
                      height={MINI_PHOTO_HEIGHT}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      radius={16}
                    />
                  </View>
                )}
                {items.map((item) => (
                  <ItemRow
                    key={item.objectId}
                    item={item}
                    name={nameOf(item)}
                    selected={item.objectId === selectedId}
                    onSelect={() => setSelectedId(item.objectId)}
                    onEdit={() => {
                      setSelectedId(item.objectId);
                      setEditingId(item.objectId);
                    }}
                  />
                ))}
              </SnapSheet>

              <View pointerEvents="box-none" style={[styles.ctaWrap, { paddingBottom: bottomPad }]}>
                <LinearGradient colors={['rgba(255,255,255,0)', '#FFFFFF']} style={styles.ctaFade} pointerEvents="none" />
                {!!actionError && <Text style={styles.actionError}>{actionError}</Text>}
                <Pressable
                  accessibilityRole="button"
                  disabled={isConfirming}
                  onPress={handleConfirm}
                  style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
                  {isConfirming ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>배출 방법 확인하기</Text>}
                </Pressable>
              </View>

              {editing && (
                <ItemEditSheet key={editing.objectId} item={editing} categories={categories} onClose={() => setEditingId(null)} onSave={applyEdit} />
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}

function ItemRow({
  item,
  name,
  selected,
  onSelect,
  onEdit,
}: {
  item: ReviewItem;
  name: string;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  // 웹에서 버튼 안에 버튼이 들어가지 않도록, 눌러서 선택하는 영역과 연필 버튼을 나란히 둔다.
  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      <Pressable accessibilityRole="button" onPress={onSelect} style={styles.rowMain}>
        <View style={styles.rowNumber}>
          <Text style={styles.rowNumberText}>{item.number}</Text>
        </View>
        <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.number}번 물건 수정`} hitSlop={10} onPress={onEdit} style={styles.pencil}>
        <Text style={styles.pencilText}>✎</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F0E', overflow: 'hidden' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: '#D2D4DA', textAlign: 'center' },
  backText: { marginTop: 18, color: ScanColors.green, fontWeight: '700' },

  header: { position: 'absolute', left: 0, right: 0, height: HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingLeft: 22 },
  back: { marginRight: 15, height: 32, justifyContent: 'center' },

  loading: { position: 'absolute', left: 0, right: 0, bottom: 0, height: SHEET_COLLAPSED, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  loadingText: { fontSize: 14, color: ScanColors.gray },

  sheetHead: { paddingHorizontal: 20, paddingBottom: 14 },
  sheetTitle: { fontSize: 22, lineHeight: 30, fontWeight: '700', color: ScanColors.ink },
  sheetSub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: ScanColors.gray },
  miniPhoto: { marginHorizontal: 16, marginBottom: 14 },

  row: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ScanColors.line,
    backgroundColor: '#FFFFFF',
  },
  rowSelected: { borderColor: ScanColors.green, backgroundColor: ScanColors.mint },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: ScanColors.green },
  rowNumberText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  rowTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700', color: ScanColors.ink },
  pencil: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: ScanColors.chipGray },
  pencilText: { fontSize: 17, color: ScanColors.ink2 },

  ctaWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 8 },
  ctaFade: { position: 'absolute', left: 0, right: 0, bottom: 0, top: -24 },
  cta: { height: 52, borderRadius: 12, backgroundColor: ScanColors.green, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  actionError: { marginBottom: 8, textAlign: 'center', fontSize: 13, color: '#B42318' },
});
