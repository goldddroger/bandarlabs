import assert from "node:assert/strict";
import test from "node:test";
import { samePlacement, summarizePlacements } from "../lib/portfolio-placement";
import type { PortfolioHolding } from "../lib/portfolio-store";

const holding: PortfolioHolding = { id: "a", ticker: "BBCA", security: "Sekuritas A", lots: 10, averagePrice: 1000, purchasedAt: "2026-10-28", note: "" };

test("same ticker at different securities remains separate; names ignore case and whitespace", () => {
  assert.equal(samePlacement(holding, { ticker: "BBCA", security: "Sekuritas B" }), false);
  assert.equal(samePlacement(holding, { ticker: "BBCA", security: "  SEKURITAS   A " }), true);
  assert.equal(samePlacement(holding, { ticker: "BMRI", security: "Sekuritas A" }), false);
  assert.equal(samePlacement({ ticker: "BBCA" }, { ticker: "BBCA", security: "" }), true);
});

test("sums A, B, C placements and weighted capital across tickers without changing inputs", () => {
  const holdings = [holding,
    { ...holding, id: "b", security: "Sekuritas B", lots: 20, averagePrice: 1200 },
    { ...holding, id: "c", security: "Sekuritas C", lots: 5, averagePrice: 900 },
    { ...holding, id: "d", ticker: "BMRI", security: " sekuritas   a ", lots: 3, averagePrice: 2000 },
  ];
  const before = structuredClone(holdings);
  const result = summarizePlacements(holdings, { BBCA: 1500, BMRI: 2100 });
  assert.deepEqual(result, [
    { security: "Sekuritas A", lots: 13, capital: 1600000, marketValue: 2130000, tickerCount: 2 },
    { security: "Sekuritas B", lots: 20, capital: 2400000, marketValue: 3000000, tickerCount: 1 },
    { security: "Sekuritas C", lots: 5, capital: 450000, marketValue: 750000, tickerCount: 1 },
  ]);
  assert.equal(result.reduce((sum, group) => sum + group.capital, 0), 4450000);
  assert.equal(result.reduce((sum, group) => sum + group.lots, 0), 38);
  assert.deepEqual(holdings, before);
});

test("legacy positions remain visible and missing or invalid market prices use purchase price", () => {
  const legacy = { ...holding, security: undefined };
  for (const price of [undefined, NaN, Infinity, 0, -1]) {
    const [result] = summarizePlacements([legacy], price === undefined ? {} : { BBCA: price });
    assert.equal(result.security, "Belum diisi");
    assert.equal(result.marketValue, 1000000);
  }
  assert.deepEqual(summarizePlacements([]), []);
});

test("same ticker with different purchase prices keeps each cost basis when quotes are absent", () => {
  const result = summarizePlacements([holding, { ...holding, id: "b", security: "Sekuritas B", averagePrice: 1200 }]);
  assert.equal(result[0].marketValue, 1000000);
  assert.equal(result[1].marketValue, 1200000);
  assert.equal(result.reduce((total, group) => total + group.marketValue, 0), 2200000);
});
