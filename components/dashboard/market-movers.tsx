"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type MarketMover = {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
};

type MarketMoversPayload = {
  gainers: MarketMover[];
  losers: MarketMover[];
  updatedAt: string;
  coveredStocks: number;
};

function formatPrice(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}

export function MarketMovers() {
  const [payload, setPayload] = useState<MarketMoversPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/market-movers", { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as MarketMoversPayload & { error?: string };
        if (!response.ok) throw new Error(result.error || "Market movers gagal dimuat.");
        setPayload(result);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Market movers gagal dimuat.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  function reload() {
    setLoading(true);
    setError(null);
    setReloadKey((value) => value + 1);
  }

  if (loading && !payload) {
    return <div className="mb-5 flex min-h-48 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500"><Loader2 className="mr-2 size-5 animate-spin text-red-600" />Memindai pergerakan saham IDX...</div>;
  }

  if (error && !payload) {
    return (
      <div className="mb-5 flex min-h-40 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-5 text-center">
        <p className="text-sm font-semibold text-gray-900">Market movers belum tersedia</p>
        <p className="mt-1 text-xs text-gray-500">{error}</p>
        <button type="button" onClick={reload} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"><RefreshCw className="size-3.5" />Coba Lagi</button>
      </div>
    );
  }

  return (
    <section className="mb-5" aria-labelledby="market-movers-heading">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="market-movers-heading" className="text-base font-semibold text-gray-950">Market Movers</h2>
          <p className="mt-1 text-xs text-gray-500">Peringkat perubahan harga harian dari {payload?.coveredStocks ?? 0} saham IDX.</p>
        </div>
        <p className="text-xs text-gray-400">Yahoo Finance · Update {payload?.updatedAt ?? "-"}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MoverTable title="Top Gainer" rows={payload?.gainers ?? []} tone="positive" />
        <MoverTable title="Top Loser" rows={payload?.losers ?? []} tone="negative" />
      </div>
    </section>
  );
}

function MoverTable({ title, rows, tone }: { title: string; rows: MarketMover[]; tone: "positive" | "negative" }) {
  const Icon = tone === "positive" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <span className={cn("flex size-8 items-center justify-center rounded-md", tone === "positive" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}><Icon className="size-4" /></span>
        <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map((row, index) => (
          <Link key={row.ticker} href={`/stocks/${row.ticker}`} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-gray-50">
            <span className="text-xs font-semibold text-gray-400">{index + 1}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900">{row.ticker}</span>
              <span className="block truncate text-xs text-gray-500">{row.name}</span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold text-gray-900">{formatPrice(row.price)}</span>
              <span className={cn("mt-0.5 block text-xs font-semibold", tone === "positive" ? "text-emerald-700" : "text-red-700")}>{row.changePercent > 0 ? "+" : ""}{row.changePercent.toFixed(2)}%</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
