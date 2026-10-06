import { AlertTriangle, ArrowRight, Calculator } from "lucide-react";
import type { RightIssueCalculation, RightIssueDraft } from "@/types/right-issue";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/calculations/right-issue-format";

export function RightIssueSummary({ calculation, draft, errors, incomplete }: { calculation: RightIssueCalculation | null; draft: RightIssueDraft; errors: string[]; incomplete: boolean }) {
  const c = calculation;
  const metrics = [
    ["HMETD yang diperoleh", c ? `${formatNumber(c.rightsEntitlement)} hak` : "-"],
    ["Dana penebusan penuh", c ? formatCurrency(c.cashRequired) : "-"],
    ["Saham setelah tebus", c ? `${formatNumber(c.sharesAfterExercise)} saham` : "-"],
    ["Modal awal", c ? formatCurrency(c.originalInvestment) : "-"],
    ["Modal setelah tebus", c ? formatCurrency(c.newTotalInvestment) : "-"],
    ["Average setelah tebus", c ? formatCurrency(c.newAverage, 2) : "-"],
    ["Theoretical ex-rights price (TERP)", c ? formatCurrency(c.terp, 2) : "-"],
    ["Intrinsic value per HMETD", c ? formatCurrency(c.theoreticalRightsValue, 2) : "-"],
  ];
  return <section aria-label="Ringkasan Right Issue" className="min-w-0 self-start border-y border-gray-200 xl:sticky xl:top-24">
    <div className="flex items-center gap-2 border-b border-gray-200 py-4"><Calculator className="size-5 text-red-600" /><h2 className="text-base font-semibold text-gray-950">Ringkasan Right Issue</h2></div>
    {errors.length ? <div role="alert" className="my-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
    {incomplete ? <p className="py-4 text-sm leading-6 text-gray-500">Isi jumlah saham, average buy, harga cum-right, rasio, dan harga pelaksanaan untuk melihat hasil.</p> : null}
    <dl className="divide-y divide-gray-100">{metrics.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 py-3"><dt className="text-sm text-gray-600">{label}</dt><dd className="break-words text-right text-sm font-semibold tabular-nums text-gray-950">{value}</dd></div>)}</dl>
    <div className="border-t border-gray-200 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-gray-950">Potential Ownership Dilution</h3><span className="text-lg font-semibold tabular-nums text-red-700">{c ? formatPercentage(c.dilution) : "-"}</span></div>
      <div className="mt-3 flex h-2 overflow-hidden rounded bg-gray-100" aria-hidden="true"><div className="bg-gray-600" style={{ width: `${c?.ownershipRetained ?? 0}%` }} /><div className="bg-red-500" style={{ width: `${c?.dilution ?? 0}%` }} /></div>
      <p className="mt-2 text-xs leading-5 text-gray-500">{c ? `Porsi kepemilikan relatif tersisa ${formatPercentage(c.ownershipRetained)} jika tidak menebus. ` : ""}Asumsi seluruh HMETD diterbitkan dan terserap.</p>
    </div>
    {c ? <div className="border-t border-gray-200 py-4 text-xs leading-5 text-gray-600">
      <p className="flex flex-wrap items-center gap-2">Average lama Rp{draft.averageBuy}<ArrowRight className="size-3.5" />Setelah tebus {formatCurrency(c.newAverage, 2)}</p>
      <p className="mt-2">TERP merupakan harga teoritis setelah saham memasuki ex-rights. Harga pasar aktual dapat berada di atas atau di bawah nilai ini.</p>
      <p className="mt-2">Jumlah HMETD aktual tetap mengikuti ketentuan Corporate Action emiten.{c.hasFractionalRights ? " Hak pecahan dibulatkan turun ke satu saham pada simulasi ini." : ""}</p>
      {c.rightsRatio === 0 ? <p className="mt-2 text-amber-800">Rasio HMETD nol: tidak ada saham baru atau dilusi pada input ini.</p> : null}
      {c.outOfTheMoney ? <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>Harga pelaksanaan lebih tinggi daripada harga teoritis saham setelah ex-date. Secara intrinsic, HMETD berada out-of-the-money pada asumsi harga ini.</p></div> : null}
    </div> : null}
  </section>;
}
