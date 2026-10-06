import { calculateRightIssue } from "./right-issue";
import type { RightIssueInput, RightIssueMatrixRow, RightIssueScenario, RightIssueScenarioCalculation, RightIssueStrategy } from "@/types/right-issue";

type Result<T> = { ok: true; data: T; errors: string[] } | { ok: false; data: null; errors: string[] };
type Assumptions = { postExPrice: number | null; parentSalePrice: number | null };

export const rightIssueStrategies: Array<{ id: RightIssueStrategy; code: string; label: string }> = [
  { id: "exercise", code: "A", label: "Tebus Seluruh HMETD" },
  { id: "sell-rights", code: "B", label: "Tidak Tebus, Jual HMETD" },
  { id: "expire", code: "C", label: "Biarkan HMETD Kedaluwarsa" },
  { id: "exit", code: "D", label: "Jual Induk Sebelum Entitlement" },
];

function validPrice(value: number | null) {
  return value === null || (Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER);
}

export function calculateRightIssueScenarios(input: RightIssueInput, assumptions: Assumptions): Result<RightIssueScenarioCalculation> {
  const result = calculateRightIssue(input);
  if (!result.ok) return result;
  const errors: string[] = [];
  if (!validPrice(assumptions.postExPrice)) errors.push("Harga setelah ex-date harus berupa angka nonnegatif dalam batas perhitungan.");
  if (!validPrice(assumptions.parentSalePrice)) errors.push("Harga jual induk harus berupa angka nonnegatif dalam batas perhitungan.");
  if (errors.length) return { ok: false, data: null, errors };
  const base = result.data;
  const postExPrice = assumptions.postExPrice ?? base.terp;
  const parentSalePrice = assumptions.parentSalePrice ?? input.cumPrice;
  // Missing market rights price is unknown, not a zero-price sale.
  const rightsProceeds = base.rightsEntitlement === 0 ? 0 : input.marketRightsPrice === null ? null : base.rightsEntitlement * input.marketRightsPrice;
  const parentValue = input.ownedShares * postExPrice;
  const exerciseDilution = base.hasFractionalRights
    ? Math.max(0, 100 - (100 * (base.sharesAfterExercise / input.ownedShares)) / (1 + base.rightsRatio))
    : 0;

  function scenario(id: RightIssueStrategy, sharesAfter: number, cashRequired: number, proceeds: number | null, endingValue: number | null, dilution: number, opportunityCost: number | null): RightIssueScenario {
    const capital = base.originalInvestment + cashRequired;
    const economicCost = proceeds === null ? null : capital - proceeds;
    const effectiveCost = sharesAfter > 0 && economicCost !== null ? economicCost / sharesAfter : null;
    const profitLoss = endingValue === null ? null : endingValue - capital;
    return {
      id, sharesAfter, cashRequired, rightsProceeds: proceeds,
      rightsReceived: id === "exit" ? 0 : base.rightsEntitlement,
      economicCost, effectiveCost, endingValue, profitLoss,
      // Compare strategies on the same original capital, net of extra subscription cash.
      netEconomicValue: endingValue === null ? null : endingValue - cashRequired,
      returnPercent: capital > 0 && profitLoss !== null ? (profitLoss / capital) * 100 : null,
      breakEvenPrice: effectiveCost, dilution, opportunityCost,
    };
  }

  const scenarios = [
    scenario("exercise", base.sharesAfterExercise, base.cashRequired, 0, base.sharesAfterExercise * postExPrice, exerciseDilution, 0),
    scenario("sell-rights", input.ownedShares, 0, rightsProceeds, rightsProceeds === null ? null : parentValue + rightsProceeds, base.dilution, 0),
    scenario("expire", input.ownedShares, 0, 0, parentValue, base.dilution, rightsProceeds),
    scenario("exit", 0, 0, 0, input.ownedShares * parentSalePrice, 0, 0),
  ];
  if (scenarios.some((item) => Object.values(item).some((value) => typeof value === "number" && (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)))) {
    return { ok: false, data: null, errors: ["Nilai skenario terlalu besar. Kurangi jumlah saham, harga, atau rasio."] };
  }
  return { ok: true, data: { base, postExPrice, parentSalePrice, scenarios }, errors: [] };
}

export function calculateRightIssuePriceMatrix(input: RightIssueInput, range: { low: number; high: number; step: number; parentSalePrice: number | null }): Result<RightIssueMatrixRow[]> {
  if (![range.low, range.high, range.step].every((value) => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER)) return { ok: false, data: null, errors: ["Rentang harga harus berupa angka nonnegatif dalam batas perhitungan."] };
  if (range.high < range.low) return { ok: false, data: null, errors: ["Harga tertinggi tidak boleh lebih kecil dari harga terendah."] };
  if (range.step < 0.0001) return { ok: false, data: null, errors: ["Interval harga minimal 0,0001 dan harus lebih dari nol."] };
  const intervals = (range.high - range.low) / range.step;
  const count = Math.floor(intervals + Math.min(1e-8, Math.abs(intervals) * Number.EPSILON * 8)) + 1;
  if (!Number.isSafeInteger(count) || count > 201) return { ok: false, data: null, errors: ["Maksimal 201 baris harga. Perbesar interval atau perkecil rentang."] };
  const rows: RightIssueMatrixRow[] = [];
  for (let index = 0; index < count; index++) {
    const price = Math.min(range.high, Number((range.low + index * range.step).toFixed(4)));
    const result = calculateRightIssueScenarios(input, { postExPrice: price, parentSalePrice: range.parentSalePrice });
    if (!result.ok) return result;
    const values = result.data.scenarios.flatMap((item) => item.netEconomicValue === null ? [] : [item.netEconomicValue]);
    const highest = Math.max(...values);
    const tolerance = Math.max(1e-6, Math.abs(highest) * Number.EPSILON * 8);
    rows.push({ price, scenarios: result.data.scenarios, highestValueStrategies: result.data.scenarios.filter((item) => item.netEconomicValue !== null && Math.abs(item.netEconomicValue - highest) <= tolerance).map((item) => item.id) });
  }
  return { ok: true, data: rows, errors: [] };
}
