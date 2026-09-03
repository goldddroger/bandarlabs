"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Cloud, FileSearch, FileText, Loader2, ShieldAlert, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stockCaResearchChangeEvent } from "@/lib/stock-ca-research";
import { calculateFinancialImpact, emptyFinancialImpactInputs, RightIssueFinancialImpact, type FinancialImpactInputs } from "@/components/tools/right-issue-financial-impact";
import { RightIssueAnalysisWorkspace } from "@/components/tools/right-issue-analysis-workspace";

type TimelineEvent = { type: "rups_approval" | "execution_deadline" | "funding" | "distribution" | "listing" | "result_announcement"; label: string; date: string; endDate: null; sourceFile: string; pageNumber: number };
type AnalysisResult = {
  ticker: string | null; issuer: string | null; score: number; verdict: "positive" | "mixed" | "caution"; confidence: "high" | "medium"; stage: "proposal" | "approved" | "revision" | "completed";
  facts: { sharesBefore: number | null; maximumNewShares: number | null; actualNewShares: number | null; newShares: number | null; sharesAfter: number | null; placementPrice: number | null; percentOfExisting: number | null; dilutionAfter: number | null; actualFunds: number | null; investorName: string | null; investorPending: boolean; affiliated: boolean; controllerInvestor: boolean; approved: boolean; completed: boolean; debtConversion: boolean; productiveUse: boolean; debtUse: boolean; workingCapitalUse: boolean; useOfProceedsSummary: string };
  findings: Array<{ tone: "positive" | "neutral" | "warning"; title: string; detail: string }>;
  evidence: Array<{ label: string; value: string; sourceFile: string; pageNumber: number }>;
  documents: Array<{ name: string; pageCount: number; readable: boolean }>;
  timeline: TimelineEvent[]; disclaimer: string;
};
type SavedSummary = { id: string; ticker: string; issuer: string; result: AnalysisResult; financialInputs?: Partial<FinancialImpactInputs> };

const verdictCopy = {
  positive: { label: "Cenderung Positif", detail: "Kualitas modal dan tujuan penggunaan dana lebih kuat daripada risiko yang terdeteksi.", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  mixed: { label: "Campuran", detail: "Ada manfaat permodalan dan risiko dilusi atau tata kelola yang perlu ditimbang bersama.", className: "border-amber-200 bg-amber-50 text-amber-800" },
  caution: { label: "Perlu Waspada", detail: "Risiko dilusi, pemodal, atau penggunaan dana lebih dominan pada dokumen yang tersedia.", className: "border-red-200 bg-red-50 text-red-800" },
};
const stageCopy = { proposal: "Usulan", approved: "Disetujui", revision: "Revisi", completed: "Selesai dilaksanakan" };

function formatNumber(value: number | null) { return value === null ? "-" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value); }
function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }

