import type { DisposalGuide } from '@/services/api';

// 객체 탐지에 실패했거나 인식할 수 없는 물건(서버 품목 코드 UNKNOWN)은 화면에서 "일반쓰레기"로 보여준다.
// 서버에 "일반쓰레기" 품목이 따로 없어서, 사용자가 고르는 "일반쓰레기"도 UNKNOWN 품목 번호로 확정한다.
export const GENERAL_WASTE_NAME = '일반쓰레기';
export const UNKNOWN_CATEGORY_CODE = 'UNKNOWN';

export function isGeneralWasteCode(code?: string | null) {
  return (code ?? '').toUpperCase() === UNKNOWN_CATEGORY_CODE;
}

// 서버는 UNKNOWN 품목의 가이드를 주지 않는다(404). 배출 안내 조회가 실패했을 때 이 안내를 대신 보여준다.
export function buildGeneralWasteGuide(scanId: number, decisionId: number, categoryId: number): DisposalGuide {
  return {
    decisionId,
    scanId,
    category: { categoryId, code: UNKNOWN_CATEGORY_CODE, name: GENERAL_WASTE_NAME, confidence: 0, categorySource: 'USER' },
    isPass: true,
    guideMessage: '재활용품으로 분류하기 어려운 물건이에요. 종량제 봉투에 담아 일반쓰레기로 배출해 주세요.',
    cautionMessage: '물건을 잘못 인식했다면 이전 화면에서 종류를 직접 바꿔 주세요.',
    checkItems: [],
    schedule: { dischargeDays: '지역 기준에 따라 배출', dischargeTime: '종량제 봉투 사용' },
    finalGuideMessage: '',
  };
}
