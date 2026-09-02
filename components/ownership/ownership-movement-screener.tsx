"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, Database, Info, Loader2, Search, Upload, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { OwnershipImportDialog } from "@/components/ownership/ownership-import-dialog";
import { Button } from "@/components/ui/button";
import { emptyMovementCounts, type OwnershipMovement, type OwnershipMovementRow } from "@/lib/ownership-screener";
import { cn } from "@/lib/utils";

type ScreenerPayload = {
  dates: string[];
  currentDate: string;
  comparisonDate: string;
  rows: OwnershipMovementRow[];
  counts: Record<OwnershipMovement, number>;
  total: number;
  page: number;
  totalPages: number;
  snapshotRows: number;
  comparisonRequired?: boolean;
  error?: string;
};

type Scope = "all" | "L" | "A";
type MovementFilter = "all" | OwnershipMovement;
type SortMode = "change_desc" | "change_asc" | "percentage" | "ticker" | "investor";

const movementOrder: OwnershipMovement[] = ["new", "increased", "stable", "decreased", "exited"];

export function OwnershipMovementScreener() {
  const [threshold, setThreshold] = useState<1 | 5>(1);
  const [currentDate, setCurrentDate] = useState("");
  const [comparisonDate, setComparisonDate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [movement, setMovement] = useState<MovementFilter>("all");
  const [sort, setSort] = useState<SortMode>("change_desc");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [payload, setPayload] = useState<ScreenerPayload>({ dates: [], currentDate: "", comparisonDate: "", rows: [], counts: emptyMovementCounts(), total: 0, page: 1, totalPages: 1, snapshotRows: 0 });

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ threshold: String(threshold), page: String(page), pageSize: "25", scope, movement, sort });
    if (currentDate) params.set("currentDate", currentDate);
    if (comparisonDate) params.set("comparisonDate", comparisonDate);
    if (search) params.set("search", search);
    try {
      const response = await fetch(`/api/ownership/screener?${params}`, { cache: "no-store", signal });
      const next = await response.json() as ScreenerPayload;
      if (!response.ok) throw new Error(next.error || "Screener ownership gagal dimuat.");
      setPayload(next);
      setCurrentDate(next.currentDate);
      setComparisonDate(next.comparisonDate);
      if (next.page !== page) setPage(next.page);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Screener ownership gagal dimuat.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [comparisonDate, currentDate, movement, page, scope, search, sort, threshold]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void loadData(controller.signal); }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadData, reloadKey]);

  const activeLabel = useMemo(() => movement === "all" ? "Semua pergerakan" : movementLabel(movement), [movement]);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl"><div className="flex items-center gap-2"><UserPlus className="size-5 text-red-600" /><h2 className="text-lg font-semibold text-gray-950">Screener Pergerakan Pemegang Saham</h2></div><p className="mt-2 text-sm leading-6 text-gray-600">Cari investor yang baru menembus ambang kepemilikan, menambah, mengurangi, tetap, atau keluar dari daftar BEI tanpa memilih ticker lebih dulu.</p></div>
          <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={() => setImportOpen(true)}><Upload className="size-4" />Unggah Excel</Button><span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" /><Database className="size-4" />Data Supabase</span></div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div><p className="text-xs font-semibold uppercase text-gray-500">Ambang keterbukaan</p><div className="mt-2 inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">{([1, 5] as const).map((value) => <button key={value} type="button" onClick={() => { setThreshold(value); setCurrentDate(""); setComparisonDate(""); setPage(1); setMovement("all"); }} className={cn("h-8 rounded px-4 text-sm font-semibold", threshold === value ? "bg-white text-red-700 shadow-sm" : "text-gray-600 hover:text-gray-950")}>{value}%+</button>)}</div></div>
            <form onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); }} className="flex w-full max-w-xl gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Cari investor atau saham</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Investor, ticker, atau nama emiten" className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label><Button type="submit">Cari</Button></form>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FilterSelect label="Periode awal" value={comparisonDate} onChange={(value) => { setComparisonDate(value); setPage(1); }} disabled={payload.dates.filter((date) => date < currentDate).length === 0} options={payload.dates.filter((date) => date < currentDate).map((date) => ({ value: date, label: formatDate(date) }))} />
            <FilterSelect label="Periode akhir" value={currentDate} onChange={(value) => { setCurrentDate(value); if (comparisonDate >= value) setComparisonDate(""); setPage(1); }} disabled={!payload.dates.length} options={payload.dates.map((date) => ({ value: date, label: formatDate(date) }))} />
            <FilterSelect label="Asal investor" value={scope} onChange={(value) => { setScope(value as Scope); setPage(1); }} options={[{ value: "all", label: "Semua" }, { value: "L", label: "Lokal" }, { value: "A", label: "Asing" }]} />
            <FilterSelect label="Pergerakan" value={movement} onChange={(value) => { setMovement(value as MovementFilter); setPage(1); }} options={[{ value: "all", label: "Semua status" }, ...movementOrder.map((value) => ({ value, label: movementLabel(value) }))]} />
            <label className="text-xs font-semibold text-gray-600">Urutkan<span className="relative mt-1.5 block"><ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><select value={sort} onChange={(event) => { setSort(event.target.value as SortMode); setPage(1); }} className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm font-normal text-gray-950"><option value="change_desc">Akumulasi terbesar</option><option value="change_asc">Distribusi terbesar</option><option value="percentage">Persentase akhir</option><option value="ticker">Kode saham</option><option value="investor">Nama investor</option></select></span></label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4"><button type="button" onClick={() => { setMovement("all"); setPage(1); }} className={cn("rounded-md border px-2.5 py-1.5 text-xs font-semibold", movement === "all" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50")}>Semua {Object.values(payload.counts).reduce((total, value) => total + value, 0)}</button>{movementOrder.map((value) => <button key={value} type="button" onClick={() => { setMovement(value); setPage(1); }} className={cn("rounded-md border px-2.5 py-1.5 text-xs font-semibold", movement === value ? activeMovementClass(value) : "border-transparent", movementClass(value))}>{movementLabel(value)} {payload.counts[value]}</button>)}</div>
        </div>

        <div className="grid border-b border-gray-200 sm:grid-cols-2 xl:grid-cols-4"><SummaryItem label="Hasil filter" value={String(payload.total)} detail={activeLabel} /><SummaryItem label="Baru masuk" value={String(payload.counts.new)} detail={`Menembus daftar ${threshold}%+`} /><SummaryItem label="Tambah kepemilikan" value={String(payload.counts.increased)} detail="Jumlah saham bertambah" /><SummaryItem label="Keluar daftar" value={String(payload.counts.exited)} detail={`Tidak lagi tercatat di ${threshold}%+`} /></div>

        {loading ? <div className="flex min-h-72 items-center justify-center text-sm text-gray-500"><Loader2 className="mr-2 size-5 animate-spin text-red-600" />Membandingkan seluruh emiten...</div> : error ? <div className="p-10 text-center"><p className="font-semibold text-gray-950">Data gagal dimuat</p><p className="mt-2 text-sm text-gray-500">{error}</p><Button variant="outline" className="mt-4" onClick={() => setReloadKey((value) => value + 1)}>Coba lagi</Button></div> : payload.rows.length ? <MovementResults rows={payload.rows} /> : <div className="p-10 text-center"><Users className="mx-auto size-8 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-950">{payload.comparisonRequired ? "Butuh dua periode ownership" : "Belum ada data yang cocok"}</p><p className="mt-1 text-sm text-gray-500">{payload.comparisonRequired ? `Upload periode ${threshold}%+ sebelumnya agar status masuk, keluar, dan perubahan dapat dihitung dengan benar.` : "Ubah periode, status pergerakan, atau kata pencarian."}</p></div>}

        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-gray-500">{payload.total ? `${(payload.page - 1) * 25 + 1}-${Math.min(payload.page * 25, payload.total)} dari ${payload.total} hasil` : "0 hasil"} · {payload.snapshotRows.toLocaleString("id-ID")} baris pada snapshot akhir</p><div className="flex items-center gap-2"><Button variant="ghost" className="size-9 px-0" disabled={payload.page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} title="Halaman sebelumnya"><ChevronLeft className="size-4" /></Button><span className="min-w-20 text-center text-xs font-semibold text-gray-700">{payload.page} / {payload.totalPages}</span><Button variant="ghost" className="size-9 px-0" disabled={payload.page >= payload.totalPages || loading} onClick={() => setPage((value) => value + 1)} title="Halaman berikutnya"><ChevronRight className="size-4" /></Button></div></div>
        <div className="flex gap-3 border-t border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 sm:px-5"><Info className="mt-0.5 size-4 shrink-0" /><p>Status keluar berarti investor tidak ditemukan pada daftar ambang {threshold}%+ periode akhir. Investor bisa turun di bawah ambang, berpindah nama rekening, atau melepas kepemilikan; bukan otomatis berarti sahamnya menjadi nol.</p></div>
      </section>

      <OwnershipImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={({ threshold: importedThreshold }) => { setThreshold(importedThreshold); setCurrentDate(""); setComparisonDate(""); setMovement("all"); setPage(1); setReloadKey((value) => value + 1); setImportOpen(false); toast.success("Data baru siap dipakai oleh screener ownership."); }} />
    </div>
  );
}

