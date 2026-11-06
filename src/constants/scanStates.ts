// 서버의 상태 항목 이름(checkItemName, 예: hasCap)을 화면에 보여줄 이름과 값 문구로 바꾼다.
// 모르는 항목은 서버 이름을 그대로 쓰고, 값은 예/아니오로 보여준다.
export type StateMeta = { label: string; on: string; off: string };

const STATE_META: { names: string[]; meta: StateMeta }[] = [
  { names: ['hascap', 'cap'], meta: { label: '뚜껑', on: '있음', off: '없음' } },
  { names: ['haslabel', 'label'], meta: { label: '라벨', on: '있음', off: '없음' } },
  { names: ['iscontaminated', 'contaminated'], meta: { label: '오염 상태', on: '오염됨', off: '깨끗함' } },
  { names: ['isempty'], meta: { label: '내용물', on: '비어 있음', off: '남아 있음' } },
  { names: ['hascontent', 'hascontents', 'hasliquid', 'hasresidue'], meta: { label: '내용물', on: '남아 있음', off: '비어 있음' } },
  { names: ['iscompressed', 'iscrushed', 'compressed', 'ispressed'], meta: { label: '압착', on: '찌그러뜨림', off: '그대로' } },
  { names: ['istransparent', 'transparent'], meta: { label: '투명 여부', on: '투명', off: '불투명' } },
];

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

export function stateMeta(name: string): StateMeta {
  const normalized = normalizeName(name);
  return STATE_META.find((entry) => entry.names.includes(normalized))?.meta ?? { label: name, on: '예', off: '아니오' };
}

export function isStateOn(value: unknown) {
  return ['true', 'yes', '1', 'y'].includes(String(value).toLowerCase());
}

// "라벨 있음", "오염 상태 깨끗함"처럼 한 항목을 짧게 설명한다.
export function describeState(name: string, value: unknown) {
  const meta = stateMeta(name);
  return `${meta.label} ${isStateOn(value) ? meta.on : meta.off}`;
}
