"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers3,
  Percent,
  Search,
  Upload,
  Users,
} from "lucide-react";
import { OwnershipImportDialog } from "@/components/ownership/ownership-import-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type OwnershipRow = {
  id: number;
  ticker: string;
  disclosure_threshold: 1 | 5;
  issuer_name: string;
  investor_name: string;
  account_holder: string | null;
  classification: string | null;
  local_foreign: string | null;
  nationality: string | null;
  domicile: string | null;
  scripless_shares: number;
  scrip_shares: number;
  shares: number;
  share_change: number | null;
  percentage: number | null;
  report_date: string;
};

type StockSuggestion = {
  ticker: string;
  name: string;
};

type SortMode = "percentage" | "shares" | "change" | "investor";
type OwnershipScope = "all" | "L" | "A";

const pageSize = 25;

function formatShares(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatCompactShares(value: number) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function ownershipLabel(value: string | null) {
  if (value === "L") return "Lokal";
  if (value === "A" || value === "F") return "Asing";
  return value || "-";
}

function changeClass(value: number | null) {
  if (value === null || value === 0) return "bg-gray-100 text-gray-600";
  return value > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700";
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="size-4" />
        <span className="text-xs font-semibold uppercase">{label}</span>
      </div>
      <p className="mt-3 truncate text-xl font-semibold text-gray-950" title={value}>{value}</p>
      <p className="mt-1 truncate text-xs text-gray-500" title={detail}>{detail}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-md bg-gray-100" />
      ))}
    </div>
  );
}