function MovementResults({ rows }: { rows: OwnershipMovementRow[] }) {
  return <><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Investor", "Emiten", "Status", "Saham awal", "Saham akhir", "Perubahan", "% awal", "% akhir", "Perubahan %"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.row_key} className="border-t border-gray-100 hover:bg-gray-50"><td className="max-w-[280px] px-4 py-3"><p className="line-clamp-2 font-semibold text-gray-950">{row.investor_name}</p><p className="mt-1 text-xs text-gray-500">{row.classification || ownershipLabel(row.local_foreign)}</p></td><td className="px-4 py-3"><Link href={`/stocks/${row.ticker}`} className="font-semibold text-red-700 hover:underline">{row.ticker}</Link><p className="mt-1 max-w-52 truncate text-xs text-gray-500" title={row.issuer_name}>{row.issuer_name}</p></td><td className="whitespace-nowrap px-4 py-3"><span className={cn("rounded px-2 py-1 text-xs font-semibold", movementClass(row.movement))}>{movementLabel(row.movement)}</span></td><td className="whitespace-nowrap px-4 py-3 text-gray-600">{row.previous_shares === null ? "-" : formatShares(row.previous_shares)}</td><td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-950">{row.movement === "exited" ? "-" : formatShares(row.shares)}</td><td className={cn("whitespace-nowrap px-4 py-3 font-semibold", changeTextClass(row.share_change))}>{formatChange(row.share_change)}</td><td className="whitespace-nowrap px-4 py-3 text-gray-600">{row.previous_percentage === null ? "-" : formatPercent(row.previous_percentage)}</td><td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-950">{row.movement === "exited" ? "-" : formatPercent(Number(row.percentage || 0))}</td><td className={cn("whitespace-nowrap px-4 py-3 font-semibold", changeTextClass(row.percentage_change))}>{row.percentage_change === null ? "Baru" : `${row.percentage_change > 0 ? "+" : ""}${row.percentage_change.toFixed(2)} pp`}</td></tr>)}</tbody></table></div><div className="divide-y divide-gray-100 lg:hidden">{rows.map((row) => <article key={row.row_key} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={`/stocks/${row.ticker}`} className="text-sm font-bold text-red-700">{row.ticker}</Link><h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-950">{row.investor_name}</h3><p className="mt-1 truncate text-xs text-gray-500">{row.issuer_name}</p></div><span className={cn("shrink-0 rounded px-2 py-1 text-xs font-semibold", movementClass(row.movement))}>{movementLabel(row.movement)}</span></div><div className="mt-4 grid grid-cols-3 gap-3 text-xs"><div><span className="text-gray-500">Awal</span><strong className="mt-1 block text-gray-900">{row.previous_shares === null ? "-" : formatCompact(row.previous_shares)}</strong></div><div><span className="text-gray-500">Akhir</span><strong className="mt-1 block text-gray-900">{row.movement === "exited" ? "-" : formatCompact(row.shares)}</strong></div><div><span className="text-gray-500">Perubahan</span><strong className={cn("mt-1 block", changeTextClass(row.share_change))}>{row.share_change === null ? "Baru" : formatCompact(row.share_change)}</strong></div></div></article>)}</div></>;
}

