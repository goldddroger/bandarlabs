import { indonesiaStocks } from "@/lib/indonesia-stocks";

export const dynamic = "force-dynamic";

type SparkQuote = {
  timestamp?: number[];
  close?: Array<number | null>;
};

type MarketMover = {
  ticker: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  timestamp: number;
};

type CachedMovers = {
  expiresAt: number;
  payload: {
    gainers: MarketMover[];
    losers: MarketMover[];
    updatedAt: string;
    coveredStocks: number;
  };
};

const tickerNames = new Map<string, string>(indonesiaStocks.map((stock) => [stock.ticker, stock.name]));
let cache: CachedMovers | null = null;

function chunk<T>(items: readonly T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

async function fetchBatches(batches: readonly (readonly string[])[], concurrency: number) {
  const results: Record<string, SparkQuote>[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < batches.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results.push(await fetchSpark(batches[index]));
      } catch {
        // Partial Yahoo failures should not hide successful batches from the dashboard.
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, worker));
  return results;
}

async function fetchSpark(tickers: readonly string[]) {
  const symbols = tickers.map((ticker) => `${ticker}.JK`).join(",");
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbols)}&range=5d&interval=1d`, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: {
      "User-Agent": "Mozilla/5.0 BandarLab/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) throw new Error(`Yahoo Finance merespons ${response.status}.`);
  return (await response.json()) as Record<string, SparkQuote>;
}

function toMover(symbol: string, quote: SparkQuote): MarketMover | null {
  const ticker = symbol.replace(/\.JK$/i, "").toUpperCase();
  const prices = (quote.close ?? []).filter((price): price is number => typeof price === "number" && Number.isFinite(price));
  const timestamps = quote.timestamp ?? [];
  const price = prices.at(-1);
  const previousClose = prices.at(-2);
  const timestamp = timestamps.at(-1);

  if (!tickerNames.has(ticker) || price === undefined || previousClose === undefined || previousClose <= 0 || !timestamp) return null;
  const change = price - previousClose;

  return {
    ticker,
    name: tickerNames.get(ticker) ?? ticker,
    price,
    previousClose,
    change,
    changePercent: (change / previousClose) * 100,
    timestamp,
  };
}

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) return Response.json(cache.payload);

  const batches = chunk(indonesiaStocks.map((stock) => stock.ticker), 20);
  const results = await fetchBatches(batches, 6);
  const movers = results.flatMap((result) => {
    return Object.entries(result).flatMap(([symbol, quote]) => {
      const mover = toMover(symbol, quote);
      return mover ? [mover] : [];
    });
  });

  if (movers.length === 0) {
    return Response.json({ error: "Data market movers sedang tidak tersedia." }, { status: 502 });
  }

  const latestTimestamp = Math.max(...movers.map((mover) => mover.timestamp));
  const freshMovers = movers.filter((mover) => latestTimestamp - mover.timestamp <= 7 * 86_400);
  const payload = {
    gainers: freshMovers.filter((mover) => mover.changePercent > 0).sort((first, second) => second.changePercent - first.changePercent).slice(0, 5),
    losers: freshMovers.filter((mover) => mover.changePercent < 0).sort((first, second) => first.changePercent - second.changePercent).slice(0, 5),
    updatedAt: new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(latestTimestamp * 1000)),
    coveredStocks: freshMovers.length,
  };

  cache = { expiresAt: Date.now() + 5 * 60_000, payload };
  return Response.json(payload);
}
