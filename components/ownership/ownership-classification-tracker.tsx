"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Database, Search, TrendingDown, TrendingUp, Upload, Users } from "lucide-react";
import { OwnershipClassificationImportDialog } from "@/components/ownership/ownership-classification-import-dialog";
import { Button } from "@/components/ui/button";
import { featuredInvestorClassifications, investorClassificationLabel, type InvestorClassificationHoldings } from "@/lib/ownership-classification";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SnapshotRow = {
  id: number;
  ticker: string;
  issuer_name: string;
  report_date: string;
  total_scripless: number;
  holdings: InvestorClassificationHoldings;
};

type ComparisonRow = SnapshotRow & {
  currentShares: number;
  previousShares: number | null;
  currentShare: number;
  previousShare: number | null;
  shareChange: number | null;
  percentagePointChange: number | null;
};

const pageSize = 30;

function formatShares(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return "-";
  return `${value.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatPoints(value: number | null) {
  if (value === null) return "-";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} pp`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function holdingShare(row: SnapshotRow, key: string) {
  return row.total_scripless > 0 ? (Number(row.holdings?.[key] ?? 0) / Number(row.total_scripless)) * 100 : 0;
}

export function OwnershipClassificationTracker() {
  const supabase = useMemo(() => createClient(), []);
  const [dates, setDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState("");
  const [comparisonDate, setComparisonDate] = useState("");
  const [currentRows, setCurrentRows] = useState<SnapshotRow[]>([]);
  const [previousRows, setPreviousRows] = useState<SnapshotRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("mutual_funds");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"change" | "current" | "ticker">("change");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadDates() {
      setLoading(true);
      setError("");
      const { data, error } = await supabase.from("ownership_classification_imports").select("report_date").order("report_date", { ascending: false });
      if (cancelled) return;
      if (error) {
        setError(error.message.includes("schema cache") || error.code === "42P01" ? "Migration klasifikasi investor belum dijalankan di Supabase." : error.message);
        setLoading(false);
        return;
      }
      const available = Array.from(new Set((data ?? []).map((row) => String(row.report_date)))).sort().reverse();
      setDates(available);
      setCurrentDate((current) => available.includes(current) ? current : available[0] ?? "");
      setComparisonDate((current) => available.includes(current) ? current : available[1] ?? "");
      if (!available.length) setLoading(false);
    }
    void loadDates();
    return () => { cancelled = true; };
  }, [reloadKey, supabase]);

  useEffect(() => {
    if (!currentDate) return;
    let cancelled = false;
    async function loadRows() {
      setLoading(true);
      setError("");
      const currentQuery = supabase.from("ownership_classification_snapshots").select("id,ticker,issuer_name,report_date,total_scripless,holdings").eq("report_date", currentDate).order("ticker").limit(2000);
      const previousQuery = comparisonDate
        ? supabase.from("ownership_classification_snapshots").select("id,ticker,issuer_name,report_date,total_scripless,holdings").eq("report_date", comparisonDate).order("ticker").limit(2000)
        : Promise.resolve({ data: [], error: null });
      const [currentResult, previousResult] = await Promise.all([currentQuery, previousQuery]);
      if (cancelled) return;
      if (currentResult.error || previousResult.error) {
        setError(currentResult.error?.message ?? previousResult.error?.message ?? "Data klasifikasi gagal dimuat.");
        setCurrentRows([]);
        setPreviousRows([]);
      } else {
        setCurrentRows((currentResult.data ?? []) as SnapshotRow[]);
        setPreviousRows((previousResult.data ?? []) as SnapshotRow[]);
      }
      setLoading(false);
    }
    void loadRows();
    return () => { cancelled = true; };
  }, [comparisonDate, currentDate, supabase]);

  const comparisonRows = useMemo(() => {
    const previousMap = new Map(previousRows.map((row) => [row.ticker, row]));
    const normalizedSearch = search.trim().toLowerCase();
    const rows: ComparisonRow[] = currentRows.filter((row) => !normalizedSearch || row.ticker.toLowerCase().includes(normalizedSearch) || row.issuer_name.toLowerCase().includes(normalizedSearch)).map((row) => {
      const previous = previousMap.get(row.ticker);
      const currentShares = Number(row.holdings?.[selectedCategory] ?? 0);
      const previousShares = previous ? Number(previous.holdings?.[selectedCategory] ?? 0) : null;
      const currentShare = holdingShare(row, selectedCategory);
      const previousShare = previous ? holdingShare(previous, selectedCategory) : null;
      return { ...row, currentShares, previousShares, currentShare, previousShare, shareChange: previousShares === null ? null : currentShares - previousShares, percentagePointChange: previousShare === null ? null : currentShare - previousShare };
    });
    return rows.sort((first, second) => sort === "ticker" ? first.ticker.localeCompare(second.ticker) : sort === "current" ? second.currentShare - first.currentShare : Number(second.percentagePointChange ?? -Infinity) - Number(first.percentagePointChange ?? -Infinity));
  }, [currentRows, previousRows, search, selectedCategory, sort]);

  const classificationOptions = useMemo(() => {
    const keys = Object.keys(currentRows[0]?.holdings ?? {});
    return keys.map((key) => ({ value: key, label: investorClassificationLabel(key) })).sort((first, second) => first.label.localeCompare(second.label, "id"));
  }, [currentRows]);
  const selectedLabel = investorClassificationLabel(selectedCategory);
  const movers = useMemo(() => comparisonRows.filter((row) => row.percentagePointChange !== null), [comparisonRows]);
  const biggestIncrease = movers[0] ?? null;
  const biggestDecrease = [...movers].sort((first, second) => Number(first.percentagePointChange) - Number(second.percentagePointChange))[0] ?? null;
  const selectedTotal = currentRows.reduce((sum, row) => sum + Number(row.holdings?.[selectedCategory] ?? 0), 0);
  const totalPages = Math.max(1, Math.ceil(comparisonRows.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const visibleRows = comparisonRows.slice((activePage - 1) * pageSize, activePage * pageSize);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-lg font-semibold text-gray-950">Klasifikasi Investor</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">Komposisi saham scripless menurut klasifikasi KSEI. Perubahan menunjukkan perpindahan jumlah kepemilikan antar-snapshot, bukan transaksi broker harian.</p></div><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={() => setImportOpen(true)}><Upload className="size-4" />Unggah Klasifikasi</Button><span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" /><Database className="size-4" />Supabase</span></div></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={Building2} label="Emiten" value={currentRows.length.toLocaleString("id-ID")} detail={currentDate ? `Snapshot ${formatDate(currentDate)}` : "Belum ada snapshot"} />
        <Summary icon={Users} label={selectedLabel} value={formatShares(selectedTotal)} detail="Jumlah saham scripless" />
        <Summary icon={TrendingUp} label="Kenaikan Terbesar" value={biggestIncrease?.ticker ?? "-"} detail={biggestIncrease ? formatPoints(biggestIncrease.percentagePointChange) : "Butuh dua snapshot"} tone="green" />
        <Summary icon={TrendingDown} label="Penurunan Terbesar" value={biggestDecrease?.ticker ?? "-"} detail={biggestDecrease ? formatPoints(biggestDecrease.percentagePointChange) : "Butuh dua snapshot"} tone="red" />
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-gray-200 p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_180px_180px_150px]">
          <label className="relative"><span className="sr-only">Cari emiten</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari ticker atau emiten" className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm" /></label>
          <Select label="Snapshot" value={currentDate} onChange={setCurrentDate} options={dates.map((date) => ({ value: date, label: formatDate(date) }))} />
          <Select label="Bandingkan" value={comparisonDate} onChange={setComparisonDate} options={[{ value: "", label: "Tanpa pembanding" }, ...dates.filter((date) => date !== currentDate).map((date) => ({ value: date, label: formatDate(date) }))]} />
          <Select label="Klasifikasi" value={selectedCategory} onChange={setSelectedCategory} options={classificationOptions} />
          <Select label="Urutkan" value={sort} onChange={(value) => setSort(value as typeof sort)} options={[{ value: "change", label: "Perubahan" }, { value: "current", label: "Komposisi" }, { value: "ticker", label: "Ticker" }]} />
        </div>

        {error ? <div className="m-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : loading ? <div className="space-y-2 p-4">{Array.from({ length: 7 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-md bg-gray-100" />)}</div> : !currentRows.length ? <div className="px-5 py-14 text-center"><Users className="mx-auto size-10 text-gray-300" /><h3 className="mt-3 font-semibold text-gray-950">Belum ada snapshot klasifikasi</h3><p className="mt-1 text-sm text-gray-500">Unggah file klasifikasi investor BEI/KSEI untuk memulai.</p></div> : <>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1180px] text-left text-xs"><thead className="bg-gray-50 uppercase text-gray-500"><tr><th className="px-4 py-3 font-semibold">Emiten</th>{featuredInvestorClassifications.map((category) => <th key={category.key} className="px-3 py-3 text-right font-semibold">{category.label}</th>)}<th className="px-4 py-3 text-right font-semibold">Δ {selectedLabel}</th><th className="px-4 py-3 text-right font-semibold">Perubahan Saham</th><th className="px-4 py-3 text-right font-semibold">Total Scripless</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50"><td className="max-w-64 px-4 py-3"><Link href={`/stocks/${row.ticker}#ownership`} className="font-semibold text-gray-950 hover:text-red-700">{row.ticker}</Link><p className="mt-0.5 truncate text-[11px] text-gray-500">{row.issuer_name}</p></td>{featuredInvestorClassifications.map((category) => <td key={category.key} className="whitespace-nowrap px-3 py-3 text-right text-gray-700">{formatPercent(holdingShare(row, category.key))}</td>)}<td className={cn("whitespace-nowrap px-4 py-3 text-right font-semibold", Number(row.percentagePointChange) > 0 ? "text-emerald-700" : Number(row.percentagePointChange) < 0 ? "text-red-700" : "text-gray-500")}>{row.percentagePointChange === null ? "Baru" : `${row.percentagePointChange > 0 ? "+" : ""}${row.percentagePointChange.toLocaleString("id-ID", { maximumFractionDigits: 2 })} pp`}</td><td className="whitespace-nowrap px-4 py-3 text-right text-gray-600">{row.shareChange === null ? "-" : `${row.shareChange > 0 ? "+" : ""}${formatShares(row.shareChange)}`}</td><td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-950">{formatShares(row.total_scripless)}</td></tr>)}</tbody></table></div>
          <div className="divide-y divide-gray-100 lg:hidden">{visibleRows.map((row) => <article key={row.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/stocks/${row.ticker}#ownership`} className="font-semibold text-gray-950">{row.ticker}</Link><p className="mt-1 line-clamp-1 text-xs text-gray-500">{row.issuer_name}</p></div><span className={cn("shrink-0 rounded px-2 py-1 text-xs font-semibold", Number(row.percentagePointChange) > 0 ? "bg-emerald-50 text-emerald-700" : Number(row.percentagePointChange) < 0 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600")}>{row.percentagePointChange === null ? "Baru" : `${row.percentagePointChange > 0 ? "+" : ""}${row.percentagePointChange.toFixed(2)} pp`}</span></div><div className="mt-3 grid grid-cols-3 gap-3 text-xs"><Mini label={selectedLabel} value={formatPercent(row.currentShare)} /><Mini label="Saham" value={formatShares(row.currentShares)} /><Mini label="Total" value={formatShares(row.total_scripless)} /></div></article>)}</div>
        </>}

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3"><p className="text-xs text-gray-500">{comparisonRows.length ? `${(activePage - 1) * pageSize + 1}-${Math.min(activePage * pageSize, comparisonRows.length)} dari ${comparisonRows.length} emiten` : "0 emiten"}</p><div className="flex items-center gap-2"><Button variant="ghost" className="size-9 px-0" disabled={activePage <= 1 || loading} onClick={() => setPage(activePage - 1)}><ChevronLeft className="size-4" /></Button><span className="min-w-16 text-center text-xs font-semibold">{activePage} / {totalPages}</span><Button variant="ghost" className="size-9 px-0" disabled={activePage >= totalPages || loading} onClick={() => setPage(activePage + 1)}><ChevronRight className="size-4" /></Button></div></div>
      </section>

      <OwnershipClassificationImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={(reportDate) => { setCurrentDate(reportDate); setReloadKey((value) => value + 1); setImportOpen(false); }} />
    </div>
  );
}

function Summary({ icon: Icon, label, value, detail, tone = "gray" }: { icon: typeof Users; label: string; value: string; detail: string; tone?: "gray" | "green" | "red" }) {
  return <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500"><Icon className={cn("size-4", tone === "green" ? "text-emerald-600" : tone === "red" ? "text-red-600" : "text-gray-500")} />{label}</div><p className="mt-3 truncate text-xl font-semibold text-gray-950">{value}</p><p className="mt-1 truncate text-xs text-gray-500">{detail}</p></div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">{options.map((option) => <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}</select></label>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div><span className="block text-gray-500">{label}</span><strong className="mt-1 block text-gray-900">{value}</strong></div>;
}
