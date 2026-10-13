import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { statusBarInset } from '@/constants/scanDesign';

// 로그인·회원가입 문의(도움말 센터) 화면. Figma SVG(SSOK_로그인회원가입_도움말센터)의 좌표·색을 그대로 옮겼다.
const GREEN = '#22C55E';
const GREEN_DARK = '#16A34A';
const MINT = '#DCFCE7';
const INK = '#111827';
const MUTED = '#6B7280';

type FaqIcon = 'plus' | 'pin' | 'trash';

// 질문은 시안 그대로. 답변은 시안에 없어서 임시 문구이니 운영 기준에 맞게 확정이 필요하다.
const FAQS: { id: string; question: string; answer: string; icon: FaqIcon }[] = [
  {
    id: 'kakao-fail',
    question: '카카오 로그인이 계속 실패해요',
    answer: '브라우저의 쿠키·팝업 차단 설정을 확인한 뒤 다시 시도해 주세요. 계속 실패하면 아래 문의하기로 알려주세요.',
    icon: 'plus',
  },
  {
    id: 'link-account',
    question: '기존 계정과 연결하고 싶어요',
    answer: '이전에 사용한 것과 같은 카카오 계정으로 로그인하면 기존 기록이 이어져요.',
    icon: 'plus',
  },
  {
    id: 'region',
    question: '지역 설정을 잘못 입력했어요',
    answer: '마이페이지의 지역 변경에서 언제든 다시 선택할 수 있어요.',
    icon: 'pin',
  },
  {
    id: 'withdraw',
    question: '회원 탈퇴는 어디서 하나요?',
    answer: '회원 탈퇴는 아래 문의하기로 요청해 주세요.',
    icon: 'trash',
  },
];

