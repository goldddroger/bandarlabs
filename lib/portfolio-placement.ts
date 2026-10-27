import type { PortfolioHolding } from "./portfolio-store";

export function normalizeSecurity(value?: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
}

export function samePlacement(first: Pick<PortfolioHolding, "ticker" | "security">, second: Pick<PortfolioHolding, "ticker" | "security">) {
  return first.ticker === second.ticker
    && normalizeSecurity(first.security).toLowerCase() === normalizeSecurity(second.security).toLowerCase();
}

export function summarizePlacements(holdings: PortfolioHolding[], prices: Record<string, number> = {}) {
  const groups = new Map<string, { security: string; lots: number; capital: number; marketValue: number; tickers: Set<string> }>();
  for (const holding of holdings) {
    const security = normalizeSecurity(holding.security);
    const key = security.toLowerCase();
    const group = groups.get(key) ?? { security: security || "Belum diisi", lots: 0, capital: 0, marketValue: 0, tickers: new Set<string>() };
    const price = prices[holding.ticker];
    group.lots += holding.lots;
    group.capital += holding.lots * 100 * holding.averagePrice;
    group.marketValue += holding.lots * 100 * (Number.isFinite(price) && price > 0 ? price : holding.averagePrice);
    group.tickers.add(holding.ticker);
    groups.set(key, group);
  }
  return Array.from(groups.values()).map(({ tickers, ...group }) => ({ ...group, tickerCount: tickers.size }));
}
