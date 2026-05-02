import { useState } from "react";
import MainInputPage from "./pages/MainInputPage";
import ResultPage from "./pages/ResultPage";
import DetailPage from "./pages/DetailPage";
import FeedbackPage from "./pages/FeedbackPage";
import FeedbackCompletePage from "./pages/FeedbackCompletePage";
import type { InputData, Result } from "./types/recycle";

type Page = "input" | "result" | "detail" | "feedback" | "feedbackComplete";

function App() {
  const [page, setPage] = useState<Page>("input");
  const [data, setData] = useState<InputData | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const goHome = () => {
    setData(null);
    setResult(null);
    setPage("input");
  };

  if (page === "input") {
    return (
      <MainInputPage
        onSubmit={(inputData, judgementResult) => {
          setData(inputData);
          setResult(judgementResult);
          setPage("result");
        }}
      />
    );
  }

  if (page === "result" && data && result) {
    return (
      <ResultPage
        data={data}
        result={result}
        onBack={() => setPage("input")}
        onDetail={() => setPage("detail")}
        onFeedback={() => setPage("feedback")}
      />
    );
  }

  if (page === "detail" && data && result) {
    return (
      <DetailPage
        data={data}
        result={result}
        onBack={() => setPage("result")}
      />
    );
  }

  if (page === "feedback" && data && result) {
    return (
      <FeedbackPage
        data={data}
        result={result}
        onBack={() => setPage("result")}
        onSubmit={() => setPage("feedbackComplete")}
      />
    );
  }

  if (page === "feedbackComplete") {
    return <FeedbackCompletePage onHome={goHome} />;
  }

  return null;
}

export default App;