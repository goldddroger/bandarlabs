import { emptyRightIssueDraft } from "./right-issue-draft";
import type { RightIssueDraft } from "@/types/right-issue";
import type { HmetdTerms } from "@/types/hmetd-document";

export function applyHmetdTerms(current: RightIssueDraft, terms: HmetdTerms): RightIssueDraft {
  const sameTicker = current.ticker.trim().toUpperCase() === terms.ticker;
  return {
    ...emptyRightIssueDraft(terms.ticker),
    ...(sameTicker ? { ownedShares: current.ownedShares, averageBuy: current.averageBuy, cumPrice: current.cumPrice } : {}),
    ...terms,
  };
}
