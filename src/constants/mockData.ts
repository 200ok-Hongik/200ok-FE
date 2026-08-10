export const RegionData: Record<string, Record<string, string[]>> = {
  서울특별시: {
    마포구: ['연남동', '망원 1동', '망원 2동'],
    강남구: ['역삼동', '삼성동', '논현동'],
    종로구: ['청운효자동', '사직동', '삼청동'],
  },
  경기도: {
    성남시: ['분당동', '수내동', '정자동'],
    용인시: ['수지구', '기흥구', '처인구'],
  },
};

export type DetectedItem = {
  id: string;
  category: 'plastic' | 'glass';
  categoryLabel: string;
  itemLabel: string;
  itemType: string;
  material: string;
  confidence: number;
  box: { top: number; left: number; width: number; height: number };
};

export const MockDetections: DetectedItem[] = [
  {
    id: 'pet',
    category: 'plastic',
    categoryLabel: 'plastic',
    itemLabel: '페트병 (PET)',
    itemType: '플라스틱 용기',
    material: 'PET',
    confidence: 0.94,
    box: { top: 0.32, left: 0.14, width: 0.4, height: 0.42 },
  },
  {
    id: 'glass',
    category: 'glass',
    categoryLabel: 'glass',
    itemLabel: '유리병',
    itemType: '유리 (GLASS)',
    material: 'GLASS',
    confidence: 0.89,
    box: { top: 0.28, left: 0.5, width: 0.34, height: 0.46 },
  },
];

export const DisposalGuideSteps = [
  { title: '라벨 제거', desc: '라벨을 완전히 떼어내주세요.\n라벨은 비닐류로 따로 배출합니다.' },
  { title: '내용물 비우기', desc: '물로 가볍게 행궈주세요.' },
  { title: '압착하기', desc: '공기를 빼고 납작하게 눌러주세요.' },
  { title: '배출하기', desc: '플라스틱 수거함에 배출해주세요.' },
];

export const GuideCategories = [
  { id: 'paper', label: '종이류', emoji: '📦' },
  { id: 'can', label: '금속캔, 고철', emoji: '🥫' },
  { id: 'glass', label: '유리병류', emoji: '🍾' },
  { id: 'plastic', label: '플라스틱 용기류', emoji: '🧴' },
  { id: 'vinyl', label: '비닐류', emoji: '🛍️' },
  { id: 'styrofoam', label: '스티로폼류', emoji: '📦' },
];

export type HistoryEntry = {
  date: string;
  time: string;
  itemLabel: string;
  method: string;
};

export const HistoryEntries: HistoryEntry[] = [
  { date: '2026-07-06', time: '09:10', itemLabel: '페트병', method: '뚜껑, 라벨 제거 후 분리배출' },
  { date: '2026-07-06', time: '18:20', itemLabel: '캔', method: '내용물을 비우고 분리배출' },
  { date: '2026-07-07', time: '12:30', itemLabel: '종이류', method: '테이프 제거 후 분리배출' },
  { date: '2026-07-07', time: '14:10', itemLabel: '페트병', method: '뚜껑, 라벨 제거 후 분리배출' },
  { date: '2026-07-07', time: '17:40', itemLabel: '유리병', method: '뚜껑 제거 후 분리배출' },
  { date: '2026-07-07', time: '20:15', itemLabel: '캔', method: '내용물을 비우고 분리배출' },
  { date: '2026-07-08', time: '16:20', itemLabel: '페트병', method: '뚜껑, 라벨 제거 후 분리배출' },
  { date: '2026-07-10', time: '10:10', itemLabel: '종이류', method: '테이프 제거 후 분리배출' },
  { date: '2026-07-10', time: '12:00', itemLabel: '캔', method: '내용물을 비우고 분리배출' },
  { date: '2026-07-10', time: '14:35', itemLabel: '페트병', method: '뚜껑, 라벨 제거 후 분리배출' },
  { date: '2026-07-10', time: '18:05', itemLabel: '유리병', method: '뚜껑 제거 후 분리배출' },
  { date: '2026-07-10', time: '21:00', itemLabel: '플라스틱', method: '깨끗이 씻어 분리배출' },
  { date: '2026-07-21', time: '13:00', itemLabel: '페트병', method: '뚜껑, 라벨 제거 후 분리배출' },
  { date: '2026-07-21', time: '17:00', itemLabel: '페트병', method: '뚜껑, 라벨 제거 후 분리배출' },
  { date: '2026-07-26', time: '11:20', itemLabel: '유리병', method: '뚜껑 제거 후 분리배출' },
];

export const FrequentItems = [
  { id: 'pet', label: '페트병', icon: 'water-outline' as const },
  { id: 'glass', label: '유리병', icon: 'wine-outline' as const },
  { id: 'can', label: '캔', icon: 'cube-outline' as const },
  { id: 'paper', label: '종이류', icon: 'document-text-outline' as const },
  { id: 'plastic', label: '플라스틱', icon: 'flask-outline' as const },
];
