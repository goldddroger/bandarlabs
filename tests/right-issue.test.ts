import assert from "node:assert/strict";
import test from "node:test";
import { calculateRightIssue } from "../lib/calculations/right-issue";
import { formatCurrency, formatSimulationInput, parseSimulationNumber } from "../lib/calculations/right-issue-format";
import { permissionForPath } from "../lib/feature-permissions";
import { calculateRightIssueScenarios, calculateRightIssuePriceMatrix } from "../lib/calculations/right-issue-scenarios";
import { getRightIssueInsights } from "../lib/calculations/right-issue-insights";
import type { RightIssueInput } from "../types/right-issue";

const demo: RightIssueInput = { ownedShares: 3_000_000, averageBuy: 27, cumPrice: 30, ratioOld: 5, ratioNew: 2, subscriptionPrice: 50, marketRightsPrice: 3 };

test("contoh WMPP: entitlement, modal, average, TERP, dan dilusi", () => {
  const result = calculateRightIssue(demo);
  assert.ok(result.ok);
  assert.equal(result.data.rightsEntitlement, 1_200_000);
  assert.equal(result.data.cashRequired, 60_000_000);
  assert.equal(result.data.originalInvestment, 81_000_000);
  assert.equal(result.data.sharesAfterExercise, 4_200_000);
  assert.ok(Math.abs(result.data.newAverage - 33.57142857142857) < 1e-9);
  assert.ok(Math.abs(result.data.terp - 35.714285714285715) < 1e-9);
  assert.ok(Math.abs(result.data.dilution - 28.57142857142857) < 1e-9);
  assert.equal(result.data.theoreticalRightsValue, 0);
  assert.equal(result.data.outOfTheMoney, true);
});

test("nilai per HMETD menggunakan satu saham baru, bukan nilai per saham lama", () => {
  const result = calculateRightIssue({ ...demo, cumPrice: 100, subscriptionPrice: 50 });
  assert.ok(result.ok);
  assert.ok(Math.abs(result.data.theoreticalRightsValue - 35.714285714285715) < 1e-9);
  assert.equal(result.data.outOfTheMoney, false);
});

test("hak pecahan dibulatkan turun sebelum menghitung dana dan average", () => {
  const result = calculateRightIssue({ ...demo, ownedShares: 7 });
  assert.ok(result.ok);
  assert.equal(result.data.rightsEntitlement, 2);
  assert.equal(result.data.cashRequired, 100);
  assert.equal(result.data.sharesAfterExercise, 9);
  assert.equal(result.data.hasFractionalRights, true);
});

test("hak utuh pada rasio 100:29 tidak kehilangan satu saham karena floating point", () => {
  const result = calculateRightIssue({ ...demo, ownedShares: 100, ratioOld: 100, ratioNew: 29 });
  assert.ok(result.ok);
  assert.equal(result.data.rightsEntitlement, 29);
  assert.equal(result.data.hasFractionalRights, false);
});

test("nilai nol pada harga atau rasio HMETD tetap finite", () => {
  for (const change of [{ ratioNew: 0 }, { subscriptionPrice: 0 }, { cumPrice: 0 }, { marketRightsPrice: 0 }]) {
    const result = calculateRightIssue({ ...demo, ...change });
    assert.ok(result.ok);
    for (const value of Object.values(result.data)) if (typeof value === "number") assert.ok(Number.isFinite(value));
  }
});

test("input negatif, kosong, nol saham, overflow, dan pembagi nol ditolak", () => {
  for (const change of [{ ownedShares: 0 }, { ownedShares: 1.5 }, { ratioOld: 0 }, { ratioNew: -1 }, { averageBuy: NaN }, { cumPrice: Infinity }, { ownedShares: Number.MAX_SAFE_INTEGER }, { marketRightsPrice: -1 }]) {
    const result = calculateRightIssue({ ...demo, ...change });
    assert.equal(result.ok, false);
    assert.equal(result.data, null);
    assert.ok(result.errors.length > 0);
  }
});

test("format Indonesia mempertahankan pemisah ribuan dan desimal", () => {
  assert.equal(formatSimulationInput("3000000", true), "3.000.000");
  assert.equal(formatSimulationInput("33,57"), "33,57");
  assert.equal(parseSimulationNumber("3.000.000"), 3_000_000);
  assert.equal(parseSimulationNumber("33,57"), 33.57);
  assert.ok(Number.isNaN(parseSimulationNumber("")));
  assert.equal(formatCurrency(-1.2, 2), "-Rp1,2");
});

