import { Platform } from 'react-native';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://dev.ssok.store';
export const FRONTEND_URL = process.env.EXPO_PUBLIC_FRONTEND_URL ?? 'https://ssok.store';

// Kakao 로그인 연동 전까지 백엔드가 요구하는 임시 사용자 ID.
const TEMP_USER_ID = 1;
export const KAKAO_LOGIN_URL = `${API_BASE_URL}/oauth2/authorization/kakao`;

export type CategoryInfo = {
  categoryId: number;
  code: string;
  name: string;
  confidence: number;
  categorySource: string;
};

export type TrashCategory = {
  categoryId: number;
  code: string;
  name: string;
};

export type ChecklistItem = {
  checklistId: number;
  checkItemName: string;
  statusValue: string;
  confidence?: number;
};

export type AnalysisJob = {
  jobId: string;
  status: string;
  result: null | {
    scanResultId?: number;
    objects?: {
      objectId: string;
      bbox: { xMin: number; yMin: number; xMax: number; yMax: number };
      finalResult: {
        itemCode: string;
        states: Record<string, unknown>;
        source: string;
      };
    }[];
    additionalObjects?: unknown[];
  };
  errorMessage: string | null;
};

export type ScanUploadResult = { scanResultId: number };
export type AnalysisStatus = 'QUEUED' | 'ANALYZING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type ScanUploadErrorPhase =
  | 'IMAGE_PREPARATION'
  | 'SUBMISSION'
  | 'STATUS_CHECK'
  | 'AI_ANALYSIS'
  | 'RESULT'
  | 'TIMEOUT';

export class ScanUploadError extends Error {
  constructor(
    message: string,
    public readonly phase: ScanUploadErrorPhase,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'ScanUploadError';
  }
}

export type ScanDetail = {
  scanId: number;
  imageUrl: string;
  category: CategoryInfo;
  states: ChecklistItem[];
  userResult: {
    decisionId: number;
    category: CategoryInfo;
    isPass: boolean;
    states: ChecklistItem[];
  } | null;
  createdAt: string;
};

export type ScanResultConfirmRequest = {
  categoryId: number;
  states: { checklistId: number; statusValue: string }[];
  comment?: string;
};

export type ScanResultConfirmResponse = {
  scanId: number;
  category: CategoryInfo;
  states: ChecklistItem[];
  isConfirmed: boolean;
  decisionId: number;
};

export type AnalysisFeedbackRequest = {
  scanResultId: number;
  categoryCode: string;
  checklistFeedbacks: { checklistId: number; statusValue: string }[];
};

export type AnalysisFeedbackResult = {
  scanResultId: number;
  decisionId: number;
  isPass: boolean;
  categoryName: string;
  guideMessage: string;
  steps: string[];
  schedule: {
    dischargeDays: string;
    dischargeTime: string;
  };
};

export type DisposalGuide = {
  decisionId: number;
  scanId: number;
  category: CategoryInfo;
  isPass: boolean;
  guideMessage: string;
  cautionMessage: string;
  checkItems: {
    checklistId: number;
    checkItemName: string;
    statusValue: string;
    guideMessage: string;
    isSatisfied: boolean;
  }[];
  schedule: {
    dischargeDays: string;
    dischargeTime: string;
  };
  finalGuideMessage: string;
};

type ScanDetailApiResponse = {
  scanResultId: number;
  imageUrl: string;
  aiCategory: CategoryInfo;
  aiStates: ChecklistItem[];
  confirmedResult: ScanDetail['userResult'];
  createdAt: string;
};

type ScanResultConfirmApiResponse = Omit<ScanResultConfirmResponse, 'scanId'> & {
  scanResultId: number;
};

type DisposalGuideApiResponse = Omit<DisposalGuide, 'scanId'> & {
  scanResultId: number;
};

