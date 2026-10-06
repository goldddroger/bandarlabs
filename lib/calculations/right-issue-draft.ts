import type { RightIssueDraft, RightIssueScenarioDraft } from "@/types/right-issue";

export function emptyRightIssueDraft(ticker = ""): RightIssueDraft {
  return { ticker, ownedShares: "", averageBuy: "", cumPrice: "", ratioOld: "", ratioNew: "", subscriptionPrice: "", marketRightsPrice: "", cumDate: "", exDate: "", recordingDate: "", tradingStart: "", tradingEnd: "", subscriptionDeadline: "" };
}

export const rightIssueDemo: RightIssueDraft = {
  ...emptyRightIssueDraft("WMPP"), ownedShares: "3.000.000", averageBuy: "27", cumPrice: "30", ratioOld: "5", ratioNew: "2", subscriptionPrice: "50", marketRightsPrice: "3",
};

export function emptyRightIssueScenarioDraft(): RightIssueScenarioDraft {
  return { postExPrice: "", parentSalePrice: "", matrixLow: "", matrixHigh: "", matrixStep: "" };
}

export const rightIssueScenarioDemo: RightIssueScenarioDraft = {
  ...emptyRightIssueScenarioDraft(), matrixLow: "20", matrixHigh: "60", matrixStep: "5",
};
