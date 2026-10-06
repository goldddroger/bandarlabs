import { rightIssueStrategies } from "@/lib/calculations/right-issue-scenarios";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/calculations/right-issue-format";
import type { RightIssueScenarioCalculation } from "@/types/right-issue";
import { scenarioMoney, scenarioTone } from "./scenario-card";

export function ScenarioComparison({ calculation }: { calculation: RightIssueScenarioCalculation | null }) {
  const money = (value: number | null) => value === null ? "-" : formatCurrency(value, 2);
  return <section aria-label="Tabel perbandingan skenario" className="mt-6">
    <h3 className="text-base font-semibold text-gray-950">Dampak Ekonomi per Strategi</h3>
    <div role="region" aria-label="Tabel strategi dapat digulir" tabIndex={0} className="relative mt-3 max-w-full overflow-x-auto rounded-md border border-gray-200 focus-visible:outline-red-500">
      <table className="w-full min-w-[1080px] text-sm">
        <caption className="sr-only">Perbandingan empat strategi berdasarkan asumsi harga setelah ex-date; nilai akhir mencakup saham dan hasil jual.</caption>
        <thead className="bg-gray-50 text-xs text-gray-500"><tr>{["Strategi", "Dana tebus", "Saham setelah", "Hasil jual rights", "Economic cost / saham", "Nilai akhir saham + kas", "Profit / loss", "P/L %"].map((heading, index) => <th key={heading} scope="col" className={`border-b border-gray-200 px-4 py-3 font-medium ${index === 0 ? "sticky left-0 z-10 w-40 bg-gray-50 text-left sm:w-60" : "text-right"}`}>{heading}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{rightIssueStrategies.map((strategy, index) => {
          const row = calculation?.scenarios[index];
          return <tr key={strategy.id} data-strategy={strategy.id} className="bg-white">
            <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-4 text-left text-xs font-semibold text-gray-900"><span className="mr-2 text-gray-400">{strategy.code}</span>{strategy.label}</th>
            <td className="px-4 py-4 text-right tabular-nums">{row ? money(row.cashRequired) : "-"}</td>
            <td className="px-4 py-4 text-right tabular-nums">{row ? formatNumber(row.sharesAfter) : "-"}</td>
            <td className="px-4 py-4 text-right tabular-nums">{row ? money(row.rightsProceeds) : "-"}</td>
            <td className="px-4 py-4 text-right tabular-nums">{row ? money(row.effectiveCost) : "-"}</td>
            <td className="px-4 py-4 text-right tabular-nums">{row ? money(row.endingValue) : "-"}</td>
            <td className={`px-4 py-4 text-right font-semibold tabular-nums ${scenarioTone(row?.profitLoss ?? null)}`}>{scenarioMoney(row?.profitLoss ?? null)}</td>
            <td className={`px-4 py-4 text-right tabular-nums ${scenarioTone(row?.returnPercent ?? null)}`}>{row?.returnPercent != null ? formatPercentage(row.returnPercent) : "-"}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <p className="mt-3 text-xs leading-5 text-gray-500">Economic cost strategi B = modal awal dikurangi hasil jual HMETD, dibagi saham induk tersisa. Ini bukan perubahan average resmi di broker. Jika hasil rights melebihi modal awal, economic cost bisa negatif. Strategi D berupa kas hasil penjualan, bukan saham aktif.</p>
  </section>;
}
