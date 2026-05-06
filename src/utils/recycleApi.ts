import type { InputData, Result } from "../types/recycle";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/recycle`;

export const requestRecycleResult = async (
  data: InputData
): Promise<Result> => {
  const requestBody = {
    itemCode: data.itemCode,
    regionCode: data.regionCode,
    conditions: {
      isTransparent: data.isTransparent,
      hasLabel: data.hasLabel,
      isEmpty: data.isEmpty,
    },
  };

  console.log("보내는 데이터:", requestBody);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error("서버 요청 실패");
  }

  const result = await response.json();

  console.log("서버 응답:", result);

  return {
    verdict: result.verdict ?? "판정 결과 없음",
    requiredAction: Array.isArray(result.requiredAction)
      ? result.requiredAction
      : result.requiredAction
      ? [result.requiredAction]
      : [],
    disposalMethod: result.disposalMethod ?? "배출 방법 정보 없음",
    reason:
      result.reason ??
      result.basis ??
      result.matchedReason ??
      result.description ??
      "판정 근거 정보 없음",
    ruleId: result.matchedRuleId ?? result.ruleId ?? "R-000",
  };
};