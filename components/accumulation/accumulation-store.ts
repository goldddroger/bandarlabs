"use client";

import { useMemo, useSyncExternalStore } from "react";
import { accumulationRows, stockProfiles } from "@/lib/data";
import { indonesiaStocks } from "@/lib/indonesia-stocks";

export type AccumulationRow = {
  stock: string;
  name: string;
  sector: string;
  currentPrice: number;
  score: number;
  oneMonth: number;
  threeMonth: number;
  sixMonth: number;
  trend: TrendDirection;
};

export type TrendDirection = "uptrend" | "sideways" | "downtrend";
export type RadarSignalType = "accumulation" | "watchlist" | "hold";

export type SelectedAccumulationEntry = {
  ticker: string;
  signalType: RadarSignalType;
  addedAt: string;
  entryPrice: number;
  entryPriceSource?: "market" | "fallback";
};

export type SelectedAccumulationRow = AccumulationRow & SelectedAccumulationEntry;
export type StockPriceMap = Record<string, number>;

const storageKey = "bandarlab.accumulation.selectedStocks";
const storageEventName = "bandarlab-accumulation-stocks-changed";

export const accumulationDataUpdatedAt = "30 Juni 2026";

function demoScoreFromTicker(ticker: string) {
  const seed = ticker.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
  return 38 + (seed % 52);
}

function demoCurrentPriceFromTicker(ticker: string) {
  const seed = ticker.split("").reduce((total, character, index) => total + character.charCodeAt(0) * (index + 3), 0);
  return 50 + (seed % 9950);
}

function parseProfilePrice(price?: string) {
  if (!price) return undefined;

  const parsedPrice = Number(price.replaceAll(",", ""));
  return Number.isFinite(parsedPrice) ? parsedPrice : undefined;
}

function getTrendDirection(oneMonth: number, threeMonth: number, sixMonth: number): TrendDirection {
  if (oneMonth >= threeMonth && threeMonth >= sixMonth) return "uptrend";
  if (oneMonth <= threeMonth && threeMonth <= sixMonth) return "downtrend";
  return "sideways";
}

const stockProfileMap = new Map<string, (typeof stockProfiles)[number]>(stockProfiles.map((stock) => [stock.ticker, stock]));
const tickerUniverse = new Map<string, { ticker: string; name: string }>();

indonesiaStocks.forEach((stock) => {
  tickerUniverse.set(stock.ticker, stock);
});

stockProfiles.forEach((stock) => {
  tickerUniverse.set(stock.ticker, { ticker: stock.ticker, name: stock.name });
});

export const stockUniverse: AccumulationRow[] = Array.from(tickerUniverse.values())
  .map((stock, index) => {
    const profile = stockProfileMap.get(stock.ticker);
    const existingRow = accumulationRows.find((row) => row.stock === stock.ticker);
    const fallbackScore = profile?.accumulationScore ?? demoScoreFromTicker(stock.ticker);

    const oneMonth = existingRow?.oneMonth ?? Math.max(35, fallbackScore - 17 + (index % 5));
    const threeMonth = existingRow?.threeMonth ?? fallbackScore;
    const sixMonth = existingRow?.sixMonth ?? Math.max(40, fallbackScore - 7 + (index % 4));
    const trend = getTrendDirection(oneMonth, threeMonth, sixMonth);
    const currentPrice = parseProfilePrice(profile?.price) ?? demoCurrentPriceFromTicker(stock.ticker);

    return {
      stock: stock.ticker,
      name: stock.name,
      sector: profile?.sector ?? "Indonesia Equity",
      currentPrice,
      score: existingRow?.score ?? fallbackScore,
      oneMonth,
      threeMonth,
      sixMonth,
      trend,
    };
  })
  .sort((first, second) => first.stock.localeCompare(second.stock));

export const defaultSelectedStocks = accumulationRows.map((row) => row.stock);

function getSignalType(score: number): RadarSignalType {
  return score >= 75 ? "accumulation" : "watchlist";
}

