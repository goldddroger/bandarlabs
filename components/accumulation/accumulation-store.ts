"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
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
export type WatchlistCategory = "personal" | "daily" | "swing";
export type WatchlistLifecycle = "waiting" | "triggered" | "invalid" | "completed";
export type WatchlistThesis =
  | "breakout"
  | "support"
  | "ema10_bounce"
  | "financial_report"
  | "acquisition"
  | "audit_catalyst"
  | "corporate_action";

export type WatchlistPlan = {
  watchlistCategory: WatchlistCategory;
  thesisTags: WatchlistThesis[];
  lifecycle: WatchlistLifecycle;
  breakoutPrice?: number;
  supportLow?: number;
  supportHigh?: number;
  emaTimeframe?: "daily" | "weekly";
  catalystDate?: string;
  reviewDate?: string;
  source?: string;
  note?: string;
};

export type SelectedAccumulationEntry = WatchlistPlan & {
  ticker: string;
  signalType: RadarSignalType;
  addedAt: string;
  entryPrice: number;
  entryPriceSource?: "market" | "fallback";
};

export type SelectedAccumulationRow = AccumulationRow & SelectedAccumulationEntry;
export type StockPriceMap = Record<string, number>;

export const accumulationStorageKey = "bandarlab.accumulation.selectedStocks";
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

function getSignalType(score: number): RadarSignalType {
  return score >= 75 ? "accumulation" : "watchlist";
}

function createEntry(
  ticker: string,
  addedAt = formatToday(),
  entryPrice?: number,
  entryPriceSource: SelectedAccumulationEntry["entryPriceSource"] = entryPrice ? "market" : "fallback",
  plan: Partial<WatchlistPlan> = {},
): SelectedAccumulationEntry | null {
  const row = stockUniverse.find((stock) => stock.stock === ticker);
  if (!row) return null;

  return {
    ticker,
    signalType: getSignalType(row.score),
    addedAt,
    entryPrice: entryPrice ?? row.currentPrice,
    entryPriceSource,
    watchlistCategory: plan.watchlistCategory ?? "personal",
    thesisTags: plan.thesisTags ?? [],
    lifecycle: plan.lifecycle ?? "waiting",
    breakoutPrice: plan.breakoutPrice,
    supportLow: plan.supportLow,
    supportHigh: plan.supportHigh,
    emaTimeframe: plan.emaTimeframe,
    catalystDate: plan.catalystDate,
    reviewDate: plan.reviewDate,
    source: plan.source,
    note: plan.note,
  };
}

const emptySelectedStocksSnapshot = "[]";

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
      return [];
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
          const watchlistCategory =
            "watchlistCategory" in entry && (entry.watchlistCategory === "personal" || entry.watchlistCategory === "daily" || entry.watchlistCategory === "swing")
              ? entry.watchlistCategory
              : "personal";
          const lifecycle =
            "lifecycle" in entry && (entry.lifecycle === "waiting" || entry.lifecycle === "triggered" || entry.lifecycle === "invalid" || entry.lifecycle === "completed")
              ? entry.lifecycle
              : "waiting";
          const validTheses: WatchlistThesis[] = ["breakout", "support", "ema10_bounce", "financial_report", "acquisition", "audit_catalyst", "corporate_action"];
          const thesisTags = "thesisTags" in entry && Array.isArray(entry.thesisTags)
            ? entry.thesisTags.filter((tag: unknown): tag is WatchlistThesis => typeof tag === "string" && validTheses.includes(tag as WatchlistThesis))
            : [];
          const optionalNumber = (key: "breakoutPrice" | "supportLow" | "supportHigh") =>
            key in entry && typeof entry[key] === "number" && Number.isFinite(entry[key]) ? entry[key] : undefined;
          const optionalText = (key: "catalystDate" | "reviewDate" | "source" | "note") =>
            key in entry && typeof entry[key] === "string" && entry[key].trim() ? entry[key] : undefined;
          const emaTimeframe = "emaTimeframe" in entry && (entry.emaTimeframe === "daily" || entry.emaTimeframe === "weekly")
            ? entry.emaTimeframe
            : undefined;

          if (row && signalType && Number.isFinite(entryPrice)) {
            return {
              ticker, signalType, addedAt, entryPrice, entryPriceSource,
              watchlistCategory, lifecycle, thesisTags,
              breakoutPrice: optionalNumber("breakoutPrice"),
              supportLow: optionalNumber("supportLow"),
              supportHigh: optionalNumber("supportHigh"),
              emaTimeframe,
              catalystDate: optionalText("catalystDate"),
              reviewDate: optionalText("reviewDate"),
              source: optionalText("source"),
              note: optionalText("note"),
            };
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
    return [];
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
        watchlistCategory: entry.watchlistCategory,
        thesisTags: entry.thesisTags,
        lifecycle: entry.lifecycle,
        breakoutPrice: entry.breakoutPrice,
        supportLow: entry.supportLow,
        supportHigh: entry.supportHigh,
        emaTimeframe: entry.emaTimeframe,
        catalystDate: entry.catalystDate,
        reviewDate: entry.reviewDate,
        source: entry.source,
        note: entry.note,
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
  return window.localStorage.getItem(accumulationStorageKey) ?? emptySelectedStocksSnapshot;
}

