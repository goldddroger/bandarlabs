"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpenCheck,
  ChevronRight,
  Database,
  Download,
  FileChartColumn,
  FileSpreadsheet,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { FinancialReportImportDialog } from "@/components/financial-research/financial-report-import-dialog";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  formatFinancialAmount,
  formatFinancialPercent,
  type FinancialBreakdown,
  type FinancialInsight,
  type FinancialMetric,
  type FinancialReportFact,
  type FinancialReportRecord,
  type FinancialStatementKind,
} from "@/lib/financial-report";
import { cn } from "@/lib/utils";
import { fcaCriteria } from "@/lib/fca-criteria";
import type { FcaEpisode } from "@/lib/fca-import";

type WorkspaceTab = "summary" | "income_statement" | "balance_sheet" | "cash_flow" | "source";
type DetailPayload = { report?: FinancialReportRecord; facts?: FinancialReportFact[]; downloadUrl?: string | null; error?: string };
type ListPayload = { reports?: FinancialReportRecord[]; error?: string };

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "summary", label: "Ringkasan" },
  { id: "income_statement", label: "Laba Rugi" },
  { id: "balance_sheet", label: "Neraca" },
  { id: "cash_flow", label: "Arus Kas" },
  { id: "source", label: "Sumber & Catatan" },
];

