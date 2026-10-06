import { ScenarioCard } from "./scenario-card";
import type { RightIssueScenarioCalculation } from "@/types/right-issue";
import { formatCurrency } from "@/lib/calculations/right-issue-format";

export function ScenarioResults({ calculation, errors, missingRightsPrice }: { calculation: RightIssueScenarioCalculation | null; errors: string[]; missingRightsPrice: boolean }) {
  return <section aria-label="Perbandingan strategi" className="mt-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-gray-950">Scenario Comparison</h2>{calculation ? <p className="text-xs text-gray-500">Harga post-ex: <strong className="text-gray-900">{formatCurrency(calculation.postExPrice, 2)}</strong></p> : null}</div>
    {errors.length > 0 ? <div role="alert" className="mt-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-800">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
    {calculation && missingRightsPrice && calculation.base.rightsEntitlement > 0 ? <p className="mt-3 text-xs leading-5 text-amber-800">Harga jual HMETD belum diisi. Nilai strategi B dan opportunity cost rights kedaluwarsa belum dapat dihitung.</p> : null}
    <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((index) => <ScenarioCard key={index} index={index} scenario={calculation?.scenarios[index] ?? null} />)}</div>
    <p className="mt-3 text-xs leading-5 text-gray-500">Tanpa fee, pajak, atau bunga atas modal tambahan. Persentase A memakai modal awal + dana tebus; B, C, dan D memakai modal awal. Nilai rights yang tidak direalisasi adalah opportunity cost, bukan pengurangan P/L kedua kali.</p>
  </section>;
}
