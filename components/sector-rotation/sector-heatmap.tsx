"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Grid2X2, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Quote = {
  price: number;
  changePercent: number;
  source?: string;
  updatedAt?: string;
};

type QuoteMap = Record<string, Quote>;

const sectors = [
  { name: "Keuangan", tickers: ["BBCA", "BBRI", "BMRI", "BBNI"] },
  { name: "Konsumen Primer", tickers: ["ICBP", "INDF", "UNVR", "AMRT"] },
  { name: "Infrastruktur", tickers: ["TLKM", "JSMR", "TOWR", "EXCL"] },
  { name: "Konsumen Non-Primer", tickers: ["MAPI", "ACES", "ERAA", "AUTO"] },
  { name: "Barang Baku", tickers: ["ANTM", "INCO", "MDKA", "INTP"] },
  { name: "Kesehatan", tickers: ["KLBF", "SIDO", "MIKA", "HEAL"] },
  { name: "Transportasi", tickers: ["ASSA", "SMDR", "BIRD", "GIAA"] },
  { name: "Properti", tickers: ["BSDE", "CTRA", "PWON", "SMRA"] },
  { name: "Teknologi", tickers: ["GOTO", "EMTK", "MTDL", "WIFI"] },
  { name: "Industri", tickers: ["ASII", "UNTR", "AKRA", "IMPC"] },
  { name: "Energi", tickers: ["ADRO", "PTBA", "ITMG", "MEDC"] },
] as const;

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function sectorTone(value: number | null) {
  if (value === null) return "border-gray-200 bg-gray-50";
  if (value >= 1) return "border-emerald-300 bg-emerald-100/80";
  if (value > 0) return "border-teal-200 bg-teal-50";
  if (value <= -0.75) return "border-red-300 bg-red-100/70";
  if (value < 0) return "border-rose-200 bg-rose-50/60";
  return "border-gray-200 bg-gray-50";
}

function valueTone(value: number | null) {
  if (value === null || value === 0) return "text-gray-600";
  return value > 0 ? "text-emerald-700" : "text-red-700";
}

export function SectorHeatmap() {
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const tickers = useMemo(() => Array.from(new Set(sectors.flatMap((sector) => [...sector.tickers]))).join(","), []);

  const loadQuotes = useCallback(async (signal?: AbortSignal, background = false) => {
    if (background) setRefreshing(true);
    try {
      const response = await fetch(`/api/stock-quotes?tickers=${encodeURIComponent(tickers)}`, { signal });
      const payload = await response.json() as { quotes?: QuoteMap; error?: string };
      if (!response.ok) throw new Error(payload.error || "Data sektor gagal dimuat.");
      setQuotes(payload.quotes ?? {});
      setLastUpdated(new Intl.DateTimeFormat("id-ID", { timeStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date()));
      setError(null);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
      setError(fetchError instanceof Error ? fetchError.message : "Data sektor gagal dimuat.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tickers]);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => void loadQuotes(controller.signal), 0);
    const interval = window.setInterval(() => void loadQuotes(undefined, true), 30_000);
    return () => {
      controller.abort();
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadQuotes]);

  const rows = sectors.map((sector) => {
    const available = sector.tickers.map((ticker) => quotes[ticker]).filter((quote): quote is Quote => Boolean(quote) && Number.isFinite(quote.changePercent));
    const average = available.length > 0 ? available.reduce((total, quote) => total + quote.changePercent, 0) / available.length : null;
    return { ...sector, average, availableCount: available.length };
  });

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-200 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700"><Grid2X2 className="size-4" /></span>
          <div><h2 className="text-base font-semibold text-gray-950">Heatmap Sektor IDX</h2><p className="mt-1 text-xs leading-5 text-gray-500">Rata-rata perubahan harian saham perwakilan setiap sektor.</p></div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-xs text-gray-400">{lastUpdated ? `Update ${lastUpdated}` : "Menunggu data"} · otomatis 30 detik</span>
          <button type="button" onClick={() => void loadQuotes(undefined, true)} disabled={refreshing} className="inline-flex size-9 items-center justify-center self-end rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60" aria-label="Perbarui heatmap" title="Perbarui heatmap"><RefreshCw className={cn("size-4", refreshing && "animate-spin")} /></button>
        </div>
      </div>

      {loading ? <div className="flex min-h-80 items-center justify-center text-sm text-gray-500"><Loader2 className="mr-2 size-5 animate-spin text-red-600" />Memuat pergerakan sektor...</div> : null}
      {!loading && error && Object.keys(quotes).length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center"><p className="text-sm font-semibold text-gray-900">Heatmap belum tersedia</p><p className="mt-1 text-xs text-gray-500">{error}</p><button type="button" onClick={() => void loadQuotes()} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"><RefreshCw className="size-4" />Coba Lagi</button></div> : null}

      {!loading && Object.keys(quotes).length > 0 ? (
        <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((sector) => (
            <article key={sector.name} className={cn("min-h-36 rounded-lg border p-4", sectorTone(sector.average))}>
              <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold text-gray-800">{sector.name}</h3><span className="text-[10px] font-medium text-gray-500">{sector.availableCount}/{sector.tickers.length}</span></div>
              <p className={cn("mt-2 text-xl font-semibold", valueTone(sector.average))}>{sector.average === null ? "-" : formatPercent(sector.average)}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {sector.tickers.map((ticker) => {
                  const quote = quotes[ticker];
                  return <Link key={ticker} href={`/stocks/${ticker}`} className="rounded bg-white/75 px-2 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-black/5 hover:bg-white hover:text-red-700">{ticker} {quote ? formatPercent(quote.changePercent) : "-"}</Link>;
                })}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <footer className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p>Data Yahoo Finance. Rata-rata sederhana saham perwakilan, bukan rekomendasi jual atau beli.</p>
        <a href="https://neobdm.tech/rotation-chart/" target="_blank" rel="noreferrer" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 font-semibold text-gray-700 hover:border-red-200 hover:text-red-700">Buka Rotation Chart NeoBDM <ArrowUpRight className="size-3.5" /></a>
      </footer>
    </section>
  );
}