export function FinancialResearchWorkspace() {
  const { confirm, confirmationDialog } = useConfirmDialog();
  const [reports, setReports] = useState<FinancialReportRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState<FinancialReportRecord | null>(null);
  const [facts, setFacts] = useState<FinancialReportFact[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("summary");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const loadReports = useCallback(async (preferredId?: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/financial-reports", { cache: "no-store" });
      const payload = await response.json() as ListPayload;
      if (!response.ok) throw new Error(payload.error || "Daftar laporan gagal dimuat.");
      const nextReports = payload.reports ?? [];
      setReports(nextReports);
      setSelectedId((current) => {
        if (preferredId && nextReports.some((report) => report.id === preferredId)) return preferredId;
        if (current && nextReports.some((report) => report.id === current)) return current;
        return nextReports[0]?.id ?? "";
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Daftar laporan gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      setSelected(null);
      setFacts([]);
      return;
    }
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/financial-reports?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = await response.json() as DetailPayload;
      if (!response.ok || !payload.report) throw new Error(payload.error || "Detail laporan gagal dimuat.");
      setSelected(payload.report);
      setFacts(payload.facts ?? []);
      setDownloadUrl(payload.downloadUrl ?? null);
      setNote(payload.report.analystNote);
    } catch (detailError) {
      toast.error(detailError instanceof Error ? detailError.message : "Detail laporan gagal dimuat.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadReports(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReports]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDetail(selectedId); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail, selectedId]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reports;
    return reports.filter((report) => `${report.ticker} ${report.entityName} ${report.periodEnd}`.toLowerCase().includes(query));
  }, [reports, search]);

  const tickerCount = new Set(reports.map((report) => report.ticker)).size;
  const warningCount = selected?.insights.filter((insight) => insight.tone === "warning" || insight.tone === "negative").length ?? 0;

  async function saveNote() {
    if (!selected) return;
    setSavingNote(true);
    try {
      const response = await fetch("/api/financial-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, analystNote: note }),
      });
      const payload = await response.json() as DetailPayload;
      if (!response.ok || !payload.report) throw new Error(payload.error || "Catatan gagal disimpan.");
      setSelected(payload.report);
      setReports((current) => current.map((report) => report.id === payload.report!.id ? payload.report! : report));
      toast.success("Catatan analisis tersimpan di Supabase.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Catatan gagal disimpan.");
    } finally {
      setSavingNote(false);
    }
  }

  async function deleteReport() {
    if (!selected) return;
    const approved = await confirm({
      title: "Hapus laporan keuangan?",
      description: "File sumber, seluruh fakta, insight, dan catatan periode ini akan dihapus dari database.",
      subject: `${selected.ticker} · ${formatDate(selected.periodEnd)}`,
      confirmLabel: "Hapus Laporan",
    });
    if (!approved) return;
    try {
      const response = await fetch("/api/financial-reports", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Laporan gagal dihapus.");
      toast.success("Laporan berhasil dihapus.");
      setSelected(null);
      setFacts([]);
      setSelectedId("");
      await loadReports();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Laporan gagal dihapus.");
    }
  }

  if (loading) return <LoadingState label="Menyinkronkan riset laporan keuangan..." />;

  if (error) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-5 text-center">
        <Database className="size-10 text-gray-300" />
        <h1 className="mt-4 text-lg font-semibold text-gray-950">Database laporan belum siap</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">{error}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => void loadReports()}><RefreshCw className="size-4" />Coba Lagi</Button>
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm text-gray-500">Research Workspace</p>
          <h1 className="text-2xl font-semibold text-gray-950">Bedah Laporan Keuangan</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">Telusuri perubahan laba, kualitas arus kas, pergerakan aset, dan sumber kenaikan liabilitas dengan bukti langsung dari workbook IDX.</p>
        </div>
        <Button type="button" className="w-full lg:w-auto" onClick={() => setImportOpen(true)}><Plus className="size-4" />Upload Laporan</Button>
      </header>

      <div className="mb-5 grid overflow-hidden rounded-lg border border-gray-200 bg-white sm:grid-cols-3">
        <HeaderMetric label="Laporan tersimpan" value={String(reports.length)} detail={`${tickerCount} emiten`} icon={FileSpreadsheet} />
        <HeaderMetric label="Periode terpilih" value={selected ? formatPeriod(selected.periodEnd) : "-"} detail={selected?.ticker ?? "Pilih laporan"} icon={FileChartColumn} />
        <HeaderMetric label="Perlu perhatian" value={String(warningCount)} detail="Risiko dan kualitas laba" icon={AlertTriangle} />
      </div>

      {reports.length === 0 ? (
        <EmptyState onUpload={() => setImportOpen(true)} />
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
            <label className="relative block" htmlFor="report-search">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input id="report-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari ticker atau periode..." className="h-10 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100" />
            </label>
            <div className="mt-3 max-h-[calc(100vh-230px)] min-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white">
              {filteredReports.map((report) => (
                <button key={report.id} type="button" onClick={() => { setSelectedId(report.id); setActiveTab("summary"); }} className={cn("flex w-full items-start gap-3 border-b border-gray-100 px-4 py-4 text-left last:border-0 hover:bg-gray-50", selectedId === report.id && "bg-red-50 hover:bg-red-50")}>
                  <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-700", selectedId === report.id && "bg-red-600 text-white")}>{report.ticker.slice(0, 4)}</span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold text-gray-950">{report.ticker}</span><span className="mt-1 block truncate text-xs text-gray-500">{formatDate(report.periodEnd)} · {report.currency}</span><span className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">{report.headline}</span></span>
                  <ChevronRight className="mt-2 size-4 shrink-0 text-gray-400" />
                </button>
              ))}
              {filteredReports.length === 0 ? <p className="px-4 py-8 text-center text-sm text-gray-500">Laporan tidak ditemukan.</p> : null}
            </div>
          </aside>

          <main className="min-w-0">
            {detailLoading || !selected ? <LoadingState label="Membuka detail laporan..." compact /> : (
              <>
                <ReportHeader report={selected} downloadUrl={downloadUrl} onDelete={() => void deleteReport()} />
                <div className="mb-5 overflow-x-auto border-b border-gray-200">
                  <div className="flex min-w-max gap-1" role="tablist" aria-label="Analisis laporan keuangan">
                    {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={cn("h-11 border-b-2 px-4 text-sm font-medium", activeTab === tab.id ? "border-red-600 text-red-700" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900")}>{tab.label}</button>)}
                  </div>
                </div>

                {activeTab === "summary" ? <SummaryView report={selected} /> : null}
                {activeTab === "income_statement" ? <StatementView title="Laporan Laba Rugi" description="Perubahan pendapatan, beban, laba, dan komponen pendorongnya." statement="income_statement" report={selected} facts={facts} /> : null}
                {activeTab === "balance_sheet" ? <StatementView title="Neraca" description="Posisi aset, liabilitas, utang berbunga, dan ekuitas pada akhir periode." statement="balance_sheet" report={selected} facts={facts} /> : null}
                {activeTab === "cash_flow" ? <StatementView title="Arus Kas" description="Hubungan laba dengan kas operasi, investasi, pendanaan, dan pembayaran penting." statement="cash_flow" report={selected} facts={facts} /> : null}
                {activeTab === "source" ? <SourceView report={selected} facts={facts} downloadUrl={downloadUrl} note={note} setNote={setNote} saving={savingNote} onSave={() => void saveNote()} /> : null}
              </>
            )}
          </main>
        </div>
      )}

      <FinancialReportImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={(id) => { setImportOpen(false); void loadReports(id); }} />
      {confirmationDialog}
    </section>
  );
}

function ReportHeader({ report, downloadUrl, onDelete }: { report: FinancialReportRecord; downloadUrl: string | null; onDelete: () => void }) {
  return (
    <div className="mb-5 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><span className="rounded bg-red-600 px-2.5 py-1 text-sm font-bold text-white">{report.ticker}</span><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{report.currency} · {report.unitLabel}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{report.reportType || "Laporan IDX"}</span></div>
        <h2 className="mt-3 text-xl font-semibold text-gray-950">{report.entityName}</h2>
        <p className="mt-1 text-sm text-gray-500">{report.periodLabel} · {formatDate(report.periodStart)}–{formatDate(report.periodEnd)} · {report.sector}</p>
      </div>
      <div className="flex gap-2">
        {downloadUrl ? <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 lg:flex-none"><Download className="size-4" />Excel</a> : null}
        <button type="button" onClick={onDelete} className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700" aria-label="Hapus laporan"><Trash2 className="size-4" /></button>
      </div>
    </div>
  );
}

function SummaryView({ report }: { report: FinancialReportRecord }) {
  const metrics: Array<[string, FinancialMetric, "normal" | "margin"]> = [
    ["Pendapatan", report.kpis.revenue, "normal"],
    ["Laba Bersih", report.kpis.netIncome, "normal"],
    ["Margin Bruto", report.kpis.grossMargin, "margin"],
    ["Arus Kas Operasi", report.kpis.operatingCashFlow, "normal"],
    ["Total Aset", report.kpis.assets, "normal"],
    ["Utang Berbunga", report.kpis.interestBearingDebt, "normal"],
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, metric, kind]) => <KpiCard key={label} label={label} metric={metric} report={report} kind={kind} />)}
      </div>

      <FinancialHealth report={report} />

      <ProfitabilityQuality report={report} />

      <FcaAssessment report={report} />

      <section className={cn("overflow-hidden rounded-lg border", report.kpis.netIncome.current !== null && report.kpis.netIncome.current < 0 ? "border-red-200" : "border-emerald-200")}>
        <div className={cn("border-l-4 px-5 py-4", report.kpis.netIncome.current !== null && report.kpis.netIncome.current < 0 ? "border-red-600 bg-red-50" : "border-emerald-600 bg-emerald-50")}>
          <p className="text-xs font-semibold uppercase text-gray-500">Executive Summary</p>
          <h3 className="mt-2 text-lg font-semibold text-gray-950">{report.headline}</h3>
        </div>
        <p className="bg-white px-5 py-4 text-sm leading-7 text-gray-700">{report.executiveSummary}</p>
      </section>

      <section>
        <div className="mb-3"><h3 className="text-lg font-semibold text-gray-950">Apa yang berubah dan mengapa</h3><p className="mt-1 text-sm text-gray-600">Setiap kesimpulan memisahkan hasil perhitungan, inferensi, dan data yang belum cukup.</p></div>
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {report.insights.map((insight, index) => <InsightRow key={insight.id} insight={insight} index={index} report={report} />)}
        </div>
      </section>

      {report.breakdowns.length ? <BreakdownView breakdowns={report.breakdowns} report={report} /> : null}
    </div>
  );
}

function FcaAssessment({ report }: { report: FinancialReportRecord }) {
  type FcaPayload = { active: FcaEpisode | null; latest: FcaEpisode | null; historyCount: number };
  const [response, setResponse] = useState<{ ticker: string; payload: FcaPayload } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/fca-status?ticker=${encodeURIComponent(report.ticker)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result: FcaPayload | null) => { if (!cancelled) setResponse({ ticker: report.ticker, payload: result ?? { active: null, latest: null, historyCount: 0 } }); })
      .catch(() => { if (!cancelled) setResponse({ ticker: report.ticker, payload: { active: null, latest: null, historyCount: 0 } }); });
    return () => { cancelled = true; };
  }, [report.ticker]);

  const payload = response?.ticker === report.ticker ? response.payload : null;

  const auditContext = `${report.reportType} ${report.auditor} ${report.insights.map((insight) => `${insight.title} ${insight.summary}`).join(" ")}`;
  const hasDisclaimer = /disclaimer|tidak menyatakan pendapat/i.test(auditContext);
  const isUnaudited = /tidak diaudit|unaudit/i.test(auditContext);
  const checks = [
    { number: 2, status: hasDisclaimer ? "risk" : "unknown", result: hasDisclaimer ? "Terindikasi dari opini laporan" : isUnaudited ? "Tidak dapat diuji dari laporan yang belum diaudit" : "Perlu laporan tahunan auditan" },
    { number: 3, status: report.kpis.revenue.current !== null && report.kpis.revenue.current > 0 && report.kpis.revenue.changeAmount !== 0 ? "clear" : "risk", result: report.kpis.revenue.current !== null && report.kpis.revenue.current > 0 && report.kpis.revenue.changeAmount !== 0 ? "Tidak terindikasi pada periode ini" : "Perlu perhatian" },
    { number: 5, status: report.kpis.equity.current !== null && report.kpis.equity.current >= 0 ? "clear" : "risk", result: report.kpis.equity.current !== null && report.kpis.equity.current >= 0 ? "Ekuitas masih positif" : "Ekuitas negatif" },
  ] as const;
  const active = payload?.active;
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="flex gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", active ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-500")}><ShieldAlert className="size-5" /></span><div><h3 className="text-sm font-semibold text-gray-950">Pemeriksaan FCA</h3><p className="mt-1 text-xs leading-5 text-gray-500">Status IDX dipisahkan dari indikasi yang dapat diuji melalui laporan keuangan.</p></div></div>
        {payload === null ? <span className="inline-flex items-center gap-2 text-xs text-gray-400"><Loader2 className="size-3.5 animate-spin" />Memeriksa FCA</span> : active ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Aktif sejak {formatDate(active.entered_at)}</span> : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Tidak aktif di daftar terbaru</span>}
      </div>
      {active ? <div className="border-b border-gray-100 bg-red-50/50 px-4 py-3 sm:px-5"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-red-800">Kriteria aktif IDX:</span>{active.criteria.map((criterion) => <span key={criterion} title={fcaCriteria[criterion]} className="inline-flex size-7 items-center justify-center rounded-md border border-red-200 bg-white text-xs font-bold text-red-700">{criterion}</span>)}</div><p className="mt-2 text-xs leading-5 text-red-800">{active.criteria.map((criterion) => `${criterion}. ${fcaCriteria[criterion]}`).join(" ")}</p></div> : null}
      <div className="grid sm:grid-cols-3">{checks.map((check) => <div key={check.number} className="border-b border-gray-100 p-4 sm:border-r sm:last:border-r-0"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-gray-500">Kriteria {check.number}</span><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", check.status === "clear" ? "bg-emerald-50 text-emerald-700" : check.status === "risk" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600")}>{check.status === "clear" ? "Tidak terindikasi" : check.status === "risk" ? "Terindikasi" : "Belum dapat diuji"}</span></div><p className="mt-2 text-sm font-medium text-gray-900">{check.result}</p><p className="mt-1 text-xs leading-5 text-gray-400">{fcaCriteria[check.number]}</p></div>)}</div>
      <div className="flex flex-col gap-2 bg-gray-50 px-4 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-5"><span>Kriteria perdagangan, free float, PKPU, suspensi, dan keputusan Bursa tidak dapat disimpulkan dari Excel laporan keuangan.</span><Link href="/fca" className="shrink-0 font-semibold text-red-700 hover:text-red-800">Buka FCA Tracker <ChevronRight className="inline size-3.5" /></Link></div>
    </section>
  );
}

function FinancialHealth({ report }: { report: FinancialReportRecord }) {
  const ratios = [
    ["Current ratio", report.kpis.currentRatio, "Kemampuan aset lancar menutup kewajiban jangka pendek"],
    ["Debt / equity", report.kpis.debtToEquity, "Utang berbunga dibandingkan total ekuitas"],
    ["Interest coverage", report.kpis.interestCoverage, "EBIT proksi dibandingkan beban bunga dan keuangan"],
  ] as const;
  if (!ratios.some(([, metric]) => metric?.current !== null && metric?.current !== undefined) && report.kpis.netDebt?.current == null) return null;
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3 sm:px-5"><h3 className="text-sm font-semibold text-gray-950">Kesehatan Finansial</h3><p className="mt-1 text-xs text-gray-500">Rasio otomatis untuk membaca likuiditas, leverage, dan kemampuan membayar bunga.</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4">
        {ratios.map(([label, metric, detail]) => <div key={label} className="border-b border-gray-100 p-4 sm:border-r lg:border-b-0"><p className="text-xs text-gray-500">{label}</p><p className="mt-1.5 text-lg font-semibold text-gray-950">{metric?.current == null ? "-" : `${metric.current.toLocaleString("id-ID", { maximumFractionDigits: 2 })}x`}</p><p className="mt-1 text-xs leading-5 text-gray-400">{detail}</p></div>)}
        <div className="p-4"><p className="text-xs text-gray-500">Net debt</p><p className="mt-1.5 text-lg font-semibold text-gray-950">{formatFinancialAmount(report.kpis.netDebt?.current ?? null, report.currency, report.unitMultiplier)}</p><p className="mt-1 text-xs leading-5 text-gray-400">Utang berbunga setelah dikurangi kas dan setara kas</p></div>
      </div>
    </section>
  );
}

