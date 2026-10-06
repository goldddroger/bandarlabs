import type { RightIssueScenarioDraft } from "@/types/right-issue";
import { formatCurrency, formatSimulationInput } from "@/lib/calculations/right-issue-format";

type Props = { draft: RightIssueScenarioDraft; terp: number | null; cumPrice: number | null; onChange: (key: keyof RightIssueScenarioDraft, value: string) => void };

export function ScenarioAssumptions({ draft, terp, cumPrice, onChange }: Props) {
  return <section aria-label="Asumsi harga skenario" className="mt-8 border-t border-gray-200 pt-6">
    <h2 className="text-lg font-semibold text-gray-950">Harga Setelah Ex-Date</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {([
        ["postExPrice", "Harga saham setelah ex-date", terp, "Kosong: menggunakan TERP sebagai asumsi, bukan prediksi harga."],
        ["parentSalePrice", "Harga jual induk sebelum entitlement", cumPrice, "Kosong: menggunakan harga cum-right. Diasumsikan dijual sebelum berhak memperoleh HMETD."],
      ] as const).map(([key, label, fallback, hint]) => <label key={key} htmlFor={`ri-${key}`} className="grid min-w-0 content-start gap-1.5 text-sm font-medium text-gray-700">
        <span>{label}</span>
        <span className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-gray-300 px-3 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100"><span className="text-xs text-gray-500">Rp</span><input id={`ri-${key}`} inputMode="decimal" autoComplete="off" value={draft[key]} placeholder={fallback === null ? "0" : formatCurrency(fallback, 2).slice(2)} onChange={(event) => onChange(key, formatSimulationInput(event.target.value))} className="w-full min-w-0 bg-transparent text-sm tabular-nums text-gray-950 outline-none" /></span>
        <span className="text-xs font-normal leading-5 text-gray-500">{hint}</span>
      </label>)}
    </div>
  </section>;
}
