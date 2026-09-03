import { normalizeTicker } from "@/lib/stock-quotes";

export const dynamic = "force-dynamic";

type YahooHistoryResponse = {
  chart?: {
    error?: { description?: string } | null;
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

function json(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: { ...noStoreHeaders, ...init?.headers },
  });
}

function toJakartaDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(timestamp * 1000));
}

function getPeriodStart(start: string | null) {
  if (start && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
    const timestamp = Math.floor(new Date(`${start}T00:00:00+07:00`).getTime() / 1000);
    if (Number.isFinite(timestamp)) return timestamp - 7 * 86_400;
  }

  return Math.floor(Date.now() / 1000) - 365 * 86_400;
}

const rangeDays: Record<string, number> = {
  "1m": 45,
  "3m": 110,
  "6m": 210,
  "1y": 370,
  "3y": 1_110,
  "5y": 1_850,
};

const yahooRanges: Record<string, string> = {
  "1m": "1mo",
  "3m": "3mo",
  "6m": "6mo",
  "1y": "1y",
  "3y": "5y",
  "5y": "5y",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = normalizeTicker(searchParams.get("ticker") ?? "");
  const start = searchParams.get("start");
  const includeBefore = searchParams.get("includeBefore") === "1";
  const range = searchParams.get("range")?.toLowerCase() ?? "";

  if (!ticker) {
    return json({ error: "Ticker wajib diisi." }, { status: 400 });
  }

  const period1 = rangeDays[range]
    ? Math.floor(Date.now() / 1000) - rangeDays[range] * 86_400
    : getPeriodStart(start);
  const period2 = Math.floor(Date.now() / 1000) + 86_400;
  const yahooRange = yahooRanges[range];
  const query = yahooRange
    ? `range=${yahooRange}`
    : `period1=${period1}&period2=${period2}`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.JK?${query}&interval=1d&events=history`;
  const rangeStartDate = rangeDays[range] ? toJakartaDate(period1) : null;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 BandarLab/1.0",
      },
    });

    if (!response.ok) {
      return json({ error: "Histori harga belum tersedia dari Yahoo Finance." }, { status: 502 });
    }

    const payload = (await response.json()) as YahooHistoryResponse;
    if (payload.chart?.error) {
      return json({ error: payload.chart.error.description || "Histori harga belum tersedia." }, { status: 502 });
    }
    const result = payload.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];
    const opens = quote?.open ?? [];
    const highs = quote?.high ?? [];
    const lows = quote?.low ?? [];
    const closes = quote?.close ?? [];
    const volumes = quote?.volume ?? [];
    const marketDate = result?.meta?.regularMarketTime ? toJakartaDate(result.meta.regularMarketTime) : null;
    const marketPrice = result?.meta?.regularMarketPrice;
    const rows = timestamps
      .map((timestamp, index) => {
        const date = toJakartaDate(timestamp);
        return {
          date,
          open: opens[index],
          high: highs[index],
          low: lows[index],
          close: closes[index] ?? (date === marketDate ? marketPrice : null),
          volume: volumes[index],
        };
      })
      .filter((row): row is { date: string; open: number; high: number; low: number; close: number; volume: number | null } =>
        [row.open, row.high, row.low, row.close].every((value) => typeof value === "number" && Number.isFinite(value)),
      )
      .filter((row) => !start || includeBefore || row.date >= start);
    const filteredRows = rangeStartDate ? rows.filter((row) => row.date >= rangeStartDate) : rows;

    return json({
      ticker,
      source: "Yahoo Finance",
      rows: filteredRows,
      latestCandleDate: filteredRows.at(-1)?.date ?? null,
      marketPrice: marketPrice ?? null,
      marketUpdatedAt: result?.meta?.regularMarketTime
        ? new Date(result.meta.regularMarketTime * 1000).toISOString()
        : null,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return json({ error: "Gagal mengambil histori harga saham." }, { status: 502 });
  }
}
