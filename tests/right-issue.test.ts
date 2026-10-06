import assert from "node:assert/strict";
import test from "node:test";
import { calculateRightIssue } from "../lib/calculations/right-issue";
import { formatSimulationInput, parseSimulationNumber } from "../lib/calculations/right-issue-format";
import { permissionForPath } from "../lib/feature-permissions";
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
});

test("simulator tools mengikuti permission kalkulator; route emiten mengikuti stocks", () => {
  assert.equal(permissionForPath("/tools/right-issue-simulator"), "calculator");
  assert.equal(permissionForPath("/stocks/WMPP/right-issue"), "stocks");
});