function FaqGlyph({ icon }: { icon: FaqIcon }) {
  return (
    <Svg width={34} height={34} viewBox="14 18 34 34" fill="none">
      <Circle cx={31} cy={35} r={17} fill={MINT} />
      {icon === 'plus' && <Path d="M25 35H37M31 29V41" stroke={GREEN_DARK} strokeWidth={2} strokeLinecap="round" />}
      {icon === 'pin' && (
        <>
          <Path
            d="M31 26C26 26 23 29 23 34C23 40 31 45 31 45C31 45 39 40 39 34C39 29 36 26 31 26Z"
            stroke={GREEN_DARK}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Circle cx={31} cy={34} r={2.4} fill={GREEN_DARK} />
        </>
      )}
      {icon === 'trash' && (
        <Path
          d="M25 29H37M27 29V41H35V29M29 26H33"
          stroke={GREEN_DARK}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function Chevron({ direction }: { direction: 'right' | 'down' }) {
  return (
    <Svg width={10} height={14} viewBox="313 28 10 14" fill="none" style={direction === 'down' ? { transform: [{ rotate: '90deg' }] } : undefined}>
      <Path d="M315 30L320 35L315 40" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [inquiryNotice, setInquiryNotice] = useState(false);

  const faqs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return FAQS;
    return FAQS.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(keyword));
  }, [query]);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#EFFCF5']} style={styles.flex}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: statusBarInset(insets.top) + 4, paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
        <View style={styles.appBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={handleBack} style={styles.backButton}>
            <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
              <Path d="M23.5 12.5L16 20L23.5 27.5" stroke={INK} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Text style={styles.appBarTitle}>로그인·회원가입 문의</Text>
        </View>

        <LinearGradient colors={[GREEN_DARK, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.55 }} style={styles.hero}>
          <View style={styles.heroCircleTop} />
          <View style={styles.heroCircleBottom} />
          <Text style={styles.heroTitle}>무엇을 도와드릴까요?</Text>
          <Text style={styles.heroSubtitle}>자주 묻는 질문에서 해결 방법을 찾아보세요.</Text>

          <View style={styles.search}>
            <Svg width={20} height={20} viewBox="58 231 24 24" fill="none">
              <Circle cx={68} cy={241} r={8} stroke={MUTED} strokeWidth={2} />
              <Path d="M74 247L80 253" stroke={MUTED} strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="궁금한 내용을 검색해보세요"
              placeholderTextColor={MUTED}
              returnKeyType="search"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="search"
              style={styles.searchInput}
            />
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>자주 묻는 질문</Text>
        <View style={styles.faqCard}>
          {faqs.length === 0 ? (
            <Text style={styles.empty}>검색 결과가 없어요.</Text>
          ) : (
            faqs.map((faq, index) => {
              const open = openId === faq.id;
              return (
                <View key={faq.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setOpenId(open ? null : faq.id)}
                    style={({ pressed }) => [styles.faqRow, pressed && styles.pressed]}>
                    <FaqGlyph icon={faq.icon} />
                    <Text style={styles.faqQuestion} numberOfLines={2}>{faq.question}</Text>
                    <Chevron direction={open ? 'down' : 'right'} />
                  </Pressable>
                  {open && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
                  {index < faqs.length - 1 && <View style={styles.faqDivider} />}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.cta}>
          <View style={styles.ctaCopy}>
            <Text style={styles.ctaTitle}>원하는 답변이 없나요?</Text>
            <Text style={styles.ctaSubtitle}>문의 내용을 직접 남겨주세요.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setInquiryNotice(true)}
            style={({ pressed }) => [styles.ctaButton, pressed && styles.pressed]}>
            <Text style={styles.ctaButtonText}>문의하기</Text>
          </Pressable>
        </View>
        {inquiryNotice && <Text style={styles.notice}>문의 접수 채널은 준비 중이에요. 조금만 기다려 주세요.</Text>}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  appBar: { height: 40, marginHorizontal: 20, justifyContent: 'center' },
  backButton: { position: 'absolute', left: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', zIndex: 1 },
  appBarTitle: { textAlign: 'center', fontSize: 17, lineHeight: 22, fontWeight: '700', color: INK },

  hero: { marginTop: 24, marginHorizontal: 24, height: 184, borderRadius: 24, overflow: 'hidden', paddingHorizontal: 22, paddingTop: 20 },
  heroCircleTop: { position: 'absolute', right: -10, top: -14, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroCircleBottom: { position: 'absolute', left: -10, bottom: -43, width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroTitle: { fontSize: 23, lineHeight: 30, fontWeight: '700', color: '#FFFFFF' },
  heroSubtitle: { marginTop: 5, fontSize: 13, lineHeight: 18, fontWeight: '700', color: 'rgba(255,255,255,0.84)' },

  search: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 26,
    height: 58,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    gap: 8,
  },
  searchInput: { flex: 1, height: 58, paddingRight: 16, fontSize: 13, fontWeight: '700', color: INK, outlineStyle: 'none' } as object,

  sectionTitle: { marginTop: 29, marginLeft: 27, fontSize: 16, lineHeight: 22, fontWeight: '700', color: INK },
  faqCard: {
    marginTop: 12,
    marginHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 5px 18px rgba(15,23,19,0.06)',
  },
  faqRow: { height: 69, paddingLeft: 14, paddingRight: 22, flexDirection: 'row', alignItems: 'center' },
  faqDivider: { marginHorizontal: 18, height: 1, backgroundColor: '#E5E7EB' },
  faqQuestion: { flex: 1, marginLeft: 12, marginRight: 10, fontSize: 14, lineHeight: 20, fontWeight: '700', color: INK },
  faqAnswer: { paddingLeft: 60, paddingRight: 22, paddingBottom: 18, fontSize: 13, lineHeight: 19, color: MUTED },
  empty: { paddingVertical: 36, textAlign: 'center', fontSize: 13, color: MUTED },

  cta: {
    marginTop: 28,
    marginHorizontal: 24,
    height: 112,
    borderRadius: 20,
    backgroundColor: MINT,
    paddingLeft: 20,
    paddingRight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaCopy: { flex: 1, paddingRight: 8 },
  ctaTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: INK },
  ctaSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: '700', color: MUTED },
  ctaButton: { width: 94, height: 48, borderRadius: 14, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  ctaButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  notice: { marginTop: 12, marginHorizontal: 24, textAlign: 'center', fontSize: 12, lineHeight: 17, color: MUTED },
});
