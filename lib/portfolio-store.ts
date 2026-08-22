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

const storageKey = "bandarlab.portfolio.v1";
const changeEventName = "bandarlab-portfolio-change";
const emptySnapshot = JSON.stringify({ holdings: [], trades: [], equityHistory: [] } satisfies PortfolioData);

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

export function savePortfolio(data: PortfolioData) {
  window.localStorage.setItem(storageKey, JSON.stringify(data));
  window.dispatchEvent(new Event(changeEventName));
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
