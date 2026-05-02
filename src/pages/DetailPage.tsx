import type { InputData, Result } from "../types/recycle";

type Props = {
  data: InputData;
  result: Result;
  onBack: () => void;
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

const DetailPage = ({ data, result, onBack }: Props) => {
  return (
    <main className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-sky-50 px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-4xl bg-white/95 p-8 shadow-xl ring-1 ring-gray-100 md:p-10">
        <header className="mb-8 flex items-center justify-between border-b border-gray-200 pb-6">
          <button
            onClick={onBack}
            className="rounded-2xl border border-gray-300 px-5 py-3 font-semibold transition hover:bg-gray-50"
          >
            ← 결과로 돌아가기
          </button>
          <h1 className="text-xl font-extrabold text-gray-900">판정 근거</h1>
        </header>

        <section className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm font-bold text-emerald-600">
              적용된 규칙
            </p>

            <div className="rounded-3xl bg-emerald-50 p-6">
              <h2 className="mb-4 text-xl font-extrabold text-gray-900">
                공통 규칙
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li>• 페트병은 내용물을 비우고 헹군 뒤 배출해야 합니다.</li>
                <li>• 라벨은 제거한 뒤 배출하는 것이 권장됩니다.</li>
                <li>• 뚜껑은 지역 안내에 따라 분리하거나 닫아서 배출할 수 있습니다.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm font-bold text-sky-600">지역 규칙</p>

            <div className="rounded-3xl bg-sky-50 p-6">
              <h2 className="mb-4 text-xl font-extrabold text-gray-900">
                {regionLabelMap[data.region]} {districtLabelMap[data.district]} 기준
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li>• 투명 페트병은 일반 플라스틱과 구분해 별도배출 대상으로 봅니다.</li>
                <li>• 지역별 지정 요일이나 배출 시간은 지자체 안내를 확인해야 합니다.</li>
                <li>• 현재 MVP에서는 지역 규칙을 단순화하여 별도배출 기준만 적용합니다.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm font-bold text-amber-600">
              시스템 판단 과정
            </p>

            <div className="space-y-4">
              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="mb-1 text-sm font-bold text-gray-400">1단계</p>
                <p className="font-semibold text-gray-800">
                  사용자가 선택한 품목을 투명 페트병으로 확인했습니다.
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="mb-1 text-sm font-bold text-gray-400">2단계</p>
                <p className="font-semibold text-gray-800">
                  상태값을 확인했습니다:{" "}
                  {data.hasLabel ? "라벨 있음" : "라벨 없음"} /{" "}
                  {data.hasLeftover ? "내용물 남음" : "내용물 없음"} /{" "}
                  {data.hasCap ? "뚜껑 있음" : "뚜껑 없음"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="mb-1 text-sm font-bold text-gray-400">3단계</p>
                <p className="font-semibold text-gray-800">
                  지역 규칙과 공통 규칙을 함께 적용하여 “{result.judgement}”로
                  판정했습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
            <p className="mb-2 text-sm font-bold text-emerald-700">
              최종 설명
            </p>
            <p className="leading-relaxed text-gray-700">
              {result.reason} 따라서 현재 입력값 기준으로는{" "}
              <span className="font-extrabold text-gray-900">
                {result.judgement}
              </span>
              로 안내됩니다.
            </p>
          </div>

          <button
            onClick={onBack}
            className="w-full rounded-3xl bg-gray-900 py-4 font-extrabold text-white transition hover:bg-black"
          >
            결과 화면으로 돌아가기
          </button>
        </section>
      </div>
    </main>
  );
};

export default DetailPage;