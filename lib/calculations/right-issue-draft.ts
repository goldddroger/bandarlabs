import type { RightIssueDraft } from "@/types/right-issue";

export function emptyRightIssueDraft(ticker = ""): RightIssueDraft {
  return { ticker, ownedShares: "", averageBuy: "", cumPrice: "", ratioOld: "", ratioNew: "", subscriptionPrice: "", marketRightsPrice: "", cumDate: "", exDate: "", recordingDate: "", tradingStart: "", tradingEnd: "", subscriptionDeadline: "" };
}

export const rightIssueDemo: RightIssueDraft = {
  ...emptyRightIssueDraft("WMPP"), ownedShares: "3.000.000", averageBuy: "27", cumPrice: "30", ratioOld: "5", ratioNew: "2", subscriptionPrice: "50", marketRightsPrice: "3",
};
