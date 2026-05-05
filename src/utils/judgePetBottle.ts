import type { InputData, Result } from "../types/recycle";

export const judgeWaste = (data: InputData): Result => {
  switch (data.itemCode) {
    case "PET_BOTTLE":
      return judgePetBottle(data);

    case "CAN":
      return judgeCan(data);

    case "GLASS_BOTTLE":
      return judgeGlassBottle(data);

    case "PLASTIC_CONTAINER":
      return judgePlasticContainer(data);

    default:
      return {
        verdict: "추가 확인 필요",
        requiredAction: ["지원하지 않는 품목입니다. 품목을 다시 선택해주세요."],
        disposalMethod: "확인 필요",
        reason: "현재 등록된 규칙이 없는 품목입니다.",
        ruleId: "R-999",
      };
  }
};

const judgePetBottle = (data: InputData): Result => {
  const { isTransparent, hasLabel, isEmpty, hasCap } = data;

  if (!isTransparent) {
    if (!isEmpty && hasLabel) {
      return {
        verdict: "일반 플라스틱류 배출 전 조치 필요",
        requiredAction: [
          "내용물을 비우고 헹군 후 배출해주세요.",
          "라벨 등 다른 재질은 제거 후 배출해주세요.",
          "일반 플라스틱류로 배출해주세요.",
        ],
        disposalMethod: "일반 플라스틱류 배출",
        reason:
          "유색 또는 불투명 페트병은 투명 페트병 별도배출 대상이 아니며, 내용물과 라벨을 정리한 뒤 일반 플라스틱류로 배출해야 합니다.",
        ruleId: "R-101/R-102",
      };
    }

    if (!isEmpty) {
      return {
        verdict: "일반 플라스틱류 배출 전 조치 필요",
        requiredAction: [
          "내용물을 비우고 헹군 후 배출해주세요.",
          "일반 플라스틱류로 배출해주세요.",
        ],
        disposalMethod: "일반 플라스틱류 배출",
        reason:
          "유색 또는 불투명 페트병은 일반 플라스틱류로 배출하되, 내용물이 남아 있으면 비우고 헹군 뒤 배출해야 합니다.",
        ruleId: "R-101",
      };
    }

    if (hasLabel) {
      return {
        verdict: "일반 플라스틱류 배출 전 조치 필요",
        requiredAction: [
          "라벨 등 다른 재질은 제거 후 배출해주세요.",
          "일반 플라스틱류로 배출해주세요.",
        ],
        disposalMethod: "일반 플라스틱류 배출",
        reason:
          "유색 또는 불투명 페트병은 일반 플라스틱류로 배출하되, 라벨처럼 다른 재질은 제거하는 것이 좋습니다.",
        ruleId: "R-102",
      };
    }

    return {
      verdict: "배출 가능",
      requiredAction: ["일반 플라스틱류로 배출해주세요."],
      disposalMethod: "일반 플라스틱류 배출",
      reason:
        "유색 또는 불투명 페트병은 투명 페트병 별도배출 대상이 아니므로 일반 플라스틱류로 배출합니다.",
      ruleId: "R-103",
    };
  }

  if (hasLabel && !isEmpty) {
    return {
      verdict: "바로 배출 불가",
      requiredAction: [
        "내용물을 비우고 헹군 후 배출해주세요.",
        "라벨 제거 후 배출해주세요.",
        "투명 페트병으로 별도배출해주세요.",
      ],
      disposalMethod: "투명 페트병 별도배출",
      reason:
        "무색 투명 페트병은 내용물을 비우고 라벨을 제거한 뒤 투명 페트병으로 별도배출해야 합니다.",
      ruleId: "R-010/R-011",
    };
  }

  if (hasLabel) {
    return {
      verdict: "바로 배출 불가",
      requiredAction: [
        "라벨 제거 후 배출해주세요.",
        "투명 페트병으로 별도배출해주세요.",
      ],
      disposalMethod: "투명 페트병 별도배출",
      reason:
        "무색 투명 페트병은 라벨을 제거한 뒤 투명 페트병으로 별도배출해야 합니다.",
      ruleId: "R-010",
    };
  }

  if (!isEmpty) {
    return {
      verdict: "바로 배출 불가",
      requiredAction: [
        "내용물을 비우고 헹군 후 배출해주세요.",
        "투명 페트병으로 별도배출해주세요.",
      ],
      disposalMethod: "투명 페트병 별도배출",
      reason:
        "내용물이 남아 있으면 재활용 품질이 떨어질 수 있으므로 비우고 헹군 뒤 배출해야 합니다.",
      ruleId: "R-011",
    };
  }

  if (!hasCap) {
    return {
      verdict: "배출 가능",
      requiredAction: ["가능하면 뚜껑을 닫아 배출해주세요."],
      disposalMethod: "투명 페트병 별도배출",
      reason:
        "라벨이 없고 내용물이 비어 있는 무색 투명 페트병은 별도배출할 수 있습니다.",
      ruleId: "R-021",
    };
  }

  return {
    verdict: "배출 가능",
    requiredAction: ["가능하면 압착 후 뚜껑을 닫아 배출해주세요."],
    disposalMethod: "투명 페트병 별도배출",
    reason:
      "무색 투명 페트병이며 라벨이 없고 내용물이 비어 있어 투명 페트병 별도배출 조건을 충족합니다.",
    ruleId: "R-030",
  };
};

