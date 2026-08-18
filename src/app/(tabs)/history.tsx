import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OverlayModal } from '@/components/ui/OverlayModal';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/theme';
import { HistoryEntries } from '@/constants/mockData';
import { getCalendars } from '@/services/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const YEARS = Array.from({ length: 21 }, (_, index) => 2020 + index);
const MONTHS = Array.from({ length: 12 }, (_, index) => index);

function WheelColumn({ values, value, onChange, suffix = '' }: {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  const itemHeight = 29;
  const scrollRef = useRef<ScrollView>(null);
  const lastSelectedValue = useRef(value);

  useEffect(() => {
    if (lastSelectedValue.current === value) return;
    lastSelectedValue.current = value;
    const index = Math.max(0, values.indexOf(value));
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: index * itemHeight, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [value, values]);

  const selectAtOffset = (offsetY: number) => {
    const index = Math.round(offsetY / itemHeight);
    const nextValue = values[Math.max(0, Math.min(index, values.length - 1))];
    if (nextValue === lastSelectedValue.current) return;
    lastSelectedValue.current = nextValue;
    onChange(nextValue);
  };

  return (
    <View style={styles.wheelColumn}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={styles.wheelContent}
        contentOffset={{ x: 0, y: Math.max(0, values.indexOf(value) * itemHeight) }}
        onScroll={(event) => selectAtOffset(event.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={(event) => selectAtOffset(event.nativeEvent.contentOffset.y)}>
        {values.map((option) => (
          <Pressable
            key={option}
            style={styles.wheelItem}
            onPress={() => {
              lastSelectedValue.current = option;
              scrollRef.current?.scrollTo({ y: values.indexOf(option) * itemHeight, animated: true });
              onChange(option);
            }}>
            <Text style={[styles.wheelText, option === value && styles.wheelTextActive]}>
              {option}{suffix}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

type HistoryViewEntry = {
  id: string;
  date: string;
  time: string;
  itemLabel: string;
  method: string;
  isCompleted: boolean;
};

function WebStatusBar() {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={styles.webStatusBar}>
      <Text style={styles.webStatusTime}>9:41</Text>
      <View style={styles.webStatusIcons}>
        <Ionicons name="cellular" size={13} color="#111111" />
        <Ionicons name="wifi" size={13} color="#111111" />
        <Ionicons name="battery-full" size={16} color="#111111" />
      </View>
    </View>
  );
}

function TrashDay({ count }: { count: number }) {
  const used = count > 0;
  return (
    <View style={styles.trashWrap}>
      <View style={[styles.trashLid, used ? styles.trashLidOpen : styles.trashLidClosed]} />
      <View style={[styles.trashHandle, used && styles.trashActive]} />
      <View style={[styles.trashBody, used && styles.trashActive]}>
        {used && <Text style={styles.trashCount}>{count}</Text>}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const today = new Date();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [itemPickerVisible, setItemPickerVisible] = useState(false);
  const [pendingDate, setPendingDate] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  });
  const [itemType, setItemType] = useState('플라스틱 용기');
  const [material, setMaterial] = useState('PET');
  const [isClean, setIsClean] = useState(true);
  const [historyEntries, setHistoryEntries] = useState<HistoryViewEntry[]>(
    HistoryEntries.map((entry, index) => ({ ...entry, id: `mock-${index}`, isCompleted: true }))
  );

  useEffect(() => {
    let cancelled = false;
    const startDate = toDateKey(cursor.year, cursor.month, 1);
    const lastDay = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const endDate = toDateKey(cursor.year, cursor.month, lastDay);
    getCalendars(startDate, endDate)
      .then((items) => {
        if (cancelled) return;
        setHistoryEntries(items.map((item) => {
          const scheduled = new Date(item.scheduledAt);
          return {
            id: String(item.calendarId),
            date: `${scheduled.getFullYear()}-${String(scheduled.getMonth() + 1).padStart(2, '0')}-${String(scheduled.getDate()).padStart(2, '0')}`,
            time: `${String(scheduled.getHours()).padStart(2, '0')}:${String(scheduled.getMinutes()).padStart(2, '0')}`,
            itemLabel: item.categoryName,
            method: item.isCompleted ? `${item.categoryName} 분리배출 완료` : `${item.categoryName} 분리배출 예정`,
            isCompleted: item.isCompleted,
          };
        }));
      })
      .catch((error) => console.warn('캘린더 API를 불러오지 못해 확인용 데이터를 표시합니다.', error));
    return () => {
      cancelled = true;
    };
  }, [cursor]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, HistoryViewEntry[]> = {};
    historyEntries.forEach((entry) => {
      map[entry.date] = [...(map[entry.date] ?? []), entry];
    });
    return map;
  }, [historyEntries]);

  const cells = useMemo(() => {
    const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const result: (number | null)[] = [...Array(firstDay).fill(null)];
    for (let day = 1; day <= daysInMonth; day += 1) result.push(day);
    while (result.length < 42) result.push(null);
    return result;
  }, [cursor]);

  const selectedEntries = selected ? entriesByDate[selected] ?? [] : [];
  const selectedLabel = selected
    ? (() => {
        const [selectedYear, selectedMonth, selectedDay] = selected.split('-').map(Number);
        return `${selectedMonth}.${selectedDay} ${WEEKDAYS[new Date(selectedYear, selectedMonth - 1, selectedDay).getDay()]}요일`;
      })()
    : '';

  const openDatePicker = () => {
    const base = selected ? new Date(`${selected}T00:00:00`) : new Date(cursor.year, cursor.month, today.getDate());
    setPendingDate({ year: base.getFullYear(), month: base.getMonth() + 1, day: base.getDate() });
    setPickerVisible(true);
  };

  const confirmDate = () => {
    const maxDay = new Date(pendingDate.year, pendingDate.month, 0).getDate();
    const day = Math.min(pendingDate.day, maxDay);
    setCursor({ year: pendingDate.year, month: pendingDate.month - 1 });
    setSelected(toDateKey(pendingDate.year, pendingDate.month - 1, day));
    setPickerVisible(false);
  };

  const saveItem = () => {
    const date = selected ?? todayKey;
    const now = new Date();
    setHistoryEntries((entries) => [
      ...entries,
      {
        id: `local-${Date.now()}`,
        date,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        itemLabel: itemType,
        method: `라벨, 뚜껑 분리 후 분리배출`,
        isCompleted: true,
      },
    ]);
    setSelected(date);
    setItemPickerVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebStatusBar />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={27} color="#454545" />
        </Pressable>
        <Text style={styles.headerTitle}>SSOK</Text>
        <View style={styles.headerTools}>
          <Pressable style={styles.headerToolButton} onPress={() => setSelected((value) => value ? null : todayKey)}>
            <Ionicons name="list" size={22} color={selected ? Colors.primary : '#222222'} />
          </Pressable>
          <Ionicons name="search" size={22} color="#222222" />
          <Pressable onPress={() => setItemPickerVisible(true)}>
            <Ionicons name="add" size={25} color="#222222" />
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.monthRow} onPress={openDatePicker}>
        <Text style={styles.monthText}>{cursor.year}. {String(cursor.month + 1).padStart(2, '0')}</Text>
        <Ionicons name={pickerVisible ? 'caret-up' : 'caret-down'} size={12} color="#222222" />
      </Pressable>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((weekday, index) => (
          <Text
            key={weekday}
            style={[styles.weekdayText, index === 0 && styles.sunday, index === 6 && styles.saturday]}>
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {cells.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
          const dateKey = toDateKey(cursor.year, cursor.month, day);
          const count = entriesByDate[dateKey]?.filter((entry) => entry.isCompleted).length ?? 0;
          const weekdayIndex = index % 7;
          const isSelected = dateKey === selected;
          const isToday = dateKey === todayKey;
          return (
            <Pressable key={dateKey} style={styles.dayCell} onPress={() => setSelected(dateKey)}>
              <TrashDay count={count} />
              <View style={isToday ? styles.todayDay : undefined}>
                <Text
                  style={[
                    styles.dayNumber,
                    weekdayIndex === 0 && styles.sunday,
                    weekdayIndex === 6 && styles.saturday,
                    isSelected && styles.selectedDayText,
                    isToday && styles.todayDayText,
                  ]}>
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {selected && (
        <>
          <View style={styles.sectionDivider} />
          <View style={styles.historyHeader}>
            <Text style={styles.historyDate}>{selectedLabel}</Text>
            <Ionicons name="ellipsis-vertical" size={22} color="#555555" />
          </View>
          <ScrollView style={styles.entryScroll} contentContainerStyle={styles.entryList} showsVerticalScrollIndicator={false}>
            {selectedEntries.length === 0 ? (
              <Text style={styles.emptyText}>이날은 분리배출 기록이 없어요.</Text>
            ) : (
              selectedEntries.map((entry) => (
                <View key={entry.id} style={styles.entryRow}>
                  <Ionicons name="water-outline" size={25} color="#222222" />
                  <Text style={styles.entryTime}>{entry.time}</Text>
                  <View style={styles.entryAccent} />
                  <Text numberOfLines={1} style={styles.entryMethod}>{entry.method}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </>
      )}

      <OverlayModal visible={pickerVisible} animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.dateModalCard}>
            <Text style={styles.modalTitle}>날짜 설정</Text>
            <View style={styles.modalDivider} />
            <View style={styles.wheelRow}>
              <WheelColumn
                values={YEARS}
                value={pendingDate.year}
                onChange={(year) => setPendingDate((date) => ({ ...date, year }))}
                suffix="년"
              />
              <WheelColumn
                values={MONTHS.map((month) => month + 1)}
                value={pendingDate.month}
                onChange={(month) => setPendingDate((date) => ({ ...date, month }))}
                suffix="월"
              />
              <WheelColumn
                values={Array.from({ length: new Date(pendingDate.year, pendingDate.month, 0).getDate() }, (_, index) => index + 1)}
                value={Math.min(pendingDate.day, new Date(pendingDate.year, pendingDate.month, 0).getDate())}
                onChange={(day) => setPendingDate((date) => ({ ...date, day }))}
                suffix="일"
              />
              <View pointerEvents="none" style={styles.wheelSelectionGuide} />
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelAction} onPress={() => setPickerVisible(false)}>
                <Text style={styles.cancelActionText}>취소</Text>
              </Pressable>
              <Pressable style={styles.confirmAction} onPress={confirmDate}>
                <Text style={styles.confirmActionText}>확인</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </OverlayModal>

      <OverlayModal visible={itemPickerVisible} animationType="fade" onRequestClose={() => setItemPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.itemModalCard}>
            <Text style={styles.modalTitle}>품목 설정</Text>
            <View style={styles.modalDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}>
                <Ionicons name="water-outline" size={19} color="#17B66C" />
                <Text style={styles.settingLabel}>종류</Text>
              </View>
              <Pressable style={styles.selectBox} onPress={() => setItemType((value) => value === '플라스틱 용기' ? '페트병' : '플라스틱 용기')}>
                <Text style={styles.selectText}>{itemType}</Text>
                <Ionicons name="chevron-down" size={16} color="#444444" />
              </Pressable>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}>
                <Ionicons name="layers-outline" size={19} color="#17B66C" />
                <Text style={styles.settingLabel}>재질</Text>
              </View>
              <Pressable style={styles.selectBox} onPress={() => setMaterial((value) => value === 'PET' ? 'PP' : 'PET')}>
                <Text style={styles.selectText}>{material}</Text>
                <Ionicons name="chevron-down" size={16} color="#444444" />
              </Pressable>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}>
                <Ionicons name="water-outline" size={19} color="#17B66C" />
                <Text style={styles.settingLabel}>오염 상태</Text>
              </View>
              <View style={styles.cleanToggle}>
                <Pressable style={[styles.cleanOption, isClean && styles.cleanOptionActive]} onPress={() => setIsClean(true)}>
                  <Text style={styles.cleanOptionText}>깨끗함</Text>
                </Pressable>
                <Pressable style={[styles.cleanOption, !isClean && styles.cleanOptionActive]} onPress={() => setIsClean(false)}>
                  <Text style={styles.cleanOptionText}>오염됨</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}>
                <Ionicons name="recycle-outline" size={19} color="#17B66C" />
                <Text style={styles.settingLabel}>구성품 분리</Text>
              </View>
              <View style={styles.componentValue}>
                <Text style={styles.componentText}>라벨, 뚜껑 분리 필요</Text>
                <Ionicons name="chevron-forward" size={19} color="#444444" />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelAction} onPress={() => setItemPickerVisible(false)}>
                <Text style={styles.cancelActionText}>취소</Text>
              </Pressable>
              <Pressable style={styles.confirmAction} onPress={saveItem}>
                <Text style={styles.confirmActionText}>저장</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </OverlayModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  webStatusBar: {
    height: 44,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webStatusTime: { color: '#111111', fontSize: 14, fontWeight: '700' },
  webStatusIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  header: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 34, height: 34, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: '#111111', marginLeft: 5 },
  headerTools: {
    marginLeft: 'auto',
    height: 38,
    minWidth: 126,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  headerToolButton: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
  monthRow: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...Platform.select({ web: { outlineWidth: 0 }, default: {} }),
  },
  monthText: { fontSize: 20, lineHeight: 25, fontWeight: '800', color: '#222222' },
  monthPicker: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 148 : 104,
    left: 18,
    right: 18,
    zIndex: 50,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
  pickerHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 15 },
  pickerTitle: { color: '#111111', fontSize: 18, lineHeight: 23, fontWeight: '800' },
  pickerSubtitle: { marginTop: 3, color: '#9CA3AF', fontSize: 11, lineHeight: 16 },
  pickerClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center' },
  pickerSectionLabel: { marginTop: 7, marginBottom: 7, color: '#6B7280', fontSize: 11, fontWeight: '700' },
  horizontalOptions: { gap: 7, paddingRight: 8 },
  dateChip: { height: 36, minWidth: 50, paddingHorizontal: 13, borderRadius: 18, backgroundColor: '#F4F5F6', alignItems: 'center', justifyContent: 'center' },
  yearChip: { minWidth: 64 },
  dateChipActive: { backgroundColor: '#22C55E' },
  dateChipText: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  dateChipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  pickerActions: { marginTop: 18, flexDirection: 'row', gap: 8 },
  pickerDoneButton: { flex: 1, height: 42, borderRadius: 11, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  pickerDoneText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  weekdayRow: { height: 32, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  weekdayText: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, color: '#222222', fontWeight: '600' },
  sunday: { color: '#FF1F2D' },
  saturday: { color: '#0879E8' },
  calendarGrid: { height: 354, paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' },
  dayCell: { width: `${100 / 7}%`, height: 59, alignItems: 'center', justifyContent: 'flex-start' },
  trashWrap: { width: 34, height: 39, position: 'relative', alignItems: 'center', justifyContent: 'flex-end' },
  trashBody: { width: 23, height: 27, borderRadius: 2, backgroundColor: '#BDC2C0', alignItems: 'center', justifyContent: 'center' },
  trashHandle: { position: 'absolute', top: 2, width: 10, height: 3, borderRadius: 1, backgroundColor: '#BDC2C0' },
  trashLid: { position: 'absolute', top: 6, width: 31, height: 4, borderRadius: 1, backgroundColor: '#BDC2C0' },
  trashLidClosed: {},
  trashLidOpen: { top: 3, transform: [{ rotate: '8deg' }] },
  trashActive: { backgroundColor: '#2BD489' },
  trashCount: { color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  dayNumber: { minWidth: 18, textAlign: 'center', color: '#333333', fontSize: 11, lineHeight: 17 },
  todayDay: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' },
  selectedDayText: { color: '#16A34A', fontWeight: '800' },
  todayDayText: { color: '#FFFFFF' },
  sectionDivider: { height: 7, backgroundColor: '#F5F5F5', borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  historyHeader: { height: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyDate: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: '#222222' },
  entryScroll: { flex: 1 },
  entryList: { paddingHorizontal: 16, paddingBottom: 18, gap: 12 },
  entryRow: { height: 48, paddingHorizontal: 14, borderRadius: 4, backgroundColor: '#F1F1F1', flexDirection: 'row', alignItems: 'center' },
  entryTime: { marginLeft: 8, fontSize: 15, color: '#222222', fontWeight: '600' },
  entryAccent: { width: 2, height: 30, marginHorizontal: 10, backgroundColor: '#FF8A00' },
  entryMethod: { flex: 1, fontSize: 13, color: '#222222', fontWeight: '600' },
  emptyText: { paddingTop: 12, textAlign: 'center', color: Colors.textTertiary, fontSize: 13 },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 38,
  },
  dateModalCard: { width: 292, maxWidth: '100%', borderRadius: 15, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  itemModalCard: { width: '100%', borderRadius: 16, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  modalTitle: { height: 61, textAlign: 'center', textAlignVertical: 'center', paddingTop: 21, fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#222222' },
  modalDivider: { height: 1, backgroundColor: '#D9D9D9' },
  wheelRow: { height: 220, flexDirection: 'row', paddingHorizontal: 46, alignItems: 'center', position: 'relative' },
  wheelColumn: { flex: 1, height: 174, overflow: 'hidden' },
  wheelContent: { paddingVertical: 72 },
  wheelItem: { height: 29, alignItems: 'center', justifyContent: 'center' },
  wheelText: { color: '#C9C9C9', fontSize: 11, lineHeight: 16, fontWeight: '300' },
  wheelTextActive: { color: '#4A4A4A', fontSize: 18, lineHeight: 23, fontWeight: '400' },
  wheelSelectionGuide: {
    position: 'absolute',
    left: 25,
    right: 25,
    top: 95,
    height: 30,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E7E7E7',
  },
  modalActions: { height: 56, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E1E1E1' },
  cancelAction: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  confirmAction: { flex: 1, backgroundColor: '#55CE87', alignItems: 'center', justifyContent: 'center' },
  cancelActionText: { color: '#3F3F3F', fontSize: 16, fontWeight: '400' },
  confirmActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  settingRow: {
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
  },
  settingLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  settingLabel: { color: '#222222', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  selectBox: {
    width: 105,
    height: 29,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: '#CECECE',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { color: '#555555', fontSize: 10, fontWeight: '500' },
  cleanToggle: { height: 29, flexDirection: 'row', borderWidth: 1, borderColor: '#CECECE', borderRadius: 4, overflow: 'hidden' },
  cleanOption: { minWidth: 51, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  cleanOptionActive: { backgroundColor: '#DDF9E9', borderWidth: 1, borderColor: '#25A765' },
  cleanOptionText: { color: '#222222', fontSize: 9, fontWeight: '600' },
  componentValue: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  componentText: { color: '#222222', fontSize: 9, fontWeight: '500' },
});
