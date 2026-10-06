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
