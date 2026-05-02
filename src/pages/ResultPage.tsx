import type { InputData, Result } from "../types/recycle";

type Props = {
  data: InputData;
  result: Result;
  onBack: () => void;
  onDetail: () => void;
  onFeedback: () => void;
};

const regionLabelMap: Record<string, string> = {
  SEOUL: "서울시",
  GYEONGGI: "경기도",
};

const districtLabelMap: Record<string, string> = {
  MAPO: "마포구",
  GANGNAM: "강남구",
  YONGIN: "용인시",
  SEONGNAM: "성남시",
};

const itemLabelMap: Record<string, string> = {
  CLEAR_PET_BOTTLE: "투명 페트병",
  CAN: "캔",
  GLASS_BOTTLE: "유리병",
  PLASTIC_CONTAINER: "플라스틱 용기",
};

const ResultPage = ({
  data,
  result,
  onBack,
  onDetail,
  onFeedback,
}: Props) => {
  return (
    <main className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-sky-50 px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-4xl bg-white/95 p-8 shadow-xl ring-1 ring-gray-100 md:p-10">
        <header className="mb-8 flex items-center justify-between border-b border-gray-200 pb-6">
          <button
            onClick={onBack}
            className="rounded-2xl border border-gray-300 px-5 py-3 font-semibold transition hover:bg-gray-50"
          >
            ← 다시 입력
          </button>

          <h1 className="text-xl font-extrabold text-gray-900">
            판정 결과 화면
          </h1>
        </header>

        <section className="mb-8">
          <p className="mb-3 text-sm font-bold text-emerald-600">
            AI 추정 결과
          </p>

          <div className="grid gap-4 rounded-3xl bg-gray-50 p-6 text-gray-700 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-400">품목</p>
              <p className="font-bold">{itemLabelMap[data.item]}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">상태</p>
              <p className="font-bold">
                {data.hasLabel ? "라벨 있음" : "라벨 없음"} /{" "}
                {data.hasLeftover ? "내용물 남음" : "내용물 없음"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-400">지역</p>
              <p className="font-bold">
                {regionLabelMap[data.region]} {districtLabelMap[data.district]}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-4xl border border-emerald-100 bg-emerald-50 p-8">
          <p className="mb-3 text-sm font-bold text-emerald-700">
            최종 판정
          </p>

          <h2 className="mb-6 text-3xl font-extrabold text-gray-900">
            {result.judgement}
          </h2>

          <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-bold text-gray-900">필요한 조치</h3>

            <ol className="space-y-3">
              {result.actions.map((action, index) => (
                <li
                  key={action}
                  className="flex gap-3 font-semibold text-gray-700"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-700">
                    {index + 1}
                  </span>
                  {action}
                </li>
              ))}
            </ol>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="mb-2 text-sm font-bold text-gray-400">
                배출 방법
              </p>
              <p className="font-bold text-gray-900">{result.method}</p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="mb-2 text-sm font-bold text-gray-400">
                판정 근거
              </p>
              <p className="text-gray-700">{result.reason}</p>
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={onDetail}
            className="rounded-2xl border border-gray-300 px-5 py-3 font-semibold transition hover:bg-gray-50"
          >
            근거 보기
          </button>

          <button
            onClick={onBack}
            className="rounded-2xl border border-gray-300 px-5 py-3 font-semibold transition hover:bg-gray-50"
          >
            다시 판정하기
          </button>

          <button
            onClick={onFeedback}
            className="rounded-2xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-black"
          >
            이 결과가 이상해요
          </button>
        </div>
      </div>
    </main>
  );
};

export default ResultPage;