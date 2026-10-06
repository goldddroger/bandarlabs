import assert from "node:assert/strict";
import test from "node:test";
import { calculateHmetdBuyer, hmetdBuyerPriceRows } from "../lib/calculations/hmetd-buyer";
import type { HmetdBuyerInput } from "../types/hmetd-buyer";

const buva: HmetdBuyerInput = { rightsQuantity: 1000, rightsPrice: 100, subscriptionPrice: 250, referencePrice: 400, salePrice: null, bufferPercent: 10, buyFeePercent: 0, sellFeePercent: 0, redemptionFee: 0 };
test("BUVA: biaya beli hak + tebus, buffer dan titik impas tanpa saham lama", () => {
  const { data } = calculateHmetdBuyer(buva); assert.ok(data);
  assert.equal(data.rightsCost, 100000); assert.equal(data.subscriptionCash, 250000); assert.equal(data.totalCost, 350000);
  assert.equal(data.effectiveCost, 350); assert.equal(data.breakEvenStockPrice, 350);
  assert.equal(data.maxBufferedRightsPrice, 110); assert.equal(data.maxBreakEvenRightsPrice, 150);
  assert.equal(data.profitLoss, 50000); assert.equal(data.status, "cheap");
});
test("LAPD: harga tebus indikatif 50 dapat dianalisis tanpa menebak rasio final", () => {
  const { data } = calculateHmetdBuyer({ ...buva, subscriptionPrice: 50, rightsPrice: 20, referencePrice: 80 }); assert.ok(data);
  assert.equal(data.effectiveCost, 70); assert.equal(data.maxBufferedRightsPrice, 22); assert.equal(data.maxBreakEvenRightsPrice, 30);
  assert.equal(data.profitLoss, 10000); assert.equal(data.status, "cheap");
});
test("klasifikasi murah, diskon tipis, setara, mahal dan batas buffer", () => {
  for (const [rightsPrice, status] of [[110, "cheap"], [120, "thin"], [150, "equal"], [160, "expensive"]] as const) assert.equal(calculateHmetdBuyer({ ...buva, rightsPrice }).data?.status, status);
  assert.equal(calculateHmetdBuyer({ ...buva, rightsPrice: 150, bufferPercent: 0 }).data?.status, "equal");
});
test("fee beli, fee jual dan biaya tetap diamortisasi tanpa dihitung dua kali", () => {
  const { data } = calculateHmetdBuyer({ ...buva, buyFeePercent: 0.15, sellFeePercent: 0.25, redemptionFee: 10000 }); assert.ok(data);
  assert.equal(data.buyFee, 150); assert.equal(data.totalCost, 360150); assert.equal(data.effectiveCost, 360.15);
  assert.equal(data.netSaleProceeds, 399000); assert.equal(data.profitLoss, 38850);
  assert.ok(Math.abs(data.maxBreakEvenRightsPrice - (399 - 260) / 1.0015) < 1e-9);
  const max = calculateHmetdBuyer({ ...buva, rightsPrice: data.maxBreakEvenRightsPrice, buyFeePercent: 0.15, sellFeePercent: 0.25, redemptionFee: 10000 }).data;
  assert.ok(max); assert.ok(Math.abs(max.profitLoss) < 1e-8); assert.equal(max.status, "equal");
});
test("batas negatif bukan harga nol layak; even rights gratis bisa merugi", () => {
  const { data } = calculateHmetdBuyer({ ...buva, rightsPrice: 0, referencePrice: 200 }); assert.ok(data);
  assert.equal(data.maxBreakEvenRightsPrice, -50); assert.equal(data.status, "expensive"); assert.equal(data.profitLoss, -50000);
});
test("asumsi jual nol berbeda dari kosong dan klasifikasi tetap memakai acuan", () => {
  const { data } = calculateHmetdBuyer({ ...buva, salePrice: 0 }); assert.ok(data);
  assert.equal(data.profitLoss, -350000); assert.equal(data.returnPercent, -100); assert.equal(data.status, "cheap");
});
test("modal nol tidak menghasilkan return NaN atau Infinity", () => {
  const { data } = calculateHmetdBuyer({ ...buva, rightsPrice: 0, subscriptionPrice: 0 }); assert.ok(data); assert.equal(data.returnPercent, null);
  for (const value of Object.values(data)) if (typeof value === "number") assert.ok(Number.isFinite(value));
});
test("validasi input, persen dan overflow", () => {
  for (const change of [{ rightsQuantity: 0 }, { rightsQuantity: 1.5 }, { rightsPrice: -1 }, { rightsPrice: NaN }, { referencePrice: 0 }, { sellFeePercent: 100 }, { buyFeePercent: 100 }, { bufferPercent: 100 }, { subscriptionPrice: Infinity }, { redemptionFee: -1 }, { rightsQuantity: Number.MAX_SAFE_INTEGER }]) assert.equal(calculateHmetdBuyer({ ...buva, ...change }).data, null);
});
test("matriks diurutkan, tidak menampilkan harga negatif, dan input invalid tidak menghasilkan baris", () => {
  const rows = hmetdBuyerPriceRows(buva); assert.ok(rows.length > 0);
  assert.ok(rows.some((row) => row.price === 100 && row.calculation.status === "cheap"));
  assert.ok(rows.some((row) => row.price === 150 && row.calculation.status === "equal"));
  assert.deepEqual(rows.map((row) => row.price), [...rows.map((row) => row.price)].sort((a, b) => a - b));
  assert.ok(hmetdBuyerPriceRows({ ...buva, referencePrice: 200 }).every((row) => row.price >= 0));
  assert.deepEqual(hmetdBuyerPriceRows({ ...buva, rightsPrice: NaN }), []);
});