function createEntry(
  ticker: string,
  addedAt = formatToday(),
  entryPrice?: number,
  entryPriceSource: SelectedAccumulationEntry["entryPriceSource"] = entryPrice ? "market" : "fallback",
): SelectedAccumulationEntry | null {
  const row = stockUniverse.find((stock) => stock.stock === ticker);
  if (!row) return null;

  return {
    ticker,
    signalType: getSignalType(row.score),
    addedAt,
    entryPrice: entryPrice ?? row.currentPrice,
    entryPriceSource,
  };
}

function getDefaultSelectedEntries() {
  return defaultSelectedStocks
    .map((ticker) => {
      const row = stockUniverse.find((stock) => stock.stock === ticker);
      return row ? createEntry(ticker, accumulationDataUpdatedAt, row.currentPrice, "fallback") : null;
    })
    .filter(Boolean) as SelectedAccumulationEntry[];
}

const defaultSelectedStocksSnapshot = JSON.stringify(getDefaultSelectedEntries());

export function scoreLabel(score: number) {
  if (score >= 90) return "Extreme Accumulation";
  if (score >= 75) return "Strong Accumulation";
  if (score >= 60) return "Accumulation";
  if (score >= 40) return "Early Interest";
  return "No Accumulation";
}

export function signalLabel(signalType: RadarSignalType) {
  if (signalType === "accumulation") return "Accumulation";
  if (signalType === "hold") return "Hold";
  return "Siap Pantau";
}

export function trendLabel(trend: TrendDirection) {
  if (trend === "uptrend") return "Uptrend";
  if (trend === "downtrend") return "Downtrend";
  return "Sideways";
}

export function formatStockPrice(price: number) {
  if (!Number.isFinite(price)) return "-";

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(price);
}

export function getPriceChangePercent(currentPrice: number, entryPrice: number) {
  if (!Number.isFinite(currentPrice) || !Number.isFinite(entryPrice) || entryPrice <= 0) return 0;
  return ((currentPrice - entryPrice) / entryPrice) * 100;
}

export function formatChangePercent(changePercent: number) {
  if (!Number.isFinite(changePercent)) return "0.00%";

  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}

function formatToday() {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

function getSelectedEntriesFromSnapshot(snapshot: string): SelectedAccumulationEntry[] {
  try {
    const parsedEntries = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsedEntries)) {
      return getDefaultSelectedEntries();
    }

    const migratedEntries = parsedEntries
      .map((entry) => {
        if (typeof entry === "string") {
          return createEntry(entry.toUpperCase(), accumulationDataUpdatedAt);
        }

        if (
          typeof entry === "object" &&
          entry !== null &&
          "ticker" in entry &&
          "signalType" in entry &&
          "addedAt" in entry
        ) {
          const ticker = String(entry.ticker).toUpperCase();
          const row = stockUniverse.find((stock) => stock.stock === ticker);
          const signalType =
            entry.signalType === "accumulation" || entry.signalType === "watchlist" || entry.signalType === "hold"
              ? entry.signalType
              : undefined;
          const addedAt = typeof entry.addedAt === "string" && entry.addedAt.trim() ? entry.addedAt : accumulationDataUpdatedAt;
          const entryPrice =
            "entryPrice" in entry && typeof entry.entryPrice === "number" && Number.isFinite(entry.entryPrice)
              ? entry.entryPrice
              : row
                ? row.currentPrice
                : undefined;
          const entryPriceSource =
            "entryPriceSource" in entry && (entry.entryPriceSource === "market" || entry.entryPriceSource === "fallback")
              ? entry.entryPriceSource
              : "fallback";

          if (row && signalType && Number.isFinite(entryPrice)) {
            return { ticker, signalType, addedAt, entryPrice, entryPriceSource };
          }
        }

        return null;
      })
      .filter(Boolean) as SelectedAccumulationEntry[];

    const uniqueEntries = new Map<string, SelectedAccumulationEntry>();
    migratedEntries.forEach((entry) => {
      uniqueEntries.set(entry.ticker, entry);
    });

    return Array.from(uniqueEntries.values());
  } catch {
    return getDefaultSelectedEntries();
  }
}

