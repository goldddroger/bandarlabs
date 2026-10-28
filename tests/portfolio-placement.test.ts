import assert from "node:assert/strict";
import test from "node:test";
import { applyHoldingPlacements, samePlacement, summarizePlacements } from "../lib/portfolio-placement";
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

test("one save splits 12,448 legacy lots into CP, XL, and KK without double counting", () => {
  const legacy = { ...holding, id: "legacy", ticker: "LAPD", security: "", lots: 12448, averagePrice: 191 };
  const other = { ...holding, id: "unrelated" };
  const inputs = [legacy, other];
  const before = structuredClone(inputs);
  let sequence = 0;
  const result = applyHoldingPlacements(inputs, [
    { ...legacy, security: "CP", lots: 6000 },
    { ...legacy, id: undefined, security: "XL", lots: 4000 },
    { ...legacy, id: undefined, security: "KK", lots: 2448 },
  ], ["legacy"], () => "new-" + ++sequence);
  const placements = result.holdings.filter((row) => row.ticker === "LAPD");
  assert.equal(placements.length, 3);
  assert.equal(placements.reduce((sum, row) => sum + row.lots, 0), 12448);
  assert.equal(placements.reduce((sum, row) => sum + row.lots * 100 * row.averagePrice, 0), 237756800);
  assert.deepEqual(placements.map((row) => row.security), ["CP", "XL", "KK"]);
  assert.deepEqual(result.deletedHoldingIds, []);
  assert.deepEqual(inputs, before);
  assert.deepEqual(result.holdings.find((row) => row.id === "unrelated"), other);
});

test("batch editing replaces all original placements and returns removed IDs for server deletion", () => {
  const first = { ...holding, id: "cp", security: "CP", lots: 10 };
  const second = { ...holding, id: "xl", security: "XL", lots: 20 };
  const result = applyHoldingPlacements([first, second], [{ ...first, lots: 30 }], ["cp", "xl"]);
  assert.equal(result.holdings.length, 1);
  assert.equal(result.holdings[0].lots, 30);
  assert.deepEqual(result.deletedHoldingIds, ["xl"]);
});

test("adding several placements merges only matching securities with weighted prices", () => {
  let sequence = 0;
  const result = applyHoldingPlacements([{ ...holding, security: "CP" }], [
    { ...holding, id: undefined, security: "cp", lots: 20, averagePrice: 1300 },
    { ...holding, id: undefined, security: "XL", lots: 5, averagePrice: 1400 },
  ], [], () => "new-" + ++sequence);
  assert.equal(result.holdings.length, 2);
  assert.equal(result.holdings[0].id, holding.id);
  assert.equal(result.holdings[0].lots, 30);
  assert.equal(result.holdings[0].averagePrice, 1200);
  assert.equal(result.holdings[1].lots, 5);
  assert.equal(result.holdings[1].averagePrice, 1400);
});

test("duplicate or invalid rows reject the whole batch without changing holdings", () => {
  const inputs = [holding];
  const before = structuredClone(inputs);
  const duplicate = [{ ...holding, security: "CP" }, { ...holding, security: " cp " }];
  assert.throws(() => applyHoldingPlacements(inputs, duplicate), /satu baris/);
  for (const patch of [{ lots: 0 }, { lots: -1 }, { lots: 1.5 }, { lots: NaN }, { averagePrice: Infinity }, { averagePrice: 0 }, { purchasedAt: "" }]) {
    assert.throws(() => applyHoldingPlacements(inputs, [holding, { ...holding, security: "XL", ...patch }]));
  }
  assert.throws(() => applyHoldingPlacements(inputs, []));
  assert.deepEqual(inputs, before);
});
