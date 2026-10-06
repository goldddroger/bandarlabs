export type HmetdBuyerDraft = {
  rightsQuantity: string;
  referencePrice: string;
  salePrice: string;
  bufferPercent: string;
  buyFeePercent: string;
  sellFeePercent: string;
  redemptionFee: string;
};

export type HmetdBuyerInput = {
  rightsQuantity: number;
  rightsPrice: number;
  subscriptionPrice: number;
  referencePrice: number;
  salePrice: number | null;
  bufferPercent: number;
  buyFeePercent: number;
  sellFeePercent: number;
  redemptionFee: number;
};

export type HmetdBuyerStatus = "cheap" | "thin" | "equal" | "expensive";
export type HmetdBuyerCalculation = {
  rightsCost: number;
  buyFee: number;
  subscriptionCash: number;
  totalCost: number;
  effectiveCost: number;
  breakEvenStockPrice: number;
  netReferencePrice: number;
  discountPercent: number;
  maxBreakEvenRightsPrice: number;
  maxBufferedRightsPrice: number;
  salePrice: number;
  netSaleProceeds: number;
  profitLoss: number;
  returnPercent: number | null;
  status: HmetdBuyerStatus;
};
