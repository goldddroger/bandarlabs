"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, Loader2 } from "lucide-react";
import { featuredInvestorClassifications, type InvestorClassificationHoldings } from "@/lib/ownership-classification";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Snapshot = { report_date: string; total_scripless: number; holdings: InvestorClassificationHoldings };

function share(row: Snapshot | null, key: string) {
  return row && row.total_scripless > 0 ? (Number(row.holdings?.[key] ?? 0) / Number(row.total_scripless)) * 100 : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function StockInvestorClassification({ ticker }: { ticker: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.from("ownership_classification_snapshots").select("report_date,total_scripless,holdings").eq("ticker", ticker).order("report_date", { ascending: false }).limit(2).then(({ data }) => {
      if (!cancelled) { setRows((data ?? []) as Snapshot[]); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [supabase, ticker]);

  if (loading) return <div className="mb-5 flex min-h-28 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500"><Loader2 className="mr-2 size-4 animate-spin" />Memuat klasifikasi investor...</div>;
  const current = rows[0] ?? null;
  const previous = rows[1] ?? null;
  if (!current) return null;

  return <section className="mb-5 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"><div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-gray-950">Komposisi Investor Scripless</h3><p className="mt-1 text-xs text-gray-500">Persentase setiap klasifikasi terhadap total saham scripless, bukan free float.</p></div><span className="inline-flex w-fit items-center gap-2 text-xs font-medium text-emerald-700"><Database className="size-3.5" />{formatDate(current.report_date)}</span></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{featuredInvestorClassifications.map((category) => { const currentShare = share(current, category.key); const previousShare = share(previous, category.key); const change = currentShare !== null && previousShare !== null ? currentShare - previousShare : null; return <div key={category.key} className="border-b border-gray-100 p-4 sm:border-r xl:border-b-0"><p className="text-xs text-gray-500">{category.label}</p><p className="mt-1.5 text-lg font-semibold text-gray-950">{currentShare?.toLocaleString("id-ID", { maximumFractionDigits: 2 }) ?? "-"}%</p><p className={cn("mt-1 text-xs font-semibold", change === null || change === 0 ? "text-gray-400" : change > 0 ? "text-emerald-700" : "text-red-700")}>{change === null ? "Belum ada pembanding" : `${change > 0 ? "+" : ""}${change.toLocaleString("id-ID", { maximumFractionDigits: 2 })} pp`}</p></div>; })}</div></section>;
}
