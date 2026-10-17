import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

// 백엔드 품목 코드별 아이콘. "자주 스캔한 항목"(홈·마이페이지)에서 함께 쓴다.
export const CATEGORY_ICONS: Record<string, IoniconName> = {
  CLEAR_PET_BOTTLE: 'water-outline',
  PLASTIC: 'flask-outline',
  CAN: 'cube-outline',
  GLASS_BOTTLE: 'wine-outline',
  VINYL: 'bag-handle-outline',
  PAPER: 'document-text-outline',
  PAPER_PACK: 'file-tray-outline',
  STYROFOAM: 'cube-outline',
};
