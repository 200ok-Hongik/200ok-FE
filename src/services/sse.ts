import { Platform } from 'react-native';

// React Native(iOS/Android)에는 EventSource가 없어서, 스트리밍 fetch로 text/event-stream을 직접 읽는다.
// 웹은 브라우저 EventSource를 그대로 쓰므로 이 모듈은 EventSource가 없는 환경에서만 사용한다.

export type SseMessage = { event: string; data: string };

// SSE 텍스트 조각을 받아 이벤트 단위(빈 줄로 구분)로 잘라 준다. 조각이 이벤트 중간에서 끊겨도 다음 조각과 이어 붙인다.
export function createSseParser(onMessage: (message: SseMessage) => void) {
  let buffer = '';

  const dispatch = (block: string) => {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue; // 빈 줄·주석(keep-alive)
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }
    if (data.length > 0 || event !== 'message') onMessage({ event, data: data.join('\n') });
  };

  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n?/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        dispatch(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    },
  };
}

type OpenSseOptions = {
  onOpen?: () => void;
  onMessage: (message: SseMessage) => void;
  // 연결 실패, 서버 오류 응답, 또는 서버가 스트림을 닫아 버린 경우
  onError: (error: unknown) => void;
};

type StreamingFetch = (
  url: string,
  init: { headers?: Record<string, string>; credentials?: 'include'; signal?: AbortSignal }
) => Promise<{ ok: boolean; status: number; body: ReadableStream<Uint8Array> | null }>;

function getStreamingFetch(): StreamingFetch {
  if (Platform.OS === 'web') return fetch as unknown as StreamingFetch;
  // RN 기본 fetch는 응답을 스트리밍하지 못해서 Expo의 스트리밍 fetch를 쓴다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('expo/fetch') as { fetch: StreamingFetch }).fetch;
}

// 반환값은 연결을 닫는 함수. 닫은 뒤에는 어떤 콜백도 호출하지 않는다.
export function openSseStream(url: string, { onOpen, onMessage, onError }: OpenSseOptions, fetchImpl?: StreamingFetch): () => void {
  const controller = new AbortController();
  let closed = false;

  void (async () => {
    try {
      const response = await (fetchImpl ?? getStreamingFetch())(url, {
        headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' },
        // 로그인 쿠키를 함께 보낸다.
        credentials: 'include',
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error(`SSE 연결 실패 (${response.status})`);
      if (closed) return;
      onOpen?.();

      const parser = createSseParser((message) => {
        if (!closed) onMessage(message);
      });
      const decoder = new TextDecoder();
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
      }
      // 완료/실패 신호 없이 서버가 연결을 끝냈다면 상태를 다시 확인하도록 알린다.
      if (!closed) onError(new Error('SSE 연결이 종료됐어요.'));
    } catch (error) {
      if (!closed) onError(error);
    }
  })();

  return () => {
    closed = true;
    controller.abort();
  };
}
