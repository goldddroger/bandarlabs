export type AverageDownInput = {
  lots: number;
  averagePrice: number;
  referencePrice: number;
  buyPrice: number;
  buyFeePercent: number;
  sellFeePercent: number;
  target: { mode: "recovery" | "average"; value: number };
};

type AverageDownValues = {
  additionalLots: number;
  grossBuy: number;
  buyFee: number;
  additionalCapital: number;
  capitalIncreasePercent: number;
  totalCapital: number;
  totalLots: number;
  averagePrice: number;
  breakevenPrice: number;
  recoveryPercent: number;
  currentBreakevenPrice: number;
  targetAverage: number;
};

export type AverageDownResult =
  | { status: "invalid" | "impossible"; message: string }
  | ({ status: "ready" | "achieved" } & AverageDownValues);

export function calculateAverageDown(input: AverageDownInput): AverageDownResult {
  const { lots, averagePrice, referencePrice, buyPrice, buyFeePercent, sellFeePercent, target } = input;
  const invalid = (message: string): AverageDownResult => ({ status: "invalid", message });
  if (![lots, averagePrice, referencePrice, buyPrice, buyFeePercent, sellFeePercent, target.value].every(Number.isFinite)) {
    return invalid("Lengkapi semua angka dengan nilai yang valid.");
  }
  if (!Number.isSafeInteger(lots) || lots <= 0 || !Number.isSafeInteger(lots * 100)) {
    return invalid("Jumlah lot posisi harus berupa bilangan bulat positif.");
  }
  if (averagePrice <= 0 || referencePrice <= 0 || buyPrice <= 0) {
    return invalid("Harga acuan dan harga beli tambahan harus lebih dari nol.");
  }
  if (buyFeePercent < 0 || sellFeePercent < 0 || buyFeePercent >= 100 || sellFeePercent >= 100) {
    return invalid("Fee harus di antara 0% dan kurang dari 100%.");
  }
  if ((target.mode === "recovery" && target.value < 0) || (target.mode === "average" && target.value <= 0)) {
    return invalid("Target kenaikan minimal 0%; target average harus lebih dari nol.");
  }

  const sellMultiplier = 1 - sellFeePercent / 100;
  const buyCost = buyPrice * (1 + buyFeePercent / 100);
  const targetAverage = target.mode === "recovery"
    ? referencePrice * (1 + target.value / 100) * sellMultiplier
    : target.value;
  const existingCapital = lots * 100 * averagePrice;
  if (![targetAverage, existingCapital, buyCost].every((value) => Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER)) {
    return invalid("Nilai perhitungan terlalu besar. Kurangi nominal input.");
  }

  let additionalLots = 0;
  if (averagePrice > targetAverage) {
    if (buyCost >= targetAverage) {
      return { status: "impossible", message: "Target tidak dapat dicapai dengan dana terbatas: harga beli tambahan setelah fee harus di bawah target average. Naikkan target atau turunkan harga beli tambahan." };
    }
    // Solve the fee-inclusive weighted average, then round up to whole 100-share lots.
    additionalLots = Math.ceil(lots * (averagePrice - targetAverage) / (targetAverage - buyCost));
    const resultingAverage = (added: number) => (existingCapital + added * 100 * buyCost) / ((lots + added) * 100);
    if (resultingAverage(additionalLots) > targetAverage) additionalLots++;
    if (additionalLots > 0 && resultingAverage(additionalLots - 1) <= targetAverage) additionalLots--;
  }
  const totalLots = lots + additionalLots;
  const grossBuy = additionalLots * 100 * buyPrice;
  const buyFee = grossBuy * buyFeePercent / 100;
  const additionalCapital = grossBuy + buyFee;
  const totalCapital = existingCapital + additionalCapital;
  const newAverage = totalCapital / (totalLots * 100);
  const breakevenPrice = newAverage / sellMultiplier;
  const recoveryPercent = (breakevenPrice / referencePrice - 1) * 100;
  const capitalIncreasePercent = additionalCapital / existingCapital * 100;
  const currentBreakevenPrice = averagePrice / sellMultiplier;
  if (!Number.isSafeInteger(totalLots * 100) || ![
    grossBuy, buyFee, additionalCapital, totalCapital, newAverage, breakevenPrice,
    recoveryPercent, capitalIncreasePercent, currentBreakevenPrice,
  ].every((value) => Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER)) {
    return invalid("Hasil melebihi batas perhitungan aman. Sesuaikan target atau nominal input.");
  }
  return {
    status: additionalLots === 0 ? "achieved" : "ready",
    additionalLots, grossBuy, buyFee, additionalCapital, capitalIncreasePercent,
    totalCapital, totalLots, averagePrice: newAverage, breakevenPrice, recoveryPercent,
    currentBreakevenPrice, targetAverage,
  };
}
