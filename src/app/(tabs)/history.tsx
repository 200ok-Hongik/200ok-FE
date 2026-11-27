import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OverlayModal } from '@/components/ui/OverlayModal';
import { Text } from '@/components/ui/Text';
import { SsokLogo } from '@/components/ui/SsokLogo';
import { getSeparationDescription } from '@/constants/separation';
import { Colors } from '@/constants/theme';
import { categoryDisplayName } from '@/constants/scanDesign';
import { getScanHistory, type ScanHistoryEntry } from '@/services/api';
import { addManualHistory, loadManualHistory } from '@/services/manualHistory';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const YEARS = Array.from({ length: 21 }, (_, index) => 2020 + index);
const MONTHS = Array.from({ length: 12 }, (_, index) => index);

const HISTORY_ITEM_TYPES = ['무색 페트병', '플라스틱류', '캔류', '유리병류', '비닐류', '종이류', '종이팩', '스티로폼류', '일반쓰레기'] as const;
type ItemType = (typeof HISTORY_ITEM_TYPES)[number];

function WheelColumn({ values, value, onChange, suffix = '' }: {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  const itemHeight = 29;
  const scrollRef = useRef<ScrollView>(null);
  const lastSelectedValue = useRef<number | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lastSelectedValue.current === value) return;
    lastSelectedValue.current = value;
    const index = Math.max(0, values.indexOf(value));
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: index * itemHeight, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [value, values]);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const selectAtOffset = (offsetY: number, snap = false) => {
    const index = Math.round(offsetY / itemHeight);
    const nextValue = values[Math.max(0, Math.min(index, values.length - 1))];
    if (snap && Math.abs(offsetY - index * itemHeight) > 0.5) {
      scrollRef.current?.scrollTo({ y: index * itemHeight, animated: true });
    }
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
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settleTimer.current = setTimeout(() => selectAtOffset(offsetY, true), 80);
        }}
        onMomentumScrollEnd={(event) => selectAtOffset(event.nativeEvent.contentOffset.y, true)}>
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

// 서버의 스캔 기록을 화면에 보여줄 기록 한 줄씩으로 바꾼다. 월별 달력과 검색이 같이 쓴다.
function toViewEntries(scans: ScanHistoryEntry[]): HistoryViewEntry[] {
  return scans.flatMap((scan) => {
    const scanned = new Date(scan.scannedAt);
    if (Number.isNaN(scanned.getTime())) return [];
    const date = toDateKey(scanned.getFullYear(), scanned.getMonth(), scanned.getDate());
    const time = `${String(scanned.getHours()).padStart(2, '0')}:${String(scanned.getMinutes()).padStart(2, '0')}`;
    // 한 번 찍은 사진에 물건이 여러 개면 물건마다 기록 한 줄로 보여준다.
    return scan.items.map((item): HistoryViewEntry => {
      const name = categoryDisplayName(item.category?.code, item.category?.name) || '일반쓰레기';
      return {
        id: `${scan.scanResultId}-${item.objectId}`,
        date,
        time,
        itemLabel: name,
        // 새 흐름에서는 "배출 방법 확인하기"를 누르면 모든 물건이 확정돼서 거의 항상 확인된 상태다.
        // 정상 상태를 매번 "확인 완료"로 적을 필요는 없고, 확인하지 않고 나간 예외만 표시한다.
        method: item.isConfirmed ? `${name} 스캔` : `${name} 스캔 · 확인 전`,
        isCompleted: true,
      };
    });
  });
}

// "2026-11-17" → "11.17 화요일"
function dateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return `${month}.${day} ${WEEKDAYS[new Date(year, month - 1, day).getDay()]}요일`;
}

function historyIconForItem(itemLabel: string): keyof typeof Ionicons.glyphMap {
  const label = itemLabel.replace(/\s/g, '');
  if (label.includes('페트')) return 'water-outline';
  if (label.includes('유리')) return 'wine-outline';
  if (label.includes('캔') || label.includes('알루미늄') || label.includes('철')) return 'archive-outline';
  if (label.includes('비닐')) return 'bag-handle-outline';
  if (label.includes('종이팩')) return 'file-tray-full-outline';
  if (label.includes('종이') || label.includes('신문') || label.includes('책자')) return 'document-text-outline';
  if (label.includes('스티로폼')) return 'cube-outline';
  if (label.includes('플라스틱')) return 'flask-outline';
  if (label.includes('일반쓰레기')) return 'trash-outline';
  return 'leaf-outline';
}

