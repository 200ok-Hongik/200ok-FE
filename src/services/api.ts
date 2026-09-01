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
  source: string;
};

export type ChecklistItem = {
  checklistId: number;
  checkItemName: string;
  statusValue: string;
  confidence?: number;
};

export type ScanUploadResult = {
  scanResultId: number;
  categoryCode: string;
  categoryConfidence: number;
  modelVersion: string;
  checklistResults: ChecklistItem[];
};

export type ScanDetail = {
  scanId: number;
  imageUrl: string;
  category: CategoryInfo;
  states: ChecklistItem[];
  userResult: {
    decisionId: number;
    categoryId: number;
    source: string;
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && canRetry && path !== '/api/auth/refresh') {
    const refreshed = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) return request<T>(path, init, false);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`SSOK API ${response.status} ${path}: ${body}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function withUserId(path: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ userId: String(TEMP_USER_ID), ...params });
  return `${path}?${query.toString()}`;
}

export async function uploadScan(imageUri: string): Promise<ScanUploadResult> {
  const formData = new FormData();

  if (typeof window !== 'undefined') {
    const dataUri = imageUri.startsWith('data:') ? imageUri : `data:image/jpeg;base64,${imageUri}`;
    const imageResponse = await fetch(dataUri);
    const imageBlob = await imageResponse.blob();
    formData.append('image', imageBlob, 'scan.jpg');
  } else {
    formData.append('image', {
      uri: imageUri,
      name: 'scan.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  // Content-Type is intentionally omitted: fetch/RN must generate it itself
  // (including the multipart boundary) from the FormData body. Setting it
  // manually here breaks the boundary and the request fails outright.
  return request<ScanUploadResult>(withUserId('/api/scans'), {
    method: 'POST',
    body: formData,
  });
}

export async function getScan(scanId: number): Promise<ScanDetail> {
  return request<ScanDetail>(withUserId(`/api/scans/${scanId}`));
}

export async function confirmScanResult(
  scanId: number,
  body: ScanResultConfirmRequest
): Promise<ScanResultConfirmResponse> {
  return request<ScanResultConfirmResponse>(withUserId(`/api/scans/${scanId}/result`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function getDisposalGuide(scanId: number): Promise<DisposalGuide> {
  return request<DisposalGuide>(withUserId(`/api/scans/${scanId}/disposal-guide`));
}

export async function submitScanFeedback(scanId: number, comment: string): Promise<void> {
  await request<void>(withUserId(`/api/scans/${scanId}/feedback`), {
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