const judgeCan = (data: InputData): Result => {
  if (!data.isEmpty) {
    return {
      verdict: "배출 전 조치 필요",
      requiredAction: ["내용물을 비우고 헹군 후 배출해주세요."],
      disposalMethod: "캔류 배출",
      reason: "캔에 내용물이 남아 있으면 재활용 과정에 방해가 될 수 있습니다.",
      ruleId: "C-001",
    };
  }

  return {
    verdict: "배출 가능",
    requiredAction: ["가능하면 압착 후 캔류로 배출해주세요."],
    disposalMethod: "캔류 배출",
    reason: "내용물이 비어 있는 캔은 캔류로 배출할 수 있습니다.",
    ruleId: "C-010",
  };
};

const judgeGlassBottle = (data: InputData): Result => {
  if (data.isBroken) {
    return {
      verdict: "주의 배출 필요",
      requiredAction: ["깨진 유리는 신문지 등으로 감싸서 배출해주세요."],
      disposalMethod: "유리류 또는 불연성 폐기물 확인",
      reason: "깨진 유리는 수거 과정에서 위험할 수 있어 별도 주의가 필요합니다.",
      ruleId: "G-001",
    };
  }

  if (!data.isEmpty) {
    return {
      verdict: "배출 전 조치 필요",
      requiredAction: ["내용물을 비우고 헹군 후 배출해주세요."],
      disposalMethod: "유리병류 배출",
      reason: "유리병에 내용물이 남아 있으면 재활용 품질이 떨어질 수 있습니다.",
      ruleId: "G-002",
    };
  }

  return {
    verdict: "배출 가능",
    requiredAction: ["뚜껑이 다른 재질이면 분리 후 배출해주세요."],
    disposalMethod: "유리병류 배출",
    reason: "내용물이 비어 있는 유리병은 유리병류로 배출할 수 있습니다.",
    ruleId: "G-010",
  };
};

const judgePlasticContainer = (data: InputData): Result => {
  if (data.isContaminated) {
    return {
      verdict: "배출 전 조치 필요",
      requiredAction: ["오염물을 제거하거나 세척 후 배출해주세요."],
      disposalMethod: "플라스틱류 배출",
      reason: "오염된 플라스틱 용기는 재활용이 어려울 수 있습니다.",
      ruleId: "P-001",
    };
  }

  if (!data.isEmpty) {
    return {
      verdict: "배출 전 조치 필요",
      requiredAction: ["내용물을 비우고 헹군 후 배출해주세요."],
      disposalMethod: "플라스틱류 배출",
      reason: "내용물이 남아 있으면 재활용 과정에 방해가 될 수 있습니다.",
      ruleId: "P-002",
    };
  }

  return {
    verdict: "배출 가능",
    requiredAction: ["플라스틱류로 배출해주세요."],
    disposalMethod: "플라스틱류 배출",
    reason: "내용물이 비어 있고 오염이 없는 플라스틱 용기는 배출할 수 있습니다.",
    ruleId: "P-010",
  };
};