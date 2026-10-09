import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { WebCameraView, type WebCameraHandle } from '@/components/WebCameraView';
import { ScanUploadError, uploadScan, type AnalysisStatus } from '@/services/api';

const TAB_ICONS = [
  { name: 'home-outline' as const, label: '홈', route: '/(tabs)' as const },
  { name: 'time-outline' as const, label: '기록', route: '/(tabs)/history' as const },
  { name: 'scan' as const, label: '스캔', route: null },
  { name: 'bookmark-outline' as const, label: '가이드', route: '/(tabs)/guide' as const },
  { name: 'person-outline' as const, label: 'My', route: '/(tabs)/mypage' as const },
];

function captureWithSystemCamera(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    document.body.appendChild(input);

    let settled = false;
    const cleanup = () => {
      window.removeEventListener('focus', handleWindowFocus);
      input.remove();
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const handleWindowFocus = () => {
      window.setTimeout(() => {
        if (!input.files?.length) {
          finish(() => reject(new Error('사진 촬영을 취소했어요.')));
        }
      }, 1000);
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        finish(() => reject(new Error('사진 촬영을 취소했어요.')));
        return;
      }
      finish(() => resolve(URL.createObjectURL(file)));
    });
    input.addEventListener('cancel', () => {
      finish(() => reject(new Error('사진 촬영을 취소했어요.')));
    });
    window.addEventListener('focus', handleWindowFocus);
    input.click();
  });
}

