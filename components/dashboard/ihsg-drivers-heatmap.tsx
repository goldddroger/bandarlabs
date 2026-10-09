"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Grid2X2, Loader2, RefreshCw } from "lucide-react";
import { ResponsiveContainer, Treemap, type TreemapNode } from "recharts";
import { formatCapitalizationChange, rankIhsgDrivers, type IhsgDriver, type IhsgDriversPayload } from "@/lib/ihsg-drivers";
import { cn } from "@/lib/utils";

type Filter = "all" | "positive" | "negative";
const filters = [{ id: "all", label: "Semua" }, { id: "positive", label: "Penopang" }, { id: "negative", label: "Penekan" }] as const;

function percent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${date}T12:00:00+07:00`));
}

function tileColor(change: number) {
  if (change >= 3) return "#047857";
  if (change > 0) return "#0f766e";
  if (change <= -3) return "#be123c";
  if (change < 0) return "#dc2626";
  return "#6b7280";
}

function DriverTile(node: TreemapNode) {
  if (node.depth !== 1) return <g />;
  const row = node as TreemapNode & IhsgDriver;
  const { x, y, width, height } = node;
  const title = `${row.ticker}: ${percent(row.changePercent)}, dampak kapitalisasi ${formatCapitalizationChange(row.capitalizationChange)}. ${row.name}.`;
  return (
    <Link href={`/stocks/${row.ticker}`} aria-label={title} className="outline-none focus-visible:opacity-75" data-driver-ticker={row.ticker}>
      <title>{title}</title>
      <rect x={x} y={y} width={Math.max(width, 0)} height={Math.max(height, 0)} fill={tileColor(row.changePercent)} rx={3} />
      {width >= 52 && height >= 27 ? <text x={x + width / 2} y={y + height / 2 - (height >= 52 ? 9 : 0)} fill="white" fontSize={13} fontWeight={600} textAnchor="middle" dominantBaseline="middle">{row.ticker}</text> : null}
      {width >= 64 && height >= 52 ? <text x={x + width / 2} y={y + height / 2 + 11} fill="white" fontSize={12} textAnchor="middle" dominantBaseline="middle">{percent(row.changePercent)}</text> : null}
      {width >= 140 && height >= 100 ? <text x={x + width / 2} y={y + height / 2 + 34} fill="#ffffffd9" fontSize={11} textAnchor="middle" dominantBaseline="middle">{formatCapitalizationChange(row.capitalizationChange)}</text> : null}
    </Link>
  );
}

export function IhsgDriversHeatmap() {
  const [payload, setPayload] = useState<IhsgDriversPayload | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [chartWidth, setChartWidth] = useState(800);
  const requestRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    try {
      const response = await fetch("/api/ihsg-drivers", { signal: controller.signal, cache: "no-store" });
      const result = await response.json() as IhsgDriversPayload & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Heatmap gagal dimuat.");
      if (!controller.signal.aborted) {
        setPayload(result);
        setError(null);
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Heatmap gagal dimuat.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, []);

  useEffect(() => {
    const start = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 120_000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
      requestRef.current?.abort();
    };
  }, [load]);

  const chartRows = useMemo(() => (payload?.rows ?? [])
    .filter((row) => filter === "positive" ? row.capitalizationChange > 0 : filter === "negative" ? row.capitalizationChange < 0 : row.capitalizationChange !== 0)
    .slice(0, chartWidth < 480 ? 12 : 24).map((row) => ({ ...row, impact: Math.abs(row.capitalizationChange) })), [chartWidth, filter, payload]);

  return (
    <section aria-labelledby="ihsg-drivers-heading" className="mb-6 min-w-0 border-y border-gray-200 py-5">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Grid2X2 aria-hidden="true" className="size-4 shrink-0 text-red-600" />
            <h2 id="ihsg-drivers-heading" className="text-base font-semibold text-gray-950">Penggerak IHSG</h2>
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">Estimasi</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-gray-500">Proksi kapitalisasi penuh, bukan kontribusi poin resmi IHSG.</p>
          {payload ? <p className="mt-1 text-xs leading-5 text-gray-500">Sesi {dateLabel(payload.tradingDate)} vs {dateLabel(payload.previousDate)} · {payload.coveredStocks}/{payload.totalStocks} saham tercakup</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Filter penggerak IHSG" className="inline-flex min-w-0 rounded-md border border-gray-200 bg-gray-50 p-1">
            {filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={cn("min-h-8 rounded px-2.5 text-gray-600 transition hover:text-gray-950", filter === item.id && "bg-white text-gray-950 shadow-sm")}><span className="text-xs font-medium">{item.label}</span></button>)}
          </div>
          <button type="button" aria-label="Perbarui penggerak IHSG" title="Perbarui penggerak IHSG" disabled={busy} onClick={() => void load()} className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"><RefreshCw aria-hidden="true" className={cn("size-4", busy && "animate-spin")} /></button>
        </div>
      </header>

      {error ? <p role="alert" className="mb-3 text-sm text-red-700">{error}{payload ? ` Data yang tampil tetap sesi ${dateLabel(payload.tradingDate)}.` : ""}</p> : null}
      {!payload ? (
        <div aria-live="polite" className="flex h-72 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-500">
          {busy ? <><Loader2 aria-hidden="true" className="mr-2 size-5 shrink-0 animate-spin" />Memuat saham penggerak...</> : <span>Heatmap belum tersedia. Perbarui untuk mencoba kembali.</span>}
        </div>
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-1 divide-y divide-gray-200 border-y border-gray-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[{ name: "Dampak positif", value: payload.positiveChange }, { name: "Dampak negatif", value: payload.negativeChange }, { name: "Dampak bersih", value: payload.netChange }].map((item) => (
              <div key={item.name} className="min-w-0 px-3 py-3 first:pl-0">
                <dt className="text-xs text-gray-500">{item.name}</dt>
                <dd className={cn("mt-1 text-base font-semibold tabular-nums", item.value > 0 ? "text-emerald-700" : item.value < 0 ? "text-red-700" : "text-gray-600")}>{formatCapitalizationChange(item.value)}</dd>
              </div>
            ))}
          </dl>
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="flex min-w-0 flex-col">
              <div aria-label="Heatmap dampak kapitalisasi saham" className="relative h-[360px] min-w-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50 sm:h-[440px] xl:h-auto xl:min-h-[400px] xl:flex-1">
                <div className="absolute inset-1">
                  {chartRows.length ? <ResponsiveContainer width="100%" height="100%" minWidth={0} onResize={(width) => setChartWidth(width)}>
                    <Treemap data={chartRows} dataKey="impact" nameKey="ticker" content={DriverTile} isAnimationActive={false} nodeGap={3} aspectRatio={1.1} />
                  </ResponsiveContainer> : <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">Tidak ada saham {filter === "positive" ? "penopang" : filter === "negative" ? "penekan" : "yang bergerak"} pada sesi ini.</div>}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-5 text-gray-500">
                <p>{chartRows.length} saham dengan dampak terbesar · luas = perubahan kapitalisasi absolut</p>
                <div className="flex gap-3"><span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-teal-700" />Naik</span><span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-red-600" />Turun</span></div>
              </div>
            </div>
            <div className="grid min-w-0 content-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <DriverRanking title="Penopang terbesar" rows={rankIhsgDrivers(payload.rows, "positive")} />
              <DriverRanking title="Penekan terbesar" rows={rankIhsgDrivers(payload.rows, "negative")} />
            </div>
          </div>
          <footer className="mt-4 flex flex-col gap-2 text-xs leading-5 text-gray-500 sm:flex-row sm:justify-between">
            <p className="max-w-3xl">Harga: Yahoo Finance. Jumlah saham: BEI {dateLabel(payload.sharesAsOf)}. {payload.excludedStocks} saham tidak tercakup atau sesi tidak cocok. Estimasi tidak menyesuaikan free float, batas bobot, maupun perubahan jumlah saham setelah tanggal sumber.</p>
            <a href="https://www.idx.co.id/id/produk/indeks/" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 self-start font-medium text-gray-700 hover:text-red-700">Metodologi BEI <ExternalLink aria-hidden="true" className="size-3" /></a>
          </footer>
        </>
      )}
    </section>
  );
}

function DriverRanking({ title, rows }: { title: string; rows: IhsgDriver[] }) {
  return (
    <section aria-label={title} className="min-w-0">
      <h3 className="border-b border-gray-200 pb-1.5 text-sm font-semibold text-gray-950">{title}</h3>
      {!rows.length ? <p className="py-4 text-xs text-gray-500">Tidak ada saham pada kategori ini.</p> : <ol className="divide-y divide-gray-100">
        {rows.map((row, index) => <li key={row.ticker}><Link href={`/stocks/${row.ticker}`} className="flex min-w-0 items-center gap-2 py-2 hover:bg-gray-50" title={row.name}>
          <span className="w-4 shrink-0 text-xs tabular-nums text-gray-400">{index + 1}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-900">{row.ticker}</span><span className="block text-[11px] text-gray-500">Rp {new Intl.NumberFormat("id-ID").format(row.price)}</span></span>
          <span className={cn("shrink-0 text-right tabular-nums", row.capitalizationChange > 0 ? "text-emerald-700" : "text-red-700")}><span className="block text-xs font-semibold">{formatCapitalizationChange(row.capitalizationChange)}</span><span className="block text-[11px]">{percent(row.changePercent)}</span></span>
        </Link></li>)}
      </ol>}
    </section>
  );
}
