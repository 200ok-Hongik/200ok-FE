import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { FrequentItems } from '@/constants/mockData';
import { getProfile, logout, type UserProfile } from '@/services/api';

export default function MyPageScreen() {
  const [notifyOn, setNotifyOn] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProfile().then((data) => !cancelled && setProfile(data))
      .catch((error) => console.warn('프로필을 불러오지 못했습니다.', error));
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try { await logout(); } catch (error) { console.warn('로그아웃 API 호출에 실패했습니다.', error); }
    finally {
      if (Platform.OS === 'web') window.location.replace('/');
      else { router.dismissAll(); router.replace('/'); }
    }
  };

  const region = profile?.region
    ? `${profile.region.sido} ${profile.region.gugun} ${profile.region.dong}`
    : '지역을 설정해 주세요';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.logo}>SSOK</Text>
          <Pressable hitSlop={12} onPress={() => router.push('/setting')}>
            <Ionicons name="settings-outline" size={24} color="#202020" />
          </Pressable>
        </View>

        <View style={s.profileRow}>
          <Text style={s.greeting}>
            <Text style={s.name}>{profile?.name ?? '사용자'}</Text> 님,{'\n'}오늘도{'\n'}SSOK과 함께해요!
          </Text>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              {profile?.profileImageUrl
                ? <Image source={{ uri: profile.profileImageUrl }} style={s.avatarImage} />
                : <Text style={s.avatarFallback}>🐹</Text>}
            </View>
            <Pressable style={s.avatarEdit} onPress={() => router.push('/setting')}>
              <Ionicons name="pencil" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={s.regionCard}>
          <View style={s.regionCopy}>
            <Text style={s.regionCaption}>지역</Text>
            <Text style={s.regionValue} numberOfLines={1}>{region}</Text>
          </View>
          <Pressable style={s.changeButton} onPress={() => router.push('/setting')}>
            <Text style={s.changeText}>변경하기</Text>
          </Pressable>
        </View>

        <Text style={s.sectionTitle}>자주 스캔한 항목</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.frequentRow}>
          {FrequentItems.map((item) => (
            <View key={item.id} style={s.frequentItem}>
              <View style={s.frequentIcon}>
                <Ionicons name={item.icon} size={21} color="#171717" />
              </View>
              <Text style={s.frequentLabel}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={s.divider} />
        <Text style={[s.sectionTitle, s.settingsTitle]}>설정 및 관리</Text>
        <View style={s.settingsList}>
          <Pressable style={s.settingRow}><Text style={s.settingLabel}>내 정보 관리</Text></Pressable>
          <Pressable style={s.settingRow}>
            <Text style={s.settingLabel}>계정 연동 관리</Text>
            <View style={s.kakao}><Ionicons name="chatbubble" size={11} color="#251B00" /></View>
          </Pressable>
          <View style={s.settingRow}>
            <Text style={s.settingLabel}>알림 설정</Text>
            <Switch value={notifyOn} onValueChange={setNotifyOn}
              trackColor={{ true: '#36D16E', false: '#D5D5D5' }} thumbColor="#FFFFFF" style={s.switch} />
          </View>
          <Pressable disabled={isLoggingOut} style={s.settingRow} onPress={handleLogout}>
            <Text style={s.logout}>{isLoggingOut ? '로그아웃 중…' : '로그아웃'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingBottom: 28 },
  header: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 23, lineHeight: 28, fontWeight: '800', color: '#20B56B', letterSpacing: -1.4 },
  profileRow: { paddingHorizontal: 17, paddingTop: 17, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greeting: { fontSize: 28, lineHeight: 39, fontWeight: '700', color: '#202020', letterSpacing: -0.7 },
  name: { color: '#20B56B', fontWeight: '700' },
  avatarWrap: { width: 98, height: 106, marginTop: -2 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#128653', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarFallback: { fontSize: 61, lineHeight: 74 },
  avatarEdit: { position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FF8A00', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  regionCard: { marginTop: 31, marginHorizontal: 15, height: 88, paddingHorizontal: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F7FAF8', borderRadius: 9, borderWidth: 1, borderColor: '#E1E7E3', shadowColor: '#000000', shadowOpacity: 0.09, shadowRadius: 5, shadowOffset: { width: 0, height: 1 } },
  regionCopy: { flex: 1, marginRight: 12 },
  regionCaption: { fontSize: 13, color: '#555555', marginBottom: 3 },
  regionValue: { fontSize: 16, fontWeight: '700', color: '#202020', letterSpacing: -0.5 },
  changeButton: { width: 68, height: 40, borderRadius: 8, backgroundColor: '#20B56B', alignItems: 'center', justifyContent: 'center' },
  changeText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  sectionTitle: { marginTop: 62, marginHorizontal: 16, fontSize: 17, fontWeight: '700', color: '#202020' },
  frequentRow: { paddingHorizontal: 16, paddingTop: 26, gap: 16 },
  frequentItem: { width: 64, alignItems: 'center' },
  frequentIcon: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#E4F7F0', alignItems: 'center', justifyContent: 'center' },
  frequentLabel: { marginTop: 10, fontSize: 12, color: '#333333' },
  divider: { height: 7, marginTop: 39, backgroundColor: '#F0F0F0' },
  settingsTitle: { marginTop: 40 },
  settingsList: { marginTop: 25, marginHorizontal: 16, gap: 8 },
  settingRow: { height: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F3F3', borderRadius: 8 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#4A4A4A' },
  logout: { fontSize: 15, fontWeight: '600', color: '#FF4141' },
  kakao: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFDB00', alignItems: 'center', justifyContent: 'center' },
  switch: { transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }], marginRight: -4 },
});