export default function ScanCameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string>();
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const requestedRef = useRef(false);
  const cameraRef = useRef<CameraView>(null);
  const webCameraRef = useRef<WebCameraHandle>(null);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    // 웹은 WebCameraView가 스트림을 열면서 직접 권한을 요청한다.
    // (expo-camera 권한 확인이 저해상도 스트림을 한 번 더 열어 Safari에서 권한 팝업이 두 번 뜨는 것도 방지)
    if (isWeb || !permission) return;
    if (!permission.granted && !requestedRef.current) {
      requestedRef.current = true;
      requestPermission();
    }
  }, [isWeb, permission, requestPermission]);

  const cameraGranted = isWeb ? true : permission?.granted;

  const pausePreview = async () => {
    if (isWeb) webCameraRef.current?.pausePreview();
    else await cameraRef.current?.pausePreview();
  };

  const resumePreview = async () => {
    if (isWeb) webCameraRef.current?.resumePreview();
    else await cameraRef.current?.resumePreview().catch(() => undefined);
  };

  const captureWebPhoto = async () => {
    try {
      return await webCameraRef.current!.takePictureAsync();
    } catch (error) {
      // 스트림에서 프레임을 못 뽑는 브라우저는 기기 기본 카메라 앱으로 촬영한다.
      console.warn('[SSOK Camera] 스트림 촬영에 실패해 시스템 카메라로 전환해요:', error);
      return { uri: await captureWithSystemCamera(), width: undefined, height: undefined };
    }
  };

  const handleCameraReady = async () => {
    if (!cameraRef.current) return;

    try {
      // iOS는 기기 지원 여부와 상관없이 고정 프리셋 목록("3840x2160", "Photo" 등)을 돌려주고,
      // "3840x2160"은 16:9 비디오 프리셋이라 기본 "Photo" 프리셋(12MP 사진 파이프라인)보다
      // 오히려 화질이 떨어진다. iOS는 기본 Photo 프리셋을 그대로 쓰고, Android만 최대 크기를 고른다.
      if (Platform.OS === 'android') {
        const sizes = await cameraRef.current.getAvailablePictureSizesAsync();
        const largestSize = sizes.reduce<string | undefined>((largest, current) => {
          const [width, height] = current.split('x').map(Number);
          const [largestWidth = 0, largestHeight = 0] = (largest ?? '').split('x').map(Number);
          const currentPixels = width * height;
          const largestPixels = largestWidth * largestHeight;

          return Number.isFinite(currentPixels) && currentPixels > largestPixels ? current : largest;
        }, undefined);

        if (largestSize) setPictureSize(largestSize);
      }
    } catch (error) {
      console.warn('[SSOK Camera] 지원 사진 크기를 확인하지 못했어요:', error);
    } finally {
      setIsCameraReady(true);
    }
  };

  const handleCapture = async () => {
    if (isUploading) return;
    if (!cameraGranted) {
      const message = '설정에서 카메라 접근을 허용해주세요.';
      setCaptureError(message);
      Alert.alert('카메라 권한이 필요해요', message);
      return;
    }
    if (!isCameraReady || !(isWeb ? webCameraRef.current : cameraRef.current)) {
      setCaptureError('카메라를 준비하고 있어요. 잠시 후 다시 눌러주세요.');
      return;
    }

    let didCapturePhoto = false;
    let webImageUrl: string | null = null;
    try {
      setCaptureError(null);
      setUploadStatus('사진을 촬영하고 있어요…');
      setIsUploading(true);
      const photo = isWeb
        ? await captureWebPhoto()
        : await cameraRef.current!.takePictureAsync({
            // 압축 손실을 최소화한다. (iOS 기본값도 1이지만 Android 등에서 명시적으로 고정)
            quality: 1,
            skipProcessing: true,
          });
      if (!photo?.uri) throw new Error('사진을 촬영하지 못했어요.');
      if (isWeb) webImageUrl = photo.uri;
      console.info('[SSOK Camera] 촬영 이미지:', {
        width: photo.width,
        height: photo.height,
        pictureSize,
      });
      didCapturePhoto = true;

      await pausePreview();
      setUploadStatus('사진을 분석하고 있어요…');
      const result = await uploadScan(photo.uri, (status: AnalysisStatus) => {
        if (status === 'QUEUED') setUploadStatus('AI 분석을 기다리고 있어요…');
        if (status === 'ANALYZING' || status === 'PROCESSING') setUploadStatus('AI가 사진을 분석하고 있어요…');
        if (status === 'COMPLETED') setUploadStatus('분석 결과를 불러오고 있어요…');
      });
      const resultScanId = result.scanResultId;
      if (!resultScanId) throw new Error('백엔드가 스캔 ID를 반환하지 않았어요.');
      router.push({ pathname: '/scan/captured', params: { scanId: String(resultScanId) } });
    } catch (error) {
      console.error(error);
      await resumePreview();
      const detail = error instanceof Error ? error.message : '';
      let title = didCapturePhoto ? '분석 요청 실패' : '촬영 실패';
      let message = detail || '사진을 전송하지 못했어요. 네트워크를 확인해주세요.';

      if (error instanceof ScanUploadError) {
        const titles = {
          IMAGE_PREPARATION: '사진 준비 실패',
          SUBMISSION: '분석 요청 실패',
          STATUS_CHECK: '분석 상태 확인 실패',
          AI_ANALYSIS: 'AI 분석 실패',
          RESULT: '분석 결과 오류',
          TIMEOUT: '분석 지연',
        } as const;
        title = titles[error.phase];
      }

      if (detail.includes('502') || detail.includes('503') || detail.includes('504')) {
        message = 'AI 분석 서버가 응답하지 않아요. 잠시 후 다시 시도해주세요.';
      } else if (detail.includes('SSOK API 401')) {
        message = '로그인 상태를 확인한 뒤 다시 시도해주세요.';
      }
      setCaptureError(message);
      Alert.alert(title, message);
    } finally {
      if (webImageUrl) URL.revokeObjectURL(webImageUrl);
      setUploadStatus(null);
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {isWeb ? (
        <WebCameraView
          ref={webCameraRef}
          onReady={() => {
            setCaptureError(null);
            setIsCameraReady(true);
          }}
          onError={(message) => {
            setIsCameraReady(false);
            setCaptureError(message);
          }}
        />
      ) : cameraGranted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
          // expo-camera iOS: "on" = 한 번 초점을 맞추고 고정(.autoFocus), "off" = 연속 자동초점(.continuousAutoFocus).
          // 이름이 반대로 보여도 움직이는 대상을 계속 선명하게 잡으려면 "off"여야 한다.
          autofocus="off"
          zoom={0}
          pictureSize={Platform.OS === 'android' ? pictureSize : undefined}
          onCameraReady={handleCameraReady}
          onMountError={(event) => {
            setIsCameraReady(false);
            setCaptureError(event.message || '카메라를 시작하지 못했어요.');
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.permissionFallback]}>
          <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.6)" />
          <Text style={styles.permissionText}>카메라 권한이 필요해요.</Text>
        </View>
      )}

      <View style={[StyleSheet.absoluteFill, styles.scanTint]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable hitSlop={12} onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.overlayArea}>
          <View style={styles.frame}>
            <View style={[styles.simpleFrame, { top: '20%', left: '10%', width: '80%', height: '55%' }]} />
          </View>

          <Text style={styles.hint}>재활용품이 잘 보이도록 화면을 반듯하게 유지해주세요</Text>
          {captureError && <Text style={styles.captureError}>{captureError}</Text>}
          {uploadStatus && <Text style={styles.uploadStatus}>{uploadStatus}</Text>}
        </View>

        <View style={styles.bottomArea}>
          <Pressable
            style={[styles.shutter, (!isCameraReady || isUploading) && styles.shutterDisabled]}
            onPress={handleCapture}
            disabled={isUploading}>
            {isUploading ? <ActivityIndicator color={Colors.scanDark} /> : <View style={styles.shutterInner} />}
          </Pressable>

          <View style={styles.tabRow}>
            {TAB_ICONS.map((tab) => (
              <Pressable
                key={tab.label}
                accessibilityRole="button"
                accessibilityLabel={`${tab.label} 화면으로 이동`}
                disabled={!tab.route}
                hitSlop={8}
                onPress={() => tab.route && router.replace(tab.route)}
                style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}>
                <View style={tab.label === '스캔' ? styles.tabScanIcon : undefined}>
                  <Ionicons
                    name={tab.name}
                    size={20}
                    color={tab.label === '스캔' ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
                  />
                </View>
                <Text style={[styles.tabLabel, tab.label === '스캔' && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.scanDark },
  flex: { flex: 1 },
  permissionFallback: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  permissionText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm },
  scanTint: { backgroundColor: 'rgba(34,197,94,0.04)' },
  topBar: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayArea: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  chipRow: { gap: Spacing.sm },
  detectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(10,15,13,0.75)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  detectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectionKind: { color: '#9CA3AF', fontSize: FontSize.xs },
  detectionLabel: { color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '800' },
  detectionSub: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600', marginTop: 1 },
  detectionArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 6, alignSelf: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: Colors.primary, width: 16 },
  frame: { flex: 1 },
  simpleFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: Radius.lg,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2.5,
    borderRadius: Radius.md,
  },
  hint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
  captureError: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(127,29,29,0.78)',
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
  uploadStatus: {
    marginTop: Spacing.sm,
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  bottomArea: { alignItems: 'center', paddingBottom: Spacing.sm },
  shutter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF' },
  shutterDisabled: { opacity: 0.55 },
  tabRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tabItem: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabItemPressed: { opacity: 0.55 },
  tabScanIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  tabLabelActive: { color: Colors.primary },
});