test("simulator tools mengikuti permission kalkulator; route emiten mengikuti stocks", () => {
  assert.equal(permissionForPath("/tools/right-issue-simulator"), "calculator");
  assert.equal(permissionForPath("/stocks/WMPP/right-issue"), "stocks");
});

test("empat strategi di harga post-ex 40: modal, hasil akhir, P/L, dan break-even", () => {
  const result = calculateRightIssueScenarios(demo, { postExPrice: 40, parentSalePrice: 30 });
  assert.ok(result.ok);
  const [exercise, sell, expire, exit] = result.data.scenarios;
  assert.equal(exercise.endingValue, 168_000_000);
  assert.equal(exercise.profitLoss, 27_000_000);
  assert.equal(exercise.netEconomicValue, 108_000_000);
  assert.equal(exercise.dilution, 0);
  assert.equal(exercise.breakEvenPrice, result.data.base.newAverage);
  assert.equal(sell.rightsProceeds, 3_600_000);
  assert.equal(sell.economicCost, 77_400_000);
  assert.equal(sell.breakEvenPrice, 25.8);
  assert.equal(sell.endingValue, 123_600_000);
  assert.equal(sell.profitLoss, 42_600_000);
  assert.equal(expire.endingValue, 120_000_000);
  assert.equal(expire.profitLoss, 39_000_000);
  assert.equal(expire.opportunityCost, 3_600_000);
  assert.equal(exit.profitLoss, 9_000_000);
  assert.equal(exit.sharesAfter, 0);
  assert.equal(exit.rightsReceived, 0);
  assert.equal(exit.breakEvenPrice, null);
});

test("strategi exit tidak mengikuti harga post-ex; asumsi kosong mengikuti TERP dan cum-price", () => {
  const defaults = calculateRightIssueScenarios(demo, { postExPrice: null, parentSalePrice: null });
  assert.ok(defaults.ok);
  assert.equal(defaults.data.postExPrice, defaults.data.base.terp);
  assert.equal(defaults.data.parentSalePrice, 30);
  for (const price of [0, 25, 100]) {
    const result = calculateRightIssueScenarios(demo, { postExPrice: price, parentSalePrice: 30 });
    assert.ok(result.ok);
    assert.equal(result.data.scenarios[3].profitLoss, 9_000_000);
  }
});

test("harga HMETD kosong berbeda dari nol; opportunity cost tidak dihitung dua kali", () => {
  const missing = calculateRightIssueScenarios({ ...demo, marketRightsPrice: null }, { postExPrice: 20, parentSalePrice: 30 });
  assert.ok(missing.ok);
  assert.equal(missing.data.scenarios[1].profitLoss, null);
  assert.equal(missing.data.scenarios[2].opportunityCost, null);
  assert.equal(missing.data.scenarios[2].profitLoss, -21_000_000);
  const zero = calculateRightIssueScenarios({ ...demo, marketRightsPrice: 0 }, { postExPrice: 20, parentSalePrice: 30 });
  assert.ok(zero.ok);
  assert.equal(zero.data.scenarios[1].profitLoss, -21_000_000);
});

test("modal awal nol tetap menampilkan P/L namun persentase tanpa pembagi nol", () => {
  const result = calculateRightIssueScenarios({ ...demo, averageBuy: 0 }, { postExPrice: 0, parentSalePrice: 0 });
  assert.ok(result.ok);
  assert.equal(result.data.scenarios[0].returnPercent, -100);
  assert.equal(result.data.scenarios[1].returnPercent, null);
  assert.equal(result.data.scenarios[1].breakEvenPrice, -1.2);
  assert.equal(result.data.scenarios[2].returnPercent, null);
});

test("harga skenario negatif, NaN, Infinity, atau hasil overflow ditolak", () => {
  for (const price of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.equal(calculateRightIssueScenarios(demo, { postExPrice: price, parentSalePrice: null }).ok, false);
    assert.equal(calculateRightIssueScenarios(demo, { postExPrice: null, parentSalePrice: price }).ok, false);
  }
});

