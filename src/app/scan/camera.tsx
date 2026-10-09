import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ObjectThumb } from '@/components/scan/ObjectThumb';
import { PathIcon } from '@/components/scan/PathIcon';
import { ScanTabBar, useScanTabBarHeight } from '@/components/scan/ScanTabBar';
import { Viewfinder } from '@/components/scan/Viewfinder';
import { ICONS } from '@/components/scan/iconPaths';
import { Text } from '@/components/ui/Text';
import { WebCameraView, type WebCameraHandle } from '@/components/WebCameraView';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { describeItem, normalizeBbox, ScanColors, type Box } from '@/constants/scanDesign';
import {
  getScanObjects,
  ScanUploadError,
  uploadScan,
  type AnalysisStatus,
  type ScanObjectSummary,
} from '@/services/api';

type Phase = 'live' | 'analyzing' | 'recognized';

// 디자인 치수 (375x812 기준)
const CARD_WIDTH = 284;
const CARD_GAP = 25;
const CARD_SNAP = CARD_WIDTH + CARD_GAP;
const CARD_LEFT = 42;
const VIEWFINDER_WIDTH = 252;
const VIEWFINDER_HEIGHT = 352;
const BOX_PAD_X = 44;
const BOX_PAD_Y = 28;
const MIN_BOX_WIDTH = 120;
const MIN_BOX_HEIGHT = 150;

type CapturedPhoto = { uri: string; width?: number; height?: number };

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

// 사진(원본) 좌표계의 비율 박스를 화면(cover 맞춤) 좌표로 옮긴다.
function toScreenBox(box: Box, photo: { width: number; height: number }, screen: { width: number; height: number }): Box {
  const scale = Math.max(screen.width / photo.width, screen.height / photo.height);
  const offsetX = (photo.width * scale - screen.width) / 2;
  const offsetY = (photo.height * scale - screen.height) / 2;
  return {
    x: box.x * photo.width * scale - offsetX,
    y: box.y * photo.height * scale - offsetY,
    width: box.width * photo.width * scale,
    height: box.height * photo.height * scale,
  };
}

// 너무 작거나 화면 밖으로 나간 박스도 모서리가 읽히도록 보정한다.
function fitBox(box: Box, screen: { width: number; height: number }): Box {
  // 디자인의 뷰파인더는 물건보다 한 뼘 크게 잡힌다.
  const width = Math.min(Math.max(box.width + BOX_PAD_X * 2, MIN_BOX_WIDTH), screen.width - 8);
  const height = Math.min(Math.max(box.height + BOX_PAD_Y * 2, MIN_BOX_HEIGHT), screen.height - 8);
  const x = Math.min(Math.max(box.x + box.width / 2 - width / 2, 4), screen.width - width - 4);
  const y = Math.min(Math.max(box.y + box.height / 2 - height / 2, 4), screen.height - height - 4);
  return { x, y, width, height };
}