function getServerSelectedStocksSnapshot() {
  return emptySelectedStocksSnapshot;
}

function saveSelectedEntries(entries: SelectedAccumulationEntry[]) {
  window.localStorage.setItem(accumulationStorageKey, JSON.stringify(entries));
  window.dispatchEvent(new Event(storageEventName));
}

export function getStoredSelectedAccumulationEntries() {
  return getSelectedEntriesFromSnapshot(window.localStorage.getItem(accumulationStorageKey) ?? emptySelectedStocksSnapshot);
}

export function replaceSelectedAccumulationEntries(entries: SelectedAccumulationEntry[]) {
  saveSelectedEntries(entries);
}

function getClientSelectedEntries() {
  const entries = getSelectedEntriesFromSnapshot(getSelectedStocksSnapshot());
  saveSelectedEntries(entries);
  return entries;
}

export function addSelectedStocks(tickers: string[], entryPrices: StockPriceMap = {}, plan: Partial<WatchlistPlan> = {}) {
  const existingEntries = getClientSelectedEntries();
  const existingTickers = new Set(existingEntries.map((entry) => entry.ticker));
  const newEntries = tickers
    .filter((ticker) => !existingTickers.has(ticker))
    .map((ticker) => createEntry(ticker, formatToday(), entryPrices[ticker], entryPrices[ticker] ? "market" : "fallback", plan))
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

export function updateSelectedStockPlan(ticker: string, plan: WatchlistPlan) {
  const existingEntries = getClientSelectedEntries();
  saveSelectedEntries(existingEntries.map((entry) => (entry.ticker === ticker ? { ...entry, ...plan } : entry)));
}

export function resetSelectedStocks() {
  saveSelectedEntries([]);
}

let cloudEntriesRequest: Promise<void> | null = null;

function loadSelectedEntriesFromDatabase() {
  if (cloudEntriesRequest) return cloudEntriesRequest;
  cloudEntriesRequest = fetch("/api/accumulation", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { initialized?: boolean; entries?: SelectedAccumulationEntry[] };
      if (payload.initialized) replaceSelectedAccumulationEntries(payload.entries ?? []);
    })
    .catch(() => undefined);
  return cloudEntriesRequest;
}

export function useSelectedAccumulationEntries() {
  useEffect(() => {
    void loadSelectedEntriesFromDatabase();
  }, []);
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
  useEffect(() => {
    void loadSelectedEntriesFromDatabase();
  }, []);
  const selectedStocksSnapshot = useSyncExternalStore(
    subscribeToSelectedStocks,
    getSelectedStocksSnapshot,
    getServerSelectedStocksSnapshot,
  );

  return useMemo(() => getSelectedRowsFromSnapshot(selectedStocksSnapshot), [selectedStocksSnapshot]);
}
