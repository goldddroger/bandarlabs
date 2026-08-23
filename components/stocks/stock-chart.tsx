"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CandlestickChart, ChartNoAxesCombined, Loader2, Maximize2, RefreshCw, SlidersHorizontal } from "lucide-react";
import type { IChartApi, Time } from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChartRange = "1m" | "3m" | "6m" | "1y" | "3y" | "5y";
type ChartMode = "candlestick" | "line";
type IndicatorKey = "sma10" | "sma50" | "sma90" | "sma200" | "rsi14";
type HistoryRow = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};
type HoverData = HistoryRow | null;

const ranges: Array<{ value: ChartRange; label: string }> = [
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
];

const indicatorOptions: Array<{ key: IndicatorKey; label: string; color: string }> = [
  { key: "sma10", label: "MA 10", color: "#2563eb" },
  { key: "sma50", label: "MA 50", color: "#f59e0b" },
  { key: "sma90", label: "MA 90", color: "#7c3aed" },
  { key: "sma200", label: "MA 200", color: "#db2777" },
  { key: "rsi14", label: "RSI 14", color: "#0891b2" },
];

function calculateSma(rows: HistoryRow[], period: number) {
  return rows.flatMap((row, index) => {
    if (index < period - 1) return [];
    const window = rows.slice(index - period + 1, index + 1);
    const value = window.reduce((total, item) => total + item.close, 0) / period;
    return [{ time: row.date as Time, value }];
  });
}

function calculateRsi(rows: HistoryRow[], period: number) {
  if (rows.length <= period) return [];
  let averageGain = 0;
  let averageLoss = 0;
  for (let index = 1; index <= period; index += 1) {
    const difference = rows[index].close - rows[index - 1].close;
    averageGain += Math.max(difference, 0);
    averageLoss += Math.max(-difference, 0);
  }
  averageGain /= period;
  averageLoss /= period;

  return rows.flatMap((row, index) => {
    if (index < period) return [];
    if (index > period) {
      const difference = row.close - rows[index - 1].close;
      averageGain = ((averageGain * (period - 1)) + Math.max(difference, 0)) / period;
      averageLoss = ((averageLoss * (period - 1)) + Math.max(-difference, 0)) / period;
    }
    const value = averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss));
    return [{ time: row.date as Time, value }];
  });
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
}