function ProfitabilityQuality({ report }: { report: FinancialReportRecord }) {
  const metrics = [
    ["Annualized ROA", report.kpis.annualizedRoa, "Laba periode berjalan disetahunkan terhadap rata-rata aset"],
    ["Annualized ROE", report.kpis.annualizedRoe, "Laba periode berjalan disetahunkan terhadap rata-rata ekuitas"],
    ["Net margin", report.kpis.netMargin, "Laba pemilik induk dibandingkan pendapatan"],
  ] as const;
  if (!metrics.some(([, metric]) => metric?.current !== null && metric?.current !== undefined) && report.kpis.freeCashFlow?.current == null) return null;
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3 sm:px-5"><h3 className="text-sm font-semibold text-gray-950">Kualitas Profitabilitas</h3><p className="mt-1 text-xs text-gray-500">Menguji angka pertumbuhan terhadap produktivitas aset, modal, margin, dan kas bebas.</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, metric, detail]) => <div key={label} className="border-b border-gray-100 p-4 sm:border-r lg:border-b-0"><p className="text-xs text-gray-500">{label}</p><p className="mt-1.5 text-lg font-semibold text-gray-950">{formatFinancialPercent(metric?.current ?? null, false)}</p><p className="mt-1 text-xs leading-5 text-gray-400">{detail}</p></div>)}
        <div className="p-4"><p className="text-xs text-gray-500">Free cash flow</p><p className="mt-1.5 text-lg font-semibold text-gray-950">{formatFinancialAmount(report.kpis.freeCashFlow?.current ?? null, report.currency, report.unitMultiplier)}</p><p className="mt-1 text-xs leading-5 text-gray-400">Arus kas operasi setelah belanja aset tetap</p></div>
      </div>
    </section>
  );
}

