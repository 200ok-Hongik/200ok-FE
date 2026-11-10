// 서버의 상태 항목 이름(checkItemName, 예: hasCap)을 화면에 보여줄 이름과 값 문구로 바꾼다.
// 목록에 없는 항목은 서버 이름이 그대로 보이면 이상해서, 화면에는 보여주지 않는다. (값은 그대로 서버에 보낸다)
export type StateMeta = { label: string; on: string; off: string };

const STATE_META: { names: string[]; meta: StateMeta }[] = [
  { names: ['hascap', 'cap'], meta: { label: '뚜껑', on: '있음', off: '없음' } },
  { names: ['haslabel', 'label'], meta: { label: '라벨', on: '있음', off: '없음' } },
  { names: ['hastape', 'tape'], meta: { label: '테이프', on: '붙어 있음', off: '없음' } },
  { names: ['iscontaminated', 'contaminated'], meta: { label: '오염 상태', on: '오염됨', off: '깨끗함' } },
  { names: ['iswet', 'wet'], meta: { label: '젖음', on: '젖음', off: '마름' } },
  { names: ['isempty'], meta: { label: '내용물', on: '비어 있음', off: '남아 있음' } },
  { names: ['hascontent', 'hascontents', 'hasliquid', 'hasresidue'], meta: { label: '내용물', on: '남아 있음', off: '비어 있음' } },
  { names: ['iscompressed', 'iscrushed', 'compressed', 'ispressed'], meta: { label: '압착', on: '찌그러뜨림', off: '그대로' } },
  { names: ['isflattened', 'flattened'], meta: { label: '납작하게 접기', on: '접음', off: '그대로' } },
  { names: ['istransparent', 'transparent'], meta: { label: '투명 여부', on: '투명', off: '불투명' } },
];

// 품목이 달라도 같은 상태를 가리키는 항목을 이어 붙일 때 쓰는 이름. (예: hasLabel, HAS_LABEL → haslabel)
export function stateKey(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

// 사용자가 품목을 바꿔서 새로 생긴 상태 항목의 처음 값. 문제가 없는 쪽(라벨·뚜껑·오염 없음, 비어 있음, 투명, 압착함)으로 둔다.
// 화면에서 하나씩 고칠 수 있다.
export function defaultStateValue(name: string) {
  const key = stateKey(name);
  const positive = ['isempty', 'istransparent', 'iscrushed', 'iscompressed', 'ispressed', 'isflattened'];
  return String(positive.includes(key));
}

// 화면에 보여줄 수 있는 항목이면 이름과 값 문구를, 아니면 null을 돌려준다.
export function stateMeta(name: string): StateMeta | null {
  const normalized = stateKey(name);
  return STATE_META.find((entry) => entry.names.includes(normalized))?.meta ?? null;
}

export function isStateOn(value: unknown) {
  return ['true', 'yes', '1', 'y'].includes(String(value).toLowerCase());
}

// "라벨 있음", "오염 상태 깨끗함"처럼 한 항목을 짧게 설명한다. 보여줄 수 없는 항목은 null.
export function describeState(name: string, value: unknown) {
  const meta = stateMeta(name);
  return meta ? `${meta.label} ${isStateOn(value) ? meta.on : meta.off}` : null;
}
