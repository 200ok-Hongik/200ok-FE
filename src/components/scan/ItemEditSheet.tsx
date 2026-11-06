import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScanSheet } from '@/components/scan/ScanSheet';
import { Text } from '@/components/ui/Text';
import { isGeneralWasteCode } from '@/constants/generalWaste';
import { categoryDisplayName, ScanColors } from '@/constants/scanDesign';
import type { ReviewItem } from '@/constants/scanReview';
import { isStateOn, stateMeta } from '@/constants/scanStates';
import type { TrashCategory } from '@/services/api';

export type ItemDraft = { categoryId: number; values: Record<number, string> };

type Props = {
  item: ReviewItem;
  categories: TrashCategory[];
  onClose: () => void;
  onSave: (draft: ItemDraft) => void;
};

// 연필 버튼을 눌렀을 때 뜨는 시트. 품목을 다시 고르고, 이 물건에서 AI가 읽은 상태(오염, 라벨, 뚜껑 등)를 하나씩 고칠 수 있다.
// 물건이 바뀔 때마다 새로 만들어지도록 부모에서 key를 준다.
export function ItemEditSheet({ item, categories, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<ItemDraft>(() => ({ categoryId: item.categoryId, values: { ...item.values } }));

  // 일반쓰레기는 목록 맨 아래에 둔다.
  const options = useMemo(() => {
    const list: Pick<TrashCategory, 'categoryId' | 'code' | 'name'>[] =
      categories.length > 0 ? categories : [{ ...item.detail.category }];
    return [...list.filter((c) => !isGeneralWasteCode(c.code)), ...list.filter((c) => isGeneralWasteCode(c.code))];
  }, [categories, item.detail.category]);

  // 화면에 보여줄 이름이 있는 상태만 고치게 한다. 나머지 항목의 값은 그대로 서버에 보낸다.
  const editableStates = useMemo(
    () =>
      item.detail.states.flatMap((state) => {
        const meta = stateMeta(state.checkItemName);
        return meta ? [{ state, meta }] : [];
      }),
    [item.detail.states]
  );

  const changed =
    draft.categoryId !== item.categoryId ||
    item.detail.states.some((state) => draft.values[state.checklistId] !== item.values[state.checklistId]);

  return (
    <ScanSheet
      visible
      onClose={onClose}
      title="어떤 물건인가요?"
      subtitle={`${item.number}번 물건 · 종류와 상태를 확인하고 고쳐 주세요`}
      minHeight={560}>
      <Text style={styles.sectionLabel}>종류</Text>
      <View style={styles.grid}>
        {options.map((category) => {
          const selected = category.categoryId === draft.categoryId;
          return (
            <Pressable
              key={category.categoryId}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setDraft({ ...draft, categoryId: category.categoryId })}
              style={[styles.option, selected && styles.optionOn]}>
              <Text style={[styles.optionText, selected && styles.optionTextOn]} numberOfLines={1}>
                {categoryDisplayName(category.code, category.name)}
              </Text>
              {selected && <Text style={styles.optionCheck}>✓</Text>}
            </Pressable>
          );
        })}
      </View>

      {editableStates.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>상태</Text>
          <View style={styles.stateList}>
            {editableStates.map(({ state, meta }, index) => {
              const on = isStateOn(draft.values[state.checklistId] ?? state.statusValue);
              const set = (value: boolean) =>
                setDraft({ ...draft, values: { ...draft.values, [state.checklistId]: String(value) } });
              return (
                <View key={state.checklistId} style={[styles.stateRow, index === 0 && { borderTopWidth: 0 }]}>
                  <Text style={styles.stateLabel}>{meta.label}</Text>
                  <View style={styles.segment}>
                    <Pressable accessibilityRole="button" onPress={() => set(false)} style={[styles.segmentItem, !on && styles.segmentOn]}>
                      <Text style={[styles.segmentText, !on && styles.segmentTextOn]}>{meta.off}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => set(true)} style={[styles.segmentItem, on && styles.segmentOn]}>
                      <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{meta.on}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onClose} style={[styles.button, styles.cancel]}>
          <Text style={styles.cancelText}>취소</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onSave(draft)} style={[styles.button, styles.confirm]}>
          <Text style={styles.confirmText}>{changed ? '수정 완료' : '이대로 둘게요'}</Text>
        </Pressable>
      </View>
    </ScanSheet>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: 22, fontSize: 14, lineHeight: 18, fontWeight: '700', color: ScanColors.ink },
  grid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    width: '48%',
    height: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ScanColors.line,
    backgroundColor: '#FFFFFF',
  },
  optionOn: { borderColor: ScanColors.green, backgroundColor: ScanColors.mint },
  optionText: { flex: 1, fontSize: 14, color: ScanColors.ink },
  optionTextOn: { fontWeight: '700', color: ScanColors.greenDark },
  optionCheck: { fontSize: 14, fontWeight: '700', color: ScanColors.green },

  stateList: { marginTop: 4 },
  stateRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: ScanColors.line,
  },
  stateLabel: { fontSize: 14, fontWeight: '600', color: ScanColors.ink },
  segment: { flexDirection: 'row' },
  segmentItem: {
    minWidth: 78,
    height: 32,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ScanColors.border,
    backgroundColor: '#FFFFFF',
  },
  segmentOn: { backgroundColor: ScanColors.mintChip, borderColor: '#1D8652', zIndex: 1 },
  segmentText: { fontSize: 13, color: '#000000' },
  segmentTextOn: { fontWeight: '600', color: ScanColors.greenDark },

  actions: { marginTop: 28, marginBottom: 8, flexDirection: 'row', gap: 10 },
  button: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancel: { flex: 1, borderWidth: 1, borderColor: ScanColors.border, backgroundColor: '#FFFFFF' },
  cancelText: { fontSize: 15, fontWeight: '600', color: ScanColors.ink },
  confirm: { flex: 2, backgroundColor: ScanColors.green },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
