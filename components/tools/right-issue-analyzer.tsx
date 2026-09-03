"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, Cloud, FileSearch, FileText, Loader2, ShieldAlert, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stockCaResearchChangeEvent } from "@/lib/stock-ca-research";
import { RightIssuePostTracker } from "@/components/tools/right-issue-post-tracker";
import { calculateFinancialImpact, emptyFinancialImpactInputs, RightIssueFinancialImpact, type FinancialImpactInputs } from "@/components/tools/right-issue-financial-impact";
import { RightIssueAnalysisWorkspace } from "@/components/tools/right-issue-analysis-workspace";

type TimelineEvent = {
  type: "cum_right" | "ex_right" | "recording_date" | "trading_period" | "exercise_deadline" | "share_distribution";
  label: string;
  date: string;
  endDate: string | null;
  sourceFile: string;
  pageNumber: number;
};

type AnalysisResult = {
  ticker: string | null;
  issuer: string | null;
  score: number;
  verdict: "positive" | "mixed" | "caution";
  confidence: "high" | "medium";
  stage: "proposal" | "final_or_advanced";
  facts: {
    newShares: number | null;
    dilution: number | null;
    exercisePrice: number | null;
    ratioOld: number | null;
    ratioNew: number | null;
    hasWarrants: boolean;
    hasStandbyBuyer: boolean;
    controllerCommitment: boolean;
    productiveUse?: boolean;
    debtUse?: boolean;
    workingCapitalUse?: boolean;
    useOfProceedsSummary?: string;
  };
  findings: Array<{ tone: "positive" | "neutral" | "warning"; title: string; detail: string }>;
  evidence: Array<{ label: string; value: string; sourceFile: string; pageNumber: number }>;
  documents: Array<{ name: string; pageCount: number }>;
  timeline: TimelineEvent[];
  disclaimer: string;
};

type SavedAnalysisSummary = {
  id: string;
  ticker: string;
  issuer: string;
  updatedAt: string;
  result: AnalysisResult;
  financialInputs?: Partial<FinancialImpactInputs>;
};