test("rasio nol dan fractional entitlement konsisten di semua strategi", () => {
  const zero = calculateRightIssueScenarios({ ...demo, ratioNew: 0, marketRightsPrice: null }, { postExPrice: 30, parentSalePrice: 30 });
  assert.ok(zero.ok);
  assert.ok(zero.data.scenarios.every((row) => row.profitLoss === 9_000_000));
  const fractional = calculateRightIssueScenarios({ ...demo, ownedShares: 7 }, { postExPrice: 40, parentSalePrice: 30 });
  assert.ok(fractional.ok);
  assert.equal(fractional.data.scenarios[0].cashRequired, 100);
  assert.ok(Math.abs(fractional.data.scenarios[0].dilution - 8.163265306122447) < 1e-9);
  assert.equal(fractional.data.scenarios[1].rightsProceeds, 6);
});

test("matriks menghasilkan 20-60 interval 5; nilai tertinggi dinormalisasi modal tambahan", () => {
  const result = calculateRightIssuePriceMatrix(demo, { low: 20, high: 60, step: 5, parentSalePrice: 30 });
  assert.ok(result.ok);
  assert.deepEqual(result.data.map((row) => row.price), [20, 25, 30, 35, 40, 45, 50, 55, 60]);
  assert.deepEqual(result.data[0].highestValueStrategies, ["exit"]);
  assert.deepEqual(result.data[4].highestValueStrategies, ["sell-rights"]);
  assert.deepEqual(result.data[8].highestValueStrategies, ["exercise"]);
  assert.ok(result.data.every((row) => row.scenarios[3].profitLoss === 9_000_000));
});

test("nilai seri ditandai bersama; harga rights kosong tidak masuk ranking strategi B", () => {
  const tie = calculateRightIssuePriceMatrix(demo, { low: 53, high: 53, step: 1, parentSalePrice: 30 });
  assert.ok(tie.ok);
  assert.deepEqual(tie.data[0].highestValueStrategies, ["exercise", "sell-rights"]);
  const missing = calculateRightIssuePriceMatrix({ ...demo, marketRightsPrice: null }, { low: 40, high: 40, step: 1, parentSalePrice: 30 });
  assert.ok(missing.ok);
  assert.deepEqual(missing.data[0].highestValueStrategies, ["expire"]);
  assert.equal(missing.data[0].scenarios[1].returnPercent, null);
});

test("matriks desimal dan titik nol konsisten tanpa membulatkan hak atau harga salah", () => {
  const result = calculateRightIssuePriceMatrix(demo, { low: 0, high: 0.3, step: 0.1, parentSalePrice: 0 });
  assert.ok(result.ok);
  assert.deepEqual(result.data.map((row) => row.price), [0, 0.1, 0.2, 0.3]);
  assert.equal(result.data[0].scenarios[0].returnPercent, -100);
});

test("matriks menolak rentang terbalik, interval nol, NaN, overflow, dan jumlah baris besar", () => {
  for (const range of [{ low: 60, high: 20, step: 5 }, { low: 0, high: 60, step: 0 }, { low: NaN, high: 60, step: 5 }, { low: 0, high: 60, step: 0.00001 }, { low: 0, high: 10000, step: 1 }, { low: Number.MAX_SAFE_INTEGER, high: Number.MAX_SAFE_INTEGER, step: 1 }]) {
    const result = calculateRightIssuePriceMatrix(demo, { ...range, parentSalePrice: null });
    assert.equal(result.ok, false);
    assert.equal(result.data, null);
  }
});

test("insight menjelaskan OTM, dilusi, titik setara, dan kedaluwarsa tanpa rekomendasi", () => {
  const result = calculateRightIssueScenarios(demo, { postExPrice: 40, parentSalePrice: 30 });
  assert.ok(result.ok);
  const insights = getRightIssueInsights(demo, result.data);
  assert.ok(insights.some((item) => item.id === "out-of-money"));
  assert.ok(insights.some((item) => item.id === "dilution"));
  assert.match(insights.find((item) => item.id === "crossover")!.text, /Rp53/);
  assert.ok(insights.some((item) => item.id === "expiry"));
  assert.doesNotMatch(JSON.stringify(insights), /BUY|SELL|BEST DECISION|NaN|Infinity|undefined/);
});

test("insight untuk ITM, harga rights kosong, dan rasio nol tetap sesuai input", () => {
  for (const [input, id] of [[{ ...demo, subscriptionPrice: 20 }, "intrinsic"], [{ ...demo, marketRightsPrice: null }, "missing-price"], [{ ...demo, ratioNew: 0 }, "no-rights"]] as const) {
    const result = calculateRightIssueScenarios(input, { postExPrice: null, parentSalePrice: null });
    assert.ok(result.ok);
    assert.ok(getRightIssueInsights(input, result.data).some((item) => item.id === id));
  }
});