function KpiCard({ label, metric, report, kind }: { label: string; metric: FinancialMetric; report: FinancialReportRecord; kind: "normal" | "margin" }) {
  const value = kind === "margin" ? formatFinancialPercent(metric.current, false) : formatFinancialAmount(metric.current, report.currency, report.unitMultiplier);
  const positive = (metric.changeAmount ?? 0) >= 0;
  return <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-2 text-lg font-semibold text-gray-950">{value}</p><div className={cn("mt-2 flex items-center gap-1 text-xs font-semibold", metric.changePercent === null ? "text-gray-400" : positive ? "text-emerald-700" : "text-red-700")}>{metric.changePercent === null ? null : positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{formatFinancialPercent(kind === "margin" ? metric.changeAmount : metric.changePercent)} <span className="font-normal text-gray-400">vs pembanding</span></div></div>;
}

function InsightRow({ insight, index, report }: { insight: FinancialInsight; index: number; report: FinancialReportRecord }) {
  const tone = insight.tone === "positive" ? "bg-emerald-50 text-emerald-700" : insight.tone === "negative" ? "bg-red-50 text-red-700" : insight.tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600";
  return (
    <article className="grid gap-3 px-4 py-4 sm:grid-cols-[42px_minmax(0,1fr)] sm:px-5">
      <span className={cn("flex size-8 items-center justify-center rounded text-xs font-bold", tone)}>{String(index + 1).padStart(2, "0")}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-gray-950">{insight.title}</h4><BasisBadge basis={insight.basis} confidence={insight.confidence} /></div>
        <p className="mt-2 text-sm leading-7 text-gray-700">{insight.summary}</p>
        {insight.evidence.length ? <div className="mt-3 flex flex-wrap gap-2">{insight.evidence.slice(0, 4).map((item) => <span key={`${item.sheetCode}-${item.rowNumber}-${item.label}`} title={`${item.label}: ${formatFinancialAmount(item.currentValue, report.currency, report.unitMultiplier)}`} className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-500">{item.sourceType === "pdf" ? `${item.sourceFile || "PDF"} · halaman ${item.pageNumber || item.rowNumber}` : `Sheet ${item.sheetCode} · baris ${item.rowNumber}`}</span>)}</div> : null}
      </div>
    </article>
  );
}

function BasisBadge({ basis, confidence }: { basis: FinancialInsight["basis"]; confidence: FinancialInsight["confidence"] }) {
  const labels = { disclosed: "Diungkapkan", calculated: "Dihitung", inference: "Inferensi", insufficient_data: "Data belum cukup" } as const;
  return <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500">{labels[basis]} · {confidence === "high" ? "tinggi" : confidence === "medium" ? "sedang" : "rendah"}</span>;
}

function BreakdownView({ breakdowns, report }: { breakdowns: FinancialBreakdown[]; report: FinancialReportRecord }) {
  return <section><div className="mb-3"><h3 className="text-lg font-semibold text-gray-950">Komposisi bisnis dan biaya</h3><p className="mt-1 text-sm text-gray-600">Rincian aktif yang tersedia pada catatan XBRL periode ini.</p></div><div className="grid gap-4 lg:grid-cols-2">{breakdowns.slice(0, 4).map((breakdown) => { const max = Math.max(...breakdown.items.map((item) => item.value)); return <div key={breakdown.id} className="rounded-lg border border-gray-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-gray-950">{breakdown.label}</h4><span className="text-xs text-gray-400">Sheet {breakdown.id}</span></div><div className="mt-4 space-y-3">{breakdown.items.slice(0, 6).map((item) => <div key={`${item.rowNumber}-${item.label}`}><div className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0 truncate text-gray-600" title={item.label}>{item.label}</span><span className="shrink-0 font-semibold text-gray-900">{item.sharePercent !== null ? formatFinancialPercent(item.sharePercent, false) : formatFinancialAmount(item.value, report.currency, report.unitMultiplier)}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded bg-gray-100"><div className="h-full rounded bg-red-500" style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }} /></div></div>)}</div></div>; })}</div></section>;
}

function StatementView({ title, description, statement, report, facts }: { title: string; description: string; statement: FinancialStatementKind; report: FinancialReportRecord; facts: FinancialReportFact[] }) {
  const rows = facts.filter((fact) => fact.statement === statement);
  return <section><div className="mb-4"><h3 className="text-lg font-semibold text-gray-950">{title}</h3><p className="mt-1 text-sm text-gray-600">{description}</p></div><div className="overflow-x-auto rounded-lg border border-gray-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 font-semibold">Pos Laporan</th><th className="px-4 py-3 text-right font-semibold">Saat Ini</th><th className="px-4 py-3 text-right font-semibold">Pembanding</th><th className="px-4 py-3 text-right font-semibold">Perubahan</th><th className="px-4 py-3 font-semibold">Sumber</th></tr></thead><tbody>{rows.map((fact) => { const change = fact.currentValue !== null && fact.priorValue !== null ? fact.currentValue - fact.priorValue : null; const percent = change !== null && fact.priorValue ? (change / Math.abs(fact.priorValue)) * 100 : null; return <tr key={`${fact.sheetCode}-${fact.rowNumber}`} className="border-t border-gray-100 hover:bg-gray-50"><td className="max-w-md px-4 py-3"><p className={cn("text-gray-700", fact.concept && "font-semibold text-gray-950")}>{fact.label}</p>{fact.labelEn ? <p className="mt-0.5 text-xs text-gray-400">{fact.labelEn}</p> : null}</td><td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-950">{formatFinancialAmount(fact.currentValue, report.currency, report.unitMultiplier)}</td><td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">{formatFinancialAmount(fact.priorValue, report.currency, report.unitMultiplier)}</td><td className={cn("whitespace-nowrap px-4 py-3 text-right font-semibold", percent === null ? "text-gray-400" : percent >= 0 ? "text-emerald-700" : "text-red-700")}>{formatFinancialPercent(percent)}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">{fact.sheetCode}:{fact.rowNumber}</td></tr>; })}</tbody></table>{rows.length === 0 ? <p className="px-5 py-10 text-center text-sm text-gray-500">Tidak ada angka aktif pada laporan ini.</p> : null}</div></section>;
}

function SourceView({ report, facts, downloadUrl, note, setNote, saving, onSave }: { report: FinancialReportRecord; facts: FinancialReportFact[]; downloadUrl: string | null; note: string; setNote: (value: string) => void; saving: boolean; onSave: () => void }) {
  const sheetCount = new Set(facts.map((fact) => fact.sheetCode)).size;
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><BookOpenCheck className="mt-0.5 size-5 text-red-600" /><div><h3 className="font-semibold text-gray-950">Catatan analisis pribadi</h3><p className="mt-1 text-sm leading-6 text-gray-500">Tambahkan thesis, pertanyaan lanjutan, atau konteks dari public expose dan PDF.</p></div></div><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={12} placeholder="Contoh: cek penyebab kenaikan persediaan dan konfirmasi rencana penggunaannya pada public expose..." className="mt-4 w-full resize-y rounded-md border border-gray-200 px-3 py-3 text-sm leading-6 text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100" /><div className="mt-3 flex justify-end"><Button type="button" onClick={onSave} disabled={saving || note === report.analystNote}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Menyimpan..." : "Simpan Catatan"}</Button></div></section><aside className="space-y-4"><div className="rounded-lg border border-gray-200 bg-white p-4"><h3 className="text-sm font-semibold text-gray-950">Audit sumber</h3><dl className="mt-4 space-y-3 text-sm"><AuditRow label="File" value={report.sourceFile || "-"} /><AuditRow label="Fakta angka" value={facts.length.toLocaleString("id-ID")} /><AuditRow label="Sheet aktif" value={String(sheetCount)} /><AuditRow label="PDF pendamping" value={String(report.supportingDocuments.length)} /><AuditRow label="Auditor" value={report.auditor || "-"} /><AuditRow label="Diperbarui" value={formatDateTime(report.updatedAt)} /></dl>{downloadUrl ? <a href={downloadUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Download className="size-4" />Buka file Excel</a> : null}{report.supportingDocuments.length ? <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">{report.supportingDocuments.map((document) => document.downloadUrl ? <a key={document.storagePath} href={document.downloadUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600 hover:bg-red-50 hover:text-red-700"><span className="min-w-0 truncate">{document.name}</span><span className="shrink-0">{document.pageCount} hal.</span></a> : null)}</div> : null}</div><div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-700" /><p className="text-xs leading-6 text-amber-900">Insight berlabel Diungkapkan berasal dari PDF emiten. Hubungan angka yang belum dijelaskan manajemen tetap ditandai sebagai perhitungan atau inferensi.</p></div></div></aside></div>;
}

function HeaderMetric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof FileSpreadsheet }) { return <div className="flex items-center gap-3 border-b border-gray-200 p-4 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700"><Icon className="size-5" /></span><div className="min-w-0"><p className="text-xs text-gray-500">{label}</p><p className="mt-0.5 truncate font-semibold text-gray-950">{value}</p><p className="mt-0.5 truncate text-xs text-gray-400">{detail}</p></div></div>; }
function AuditRow({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-3"><dt className="text-gray-500">{label}</dt><dd className="max-w-44 break-words text-right font-medium text-gray-900">{value}</dd></div>; }
function EmptyState({ onUpload }: { onUpload: () => void }) { return <div className="flex min-h-[48vh] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-5 text-center"><FileChartColumn className="size-11 text-gray-300" /><h2 className="mt-4 text-lg font-semibold text-gray-950">Belum ada laporan untuk dianalisis</h2><p className="mt-2 max-w-lg text-sm leading-6 text-gray-600">Upload FinancialStatement resmi IDX. Sistem akan mendeteksi format general atau financial, mata uang, satuan, KPI, risiko, dan sumber perubahan angka.</p><Button type="button" className="mt-5" onClick={onUpload}><Plus className="size-4" />Upload Laporan Pertama</Button></div>; }
function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) { return <div className={cn("flex items-center justify-center text-sm text-gray-500", compact ? "min-h-80" : "min-h-[55vh]")}><Loader2 className="mr-2 size-5 animate-spin text-red-600" />{label}</div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${value.slice(0, 10)}T00:00:00+07:00`)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value)); }
function formatPeriod(value: string) { return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`)); }
