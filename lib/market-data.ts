import { previousSessionClose } from "@/lib/market-price-session";

type MarketTone = "positive" | "negative" | "neutral" | "warning";

export type MarketSummaryCard = {
  label: string;
  value: string;
  detail: string;
  tone: MarketTone;
  source: "Yahoo Finance" | "Google Finance" | "Unavailable";
  updatedAt?: string;
  sourceUrl?: string;
};

type QuoteRequest = {
  label: string;
  yahooSymbol: string;
  googleSymbol: string;
  yield?: boolean;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketTime?: number;
        exchangeTimezoneName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

const quoteRequests: QuoteRequest[] = [
  {
    label: "IHSG",
    yahooSymbol: "^JKSE",
    googleSymbol: "COMPOSITE:IDX",
  },
  {
    label: "US 10-Year Yield",
    yahooSymbol: "^TNX",
    googleSymbol: "TNX:INDEXCBOE",
    yield: true,
  },
  {
    label: "VIX",
    yahooSymbol: "^VIX",
    googleSymbol: "VIX:INDEXCBOE",
  },
];

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function toneFromChange(changePercent: number): MarketTone {
  if (changePercent > 0) return "positive";
  if (changePercent < 0) return "negative";
  return "neutral";
}

function formatTimestamp(unixSeconds?: number) {
  if (!unixSeconds) return undefined;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(unixSeconds * 1000));
}

async function fetchYahooQuote(request: QuoteRequest): Promise<MarketSummaryCard | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    request.yahooSymbol,
  )}?range=5d&interval=1d`;

  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: {
      "User-Agent": "BandarLab/1.0",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  const meta = result?.meta;
  const price = meta?.regularMarketPrice;
  const previousClose = meta?.previousClose ?? (meta?.regularMarketTime
    ? previousSessionClose(result?.indicators?.quote?.[0]?.close ?? [], result?.timestamp ?? [], meta.regularMarketTime, meta.exchangeTimezoneName ?? "America/New_York")
    : undefined);

  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0 || typeof previousClose !== "number" || !Number.isFinite(previousClose) || previousClose <= 0) {
    return null;
  }

  const changePercent = ((price - previousClose) / previousClose) * 100;

  return {
    label: request.label,
    value: `${numberFormatter.format(price)}${request.yield ? "%" : ""}`,
    detail: request.yield ? `${price > previousClose ? "+" : ""}${((price - previousClose) * 100).toFixed(2)} bps vs penutupan sebelumnya` : formatPercent(changePercent),
    tone: (request.label === "VIX" || request.yield) && changePercent > 0 ? "warning" : toneFromChange(changePercent),
    source: "Yahoo Finance",
    updatedAt: formatTimestamp(meta?.regularMarketTime),
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(request.yahooSymbol)}/`,
  };
}

async function fetchGoogleQuote(request: QuoteRequest): Promise<MarketSummaryCard | null> {
  // Yahoo ^TNX is a percentage yield; no verified equivalent Google feed is configured.
  if (request.yield) return null;
  const response = await fetch(`https://www.google.com/finance/quote/${request.googleSymbol}`, {
    next: { revalidate: 300 },
    headers: {
      "User-Agent": "Mozilla/5.0 BandarLab/1.0",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return null;

  const html = await response.text();
  const priceMatch = html.match(/data-last-price="([\d.]+)"/);
  const previousCloseMatch = html.match(/data-previous-close="([\d.]+)"/);
  const price = priceMatch ? Number(priceMatch[1]) : Number.NaN;
  const previousClose = previousCloseMatch ? Number(previousCloseMatch[1]) : Number.NaN;

  if (!Number.isFinite(price) || price <= 0) return null;

  const changePercent =
    Number.isFinite(previousClose) && previousClose !== 0 ? ((price - previousClose) / previousClose) * 100 : 0;

  return {
    label: request.label,
    value: `${numberFormatter.format(price)}${request.yield ? "%" : ""}`,
    detail: Number.isFinite(previousClose) && previousClose > 0
      ? request.yield ? `${price > previousClose ? "+" : ""}${((price - previousClose) * 100).toFixed(2)} bps vs penutupan sebelumnya` : formatPercent(changePercent)
      : "Perubahan belum tersedia",
    tone: (request.label === "VIX" || request.yield) && changePercent > 0 ? "warning" : toneFromChange(changePercent),
    source: "Google Finance",
    sourceUrl: `https://www.google.com/finance/quote/${request.googleSymbol}`,
  };
}

async function getQuote(request: QuoteRequest) {
  try {
    const yahooQuote = await fetchYahooQuote(request);
    if (yahooQuote) return yahooQuote;
  } catch {
    // Fallback below keeps the dashboard usable when Yahoo blocks a request.
  }

  try {
    const googleQuote = await fetchGoogleQuote(request);
    if (googleQuote) return googleQuote;
  } catch {
    // Never substitute a fabricated quote when both providers fail.
  }

  return { label: request.label, value: "N/A", detail: "Data pasar belum tersedia", tone: "neutral", source: "Unavailable" } satisfies MarketSummaryCard;
}

export async function getDashboardMarketSummary(): Promise<MarketSummaryCard[]> {
  const [ihsg, treasury, vix] = await Promise.all(quoteRequests.map(getQuote));

  return [
    ihsg,
    {
      label: "Foreign Flow",
      value: "N/A",
      detail: "Data transaksi asing BEI belum tersambung",
      tone: "neutral",
      source: "Unavailable",
      sourceUrl: "https://www.idx.co.id/id/data-pasar/laporan-statistik/digital-statistic/",
    },
    treasury,
    vix,
  ];
}

export function marketToneClass(tone: MarketTone) {
  return {
    positive: "text-green-700",
    negative: "text-red-700",
    neutral: "text-gray-600",
    warning: "text-amber-700",
  }[tone];
}
