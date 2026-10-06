import type { HmetdBuyerCalculation, HmetdBuyerDraft, HmetdBuyerInput, HmetdBuyerStatus } from "@/types/hmetd-buyer";

export const hmetdBuyerStatusLabels: Record<HmetdBuyerStatus, string> = {
  cheap: "Murah relatif acuan", thin: "Diskon tipis", equal: "Setara acuan", expensive: "Mahal relatif acuan",
};
export function emptyHmetdBuyerDraft(): HmetdBuyerDraft {
  return { rightsQuantity: "", referencePrice: "", salePrice: "", bufferPercent: "10", buyFeePercent: "0", sellFeePercent: "0", redemptionFee: "0" };
}

export function calculateHmetdBuyer(input: HmetdBuyerInput): { data: HmetdBuyerCalculation | null; errors: string[] } {
  const labels: Record<keyof HmetdBuyerInput, string> = {
    rightsQuantity: "Jumlah HMETD", rightsPrice: "Harga beli HMETD", subscriptionPrice: "Harga pelaksanaan", referencePrice: "Harga saham acuan", salePrice: "Asumsi harga jual", bufferPercent: "Buffer diskon", buyFeePercent: "Fee beli HMETD", sellFeePercent: "Fee jual saham", redemptionFee: "Biaya penebusan tetap",
  };
  const errors: string[] = [];
  for (const key of Object.keys(labels) as Array<keyof HmetdBuyerInput>) {
    const value = input[key];
    if (key === "salePrice" && value === null) continue;
    if (value === null || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) errors.push(`${labels[key]} harus angka nonnegatif dalam batas perhitungan.`);
  }
  if (!Number.isSafeInteger(input.rightsQuantity) || input.rightsQuantity <= 0) errors.push("Jumlah HMETD harus bilangan bulat lebih dari nol.");
  if (input.referencePrice <= 0) errors.push("Harga saham acuan harus lebih dari nol.");
  for (const key of ["bufferPercent", "buyFeePercent", "sellFeePercent"] as const) if (input[key] >= 100) errors.push(`${labels[key]} harus kurang dari 100%.`);
  if (errors.length) return { data: null, errors };

  // The buyer already owns the purchased rights; the old-share entitlement ratio is not applied again.
  const rightsCost = input.rightsQuantity * input.rightsPrice;
  const buyFee = rightsCost * input.buyFeePercent / 100;
  const subscriptionCash = input.rightsQuantity * input.subscriptionPrice;
  const totalCost = rightsCost + buyFee + subscriptionCash + input.redemptionFee;
  const effectiveCost = totalCost / input.rightsQuantity;
  const saleMultiplier = 1 - input.sellFeePercent / 100;
  const netReferencePrice = input.referencePrice * saleMultiplier;
  const fixedCostPerRight = input.subscriptionPrice + input.redemptionFee / input.rightsQuantity;
  const maxBreakEvenRightsPrice = (netReferencePrice - fixedCostPerRight) / (1 + input.buyFeePercent / 100);
  const maxBufferedRightsPrice = (netReferencePrice * (1 - input.bufferPercent / 100) - fixedCostPerRight) / (1 + input.buyFeePercent / 100);
  const breakEvenStockPrice = effectiveCost / saleMultiplier;
  const discountPercent = (1 - effectiveCost / netReferencePrice) * 100;
  const salePrice = input.salePrice ?? input.referencePrice;
  const netSaleProceeds = input.rightsQuantity * salePrice * saleMultiplier;
  const profitLoss = netSaleProceeds - totalCost;
  const returnPercent = totalCost > 0 ? profitLoss / totalCost * 100 : null;
  const tolerance = Math.max(effectiveCost, netReferencePrice, 1) * 1e-10;
  const status: HmetdBuyerStatus = Math.abs(effectiveCost - netReferencePrice) <= tolerance ? "equal" : effectiveCost > netReferencePrice ? "expensive" : effectiveCost <= netReferencePrice * (1 - input.bufferPercent / 100) + tolerance ? "cheap" : "thin";
  const data = { rightsCost, buyFee, subscriptionCash, totalCost, effectiveCost, breakEvenStockPrice, netReferencePrice, discountPercent, maxBreakEvenRightsPrice, maxBufferedRightsPrice, salePrice, netSaleProceeds, profitLoss, returnPercent, status };
  if (Object.values(data).some((value) => typeof value === "number" && (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER))) return { data: null, errors: ["Nilai terlalu besar untuk dihitung dengan aman. Kurangi jumlah atau harga."] };
  return { data, errors: [] };
}

export function hmetdBuyerPriceRows(input: HmetdBuyerInput) {
  const base = calculateHmetdBuyer(input).data;
  if (!base) return [];
  const prices = [0, input.rightsPrice * 0.5, input.rightsPrice, input.rightsPrice * 1.5, base.maxBufferedRightsPrice, base.maxBreakEvenRightsPrice].filter((price) => Number.isFinite(price) && price >= 0);
  return [...new Set(prices)].sort((a, b) => a - b).map((price) => ({ price, calculation: calculateHmetdBuyer({ ...input, rightsPrice: price }).data })).filter((row): row is { price: number; calculation: HmetdBuyerCalculation } => Boolean(row.calculation));
}
