"use client";

import { useEffect, useState } from "react";
import { BellRing, BookmarkPlus, CheckCircle2, GitCompareArrows, History, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { addSelectedStocks, getStoredSelectedAccumulationEntries, replaceSelectedAccumulationEntries, type WatchlistCategory } from "@/components/accumulation/accumulation-store";
import { stockCaResearchChangeEvent } from "@/lib/stock-ca-research";
import { cn } from "@/lib/utils";
import type { FinancialImpactInputs, FinancialImpactProjection } from "@/components/tools/right-issue-financial-impact";

type VersionChange = { field: string; before: unknown; after: unknown; tone: "neutral" | "changed" | "warning" };
type Version = { id: string; versionNo: number; stage: string; documentDate: string | null; documents: Array<{ name?: string }>; changes: VersionChange[]; createdAt: string };
type SavedAnalysis = { id: string; note: string; updatedAt: string; versions: Version[] };

function today() {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date());
}

function formatDate(value: string | null) {
  if (!value) return "Tanggal tidak terdeteksi";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "belum tersedia";
  if (Array.isArray(value)) return `${value.length} agenda`;
  if (typeof value === "boolean") return value ? "ya" : "tidak";
  if (typeof value === "number") return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
  const text = String(value);
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

export function RightIssueAnalysisWorkspace({ ticker, issuer, score, verdict, stage, result, marketPrice, financialInputs, financialProjection }: { ticker: string | null; issuer: string | null; score: number; verdict: string; stage: string; result: unknown; marketPrice: number; financialInputs: FinancialImpactInputs; financialProjection: FinancialImpactProjection }) {
  const [saved, setSaved] = useState<SavedAnalysis | null>(null);
  const [note, setNote] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<WatchlistCategory>("swing");
  const [reminderDate, setReminderDate] = useState("");
  const [addingWatchlist, setAddingWatchlist] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoadingHistory(true);
      fetch(`/api/right-issue-saved-analyses?ticker=${encodeURIComponent(ticker)}`, { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json() as { analysis?: SavedAnalysis | null; error?: string };
          if (!response.ok) throw new Error(payload.error || "Riwayat gagal dimuat.");
          if (!cancelled) {
            setSaved(payload.analysis ?? null);
            setNote(payload.analysis?.note ?? "");
          }
        })
        .catch(() => undefined)
        .finally(() => { if (!cancelled) setLoadingHistory(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [ticker]);

  async function saveAnalysis() {
    if (!ticker) return toast.error("Ticker belum terdeteksi dari dokumen.");
    setSaving(true);
    try {
      const response = await fetch("/api/right-issue-saved-analyses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker, issuer, score, verdict, stage, result, marketPrice, financialInputs, financialProjection, note }) });
      const payload = await response.json() as { analysis?: SavedAnalysis; changes?: VersionChange[]; error?: string };
      if (!response.ok || !payload.analysis) throw new Error(payload.error || "Analisis gagal disimpan.");
      setSaved(payload.analysis);
      const changed = (payload.changes ?? []).filter((change) => change.tone !== "neutral").length;
      toast.success(changed ? `Analisis tersimpan. ${changed} perubahan terdeteksi.` : "Analisis dan versi dokumen berhasil disimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analisis gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function addToWatchlist() {
    if (!ticker) return toast.error("Ticker belum terdeteksi dari dokumen.");
    setAddingWatchlist(true);
    try {
      let price = marketPrice;
      try {
        const quoteResponse = await fetch(`/api/stock-quotes?tickers=${encodeURIComponent(ticker)}`, { cache: "no-store" });
        const quotePayload = await quoteResponse.json() as { quotes?: Record<string, { price?: number }> };
        const livePrice = Number(quotePayload.quotes?.[ticker]?.price ?? 0);
        if (livePrice > 0) price = livePrice;
      } catch {
        // The calculator price remains a safe fallback when a quote provider is temporarily unavailable.
      }
      if (!(price > 0)) throw new Error("Harga pasar belum tersedia. Isi harga pasar pada kalkulator terlebih dahulu.");
      const response = await fetch("/api/right-issue-watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker, category, price, reminderDate: reminderDate || null }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Watchlist gagal disimpan.");
      const localEntries = getStoredSelectedAccumulationEntries();
      const localEntry = localEntries.find((entry) => entry.ticker === ticker);
      if (localEntry) {
        replaceSelectedAccumulationEntries(localEntries.map((entry) => entry.ticker === ticker ? {
          ...entry,
          watchlistCategory: category,
          thesisTags: Array.from(new Set([...entry.thesisTags, "corporate_action" as const])),
          lifecycle: "waiting",
          catalystDate: reminderDate || undefined,
          reviewDate: reminderDate || undefined,
          source: "Right Issue Analyzer",
          note: "Thesis Potensi Corporate Action",
        } : entry));
      } else {
        addSelectedStocks([ticker], { [ticker]: price }, { watchlistCategory: category, thesisTags: ["corporate_action"], lifecycle: "waiting", catalystDate: reminderDate || undefined, reviewDate: reminderDate || undefined, source: "Right Issue Analyzer", note: "Thesis Potensi Corporate Action" });
      }
      if (reminderDate) window.dispatchEvent(new Event(stockCaResearchChangeEvent));
      toast.success(`${ticker} masuk Watchlist ${category === "daily" ? "Harian" : "Swing"} pada Rp ${new Intl.NumberFormat("id-ID").format(price)}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Watchlist gagal disimpan.");
    } finally {
      setAddingWatchlist(false);
    }
  }

  return <section className="mt-6 border-t border-gray-200 pt-5">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <div className="flex items-center gap-2"><Save className="size-5 text-red-600" /><h3 className="text-base font-semibold text-gray-950">Simpan Hasil Analisis</h3></div>
        <p className="mt-1 text-sm leading-6 text-gray-600">Snapshot baru tidak menimpa jejak sebelumnya. Perubahan dokumen akan dicatat sebagai versi berikutnya.</p>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Catatan pribadi, risiko utama, atau hal yang perlu dikonfirmasi..." className="mt-3 w-full resize-y rounded-md border border-gray-200 px-3 py-2.5 text-sm leading-6 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" />
        <button type="button" onClick={saveAnalysis} disabled={saving || !ticker} className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}{saved ? "Simpan sebagai versi baru" : "Simpan Analisis"}</button>
      </div>
      <aside className="border-l-0 border-gray-200 lg:border-l lg:pl-5">
        <div className="flex items-center gap-2"><BookmarkPlus className="size-5 text-red-600" /><h3 className="text-base font-semibold text-gray-950">Hubungkan ke Radar</h3></div>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-gray-100 p-1">{(["daily", "swing"] as WatchlistCategory[]).map((value) => <button key={value} type="button" onClick={() => setCategory(value)} className={cn("h-9 rounded text-sm font-semibold", category === value ? "bg-white text-red-700 shadow-sm" : "text-gray-600")}>{value === "daily" ? "Harian" : "Swing"}</button>)}</div>
        <label className="mt-3 grid gap-1.5 text-xs font-medium text-gray-600"><span>Reminder review (opsional)</span><input type="date" min={today()} value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-red-500" /></label>
        <button type="button" onClick={addToWatchlist} disabled={addingWatchlist || !ticker} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-red-200 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{addingWatchlist ? <Loader2 className="size-4 animate-spin" /> : reminderDate ? <BellRing className="size-4" /> : <BookmarkPlus className="size-4" />}Tambahkan dengan Thesis CA</button>
      </aside>
    </div>

    <div className="mt-6 border-t border-gray-200 pt-5">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><History className="size-5 text-gray-500" /><h3 className="text-sm font-semibold text-gray-950">Riwayat Versi Dokumen</h3></div>{loadingHistory ? <Loader2 className="size-4 animate-spin text-gray-400" /> : saved ? <span className="text-xs text-gray-500">{saved.versions.length} versi</span> : null}</div>
      {!loadingHistory && !saved ? <p className="mt-3 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-sm text-gray-500">Simpan hasil pertama untuk mulai merekam perubahan usulan, revisi, prospektus, dan hasil pelaksanaan.</p> : null}
      {saved?.versions.length ? <div className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-200">{saved.versions.map((version) => <details key={version.id} className="group px-4 py-3" open={version.versionNo === saved.versions[0]?.versionNo}><summary className="flex cursor-pointer list-none items-center justify-between gap-4"><div><p className="text-sm font-semibold text-gray-900">Versi {version.versionNo} · {version.stage}</p><p className="mt-0.5 text-xs text-gray-500">{formatDate(version.documentDate)} · {version.documents.map((document) => document.name).filter(Boolean).join(", ")}</p></div><GitCompareArrows className="size-4 shrink-0 text-gray-400" /></summary><div className="mt-3 grid gap-2">{version.changes.map((change, index) => <div key={`${change.field}-${index}`} className={cn("grid gap-1 rounded-md px-3 py-2 text-xs sm:grid-cols-[150px_1fr]", change.tone === "warning" ? "bg-red-50 text-red-800" : "bg-gray-50 text-gray-700")}><strong>{change.field}</strong><span>{displayValue(change.before)} → {displayValue(change.after)}</span></div>)}</div></details>)}</div> : null}
    </div>
  </section>;
}
