export type RightIssueDraft = {
  ticker: string;
  ownedShares: string;
  averageBuy: string;
  cumPrice: string;
  ratioOld: string;
  ratioNew: string;
  subscriptionPrice: string;
  marketRightsPrice: string;
  cumDate: string;
  exDate: string;
  recordingDate: string;
  tradingStart: string;
  tradingEnd: string;
  subscriptionDeadline: string;
};

export type RightIssueInput = {
  ownedShares: number;
  averageBuy: number;
  cumPrice: number;
  ratioOld: number;
  ratioNew: number;
  subscriptionPrice: number;
  marketRightsPrice: number | null;
};

export type RightIssueCalculation = {
  rightsRatio: number;
  rawEntitlement: number;
  rightsEntitlement: number;
  hasFractionalRights: boolean;
  cashRequired: number;
  originalInvestment: number;
  newTotalInvestment: number;
  sharesAfterExercise: number;
  newAverage: number;
  terp: number;
  theoreticalRightsValue: number;
  ownershipRetained: number;
  dilution: number;
  outOfTheMoney: boolean;
};

export type RightIssueScenarioDraft = {
  postExPrice: string;
  parentSalePrice: string;
  matrixLow: string;
  matrixHigh: string;
  matrixStep: string;
};

export type RightIssueStrategy = "exercise" | "sell-rights" | "expire" | "exit";

export type RightIssueScenario = {
  id: RightIssueStrategy;
  rightsReceived: number;
  sharesAfter: number;
  cashRequired: number;
  rightsProceeds: number | null;
  economicCost: number | null;
  effectiveCost: number | null;
  endingValue: number | null;
  netEconomicValue: number | null;
  profitLoss: number | null;
  returnPercent: number | null;
  breakEvenPrice: number | null;
  dilution: number;
  opportunityCost: number | null;
};

export type RightIssueScenarioCalculation = {
  base: RightIssueCalculation;
  postExPrice: number;
  parentSalePrice: number;
  scenarios: RightIssueScenario[];
};

export type RightIssueMatrixRow = {
  price: number;
  scenarios: RightIssueScenario[];
  highestValueStrategies: RightIssueStrategy[];
};
