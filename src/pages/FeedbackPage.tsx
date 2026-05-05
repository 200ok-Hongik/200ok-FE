import { useState } from "react";
import type { InputData, Result } from "../types/recycle";

type Props = {
  data: InputData;
  result: Result;
  onBack: () => void;
  onSubmit: () => void;
};

type CorrectPetType = "TRANSPARENT" | "COLORED" | "";

const FeedbackPage = ({ data, result, onBack, onSubmit }: Props) => {
  const [issueTypes, setIssueTypes] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  const [correctPetType, setCorrectPetType] = useState<CorrectPetType>("");
  const [correctHasLabel, setCorrectHasLabel] = useState(false);
  const [correctHasLeftover, setCorrectHasLeftover] = useState(false);

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
        itemCode: data.itemCode,
        isTransparent:
          correctPetType === ""
            ? null
            : correctPetType === "TRANSPARENT",
        hasLabel: correctHasLabel,
        isEmpty: !correctHasLeftover,
      },
    };

    console.log("피드백 제출:", feedbackData);
    onSubmit();
  };

  const isDisabled = issueTypes.length === 0;

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

          <h1 className="text-xl font-extrabold text-gray-900">
            결과에 대한 피드백
          </h1>
        </header>

        <section className="mb-6 rounded-3xl bg-gray-50 p-6">
          <p className="mb-2 text-sm font-bold text-gray-400">
            현재 판정 결과
          </p>
          <h2 className="text-2xl font-extrabold text-gray-900">
            {result.verdict}
          </h2>
          <p className="mt-2 text-gray-600">{result.reason}</p>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-extrabold text-gray-900">
            어떤 점이 이상했나요?
          </h2>

          <div className="space-y-3">
            {[
              "투명/유색 분류가 틀렸어요",
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

          <div className="mt-7">
            <h3 className="mb-3 font-bold text-gray-900">수정 의견</h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="예: 유색 페트병인데 투명 페트병으로 판정됐어요."
              className="h-32 w-full resize-none rounded-2xl border border-gray-300 p-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div className="mt-7 rounded-3xl bg-gray-50 p-5">
            <h3 className="mb-2 font-bold text-gray-900">
              정답 정보 선택 <span className="text-gray-400">(선택)</span>
            </h3>
            <p className="mb-5 text-sm text-gray-500">
              실제 상태를 알고 있다면 아래에서 수정 정보를 선택해주세요.
            </p>

            {data.itemCode === "PET_BOTTLE" && (
              <>
                <p className="mb-3 text-sm font-bold text-gray-500">
                  페트병 종류
                </p>

                <div className="mb-5 grid gap-3 md:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 font-semibold text-gray-700 transition hover:bg-emerald-50">
                    <input
                      type="radio"
                      name="correctPetType"
                      checked={correctPetType === "TRANSPARENT"}
                      onChange={() => setCorrectPetType("TRANSPARENT")}
                      className="h-5 w-5 accent-emerald-600"
                    />
                    무색 투명 페트병
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 font-semibold text-gray-700 transition hover:bg-emerald-50">
                    <input
                      type="radio"
                      name="correctPetType"
                      checked={correctPetType === "COLORED"}
                      onChange={() => setCorrectPetType("COLORED")}
                      className="h-5 w-5 accent-emerald-600"
                    />
                    유색 / 불투명 페트병
                  </label>
                </div>
              </>
            )}

            <p className="mb-3 text-sm font-bold text-gray-500">
              상태 정보
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 font-semibold text-gray-700 transition hover:bg-emerald-50">
                <input
                  type="checkbox"
                  checked={correctHasLabel}
                  onChange={(e) => setCorrectHasLabel(e.target.checked)}
                  className="h-5 w-5 accent-emerald-600"
                />
                라벨 있음
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 font-semibold text-gray-700 transition hover:bg-emerald-50">
                <input
                  type="checkbox"
                  checked={correctHasLeftover}
                  onChange={(e) => setCorrectHasLeftover(e.target.checked)}
                  className="h-5 w-5 accent-emerald-600"
                />
                내용물 남음
              </label>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isDisabled}
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