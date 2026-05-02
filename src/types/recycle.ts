export type Result = {
  judgement: string;
  actions: string[];
  method: string;
  reason: string;
};

export type InputData = {
  region: string;
  district: string;
  item: string;
  hasLabel: boolean;
  hasLeftover: boolean;
  hasCap: boolean;
};