const verdictCopy = {
  positive: { label: "Cenderung Positif", detail: "Manfaat pendanaan terlihat lebih kuat daripada risiko yang terdeteksi.", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  mixed: { label: "Campuran", detail: "Ada manfaat dan risiko material yang perlu ditimbang bersama.", className: "border-amber-200 bg-amber-50 text-amber-800" },
  caution: { label: "Perlu Waspada", detail: "Risiko dilusi, kelengkapan, atau penggunaan dana lebih dominan.", className: "border-red-200 bg-red-50 text-red-800" },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function RightIssueAnalyzer({
  marketPrice,
  onApplyFacts,
}: {
  marketPrice: number;
  onApplyFacts: (facts: { exercisePrice?: number; ratioOld?: number; ratioNew?: number }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [reminderLeadDays, setReminderLeadDays] = useState(1);
  const [savingReminders, setSavingReminders] = useState(false);
  const [remindersSaved, setRemindersSaved] = useState(false);
  const [financialInputs, setFinancialInputs] = useState<FinancialImpactInputs>(emptyFinancialImpactInputs);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysisSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch("/api/right-issue-saved-analyses", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return;
          const payload = await response.json() as { analyses?: SavedAnalysisSummary[] };
          if (!cancelled) setSavedAnalyses((payload.analyses ?? []).filter((item) => item.result?.ticker));
        })
        .catch(() => undefined);
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  function addFiles(nextFiles: File[]) {
    const pdfs = nextFiles.filter((file) => file.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length !== nextFiles.length) toast.error("Analyzer saat ini menerima dokumen PDF.");
    setFiles((current) => {
      const byKey = new Map(current.map((file) => [`${file.name}-${file.size}`, file]));
      pdfs.forEach((file) => byKey.set(`${file.name}-${file.size}`, file));
      return Array.from(byKey.values()).slice(0, 4);
    });
    setResult(null);
    setRemindersSaved(false);
  }

  async function analyze() {
    if (files.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const response = await fetch("/api/right-issue-analysis", { method: "POST", body: formData });
      const payload = await response.json() as AnalysisResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Dokumen gagal dianalisis.");
      setResult(payload);
      setFinancialInputs(emptyFinancialImpactInputs);
      setRemindersSaved(false);
      toast.success("Analisis right issue selesai.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dokumen gagal dianalisis.");
    } finally {
      setLoading(false);
    }
  }

  async function saveTimelineReminders() {
    if (!result?.ticker || result.timeline.length === 0) return;
    setSavingReminders(true);
    try {
      const response = await fetch("/api/right-issue-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: result.ticker, issuer: result.issuer, leadDays: reminderLeadDays, events: result.timeline }),
      });
      const payload = await response.json() as { created?: number; updated?: number; skipped?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "Reminder gagal disimpan.");
      setRemindersSaved(true);
      window.dispatchEvent(new Event(stockCaResearchChangeEvent));
      const savedCount = (payload.created ?? 0) + (payload.updated ?? 0);
      toast.success(savedCount > 0 ? `${savedCount} reminder right issue disimpan atau diperbarui.` : "Semua reminder sudah sesuai.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reminder gagal disimpan.");
    } finally {
      setSavingReminders(false);
    }
  }

  const priceDiscount = result?.facts.exercisePrice && marketPrice > 0
    ? ((result.facts.exercisePrice - marketPrice) / marketPrice) * 100
    : null;
  const financialProjection = calculateFinancialImpact(financialInputs, result?.facts.newShares ?? 0, result?.facts.exercisePrice ?? 0);

  return (
    <section className="mt-6 border-t border-gray-200 pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><FileSearch className="size-5 text-red-600" /><h2 className="text-base font-semibold text-gray-950">Analisis Katalis Right Issue</h2></div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">Unggah keterbukaan, prospektus, atau lampiran HMETD. Beberapa PDF dapat digabung agar surat pengantar dan prospektus dibaca sebagai satu peristiwa.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Upload className="size-4" />Pilih PDF</button>
        <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple className="sr-only" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      </div>

      {savedAnalyses.length ? <div className="mt-4 border-y border-gray-100 py-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-500"><Cloud className="size-4" />Analisis tersimpan</div><div className="flex gap-2 overflow-x-auto pb-1">{savedAnalyses.map((saved) => <button key={saved.id} type="button" onClick={() => { setResult(saved.result); setFinancialInputs({ ...emptyFinancialImpactInputs, ...saved.financialInputs }); setFiles([]); setRemindersSaved(false); }} className="min-w-36 rounded-md border border-gray-200 bg-white px-3 py-2 text-left hover:border-red-200 hover:bg-red-50"><span className="block text-sm font-semibold text-gray-900">{saved.ticker}</span><span className="mt-0.5 block truncate text-xs text-gray-500">{saved.issuer || "Right issue"}</span></button>)}</div></div> : null}

      {files.length === 0 ? (
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 flex min-h-28 w-full flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 text-center hover:border-red-300 hover:bg-red-50/40">
          <FileText className="size-6 text-gray-400" /><span className="mt-2 text-sm font-semibold text-gray-700">Unggah sampai 4 dokumen PDF</span><span className="mt-1 text-xs text-gray-500">Maksimum 15 MB per file, total 35 MB</span>
        </button>
      ) : (
        <div className="mt-4 grid gap-2">
          {files.map((file) => <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2"><FileText className="size-4 shrink-0 text-red-600" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">{file.name}</span><span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" onClick={() => { setFiles((current) => current.filter((item) => item !== file)); setResult(null); }} className="inline-flex size-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus ${file.name}`}><Trash2 className="size-4" /></button></div>)}
          <button type="button" onClick={analyze} disabled={loading} className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{loading ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}{loading ? "Membaca dokumen..." : "Analisis Right Issue"}</button>
        </div>
      )}

      {result ? (
        <div className="mt-6 border-t border-gray-200 pt-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className={cn("rounded-md border p-4", verdictCopy[result.verdict].className)}>
              <p className="text-xs font-semibold uppercase">Kesimpulan awal</p>
              <p className="mt-1 text-xl font-semibold">{verdictCopy[result.verdict].label}</p>
              <p className="mt-1 text-sm leading-6">{verdictCopy[result.verdict].detail}</p>
              <p className="mt-2 text-xs font-medium">{result.ticker ?? result.issuer ?? "Emiten"} · {result.stage === "proposal" ? "Tahap usulan" : "Prospektus final/lanjutan"} · Keyakinan {result.confidence === "high" ? "tinggi" : "menengah"}</p>
            </div>
            <div className="flex flex-col justify-center rounded-md border border-gray-200 bg-gray-50 p-4 text-center"><span className="text-xs font-semibold uppercase text-gray-500">Catalyst score</span><span className="mt-1 text-4xl font-semibold text-gray-950">{result.score}</span><span className="text-xs text-gray-500">dari 100</span><div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200"><div className={cn("h-full", result.score >= 68 ? "bg-emerald-500" : result.score >= 45 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${result.score}%` }} /></div></div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Saham baru" value={result.facts.newShares === null ? "Belum tersedia" : `${formatNumber(result.facts.newShares)} lembar`} />
            <Fact label="Dilusi maksimum" value={result.facts.dilution === null ? "Belum tersedia" : `${result.facts.dilution.toFixed(2)}%`} warning={(result.facts.dilution ?? 0) > 25} />
            <Fact label="Harga pelaksanaan" value={result.facts.exercisePrice === null ? "Belum tersedia" : `Rp ${formatNumber(result.facts.exercisePrice)}`} />
            <Fact label="Rasio HMETD" value={result.facts.ratioOld && result.facts.ratioNew ? `${result.facts.ratioOld}:${result.facts.ratioNew}` : "Belum tersedia"} />
          </div>

          <RightIssueFinancialImpact
            inputs={financialInputs}
            onChange={setFinancialInputs}
            newShares={result.facts.newShares ?? 0}
            exercisePrice={result.facts.exercisePrice ?? 0}
          />

          <section className="mt-6 border-t border-gray-200 pt-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2"><CalendarClock className="size-5 text-red-600" /><h3 className="text-base font-semibold text-gray-950">Timeline HMETD</h3></div>
                <p className="mt-1 text-sm text-gray-600">Tanggal diekstrak dari dokumen dan diurutkan berdasarkan agenda bursa.</p>
              </div>
              {result.timeline.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-[180px_auto]">
                  <label className="grid gap-1 text-xs font-medium text-gray-600">Ingatkan sebelum agenda<select value={reminderLeadDays} onChange={(event) => { setReminderLeadDays(Number(event.target.value)); setRemindersSaved(false); }} className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-800"><option value={0}>Pada hari H</option><option value={1}>1 hari sebelumnya</option><option value={3}>3 hari sebelumnya</option><option value={7}>7 hari sebelumnya</option></select></label>
                  <button type="button" onClick={saveTimelineReminders} disabled={savingReminders || !result.ticker} className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{savingReminders ? <Loader2 className="size-4 animate-spin" /> : remindersSaved ? <CheckCircle2 className="size-4" /> : <BellRing className="size-4" />}{remindersSaved ? "Reminder tersimpan" : "Simpan ke Notifikasi"}</button>
                </div>
              ) : null}
            </div>

            {result.timeline.length > 0 ? (
              <ol className="relative mt-5 grid gap-0 border-l-2 border-gray-200 pl-5">
                {result.timeline.map((event, index) => (
                  <li key={`${event.type}-${event.date}`} className="relative border-b border-gray-100 py-3 first:pt-0 last:border-0 last:pb-0">
                    <span className={cn("absolute -left-[27px] top-[18px] size-3 rounded-full border-2 border-white", event.type === "exercise_deadline" ? "bg-red-600" : "bg-gray-400", index === 0 && "top-1")} />
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><div><p className="text-sm font-semibold text-gray-900">{event.label}</p><p className="mt-0.5 text-xs text-gray-500">{event.sourceFile} · halaman {event.pageNumber}</p></div><time className={cn("shrink-0 text-sm font-semibold", event.type === "exercise_deadline" ? "text-red-700" : "text-gray-700")}>{formatTimelineDate(event.date)}{event.endDate ? ` - ${formatTimelineDate(event.endDate)}` : ""}</time></div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center"><p className="text-sm font-semibold text-gray-700">Jadwal final belum ditemukan</p><p className="mt-1 text-xs text-gray-500">Dokumen kemungkinan masih tahap usulan. Unggah prospektus final saat diterbitkan.</p></div>
            )}
            {!result.ticker && result.timeline.length > 0 ? <p className="mt-3 text-xs font-medium text-red-700">Ticker tidak terdeteksi dari nama file, sehingga reminder belum dapat disimpan.</p> : null}
          </section>

          {priceDiscount !== null ? <p className={cn("mt-3 rounded-md px-3 py-2 text-sm font-medium", priceDiscount <= 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>Harga pelaksanaan {Math.abs(priceDiscount).toFixed(2)}% {priceDiscount <= 0 ? "di bawah" : "di atas"} harga pasar yang diisi pada kalkulator.</p> : null}

          <div className="mt-5 grid gap-3">
            <h3 className="text-sm font-semibold text-gray-950">Faktor penilaian</h3>
            {result.findings.map((finding) => <div key={finding.title} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0">{finding.tone === "positive" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : finding.tone === "warning" ? <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-600" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />}<div><p className="text-sm font-semibold text-gray-900">{finding.title}</p><p className="mt-1 text-sm leading-6 text-gray-600">{finding.detail}</p></div></div>)}
          </div>

          {result.facts.exercisePrice || (result.facts.ratioOld && result.facts.ratioNew) ? <button type="button" onClick={() => onApplyFacts({ exercisePrice: result.facts.exercisePrice ?? undefined, ratioOld: result.facts.ratioOld ?? undefined, ratioNew: result.facts.ratioNew ?? undefined })} className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50">Gunakan angka di kalkulator</button> : null}

          {result.evidence.length ? <details className="mt-5 rounded-md border border-gray-200 px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-gray-800">Jejak sumber ({result.evidence.length})</summary><div className="mt-3 grid gap-2">{result.evidence.map((item) => <div key={`${item.label}-${item.pageNumber}`} className="flex flex-col gap-1 text-xs text-gray-600 sm:flex-row sm:justify-between"><span><strong className="text-gray-800">{item.label}:</strong> {item.value}</span><span className="truncate sm:max-w-80">{item.sourceFile} · halaman {item.pageNumber}</span></div>)}</div></details> : null}
          <p className="mt-4 text-xs leading-5 text-gray-500">{result.disclaimer} Selalu verifikasi angka pada dokumen sumber.</p>
          <RightIssueAnalysisWorkspace
            ticker={result.ticker}
            issuer={result.issuer}
            score={result.score}
            verdict={result.verdict}
            stage={result.stage}
            result={result}
            marketPrice={marketPrice}
            financialInputs={financialInputs}
            financialProjection={financialProjection}
          />
        </div>
      ) : null}
      <RightIssuePostTracker draft={result ? {
        ticker: result.ticker ?? undefined,
        issuerName: result.issuer ?? undefined,
        referenceDate: (() => {
          const distribution = result.timeline.find((event) => event.type === "share_distribution");
          return distribution?.endDate ?? distribution?.date;
        })(),
        offeredShares: result.facts.newShares ?? undefined,
        targetFunds: result.facts.newShares && result.facts.exercisePrice ? result.facts.newShares * result.facts.exercisePrice : undefined,
        hasStandbyBuyer: result.facts.hasStandbyBuyer,
      } : null} />
    </section>
  );
}

function Fact({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className="border-l-2 border-gray-200 px-3 py-1"><p className="text-xs text-gray-500">{label}</p><p className={cn("mt-1 text-sm font-semibold text-gray-950", warning && "text-red-700")}>{value}</p></div>;
}