export function OwnershipTracker() {
  const supabase = useMemo(() => createClient(), []);
  const [tickerInput, setTickerInput] = useState("AADI");
  const [selectedTicker, setSelectedTicker] = useState("AADI");
  const [companyName, setCompanyName] = useState("Adaro Andalan Indonesia Tbk.");
  const [threshold, setThreshold] = useState<1 | 5>(5);
  const [scope, setScope] = useState<OwnershipScope>("all");
  const [investorSearch, setInvestorSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("percentage");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<OwnershipRow[]>([]);
  const [summaryRows, setSummaryRows] = useState<OwnershipRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const term = tickerInput.trim();
    if (term.length < 2 || term.toUpperCase() === selectedTicker) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      const normalized = term.replace(/[^A-Za-z0-9 .-]/g, "");
      const [tickerResult, nameResult] = await Promise.all([
        supabase.from("stocks").select("ticker,name").ilike("ticker", `${normalized}%`).limit(6),
        supabase.from("stocks").select("ticker,name").ilike("name", `%${normalized}%`).limit(6),
      ]);
      if (cancelled) return;

      const merged = new Map<string, StockSuggestion>();
      [...(tickerResult.data ?? []), ...(nameResult.data ?? [])].forEach((stock) => merged.set(stock.ticker, stock));
      setSuggestions(Array.from(merged.values()).slice(0, 8));
      setShowSuggestions(true);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [selectedTicker, supabase, tickerInput]);

  useEffect(() => {
    let cancelled = false;

    async function loadOwnership() {
      setLoading(true);
      setError(null);

      const sortColumn = sortMode === "investor" ? "investor_name" : sortMode === "change" ? "share_change" : sortMode;
      const ascending = sortMode === "investor";
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let dataQuery = supabase
        .from("shareholder_ownership")
        .select("*", { count: "exact" })
        .eq("ticker", selectedTicker)
        .eq("disclosure_threshold", threshold)
        .order(sortColumn, { ascending, nullsFirst: false })
        .range(from, to);

      let summaryQuery = supabase
        .from("shareholder_ownership")
        .select("*")
        .eq("ticker", selectedTicker)
        .eq("disclosure_threshold", threshold)
        .order("percentage", { ascending: false, nullsFirst: false })
        .limit(1000);

      if (scope !== "all") {
        const values = scope === "A" ? ["A", "F"] : ["L"];
        dataQuery = dataQuery.in("local_foreign", values);
        summaryQuery = summaryQuery.in("local_foreign", values);
      }
      if (investorSearch.trim()) {
        dataQuery = dataQuery.ilike("investor_name", `%${investorSearch.trim()}%`);
        summaryQuery = summaryQuery.ilike("investor_name", `%${investorSearch.trim()}%`);
      }

      const [dataResult, summaryResult, stockResult] = await Promise.all([
        dataQuery,
        summaryQuery,
        supabase.from("stocks").select("name").eq("ticker", selectedTicker).maybeSingle(),
      ]);

      if (cancelled) return;
      if (dataResult.error || summaryResult.error) {
        setRows([]);
        setSummaryRows([]);
        setTotalRows(0);
        setError(dataResult.error?.message ?? summaryResult.error?.message ?? "Data ownership gagal dimuat.");
      } else {
        setRows((dataResult.data ?? []) as OwnershipRow[]);
        setSummaryRows((summaryResult.data ?? []) as OwnershipRow[]);
        setTotalRows(dataResult.count ?? 0);
        if (stockResult.data?.name) setCompanyName(stockResult.data.name);
      }
      setLoading(false);
    }

    void loadOwnership();
    return () => {
      cancelled = true;
    };
  }, [investorSearch, page, reloadKey, scope, selectedTicker, sortMode, supabase, threshold]);

  const summary = useMemo(() => {
    const totalShares = summaryRows.reduce((total, row) => total + Number(row.shares || 0), 0);
    const totalPercentage = summaryRows.reduce((total, row) => total + Number(row.percentage || 0), 0);
    return {
      totalShares,
      totalPercentage,
      largest: summaryRows[0],
      reportDate: summaryRows[0]?.report_date,
    };
  }, [summaryRows]);

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  function selectTicker(stock: StockSuggestion) {
    setTickerInput(stock.ticker);
    setSelectedTicker(stock.ticker);
    setCompanyName(stock.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setPage(1);
  }

  async function submitTicker(event: FormEvent) {
    event.preventDefault();
    const ticker = tickerInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!ticker) return;
    const { data } = await supabase.from("stocks").select("ticker,name").eq("ticker", ticker).maybeSingle();
    setSelectedTicker(ticker);
    setTickerInput(ticker);
    setCompanyName(data?.name ?? ticker);
    setSuggestions([]);
    setShowSuggestions(false);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <form onSubmit={submitTicker} className="relative w-full max-w-xl">
            <label htmlFor="ownership-ticker" className="text-sm font-semibold text-gray-800">Pilih emiten</label>
            <div className="mt-2 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="ownership-ticker"
                  value={tickerInput}
                  onChange={(event) => {
                    const value = event.target.value.toUpperCase();
                    setTickerInput(value);
                    if (value.trim().length < 2 || value.trim() === selectedTicker) {
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => setShowSuggestions(suggestions.length > 0)}
                  onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                  autoComplete="off"
                  placeholder="Cari ticker atau nama emiten"
                  className="h-11 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-950 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
                {showSuggestions && suggestions.length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    {suggestions.map((stock) => (
                      <button
                        key={stock.ticker}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectTicker(stock)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="w-14 shrink-0 text-sm font-semibold text-gray-950">{stock.ticker}</span>
                        <span className="truncate text-sm text-gray-600">{stock.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <Button type="submit" className="px-3 sm:px-4">
                <Search className="size-4" />
                <span className="hidden sm:inline">Tampilkan</span>
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" />
              Unggah Excel
            </Button>
            <div className="flex items-center gap-2 text-xs font-medium text-green-700">
              <span className="size-2 rounded-full bg-green-500" />
              <Database className="size-4" />
              Data Supabase
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-950">{selectedTicker}</h2>
              <Link href={`/stocks/${selectedTicker}`} className="text-sm font-semibold text-red-700 hover:underline">Buka saham</Link>
            </div>
            <p className="mt-1 truncate text-sm text-gray-600">{companyName}</p>
          </div>
          <p className="text-xs text-gray-500">
            {summary.reportDate ? `Data per ${formatDate(summary.reportDate)}` : "Tanggal data belum tersedia"}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem icon={Users} label="Pemegang saham" value={`${summaryRows.length}`} detail={`Threshold ${threshold}%+`} />
          <SummaryItem icon={Layers3} label="Total saham" value={formatCompactShares(summary.totalShares)} detail={`${formatShares(summary.totalShares)} lembar`} />
          <SummaryItem icon={Percent} label="Total tercatat" value={formatPercent(summary.totalPercentage)} detail="Akumulasi persentase pada filter" />
          <SummaryItem icon={Building2} label="Pemilik terbesar" value={summary.largest ? formatPercent(Number(summary.largest.percentage || 0)) : "-"} detail={summary.largest?.investor_name ?? "Belum tersedia"} />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Batas kepemilikan</p>
              <div className="mt-2 inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">
                {([5, 1] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setThreshold(value); setPage(1); }}
                    className={cn("h-8 rounded px-4 text-sm font-semibold transition", threshold === value ? "bg-white text-red-700 shadow-sm" : "text-gray-600 hover:text-gray-950")}
                  >
                    {value}%+
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:w-[690px]">
              <label className="text-xs font-semibold text-gray-600">
                Cari investor
                <input
                  value={investorSearch}
                  onChange={(event) => { setInvestorSearch(event.target.value); setPage(1); }}
                  placeholder="Nama pemegang saham"
                  className="mt-1.5 h-10 w-full rounded-md border border-gray-300 px-3 text-sm font-normal text-gray-950 placeholder:text-gray-400"
                />
              </label>
              <label className="text-xs font-semibold text-gray-600">
                Status investor
                <select
                  value={scope}
                  onChange={(event) => { setScope(event.target.value as OwnershipScope); setPage(1); }}
                  className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-normal text-gray-950"
                >
                  <option value="all">Semua</option>
                  <option value="L">Lokal</option>
                  <option value="A">Asing</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-600">
                Urutkan
                <span className="relative mt-1.5 block">
                  <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <select
                    value={sortMode}
                    onChange={(event) => { setSortMode(event.target.value as SortMode); setPage(1); }}
                    className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm font-normal text-gray-950"
                  >
                    <option value="percentage">Persentase terbesar</option>
                    <option value="shares">Jumlah saham</option>
                    <option value="change">Perubahan saham</option>
                    <option value="investor">Nama investor</option>
                  </select>
                </span>
              </label>
            </div>
          </div>
        </div>

        {loading ? <LoadingRows /> : error ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-gray-950">Data gagal dimuat</p>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => setReloadKey((value) => value + 1)}>Coba lagi</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-gray-950">Belum ada data yang cocok</p>
            <p className="mt-1 text-sm text-gray-500">Coba ticker, threshold, atau kata pencarian lain.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    {["Investor", "Pemegang rekening", "Status", "Domisili", "Jumlah saham", "Persentase", "Perubahan"].map((heading) => (
                      <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/70">
                      <td className="max-w-[290px] px-4 py-3 font-semibold text-gray-950">
                        <span className="line-clamp-2">{row.investor_name}</span>
                        {row.classification ? <span className="mt-1 block text-xs font-normal text-gray-500">{row.classification}</span> : null}
                      </td>
                      <td className="max-w-[260px] px-4 py-3 text-gray-600"><span className="line-clamp-2">{row.account_holder || "-"}</span></td>
                      <td className="whitespace-nowrap px-4 py-3"><span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">{ownershipLabel(row.local_foreign)}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{row.domicile || row.nationality || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">{formatShares(row.shares)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-950">{formatPercent(Number(row.percentage || 0))}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={cn("rounded px-2 py-1 text-xs font-semibold", changeClass(row.share_change))}>
                          {row.share_change === null ? "-" : `${row.share_change > 0 ? "+" : ""}${formatShares(row.share_change)}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 lg:hidden">
              {rows.map((row) => (
                <article key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 text-sm font-semibold leading-5 text-gray-950">{row.investor_name}</h3>
                    <span className="shrink-0 text-sm font-semibold text-gray-950">{formatPercent(Number(row.percentage || 0))}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{row.account_holder || row.classification || "Pemegang rekening tidak tercatat"}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div><span className="block text-gray-500">Jumlah saham</span><strong className="mt-1 block text-gray-800">{formatShares(row.shares)}</strong></div>
                    <div><span className="block text-gray-500">Status</span><strong className="mt-1 block text-gray-800">{ownershipLabel(row.local_foreign)} · {row.domicile || "-"}</strong></div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            {totalRows === 0 ? "0 data" : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalRows)} dari ${totalRows} data`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="size-9 px-0" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} title="Halaman sebelumnya">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-20 text-center text-xs font-semibold text-gray-700">{page} / {totalPages}</span>
            <Button variant="ghost" className="size-9 px-0" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)} title="Halaman berikutnya">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
      <OwnershipImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={({ threshold: importedThreshold, firstTicker }) => {
          setThreshold(importedThreshold);
          setTickerInput(firstTicker);
          setSelectedTicker(firstTicker);
          setInvestorSearch("");
          setScope("all");
          setPage(1);
          setReloadKey((value) => value + 1);
          setImportOpen(false);
        }}
      />
    </div>
  );
}
