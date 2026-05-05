export type ItemCode =
  | "PET_BOTTLE"
  | "CAN"
  | "GLASS_BOTTLE"
  | "PLASTIC_CONTAINER";

export type InputData = {
  regionCode: string;
  region: string;
  district: string;
  itemCode: ItemCode;

  isTransparent: boolean;
  hasLabel: boolean;
  isEmpty: boolean;
  hasCap: boolean;

  isCrushed?: boolean;
  isBroken?: boolean;
  isContaminated?: boolean;
};

export type Result = {
  verdict: string;
  requiredAction: string[];
  disposalMethod: string;
  reason: string;
  ruleId: string;
};