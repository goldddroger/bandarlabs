"use client";

import { useMemo, useSyncExternalStore } from "react";

export type PortfolioHolding = {
  id: string;
  ticker: string;
  lots: number;
  averagePrice: number;
  purchasedAt: string;
  note: string;
};

export type RealizedTrade = {
  id: string;
  ticker: string;
  lots: number;
  buyPrice: number;
  sellPrice: number;
  buyFeePercent: number;
  sellFeePercent: number;
  soldAt: string;
  note: string;
};

export type EquitySnapshot = {
  date: string;
  equity: number;
};

export type PortfolioData = {
  holdings: PortfolioHolding[];
  trades: RealizedTrade[];
  equityHistory: EquitySnapshot[];
};

type PortfolioDeletion = {
  holdingIds?: string[];
  tradeIds?: string[];
};

const storageKey = "bandarlab.portfolio.v1";
const changeEventName = "bandarlab-portfolio-change";
export const portfolioSyncEventName = "bandarlab-portfolio-sync";
const emptySnapshot = JSON.stringify({ holdings: [], trades: [], equityHistory: [] } satisfies PortfolioData);
const adminOwnerId = "00000000-0000-4000-8000-000000000001";
let persistQueue: Promise<void> = Promise.resolve();

function parsePortfolio(snapshot: string): PortfolioData {
  try {
    const parsed = JSON.parse(snapshot) as Partial<PortfolioData>;
    return {
      holdings: Array.isArray(parsed.holdings) ? parsed.holdings : [],
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
      equityHistory: Array.isArray(parsed.equityHistory) ? parsed.equityHistory : [],
    };
  } catch {
    return { holdings: [], trades: [], equityHistory: [] };
  }
}

function subscribePortfolio(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(changeEventName, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(changeEventName, onStoreChange);
  };
}

function getPortfolioSnapshot() {
  return window.localStorage.getItem(storageKey) ?? emptySnapshot;
}

function applyPortfolioLocally(data: PortfolioData) {
  window.localStorage.setItem(storageKey, JSON.stringify(data));
  window.dispatchEvent(new Event(changeEventName));
}

function hasPortfolioData(data: PortfolioData) {
  return data.holdings.length > 0 || data.trades.length > 0 || data.equityHistory.length > 0;
}

async function persistPortfolio(data: PortfolioData, deleted?: PortfolioDeletion) {
  const response = await fetch("/api/portfolio", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, deleted }),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || "Portfolio gagal disinkronkan.");
  window.dispatchEvent(new CustomEvent(portfolioSyncEventName, { detail: { status: "saved" } }));
}

export function savePortfolio(data: PortfolioData, deleted?: PortfolioDeletion) {
  applyPortfolioLocally(data);
  persistQueue = persistQueue
    .catch(() => undefined)
    .then(() => persistPortfolio(data, deleted))
    .catch((error: unknown) => {
      window.dispatchEvent(new CustomEvent(portfolioSyncEventName, {
        detail: { status: "error", message: error instanceof Error ? error.message : "Portfolio gagal disinkronkan." },
      }));
      throw error;
    });
  void persistQueue.catch(() => undefined);
}

export async function syncPortfolioWithServer() {
  const local = parsePortfolio(getPortfolioSnapshot());
  const response = await fetch("/api/portfolio", { cache: "no-store" });
  const result = await response.json().catch(() => ({})) as { portfolio?: PortfolioData; error?: string };
  if (!response.ok || !result.portfolio) throw new Error(result.error || "Portfolio Supabase gagal dimuat.");

  if (hasPortfolioData(result.portfolio)) {
    applyPortfolioLocally(result.portfolio);
    return "downloaded" as const;
  }
  if (hasPortfolioData(local)) {
    await persistPortfolio(local);
    return "uploaded" as const;
  }
  return "empty" as const;
}

function sqlText(value: unknown) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

export function downloadPortfolioSql(data: PortfolioData) {
  const owner = sqlText(adminOwnerId);
  const holdings = data.holdings.length > 0
    ? `insert into public.portfolio_holdings (id, owner_id, ticker, lots, average_price, purchased_at, note) values\n${data.holdings.map((row) => `  (${sqlText(row.id)}, ${owner}, ${sqlText(row.ticker)}, ${row.lots}, ${row.averagePrice}, ${sqlText(row.purchasedAt)}, ${sqlText(row.note)})`).join(",\n")};`
    : "";
  const trades = data.trades.length > 0
    ? `insert into public.portfolio_trades (id, owner_id, ticker, lots, buy_price, sell_price, buy_fee_percent, sell_fee_percent, sold_at, note) values\n${data.trades.map((row) => `  (${sqlText(row.id)}, ${owner}, ${sqlText(row.ticker)}, ${row.lots}, ${row.buyPrice}, ${row.sellPrice}, ${row.buyFeePercent}, ${row.sellFeePercent}, ${sqlText(row.soldAt)}, ${sqlText(row.note)})`).join(",\n")};`
    : "";
  const history = data.equityHistory.length > 0
    ? `insert into public.portfolio_equity_history (owner_id, snapshot_date, equity) values\n${data.equityHistory.map((row) => `  (${owner}, ${sqlText(row.date)}, ${row.equity})`).join(",\n")};`
    : "";
  const sql = [
    "-- BandarLab Portfolio export",
    "-- Run 202608230001_admin_portfolio.sql before this file.",
    "begin;",
    `delete from public.portfolio_equity_history where owner_id = ${owner};`,
    `delete from public.portfolio_trades where owner_id = ${owner};`,
    `delete from public.portfolio_holdings where owner_id = ${owner};`,
    holdings,
    trades,
    history,
    "commit;",
  ].filter(Boolean).join("\n\n");
  const url = URL.createObjectURL(new Blob([sql], { type: "application/sql;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bandarlab-portfolio-${getJakartaDate()}.sql`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function usePortfolioData() {
  const snapshot = useSyncExternalStore(subscribePortfolio, getPortfolioSnapshot, () => emptySnapshot);
  return useMemo(() => parsePortfolio(snapshot), [snapshot]);
}

export function calculateRealizedGain(trade: RealizedTrade) {
  const shares = trade.lots * 100;
  const grossBuy = trade.buyPrice * shares;
  const grossSell = trade.sellPrice * shares;
  const buyFee = grossBuy * (trade.buyFeePercent / 100);
  const sellFee = grossSell * (trade.sellFeePercent / 100);
  return grossSell - sellFee - grossBuy - buyFee;
}

export function getJakartaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}
