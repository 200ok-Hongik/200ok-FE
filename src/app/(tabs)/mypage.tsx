import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { FrequentItems } from '@/constants/mockData';
import { getProfile, logout, type UserProfile } from '@/services/api';

export default function MyPageScreen() {
  const [notifyOn, setNotifyOn] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((error) => console.warn('프로필을 불러오지 못했습니다.', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.warn('로그아웃 API 호출에 실패했습니다.', error);
    } finally {
      if (Platform.OS === 'web') {
        window.location.replace('/');
      } else {
        router.dismissAll();
        router.replace('/');
      }
    }
  };

  const regionLabel = profile?.region
    ? `${profile.region.sido} ${profile.region.gugun} ${profile.region.dong}`
    : '지역을 설정해 주세요';

  return (
    <LinearGradient colors={[Colors.mint, Colors.background]} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={styles.logo}>SSOK</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.profileText}>
              {profile?.name ?? '사용자'} 님,{'\n'}오늘도 SSOK과 함께해요!
            </Text>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={28} color={Colors.primaryDark} />
              </View>
              <View style={styles.avatarEdit}>
                <Ionicons name="pencil" size={11} color="#FFFFFF" />
              </View>
            </View>
          </View>

          <Pressable style={styles.regionCard} onPress={() => router.push('/setting')}>
            <Text style={styles.regionText}>지역 | {regionLabel}</Text>
            <Text style={styles.regionLink}>변경하기  ›</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>자주 스캔한 항목</Text>
          <View style={styles.frequentRow}>
            {FrequentItems.map((item) => (
              <View key={item.id} style={styles.frequentItem}>
                <View style={styles.frequentIconWrap}>
                  <Ionicons name={item.icon} size={20} color={Colors.text} />
                </View>
                <Text style={styles.frequentLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>설정 및 관리</Text>
          <View style={styles.settingsList}>
            <Pressable style={styles.settingRow}>
              <Text style={styles.settingLabel}>내 정보 관리</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </Pressable>
            <Pressable style={styles.settingRow}>
              <Text style={styles.settingLabel}>계정 연동 관리</Text>
              <View style={styles.kakaoDot} />
            </Pressable>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>알림 설정</Text>
              <Switch
                value={notifyOn}
                onValueChange={setNotifyOn}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Pressable
              disabled={isLoggingOut}
              style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
              onPress={handleLogout}>
              <Text style={styles.logoutLabel}>
                {isLoggingOut ? '로그아웃 중이에요…' : '로그아웃'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  topRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  pressed: { opacity: 0.6 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  profileText: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, lineHeight: 32 },
  avatarWrap: { width: 56, height: 56 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  regionCard: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  regionText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  regionLink: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  sectionTitle: { marginTop: Spacing.xxl, fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  frequentRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
  frequentItem: { alignItems: 'center', gap: Spacing.xs },
  frequentIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequentLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  settingsList: { marginTop: Spacing.md, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  logoutLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.danger },
  kakaoDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.kakao },
});