export default function ScanCameraScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useScanTabBarHeight();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('live');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string>();
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [screen, setScreen] = useState({ width: 375, height: 812 });
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [scanId, setScanId] = useState<number | null>(null);
  const [objects, setObjects] = useState<ScanObjectSummary[]>([]);
  const [selected, setSelected] = useState(0);
  const [previewMirrored, setPreviewMirrored] = useState(false);
  const requestedRef = useRef(false);
  const cameraRef = useRef<CameraView>(null);
  const webCameraRef = useRef<WebCameraHandle>(null);
  const photoUriRef = useRef<string | null>(null);
  const isWeb = Platform.OS === 'web';
  const isUploading = phase === 'analyzing';

  useEffect(() => {
    // 웹은 WebCameraView가 스트림을 열면서 직접 권한을 요청한다.
    // (expo-camera 권한 확인이 저해상도 스트림을 한 번 더 열어 Safari에서 권한 팝업이 두 번 뜨는 것도 방지)
    if (isWeb || !permission) return;
    if (!permission.granted && !requestedRef.current) {
      requestedRef.current = true;
      requestPermission();
    }
  }, [isWeb, permission, requestPermission]);

  // 인식 결과 화면에서 썸네일로 쓰는 사진은 이 화면을 떠날 때 정리한다.
  useEffect(
    () => () => {
      if (isWeb && photoUriRef.current) URL.revokeObjectURL(photoUriRef.current);
    },
    [isWeb]
  );

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

  const resetToLive = useCallback(async () => {
    if (isWeb && photoUriRef.current) URL.revokeObjectURL(photoUriRef.current);
    photoUriRef.current = null;
    setPhoto(null);
    setObjects([]);
    setScanId(null);
    setSelected(0);
    setPhase('live');
    await resumePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWeb]);

  const handleCapture = async () => {
    if (phase === 'recognized') {
      await resetToLive();
      return;
    }
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
    let keepPhoto = false;
    let capturedUri: string | null = null;
    try {
      setCaptureError(null);
      setUploadStatus('사진을 촬영하고 있어요…');
      setPhase('analyzing');
      const taken = isWeb
        ? await captureWebPhoto()
        : await cameraRef.current!.takePictureAsync({
            // 압축 손실을 최소화한다. (iOS 기본값도 1이지만 Android 등에서 명시적으로 고정)
            quality: 1,
            skipProcessing: true,
          });
      if (!taken?.uri) throw new Error('사진을 촬영하지 못했어요.');
      capturedUri = taken.uri;
      console.info('[SSOK Camera] 촬영 이미지:', {
        width: taken.width,
        height: taken.height,
        pictureSize,
      });
      didCapturePhoto = true;

      await pausePreview();
      setUploadStatus('사진을 분석하고 있어요…');
      const result = await uploadScan(taken.uri, (status: AnalysisStatus) => {
        if (status === 'QUEUED') setUploadStatus('AI 분석을 기다리고 있어요…');
        if (status === 'ANALYZING' || status === 'PROCESSING') setUploadStatus('AI가 사진을 분석하고 있어요…');
        if (status === 'COMPLETED') setUploadStatus('분석 결과를 불러오고 있어요…');
      });
      const resultScanId = result.scanResultId;
      if (!resultScanId) throw new Error('백엔드가 스캔 ID를 반환하지 않았어요.');

      const list = await getScanObjects(resultScanId);
      console.info('[SSOK AI] 스캔 객체 목록:', list);
      if (list.objects.length === 0) throw new Error('사진에서 인식된 물건이 없어요. 다시 촬영해주세요.');

      keepPhoto = true;
      photoUriRef.current = isWeb ? taken.uri : null;
      setPhoto({ uri: taken.uri, width: taken.width, height: taken.height });
      setScanId(resultScanId);
      setObjects(list.objects);
      setSelected(0);
      setPhase('recognized');
    } catch (error) {
      console.error(error);
      await resumePreview();
      setPhase('live');
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
      if (isWeb && capturedUri && !keepPhoto) URL.revokeObjectURL(capturedUri);
      setUploadStatus(null);
    }
  };

  const openObject = (object: ScanObjectSummary) => {
    if (scanId == null) return;
    router.push({ pathname: '/scan/captured', params: { scanId: String(scanId), objectId: object.objectId } });
  };

  const handleCardScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / CARD_SNAP);
    setSelected(Math.min(Math.max(index, 0), objects.length - 1));
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setScreen((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  // 디자인 기준 위치: 카드 상단 y=64(상태바 아래 20), 기본 뷰파인더 상단 y=229
  const cardsTop = Math.max(insets.top, 44) + 20;
  const defaultBox: Box = {
    x: (screen.width - VIEWFINDER_WIDTH) / 2,
    y: cardsTop + 165,
    width: VIEWFINDER_WIDTH,
    height: VIEWFINDER_HEIGHT,
  };

  let viewfinderBox = defaultBox;
  if (phase === 'recognized' && photo) {
    const current = objects[selected];
    const photoSize = photo.width && photo.height ? { width: photo.width, height: photo.height } : screen;
    const normalized = current ? normalizeBbox(current.bbox, photoSize.width, photoSize.height) : null;
    if (normalized) {
      // 미리보기만 좌우 반전된 경우(전면 카메라) 정지된 화면 기준으로 x를 뒤집는다.
      const oriented = previewMirrored ? { ...normalized, x: 1 - normalized.x - normalized.width } : normalized;
      viewfinderBox = fitBox(toScreenBox(oriented, photoSize, screen), screen);
    }
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {isWeb ? (
        <WebCameraView
          ref={webCameraRef}
          onReady={({ mirrored }) => {
            setCaptureError(null);
            setPreviewMirrored(mirrored);
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

      {/* 디자인의 위/아래 어둠 그라데이션 */}
      <LinearGradient colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0)']} style={styles.topShade} />

      {phase !== 'recognized' && !isUploading && (
        <Viewfinder box={defaultBox} />
      )}
      {isUploading && <Viewfinder box={defaultBox} scanning />}
      {phase === 'recognized' && <Viewfinder box={viewfinderBox} />}

      {phase === 'recognized' && scanId != null && (
        <View style={[styles.cardsArea, { top: cardsTop }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_SNAP}
            decelerationRate="fast"
            onScroll={handleCardScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingLeft: CARD_LEFT, paddingRight: screen.width - CARD_LEFT - CARD_WIDTH, gap: CARD_GAP }}>
            {objects.map((object) => (
              <ObjectCard key={object.objectId} object={object} photo={photo} onOpen={() => openObject(object)} />
            ))}
          </ScrollView>
          {objects.length > 1 && (
            <View style={styles.dots}>
              {objects.map((object, index) => (
                <View key={object.objectId} style={[styles.dot, index === selected && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      )}

      {(uploadStatus || captureError) && (
        <View style={[styles.statusWrap, { top: defaultBox.y + defaultBox.height + 16 }]}>
          {uploadStatus ? (
            <Text style={styles.uploadStatus}>{uploadStatus}</Text>
          ) : (
            <Text style={styles.captureError}>{captureError}</Text>
          )}
        </View>
      )}

      {/* 디자인에는 없지만 촬영/다시 촬영을 하려면 필요한 버튼. 탭바 바로 위에 둔다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={phase === 'recognized' ? '다시 촬영하기' : '사진 촬영하기'}
        style={[styles.shutter, { bottom: tabBarHeight + 14 }, (!isCameraReady || isUploading) && phase !== 'recognized' && styles.shutterDisabled]}
        onPress={handleCapture}
        disabled={isUploading}>
        {isUploading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : phase === 'recognized' ? (
          <Ionicons name="refresh" size={26} color="#FFFFFF" />
        ) : (
          <View style={styles.shutterInner} />
        )}
      </Pressable>

      <ScanTabBar variant="dark" />
    </View>
  );
}

function ObjectCard({
  object,
  photo,
  onOpen,
}: {
  object: ScanObjectSummary;
  photo: CapturedPhoto | null;
  onOpen: () => void;
}) {
  const info = describeItem(object.finalResult?.itemCode);
  const naturalSize = photo?.width && photo?.height ? { width: photo.width, height: photo.height } : undefined;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${info.detail} 결과 보기`} onPress={onOpen} style={styles.card}>
      <LinearGradient colors={['rgba(28,28,28,0.8)', 'rgba(28,28,28,1)']} style={[StyleSheet.absoluteFill, styles.cardBg]} />
      <ObjectThumb uri={photo?.uri} bbox={object.bbox} size={60} naturalSize={naturalSize} style={styles.cardThumb} />
      <View style={styles.cardCopy}>
        <Text style={styles.cardEyebrow} numberOfLines={1}>{info.eyebrow}</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>{info.title}</Text>
        <Text style={styles.cardDetail} numberOfLines={1}>{info.detail}</Text>
      </View>
      <View style={styles.cardArrow}>
        <PathIcon icon={ICONS.cardChevron} color="#FBFAF8" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.scanDark, overflow: 'hidden' },
  permissionFallback: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  permissionText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 233, pointerEvents: 'none' },

  cardsArea: { position: 'absolute', left: 0, right: 0 },
  card: {
    width: CARD_WIDTH,
    height: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(188,231,210,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    paddingRight: 22,
    overflow: 'hidden',
  },
  cardBg: { borderRadius: 16 },
  cardThumb: { backgroundColor: 'rgba(255,255,255,0.06)' },
  cardCopy: { flex: 1, marginLeft: 8, paddingRight: 8 },
  cardEyebrow: { fontSize: 14, lineHeight: 16, color: '#D2D4DA' },
  cardTitle: { fontSize: 16, lineHeight: 20, fontWeight: '700', color: '#FFFFFF' },
  cardDetail: { marginTop: 1, fontSize: 16, lineHeight: 20, fontWeight: '600', color: ScanColors.green },
  cardArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ScanColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { marginTop: 18, flexDirection: 'row', justifyContent: 'center', gap: 15 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E5E4' },
  dotActive: { backgroundColor: ScanColors.green },

  statusWrap: { position: 'absolute', left: 24, right: 24, alignItems: 'center', pointerEvents: 'none' },
  uploadStatus: {
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(28,28,28,0.7)',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  captureError: {
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(127,29,29,0.78)',
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    textAlign: 'center',
  },

  shutter: {
    position: 'absolute',
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF' },
  shutterDisabled: { opacity: 0.55 },
});
