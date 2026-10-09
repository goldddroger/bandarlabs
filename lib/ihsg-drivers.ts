import { marketSessionDate } from "@/lib/market-price-session";

export type DriverStock = { ticker: string; name: string; sector: string; listedShares: number };
export type SparkPrices = { timestamp?: number[]; close?: Array<number | null> };
export type DailyPrice = { ticker: string; price: number; previousClose: number; date: string; previousDate: string };
export type IhsgDriver = DriverStock & DailyPrice & {
  changePercent: number;
  capitalization: number;
  capitalizationChange: number;
};
export type IhsgDriversPayload = {
  rows: IhsgDriver[];
  tradingDate: string;
  previousDate: string;
  coveredStocks: number;
  totalStocks: number;
  excludedStocks: number;
  positiveChange: number;
  negativeChange: number;
  netChange: number;
  source: "Yahoo Finance";
  sharesAsOf: string;
};

export function sparkDailyPrice(ticker: string, quote: SparkPrices): DailyPrice | null {
  const timestamps = quote.timestamp ?? [];
  const closes = quote.close ?? [];
  const lastIndex = timestamps.length - 1;
  const timestamp = timestamps[lastIndex];
  const price = closes[lastIndex];
  if (!Number.isFinite(timestamp) || timestamp <= 0 || typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
  const date = marketSessionDate(timestamp);
  for (let index = lastIndex - 1; index >= 0; index -= 1) {
    const previousClose = closes[index];
    const previousTimestamp = timestamps[index];
    if (!Number.isFinite(previousTimestamp) || previousTimestamp <= 0) continue;
    const previousDate = marketSessionDate(previousTimestamp);
    if (previousDate < date && typeof previousClose === "number" && Number.isFinite(previousClose) && previousClose > 0) {
      return { ticker, price, previousClose, date, previousDate };
    }
  }
  return null;
}

export function buildIhsgDrivers(stocks: readonly DriverStock[], prices: readonly DailyPrice[]): IhsgDriversPayload | null {
  const knownStocks = new Map(stocks.filter((stock) => Number.isFinite(stock.listedShares) && stock.listedShares > 0).map((stock) => [stock.ticker, stock]));
  const validPrices = prices.filter((price) => knownStocks.has(price.ticker)
    && Number.isFinite(price.price) && price.price > 0 && Number.isFinite(price.previousClose) && price.previousClose > 0
    && /^\d{4}-\d{2}-\d{2}$/.test(price.date) && /^\d{4}-\d{2}-\d{2}$/.test(price.previousDate) && price.previousDate < price.date);
  const tradingDate = validPrices.map((price) => price.date).sort().at(-1);
  if (!tradingDate) return null;
  const previousDate = validPrices.filter((price) => price.date === tradingDate).map((price) => price.previousDate).sort().at(-1)!;
  const alignedPrices = new Map(validPrices.filter((price) => price.date === tradingDate && price.previousDate === previousDate).map((price) => [price.ticker, price]));
  const rows = Array.from(alignedPrices.values()).flatMap((price) => {
    const stock = knownStocks.get(price.ticker)!;
    const capitalization = stock.listedShares * price.price;
    const capitalizationChange = stock.listedShares * (price.price - price.previousClose);
    if (!Number.isFinite(capitalization) || !Number.isFinite(capitalizationChange)) return [];
    return [{ ...stock, ...price, capitalization, capitalizationChange, changePercent: ((price.price - price.previousClose) / price.previousClose) * 100 }];
  }).sort((first, second) => Math.abs(second.capitalizationChange) - Math.abs(first.capitalizationChange));
  if (!rows.length) return null;
  const positiveChange = rows.reduce((total, row) => total + Math.max(row.capitalizationChange, 0), 0);
  const negativeChange = rows.reduce((total, row) => total + Math.min(row.capitalizationChange, 0), 0);
  return {
    rows, tradingDate, previousDate, coveredStocks: rows.length, totalStocks: knownStocks.size,
    excludedStocks: knownStocks.size - rows.length, positiveChange, negativeChange, netChange: positiveChange + negativeChange,
    source: "Yahoo Finance", sharesAsOf: "2026-08-17",
  };
}

export function rankIhsgDrivers(rows: readonly IhsgDriver[], direction: "positive" | "negative", limit = 5) {
  return rows.filter((row) => direction === "positive" ? row.capitalizationChange > 0 : row.capitalizationChange < 0)
    .sort((first, second) => direction === "positive" ? second.capitalizationChange - first.capitalizationChange : first.capitalizationChange - second.capitalizationChange)
    .slice(0, limit);
}

export function formatCapitalizationChange(value: number) {
  const absolute = Math.abs(value);
  const divisor = absolute >= 1e12 ? 1e12 : absolute >= 1e9 ? 1e9 : 1e6;
  const unit = absolute >= 1e12 ? "T" : absolute >= 1e9 ? "M" : "Jt";
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(absolute / divisor)} ${unit}`;
}
