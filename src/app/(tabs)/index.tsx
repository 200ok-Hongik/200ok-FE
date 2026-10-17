import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SsokLogo } from '@/components/ui/SsokLogo';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedbackModal } from '@/components/scan/FeedbackModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OverlayModal } from '@/components/ui/OverlayModal';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { ScanSheet } from '@/components/scan/ScanSheet';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';
import { getLastSeenNotificationId, setLastSeenNotificationId } from '@/services/notificationSeen';
import {
  completeCalendar,
  getFrequentScanCategories,
  getHomeSummary,
  getProfile,
  getScanHistory,
  submitScanFeedback,
  type FrequentScanCategory,
  type HomeSummary,
  type UserProfile,
} from '@/services/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function RecyclingArt() {
  return (
    <Image
      source={require('../../../assets/images/recycling-bin.svg')}
      style={styles.recyclingArt}
      contentFit="contain"
    />
  );
}

function ReminderArt() {
  return (
    <View style={styles.reminderArtWrap}>
      <View style={styles.reminderGlowOne} />
      <View style={styles.reminderGlowTwo} />
      <View style={styles.reminderBlockOne} />
      <View style={styles.reminderBlockTwo} />
      <View style={styles.reminderPhone}>
        <View style={styles.reminderPhoneShine} />
        <View style={styles.reminderPhoneBar} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { feedback, scanId } = useLocalSearchParams<{ feedback?: string; scanId?: string }>();
  const [reminderVisible, setReminderVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [homeSummary, setHomeSummary] = useState<HomeSummary | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [monthlyRecycleCount, setMonthlyRecycleCount] = useState(0);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lastSeenNotificationId, setLastSeenId] = useState(0);
  const [frequentItems, setFrequentItems] = useState<FrequentScanCategory[]>([]);
  const [isFrequentLoading, setIsFrequentLoading] = useState(true);
  const [frequentError, setFrequentError] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const weekday = today ? WEEKDAYS[today.getDay()] : '';
  const currentMonth = today ? today.getMonth() + 1 : 0;

  useEffect(() => {
    setToday(new Date());
    setLastSeenId(getLastSeenNotificationId());
  }, []);

  // 마지막으로 확인한 번호보다 큰 알림이 있을 때만 종에 빨간 점을 띄운다.
  const notifications = homeSummary?.recentNotifications ?? [];
  const latestNotificationId = notifications.reduce((max, item) => Math.max(max, item.notificationId), 0);
  const hasUnreadNotification = latestNotificationId > lastSeenNotificationId;

  const openNotifications = () => {
    setNotificationsOpen(true);
    if (latestNotificationId > lastSeenNotificationId) {
      setLastSeenNotificationId(latestNotificationId);
      setLastSeenId(latestNotificationId);
    }
  };

  const handleFeedback = async (isAccurate: boolean) => {
    if (!scanId || isSubmittingFeedback) {
      setFeedbackVisible(false);
      return;
    }
    try {
      setIsSubmittingFeedback(true);
      await submitScanFeedback(Number(scanId), isAccurate ? '맞았어요' : '틀렸어요');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingFeedback(false);
      setFeedbackVisible(false);
    }
  };

  // 오늘 배출 일정을 "배출 완료"로 바꾼다. 완료된 일정은 이번 달 누적 재활용 횟수에 바로 반영한다.
  const handleCompleteSchedule = async (calendarId: number) => {
    if (completingId != null) return;
    try {
      setCompletingId(calendarId);
      setCompleteError(null);
      await completeCalendar(calendarId);
      setHomeSummary((current) =>
        current
          ? { ...current, todaySchedules: current.todaySchedules.map((item) => (item.calendarId === calendarId ? { ...item, isCompleted: true } : item)) }
          : current
      );
    } catch (err) {
      console.error(err);
      setCompleteError('배출 완료 처리를 하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setCompletingId(null);
    }
  };

  useEffect(() => {
    if (feedback === '1') {
      setReminderVisible(false);
      setFeedbackVisible(true);
      router.setParams({ feedback: undefined });
    }
  }, [feedback]);

  useFocusEffect(useCallback(() => {
    if (!today) return;
    let cancelled = false;
    const year = today.getFullYear();
    const month = today.getMonth();
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;

    Promise.all([getHomeSummary(), getProfile()])
      .then(([summary, userProfile]) => {
        if (!cancelled) {
          setHomeSummary(summary);
          setProfile(userProfile);
        }
      })
      .catch((error) => console.warn('홈 API를 불러오지 못했습니다.', error));

    // "N월 누적 재활용": 이번 달 스캔 기록(물건 수)을 센다. 기록 탭에 보이는 개수와 같은 기준이다.
    getScanHistory(startDate, endDate)
      .then((scans) => {
        if (!cancelled) setMonthlyRecycleCount(scans.reduce((total, scan) => total + scan.items.length, 0));
      })
      .catch((error) => console.warn('이번 달 스캔 기록을 불러오지 못했습니다.', error));

    // 내가 스캔한 기록에서 많이 나온 품목 순서대로 보여준다. (홈 요약과 따로 불러서 한쪽이 실패해도 다른 쪽은 보인다)
    setIsFrequentLoading(true);
    getFrequentScanCategories()
      .then((items) => {
        if (cancelled) return;
        setFrequentItems(items);
        setFrequentError(false);
      })
      .catch((error) => {
        console.warn('자주 스캔한 항목을 불러오지 못했습니다.', error);
        if (cancelled) return;
        setFrequentItems([]);
        setFrequentError(true);
      })
      .finally(() => {
        if (!cancelled) setIsFrequentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [today]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <SsokLogo width={78} />
          <NotificationBell hasUnread={hasUnreadNotification} onPress={openNotifications} />
        </View>

        <Text style={styles.heading}>
          오늘은 <Text style={styles.headingAccent}>{weekday}요일</Text> !
        </Text>
        <Text style={styles.subheading}>
          {profile?.name ?? '사용자'} 님, {homeSummary?.todaySchedules.length ? '오늘은 재활용품 배출일이에요.' : '오늘 예정된 배출 일정이 없어요.'}
        </Text>

        {!!homeSummary?.todaySchedules.length && (
          <View style={styles.scheduleList}>
            {homeSummary.todaySchedules.map((item) => {
              const scheduled = new Date(item.scheduledAt);
              const timeText = Number.isNaN(scheduled.getTime())
                ? ''
                : `${scheduled.getHours() < 12 ? '오전' : '오후'} ${scheduled.getHours() % 12 || 12}:${String(scheduled.getMinutes()).padStart(2, '0')}`;
              return (
                <View key={item.calendarId} style={styles.scheduleRow}>
                  <View style={styles.scheduleCopy}>
                    <Text style={styles.scheduleName} numberOfLines={1}>{item.categoryName}</Text>
                    <Text style={styles.scheduleTime}>{timeText} {item.isCompleted ? '배출 완료' : '배출 예정'}</Text>
                  </View>
                  {item.isCompleted ? (
                    <View style={styles.scheduleDone}>
                      <Ionicons name="checkmark" size={14} color="#16A34A" />
                      <Text style={styles.scheduleDoneText}>완료</Text>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${item.categoryName} 배출 완료`}
                      disabled={completingId != null}
                      onPress={() => handleCompleteSchedule(item.calendarId)}
                      style={({ pressed }) => [styles.scheduleButton, pressed && { opacity: 0.8 }]}>
                      {completingId === item.calendarId ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.scheduleButtonText}>배출 완료</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              );
            })}
            {completeError && <Text style={styles.scheduleError}>{completeError}</Text>}
          </View>
        )}

        <Card style={styles.scanCard}>
          <View style={styles.scanCardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.scanCardTitle}>Scan. Check. Recycle</Text>
              <Text style={styles.scanCardDesc}>사진을 찍고{'\n'}정확한 분리배출 정보를 확인하세요.</Text>
            </View>
            <RecyclingArt />
          </View>

          <View style={styles.scanCardButtons}>
            <Button
              label="스캔하러 가기"
              style={styles.cardButton}
              labelStyle={styles.cardButtonLabel}
              onPress={() => router.push('/scan/camera')}
            />
            <Button
              label="항목별 가이드"
              variant="secondary"
              style={styles.cardButton}
              labelStyle={styles.cardButtonLabel}
              onPress={() => router.push('/(tabs)/guide')}
            />
          </View>
        </Card>

        <View style={styles.statBadge}>
          <View style={styles.statBadgeInfo}>
            <Image
              source={require('../../../assets/images/monthly-recycle-icon.png')}
              style={styles.statBadgeIcon}
              contentFit="contain"
            />
            <Text style={styles.statBadgeLabel}>{currentMonth}월 누적 재활용</Text>
          </View>
          <View style={styles.statBadgeCountPill}>
            <Text style={styles.statBadgeCount}>+ {monthlyRecycleCount}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>자주 스캔한 항목</Text>
        {isFrequentLoading ? (
          <Text style={styles.frequentEmpty}>스캔 기록을 불러오고 있어요…</Text>
        ) : frequentError ? (
          <Text style={styles.frequentEmpty}>스캔 기록을 불러오지 못했어요.</Text>
        ) : frequentItems.length === 0 ? (
          <Text style={styles.frequentEmpty}>아직 스캔한 항목이 없어요.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.frequentScroller}
            contentContainerStyle={styles.frequentRow}>
            {frequentItems.map((item) => (
              <View key={item.categoryId} style={styles.frequentItem}>
                <View style={styles.frequentIconWrap}>
                  <Ionicons name={CATEGORY_ICONS[item.code] ?? 'scan-outline'} size={23} color="#171C1A" />
                </View>
                <Text style={styles.frequentLabel} numberOfLines={1}>{item.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      <OverlayModal visible={reminderVisible} animationType="fade">
        <View style={styles.reminderBackdrop}>
          <View style={styles.reminderCard}>
            <ReminderArt />
            <Text style={styles.reminderTitle}>오늘은 분리배출 하는 날!</Text>
            <Text style={styles.reminderDesc}>버리기 전 AI로 스캔하고,{'\n'}올바르게 분리배출해 주세요.</Text>
            <Button
              label="확인"
              onPress={() => setReminderVisible(false)}
              style={styles.reminderButton}
              labelStyle={styles.reminderButtonLabel}
            />

            <Pressable
              style={styles.reminderScanRow}
              onPress={() => {
                setReminderVisible(false);
                router.push('/scan/camera');
              }}>
              <View style={styles.reminderScanIcon}>
                <Ionicons name="camera" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reminderScanTitle}>AI 분리배출 스캔</Text>
                <Text style={styles.reminderScanDesc}>물건을 촬영하면{'\n'}배출 방법을 알려드려요.</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </OverlayModal>

      <ScanSheet
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="알림"
        subtitle="최근 알림 10건을 보여드려요."
        minHeight={300}>
        <View style={styles.notificationList}>
          {notifications.length === 0 ? (
            <Text style={styles.notificationEmpty}>받은 알림이 없어요.</Text>
          ) : (
            notifications.map((item) => {
              const created = new Date(item.createdAt);
              const when = Number.isNaN(created.getTime())
                ? ''
                : `${created.getMonth() + 1}.${created.getDate()} ${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}`;
              return (
                <View key={item.notificationId} style={styles.notificationItem}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  {!!item.content && <Text style={styles.notificationContent}>{item.content}</Text>}
                  {!!when && <Text style={styles.notificationTime}>{when}</Text>}
                </View>
              );
            })
          )}
        </View>
      </ScanSheet>

      <FeedbackModal visible={feedbackVisible} loading={isSubmittingFeedback} onAnswer={handleFeedback} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  frequentEmpty: { marginTop: 14, fontSize: 13, color: '#777777' },
  scheduleList: { marginTop: 14, gap: 8 },
  scheduleRow: {
    minHeight: 60,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 12,
    backgroundColor: '#F1FBF5',
    borderWidth: 1,
    borderColor: '#CDEFD9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleCopy: { flex: 1, paddingRight: 10 },
  scheduleName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#111827' },
  scheduleTime: { marginTop: 2, fontSize: 12, lineHeight: 16, color: '#6B7280' },
  scheduleButton: { minWidth: 76, height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  scheduleButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  scheduleDone: { height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#DCFCE7', flexDirection: 'row', alignItems: 'center', gap: 4 },
  scheduleDoneText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  scheduleError: { fontSize: 12, lineHeight: 17, color: '#EF4444', textAlign: 'center' },
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 18 },
  header: {
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { color: '#20B56B', fontSize: 23, lineHeight: 28, fontWeight: '800', letterSpacing: -1.4 },
  notificationList: { marginTop: 18, paddingBottom: 24 },
  notificationEmpty: { paddingVertical: 28, textAlign: 'center', fontSize: 14, color: '#6B7280' },
  notificationItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  notificationTitle: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: '#111827' },
  notificationContent: { marginTop: 3, fontSize: 13, lineHeight: 19, color: '#505050' },
  notificationTime: { marginTop: 6, fontSize: 12, color: '#9CA3AF' },
  heading: { marginTop: 14, fontSize: 26, lineHeight: 33, fontWeight: '800', color: Colors.text, letterSpacing: -0.8 },
  headingAccent: { color: Colors.primaryDark },
  subheading: {
    marginTop: 5,
    color: '#2F3331',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  scanCard: {
    marginTop: 42,
    minHeight: 300,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#F5F9F7',
    justifyContent: 'space-between',
  },
  scanCardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  scanCardTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: Colors.text, letterSpacing: -0.35 },
  scanCardDesc: { marginTop: 14, color: '#303432', fontSize: 13, lineHeight: 19, fontWeight: '400' },
  recyclingArt: {
    width: 112,
    height: 125,
    marginTop: -5,
    marginRight: -4,
  },
  scanCardButtons: { gap: 8 },
  cardButton: { height: 48, borderRadius: 7 },
  cardButtonLabel: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  statBadge: {
    marginTop: 12,
    alignSelf: 'center',
    width: 210,
    height: 27,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 2,
    borderRadius: 13.5,
    backgroundColor: '#FF8908',
  },
  statBadgeInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statBadgeIcon: { width: 21, height: 21 },
  statBadgeLabel: { color: '#FFFFFF', fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: -0.3 },
  statBadgeCountPill: {
    width: 62,
    height: 23,
    borderRadius: 11.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeCount: { color: '#169B5C', fontSize: 12, lineHeight: 15, fontWeight: '700' },
  sectionTitle: {
    marginTop: 24,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  frequentScroller: {
    marginTop: 16,
    marginLeft: -5,
    marginRight: -16,
    paddingBottom: 7,
  },
  frequentRow: { flexDirection: 'row', gap: 16, paddingLeft: 5, paddingRight: 16 },
  frequentItem: { width: 64, alignItems: 'center', gap: 9 },
  frequentIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#E8F8F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequentLabel: {
    color: '#4B4F4D',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },

  reminderBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 18, 13, 0.82)',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  reminderCard: { flex: 1, width: '100%', alignItems: 'center', paddingTop: 190 },
  reminderArtWrap: {
    width: 150,
    height: 140,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  reminderGlowOne: {
    position: 'absolute',
    width: 150,
    height: 34,
    borderRadius: 50,
    backgroundColor: 'rgba(34,197,94,0.12)',
    transform: [{ rotate: '8deg' }],
  },
  reminderGlowTwo: {
    position: 'absolute',
    width: 110,
    height: 30,
    borderRadius: 40,
    backgroundColor: 'rgba(34,197,94,0.1)',
    transform: [{ rotate: '-15deg' }],
  },
  reminderBlockOne: {
    position: 'absolute',
    right: 24,
    top: 27,
    width: 38,
    height: 38,
    borderRadius: 3,
    backgroundColor: '#00E49B',
  },
  reminderBlockTwo: {
    position: 'absolute',
    left: 39,
    top: 48,
    width: 47,
    height: 47,
    borderRadius: 3,
    backgroundColor: 'rgba(212,255,241,0.72)',
  },
  reminderPhone: {
    width: 56,
    height: 86,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(184,200,194,0.7)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 5,
  },
  reminderPhoneShine: {
    position: 'absolute',
    top: -6,
    left: -12,
    width: 42,
    height: 86,
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ rotate: '18deg' }],
  },
  reminderPhoneBar: { width: 28, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  reminderTitle: { color: '#FFFFFF', fontSize: 19, lineHeight: 24, fontWeight: '800' },
  reminderDesc: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
  },
  reminderButton: { marginTop: 14, width: 186, height: 50, borderRadius: 7 },
  reminderButtonLabel: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  reminderScanRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 86,
    minHeight: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: 'rgba(7, 58, 39, 0.78)',
    borderRadius: 14,
    padding: 16,
  },
  reminderScanIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderScanTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  reminderScanDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 16, marginTop: 3 },

});
