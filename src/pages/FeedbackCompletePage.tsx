type Props = {
  onHome: () => void;
};

const FeedbackCompletePage = ({ onHome }: Props) => {
  return (
    <main className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-sky-50 px-6 py-10">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center rounded-4xl bg-white/95 p-8 text-center shadow-xl ring-1 ring-gray-100 md:p-10">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
          ✅
        </div>

        <p className="mb-3 text-sm font-bold text-emerald-600">
          피드백 제출 완료
        </p>

        <h1 className="mb-4 text-3xl font-extrabold text-gray-900">
          소중한 피드백 의견 감사합니다.
        </h1>

        <p className="mb-8 leading-relaxed text-gray-500">
          보내주신 의견은 더 정확한 분리배출 판정 시스템을 만드는 데
          활용됩니다.
          <br />
          앞으로 더 나은 안내를 제공할 수 있도록 개선하겠습니다.
        </p>

        <button
          onClick={onHome}
          className="rounded-3xl bg-emerald-600 px-8 py-4 font-extrabold text-white shadow-lg transition hover:bg-emerald-700"
        >
          처음으로 돌아가기
        </button>
      </div>
    </main>
  );
};

export default FeedbackCompletePage;