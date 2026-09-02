"use client";

import { AlertTriangle, CheckCircle2, FileSearch, Info, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildFinancialPeriodComparison, type FinancialComparisonRow } from "@/lib/financial-report-comparison";
import { formatFinancialAmount, formatFinancialPercent, type FinancialReportRecord } from "@/lib/financial-report";
import { cn } from "@/lib/utils";

export function FinancialPeriodComparison({ reports, selected }: { reports: FinancialReportRecord[]; selected: FinancialReportRecord }) {
  const comparison = buildFinancialPeriodComparison(reports, selected);
  const hasQuarterComparison = comparison.previousReport && comparison.qoq.some((row) => row.current !== null && row.previous !== null);
  const chartData = comparison.trend.map((point) => ({
    ...point,
    revenueBillions: point.revenue === null ? null : point.revenue / 1_000_000_000,
    profitBillions: point.netIncome === null ? null : point.netIncome / 1_000_000_000,
  }));

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><TrendingUp className="size-5 text-red-600" /><h3 className="font-semibold text-gray-950">Tren antarkuartal</h3></div>
            <p className="mt-1 text-sm leading-6 text-gray-500">Pendapatan dan laba ditampilkan sebagai angka kuartal tunggal. Q2 dihitung dari H1 dikurangi Q1.</p>
          </div>
          <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{comparison.history.length} periode {selected.ticker}</span>
        </div>
        {comparison.trend.length > 1 ? (
          <div className="mt-5 h-72 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })} M`} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={68} />
                <Tooltip content={<TrendTooltip currency={selected.currency} />} />
                <Line type="monotone" dataKey="revenueBillions" name="Pendapatan" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3, fill: "#dc2626" }} connectNulls={false} />
                <Line type="monotone" dataKey="profitBillions" name="Laba bersih" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3, fill: "#0f766e" }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <ComparisonEmpty title="Butuh minimal dua periode" description={`Upload periode sebelum ${formatDate(selected.periodEnd)} untuk membentuk grafik dan perbandingan QoQ.`} />}
      </section>

      <div className="grid gap-5 2xl:grid-cols-2">
        <ComparisonTable
          title="Quarter-on-Quarter"
          description={hasQuarterComparison ? `${formatQuarter(selected.periodEnd)} dibanding ${formatQuarter(comparison.previousReport!.periodEnd)}` : "Menunggu laporan kuartal sebelumnya yang berurutan"}
          rows={comparison.qoq}
          report={selected}
        />
        <ComparisonTable
          title="Year-on-Year"
          description={selected.priorPeriodEnd ? `${formatDate(selected.periodEnd)} dibanding ${formatDate(selected.priorPeriodEnd)}` : "Mengikuti kolom pembanding resmi dalam workbook"}
          rows={comparison.yoy}
          report={selected}
        />
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-5"><h3 className="font-semibold text-gray-950">Kualitas laba</h3><p className="mt-1 text-sm text-gray-500">Memisahkan pertumbuhan laba, dukungan kas operasi, dan indikasi sumber non-operasional.</p></div>
        <div className="grid lg:grid-cols-3">
          <QualityCard
            label="Cash conversion"
            value={comparison.cashConversion === null ? "-" : `${comparison.cashConversion.toLocaleString("id-ID", { maximumFractionDigits: 2 })}x`}
            detail={cashConversionDetail(comparison.cashConversion)}
            tone={comparison.cashConversion !== null && comparison.cashConversion >= 0.8 ? "positive" : "warning"}
          />
          <QualityCard
            label="Perubahan cash conversion"
            value={comparison.priorCashConversion === null || comparison.cashConversion === null ? "-" : `${(comparison.cashConversion - comparison.priorCashConversion >= 0 ? "+" : "")}${(comparison.cashConversion - comparison.priorCashConversion).toLocaleString("id-ID", { maximumFractionDigits: 2 })}x`}
            detail="CFO/laba saat ini dibanding periode pembanding workbook"
            tone={comparison.priorCashConversion !== null && comparison.cashConversion !== null && comparison.cashConversion >= comparison.priorCashConversion ? "positive" : "neutral"}
          />
          <QualityCard
            label="Indikasi non-operasional"
            value={String(comparison.nonOperatingSignals.length)}
            detail={comparison.nonOperatingSignals.length ? comparison.nonOperatingSignals.join(" · ") : "Belum ada sinyal material dari insight yang tersedia"}
            tone={comparison.nonOperatingSignals.length ? "warning" : "positive"}
          />
        </div>
        <div className="flex gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500 sm:px-5"><Info className="mt-0.5 size-4 shrink-0" /><p>Deteksi non-operasional adalah alat penyaring, bukan kesimpulan final. Konfirmasi nilai materialnya melalui laba-rugi, arus kas, dan catatan PDF emiten.</p></div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-4 sm:px-5"><FileSearch className="mt-0.5 size-5 text-red-600" /><div><h3 className="font-semibold text-gray-950">Perubahan penting dari PDF</h3><p className="mt-1 text-sm text-gray-500">Temuan yang benar-benar memiliki bukti halaman dari dokumen pendamping empat periode terakhir.</p></div></div>
        {comparison.documentFindings.length ? <div className="divide-y divide-gray-100">{comparison.documentFindings.map((finding) => <article key={finding.id} className="px-4 py-4 sm:px-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><h4 className="font-semibold text-gray-950">{finding.title}</h4><span className="w-fit shrink-0 rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">{formatQuarter(finding.periodEnd)}</span></div><p className="mt-2 text-sm leading-6 text-gray-600">{finding.summary}</p><p className="mt-2 text-xs font-medium text-red-700">{finding.source}</p></article>)}</div> : <ComparisonEmpty title="Belum ada temuan PDF terstruktur" description="Upload PDF laporan atau penjelasan perubahan material bersama Excel agar bukti halaman muncul di sini." />}
      </section>
    </div>
  );
}

function ComparisonTable({ title, description, rows, report }: { title: string; description: string; rows: FinancialComparisonRow[]; report: FinancialReportRecord }) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-5"><h3 className="font-semibold text-gray-950">{title}</h3><p className="mt-1 text-xs text-gray-500">{description}</p></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 font-semibold">Metrik</th><th className="px-4 py-3 text-right font-semibold">Saat ini</th><th className="px-4 py-3 text-right font-semibold">Sebelumnya</th><th className="px-4 py-3 text-right font-semibold">Perubahan</th></tr></thead>
          <tbody>{rows.map((row) => <ComparisonRowView key={row.id} row={row} report={report} />)}</tbody>
        </table>
      </div>
    </section>
  );
}