function getSelectedRowsFromSnapshot(snapshot: string): SelectedAccumulationRow[] {
  return getSelectedEntriesFromSnapshot(snapshot)
    .map((entry) => {
      const row = stockUniverse.find((stock) => stock.stock === entry.ticker);
      if (!row) return null;

      return {
        ...row,
        ticker: entry.ticker,
        signalType: entry.signalType,
        addedAt: entry.addedAt,
        entryPrice: Number.isFinite(entry.entryPrice) ? entry.entryPrice : row.currentPrice,
        entryPriceSource: entry.entryPriceSource,
      };
    })
    .filter(Boolean) as SelectedAccumulationRow[];
}

function subscribeToSelectedStocks(onStoreChange: () => void) {
  window.addEventListener(storageEventName, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(storageEventName, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSelectedStocksSnapshot() {
  return window.localStorage.getItem(storageKey) ?? defaultSelectedStocksSnapshot;
}

function getServerSelectedStocksSnapshot() {
  return defaultSelectedStocksSnapshot;
}

function saveSelectedEntries(entries: SelectedAccumulationEntry[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(entries));
  window.dispatchEvent(new Event(storageEventName));
}

function getClientSelectedEntries() {
  const entries = getSelectedEntriesFromSnapshot(getSelectedStocksSnapshot());
  saveSelectedEntries(entries);
  return entries;
}

export function addSelectedStocks(tickers: string[], entryPrices: StockPriceMap = {}) {
  const existingEntries = getClientSelectedEntries();
  const existingTickers = new Set(existingEntries.map((entry) => entry.ticker));
  const newEntries = tickers
    .filter((ticker) => !existingTickers.has(ticker))
    .map((ticker) => createEntry(ticker, formatToday(), entryPrices[ticker], entryPrices[ticker] ? "market" : "fallback"))
    .filter(Boolean) as SelectedAccumulationEntry[];

  saveSelectedEntries([...existingEntries, ...newEntries]);
}

export function hydrateFallbackEntryPrices(entryPrices: StockPriceMap) {
  const existingEntries = getClientSelectedEntries();
  const updatedEntries = existingEntries.map((entry) => {
    const marketEntryPrice = entryPrices[entry.ticker];

    if (entry.entryPriceSource === "market" || !Number.isFinite(marketEntryPrice)) {
      return entry;
    }

    return {
      ...entry,
      entryPrice: marketEntryPrice,
      entryPriceSource: "market" as const,
    };
  });

  if (JSON.stringify(existingEntries) !== JSON.stringify(updatedEntries)) {
    saveSelectedEntries(updatedEntries);
  }
}

export function removeSelectedStock(ticker: string) {
  const existingEntries = getClientSelectedEntries();
  saveSelectedEntries(existingEntries.filter((entry) => entry.ticker !== ticker));
}

export function updateSelectedStockSignal(ticker: string, signalType: RadarSignalType) {
  const existingEntries = getClientSelectedEntries();
  saveSelectedEntries(
    existingEntries.map((entry) => (entry.ticker === ticker ? { ...entry, signalType } : entry)),
  );
}

export function resetSelectedStocks() {
  saveSelectedEntries(getDefaultSelectedEntries());
}

export function useSelectedAccumulationEntries() {
  const selectedStocksSnapshot = useSyncExternalStore(
    subscribeToSelectedStocks,
    getSelectedStocksSnapshot,
    getServerSelectedStocksSnapshot,
  );

  return useMemo(() => getSelectedEntriesFromSnapshot(selectedStocksSnapshot), [selectedStocksSnapshot]);
}

export function useSelectedAccumulationStocks() {
  return useSelectedAccumulationEntries().map((entry) => entry.ticker);
}

export function useSelectedAccumulationRows() {
  const selectedStocksSnapshot = useSyncExternalStore(
    subscribeToSelectedStocks,
    getSelectedStocksSnapshot,
    getServerSelectedStocksSnapshot,
  );

  return useMemo(() => getSelectedRowsFromSnapshot(selectedStocksSnapshot), [selectedStocksSnapshot]);
}
