import assert from "node:assert/strict";
import test from "node:test";
import { buildIhsgDrivers, formatCapitalizationChange, rankIhsgDrivers, sparkDailyPrice, type DriverStock, type DailyPrice } from "../lib/ihsg-drivers";
import { permissionForPath } from "../lib/feature-permissions";

const stocks: DriverStock[] = [
  { ticker: "BIG", name: "Large stock", sector: "Financials", listedShares: 1_000_000_000 },
  { ticker: "SMALL", name: "Small stock", sector: "Energy", listedShares: 1_000_000 },
  { ticker: "DOWN", name: "Declining stock", sector: "Technology", listedShares: 500_000_000 },
  { ticker: "FLAT", name: "Unchanged stock", sector: "Industrials", listedShares: 100_000_000 },
];
const price = (ticker: string, current: number, previous: number, date = "2026-10-09", previousDate = "2026-10-08"): DailyPrice => ({ ticker, price: current, previousClose: previous, date, previousDate });
const stamp = (date: string) => Date.parse(`${date}T09:00:00+07:00`) / 1000;

test("ranks capitalization impact, not price percentage; sign and totals stay correct", () => {
  const result = buildIhsgDrivers(stocks, [price("BIG", 101, 100), price("SMALL", 120, 100), price("DOWN", 95, 100), price("FLAT", 100, 100)]);
  assert.ok(result);
  assert.equal(result.positiveChange, 1_020_000_000);
  assert.equal(result.negativeChange, -2_500_000_000);
  assert.equal(result.netChange, -1_480_000_000);
  assert.equal(result.rows[0].ticker, "DOWN");
  assert.deepEqual(rankIhsgDrivers(result.rows, "positive").map((row) => row.ticker), ["BIG", "SMALL"]);
  assert.deepEqual(rankIhsgDrivers(result.rows, "negative").map((row) => row.ticker), ["DOWN"]);
  assert.equal(result.rows.find((row) => row.ticker === "FLAT")?.changePercent, 0);
});

test("excludes stale prices and mismatched comparison sessions, without reweighting as official IHSG", () => {
  const result = buildIhsgDrivers(stocks, [price("BIG", 101, 100), price("SMALL", 120, 100, "2026-10-08", "2026-10-07"), price("DOWN", 95, 100, "2026-10-09", "2026-10-07")]);
  assert.ok(result);
  assert.equal(result.coveredStocks, 1);
  assert.equal(result.excludedStocks, 3);
  assert.equal(result.tradingDate, "2026-10-09");
  assert.equal(result.previousDate, "2026-10-08");
  assert.equal(result.netChange, 1_000_000_000);
  assert.equal("indexPoints" in result.rows[0], false);
});

test("rejects missing, zero, nonfinite quotes or shares and deduplicates symbols", () => {
  assert.equal(buildIhsgDrivers(stocks, []), null);
  assert.equal(buildIhsgDrivers(stocks, [price("UNKNOWN", 100, 99), price("BIG", NaN, 100), price("SMALL", 100, 0)]), null);
  assert.equal(buildIhsgDrivers([{ ...stocks[0], listedShares: Infinity }], [price("BIG", 101, 100)]), null);
  assert.equal(buildIhsgDrivers(stocks, [price("BIG", 101, 100), price("BIG", 101, 100)])?.coveredStocks, 1);
});

test("spark keeps timestamps aligned with null prices and never invents a latest quote", () => {
  assert.equal(sparkDailyPrice("BIG", { timestamp: [stamp("2026-10-08"), stamp("2026-10-09")], close: [100, null] }), null);
  assert.equal(sparkDailyPrice("BIG", { timestamp: [stamp("2026-10-08"), stamp("2026-10-09")], close: [0, 101] }), null);
  const result = sparkDailyPrice("BIG", { timestamp: [stamp("2026-10-07"), stamp("2026-10-08"), stamp("2026-10-09")], close: [98, null, 101] });
  assert.equal(result?.previousClose, 98);
  assert.equal(result?.previousDate, "2026-10-07");
});

test("same-day candles are not used as yesterday's close; holidays use the preceding session", () => {
  const result = sparkDailyPrice("BIG", { timestamp: [stamp("2026-10-09"), stamp("2026-10-12"), stamp("2026-10-12") + 3600], close: [100, 101, 102] });
  assert.equal(result?.previousClose, 100);
  assert.equal(result?.previousDate, "2026-10-09");
  assert.equal(result?.price, 102);
});

test("money formatting and dashboard permissions", () => {
  assert.equal(formatCapitalizationChange(1_250_000_000_000), "+Rp 1,25 T");
  assert.equal(formatCapitalizationChange(-2_500_000_000), "-Rp 2,5 M");
  assert.equal(permissionForPath("/api/ihsg-drivers"), "dashboard");
});
