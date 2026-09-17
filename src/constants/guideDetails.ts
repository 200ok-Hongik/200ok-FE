export type GuideStep = {
  title: string;
  description: string;
};

export type GuideDetail = {
  title: string;
  steps: GuideStep[];
  cautions: string[];
};

export const GUIDE_DETAILS: Record<string, GuideDetail> = {
  paper: {
    title: '종이류',
    steps: [
      { title: '이물질 제거', description: '테이프, 송장, 스프링 등 종이가 아닌 재질을 제거해주세요.' },
      { title: '깨끗하게 정리하기', description: '젖거나 오염된 부분은 잘라내고 펼쳐주세요.' },
      { title: '종류별로 묶기', description: '신문지와 책자, 상자는 종류별로 모아주세요.' },
      { title: '배출하기', description: '끈으로 묶거나 종이 수거함에 배출해주세요.' },
    ],
    cautions: ['영수증, 코팅지, 사진은 일반쓰레기로 배출합니다.', '음식물이나 기름에 오염된 종이는 재활용할 수 없어요.'],
  },
  can: {
    title: '금속캔, 고철',
    steps: [
      { title: '내용물 비우기', description: '캔과 용기 안의 내용물을 완전히 비워주세요.' },
      { title: '깨끗하게 헹구기', description: '남은 이물질을 물로 가볍게 헹궈주세요.' },
      { title: '부속품 분리하기', description: '플라스틱 뚜껑과 빨대 등 다른 재질을 제거해주세요.' },
      { title: '배출하기', description: '가능하면 압착해 캔·고철 수거함에 배출해주세요.' },
    ],
    cautions: ['부탄가스와 살충제 용기는 구멍을 뚫지 말고 내용물을 완전히 제거합니다.', '페인트통 등 유해물질 용기는 지역별 배출 기준을 확인해주세요.'],
  },
  glass: {
    title: '유리병류',
    steps: [
      { title: '내용물 비우기', description: '병 안의 내용물을 완전히 비워주세요.' },
      { title: '뚜껑·마개 제거', description: '금속이나 플라스틱 뚜껑과 마개를 분리해주세요.' },
      { title: '가볍게 헹구기', description: '병 내부의 이물질을 물로 헹궈주세요.' },
      { title: '배출하기', description: '색상별 유리병 수거함에 깨지지 않도록 배출해주세요.' },
    ],
    cautions: ['거울, 도자기, 내열유리는 유리병류로 배출하지 않습니다.', '깨진 유리는 종이에 감싸 일반쓰레기로 안전하게 배출해주세요.'],
  },
  plastic: {
    title: '플라스틱류',
    steps: [
      { title: '라벨 제거', description: '라벨을 완전히 떼어내주세요.\n라벨은 비닐류로 따로 배출합니다.' },
      { title: '내용물 비우기', description: '물로 가볍게 헹궈주세요.' },
      { title: '압착하기', description: '공기를 빼고 납작하게 눌러주세요.' },
      { title: '배출하기', description: '플라스틱 수거함에 배출해주세요.' },
    ],
    cautions: ['유색 페트병은 일반 플라스틱 수거함에 배출합니다.', '음식물이 묻은 경우 반드시 세척 후 배출해주세요.'],
  },
  vinyl: {
    title: '비닐류',
    steps: [
      { title: '내용물 비우기', description: '비닐 안의 내용물과 이물질을 제거해주세요.' },
      { title: '깨끗하게 닦기', description: '물기와 음식물은 닦거나 가볍게 씻어주세요.' },
      { title: '부피 줄이기', description: '비닐을 펼친 뒤 공기를 빼고 모아주세요.' },
      { title: '배출하기', description: '투명 봉투에 모아 비닐류로 배출해주세요.' },
    ],
    cautions: ['오염을 제거하기 어려운 비닐은 일반쓰레기로 배출합니다.', '은박 비닐과 여러 재질이 섞인 포장지는 지역 기준을 확인해주세요.'],
  },
  styrofoam: {
    title: '스티로폼류',
    steps: [
      { title: '내용물 비우기', description: '상자 안의 내용물과 완충재를 모두 꺼내주세요.' },
      { title: '테이프·라벨 제거', description: '테이프와 운송장 등 다른 재질을 제거해주세요.' },
      { title: '깨끗하게 씻기', description: '음식물과 이물질을 닦고 완전히 말려주세요.' },
      { title: '배출하기', description: '스티로폼 전용 수거함에 배출해주세요.' },
    ],
    cautions: ['색상이나 무늬가 있는 스티로폼은 지역 기준을 확인해주세요.', '건축용 단열재와 심하게 오염된 제품은 재활용할 수 없어요.'],
  },
};
