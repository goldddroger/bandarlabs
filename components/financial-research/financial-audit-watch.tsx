"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, CalendarClock, CheckCircle2, FileSearch, Loader2, ShieldAlert, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { stockCaResearchChangeEvent } from "@/lib/stock-ca-research";
import { cn } from "@/lib/utils";

type AuditWatchAnalysis = {
  ticker: string;
  issuer: string | null;
  announcementDate: string;
  periodEnd: string;
  reportLabel: string;
  auditor: string;
  watchStart: string;
  watchEnd: string;
  statedDueDate: string | null;
  catalysts: string[];
  sourceFile: string;
  sourcePage: number;
  pageCount: number;
  extractionMode: "text" | "filename";
  warnings: string[];
};
type AuditWatch = Omit<AuditWatchAnalysis, "issuer" | "pageCount" | "extractionMode" | "warnings"> & {
  id: string;
  issuer: string;
  status: "waiting" | "released" | "cancelled";
  reportAvailable: boolean;
  linkedActions: Array<{ id: string; actionType: string; eventDate: string; topic: string }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

export function FinancialAuditWatch() {
  const { confirm, confirmationDialog } = useConfirmDialog();
  const inputRef = useRef<HTMLInputElement>(null);
  const [watches, setWatches] = useState<AuditWatch[]>([]);
  const [analysis, setAnalysis] = useState<AuditWatchAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/audit-watches", { cache: "no-store" });
      const payload = await response.json() as { watches?: AuditWatch[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Audit watch gagal dimuat.");
      setWatches(payload.watches ?? []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Audit watch gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function analyzeFile(file: File) {
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/audit-watch-analysis", { method: "POST", body: form });
      const payload = await response.json() as AuditWatchAnalysis & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Dokumen gagal dianalisis.");
      setAnalysis(payload);
    } catch (analysisError) {
      toast.error(analysisError instanceof Error ? analysisError.message : "Dokumen gagal dianalisis.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function activate() {
    if (!analysis) return;
    setSaving(true);
    try {
      const response = await fetch("/api/audit-watches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(analysis) });
      const payload = await response.json() as { watch?: AuditWatch; error?: string };
      if (!response.ok) throw new Error(payload.error || "Reminder gagal dibuat.");
      setAnalysis(null);
      await load();
      window.dispatchEvent(new Event(stockCaResearchChangeEvent));
      toast.success("Audit watch dan reminder berhasil diaktifkan.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Reminder gagal dibuat.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(watch: AuditWatch, status: AuditWatch["status"]) {
    const response = await fetch("/api/audit-watches", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: watch.id, status }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) return toast.error(payload.error || "Status gagal diperbarui.");
    setWatches((current) => current.map((item) => item.id === watch.id ? { ...item, status } : item));
    window.dispatchEvent(new Event(stockCaResearchChangeEvent));
    toast.success(status === "released" ? "Laporan ditandai sudah terbit." : "Audit watch diaktifkan kembali.");
  }

  async function remove(watch: AuditWatch) {
    const approved = await confirm({ title: "Hapus audit watch?", description: "Jendela pantau dan kedua reminder terkait akan dihapus dari database.", subject: `${watch.ticker} · ${watch.reportLabel}`, confirmLabel: "Hapus Watch" });
    if (!approved) return;
    const response = await fetch(`/api/audit-watches?id=${encodeURIComponent(watch.id)}`, { method: "DELETE" });
    const payload = await response.json() as { error?: string };
    if (!response.ok) return toast.error(payload.error || "Audit watch gagal dihapus.");
    setWatches((current) => current.filter((item) => item.id !== watch.id));
    window.dispatchEvent(new Event(stockCaResearchChangeEvent));
    toast.success("Audit watch dihapus.");
  }

  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><div className="flex items-center gap-2"><CalendarClock className="size-5 text-red-600" /><h2 className="text-base font-semibold text-gray-950">Audit Watch</h2></div><p className="mt-1 text-xs text-gray-500">Rencana laporan audit, jendela pantau, dan corporate action terkait.</p></div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={analyzing} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">{analyzing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{analyzing ? "Membaca PDF..." : "Upload Rencana Audit"}</button>
        <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void analyzeFile(file); event.target.value = ""; }} />
      </div>

      {loading ? <div className="flex min-h-24 items-center justify-center"><Loader2 className="size-5 animate-spin text-red-600" /></div> : error ? <div className="px-5 py-4 text-sm text-amber-700"><ShieldAlert className="mr-2 inline size-4" />{error}</div> : watches.length === 0 ? <div className="px-5 py-7 text-center"><BellRing className="mx-auto size-7 text-gray-300" /><p className="mt-2 text-sm font-semibold text-gray-800">Belum ada rencana audit yang dipantau</p></div> : (
        <div className="divide-y divide-gray-100">{watches.map((watch) => <AuditWatchRow key={watch.id} watch={watch} onStatus={(status) => void updateStatus(watch, status)} onDelete={() => void remove(watch)} />)}</div>
      )}

      {analysis ? <AnalysisModal analysis={analysis} saving={saving} onChange={setAnalysis} onClose={() => setAnalysis(null)} onActivate={() => void activate()} /> : null}
      {confirmationDialog}
    </section>
  );
}

function AuditWatchRow({ watch, onStatus, onDelete }: { watch: AuditWatch; onStatus: (status: AuditWatch["status"]) => void; onDelete: () => void }) {
  const released = watch.status === "released" || watch.reportAvailable;
  return <article className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[120px_minmax(0,1fr)_220px_auto] lg:items-center"><div><Link href={`/stocks/${watch.ticker}`} className="text-lg font-semibold text-red-700 hover:underline">{watch.ticker}</Link><p className="mt-1 text-xs text-gray-500">Periode {formatDate(watch.periodEnd)}</p></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-gray-950">{watch.reportLabel}</p><span className={cn("rounded px-2 py-1 text-[11px] font-semibold", released ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{released ? "Laporan tersedia" : "Menunggu audit"}</span>{watch.linkedActions.length ? <span className="rounded bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">{watch.linkedActions.length} CA terkait</span> : null}</div><p className="mt-1 truncate text-xs text-gray-500">{watch.auditor || "Auditor belum disebutkan"}{watch.catalysts.length ? ` · ${watch.catalysts.join(" · ")}` : ""}</p>{watch.linkedActions.length ? <div className="mt-2 flex flex-wrap gap-1">{watch.linkedActions.slice(0, 3).map((action) => <span key={action.id} className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-600">{action.actionType} · {formatDate(action.eventDate)}</span>)}</div> : null}</div><div className="text-xs text-gray-600"><p><span className="text-gray-400">Pantau:</span> {formatDate(watch.watchStart)} - {formatDate(watch.watchEnd)}</p><p className="mt-1"><span className="text-gray-400">Batas tertulis:</span> {formatDate(watch.statedDueDate)}</p></div><div className="flex justify-end gap-1">{watch.reportAvailable ? null : watch.status === "released" ? <button type="button" onClick={() => onStatus("waiting")} className="h-9 rounded-md border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50">Pantau lagi</button> : <button type="button" onClick={() => onStatus("released")} className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="size-4" />Sudah terbit</button>}<button type="button" onClick={onDelete} className="inline-flex size-9 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus audit watch ${watch.ticker}`}><Trash2 className="size-4" /></button></div></article>;
}

function AnalysisModal({ analysis, saving, onChange, onClose, onActivate }: { analysis: AuditWatchAnalysis; saving: boolean; onChange: (analysis: AuditWatchAnalysis) => void; onClose: () => void; onActivate: () => void }) {
  const required = analysis.ticker && analysis.reportLabel && analysis.announcementDate && analysis.periodEnd && analysis.watchStart && analysis.watchEnd;
  function update(field: "ticker" | "issuer" | "reportLabel" | "auditor" | "announcementDate" | "periodEnd" | "watchStart" | "watchEnd" | "statedDueDate", value: string) {
    const next = { ...analysis, [field]: field === "issuer" || field === "statedDueDate" ? value || null : value } as AuditWatchAnalysis;
    if (field === "ticker") next.ticker = value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    if (field === "announcementDate" && value) {
      next.watchStart = addDays(value, 21);
      next.watchEnd = addDays(value, 28);
    }
    if (field === "periodEnd" && /^Laporan Keuangan periode \d{4}-\d{2}-\d{2} - Audit$/.test(analysis.reportLabel)) next.reportLabel = `Laporan Keuangan periode ${value} - Audit`;
    onChange(next);
  }

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-gray-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Preview rencana audit">
    <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-lg bg-white shadow-xl sm:max-w-2xl sm:rounded-lg">
      <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
        <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-gray-950">Aktifkan Audit Watch</h3>{analysis.extractionMode === "filename" ? <span className="rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">PDF scan</span> : null}</div><p className="mt-1 max-w-lg truncate text-xs text-gray-500">{analysis.sourceFile} · halaman {analysis.sourcePage}</p></div>
        <button type="button" onClick={onClose} className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label="Tutup"><X className="size-5" /></button>
      </div>
      <div className="grid gap-5 p-5">
        {analysis.warnings.map((warning) => <div key={warning} className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><p>{warning}</p></div>)}
        <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
          <Field label="Kode ticker" value={analysis.ticker} onChange={(value) => update("ticker", value)} required />
          <Field label="Nama emiten" value={analysis.issuer ?? ""} onChange={(value) => update("issuer", value)} placeholder="Nama perusahaan" />
        </div>
        <Field label="Nama laporan" value={analysis.reportLabel} onChange={(value) => update("reportLabel", value)} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal pengumuman" type="date" value={analysis.announcementDate} onChange={(value) => update("announcementDate", value)} required />
          <Field label="Periode laporan" type="date" value={analysis.periodEnd} onChange={(value) => update("periodEnd", value)} required />
          <Field label="Mulai pantau" type="date" value={analysis.watchStart} onChange={(value) => update("watchStart", value)} required />
          <Field label="Akhir jendela" type="date" value={analysis.watchEnd} onChange={(value) => update("watchEnd", value)} required />
          <Field label="Deadline tertulis" type="date" value={analysis.statedDueDate ?? ""} onChange={(value) => update("statedDueDate", value)} />
          <Field label="Auditor" value={analysis.auditor} onChange={(value) => update("auditor", value)} placeholder="Belum disebutkan" />
        </div>
        {analysis.catalysts.length ? <div><p className="text-xs font-semibold uppercase text-gray-500">Katalis terdeteksi</p><div className="mt-2 flex flex-wrap gap-2">{analysis.catalysts.map((catalyst) => <span key={catalyst} className="rounded bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{catalyst}</span>)}</div></div> : null}
        <div className="flex items-start gap-3 rounded-md bg-blue-50 p-3 text-sm text-blue-800"><FileSearch className="mt-0.5 size-4 shrink-0" /><p>Dua reminder akan dibuat: awal jendela pantau dan batas pantau atau deadline yang tertulis.</p></div>
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4"><button type="button" onClick={onClose} className="h-10 rounded-md border border-gray-200 px-4 text-sm font-semibold text-gray-700">Batal</button><button type="button" onClick={onActivate} disabled={saving || !required} className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{saving ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}Aktifkan Reminder</button></div>
    </div>
  </div>;
}

function Field({ label, value, type = "text", placeholder, required = false, onChange }: { label: string; value: string; type?: "text" | "date"; placeholder?: string; required?: boolean; onChange: (value: string) => void }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-medium text-gray-700"><span>{label}{required ? <span className="text-red-600"> *</span> : null}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-10 min-w-0 rounded-md border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>;
}
