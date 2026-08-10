import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingPreviewArt } from '@/components/OnboardingPreviewArt';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/theme';
import { FRONTEND_URL, getProfile, KAKAO_LOGIN_URL } from '@/services/api';

export default function OnboardingScreen() {
  const handleKakaoLogin = async () => {
    if (Platform.OS === 'web') {
      window.location.assign(KAKAO_LOGIN_URL);
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(
      KAKAO_LOGIN_URL,
      `${FRONTEND_URL}/oauth/callback`
    );
    if (result.type === 'success') {
      await getProfile();
      router.replace('/(tabs)');
    }
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFFFFF', '#EFFCF5']}
      locations={[0, 0.43, 1]}
      style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {Platform.OS === 'web' && (
            <View style={styles.statusBar}>
              <Text style={styles.statusTime}>9:41</Text>
              <View style={styles.statusIcons}>
                <View style={styles.cellularBars}>
                  <View style={[styles.cellularBar, { height: 5 }]} />
                  <View style={[styles.cellularBar, { height: 8 }]} />
                  <View style={[styles.cellularBar, { height: 11 }]} />
                  <View style={[styles.cellularBar, { height: 14 }]} />
                </View>
                <Ionicons name="wifi" size={16} color="#000000" />
                <View style={styles.battery}>
                  <View style={styles.batteryFill} />
                </View>
              </View>
            </View>
          )}

          <View style={styles.main}>
          <Text style={styles.title}>
            헷갈리는 분리배출,{`\n`}
            이제 <Text style={styles.titleAccent}>사진 한 장</Text>으로 해결하세요.
          </Text>

          <View style={styles.previewWrap}>
            <View style={styles.previewGlow} />

            <View style={styles.previewFrameGroup}>
              <View style={styles.previewPhone}>
                <View style={styles.previewScreen}>
                  <Image
                    source={require('../../assets/images/image1.png')}
                    style={styles.previewImage}
                    contentFit="cover"
                  />
                  <View style={styles.previewOverlayArt}>
                    <OnboardingPreviewArt />
                  </View>

                  <View style={styles.previewContent}>
                    <View style={styles.previewStatusBar}>
                      <Text style={styles.previewStatusTime}>9:41</Text>
                      <View style={styles.previewStatusIcons}>
                        <Ionicons name="cellular" size={9} color="rgba(255,255,255,0.88)" />
                        <Ionicons name="wifi" size={9} color="rgba(255,255,255,0.88)" />
                        <Ionicons name="battery-full" size={10} color="rgba(255,255,255,0.88)" />
                      </View>
                    </View>

                    <View style={styles.detectionChip}>
                      <View style={styles.detectionIconWrap}>
                        <Ionicons name="water" size={13} color={Colors.primary} />
                      </View>
                      <View style={styles.detectionTextWrap}>
                        <Text style={styles.detectionKind} numberOfLines={1}>plastic</Text>
                        <Text style={styles.detectionLabel} numberOfLines={1}>페트병 (PET)</Text>
                      </View>
                      <View style={styles.detectionArrow}>
                        <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
                      </View>
                    </View>

                    <View style={styles.dotsRow}>
                      <View style={[styles.dot, styles.dotActive]} />
                      <View style={styles.dot} />
                    </View>

                    <View style={styles.bottleBox} />
                  </View>
                </View>

                <Image
                  source={require('../../assets/images/iphone14-frame.png')}
                  style={styles.previewFrameImage}
                  contentFit="fill"
                />
              </View>

              <View style={styles.notifyBanner}>
                <View style={styles.notifyContent}>
                  <Text style={styles.notifyTime}>오후 9:41</Text>
                  <View style={styles.notifyMessageRow}>
                    <Ionicons name="paper-plane" size={22} color="#087E4C" />
                    <Text style={styles.notifyText} numberOfLines={1}>
                      <Text style={styles.notifyName}>SSOK님,</Text> 오늘은 무엇을 버릴 예정인가요?
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
              </View>
            </View>
          </View>

          <Button
            label="카카오로 시작"
            variant="kakao"
            icon="chatbubble"
            style={styles.kakaoButton}
            labelStyle={styles.kakaoButtonLabel}
            onPress={handleKakaoLogin}
          />

          <Text style={styles.link} onPress={() => router.push('/setting')}>
            로그인·회원가입 문의  〉
          </Text>
          </View>

          {Platform.OS === 'web' && <View style={styles.homeIndicator} />}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 17 : 8,
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  statusBar: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  statusTime: {
    color: '#000000',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cellularBars: {
    height: 15,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  cellularBar: {
    width: 3,
    borderRadius: 1,
    backgroundColor: '#000000',
  },
  battery: {
    width: 23,
    height: 12,
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 3,
    padding: 1.5,
  },
  batteryFill: {
    flex: 1,
    borderRadius: 1,
    backgroundColor: '#000000',
  },
  main: { flex: 1 },
  title: {
    textAlign: 'center',
    marginTop: 66,
    fontSize: 22,
    fontWeight: '700',
    color: '#0B0B0B',
    lineHeight: 31,
    letterSpacing: -0.7,
  },
  titleAccent: { color: '#20B777' },
  previewWrap: {
    marginTop: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewGlow: {
    position: 'absolute',
    top: '37%',
    left: '50%',
    width: 510,
    height: 360,
    marginLeft: -255,
    borderRadius: 255,
    backgroundColor: '#DDF8EA',
    opacity: 0.9,
  },
  previewFrameGroup: {
    width: '100%',
    height: 414,
  },
  previewPhone: {
    alignSelf: 'center',
    width: '60%',
    aspectRatio: 199 / 404,
  },
  previewScreen: {
    position: 'absolute',
    left: '5.53%',
    right: '6.03%',
    top: '2.23%',
    bottom: '2.48%',
    borderRadius: 21,
    backgroundColor: '#14261F',
    overflow: 'hidden',
    zIndex: 1,
  },
  previewFrameImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 5,
  },
  previewImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  previewOverlayArt: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 2,
  },
  previewContent: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
    zIndex: 3,
  },
  previewStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginBottom: 6,
  },
  previewStatusTime: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
  previewStatusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderRadius: 9,
    padding: 6,
  },
  detectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectionTextWrap: { flex: 1 },
  detectionKind: { color: '#9CA3AF', fontSize: 7 },
  detectionLabel: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  detectionArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: { backgroundColor: Colors.primary, width: 14 },
  bottleBox: { flex: 1 },
  notifyBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 29,
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(37, 185, 114, 0.86)',
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: '#0B7A4C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  notifyContent: { flex: 1, gap: 7 },
  notifyMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifyTime: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 18,
  },
  notifyText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: -0.4,
  },
  notifyName: { fontWeight: '700' },
  kakaoButton: {
    height: 50,
    borderRadius: 9,
    marginTop: 22,
  },
  kakaoButtonLabel: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    marginTop: 35,
    color: '#555555',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  homeIndicator: {
    alignSelf: 'center',
    width: 135,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#000000',
    marginTop: 12,
  },
});
