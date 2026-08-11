import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OverlayModal } from '@/components/ui/OverlayModal';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { getHomeSummary, getProfile, submitScanFeedback, type HomeSummary, type UserProfile } from '@/services/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

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
  const [reminderVisible, setReminderVisible] = useState(true);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [homeSummary, setHomeSummary] = useState<HomeSummary | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const hasUnreadNotifications = (homeSummary?.recentNotifications.length ?? 0) > 0;
  const today = new Date();
  const weekday = WEEKDAYS[today.getDay()];

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

  useEffect(() => {
    if (feedback === '1') {
      setReminderVisible(false);
      setFeedbackVisible(true);
      router.setParams({ feedback: undefined });
    }
  }, [feedback]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getHomeSummary(), getProfile()])
      .then(([summary, userProfile]) => {
        if (!cancelled) {
          setHomeSummary(summary);
          setProfile(userProfile);
        }
      })
      .catch((error) => console.warn('홈 API를 불러오지 못했습니다.', error));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebStatusBar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>SSOK</Text>
          <View style={styles.notificationWrap}>
            <Ionicons name="notifications" size={24} color="#16864E" />
            {hasUnreadNotifications && <View style={styles.notificationDot} />}
          </View>
        </View>

        <Text style={styles.heading}>
          오늘은 <Text style={styles.headingAccent}>{weekday}요일</Text> !
        </Text>
        <Text style={styles.subheading}>
          {profile?.name ?? '사용자'} 님, {homeSummary?.todaySchedules.length ? '오늘은 재활용품 배출일이에요.' : '오늘 예정된 배출 일정이 없어요.'}
        </Text>

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
            <Ionicons name="trash" size={17} color="#FFFFFF" />
            <Text style={styles.statBadgeLabel}>7월 누적 재활용</Text>
          </View>
          <View style={styles.statBadgeCountPill}>
            <Text style={styles.statBadgeCount}>+ 12</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>자주 스캔한 항목</Text>
        <Image
          source={require('../../../assets/images/frequent-items.png')}
          style={styles.frequentItemsImage}
          contentFit="contain"
          contentPosition="left center"
        />
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

      <OverlayModal visible={feedbackVisible} animationType="fade">
        <View style={styles.feedbackBackdrop}>
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeartWrap}>
              <Ionicons name="heart" size={30} color={Colors.primary} />
            </View>
            <Text style={styles.feedbackGreeting}>반가워요. 민정 님,</Text>
            <Text style={styles.feedbackTitle}>오늘은 무엇을 버릴 예정인가요?</Text>

            <View style={styles.feedbackDivider} />

            <Text style={styles.feedbackQuestion}>AI 인식이 정확했나요?</Text>
            <Text style={styles.feedbackSubtext}>소중한 피드백을 바탕으로{'\n'}AI의 정확도를 더욱 높여갈게요.</Text>

            <View style={styles.feedbackButtons}>
              <Button
                label="맞았어요"
                loading={isSubmittingFeedback}
                style={styles.feedbackButtonFlex}
                onPress={() => handleFeedback(true)}
              />
              <Button
                label="틀렸어요"
                variant="secondary"
                disabled={isSubmittingFeedback}
                style={styles.feedbackButtonFlex}
                onPress={() => handleFeedback(false)}
              />
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
  scroll: { paddingHorizontal: 16, paddingBottom: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 10,
  },
  logo: {
    color: '#12A85F',
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  notificationWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  heading: { marginTop: 14, fontSize: 26, lineHeight: 33, fontWeight: '800', color: Colors.text, letterSpacing: -0.8 },
  headingAccent: { color: Colors.primaryDark },
  subheading: {
    marginTop: 5,
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  scanCard: {
    marginTop: 42,
    minHeight: 300,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F5F9F7',
    justifyContent: 'space-between',
  },
  scanCardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  scanCardTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: Colors.text },
  scanCardDesc: { marginTop: 12, color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  recyclingArt: {
    width: 112,
    height: 125,
    marginTop: -5,
    marginRight: -4,
  },
  scanCardButtons: { gap: 8 },
  cardButton: { height: 48, borderRadius: 7 },
  cardButtonLabel: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  statBadge: {
    marginTop: 12,
    alignSelf: 'center',
    width: 200,
    height: 27,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 2,
    borderRadius: 13.5,
    backgroundColor: '#FF8908',
  },
  statBadgeInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statBadgeLabel: { color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: -0.3 },
  statBadgeCountPill: {
    width: 62,
    height: 23,
    borderRadius: 11.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeCount: { color: '#169B5C', fontSize: 11, lineHeight: 14, fontWeight: '800' },
  sectionTitle: {
    marginTop: 24,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  frequentItemsImage: {
    width: 359,
    height: 89,
    marginTop: 16,
    marginLeft: -5,
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

  feedbackBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  feedbackCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  feedbackHeartWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  feedbackGreeting: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  feedbackTitle: { fontSize: FontSize.lg, color: Colors.text, fontWeight: '800', marginTop: 2 },
  feedbackDivider: { height: 1, backgroundColor: Colors.border, width: '100%', marginVertical: Spacing.lg },
  feedbackQuestion: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  feedbackSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 19,
  },
  feedbackButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl, width: '100%' },
  feedbackButtonFlex: { flex: 1 },
});
