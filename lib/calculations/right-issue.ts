import type { RightIssueCalculation, RightIssueInput } from "@/types/right-issue";

type CalculationResult = { ok: true; data: RightIssueCalculation; errors: string[] } | { ok: false; data: null; errors: string[] };

export function calculateRightIssue(input: RightIssueInput): CalculationResult {
  const errors: string[] = [];
  const labels: Record<keyof RightIssueInput, string> = {
    ownedShares: "Jumlah saham", averageBuy: "Average buy", cumPrice: "Harga cum-right", ratioOld: "Rasio saham lama", ratioNew: "Rasio HMETD", subscriptionPrice: "Harga pelaksanaan", marketRightsPrice: "Harga HMETD di pasar",
  };
  for (const key of Object.keys(labels) as Array<keyof RightIssueInput>) {
    const value = input[key];
    if (key === "marketRightsPrice" && value === null) continue;
    if (value === null || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) errors.push(`${labels[key]} harus berupa angka nonnegatif dalam batas perhitungan.`);
  }
  if (!Number.isSafeInteger(input.ownedShares) || input.ownedShares <= 0) errors.push("Jumlah saham harus bilangan bulat lebih dari nol.");
  if (input.ratioOld <= 0) errors.push("Rasio saham lama harus lebih dari nol.");
  if (errors.length) return { ok: false, data: null, errors };

  const rightsRatio = input.ratioNew / input.ratioOld;
  const rawEntitlement = (input.ownedShares * input.ratioNew) / input.ratioOld;
  const rightsEntitlement = Math.floor(rawEntitlement);
  const cashRequired = rightsEntitlement * input.subscriptionPrice;
  const originalInvestment = input.ownedShares * input.averageBuy;
  const newTotalInvestment = originalInvestment + cashRequired;
  const sharesAfterExercise = input.ownedShares + rightsEntitlement;
  const newAverage = newTotalInvestment / sharesAfterExercise;
  const terp = (input.cumPrice + rightsRatio * input.subscriptionPrice) / (1 + rightsRatio);
  const theoreticalRightsValue = Math.max(terp - input.subscriptionPrice, 0);
  const ownershipRetained = 100 / (1 + rightsRatio);
  const dilution = 100 - ownershipRetained;
  const numbers = [rightsRatio, rawEntitlement, rightsEntitlement, cashRequired, originalInvestment, newTotalInvestment, sharesAfterExercise, newAverage, terp, theoreticalRightsValue, ownershipRetained, dilution];
  if (numbers.some((value) => !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)) return { ok: false, data: null, errors: ["Nilai simulasi terlalu besar. Kurangi jumlah saham, harga, atau rasio agar perhitungan tetap presisi."] };
  return {
    ok: true, errors: [],
    data: { rightsRatio, rawEntitlement, rightsEntitlement, hasFractionalRights: rawEntitlement !== rightsEntitlement, cashRequired, originalInvestment, newTotalInvestment, sharesAfterExercise, newAverage, terp, theoreticalRightsValue, ownershipRetained, dilution, outOfTheMoney: input.subscriptionPrice > terp },
  };
}
