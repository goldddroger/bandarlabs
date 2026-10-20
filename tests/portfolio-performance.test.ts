import assert from "node:assert/strict";
import test from "node:test";
import { summarizeTrades } from "../lib/portfolio-performance";
import { calculateRealizedGain, type RealizedTrade } from "../lib/portfolio-store";

const trade: RealizedTrade = {
  id: "test", ticker: "BBCA", lots: 10, buyPrice: 1000, sellPrice: 1200,
  buyFeePercent: 0.15, sellFeePercent: 0.25, soldAt: "2026-10-20", note: "",
};

test("counts completed records, unique tickers, and lots without modifying trades", () => {
  const trades = [trade, { ...trade, id: "2" }, { ...trade, id: "3", ticker: "BMRI", lots: 20 }];
  const snapshot = structuredClone(trades);
  const stats = summarizeTrades(trades);
  assert.equal(stats.count, 3);
  assert.equal(stats.tickerCount, 2);
  assert.equal(stats.totalLots, 40);
  assert.deepEqual(trades, snapshot);
});

test("matches existing realized gain after both fees and does not subtract fees twice", () => {
  const stats = summarizeTrades([trade]);
  assert.equal(stats.realized, 195500);
  assert.equal(stats.realized, calculateRealizedGain(trade));
  assert.equal(stats.totalFees, 4500);
  assert.equal(stats.averageGain, 195500);
  assert.equal(stats.profitFactor, null);
});

test("separates wins, losses, and breakeven and includes all trades in win rate", () => {
  const stats = summarizeTrades([
    { ...trade, sellPrice: 1100, buyFeePercent: 0, sellFeePercent: 0 },
    { ...trade, sellPrice: 950, buyFeePercent: 0, sellFeePercent: 0 },
    { ...trade, sellPrice: 1000, buyFeePercent: 0, sellFeePercent: 0 },
  ]);
  assert.equal(stats.wins, 1);
  assert.equal(stats.losses, 1);
  assert.equal(stats.breakeven, 1);
  assert.equal(stats.totalProfit, 100000);
  assert.equal(stats.totalLoss, 50000);
  assert.equal(stats.realized, 50000);
  assert.ok(Math.abs(stats.winRate - 100 / 3) < 1e-10);
  assert.equal(stats.profitFactor, 2);
  assert.equal(stats.averageGain, 50000 / 3);
});

test("same buy and sell price is a loss when fees apply", () => {
  const stats = summarizeTrades([{ ...trade, sellPrice: 1000 }]);
  assert.equal(stats.losses, 1);
  assert.equal(stats.breakeven, 0);
  assert.equal(stats.realized, -4000);
  assert.equal(stats.profitFactor, 0);
});

test("empty periods have zero totals and no NaN or infinite profit factor", () => {
  const stats = summarizeTrades([]);
  assert.equal(stats.count, 0);
  assert.equal(stats.realized, 0);
  assert.equal(stats.averageGain, 0);
  assert.equal(stats.winRate, 0);
  assert.equal(stats.totalFees, 0);
  assert.equal(stats.profitFactor, null);
  assert.ok(Object.values(stats).every((value) => value === null || Number.isFinite(value)));
});

test("statistics aggregate only the period supplied by the history filter", () => {
  const trades = [trade, { ...trade, soldAt: "2026-09-30" }, { ...trade, soldAt: "2025-10-20" }];
  assert.equal(summarizeTrades(trades.filter((item) => item.soldAt.startsWith("2026-10"))).count, 1);
  assert.equal(summarizeTrades(trades.filter((item) => item.soldAt.startsWith("2026"))).count, 2);
});
