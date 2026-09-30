export type CapitalGainInput = {
  buyPrice: number;
  sellPrice: number;
  lots: number;
  buyFeePercent: number;
  sellFeePercent: number;
};

export type CapitalGainResult = {
  shares: number;
  grossBuy: number;
  buyFee: number;
  totalBuy: number;
  grossSell: number;
  sellFee: number;
  netSell: number;
  profitLoss: number;
  profitLossPercent: number;
  breakEvenPrice: number;
};

export function formatLotInput(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function calculateCapitalGain(input: CapitalGainInput): CapitalGainResult {
  const buyPrice = Math.max(0, input.buyPrice);
  const sellPrice = Math.max(0, input.sellPrice);
  const lots = Math.max(0, input.lots);
  const buyFeeRate = Math.max(0, input.buyFeePercent) / 100;
  const sellFeeRate = Math.max(0, input.sellFeePercent) / 100;
  const shares = lots * 100;
  const grossBuy = buyPrice * shares;
  const buyFee = grossBuy * buyFeeRate;
  const totalBuy = grossBuy + buyFee;
  const grossSell = sellPrice * shares;
  const sellFee = grossSell * sellFeeRate;
  const netSell = grossSell - sellFee;
  const profitLoss = netSell - totalBuy;
  const profitLossPercent = totalBuy > 0 ? (profitLoss / totalBuy) * 100 : 0;
  const breakEvenPrice = shares > 0 && sellFeeRate < 1
    ? totalBuy / (shares * (1 - sellFeeRate))
    : 0;

  return {
    shares,
    grossBuy,
    buyFee,
    totalBuy,
    grossSell,
    sellFee,
    netSell,
    profitLoss,
    profitLossPercent,
    breakEvenPrice,
  };
}
