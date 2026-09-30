import assert from "node:assert/strict";
import test from "node:test";
import { calculateCapitalGain, formatLotInput } from "../lib/capital-gain";

test("memformat jumlah lot dengan pemisah ribuan Indonesia", () => {
  assert.equal(formatLotInput("1000"), "1.000");
  assert.equal(formatLotInput("10000"), "10.000");
  assert.equal(formatLotInput("1.000.000"), "1.000.000");
  assert.equal(formatLotInput("00025"), "25");
});

test("menghitung capital gain setelah fee beli dan jual", () => {
  const result = calculateCapitalGain({
    buyPrice: 1_000,
    sellPrice: 1_200,
    lots: 10,
    buyFeePercent: 0.15,
    sellFeePercent: 0.25,
  });

  assert.equal(result.shares, 1_000);
  assert.equal(result.grossBuy, 1_000_000);
  assert.equal(result.buyFee, 1_500);
  assert.equal(result.totalBuy, 1_001_500);
  assert.equal(result.grossSell, 1_200_000);
  assert.equal(result.sellFee, 3_000);
  assert.equal(result.netSell, 1_197_000);
  assert.equal(result.profitLoss, 195_500);
  assert.ok(Math.abs(result.profitLossPercent - 19.520718921617576) < 1e-9);
});

test("menghitung loss dan break-even dengan benar", () => {
  const result = calculateCapitalGain({
    buyPrice: 1_000,
    sellPrice: 900,
    lots: 1,
    buyFeePercent: 0.15,
    sellFeePercent: 0.25,
  });

  assert.equal(result.profitLoss, -10_375);
  assert.ok(result.profitLossPercent < 0);
  assert.ok(Math.abs(result.breakEvenPrice - 1004.0100250626566) < 1e-9);
});

test("input negatif tidak menghasilkan nilai transaksi negatif", () => {
  const result = calculateCapitalGain({
    buyPrice: -1,
    sellPrice: -1,
    lots: -1,
    buyFeePercent: -1,
    sellFeePercent: -1,
  });

  assert.deepEqual(result, {
    shares: 0,
    grossBuy: 0,
    buyFee: 0,
    totalBuy: 0,
    grossSell: 0,
    sellFee: 0,
    netSell: 0,
    profitLoss: 0,
    profitLossPercent: 0,
    breakEvenPrice: 0,
  });
});