function FilterSelect({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean }) {
  return <label className="text-xs font-semibold text-gray-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-normal text-gray-950 disabled:bg-gray-50 disabled:text-gray-400">{!value ? <option value="">Belum tersedia</option> : null}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function SummaryItem({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="border-b border-gray-200 p-4 last:border-0 sm:border-r xl:border-b-0 xl:last:border-r-0"><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-1.5 text-xl font-semibold text-gray-950">{value}</p><p className="mt-1 text-xs text-gray-400">{detail}</p></div>; }
function movementLabel(value: OwnershipMovement) { return { new: "Baru masuk", increased: "Naik", stable: "Stabil", decreased: "Turun", exited: "Keluar" }[value]; }
function movementClass(value: OwnershipMovement) { return { new: "bg-blue-50 text-blue-700", increased: "bg-emerald-50 text-emerald-700", stable: "bg-gray-100 text-gray-600", decreased: "bg-amber-50 text-amber-700", exited: "bg-red-50 text-red-700" }[value]; }
function activeMovementClass(value: OwnershipMovement) { return { new: "border-blue-300", increased: "border-emerald-300", stable: "border-gray-400", decreased: "border-amber-300", exited: "border-red-300" }[value]; }
function ownershipLabel(value: string | null) { return value === "L" ? "Lokal" : value === "A" || value === "F" ? "Asing" : value || "-"; }
function formatShares(value: number) { return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value || 0); }
function formatCompact(value: number) { return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(value || 0); }
function formatPercent(value: number) { return `${Number(value || 0).toFixed(2)}%`; }
function formatChange(value: number | null) { return value === null ? "Baru" : `${value > 0 ? "+" : ""}${formatShares(value)}`; }
function changeTextClass(value: number | null) { return value === null || value === 0 ? "text-gray-600" : value > 0 ? "text-emerald-700" : "text-red-700"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
