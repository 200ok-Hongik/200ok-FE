import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { PhotoBoxes } from '@/components/scan/PhotoBoxes';
import { ScanSheet } from '@/components/scan/ScanSheet';
import { Text } from '@/components/ui/Text';
import { buildGeneralWasteGuide, GENERAL_WASTE_NAME } from '@/constants/generalWaste';
import { categoryDisplayName, ScanColors } from '@/constants/scanDesign';
import { describeState } from '@/constants/scanStates';
import { getObjectDisposalGuide, getTrashCategoryGuide, type DisposalGuide } from '@/services/api';
import type { ScheduleItemInfo } from '@/services/scheduleItems';

type Props = {
  visible: boolean;
  onClose: () => void;
  // 일정 카드에 보이는 품목 이름과 "오후 6:00 배출 예정" 같은 문구
  name: string;
  statusText: string;
  info?: ScheduleItemInfo;
  completed: boolean;
  completing: boolean;
  onComplete: () => void;
};

type Detail = { states: string[]; steps: string[]; caution: string; discharge: string };

const PHOTO_HEIGHT = 240;

// 기본 일반쓰레기 안내의 주의 문구는 "이전 화면에서…"라서 홈에서 연 시트에는 맞지 않는다.
const GENERAL_WASTE_CAUTION = '물건을 잘못 인식했다면 다시 스캔해서 종류를 바꿔 주세요.';

function generalWasteDetail(scanId: number, decisionId: number, categoryId: number): Detail {
  return { ...fromGuide(buildGeneralWasteGuide(scanId, decisionId, categoryId)), caution: GENERAL_WASTE_CAUTION };
}

function fromGuide(guide: DisposalGuide): Detail {
  const steps: string[] = [];
  for (const check of guide.checkItems) {
    // 이미 지켜진 항목은 할 일이 아니라서 뺀다.
    if (!check.isSatisfied && check.guideMessage && !steps.includes(check.guideMessage)) steps.push(check.guideMessage);
  }
  const last = guide.finalGuideMessage || guide.guideMessage;
  if (last && !steps.includes(last)) steps.push(last);
  return {
    states: guide.checkItems
      .map((check) => describeState(check.checkItemName, check.statusValue))
      .filter((text): text is string => text != null),
    steps,
    caution: guide.cautionMessage,
    discharge: [guide.schedule?.dischargeDays, guide.schedule?.dischargeTime].filter(Boolean).join(' · '),
  };
}

// 일정을 만든 스캔의 배출 안내를 받아 온다. 그 스캔을 못 찾으면 품목 자체의 안내로 대신한다.
async function loadDetail(name: string, info?: ScheduleItemInfo): Promise<Detail> {
  const general = categoryDisplayName(undefined, name) === GENERAL_WASTE_NAME;
  if (info?.scan) {
    try {
      return fromGuide(await getObjectDisposalGuide(info.scan.scanId, info.scan.objectId));
    } catch (error) {
      // 일반쓰레기(인식 불가)는 서버가 안내를 주지 않으니 앱의 기본 안내로 대신한다.
      if (!general) throw error;
      return generalWasteDetail(info.scan.scanId, info.decisionId, info.categoryId);
    }
  }
  if (general) return generalWasteDetail(0, info?.decisionId ?? 0, info?.categoryId ?? 0);
  if (!info) return { states: [], steps: [], caution: '', discharge: '' };
  const guide = await getTrashCategoryGuide(info.categoryId);
  return {
    states: [],
    steps: [...guide.checkItems.map((check) => check.guideMessage), guide.guideMessage].filter(Boolean),
    caution: guide.cautionMessage,
    discharge: '',
  };
}

function formatScannedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 오늘 배출 일정 카드를 눌렀을 때 뜨는 시트. 어떤 물건이었는지 사진과 상태, 배출 방법을 보여준다.
export function ScheduleDetailSheet({ visible, onClose, name, statusText, info, completed, completing, onComplete }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState(0);
  const decisionId = info?.decisionId;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setDetail(null);
    setFailed(false);
    loadDetail(name, info)
      .then((result) => !cancelled && setDetail(result))
      .catch((error) => {
        console.warn('일정 상세 안내를 불러오지 못했습니다.', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // info 객체는 홈이 다시 그려질 때마다 같은 값으로 바뀔 수 있어서, 일정을 구분하는 번호로만 다시 받는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, decisionId, name]);

  const scan = info?.scan;
  const scannedAt = scan ? formatScannedAt(scan.scannedAt) : '';

  return (
    <ScanSheet visible={visible} onClose={onClose} title={name} subtitle={statusText} minHeight={560}>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.body}>
        {scan && width > 0 && (
          <View style={styles.photo}>
            <PhotoBoxes
              uri={scan.imageUrl}
              items={scan.bbox ? [{ id: 'item', bbox: scan.bbox }] : []}
              width={width}
              height={PHOTO_HEIGHT}
              radius={14}
            />
          </View>
        )}
        {!!scannedAt && <Text style={styles.scanned}>{`${scannedAt}에 스캔한 물건이에요`}</Text>}
        {!scan && <Text style={styles.scanned}>이 일정의 스캔 사진을 찾지 못했어요. 품목 안내만 보여드려요.</Text>}

        {!detail && !failed && <ActivityIndicator color={ScanColors.green} style={styles.loading} />}
        {failed && <Text style={styles.error}>배출 안내를 불러오지 못했어요. 잠시 후 다시 열어 주세요.</Text>}

        {detail && (
          <>
            {detail.states.length > 0 && (
              <>
                <Text style={styles.label}>스캔된 상태</Text>
                <View style={styles.chips}>
                  {detail.states.map((text) => (
                    <View key={text} style={styles.chip}>
                      <Text style={styles.chipText}>{text}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {detail.steps.length > 0 && (
              <>
                <Text style={styles.label}>배출 방법</Text>
                <View style={styles.steps}>
                  {detail.steps.map((step, index) => (
                    <Text key={`${index}-${step}`} style={styles.step}>{`${index + 1}. ${step}`}</Text>
                  ))}
                </View>
              </>
            )}

            {!!detail.caution && (
              <>
                <Text style={styles.label}>주의 사항</Text>
                <Text style={styles.caution}>{detail.caution}</Text>
              </>
            )}

            {!!detail.discharge && (
              <>
                <Text style={styles.label}>배출 일정</Text>
                <Text style={styles.step}>{detail.discharge}</Text>
              </>
            )}
          </>
        )}

        {!completed && (
          <Pressable
            accessibilityRole="button"
            disabled={completing}
            onPress={onComplete}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
            {completing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>배출 완료</Text>}
          </Pressable>
        )}
      </View>
    </ScanSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 24 },
  photo: { marginTop: 20 },
  scanned: { marginTop: 12, fontSize: 13, lineHeight: 18, color: ScanColors.gray },
  loading: { marginTop: 28 },
  error: { marginTop: 24, fontSize: 14, lineHeight: 20, color: '#B42318' },
  label: { marginTop: 24, fontSize: 14, lineHeight: 18, fontWeight: '700', color: ScanColors.ink },
  chips: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: ScanColors.chipGray, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600', color: ScanColors.ink },
  steps: { marginTop: 10, gap: 6 },
  step: { marginTop: 0, fontSize: 15, lineHeight: 22, color: ScanColors.ink },
  caution: { marginTop: 10, fontSize: 14, lineHeight: 20, color: ScanColors.gray },
  button: { marginTop: 28, height: 48, borderRadius: 10, backgroundColor: ScanColors.green, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
