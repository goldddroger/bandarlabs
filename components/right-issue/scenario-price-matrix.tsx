import { formatCurrency, formatPercentage, formatSimulationInput } from "@/lib/calculations/right-issue-format";
import { rightIssueStrategies } from "@/lib/calculations/right-issue-scenarios";
import type { RightIssueMatrixRow, RightIssueScenarioDraft } from "@/types/right-issue";
import { scenarioTone } from "./scenario-card";

type Props = { draft: RightIssueScenarioDraft; rows: RightIssueMatrixRow[] | null; errors: string[]; onChange: (key: keyof RightIssueScenarioDraft, value: string) => void };

export function ScenarioPriceMatrix({ draft, rows, errors, onChange }: Props) {
  return <section aria-label="Matriks harga post-ex" className="mt-8 border-t border-gray-200 pt-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-gray-950">Price Scenario Matrix</h2><span className="inline-flex items-center gap-2 text-xs text-gray-600"><span className="size-3 rounded-sm border border-emerald-400 bg-emerald-50" aria-hidden="true" />Highest Simulated Value</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">{([
      ["matrixLow", "Harga terendah", "20"], ["matrixHigh", "Harga tertinggi", "60"], ["matrixStep", "Interval harga", "5"],
    ] as const).map(([key, label, placeholder]) => <label key={key} htmlFor={`ri-${key}`} className="grid min-w-0 gap-1.5 text-sm font-medium text-gray-700"><span>{label}</span><span className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-gray-300 px-3 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100"><span className="text-xs text-gray-500">Rp</span><input id={`ri-${key}`} autoComplete="off" inputMode="decimal" value={draft[key]} placeholder={placeholder} onChange={(event) => onChange(key, formatSimulationInput(event.target.value))} className="w-full min-w-0 bg-transparent text-sm tabular-nums text-gray-950 outline-none" /></span></label>)}</div>
    {errors.length ? <div role="alert" className="mt-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-800">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
    {rows ? <div role="region" aria-label="Tabel matriks harga dapat digulir" tabIndex={0} className="relative mt-4 max-h-[440px] max-w-full overflow-auto rounded-md border border-gray-200 focus-visible:outline-red-500">
      <table className="w-full min-w-[760px] text-sm">
        <caption className="sr-only">P/L persen per harga post-ex. Highlight berdasarkan nilai ekonomi akhir setelah mengurangi tambahan modal, bukan persentase return tertinggi.</caption>
        <thead className="sticky top-0 z-20 bg-gray-50 text-xs text-gray-500"><tr><th scope="col" className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-medium">Harga post-ex</th>{rightIssueStrategies.map((strategy) => <th key={strategy.id} scope="col" className="px-4 py-3 text-right font-medium">{strategy.code} · {strategy.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{rows.map((row) => <tr key={row.price} data-price={row.price}>
          <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-semibold tabular-nums text-gray-900">{formatCurrency(row.price, 4)}</th>
          {row.scenarios.map((scenario) => {
            const highest = row.highestValueStrategies.includes(scenario.id);
            return <td key={scenario.id} data-strategy={scenario.id} data-highest={highest} className={`px-4 py-3 text-right font-semibold tabular-nums ${highest ? "bg-emerald-50" : "bg-white"} ${scenarioTone(scenario.returnPercent)}`} title={highest ? "Highest Simulated Value (net tambahan modal)" : undefined}>{scenario.returnPercent === null ? "-" : `${scenario.returnPercent > 0 ? "+" : ""}${formatPercentage(scenario.returnPercent)}`}{highest ? <span className="sr-only">, Highest Simulated Value</span> : null}</td>;
          })}
        </tr>)}</tbody>
      </table>
    </div> : !errors.length ? <p className="mt-4 border-y border-gray-200 py-5 text-sm text-gray-500">Isi posisi, ketentuan right issue, dan rentang harga untuk melihat matriks.</p> : null}
    <p className="mt-3 text-xs leading-5 text-gray-500">Highlight membandingkan nilai akhir saham + kas dikurangi dana tebus tambahan. Nilai seri ditandai bersama. Strategi dengan harga HMETD belum diketahui tidak masuk perbandingan nilai tertinggi. Persentase memakai modal masing-masing strategi; jika modal nol, persentase tidak tersedia. Maksimal 201 baris, tanpa fee atau biaya modal. Ini bukan rekomendasi keputusan.</p>
  </section>;
}
