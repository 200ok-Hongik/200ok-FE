import { createElement, useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';

// 웹 전용 카메라. expo-camera의 웹 구현은 getUserMedia에 해상도를 지정하지 않아서
// iOS Safari/Chrome이 640x480 같은 기본 해상도로 스트림을 열고, 나중에 applyConstraints로
// 올리려는 시도도 브라우저가 거절하면 그대로 저해상도에 머문다.
// 여기서는 스트림을 열 때부터 가능한 최대 해상도를 요청한다.

export type WebCameraPhoto = { uri: string; width: number; height: number };

export type WebCameraHandle = {
  takePictureAsync: () => Promise<WebCameraPhoto>;
  pausePreview: () => void;
  resumePreview: () => void;
};

type Props = {
  ref?: Ref<WebCameraHandle>;
  onReady?: (info: { width: number; height: number }) => void;
  onError?: (message: string) => void;
};

const JPEG_QUALITY = 0.92;

// 권한 거부·카메라 없음처럼 해상도를 낮춰도 해결되지 않는 에러는 재시도하지 않는다.
const FATAL_ERRORS = new Set(['NotAllowedError', 'SecurityError', 'NotFoundError', 'NotReadableError']);

async function openBestStream(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 3840 },
        height: { ideal: 2160 },
        frameRate: { ideal: 30 },
      },
    },
    {
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    },
    { audio: false, video: { facingMode: { ideal: 'environment' } } },
    { audio: false, video: true },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && FATAL_ERRORS.has(error.name)) throw error;
    }
  }
  throw lastError ?? new Error('카메라를 시작하지 못했어요.');
}

async function tuneTrack(track: MediaStreamTrack) {
  const capabilities = track.getCapabilities?.() as
    | (MediaTrackCapabilities & { focusMode?: string[] })
    | undefined;
  const settings = track.getSettings();

  // 브라우저가 첫 요청에서 낮은 포맷을 골랐다면 장치가 보고한 최대치로 한 번 더 올려본다.
  const maxWidth = capabilities?.width?.max;
  const maxHeight = capabilities?.height?.max;
  if (maxWidth && maxHeight && (settings.width ?? 0) < maxWidth) {
    await track
      .applyConstraints({ width: { ideal: maxWidth }, height: { ideal: maxHeight } })
      .catch(() => undefined);
  }

  // 움직이는 대상을 계속 선명하게 잡도록 연속 초점. (지원하지 않는 브라우저는 무시)
  if (capabilities?.focusMode?.includes('continuous')) {
    await track
      .applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
      .catch(() => undefined);
  }
}

export function WebCameraView({ ref, onReady, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useImperativeHandle(ref, () => ({
    async takePictureAsync() {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        throw new Error('카메라 영상이 아직 준비되지 않았어요.');
      }

      // 화면에 보이는 그대로(회전·방향 반영) 스트림 원본 해상도로 프레임을 저장한다.
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('사진을 처리하지 못했어요.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
      );
      if (!blob) throw new Error('사진을 저장하지 못했어요.');

      return { uri: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
    },
    pausePreview() {
      videoRef.current?.pause();
    },
    resumePreview() {
      void videoRef.current?.play().catch(() => undefined);
    },
  }));

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('이 브라우저는 카메라를 지원하지 않아요. (HTTPS 연결이 필요해요)');
        }

        const stream = await openBestStream();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        if (track) await tuneTrack(track);

        const video = videoRef.current;
        if (!video || cancelled) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);

        const settings = track?.getSettings();
        console.info('[SSOK Camera] 웹 카메라 스트림:', settings);
        onReadyRef.current?.({
          width: video.videoWidth || settings?.width || 0,
          height: video.videoHeight || settings?.height || 0,
        });
      } catch (error) {
        if (cancelled) return;
        console.warn('[SSOK Camera] 웹 카메라를 시작하지 못했어요:', error);
        const denied = error instanceof DOMException && error.name === 'NotAllowedError';
        onErrorRef.current?.(
          denied
            ? '브라우저 설정에서 카메라 접근을 허용해주세요.'
            : error instanceof Error && error.message
              ? error.message
              : '카메라를 시작하지 못했어요.'
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      {createElement('video', {
        ref: videoRef,
        autoPlay: true,
        playsInline: true,
        muted: true,
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          backgroundColor: '#000000',
        },
      })}
    </View>
  );
}
