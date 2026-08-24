type MarketTone = "positive" | "negative" | "neutral" | "warning";

export type MarketSummaryCard = {
  label: string;
  value: string;
  detail: string;
  tone: MarketTone;
  source: "Yahoo Finance" | "Google Finance" | "Demo fallback" | "Unavailable";
  updatedAt?: string;
};

type QuoteRequest = {
  label: string;
  yahooSymbol: string;
  googleSymbol: string;
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

const quoteRequests: QuoteRequest[] = [
  {
    label: "IHSG",
    yahooSymbol: "^JKSE",
    googleSymbol: "COMPOSITE:IDX",
  },
  {
    label: "VIX",
    yahooSymbol: "^VIX",
    googleSymbol: "VIX:INDEXCBOE",
  },
];

const fallbackQuotes: Record<string, MarketSummaryCard> = {
  IHSG: {
    label: "IHSG",
    value: "7,247.60",
    detail: "+0.48%",
    tone: "positive",
    source: "Demo fallback",
  },
  VIX: {
    label: "VIX",
    value: "16.21",
    detail: "+1.83%",
    tone: "warning",
    source: "Demo fallback",
  },
};

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

  if (typeof price !== "number" || typeof previousClose !== "number" || previousClose === 0) {
    return null;
  }

  const changePercent = ((price - previousClose) / previousClose) * 100;

  return {
    label: request.label,
    value: numberFormatter.format(price),
    detail: formatPercent(changePercent),
    tone: request.label === "VIX" && changePercent > 0 ? "warning" : toneFromChange(changePercent),
    source: "Yahoo Finance",
    updatedAt: formatTimestamp(meta?.regularMarketTime),
  };
}

async function fetchGoogleQuote(request: QuoteRequest): Promise<MarketSummaryCard | null> {
  const response = await fetch(`https://www.google.com/finance/quote/${request.googleSymbol}`, {
    next: { revalidate: 300 },
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
  const previousClose = previousCloseMatch ? Number(previousCloseMatch[1]) : Number.NaN;

  if (!Number.isFinite(price)) return null;

  const changePercent =
    Number.isFinite(previousClose) && previousClose !== 0 ? ((price - previousClose) / previousClose) * 100 : 0;

  return {
    label: request.label,
    value: numberFormatter.format(price),
    detail: Number.isFinite(previousClose) ? formatPercent(changePercent) : "Google Finance",
    tone: request.label === "VIX" && changePercent > 0 ? "warning" : toneFromChange(changePercent),
    source: "Google Finance",
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
    // Demo value is better than a broken dashboard for the MVP.
  }

  return fallbackQuotes[request.label];
}

export async function getDashboardMarketSummary(): Promise<MarketSummaryCard[]> {
  const [ihsg, vix] = await Promise.all(quoteRequests.map(getQuote));

  return [
    ihsg,
    {
      label: "Foreign Flow",
      value: "N/A",
      detail: "Tidak tersedia di Yahoo/Google",
      tone: "neutral",
      source: "Unavailable",
    },
    {
      label: "Advancers / Decliners",
      value: "298 / 221",
      detail: "Demo breadth",
      tone: "neutral",
      source: "Demo fallback",
    },
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
