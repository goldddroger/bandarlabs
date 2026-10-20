import { calculateRealizedGain, type RealizedTrade } from "./portfolio-store";

export function summarizeTrades(trades: RealizedTrade[]) {
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let totalFees = 0;
  let totalLots = 0;
  const tickers = new Set<string>();

  for (const trade of trades) {
    const gain = calculateRealizedGain(trade);
    if (gain > 0) {
      wins += 1;
      totalProfit += gain;
    } else if (gain < 0) {
      losses += 1;
      totalLoss -= gain;
    } else {
      breakeven += 1;
    }
    const shares = trade.lots * 100;
    totalFees += shares * (trade.buyPrice * trade.buyFeePercent / 100 + trade.sellPrice * trade.sellFeePercent / 100);
    totalLots += trade.lots;
    tickers.add(trade.ticker);
  }

  const count = trades.length;
  const realized = totalProfit - totalLoss;
  return {
    count, wins, losses, breakeven, totalProfit, totalLoss, totalFees, totalLots,
    tickerCount: tickers.size,
    realized,
    winRate: count ? wins / count * 100 : 0,
    averageGain: count ? realized / count : 0,
    profitFactor: totalLoss > 0 ? totalProfit / totalLoss : null,
  };
}
