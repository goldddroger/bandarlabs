import assert from "node:assert/strict";
import test from "node:test";
import { calculateAverageDown, type AverageDownInput } from "../lib/portfolio-average-down";

const input: AverageDownInput = {
  lots: 100, averagePrice: 120, referencePrice: 56, buyPrice: 56,
  buyFeePercent: 0.15, sellFeePercent: 0.25,
  target: { mode: "recovery", value: 10 },
};

test("avg 120, market 56: minimum lots achieve net BEP within 10% including fees", () => {
  const result = calculateAverageDown(input);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.additionalLots, 1093);
  assert.equal(result.grossBuy, 6_120_800);
  assert.equal(result.buyFee, 9_181.2);
  assert.equal(result.additionalCapital, 6_129_981.2);
  assert.ok(result.breakevenPrice <= 61.6);
  assert.ok(result.recoveryPercent <= 10);
  const previousLots = result.additionalLots - 1;
  const previousCost = 1_200_000 + previousLots * 100 * 56 * 1.0015;
  assert.ok(previousCost / ((100 + previousLots) * 100 * 0.9975) > 61.6);
});

test("manual average and exact lot boundary without fees", () => {
  const result = calculateAverageDown({ ...input, buyFeePercent: 0, sellFeePercent: 0, target: { mode: "average", value: 88 } });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.additionalLots, 100);
  assert.equal(result.averagePrice, 88);
  assert.equal(result.breakevenPrice, 88);
  assert.equal(result.totalLots, 200);
  assert.equal(result.additionalCapital, 560_000);
});

test("manual average does not confuse cost basis with sale BEP", () => {
  const result = calculateAverageDown({ ...input, target: { mode: "average", value: 60 } });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.ok(result.averagePrice <= 60);
  assert.ok(result.breakevenPrice > result.averagePrice);
  assert.equal(result.breakevenPrice, result.averagePrice / 0.9975);
});

test("already achieved target requires zero money even when purchase price exceeds target", () => {
  const result = calculateAverageDown({ ...input, averagePrice: 50, buyPrice: 100 });
  assert.equal(result.status, "achieved");
  if (result.status !== "achieved") return;
  assert.equal(result.additionalLots, 0);
  assert.equal(result.additionalCapital, 0);
  assert.equal(result.totalLots, 100);
  assert.ok(result.recoveryPercent < 0);
});

test("0% recovery at the same purchase price cannot achieve BEP with finite funds", () => {
  for (const fee of [0, 0.15]) {
    assert.equal(calculateAverageDown({ ...input, buyFeePercent: fee, sellFeePercent: 0, target: { mode: "recovery", value: 0 } }).status, "impossible");
  }
  assert.equal(calculateAverageDown({ ...input, target: { mode: "average", value: 55 } }).status, "impossible");
});

test("0% recovery is feasible if planned purchase is below reference", () => {
  const result = calculateAverageDown({ ...input, buyPrice: 50, target: { mode: "recovery", value: 0 } });
  assert.equal(result.status, "ready");
  if (result.status === "ready") assert.ok(result.breakevenPrice <= 56);
});

test("invalid, nonfinite, negative, fractional lots and unsafe values never become results", () => {
  for (const override of [
    { lots: 0 }, { lots: -1 }, { lots: 1.5 }, { lots: Number.MAX_SAFE_INTEGER },
    { referencePrice: 0 }, { buyPrice: -2 }, { averagePrice: NaN }, { buyPrice: Infinity },
    { buyFeePercent: -1 }, { sellFeePercent: 100 }, { buyFeePercent: 100 },
    { averagePrice: 1e308 }, { referencePrice: 1e308 },
    { target: { mode: "average" as const, value: 0 } },
    { target: { mode: "recovery" as const, value: -1 } },
    { target: { mode: "recovery" as const, value: NaN } },
    { target: { mode: "average" as const, value: 56.08400000000001 } },
  ]) assert.equal(calculateAverageDown({ ...input, ...override }).status, "invalid", JSON.stringify(override));
});

test("whole lots are minimal across targets, fee rates and purchase prices; input unchanged", () => {
  const original = structuredClone(input);
  for (const lots of [1, 17, 100, 10000]) for (const buyPrice of [24, 50, 56]) for (const fee of [0, 0.15, 0.5]) for (const target of [5, 10, 20]) {
    const values = { ...input, lots, buyPrice, buyFeePercent: fee, target: { mode: "recovery" as const, value: target } };
    const result = calculateAverageDown(values);
    assert.equal(result.status, "ready");
    if (result.status !== "ready") continue;
    assert.ok(Number.isSafeInteger(result.additionalLots));
    assert.ok(result.averagePrice <= result.targetAverage, JSON.stringify(values));
    const previousLots = result.additionalLots - 1;
    const previousGross = previousLots * 100 * buyPrice;
    const previousAverage = (lots * 100 * 120 + previousGross + previousGross * fee / 100) / ((lots + previousLots) * 100);
    assert.ok(previousAverage > result.targetAverage, JSON.stringify(values));
  }
  assert.deepEqual(input, original);
});
