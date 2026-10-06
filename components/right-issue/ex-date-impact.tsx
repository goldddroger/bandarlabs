import { ArrowRight } from "lucide-react";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/calculations/right-issue-format";
import type { RightIssueInput, RightIssueCalculation } from "@/types/right-issue";

export function ExDateImpact({ input, calculation }: { input: RightIssueInput; calculation: RightIssueCalculation | null }) {
  if (!calculation) return null;
  return <section aria-label="Dampak ex-date" className="mt-8 border-y border-gray-200 py-6">
    <h2 className="text-lg font-semibold text-gray-950">Apa yang Berubah Setelah Ex-Date?</h2>
    <div className="mt-4 grid gap-6 sm:grid-cols-3">
      <div className="min-w-0"><h3 className="text-xs font-semibold uppercase text-gray-500">Sebelum Ex-Date</h3><p className="mt-2 text-sm text-gray-600">Harga cum-right <strong className="text-gray-950">{formatCurrency(input.cumPrice, 2)}</strong></p><p className="mt-1 text-xs leading-5 text-gray-500">HMETD belum dipisahkan dari saham induk.</p></div>
      <div className="min-w-0"><h3 className="text-xs font-semibold uppercase text-gray-500">Teoritis Setelah Ex-Date</h3><p className="mt-2 text-sm text-gray-600">TERP <strong className="text-gray-950">{formatCurrency(calculation.terp, 2)}</strong></p><p className="mt-1 text-xs leading-5 text-gray-500">Nilai intrinsik HMETD {formatCurrency(calculation.theoreticalRightsValue, 2)} per hak. Bukan prediksi harga pasar.</p></div>
      <div className="min-w-0"><h3 className="text-xs font-semibold uppercase text-gray-500">Posisi Investor</h3><p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-semibold tabular-nums text-gray-950">{formatNumber(input.ownedShares)}<ArrowRight className="size-3.5" />{formatNumber(calculation.sharesAfterExercise)} saham</p><p className="mt-1 text-xs leading-5 text-gray-500">Jumlah setelah menebus seluruh HMETD. Jika tidak menebus, saham tetap {formatNumber(input.ownedShares)}; potensi dilusi {formatPercentage(calculation.dilution)}.</p></div>
    </div>
  </section>;
}
