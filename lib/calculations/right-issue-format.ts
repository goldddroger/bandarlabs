export function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: decimals }).format(value);
}

export function formatCurrency(value: number, decimals = 0) {
  return `Rp${formatNumber(value, decimals)}`;
}

export function formatPercentage(value: number) {
  return `${formatNumber(value, 2)}%`;
}

export function formatLots(shares: number) {
  return `${formatNumber(shares / 100, 2)} lot`;
}

export function parseSimulationNumber(value: string): number {
  if (!value.trim()) return NaN;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return /^-?\d+(?:\.\d*)?$/.test(normalized) ? Number(normalized) : NaN;
}

export function formatSimulationInput(value: string, integer = false) {
  const cleaned = value.replace(/[^\d,.-]/g, "");
  const negative = cleaned.startsWith("-");
  const parts = cleaned.replace(/[-.]/g, "").split(",");
  const whole = parts[0].replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${whole}${!integer && parts.length > 1 ? `,${parts[1].slice(0, 4)}` : ""}`;
}