// 다중 객체 분석: 사진 한 장에서 인식된 물건들. 스웨거에 타입이 정의되지 않은 필드
// (states, review, additionalObjects)는 실제 응답을 확인하기 전까지 느슨하게 둔다.
export type ScanObjectSummary = {
  objectId: string;
  bbox: { xMin: number; yMin: number; xMax: number; yMax: number };
  finalResult: {
    itemCode: string;
    states: Record<string, unknown>;
    source: string;
  };
  vlm?: {
    itemCode: string;
    states: Record<string, unknown>;
    confidence: number;
  };
  review?: Record<string, unknown>;
};

export type ScanObjectList = {
  scanResultId: number;
  objects: ScanObjectSummary[];
  // 참고용 후보 목록. 객체별 확정 API 대상이 아니다.
  additionalObjects: Record<string, unknown>[];
};

export type Region = {
  regionId: number;
  regionCode: string;
  sido: string;
  gugun: string;
  dong: string;
};

export type NotificationItem = {
  notificationId: number;
  title: string;
  content: string;
  createdAt: string;
};

export type TodaySchedule = {
  calendarId: number;
  categoryName: string;
  scheduledAt: string;
  isCompleted: boolean;
};

export type HomeSummary = {
  todaySchedules: TodaySchedule[];
  recentNotifications: NotificationItem[];
};

export type CalendarItem = {
  calendarId: number;
  disposalDecisionId: number;
  categoryId: number;
  categoryName: string;
  scheduledAt: string;
  isCompleted: boolean;
};

export type UserProfile = {
  userId: number;
  name: string;
  profileImageUrl: string;
  region: null | {
    regionId: number;
    sido: string;
    gugun: string;
    dong: string;
  };
};

