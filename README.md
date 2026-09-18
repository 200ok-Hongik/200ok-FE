# SSOK

사진 한 장으로 재활용품을 인식하고, 품목별 분리배출 방법과 배출 기록을 관리하는 서비스입니다.

- 운영 웹: [https://ssok.store](https://ssok.store)
- 개발 API 문서: [https://dev.ssok.store/swagger-ui/index.html](https://dev.ssok.store/swagger-ui/index.html)
- 저장소: [200ok-Hongik/200ok-FE](https://github.com/200ok-Hongik/200ok-FE)

## 주요 기능

### AI 재활용품 스캔

- 후면 카메라로 재활용품 촬영
- 원본 품질의 JPEG 이미지를 백엔드로 전송
- 비동기 AI 분석 작업 상태 조회
- AI가 인식한 종류와 오염 상태 확인
- 잘못 인식된 종류 및 상태를 사용자가 직접 수정
- 최종 결과를 확정하고 분리배출 안내 확인

### 홈

- 사용자 정보 및 오늘의 배출 일정 표시
- 월간 누적 재활용 기록 표시
- 자주 스캔한 품목 바로가기
- 스캔 및 품목별 가이드 진입

### 기록

- 월별 캘린더에서 배출 기록 확인
- 날짜별 재활용 기록 조회
- 종류, 오염 상태, 구성품 분리 여부 수정
- 품목에 맞는 아이콘 표시

### 분리배출 가이드

- 종이류, 캔·고철류, 유리병류, 플라스틱류, 비닐류, 스티로폼류 가이드 제공
- 품목별 SVG 아이콘 사용
- 품목명 및 연관 단어 검색
- 각 품목의 단계별 배출 방법과 주의사항을 별도 화면으로 제공
- 시간대, 요일, 계절에 따라 가이드 배너 키워드 변경

### 사용자 설정

- 카카오 OAuth 로그인
- 프로필 및 지역 정보 조회
- 시·도, 구·군, 동 단위 지역 설정
- 로그아웃

## AI 분석 흐름

AI 분석은 긴 요청 시간을 피하기 위해 비동기 작업 방식으로 처리합니다.

```text
카메라 촬영
  → POST /api/ai/analysis
  → jobId 수신
  → GET /api/ai/analysis/{jobId} 반복 조회
  → COMPLETED 응답의 result.scanResultId 확인
  → GET /api/scans/{scanResultId}
  → 사용자 확인 및 결과 확정
```

프론트엔드는 1.5초 간격으로 작업 상태를 조회하며 최대 90초까지 기다립니다.

- `QUEUED`, `ANALYZING`: 계속 조회
- `COMPLETED`: `result.scanResultId`로 결과 화면 이동
- `FAILED`: 백엔드 오류 메시지 표시
- 90초 초과: 분석 시간 초과 안내

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Framework | Expo 57, React Native 0.86, React 19 |
| Routing | Expo Router |
| Language | TypeScript |
| Camera | Expo Camera |
| Image | Expo Image |
| Vector | React Native SVG |
| Styling | React Native StyleSheet, Pretendard |
| Web build | Expo Static Export |
| Deployment | Vercel |

## 프로젝트 구조

```text
src/
├── app/
│   ├── (tabs)/              # 홈, 기록, 스캔, 가이드, My
│   ├── oauth/callback.tsx   # 카카오 OAuth 콜백
│   ├── scan/                # 카메라, 분석 확인, 결과 화면
│   ├── guide-detail.tsx     # 품목별 상세 배출 가이드
│   ├── setting.tsx          # 지역 설정
│   └── index.tsx            # 로그인/온보딩
├── components/
│   ├── ui/                  # 공통 UI 컴포넌트
│   └── OnboardingPreviewArt.tsx
├── constants/               # 테마, 가이드, 품목별 분리 기준
└── services/
    └── api.ts               # 백엔드 API 및 AI 작업 폴링
```

## 시작하기

### 요구 사항

- Node.js 20 이상
- npm
- 카메라를 사용할 경우 HTTPS 환경 또는 iOS/Android 기기

### 설치

```bash
git clone https://github.com/200ok-Hongik/200ok-FE.git
cd 200ok-FE
npm ci
```

### 환경변수

프로젝트 루트에 `.env.local` 또는 실행 환경에 맞는 환경변수를 설정합니다.

```env
EXPO_PUBLIC_FRONTEND_URL=http://localhost:8081
EXPO_PUBLIC_API_BASE_URL=https://dev.ssok.store
```

| 환경변수 | 설명 |
| --- | --- |
| `EXPO_PUBLIC_FRONTEND_URL` | OAuth 콜백에 사용하는 프론트엔드 주소 |
| `EXPO_PUBLIC_API_BASE_URL` | 백엔드 API 기본 주소 |

### 실행

```bash
# 개발 서버
npm start

# 웹
npm run web

# iOS 시뮬레이터
npm run ios

# Android 에뮬레이터
npm run android
```

### 검사 및 빌드

```bash
# TypeScript 검사
npx tsc --noEmit

# 정적 웹 빌드
npm run build
```

빌드 결과는 `dist/`에 생성됩니다.

## 주요 화면 경로

| 경로 | 화면 |
| --- | --- |
| `/` | 로그인 및 온보딩 |
| `/oauth/callback` | 카카오 로그인 콜백 |
| `/(tabs)` | 홈 |
| `/(tabs)/history` | 배출 기록 |
| `/scan/camera` | 카메라 촬영 및 AI 분석 요청 |
| `/scan/captured` | AI 인식 결과 확인 및 수정 |
| `/scan/result` | 확정 결과 및 분리배출 방법 |
| `/(tabs)/guide` | 품목별 가이드 및 검색 |
| `/guide-detail?category={id}` | 품목별 상세 가이드 |
| `/(tabs)/mypage` | 마이페이지 |
| `/setting` | 지역 설정 |

## API 연동

주요 API는 `src/services/api.ts`에서 관리합니다.

- 인증: 카카오 OAuth, 세션 갱신, 로그아웃
- AI 분석: 분석 작업 생성 및 상태 조회
- 스캔: 결과 조회, 사용자 결과 확정, 피드백 저장
- 가이드: 최종 분리배출 가이드 조회
- 홈: 오늘의 일정 및 최근 알림
- 기록: 캘린더 조회, 일정 생성 및 완료 처리
- 사용자: 프로필 및 지역 설정

요청에는 쿠키 기반 세션을 전달하기 위해 `credentials: 'include'`를 사용합니다. 인증이 만료되면 세션 갱신을 한 번 시도한 뒤 원래 요청을 재호출합니다.

## 배포

Vercel은 다음 설정으로 정적 웹을 배포합니다.

```text
install: npm ci
build: npm run vercel-build
output: dist
```

운영 배포 주소는 [https://ssok.store](https://ssok.store)입니다.

## 현재 확인이 필요한 사항

- 일부 홈·캘린더 API는 백엔드 연동 과정에서 임시 사용자 ID를 사용하고 있습니다.
- 카카오 로그인은 백엔드 OAuth 설정과 운영·개발 도메인의 Redirect URI가 일치해야 합니다.
- AI 모델의 분류 정확도는 프론트엔드와 별개이며, 인식 오류에 대비해 결과 수정 UI를 제공합니다.
- 네이티브 앱 아이콘 변경 사항은 새로운 iOS/Android 빌드에서 반영됩니다.

## 라이선스

이 프로젝트는 저장소의 [LICENSE](./LICENSE)를 따릅니다.
