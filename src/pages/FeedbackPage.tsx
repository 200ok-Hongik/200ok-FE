import { useState } from "react";
import type { InputData, Result } from "../types/recycle";

type Props = {
  data: InputData;
  result: Result;
  onBack: () => void;
  onSubmit: () => void;
};

const FeedbackPage = ({ data, result, onBack, onSubmit }: Props) => {
  // 🔥 여러 개 선택 가능하도록 배열로 변경
  const [issueTypes, setIssueTypes] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [correctItem, setCorrectItem] = useState("");
  const [correctHasLabel, setCorrectHasLabel] = useState(data.hasLabel);
  const [correctHasLeftover, setCorrectHasLeftover] = useState(
    data.hasLeftover
  );

  // 🔥 체크 토글 함수
  const toggleIssueType = (label: string) => {
    setIssueTypes((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const handleSubmit = () => {
    const feedbackData = {
      originalInput: data,
      originalResult: result,
      issueTypes,
      comment,
      correctInfo: {
        item: correctItem,
        hasLabel: correctHasLabel,
        hasLeftover: correctHasLeftover,
      },
    };

    console.log("피드백 제출:", feedbackData);

    onSubmit();
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-sky-50 px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-4xl bg-white/95 p-8 shadow-xl ring-1 ring-gray-100 md:p-10">
        {/* 헤더 */}
        <header className="mb-8 flex items-center justify-between border-b border-gray-200 pb-6">
          <button
            onClick={onBack}
            className="rounded-2xl border border-gray-300 px-5 py-3 font-semibold transition hover:bg-gray-50"
          >
            ← 결과로 돌아가기
          </button>

          <h1 className="text-xl font-extrabold text-gray-900">
            결과에 대한 피드백
          </h1>
        </header>

        {/* 현재 결과 */}
        <section className="mb-6 rounded-3xl bg-gray-50 p-6">
          <p className="mb-2 text-sm font-bold text-gray-400">
            현재 판정 결과
          </p>

          <h2 className="text-2xl font-extrabold text-gray-900">
            {result.judgement}
          </h2>

          <p className="mt-2 text-gray-600">{result.reason}</p>
        </section>

        {/* 피드백 입력 */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-extrabold text-gray-900">
            어떤 점이 이상했나요?
          </h2>

          {/* 🔥 체크박스로 변경 */}
          <div className="space-y-3">
            {[
              "품목 분류가 틀렸어요",
              "상태 판정이 틀렸어요",
              "지역 규칙 적용이 이상해요",
              "최종 안내가 이해되지 않아요",
            ].map((label) => (
              <label
                key={label}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 font-semibold text-gray-700 transition hover:bg-emerald-50"
              >
                <input
                  type="checkbox"
                  checked={issueTypes.includes(label)}
                  onChange={() => toggleIssueType(label)}
                  className="h-5 w-5 accent-emerald-600"
                />
                {label}
              </label>
            ))}
          </div>

          {/* 수정 의견 */}
          <div className="mt-7">
            <h3 className="mb-3 font-bold text-gray-900">수정 의견</h3>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="예: 라벨은 제거되어 있었는데 라벨 있음으로 판정됐어요."
              className="h-32 w-full resize-none rounded-2xl border border-gray-300 p-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          {/* 정답 정보 */}
          <div className="mt-7">
            <h3 className="mb-3 font-bold text-gray-900">
              정답 정보 선택 (선택)
            </h3>

            <select
              value={correctItem}
              onChange={(e) => setCorrectItem(e.target.value)}
              className="mb-4 w-full rounded-2xl border border-gray-300 bg-white p-4 font-semibold text-gray-800 outline-none"
            >
              <option value="">품목 선택</option>
              <option value="CLEAR_PET_BOTTLE">투명 페트병</option>
              <option value="CAN">캔</option>
              <option value="GLASS_BOTTLE">유리병</option>
              <option value="PLASTIC_CONTAINER">플라스틱 용기</option>
            </select>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={correctHasLabel}
                  onChange={(e) => setCorrectHasLabel(e.target.checked)}
                  className="h-5 w-5 accent-emerald-600"
                />
                라벨 있음
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={correctHasLeftover}
                  onChange={(e) =>
                    setCorrectHasLeftover(e.target.checked)
                  }
                  className="h-5 w-5 accent-emerald-600"
                />
                내용물 남음
              </label>
            </div>
          </div>

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={issueTypes.length === 0}
            className="mt-8 w-full rounded-3xl bg-emerald-600 py-4 font-extrabold text-white transition hover:bg-emerald-700 disabled:bg-gray-300"
          >
            제출하기
          </button>
        </section>
      </div>
    </main>
  );
};

export default FeedbackPage;