export function PrivatePlacementAnalyzer({ marketPrice, onApplyFacts }: { marketPrice: number; onApplyFacts: (facts: { sharesBefore?: number; newShares?: number; placementPrice?: number }) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [financialInputs, setFinancialInputs] = useState<FinancialImpactInputs>(emptyFinancialImpactInputs);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedSummary[]>([]);
  const [leadDays, setLeadDays] = useState(1);
  const [savingReminders, setSavingReminders] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/private-placement-saved-analyses", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { analyses?: SavedSummary[] };
      if (!cancelled) setSavedAnalyses((payload.analyses ?? []).filter((item) => item.result?.ticker));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  function addFiles(next: File[]) {
    const pdfs = next.filter((file) => file.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length !== next.length) toast.error("Analyzer menerima dokumen PDF.");
    setFiles((current) => {
      const unique = new Map(current.map((file) => [`${file.name}-${file.size}`, file]));
      pdfs.forEach((file) => unique.set(`${file.name}-${file.size}`, file));
      return Array.from(unique.values()).slice(0, 8);
    });
    setResult(null);
  }

  async function analyze() {
    if (!files.length) return;
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const response = await fetch("/api/private-placement-analysis", { method: "POST", body: formData });
      const payload = await response.json() as AnalysisResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Dokumen gagal dianalisis.");
      setResult(payload);
      setFinancialInputs({ ...emptyFinancialImpactInputs, outstandingShares: payload.facts.sharesBefore ? String(payload.facts.sharesBefore) : "" });
      toast.success("Analisis Private Placement selesai.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Dokumen gagal dianalisis."); }
    finally { setLoading(false); }
  }

  async function saveReminders() {
    if (!result?.ticker || !result.timeline.length) return;
    setSavingReminders(true);
    try {
      const response = await fetch("/api/private-placement-reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker: result.ticker, issuer: result.issuer, leadDays, events: result.timeline }) });
      const payload = await response.json() as { created?: number; updated?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "Reminder gagal disimpan.");
      window.dispatchEvent(new Event(stockCaResearchChangeEvent));
      toast.success(`${(payload.created ?? 0) + (payload.updated ?? 0)} reminder disimpan atau diperbarui.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Reminder gagal disimpan."); }
    finally { setSavingReminders(false); }
  }

  const projection = calculateFinancialImpact(financialInputs, result?.facts.newShares ?? 0, result?.facts.placementPrice ?? 0);
  const discount = result?.facts.placementPrice && marketPrice > 0 ? ((result.facts.placementPrice - marketPrice) / marketPrice) * 100 : null;

  return <section className="mt-6 border-t border-gray-200 pt-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><FileSearch className="size-5 text-red-600" /><h2 className="text-base font-semibold text-gray-950">Deep Analysis Private Placement</h2></div><p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">Gabungkan keterbukaan usulan, revisi, persetujuan RUPSLB, dan hasil pelaksanaan. Sistem membedakan batas maksimum dari realisasi aktual serta memeriksa dilusi, pemodal, afiliasi, penggunaan dana, dan dampak keuangan.</p></div><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Upload className="size-4" />Pilih PDF</button><input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple className="sr-only" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></div>

    {savedAnalyses.length ? <div className="mt-4 border-y border-gray-100 py-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-500"><Cloud className="size-4" />Analisis tersimpan</div><div className="flex gap-2 overflow-x-auto pb-1">{savedAnalyses.map((saved) => <button key={saved.id} type="button" onClick={() => { setResult(saved.result); setFinancialInputs({ ...emptyFinancialImpactInputs, ...saved.financialInputs }); setFiles([]); }} className="min-w-36 rounded-md border border-gray-200 px-3 py-2 text-left hover:border-red-200 hover:bg-red-50"><span className="block text-sm font-semibold">{saved.ticker}</span><span className="block max-w-44 truncate text-xs text-gray-500">{saved.issuer || "Private Placement"}</span></button>)}</div></div> : null}

    {!files.length ? <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 flex min-h-28 w-full flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 text-center hover:border-red-300 hover:bg-red-50/40"><FileText className="size-6 text-gray-400" /><span className="mt-2 text-sm font-semibold text-gray-700">Unggah sampai 8 PDF satu aksi korporasi</span><span className="mt-1 text-xs text-gray-500">Usulan, revisi, persetujuan, dan hasil dapat dianalisis bersama</span></button> : <div className="mt-4 grid gap-2">{files.map((file) => <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2"><FileText className="size-4 shrink-0 text-red-600" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">{file.name}</span><span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" onClick={() => { setFiles((current) => current.filter((item) => item !== file)); setResult(null); }} className="inline-flex size-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus ${file.name}`}><Trash2 className="size-4" /></button></div>)}<button type="button" onClick={analyze} disabled={loading} className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{loading ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}{loading ? "Membaca rangkaian dokumen..." : "Analisis Private Placement"}</button></div>}

    {result ? <div className="mt-6 border-t border-gray-200 pt-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]"><div className={cn("rounded-md border p-4", verdictCopy[result.verdict].className)}><p className="text-xs font-semibold uppercase">Kesimpulan awal</p><p className="mt-1 text-xl font-semibold">{verdictCopy[result.verdict].label}</p><p className="mt-1 text-sm leading-6">{verdictCopy[result.verdict].detail}</p><p className="mt-2 text-xs font-medium">{result.ticker ?? result.issuer ?? "Emiten"} · {stageCopy[result.stage]} · Keyakinan {result.confidence === "high" ? "tinggi" : "menengah"}</p></div><div className="flex flex-col justify-center rounded-md border border-gray-200 bg-gray-50 p-4 text-center"><span className="text-xs font-semibold uppercase text-gray-500">Catalyst score</span><span className="mt-1 text-4xl font-semibold">{result.score}</span><span className="text-xs text-gray-500">dari 100</span><div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200"><div className={cn("h-full", result.score >= 68 ? "bg-emerald-500" : result.score >= 45 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${result.score}%` }} /></div></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Fact label={result.facts.completed ? "Saham aktual" : "Maksimum saham"} value={result.facts.newShares ? `${formatNumber(result.facts.newShares)} lembar` : "Belum ditemukan"} /><Fact label="Harga placement" value={result.facts.placementPrice ? `Rp ${formatNumber(result.facts.placementPrice)}` : "Belum final"} /><Fact label="Dilusi pascatransaksi" value={result.facts.dilutionAfter === null ? "Belum dapat dihitung" : `${result.facts.dilutionAfter.toFixed(2)}%`} warning={(result.facts.dilutionAfter ?? 0) > 8} /><Fact label="Pemodal" value={result.facts.investorName ?? (result.facts.investorPending ? "Belum diumumkan" : "Belum terdeteksi")} warning={!result.facts.investorName} /></div>
      {discount !== null ? <p className={cn("mt-4 rounded-md px-3 py-2 text-sm font-medium", discount < 0 ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800")}>Harga placement {Math.abs(discount).toFixed(2)}% {discount < 0 ? "di bawah" : "di atas"} harga pasar yang diisi.</p> : null}
      {result.timeline.length ? <section className="mt-5 rounded-md border border-gray-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><BellRing className="size-5 text-red-600" /><h3 className="text-sm font-semibold">Timeline & Reminder</h3></div><p className="mt-1 text-xs text-gray-500">Jadwal yang berubah akan terlihat pada riwayat versi.</p></div><div className="flex items-center gap-2"><select value={leadDays} onChange={(event) => setLeadDays(Number(event.target.value))} className="h-9 rounded-md border border-gray-200 px-2 text-xs"><option value={0}>Hari H</option><option value={1}>H-1</option><option value={3}>H-3</option><option value={7}>H-7</option></select><button type="button" onClick={saveReminders} disabled={savingReminders || !result.ticker} className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-3 text-xs font-semibold text-white disabled:opacity-50">{savingReminders ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}Simpan reminder</button></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{result.timeline.map((event) => <div key={`${event.type}-${event.date}`} className="border-l-2 border-red-200 px-3 py-1"><p className="text-sm font-semibold text-gray-900">{event.label}</p><p className="text-xs text-gray-500">{formatDate(event.date)} · {event.sourceFile}, hal. {event.pageNumber}</p></div>)}</div></section> : null}
      <div className="mt-5 grid gap-3"><h3 className="text-sm font-semibold">Faktor penilaian</h3>{result.findings.map((finding) => <div key={finding.title} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0">{finding.tone === "positive" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : finding.tone === "warning" ? <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-600" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />}<div><p className="text-sm font-semibold text-gray-900">{finding.title}</p><p className="mt-1 text-sm leading-6 text-gray-600">{finding.detail}</p></div></div>)}</div>
      {result.facts.newShares || result.facts.placementPrice ? <button type="button" onClick={() => onApplyFacts({ sharesBefore: result.facts.sharesBefore ?? undefined, newShares: result.facts.newShares ?? undefined, placementPrice: result.facts.placementPrice ?? undefined })} className="mt-4 inline-flex h-10 items-center rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50">Gunakan angka di kalkulator</button> : null}
      {result.evidence.length ? <details className="mt-5 rounded-md border border-gray-200 px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-gray-800">Jejak sumber ({result.evidence.length})</summary><div className="mt-3 grid gap-2">{result.evidence.map((item) => <div key={`${item.label}-${item.sourceFile}`} className="flex flex-col gap-1 text-xs text-gray-600 sm:flex-row sm:justify-between"><span><strong>{item.label}:</strong> {item.value}</span><span>{item.sourceFile} · halaman {item.pageNumber}</span></div>)}</div></details> : null}
      <RightIssueFinancialImpact inputs={financialInputs} onChange={setFinancialInputs} newShares={result.facts.newShares ?? 0} exercisePrice={result.facts.placementPrice ?? 0} offeringName="private placement" />
      <p className="mt-4 text-xs leading-5 text-gray-500">{result.disclaimer} Selalu verifikasi angka pada dokumen sumber.</p>
      <RightIssueAnalysisWorkspace ticker={result.ticker} issuer={result.issuer} score={result.score} verdict={result.verdict} stage={result.stage} result={result} marketPrice={marketPrice} financialInputs={financialInputs} financialProjection={projection} analysisApi="/api/private-placement-saved-analyses" watchlistApi="/api/private-placement-watchlist" sourceName="Private Placement Analyzer" thesisLabel="private placement" />
    </div> : null}
  </section>;
}

function Fact({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className="border-l-2 border-gray-200 px-3 py-1"><p className="text-xs text-gray-500">{label}</p><p className={cn("mt-1 text-sm font-semibold text-gray-950", warning && "text-red-700")}>{value}</p></div>; }
