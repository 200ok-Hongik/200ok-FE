import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, type LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScanTabBar, useScanTabBarHeight } from '@/components/scan/ScanTabBar';
import { Viewfinder } from '@/components/scan/Viewfinder';
import { Text } from '@/components/ui/Text';
import { WebCameraView, type WebCameraHandle } from '@/components/WebCameraView';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { setScanPhoto } from '@/services/scanPhotoStore';
import type { Box } from '@/constants/scanDesign';
import {
  getPendingAnalysisJobId,
  getScanObjects,
  resumePendingAnalysis,
  ScanUploadError,
  uploadScan,
  type AnalysisStatus,
} from '@/services/api';

type Phase = 'live' | 'analyzing' | 'recognized';

// 디자인 치수 (375x812 기준)
const VIEWFINDER_WIDTH = 252;
const VIEWFINDER_HEIGHT = 352;
const SHUTTER_SIZE = 64;
const MIN_BOX_HEIGHT = 150;

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
  const insets = useSafeAreaInsets();
  const tabBarHeight = useScanTabBarHeight();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('live');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string>();
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [screen, setScreen] = useState({ width: 375, height: 812 });
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

  // 분석 중 새로고침된 경우 저장해 둔 jobId로 현재 상태를 확인하고 SSE를 다시 연결한다.
  useEffect(() => {
    if (!isWeb || !getPendingAnalysisJobId()) return;

    let cancelled = false;
    setPhase('analyzing');
    setUploadStatus('진행 중인 AI 분석을 다시 연결하고 있어요…');

    resumePendingAnalysis((status) => {
      if (cancelled) return;
      if (status === 'QUEUED') setUploadStatus('AI 분석을 기다리고 있어요…');
      if (status === 'ANALYZING' || status === 'PROCESSING') setUploadStatus('AI가 사진을 분석하고 있어요…');
      if (status === 'COMPLETED') setUploadStatus('분석 결과를 불러오고 있어요…');
    })
      .then(async (result) => {
        if (cancelled || !result) return;
        const list = await getScanObjects(result.scanResultId);
        if (cancelled) return;
        if (list.objects.length === 0) throw new Error('사진에서 인식된 물건이 없어요. 다시 촬영해주세요.');
        router.replace({ pathname: '/scan/review', params: { scanId: String(result.scanResultId) } });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[SSOK AI] 진행 중인 분석 복구 실패:', error);
        const message = error instanceof Error ? error.message : '진행 중인 분석을 다시 연결하지 못했어요.';
        setCaptureError(message);
        setPhase('live');
        Alert.alert('분석 연결 실패', message);
      })
      .finally(() => {
        if (!cancelled) setUploadStatus(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isWeb]);

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
    setPhase('live');
    await resumePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWeb]);

  // 결과 확인 화면에서 돌아오면(뒤로 가기) 바로 다시 촬영할 수 있게 카메라를 되돌린다.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useFocusEffect(
    useCallback(() => {
      if (phaseRef.current === 'recognized') resetToLive();
    }, [resetToLive])
  );

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
      setScanPhoto(resultScanId, { uri: taken.uri, width: taken.width, height: taken.height });
      setPhase('recognized');
      // 물건별 윤곽선과 목록은 확인 화면에서 한 번에 보여준다. (겹치는 조각 정리도 그 화면에서 한다)
      router.push({ pathname: '/scan/review', params: { scanId: String(resultScanId) } });
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

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setScreen((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  // 디자인 기준 위치: 상태바 아래 20에서 80 더 내려온 y=229 근처에 기본 뷰파인더가 놓인다.
  const finderTop = Math.max(insets.top, 44) + 100;
  // 뷰파인더는 화면 위쪽부터 셔터 버튼 위까지의 공간 안에서만 잡는다. (화면이 낮으면 그만큼 줄어든다)
  const shutterTop = screen.height - (tabBarHeight + 14 + SHUTTER_SIZE);
  const finderHeight = Math.max(MIN_BOX_HEIGHT, Math.min(VIEWFINDER_HEIGHT, shutterTop - 16 - finderTop));
  const finderWidth = Math.min(VIEWFINDER_WIDTH, screen.width - 48);
  const defaultBox: Box = {
    x: (screen.width - finderWidth) / 2,
    y: finderTop,
    width: finderWidth,
    height: finderHeight,
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
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

      {phase !== 'recognized' && !isUploading && (
        <Viewfinder box={defaultBox} />
      )}
      {isUploading && <Viewfinder box={defaultBox} scanning />}

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

      <ScanTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.scanDark, overflow: 'hidden' },
  permissionFallback: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  permissionText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm },

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
    width: SHUTTER_SIZE,
    height: SHUTTER_SIZE,
    borderRadius: SHUTTER_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF' },
  shutterDisabled: { opacity: 0.55 },
});
