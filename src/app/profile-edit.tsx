import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/ui/Text';
import { statusBarInset } from '@/constants/scanDesign';
import { getProfile, updateProfile, type UserProfile } from '@/services/api';

// 프로필 수정 화면. Figma SVG(ssok-profile-edit)의 좌표·색을 옮겼다.
const GREEN = '#22C55E';
const GREEN_DARK = '#16A34A';
const MINT = '#ECFDF5';
const INK = '#111827';
const MUTED = '#6B7280';
const NAME_PATTERN = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]{2,20}$/;

function AvatarGlyph() {
  return (
    <Svg width={112} height={112} viewBox="139 124 112 112" fill="none">
      <Circle cx={195} cy={180} r={56} fill={MINT} />
      <Circle cx={195} cy={166} r={17} stroke={GREEN_DARK} strokeWidth={4} />
      <Path d="M165 216C168 193 180 184 195 184C210 184 222 193 225 216" stroke={GREEN_DARK} strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

function CameraBadge() {
  return (
    <Svg width={39} height={39} viewBox="213.5 198.5 39 39" fill="none">
      <Circle cx={233} cy={218} r={19.5} fill="#FFFFFF" />
      <Circle cx={233} cy={218} r={16} fill={GREEN} />
      <Path d="M225 214.5H229L231 212H235L237 214.5H241V224H225V214.5Z" stroke="#FFFFFF" strokeWidth={1.7} strokeLinejoin="round" />
      <Circle cx={233} cy={219} r={3} stroke="#FFFFFF" strokeWidth={1.7} />
    </Svg>
  );
}

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setName(data.name ?? '');
      })
      .catch((error) => {
        console.warn('프로필을 불러오지 못했습니다.', error);
        if (!cancelled) setMessage('프로필을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = name.trim();
  const isValid = NAME_PATTERN.test(trimmed);
  const isChanged = !!profile && trimmed !== (profile.name ?? '');
  const canSave = !!profile && isValid && isChanged && !isSaving;
  const showInvalid = touched && !isValid;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/mypage');
  };

  const handleSave = async () => {
    if (!canSave || !profile) return;
    try {
      setIsSaving(true);
      setMessage(null);
      // 사진은 바꾸지 않으므로 기존 주소를 그대로 보낸다. (서버가 빈 값을 지우는 것으로 처리할 수 있어서)
      await updateProfile({ name: trimmed, profileImageUrl: profile.profileImageUrl });
      handleBack();
    } catch (error) {
      console.warn('프로필을 저장하지 못했습니다.', error);
      setMessage('프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFFFF', MINT]} locations={[0, 0.62, 1]} style={styles.flex}>
      <View style={{ paddingTop: statusBarInset(insets.top), backgroundColor: '#FFFFFF' }}>
        <View style={styles.appBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" hitSlop={12} onPress={handleBack} style={styles.back}>
            <Svg width={12} height={20} viewBox="23 52 10 18" fill="none">
              <Path d="M31.5 53L24 61L31.5 69" stroke={INK} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Text style={styles.appBarTitle}>프로필 수정</Text>
        </View>
        <View style={styles.appBarLine} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.avatarWrap}>
          {profile?.profileImageUrl ? (
            <Image source={{ uri: profile.profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <AvatarGlyph />
          )}
          <View style={styles.badge}>
            <CameraBadge />
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setMessage('프로필 사진 변경은 준비 중이에요.')}>
          <Text style={styles.changePhoto}>프로필 사진 변경</Text>
        </Pressable>

        <Text style={styles.label}>이름</Text>
        <View style={[styles.field, focused && styles.fieldFocused, showInvalid && styles.fieldInvalid]}>
          <TextInput
            value={name}
            onChangeText={(value) => {
              setName(value);
              setTouched(true);
              setMessage(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            editable={!isLoading}
            maxLength={20}
            autoCorrect={false}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="이름을 입력해주세요"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
          {name.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="이름 지우기" hitSlop={10} onPress={() => { setName(''); setTouched(true); }} style={styles.clear}>
              <Svg width={20} height={20} viewBox="327 361 20 20" fill="none">
                <Circle cx={337} cy={371} r={10} fill="#F3F4F6" />
                <Path d="M333.5 367.5L340.5 374.5M340.5 367.5L333.5 374.5" stroke="#9CA3AF" strokeWidth={1.6} strokeLinecap="round" />
              </Svg>
            </Pressable>
          )}
        </View>
        <Text style={[styles.hint, showInvalid && styles.hintInvalid]}>한글, 영문, 숫자를 사용해 2~20자로 입력해주세요.</Text>

        <View style={styles.notice}>
          <Svg width={20} height={20} viewBox="38 476 20 20" fill="none" style={styles.noticeIcon}>
            <Circle cx={48} cy={486} r={9} stroke={GREEN_DARK} strokeWidth={1.8} />
            <Path d="M48 484V493" stroke={GREEN_DARK} strokeWidth={1.8} strokeLinecap="round" />
            <Circle cx={48} cy={480.5} r={1.2} fill={GREEN_DARK} />
          </Svg>
          <Text style={styles.noticeText}>{'변경한 이름과 프로필 사진은 마이페이지와\n배출 기록에 동일하게 표시돼요.'}</Text>
        </View>

        {message && <Text style={styles.message}>{message}</Text>}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          onPress={handleSave}
          style={({ pressed }) => [styles.save, !canSave && styles.saveDisabled, pressed && canSave && styles.pressed]}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>변경사항 저장</Text>}
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },

  appBar: { height: 58, justifyContent: 'center' },
  back: { position: 'absolute', left: 22, height: 40, width: 24, justifyContent: 'center', zIndex: 1 },
  appBarTitle: { textAlign: 'center', fontSize: 17, lineHeight: 22, fontWeight: '700', color: INK },
  appBarLine: { height: 1, backgroundColor: '#E5E7EB' },

  scroll: { paddingTop: 34, paddingHorizontal: 24, paddingBottom: 24 },
  avatarWrap: { alignSelf: 'center', width: 112, height: 112 },
  avatarImage: { width: 112, height: 112, borderRadius: 56, backgroundColor: MINT },
  // 시안 기준: 원 중심에서 오른쪽·아래로 38px 떨어진 곳이 배지 중심 (배지 크기 39)
  badge: { position: 'absolute', left: 74.5, top: 74.5 },
  changePhoto: { marginTop: 21, textAlign: 'center', fontSize: 14, lineHeight: 20, fontWeight: '700', color: GREEN_DARK },

  label: { marginTop: 36, fontSize: 14, lineHeight: 20, fontWeight: '700', color: INK },
  field: {
    marginTop: 14,
    height: 54,
    borderRadius: 13.25,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 18,
  },
  fieldFocused: { borderColor: GREEN },
  fieldInvalid: { borderColor: '#EF4444' },
  input: { flex: 1, height: 52, fontSize: 16, fontWeight: '700', color: INK, outlineStyle: 'none' } as object,
  clear: { marginLeft: 8 },
  hint: { marginTop: 14, marginLeft: 2, fontSize: 12, lineHeight: 17, fontWeight: '700', color: MUTED },
  hintInvalid: { color: '#EF4444' },

  notice: {
    marginTop: 33,
    borderRadius: 14,
    backgroundColor: MINT,
    minHeight: 84,
    paddingLeft: 14,
    paddingRight: 16,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noticeIcon: { marginTop: 1 },
  noticeText: { flex: 1, marginLeft: 12, fontSize: 12, lineHeight: 20, fontWeight: '700', color: GREEN_DARK },
  message: { marginTop: 16, textAlign: 'center', fontSize: 13, lineHeight: 18, color: MUTED },

  footer: { paddingHorizontal: 24, paddingTop: 12 },
  save: {
    height: 54,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(34,197,94,0.2)',
  },
  saveDisabled: { backgroundColor: '#A7E8C2', boxShadow: 'none' },
  saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
