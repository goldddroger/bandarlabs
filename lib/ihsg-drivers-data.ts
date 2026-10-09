import { idxListedStocks } from "@/lib/idx-listed-stocks";
import { idxStockScreenerRows } from "@/lib/idx-stock-screener";
import { buildIhsgDrivers, sparkDailyPrice, type DailyPrice, type DriverStock, type IhsgDriversPayload, type SparkPrices } from "@/lib/ihsg-drivers";

const sectors = new Map<string, string>(idxStockScreenerRows.map((stock) => [stock.ticker, stock.sector]));
const composite = new Set<string>(idxStockScreenerRows.filter((stock) => (stock.indexes as readonly string[]).includes("COMPOSITE")).map((stock) => stock.ticker));
const stocks: DriverStock[] = idxListedStocks.filter((stock) => composite.has(stock.ticker) && stock.listedShares > 0)
  .map((stock) => ({ ticker: stock.ticker, name: stock.name, sector: sectors.get(stock.ticker) ?? "Lainnya", listedShares: stock.listedShares }));
let cache: { expiresAt: number; payload: IhsgDriversPayload } | null = null;
let pending: Promise<IhsgDriversPayload> | null = null;

async function loadDrivers() {
  const batches = Array.from({ length: Math.ceil(stocks.length / 20) }, (_, index) => stocks.slice(index * 20, (index + 1) * 20));
  const prices: DailyPrice[] = [];
  const deadline = AbortSignal.timeout(25_000);
  let next = 0;
  async function worker() {
    while (next < batches.length && !deadline.aborted) {
      const batch = batches[next++];
      try {
        const symbols = batch.map((stock) => `${stock.ticker}.JK`).join(",");
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbols)}&range=5d&interval=1d`, {
          cache: "no-store", signal: AbortSignal.any([deadline, AbortSignal.timeout(10_000)]),
          headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 BandarLab/1.0" },
        });
        if (!response.ok) continue;
        const payload = await response.json() as Record<string, SparkPrices>;
        for (const stock of batch) {
          const quote = payload[`${stock.ticker}.JK`];
          const price = quote ? sparkDailyPrice(stock.ticker, quote) : null;
          if (price) prices.push(price);
        }
      } catch {
        // Use successful batches, with explicit coverage rather than invented prices.
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  const payload = buildIhsgDrivers(stocks, prices);
  if (!payload) throw new Error("Data harga penggerak IHSG belum tersedia dari Yahoo Finance.");
  cache = { expiresAt: Date.now() + 120_000, payload };
  return payload;
}

export async function getIhsgDrivers() {
  if (cache && cache.expiresAt > Date.now()) return cache.payload;
  if (!pending) pending = loadDrivers().finally(() => { pending = null; });
  return pending;
}
