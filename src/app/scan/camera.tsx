import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { ScanUploadError, uploadScan, type AnalysisStatus } from '@/services/api';

const TAB_ICONS = [
  { name: 'home-outline' as const, label: '홈', route: '/(tabs)' as const },
  { name: 'time-outline' as const, label: '기록', route: '/(tabs)/history' as const },
  { name: 'scan' as const, label: '스캔', route: null },
  { name: 'bookmark-outline' as const, label: '가이드', route: '/(tabs)/guide' as const },
  { name: 'person-outline' as const, label: 'My', route: '/(tabs)/mypage' as const },
];

async function maximizeWebCameraStream() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const video = document.querySelector('video');
  const stream = video?.srcObject instanceof MediaStream ? video.srcObject : null;
  const track = stream?.getVideoTracks()[0];
  if (!track) return;

  const capabilities = track.getCapabilities?.();
  const maxWidth = capabilities?.width?.max ?? 3840;
  const maxHeight = capabilities?.height?.max ?? 2160;

  try {
    await track.applyConstraints({
      width: { ideal: Math.min(maxWidth, 3840) },
      height: { ideal: Math.min(maxHeight, 2160) },
      frameRate: { ideal: 30 },
    });
  } catch (error) {
    console.warn('[SSOK Camera] 최대 웹 해상도를 적용하지 못해 Full HD로 재시도해요:', error);
    await track.applyConstraints({
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    });
  }

  const focusModes = (capabilities as MediaTrackCapabilities & { focusMode?: string[] } | undefined)
    ?.focusMode;
  if (focusModes?.includes('continuous')) {
    await track
      .applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
      .catch(() => undefined);
  }

  console.info('[SSOK Camera] 웹 카메라 스트림:', track.getSettings());
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

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && !requestedRef.current) {
      requestedRef.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  const cameraGranted = permission?.granted;

  const handleCameraReady = async () => {
    if (!cameraRef.current) return;

    try {
      await maximizeWebCameraStream();
      const sizes = await cameraRef.current.getAvailablePictureSizesAsync();
      const largestSize = sizes.reduce<string | undefined>((largest, current) => {
        const [width, height] = current.split('x').map(Number);
        const [largestWidth = 0, largestHeight = 0] = (largest ?? '').split('x').map(Number);
        const currentPixels = width * height;
        const largestPixels = largestWidth * largestHeight;

        return Number.isFinite(currentPixels) && currentPixels > largestPixels ? current : largest;
      }, undefined);

      if (largestSize) setPictureSize(largestSize);
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
    if (!isCameraReady || !cameraRef.current) {
      setCaptureError('카메라를 준비하고 있어요. 잠시 후 다시 눌러주세요.');
      return;
    }

    let didCapturePhoto = false;
    try {
      setCaptureError(null);
      setUploadStatus('사진을 촬영하고 있어요…');
      setIsUploading(true);
      const photo = await cameraRef.current.takePictureAsync({
        // Native에서는 Expo의 회전·리사이즈·재압축 단계를 건너뛰어
        // 카메라 센서가 만든 원본 해상도와 디테일을 최대한 유지한다.
        skipProcessing: Platform.OS !== 'web',
        quality: Platform.OS === 'web' ? 1 : undefined,
        base64: Platform.OS === 'web',
        imageType: Platform.OS === 'web' ? 'jpg' : undefined,
        scale: Platform.OS === 'web' ? 1 : undefined,
      });
      if (!photo?.uri) throw new Error('사진을 촬영하지 못했어요.');
      console.info('[SSOK Camera] 촬영 이미지:', {
        width: photo.width,
        height: photo.height,
        pictureSize,
      });
      didCapturePhoto = true;

      await cameraRef.current.pausePreview();
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
      await cameraRef.current?.resumePreview().catch(() => undefined);
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
      setUploadStatus(null);
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {cameraGranted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
          autofocus="on"
          zoom={0}
          pictureSize={Platform.OS === 'web' ? undefined : pictureSize}
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