function formatVolume(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function StockChart({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [range, setRange] = useState<ChartRange>("1y");
  const [mode, setMode] = useState<ChartMode>("candlestick");
  const [showVolume, setShowVolume] = useState(true);
  const [indicators, setIndicators] = useState<Record<IndicatorKey, boolean>>({ sma10: true, sma50: false, sma90: false, sma200: false, rsi14: false });
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [hover, setHover] = useState<HoverData>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const latest = hover ?? rows.at(-1) ?? null;
  const change = latest ? latest.close - latest.open : null;
  const changePercent = latest && latest.open > 0 ? ((latest.close - latest.open) / latest.open) * 100 : null;
  const dedupedRows = useMemo(() => Array.from(new Map(rows.map((row) => [row.date, row])).values()).sort((first, second) => first.date.localeCompare(second.date)), [rows]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(`/api/stock-history?ticker=${encodeURIComponent(ticker)}&range=${range}`, { signal: controller.signal })
        .then(async (response) => {
          const result = await response.json() as { rows?: HistoryRow[]; error?: string };
          if (!response.ok) throw new Error(result.error || "Histori harga gagal dimuat.");
          setRows(result.rows ?? []);
          setHover(null);
          if (!result.rows?.length) setError("Belum ada histori harga untuk rentang ini.");
        })
        .catch((fetchError: unknown) => {
          if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
          setRows([]);
          setError(fetchError instanceof Error ? fetchError.message : "Histori harga gagal dimuat.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [range, reloadKey, ticker]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || dedupedRows.length === 0) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let chart: IChartApi | null = null;

    async function renderChart() {
      const {
        CandlestickSeries,
        ColorType,
        CrosshairMode,
        HistogramSeries,
        LineSeries,
        createChart,
      } = await import("lightweight-charts");
      if (disposed || !container) return;

      chart = createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#4b5563", fontFamily: "Inter, sans-serif", attributionLogo: true },
        grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
        crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "#9ca3af", labelBackgroundColor: "#111827" }, horzLine: { color: "#9ca3af", labelBackgroundColor: "#111827" } },
        rightPriceScale: { borderColor: "#e5e7eb", scaleMargins: { top: 0.08, bottom: showVolume ? 0.28 : 0.08 } },
        timeScale: { borderColor: "#e5e7eb", timeVisible: false, rightOffset: 3, barSpacing: 7, minBarSpacing: 2 },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      });
      chartRef.current = chart;

      const priceSeries = mode === "candlestick"
        ? chart.addSeries(CandlestickSeries, { upColor: "#059669", downColor: "#dc2626", borderUpColor: "#059669", borderDownColor: "#dc2626", wickUpColor: "#059669", wickDownColor: "#dc2626", priceLineVisible: true })
        : chart.addSeries(LineSeries, { color: "#dc2626", lineWidth: 2, priceLineVisible: true, crosshairMarkerVisible: true });

      if (mode === "candlestick") {
        priceSeries.setData(dedupedRows.map((row) => ({ time: row.date as Time, open: row.open, high: row.high, low: row.low, close: row.close })));
      } else {
        priceSeries.setData(dedupedRows.map((row) => ({ time: row.date as Time, value: row.close })));
      }

      if (showVolume) {
        const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume", lastValueVisible: false, priceLineVisible: false });
        chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
        volumeSeries.setData(dedupedRows.map((row) => ({ time: row.date as Time, value: row.volume ?? 0, color: row.close >= row.open ? "rgba(5,150,105,0.35)" : "rgba(220,38,38,0.35)" })));
      }

      if (indicators.sma10) {
        const series = chart.addSeries(LineSeries, { title: "MA 10", color: "#2563eb", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
        series.setData(calculateSma(dedupedRows, 10));
      }
      if (indicators.sma50) {
        const series = chart.addSeries(LineSeries, { title: "MA 50", color: "#f59e0b", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
        series.setData(calculateSma(dedupedRows, 50));
      }
      if (indicators.sma90) {
        const series = chart.addSeries(LineSeries, { title: "MA 90", color: "#7c3aed", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
        series.setData(calculateSma(dedupedRows, 90));
      }
      if (indicators.sma200) {
        const series = chart.addSeries(LineSeries, { title: "MA 200", color: "#db2777", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
        series.setData(calculateSma(dedupedRows, 200));
      }
      if (indicators.rsi14) {
        const rsiData = calculateRsi(dedupedRows, 14);
        const rsiSeries = chart.addSeries(LineSeries, {
          title: "RSI 14",
          color: "#0891b2",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
        }, 1);
        rsiSeries.setData(rsiData);
        chart.panes()[1]?.setHeight(140);
      }

      const rowsByDate = new Map(dedupedRows.map((row) => [row.date, row]));
      chart.subscribeCrosshairMove((param) => {
        if (!param.time) return setHover(null);
        const date = typeof param.time === "string" ? param.time : "year" in param.time
          ? `${param.time.year}-${String(param.time.month).padStart(2, "0")}-${String(param.time.day).padStart(2, "0")}`
          : "";
        setHover(rowsByDate.get(date) ?? null);
      });
      chart.timeScale().fitContent();

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry && chart) chart.applyOptions({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) });
      });
      resizeObserver.observe(container);
    }

    void renderChart();
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chart?.remove();
      if (chartRef.current === chart) chartRef.current = null;
    };
  }, [dedupedRows, indicators, mode, showVolume]);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-gray-950">{ticker}</span>
          <div className="flex rounded-md border border-gray-200 bg-gray-50 p-1">
            {ranges.map((item) => <button key={item.value} type="button" onClick={() => setRange(item.value)} className={cn("h-8 min-w-10 rounded px-2 text-xs font-semibold", range === item.value ? "bg-white text-red-700 shadow-sm" : "text-gray-500 hover:text-gray-900")}>{item.label}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 sm:flex">
          <button type="button" onClick={() => setMode("candlestick")} title="Candlestick" aria-label="Candlestick" aria-pressed={mode === "candlestick"} className={cn("flex size-9 items-center justify-center rounded-md border", mode === "candlestick" ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 text-gray-500 hover:bg-gray-50")}><CandlestickChart className="size-4" /></button>
          <button type="button" onClick={() => setMode("line")} title="Line chart" aria-label="Line chart" aria-pressed={mode === "line"} className={cn("flex size-9 items-center justify-center rounded-md border", mode === "line" ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 text-gray-500 hover:bg-gray-50")}><ChartNoAxesCombined className="size-4" /></button>
          <button type="button" onClick={() => setShowVolume((value) => !value)} title="Tampilkan volume" aria-label="Tampilkan volume" aria-pressed={showVolume} className={cn("flex size-9 items-center justify-center rounded-md border", showVolume ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 text-gray-500 hover:bg-gray-50")}><BarChart3 className="size-4" /></button>
          <button type="button" onClick={() => chartRef.current?.timeScale().fitContent()} title="Fit chart" aria-label="Fit chart" className="flex size-9 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"><Maximize2 className="size-4" /></button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 sm:px-4">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600"><SlidersHorizontal className="size-3.5" />Indikator</span>
        {indicatorOptions.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setIndicators((current) => ({ ...current, [item.key]: !current[item.key] }))}
            aria-pressed={indicators[item.key]}
            className={cn("inline-flex h-7 items-center gap-1.5 rounded border px-2.5 text-xs font-semibold transition-colors", indicators[item.key] ? "border-gray-300 bg-white text-gray-900 shadow-sm" : "border-transparent text-gray-500 hover:border-gray-200 hover:bg-white")}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-px border-b border-gray-200 bg-gray-200 sm:grid-cols-6">
        {[['Tanggal', latest ? formatDate(latest.date) : '-'], ['Open', formatPrice(latest?.open)], ['High', formatPrice(latest?.high)], ['Low', formatPrice(latest?.low)], ['Close', formatPrice(latest?.close)], ['Volume', formatVolume(latest?.volume)]].map(([label, value]) => (
          <div key={label} className="min-w-0 bg-white px-3 py-2"><p className="text-[10px] font-semibold uppercase text-gray-400">{label}</p><p className="mt-0.5 truncate text-xs font-semibold text-gray-800">{value}</p></div>
        ))}
      </div>

      <div className={cn("relative w-full", indicators.rsi14 ? "h-[460px] sm:h-[580px]" : "h-[360px] sm:h-[460px]")}>
        <div ref={containerRef} className="size-full" />
        {loading ? <div className="absolute inset-0 flex items-center justify-center bg-white/85 text-sm text-gray-500"><Loader2 className="mr-2 size-5 animate-spin text-red-600" />Memuat chart {ticker}...</div> : null}
        {!loading && error ? <div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-5 text-center"><CandlestickChart className="size-9 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-900">Chart belum tersedia</p><p className="mt-1 max-w-md text-sm text-gray-500">{error}</p><Button type="button" variant="outline" className="mt-4" onClick={() => setReloadKey((value) => value + 1)}><RefreshCw className="size-4" />Coba Lagi</Button></div> : null}
      </div>

      <footer className="flex flex-col gap-1 border-t border-gray-200 bg-gray-50 px-4 py-2 text-[11px] text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Data harga harian: Yahoo Finance · {dedupedRows.length} candle</span>
        <span className={cn("font-semibold", change !== null && change >= 0 ? "text-emerald-700" : "text-red-700")}>{change === null || changePercent === null ? "-" : `${change >= 0 ? "+" : ""}${formatPrice(change)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`}</span>
        <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="font-medium text-gray-600 hover:text-red-700">Charts by TradingView</a>
      </footer>
    </div>
  );
}
