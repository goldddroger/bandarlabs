export type QuoteSource = "Yahoo Finance" | "Google Finance" | "Fallback";

export type StockQuote = {
  ticker: string;
  price: number;
  changePercent: number;
  source: QuoteSource;
  updatedAt?: string;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketTime?: number;
      };
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

export function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatQuotePrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatQuoteChangePercent(changePercent: number) {
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}

function formatTimestamp(unixSeconds?: number) {
  if (!unixSeconds) return undefined;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(unixSeconds * 1000));
}

function getChangePercent(price: number, previousClose?: number) {
  if (typeof previousClose !== "number" || !Number.isFinite(previousClose) || previousClose === 0) return 0;
  return ((price - previousClose) / previousClose) * 100;
}

async function fetchYahooStockQuote(ticker: string): Promise<StockQuote | null> {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.JK?range=5d&interval=1d`, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 BandarLab/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  const meta = result?.meta;
  const price = meta?.regularMarketPrice;
  const closes = (result?.indicators?.quote?.[0]?.close ?? [])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const previousClose = closes.length >= 2
    ? closes.at(-2)
    : meta?.previousClose ?? meta?.chartPreviousClose;

  if (typeof price !== "number" || !Number.isFinite(price)) return null;

  return {
    ticker,
    price,
    changePercent: getChangePercent(price, previousClose),
    source: "Yahoo Finance",
    updatedAt: formatTimestamp(meta?.regularMarketTime),
  };
}

async function fetchGoogleStockQuote(ticker: string): Promise<StockQuote | null> {
  const response = await fetch(`https://www.google.com/finance/quote/${ticker}:IDX`, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 BandarLab/1.0",
      Accept: "text/html",
    },
  });

  if (!response.ok) return null;

  const html = await response.text();
  const priceMatch = html.match(/data-last-price="([\d.]+)"/);
  const previousCloseMatch = html.match(/data-previous-close="([\d.]+)"/);
  const price = priceMatch ? Number(priceMatch[1]) : Number.NaN;
  const previousClose = previousCloseMatch ? Number(previousCloseMatch[1]) : undefined;

  if (!Number.isFinite(price)) return null;

  return {
    ticker,
    price,
    changePercent: getChangePercent(price, previousClose),
    source: "Google Finance",
  };
}

export async function getStockQuote(ticker: string): Promise<StockQuote | null> {
  const normalizedTicker = normalizeTicker(ticker);
  if (!normalizedTicker) return null;

  try {
    const yahooQuote = await fetchYahooStockQuote(normalizedTicker);
    if (yahooQuote) return yahooQuote;
  } catch {
    // Google fallback below keeps the UI usable when Yahoo throttles or blocks a ticker.
  }

  try {
    const googleQuote = await fetchGoogleStockQuote(normalizedTicker);
    if (googleQuote) return googleQuote;
  } catch {
    // The caller can keep its local fallback price if both providers fail.
  }

  return null;
}