function TrashDay({ count }: { count: number }) {
  const used = count > 0;
  return (
    <View style={styles.trashWrap}>
      <Image
        source={used
          ? require('../../../assets/images/trash-open.svg')
          : require('../../../assets/images/trash-closed.svg')}
        style={used ? styles.trashOpenImage : styles.trashClosedImage}
        resizeMode="contain"
      />
      {used && <Text style={styles.trashCount}>{count}</Text>}
    </View>
  );
}

const COLLAPSED_COUNT = 4;

// 하루에 기록이 많을 때 앞 4개만 보여 주고 "더 보기"로 펼친다. 날짜가 바뀌면 key가 달라져 다시 접힌다.
function EntryList({ entries, onPressEntry }: { entries: HistoryViewEntry[]; onPressEntry?: (entry: HistoryViewEntry) => void }) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = entries.length > COLLAPSED_COUNT + 1;
  const visible = canCollapse && !expanded ? entries.slice(0, COLLAPSED_COUNT) : entries;
  const hiddenCount = entries.length - COLLAPSED_COUNT;

  return (
    <View style={styles.entryList}>
      {visible.map((entry) => {
        const content = (
          <>
            <Ionicons name={historyIconForItem(entry.itemLabel)} size={25} color="#222222" />
            <Text style={styles.entryTime}>{entry.time}</Text>
            <View style={styles.entryAccent} />
            <Text numberOfLines={1} style={styles.entryMethod}>{entry.method}</Text>
          </>
        );
        return onPressEntry ? (
          <Pressable key={entry.id} accessibilityRole="button" onPress={() => onPressEntry(entry)} style={styles.entryRow}>
            {content}
          </Pressable>
        ) : (
          <View key={entry.id} style={styles.entryRow}>{content}</View>
        );
      })}
      {canCollapse && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? '기록 접기' : `기록 ${hiddenCount}개 더 보기`}
          onPress={() => setExpanded((value) => !value)}
          style={styles.moreButton}>
          <Text style={styles.moreText}>{expanded ? '접기' : `${hiddenCount}개 더 보기`}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#666666" />
        </Pressable>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  // Keep the server render and the browser's first render identical. The real
  // local date is applied after hydration below.
  const [today, setToday] = useState(() => new Date(2000, 0, 1));
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
  const [itemType, setItemType] = useState<ItemType | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'type' | null>(null);
  const [typeError, setTypeError] = useState(false);
  const [isClean, setIsClean] = useState(true);
  const [separationStatus, setSeparationStatus] = useState<'완료' | '안 함' | '해당 없음'>('해당 없음');
  const [historyEntries, setHistoryEntries] = useState<HistoryViewEntry[]>([]);
  // "+"로 직접 추가한 기록. 서버 기록을 다시 받아도 사라지지 않게 따로 들고 있는다.
  const [manualEntries, setManualEntries] = useState<HistoryViewEntry[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setManualEntries(loadManualHistory());
  }, []);

  useEffect(() => {
    const localToday = new Date();
    setToday(localToday);
    setCursor({ year: localToday.getFullYear(), month: localToday.getMonth() });
    // 처음 들어와도 오늘 날짜가 선택된 상태로 하단 기록 패널을 보여준다.
    setSelected(toDateKey(localToday.getFullYear(), localToday.getMonth(), localToday.getDate()));
    setPendingDate({
      year: localToday.getFullYear(),
      month: localToday.getMonth() + 1,
      day: localToday.getDate(),
    });
  }, []);

  // 검색: 월별 달력과 달리 모든 달의 기록에서 찾아야 해서, 검색을 열 때 전체 기록을 한 번 받아 둔다.
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [allEntries, setAllEntries] = useState<HistoryViewEntry[] | null>(null);
  const [searchError, setSearchError] = useState(false);

  useEffect(() => {
    // 오늘 날짜가 아직 자리표시(2000년)일 때는 받지 않는다.
    if (!searchOpen || today.getFullYear() < 2020) return;
    let cancelled = false;
    setSearchError(false);
    getScanHistory('2000-01-01', todayKey)
      .then((scans) => {
        if (!cancelled) setAllEntries(toViewEntries(scans));
      })
      .catch((error) => {
        console.warn('검색할 스캔 기록을 불러오지 못했습니다.', error);
        if (!cancelled) setSearchError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [searchOpen, todayKey, today]);

  // 품목 이름에서 띄어쓰기와 대소문자를 무시하고 찾고, 최근 기록이 위로 오게 날짜별로 묶는다.
  const searchGroups = useMemo(() => {
    if (!allEntries) return [];
    const needle = query.replace(/\s/g, '').toLowerCase();
    const matched = [...allEntries, ...manualEntries]
      .filter((entry) => !needle || entry.itemLabel.replace(/\s/g, '').toLowerCase().includes(needle))
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    const groups: { date: string; entries: HistoryViewEntry[] }[] = [];
    for (const entry of matched) {
      const last = groups[groups.length - 1];
      if (last?.date === entry.date) last.entries.push(entry);
      else groups.push({ date: entry.date, entries: [entry] });
    }
    return groups;
  }, [allEntries, manualEntries, query]);

  const toggleSearch = () => {
    setSearchOpen((open) => !open);
    setQuery('');
  };

  // 검색 결과를 누르면 그 날짜의 달력으로 이동한다.
  const jumpToEntryDate = (date: string) => {
    const [year, month] = date.split('-').map(Number);
    setCursor({ year, month: month - 1 });
    setSelected(date);
    setSearchOpen(false);
    setQuery('');
  };

  // 스캔 결과를 저장하고 이 탭으로 돌아올 때마다 최신 기록을 다시 불러온다.
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    const startDate = toDateKey(cursor.year, cursor.month, 1);
    const lastDay = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const endDate = toDateKey(cursor.year, cursor.month, lastDay);
    // 월 범위로 한 번 받아 두고, 날짜를 고를 때는 받은 목록을 날짜별로 걸러서 쓴다.
    getScanHistory(startDate, endDate)
      .then((scans) => {
        if (cancelled) return;
        setLoadError(false);
        setHistoryEntries(
          toViewEntries(scans)
        );
      })
      .catch((error) => {
        console.warn('스캔 기록을 불러오지 못했습니다.', error);
        if (cancelled) return;
        setLoadError(true);
        setHistoryEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [cursor]));

  const entriesByDate = useMemo(() => {
    const map: Record<string, HistoryViewEntry[]> = {};
    [...historyEntries, ...manualEntries].forEach((entry) => {
      map[entry.date] = [...(map[entry.date] ?? []), entry];
    });
    return map;
  }, [historyEntries, manualEntries]);

  const cells = useMemo(() => {
    const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const result: (number | null)[] = [...Array(firstDay).fill(null)];
    for (let day = 1; day <= daysInMonth; day += 1) result.push(day);
    while (result.length < 42) result.push(null);
    return result;
  }, [cursor]);

  const selectedEntries = selected ? entriesByDate[selected] ?? [] : [];
  const selectedLabel = selected ? dateLabel(selected) : '';

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
    if (!itemType) {
      setTypeError(true);
      setOpenDropdown(null);
      return;
    }
    const date = selected ?? todayKey;
    const now = new Date();
    setManualEntries(
      addManualHistory({
        id: `local-${Date.now()}`,
        date,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        itemLabel: itemType,
        method: `${itemType} · 구성품 분리 ${separationStatus}`,
        isCompleted: true,
      })
    );
    setSelected(date);
    setOpenDropdown(null);
    setItemPickerVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={27} color="#454545" />
        </Pressable>
        <SsokLogo width={58} />
        <View style={styles.headerTools}>
          <Pressable style={styles.headerToolButton} onPress={() => setSelected((value) => value ? null : todayKey)}>
            <Ionicons name="list" size={22} color={selected ? Colors.primary : '#222222'} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="기록 검색" style={styles.headerToolButton} onPress={toggleSearch}>
            <Ionicons name="search" size={22} color={searchOpen ? Colors.primary : '#222222'} />
          </Pressable>
          <Pressable onPress={() => { setItemType(null); setTypeError(false); setOpenDropdown(null); setItemPickerVisible(true); }}>
            <Ionicons name="add" size={25} color="#222222" />
          </Pressable>
        </View>
      </View>

      {searchOpen && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="품목 이름으로 검색해 보세요 (예: 플라스틱)"
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            style={styles.searchInput}
          />
          {!!query && (
            <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" hitSlop={8} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
      {searchOpen ? (
        <View style={styles.searchResults}>
          {searchError ? (
            <Text style={styles.emptyText}>기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</Text>
          ) : !allEntries ? (
            <Text style={styles.emptyText}>기록을 찾는 중이에요…</Text>
          ) : searchGroups.length === 0 ? (
            <Text style={styles.emptyText}>{query ? `'${query.trim()}'에 해당하는 기록이 없어요.` : '아직 스캔 기록이 없어요.'}</Text>
          ) : (
            searchGroups.map((group) => (
              <View key={group.date} style={styles.searchGroup}>
                <Text style={styles.searchDate}>{`${group.date.slice(0, 4)}. ${dateLabel(group.date)}`}</Text>
                <EntryList entries={group.entries} onPressEntry={(entry) => jumpToEntryDate(entry.date)} />
              </View>
            ))
          )}
        </View>
      ) : (
      <>
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
          {selectedEntries.length === 0 ? (
            <View style={styles.entryList}>
              <Text style={styles.emptyText}>{loadError ? '기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' : '이날은 분리배출 기록이 없어요.'}</Text>
            </View>
          ) : (
            <EntryList key={selected} entries={selectedEntries} />
          )}
        </>
      )}
      </>
      )}
      </ScrollView>

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

      <OverlayModal visible={itemPickerVisible} animationType="fade" onRequestClose={() => { setTypeError(false); setOpenDropdown(null); setItemPickerVisible(false); }}>
        <View style={[styles.modalBackdrop, styles.itemModalBackdrop]}>
          <View style={styles.itemModalCard}>
            <View style={styles.itemModalHeader}>
              <Text style={styles.itemModalTitle}>품목 설정</Text>
              <Text style={[styles.requiredHint, typeError && styles.requiredHintError]}>
                {typeError ? '종류를 선택해주세요.' : '* 필수 선택 항목'}
              </Text>
            </View>
            <View style={styles.modalDivider} />

            <View style={[styles.settingRow, styles.typeSettingRow]}>
              <View style={styles.settingLabelWrap}>
                <Image source={require('../../../assets/images/item-type.svg')} style={styles.settingIcon} resizeMode="contain" />
                <Text style={styles.settingLabel}>종류 <Text style={styles.requiredMark}>*</Text></Text>
              </View>
              <View style={styles.selectWrap}>
                <Pressable style={[styles.selectBox, openDropdown === 'type' && styles.selectBoxOpen, typeError && styles.selectBoxError]} onPress={() => setOpenDropdown((value) => value === 'type' ? null : 'type')}>
                  <Text numberOfLines={1} style={[styles.selectText, !itemType && styles.selectPlaceholder]}>{itemType ?? '선택해주세요'}</Text>
                  <Ionicons name={openDropdown === 'type' ? 'chevron-up' : 'chevron-down'} size={16} color="#444444" />
                </Pressable>
                {openDropdown === 'type' && (
                  <ScrollView style={styles.dropdownMenu} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {HISTORY_ITEM_TYPES.map((option) => (
                      <Pressable key={option} style={[styles.dropdownOption, option === itemType && styles.dropdownOptionActive]} onPress={() => { setItemType(option); setTypeError(false); setOpenDropdown(null); }}>
                        <Text style={[styles.dropdownOptionText, option === itemType && styles.dropdownOptionTextActive]}>{option}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}>
                <Image source={require('../../../assets/images/item-contamination.svg')} style={styles.settingIcon} resizeMode="contain" />
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
                <Image source={require('../../../assets/images/item-separation.svg')} style={styles.settingIcon} resizeMode="contain" />
                <View style={styles.settingCopy}>
                  <Text style={styles.settingLabel}>구성품 분리</Text>
                  <Text style={styles.settingDescription}>{getSeparationDescription(itemType)}</Text>
                </View>
              </View>
              <View style={styles.separationToggle}>
                {(['완료', '안 함', '해당 없음'] as const).map((option) => (
                  <Pressable
                    key={option}
                    style={[styles.separationOption, separationStatus === option && styles.cleanOptionActive]}
                    onPress={() => setSeparationStatus(option)}>
                    <Text style={styles.separationOptionText}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.modalActions, styles.itemModalActions]}>
              <Pressable style={styles.cancelAction} onPress={() => { setTypeError(false); setOpenDropdown(null); setItemPickerVisible(false); }}>
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
  screenScroll: { flex: 1 },
  screenContent: { paddingBottom: 24 },
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
  trashClosedImage: { width: 33, height: 31 },
  trashOpenImage: { width: 33, height: 36 },
  trashCount: { position: 'absolute', left: 0, right: 0, bottom: 5, textAlign: 'center', color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  dayNumber: { minWidth: 18, textAlign: 'center', color: '#333333', fontSize: 11, lineHeight: 17 },
  todayDay: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' },
  selectedDayText: { color: '#16A34A', fontWeight: '800' },
  todayDayText: { color: '#FFFFFF' },
  sectionDivider: { height: 7, backgroundColor: '#F5F5F5', borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  historyHeader: { height: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyDate: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: '#222222' },
  searchBar: {
    marginHorizontal: 16,
    marginTop: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#111827', outlineStyle: 'none' } as object,
  searchResults: { paddingTop: 8 },
  searchGroup: { paddingTop: 12 },
  searchDate: { paddingHorizontal: 16, paddingBottom: 10, fontSize: 15, lineHeight: 20, fontWeight: '800', color: '#222222' },
  entryList: { paddingHorizontal: 16, paddingBottom: 18, gap: 12 },
  entryRow: { height: 48, paddingHorizontal: 14, borderRadius: 4, backgroundColor: '#F1F1F1', flexDirection: 'row', alignItems: 'center' },
  entryTime: { marginLeft: 8, fontSize: 15, color: '#222222', fontWeight: '600' },
  entryAccent: { width: 2, height: 30, marginHorizontal: 10, backgroundColor: '#FF8A00' },
  moreButton: { height: 40, borderRadius: 4, borderWidth: 1, borderColor: '#E0E0E0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  moreText: { fontSize: 13, color: '#666666', fontWeight: '700' },
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
  itemModalBackdrop: { paddingHorizontal: 10 },
  modalTitle: { height: 61, textAlign: 'center', textAlignVertical: 'center', paddingTop: 21, fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#222222' },
  itemModalHeader: { height: 76, alignItems: 'center', justifyContent: 'center' },
  itemModalTitle: { textAlign: 'center', fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#111111' },
  requiredHint: { marginTop: 3, color: '#22A162', fontSize: 10, lineHeight: 14, fontWeight: '500' },
  requiredHintError: { color: '#E5484D' },
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
  itemModalActions: { height: 66 },
  cancelAction: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  confirmAction: { flex: 1, backgroundColor: '#55CE87', alignItems: 'center', justifyContent: 'center' },
  cancelActionText: { color: '#3F3F3F', fontSize: 16, fontWeight: '400' },
  confirmActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  settingRow: {
    height: 66,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
  },
  settingLabelWrap: { flex: 1, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeSettingRow: { zIndex: 4 },
  settingIcon: { width: 20, height: 22 },
  settingCopy: { flex: 1 },
  settingLabel: { flexShrink: 1, color: '#222222', fontSize: 15, lineHeight: 20, fontWeight: '700' },
  settingDescription: { marginTop: 1, color: '#777777', fontSize: 9, lineHeight: 12 },
  requiredMark: { color: '#22A162', fontWeight: '700' },
  selectBox: {
    width: 170,
    height: 34,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#CECECE',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectWrap: { width: 170, position: 'relative' },
  selectBoxOpen: { borderColor: '#22A162' },
  selectBoxError: { borderColor: '#E5484D', borderWidth: 1.5 },
  selectText: { flex: 1, marginRight: 6, color: '#555555', fontSize: 13, fontWeight: '500' },
  selectPlaceholder: { color: '#9CA3AF' },
  dropdownMenu: {
    position: 'absolute',
    top: 37,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: '#CECECE',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    zIndex: 10,
    maxHeight: 170,
  },
  dropdownOption: { height: 34, paddingHorizontal: 10, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  dropdownOptionActive: { backgroundColor: '#E4F8ED' },
  dropdownOptionText: { color: '#555555', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  dropdownOptionTextActive: { color: '#168A52', fontWeight: '700' },
  cleanToggle: { width: 126, height: 34, flexDirection: 'row', borderWidth: 1, borderColor: '#CECECE', borderRadius: 4, overflow: 'hidden' },
  cleanOption: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  cleanOptionActive: { backgroundColor: '#DDF9E9', borderWidth: 1, borderColor: '#25A765' },
  cleanOptionText: { color: '#222222', fontSize: 12, fontWeight: '600' },
  separationToggle: { width: 170, height: 34, flexDirection: 'row', borderWidth: 1, borderColor: '#CECECE', borderRadius: 4, overflow: 'hidden' },
  separationOption: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  separationOptionText: { color: '#222222', fontSize: 10, fontWeight: '600' },
});