async function request<T>(path: string, init?: RequestInit, canRetry = true): Promise<T> {
  const headers = new Headers(init?.headers);
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    // Spring Security redirects an expired session to Kakao instead of
    // returning 401. On web that cross-origin redirect surfaces as a CORS
    // network error, so refresh once before reporting a request failure.
    if (canRetry && path !== '/api/auth/refresh') {
      const refreshed = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => null);
      if (refreshed?.ok) return request<T>(path, init, false);
    }
    throw error;
  }

  if (response.status === 401 && canRetry && path !== '/api/auth/refresh') {
    const refreshed = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) return request<T>(path, init, false);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('[SSOK API] 요청 실패:', {
      method: init?.method ?? 'GET',
      path,
      status: response.status,
      response: body,
    });
    throw new Error(`SSOK API ${response.status} ${path}: ${body}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return JSON.parse(text) as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function withUserId(path: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ userId: String(TEMP_USER_ID), ...params });
  return `${path}?${query.toString()}`;
}

function completedScanResult(job: AnalysisJob): ScanUploadResult | null {
  if (job.status?.toUpperCase() !== 'COMPLETED') return null;
  const scanResultId = Number(job.result?.scanResultId);
  if (!Number.isFinite(scanResultId) || scanResultId <= 0) {
    throw new ScanUploadError('완료된 분석에 스캔 결과 ID가 없어요.', 'RESULT');
  }
  return { scanResultId };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function uploadScan(
  imageUri: string,
  onStatusChange?: (status: AnalysisStatus) => void
): Promise<ScanUploadResult> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const isFetchableUri = /^(data:|blob:|https?:\/\/)/i.test(imageUri);
    const sourceUri = isFetchableUri ? imageUri : `data:image/jpeg;base64,${imageUri}`;
    const imageResponse = await fetch(sourceUri).catch((error) => {
      throw new ScanUploadError('촬영한 이미지를 불러오지 못했어요.', 'IMAGE_PREPARATION', { cause: error });
    });
    if (!imageResponse.ok) {
      throw new ScanUploadError('촬영한 이미지를 불러오지 못했어요.', 'IMAGE_PREPARATION');
    }
    const imageBlob = await imageResponse.blob().catch((error) => {
      throw new ScanUploadError('촬영한 이미지를 준비하지 못했어요.', 'IMAGE_PREPARATION', { cause: error });
    });
    const uploadBlob = imageBlob.type
      ? imageBlob
      : new Blob([imageBlob], { type: 'image/jpeg' });
    formData.append('image', uploadBlob, 'scan.jpg');
  } else {
    formData.append('image', {
      uri: imageUri,
      name: 'scan.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  // Content-Type is omitted so fetch can add the multipart boundary.
  let job: AnalysisJob;
  try {
    job = await request<AnalysisJob>('/api/ai/analysis', {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    throw new ScanUploadError(
      errorMessage(error, 'AI 분석 요청을 접수하지 못했어요.'),
      'SUBMISSION',
      { cause: error }
    );
  }
  console.info('[SSOK AI] 분석 접수 응답:', job);
  if (!job?.jobId) {
    throw new ScanUploadError('백엔드가 AI 작업 ID를 반환하지 않았어요.', 'SUBMISSION');
  }

  const initialStatus = job.status?.toUpperCase() as AnalysisStatus;
  if (initialStatus) onStatusChange?.(initialStatus);
  const initialResult = completedScanResult(job);
  if (initialResult) return initialResult;
  if (initialStatus === 'FAILED') {
    throw new ScanUploadError(
      job.errorMessage || 'AI 분석에 실패했어요. 다시 촬영해주세요.',
      'AI_ANALYSIS'
    );
  }

  const deadline = Date.now() + 90000;
  let consecutiveStatusErrors = 0;
  while (Date.now() < deadline) {
    let current: AnalysisJob;
    try {
      current = await request<AnalysisJob>(`/api/ai/analysis/${encodeURIComponent(job.jobId)}`);
      consecutiveStatusErrors = 0;
    } catch (error) {
      consecutiveStatusErrors += 1;
      console.warn('[SSOK AI] 분석 상태 조회 실패:', {
        jobId: job.jobId,
        attempt: consecutiveStatusErrors,
        error,
      });
      if (consecutiveStatusErrors >= 3) {
        throw new ScanUploadError(
          errorMessage(error, 'AI 분석 상태를 확인하지 못했어요.'),
          'STATUS_CHECK',
          { cause: error }
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }
    console.info('[SSOK AI] 분석 조회 응답:', current);
    const status = current.status?.toUpperCase() as AnalysisStatus;
    if (status) onStatusChange?.(status);

    const result = completedScanResult(current);
    if (result) return result;
    if (status === 'FAILED') {
      throw new ScanUploadError(
        current.errorMessage || 'AI 분석에 실패했어요. 다시 촬영해주세요.',
        'AI_ANALYSIS'
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new ScanUploadError(
    'AI 분석이 예상보다 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.',
    'TIMEOUT'
  );
}

export async function checkAiServerHealth(): Promise<string> {
  const health = await request<string>('/api/ai/server/health');
  console.info('[SSOK AI] 서버 상태 응답:', health);
  const normalized = String(health).toUpperCase();
  if (normalized.includes('DOWN') || normalized.includes('UNHEALTHY') || normalized.includes('FAIL')) {
    throw new Error('AI 분석 서버가 현재 준비되지 않았어요. 잠시 후 다시 시도해주세요.');
  }
  return health;
}

export async function submitAnalysisFeedback(
  body: AnalysisFeedbackRequest
): Promise<AnalysisFeedbackResult> {
  const result = await request<AnalysisFeedbackResult>('/api/ai/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.info('[SSOK AI] 결과 확정 응답:', result);
  return result;
}

export async function getScan(scanId: number): Promise<ScanDetail> {
  return toScanDetail(await request<ScanDetailApiResponse>(`/api/scans/${scanId}`));
}

function toScanDetail(result: ScanDetailApiResponse): ScanDetail {
  return {
    scanId: result.scanResultId,
    imageUrl: result.imageUrl,
    category: result.aiCategory,
    states: result.aiStates,
    userResult: result.confirmedResult,
    createdAt: result.createdAt,
  };
}

// 다중 객체 결과에서는 기존 getScan / confirmScanResult / getDisposalGuide(scanId 단독)가
// 400을 반환하므로, 아래 객체 단위 API를 사용한다.
export async function getScanObjects(scanId: number): Promise<ScanObjectList> {
  const result = await request<ScanObjectList>(`/api/scans/${scanId}/objects`);
  return { ...result, objects: result.objects ?? [], additionalObjects: result.additionalObjects ?? [] };
}

export async function getScanObject(scanId: number, objectId: string): Promise<ScanDetail> {
  const result = await request<ScanDetailApiResponse>(
    `/api/scans/${scanId}/objects/${encodeURIComponent(objectId)}`
  );
  return toScanDetail(result);
}

export async function confirmScanObjectResult(
  scanId: number,
  objectId: string,
  body: ScanResultConfirmRequest
): Promise<ScanResultConfirmResponse> {
  console.info('[SSOK AI] 객체 분석 결과 수정 및 확정 요청:', { scanResultId: scanId, objectId, body });
  const result = await request<ScanResultConfirmApiResponse>(
    `/api/scans/${scanId}/objects/${encodeURIComponent(objectId)}/result`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  return { ...result, scanId: result.scanResultId };
}

export async function getObjectDisposalGuide(scanId: number, objectId: string): Promise<DisposalGuide> {
  const result = await request<DisposalGuideApiResponse>(
    `/api/scans/${scanId}/objects/${encodeURIComponent(objectId)}/disposal-guide`
  );
  return { ...result, scanId: result.scanResultId };
}

export async function confirmScanResult(
  scanId: number,
  body: ScanResultConfirmRequest
): Promise<ScanResultConfirmResponse> {
  console.info('[SSOK AI] 분석 결과 수정 및 확정 요청:', {
    scanResultId: scanId,
    body,
  });
  const result = await request<ScanResultConfirmApiResponse>(`/api/scans/${scanId}/result`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ...result, scanId: result.scanResultId };
}

export async function getDisposalGuide(scanId: number): Promise<DisposalGuide> {
  const result = await request<DisposalGuideApiResponse>(`/api/scans/${scanId}/disposal-guide`);
  return { ...result, scanId: result.scanResultId };
}

export async function getTrashCategories(): Promise<TrashCategory[]> {
  return request<TrashCategory[]>('/api/trash-categories');
}

export async function submitScanFeedback(scanId: number, comment: string): Promise<void> {
  await request<void>(`/api/scans/${scanId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
}

export async function getRegions(sido?: string, gugun?: string): Promise<Region[]> {
  const params = new URLSearchParams();
  if (sido) params.set('sido', sido);
  if (gugun) params.set('gugun', gugun);
  const query = params.toString();
  return request<Region[]>(`/api/regions${query ? `?${query}` : ''}`);
}

export async function getHomeSummary(): Promise<HomeSummary> {
  return request<HomeSummary>(withUserId('/api/home'));
}

export async function getRecentNotifications(): Promise<NotificationItem[]> {
  return request<NotificationItem[]>(withUserId('/api/notifications/recent'));
}

export async function getCalendars(startDate: string, endDate: string): Promise<CalendarItem[]> {
  return request<CalendarItem[]>(withUserId('/api/calendars', { startDate, endDate }));
}

export async function createCalendar(disposalDecisionId: number, scheduledAt?: string): Promise<CalendarItem> {
  return request<CalendarItem>(withUserId('/api/calendars'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disposalDecisionId, ...(scheduledAt ? { scheduledAt } : {}) }),
  });
}

export async function completeCalendar(calendarId: number): Promise<CalendarItem> {
  return request<CalendarItem>(withUserId(`/api/calendars/${calendarId}/complete`), { method: 'PATCH' });
}

export async function getProfile(): Promise<UserProfile> {
  return request<UserProfile>('/api/users/me');
}

export async function updateRegion(regionId: number): Promise<void> {
  await request('/api/users/me/region', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ regionId }),
  });
}

export async function refreshSession(): Promise<void> {
  await request<void>('/api/auth/refresh', { method: 'POST' }, false);
}

export async function logout(): Promise<void> {
  await request<void>('/api/auth/logout', { method: 'POST' }, false);
}
