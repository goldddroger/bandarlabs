"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { BellRing, CalendarClock, ChevronLeft, ChevronRight, CircleAlert, Eye, History, Search, ShieldAlert, Upload, X } from "lucide-react";
import { toast } from "sonner";
import fcaSeed from "@/data/fca-episodes.json";
import { FcaImportDialog } from "@/components/fca/fca-import-dialog";
import { Button } from "@/components/ui/button";
import { fcaCriteria } from "@/lib/fca-criteria";
import type { FcaEpisode } from "@/lib/fca-import";
import { getFcaWatchSnapshot, parseFcaWatchSnapshot, subscribeFcaWatch, syncFcaWatches, toggleFcaWatch } from "@/lib/fca-watch-store";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type StatusFilter = "active" | "exited" | "all" | "watched";
const pageSize = 25;
const fallbackRows = fcaSeed as FcaEpisode[];

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function daysBetween(start: string, end: string) {
  return Math.max(0, Math.floor((new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86_400_000));
}

function durationLabel(start: string, end: string) {
  const days = daysBetween(start, end);
  if (days >= 365) return `${(days / 365).toFixed(1)} tahun`;
  if (days >= 30) return `${Math.round(days / 30)} bulan`;
  return `${days} hari`;
}

function CriteriaBadges({ values }: { values: number[] }) {
  return <div className="flex flex-wrap gap-1.5">{values.map((value) => <span key={value} title={fcaCriteria[value]} className="inline-flex size-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-xs font-semibold text-red-700">{value}</span>)}</div>;
}

function Summary({ icon: Icon, label, value, detail, tone = "neutral" }: { icon: typeof ShieldAlert; label: string; value: number; detail: string; tone?: "neutral" | "red" | "green" | "amber" }) {
  const tones = { neutral: "bg-gray-50 text-gray-700", red: "bg-red-50 text-red-700", green: "bg-green-50 text-green-700", amber: "bg-amber-50 text-amber-700" };
  return <div className="rounded-md border border-gray-200 bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500"><span className={cn("flex size-8 items-center justify-center rounded-md", tones[tone])}><Icon className="size-4" /></span>{label}</div><p className="mt-3 text-2xl font-semibold text-gray-950">{value}</p><p className="mt-1 text-xs text-gray-500">{detail}</p></div>;
}

export function FcaTracker() {
  const supabase = useMemo(() => createClient(), []);
  const [episodes, setEpisodes] = useState<FcaEpisode[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"Supabase" | "Workbook bawaan">("Workbook bawaan");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [criterion, setCriterion] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const watchSnapshot = useSyncExternalStore(subscribeFcaWatch, getFcaWatchSnapshot, () => "[]");
  const watched = useMemo(() => parseFcaWatchSnapshot(watchSnapshot), [watchSnapshot]);
  const watchedTickers = useMemo(() => new Set(watched.map((record) => record.ticker)), [watched]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      const { data, error } = await supabase.from("fca_episodes").select("ticker,company_name,entered_at,exited_at,criteria,source_date").order("entered_at", { ascending: false }).limit(5000);
      if (cancelled) return;
      if (!error && data && data.length > 0) {
        setEpisodes(data as FcaEpisode[]);
        setSource("Supabase");
      } else {
        setEpisodes(fallbackRows);
        setSource("Workbook bawaan");
      }
      setLoading(false);
    }
    void loadData();
    return () => { cancelled = true; };
  }, [reloadKey, supabase]);

  useEffect(() => {
    if (!loading) syncFcaWatches(episodes);
  }, [episodes, loading]);

  const sourceDate = useMemo(() => episodes.map((row) => row.source_date).sort().at(-1) ?? "2026-08-22", [episodes]);
  const activeRows = useMemo(() => episodes.filter((row) => !row.exited_at), [episodes]);
  const recentExits = useMemo(() => episodes.filter((row) => row.exited_at && daysBetween(row.exited_at, sourceDate) <= 30), [episodes, sourceDate]);
  const filtered = useMemo(() => {
    const term = search.trim().toUpperCase();
    return episodes.filter((row) => {
      if (status === "active" && row.exited_at) return false;
      if (status === "exited" && !row.exited_at) return false;
      if (status === "watched" && !watchedTickers.has(row.ticker)) return false;
      if (criterion !== "all" && !row.criteria.includes(Number(criterion))) return false;
      return !term || row.ticker.includes(term) || row.company_name.toUpperCase().includes(term);
    }).sort((first, second) => {
      if (!first.exited_at && second.exited_at) return -1;
      if (first.exited_at && !second.exited_at) return 1;
      return second.entered_at.localeCompare(first.entered_at);
    });
  }, [criterion, episodes, search, status, watchedTickers]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selectedHistory = selectedTicker ? episodes.filter((row) => row.ticker === selectedTicker).sort((a, b) => b.entered_at.localeCompare(a.entered_at)) : [];

  function toggleWatch(row: FcaEpisode) {
    const active = toggleFcaWatch(row);
    toast.success(active ? `${row.ticker} mulai dipantau.` : `${row.ticker} dihapus dari pantauan.`);
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-gray-500">BandarLab</p><h1 className="mt-1 text-2xl font-semibold text-gray-950">FCA Tracker</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">Pantau saham Papan Pemantauan Khusus, alasan masuk, lama berada di FCA, dan perubahan status setelah daftar BEI terbaru diunggah.</p></div>
        <Button type="button" className="shrink-0 whitespace-nowrap" onClick={() => setImportOpen(true)}><Upload className="size-4" />Perbarui Excel</Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={ShieldAlert} label="FCA Aktif" value={activeRows.length} detail={`Data per ${formatDate(sourceDate)}`} tone="red" />
        <Summary icon={CalendarClock} label="Keluar 30 Hari" value={recentExits.length} detail="Perubahan terbaru" tone="green" />
        <Summary icon={CircleAlert} label="Ekuitas Negatif" value={activeRows.filter((row) => row.criteria.includes(5)).length} detail="Aktif dengan kriteria 5" tone="amber" />
        <Summary icon={BellRing} label="Dipantau" value={watched.length} detail="Reminder pribadi aktif" />
      </section>

      <details className="group rounded-md border border-gray-200 bg-gray-50 open:bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-gray-800"><span>Definisi 11 kriteria FCA</span><span className="text-xs font-medium text-gray-500 group-open:hidden">Buka rincian</span></summary>
        <div className="grid gap-x-8 gap-y-3 border-t border-gray-200 px-4 py-4 md:grid-cols-2">
          {Object.entries(fcaCriteria).map(([key, description]) => <div key={key} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-xs font-semibold text-red-700">{key}</span><p className="text-xs leading-5 text-gray-600">{description}</p></div>)}
        </div>
      </details>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
            <label className="relative"><span className="sr-only">Cari saham FCA</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari ticker atau perusahaan" className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm" /></label>
            <select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"><option value="active">Masih aktif</option><option value="exited">Sudah keluar</option><option value="watched">Sedang dipantau</option><option value="all">Semua histori</option></select>
            <select value={criterion} onChange={(event) => { setCriterion(event.target.value); setPage(1); }} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"><option value="all">Semua kriteria</option>{Object.keys(fcaCriteria).map((key) => <option key={key} value={key}>Kriteria {key}</option>)}</select>
            <div className="flex items-center justify-end text-xs text-gray-500">{loading ? "Memuat..." : `${filtered.length} data`} · {source}</div>
          </div>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Saham</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tanggal masuk</th><th className="px-4 py-3">Tanggal keluar</th><th className="px-4 py-3">Durasi</th><th className="px-4 py-3">Kriteria</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
            <tbody>{visibleRows.map((row) => <tr key={`${row.ticker}-${row.entered_at}`} className="border-t border-gray-100 hover:bg-gray-50/70"><td className="max-w-64 px-4 py-3"><Link href={`/stocks/${row.ticker}`} className="font-semibold text-gray-950 hover:text-red-700">{row.ticker}</Link><p className="mt-1 truncate text-xs text-gray-500">{row.company_name}</p></td><td className="px-4 py-3"><span className={cn("rounded px-2 py-1 text-xs font-semibold", row.exited_at ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>{row.exited_at ? "Keluar FCA" : "FCA Aktif"}</span></td><td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(row.entered_at)}</td><td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(row.exited_at)}</td><td className="whitespace-nowrap px-4 py-3 text-gray-700">{durationLabel(row.entered_at, row.exited_at ?? sourceDate)}</td><td className="px-4 py-3"><CriteriaBadges values={row.criteria} /></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => setSelectedTicker(row.ticker)} title="Lihat riwayat" className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"><History className="size-4" /></button><button type="button" onClick={() => toggleWatch(row)} title={watchedTickers.has(row.ticker) ? "Hentikan pantauan" : "Pantau perubahan"} className={cn("flex size-9 items-center justify-center rounded-md", watchedTickers.has(row.ticker) ? "bg-red-50 text-red-700" : "text-gray-500 hover:bg-gray-100")}><Eye className="size-4" /></button></div></td></tr>)}</tbody>
          </table>
        </div>

        <div className="divide-y divide-gray-100 lg:hidden">{visibleRows.map((row) => <article key={`${row.ticker}-${row.entered_at}`} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={`/stocks/${row.ticker}`} className="text-base font-semibold text-gray-950">{row.ticker}</Link><p className="mt-1 truncate text-xs text-gray-500">{row.company_name}</p></div><span className={cn("shrink-0 rounded px-2 py-1 text-xs font-semibold", row.exited_at ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>{row.exited_at ? "Keluar" : "Aktif"}</span></div><div className="mt-3 flex items-center justify-between gap-3"><CriteriaBadges values={row.criteria} /><div className="flex gap-1"><button type="button" onClick={() => setSelectedTicker(row.ticker)} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" title="Riwayat"><History className="size-4" /></button><button type="button" onClick={() => toggleWatch(row)} className={cn("flex size-9 items-center justify-center rounded-md", watchedTickers.has(row.ticker) ? "bg-red-50 text-red-700" : "text-gray-500 hover:bg-gray-100")} title="Pantau"><Eye className="size-4" /></button></div></div><p className="mt-3 text-xs text-gray-500">Masuk {formatDate(row.entered_at)} · {durationLabel(row.entered_at, row.exited_at ?? sourceDate)}</p></article>)}</div>

        {visibleRows.length === 0 ? <div className="p-10 text-center text-sm text-gray-500">Tidak ada saham yang cocok dengan filter.</div> : null}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3"><p className="text-xs text-gray-500">Halaman {page} dari {totalPages}</p><div className="flex gap-2"><Button type="button" variant="ghost" className="size-9 px-0" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="size-4" /></Button><Button type="button" variant="ghost" className="size-9 px-0" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight className="size-4" /></Button></div></div>
      </section>

      {selectedTicker ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-5"><section role="dialog" aria-modal="true" className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-red-700">Riwayat FCA</p><h2 className="mt-1 text-xl font-semibold text-gray-950">{selectedTicker}</h2><p className="mt-1 text-sm text-gray-500">{selectedHistory[0]?.company_name}</p></div><button type="button" aria-label="Tutup riwayat" onClick={() => setSelectedTicker(null)} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"><X className="size-5" /></button></div><ol className="mt-5 border-l border-gray-200 pl-5">{selectedHistory.map((row) => <li key={row.entered_at} className="relative mb-5 last:mb-0"><span className="absolute -left-[25px] top-1 size-2.5 rounded-full bg-red-600 ring-4 ring-white" /><p className="text-sm font-semibold text-gray-950">Masuk {formatDate(row.entered_at)}</p><p className="mt-1 text-xs text-gray-500">{row.exited_at ? `Keluar ${formatDate(row.exited_at)}` : `Masih aktif · ${durationLabel(row.entered_at, sourceDate)}`}</p><div className="mt-2"><CriteriaBadges values={row.criteria} /></div></li>)}</ol><div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => selectedHistory[0] && toggleWatch(selectedHistory[0])}><Eye className="size-4" />{watchedTickers.has(selectedTicker) ? "Hentikan pantauan" : "Pantau perubahan"}</Button><Link href={`/stocks/${selectedTicker}`} className="inline-flex h-10 items-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white">Buka saham</Link></div></section></div> : null}

      <FcaImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); setReloadKey((value) => value + 1); }} />
    </div>
  );
}
