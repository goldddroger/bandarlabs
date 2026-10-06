import { ArrowRightLeft, Banknote, LogOut, TimerOff } from "lucide-react";
import { rightIssueStrategies } from "@/lib/calculations/right-issue-scenarios";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/calculations/right-issue-format";
import type { RightIssueScenario } from "@/types/right-issue";

export function scenarioTone(value: number | null) {
  return value === null || value === 0 ? "text-gray-600" : value > 0 ? "text-emerald-700" : "text-red-700";
}

export function scenarioMoney(value: number | null) {
  return value === null ? "-" : `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatCurrency(Math.abs(value), 2)}`;
}

export function ScenarioCard({ scenario, index }: { scenario: RightIssueScenario | null; index: number }) {
  const strategy = rightIssueStrategies[index];
  const Icon = [Banknote, ArrowRightLeft, TimerOff, LogOut][index];
  const money = (value: number | null | undefined) => value == null ? "-" : formatCurrency(value, 2);
  const metrics = [
    ["Tambahan modal", money(scenario?.cashRequired)],
    ["Saham setelah aksi", scenario ? formatNumber(scenario.sharesAfter) : "-"],
    ["HMETD diterima", scenario ? formatNumber(scenario.rightsReceived) : "-"],
    ["Hasil jual HMETD", money(scenario?.rightsProceeds)],
    [index === 3 ? "Hasil jual induk" : "Break-even induk", money(index === 3 ? scenario?.endingValue : scenario?.breakEvenPrice)],
    [index === 2 ? "Nilai rights tidak direalisasi" : "Dilusi kepemilikan", index === 2 ? money(scenario?.opportunityCost) : scenario ? formatPercentage(scenario.dilution) : "-"],
  ];
  return <article aria-label={strategy.label} className="flex min-w-0 flex-col rounded-md border border-gray-200 bg-white p-4">
    <div className="flex items-start gap-2"><span className="flex size-7 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-gray-600">{strategy.code}</span><h3 className="min-h-10 text-sm font-semibold leading-5 text-gray-950">{strategy.label}</h3><Icon className="ml-auto size-4 shrink-0 text-gray-400" /></div>
    <dl className="mt-3 divide-y divide-gray-100">{metrics.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-2 text-xs"><dt className="text-gray-500">{label}</dt><dd className="break-words font-semibold tabular-nums text-gray-950">{value}</dd></div>)}</dl>
    <div className="mt-auto border-t border-gray-200 pt-3"><p className="text-xs text-gray-500">{index === 3 ? "Realized P/L sebelum fee" : "Simulated P/L sebelum fee"}</p><p className={`mt-1 break-words text-lg font-semibold tabular-nums ${scenarioTone(scenario?.profitLoss ?? null)}`}>{scenarioMoney(scenario?.profitLoss ?? null)}</p><p className="mt-1 text-xs text-gray-500">{scenario?.returnPercent != null ? `${formatPercentage(scenario.returnPercent)} dari modal strategi` : "Persentase belum tersedia"}</p><p className="mt-1 min-h-5 text-xs text-amber-800">{index === 2 && scenario ? `Rights expired · dilusi ${formatPercentage(scenario.dilution)}` : null}</p></div>
  </article>;
}
