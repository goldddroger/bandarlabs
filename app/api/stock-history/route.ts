import { normalizeTicker } from "@/lib/stock-quotes";

export const dynamic = "force-dynamic";

type YahooHistoryResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = normalizeTicker(searchParams.get("ticker") ?? "");
  const start = searchParams.get("start");

  if (!ticker) {
    return Response.json({ error: "Ticker wajib diisi." }, { status: 400 });
  }

  const period1 = getPeriodStart(start);
  const period2 = Math.floor(Date.now() / 1000) + 86_400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.JK?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 BandarLab/1.0",
      },
    });

    if (!response.ok) {
      return Response.json({ error: "Histori harga belum tersedia dari Yahoo Finance." }, { status: 502 });
    }

    const payload = (await response.json()) as YahooHistoryResponse;
    const result = payload.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const volumes = result?.indicators?.quote?.[0]?.volume ?? [];
    const rows = timestamps
      .map((timestamp, index) => ({
        date: toJakartaDate(timestamp),
        close: closes[index],
        volume: volumes[index],
      }))
      .filter((row): row is { date: string; close: number; volume: number | null } =>
        typeof row.close === "number" && Number.isFinite(row.close),
      )
      .filter((row) => !start || row.date >= start);

    return Response.json({ ticker, source: "Yahoo Finance", rows });
  } catch {
    return Response.json({ error: "Gagal mengambil histori harga saham." }, { status: 502 });
  }
}
