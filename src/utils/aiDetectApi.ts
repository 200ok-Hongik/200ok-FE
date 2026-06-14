export type AiDetectResult = {
  itemCode: string;
  detailCode: string;
  confidence: number;
  conditions?: {
    isTransparent?: boolean | null;
    hasLabel?: boolean | null;
    hasCap?: boolean | null;
    isEmpty?: boolean | null;
  };
};

const AI_DETECT_API_URL = "/api/ai/detect";

const getIsTransparentFromDetailCode = (
  detailCode: string | null
): boolean | null => {
  if (!detailCode) return null;

  if (
    detailCode === "CLEAR" ||
    detailCode === "CLEAR_SINGLE" ||
    detailCode === "TRANSPARENT"
  ) {
    return true;
  }

  if (
    detailCode === "COLORED" ||
    detailCode === "COLORED_SINGLE" ||
    detailCode === "OPAQUE"
  ) {
    return false;
  }

  return null;
};

export const requestAiDetectResult = async (
  image: File
): Promise<AiDetectResult> => {
  const formData = new FormData();
  formData.append("image", image);

  console.log("AI 분석 요청 이미지:", image.name);

  const response = await fetch(AI_DETECT_API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("AI 이미지 분석 요청 실패");
  }

  const result = await response.json();

  console.log("AI 분석 응답:", result);

  const firstDetection = Array.isArray(result.detections)
    ? result.detections[0]
    : null;

  const representativeDetection = result.representativeDetection ?? null;

  const itemCode =
    result.itemCode ??
    result.itemType ??
    representativeDetection?.itemCode ??
    firstDetection?.itemCode ??
    firstDetection?.itemType ??
    "";

  const detailCode =
    result.detailCode ??
    result.colorType ??
    representativeDetection?.detailCode ??
    firstDetection?.detailCode ??
    firstDetection?.colorType ??
    "";

  const confidence =
    result.confidence ??
    representativeDetection?.confidence ??
    firstDetection?.confidence ??
    0;

  const isTransparent =
    result.conditions?.isTransparent ??
    result.status?.isTransparent ??
    getIsTransparentFromDetailCode(detailCode);

  return {
    itemCode,
    detailCode,
    confidence,
    conditions: {
      isTransparent,
      hasLabel: result.conditions?.hasLabel ?? result.status?.hasLabel ?? null,
      hasCap: result.conditions?.hasCap ?? result.status?.hasCap ?? null,
      isEmpty: result.conditions?.isEmpty ?? result.status?.isEmpty ?? null,
    },
  };
};