function ComparisonRowView({ row, report }: { row: FinancialComparisonRow; report: FinancialReportRecord }) {
  const positive = (row.changePercent ?? 0) >= 0;
  return <tr className="border-t border-gray-100"><td className="px-4 py-3"><p className="font-medium text-gray-900">{row.label}</p><p className="mt-0.5 text-xs text-gray-400">{row.context}</p></td><td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-950">{formatComparisonValue(row.current, row.format, report)}</td><td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">{formatComparisonValue(row.previous, row.format, report)}</td><td className={cn("whitespace-nowrap px-4 py-3 text-right font-semibold", row.changePercent === null ? "text-gray-400" : positive ? "text-emerald-700" : "text-red-700")}>{formatFinancialPercent(row.changePercent)}</td></tr>;
}

function QualityCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "positive" | "warning" | "neutral" }) {
  const Icon = tone === "positive" ? CheckCircle2 : AlertTriangle;
  return <div className="border-b border-gray-100 p-4 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0 sm:p-5"><div className="flex items-center gap-2"><Icon className={cn("size-4", tone === "positive" ? "text-emerald-600" : tone === "warning" ? "text-amber-600" : "text-gray-400")} /><p className="text-xs font-medium text-gray-500">{label}</p></div><p className="mt-2 text-xl font-semibold text-gray-950">{value}</p><p className="mt-2 text-xs leading-5 text-gray-500">{detail}</p></div>;
}

function ComparisonEmpty({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center"><Info className="size-6 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-800">{title}</p><p className="mt-1 max-w-lg text-xs leading-5 text-gray-500">{description}</p></div>;
}

function TrendTooltip({ active, payload, label, currency }: { active?: boolean; payload?: Array<{ name?: string; value?: number | null; color?: string }>; label?: string; currency: string }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-md border border-gray-200 bg-white p-3 text-xs shadow-lg"><p className="font-semibold text-gray-900">{label}</p>{payload.map((item) => <div key={item.name} className="mt-2 flex min-w-44 items-center justify-between gap-4"><span style={{ color: item.color }}>{item.name}</span><strong className="text-gray-900">{item.value === null || item.value === undefined ? "-" : formatFinancialAmount(item.value, currency, 1_000_000_000)}</strong></div>)}</div>;
}

function formatComparisonValue(value: number | null, format: FinancialComparisonRow["format"], report: FinancialReportRecord) {
  if (format === "amount") return formatFinancialAmount(value, report.currency, 1);
  if (format === "percent") return formatFinancialPercent(value, false);
  return value === null ? "-" : `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}x`;
}

function cashConversionDetail(value: number | null) {
  if (value === null) return "Belum dapat dihitung karena CFO atau laba tidak tersedia";
  if (value < 0) return "Laba dan arus kas bergerak berlawanan; telusuri modal kerja dan pos nonkas";
  if (value < 0.8) return "Kas operasi belum sepenuhnya mendukung laba periode ini";
  if (value > 2) return "Konversi sangat tinggi; periksa pelepasan modal kerja atau penerimaan tidak berulang";
  return "Arus kas operasi cukup mendukung laba yang dilaporkan";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${value.slice(0, 10)}T00:00:00+07:00`));
}

function formatQuarter(value: string) {
  const month = Number(value.slice(5, 7));
  return `Q${Math.ceil(month / 3)} ${value.slice(0, 4)}`;
}
