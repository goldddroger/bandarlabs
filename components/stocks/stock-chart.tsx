"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CandlestickChart, ChartNoAxesCombined, Loader2, Maximize2, Minus, MousePointer2, RefreshCw, SeparatorVertical, SlidersHorizontal, Trash2, Undo2 } from "lucide-react";
import type { IChartApi, IPriceLine, ISeriesApi, MouseEventParams, Time } from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChartRange = "1m" | "3m" | "6m" | "1y" | "3y" | "5y";
type ChartMode = "candlestick" | "line";
type IndicatorKey = "sma10" | "sma50" | "sma90" | "sma200" | "rsi14";
type DrawingTool = "cursor" | "horizontal" | "vertical";
type ChartDrawing =
  | { id: string; type: "horizontal"; price: number; color: string }
  | { id: string; type: "vertical"; time: string; color: string };
type VerticalPosition = { id: string; time: string; color: string; x: number };
type PriceSeriesApi = ISeriesApi<"Candlestick"> | ISeriesApi<"Line">;
type HistoryRow = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};
type HoverData = HistoryRow | null;
type HistoryMeta = {
  latestCandleDate: string | null;
  marketPrice: number | null;
  marketUpdatedAt: string | null;
};

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

const drawingColors = ["#dc2626", "#2563eb", "#059669", "#111827"];

function drawingStorageKey(ticker: string) {
  return `bandarlab:chart-drawings:${ticker.toUpperCase()}`;
}

function parseStoredDrawings(value: string | null): ChartDrawing[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): ChartDrawing[] => {
      if (!item || typeof item !== "object") return [];
      const drawing = item as Record<string, unknown>;
      const id = typeof drawing.id === "string" ? drawing.id : "";
      const color = typeof drawing.color === "string" && drawingColors.includes(drawing.color) ? drawing.color : drawingColors[0];
      if (!id) return [];
      if (drawing.type === "horizontal" && Number.isFinite(Number(drawing.price))) return [{ id, type: "horizontal", price: Number(drawing.price), color }];
      if (drawing.type === "vertical" && typeof drawing.time === "string") return [{ id, type: "vertical", time: drawing.time, color }];
      return [];
    });
  } catch {
    return [];
  }
}

function chartTimeToDate(time: Time) {
  if (typeof time === "string") return time;
  if (typeof time === "number") return new Date(time * 1000).toISOString().slice(0, 10);
  return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
}

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function StockChart({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<PriceSeriesApi | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const drawingsRef = useRef<ChartDrawing[]>([]);
  const drawingsLoadedRef = useRef(false);
  const drawingToolRef = useRef<DrawingTool>("cursor");
  const drawingColorRef = useRef(drawingColors[0]);
  const [range, setRange] = useState<ChartRange>("1y");
  const [mode, setMode] = useState<ChartMode>("candlestick");
  const [showVolume, setShowVolume] = useState(true);
  const [indicators, setIndicators] = useState<Record<IndicatorKey, boolean>>({ sma10: true, sma50: false, sma90: false, sma200: false, rsi14: false });
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [historyMeta, setHistoryMeta] = useState<HistoryMeta>({ latestCandleDate: null, marketPrice: null, marketUpdatedAt: null });
  const [hover, setHover] = useState<HoverData>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("cursor");
  const [drawingColor, setDrawingColor] = useState(drawingColors[0]);
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [verticalPositions, setVerticalPositions] = useState<VerticalPosition[]>([]);

  const latest = hover ?? rows.at(-1) ?? null;
  const change = latest ? latest.close - latest.open : null;
  const changePercent = latest && latest.open > 0 ? ((latest.close - latest.open) / latest.open) * 100 : null;
  const dedupedRows = useMemo(() => Array.from(new Map(rows.map((row) => [row.date, row])).values()).sort((first, second) => first.date.localeCompare(second.date)), [rows]);

  const syncVerticalPositions = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return setVerticalPositions([]);
    const width = chart.timeScale().width();
    const nextPositions = drawingsRef.current.flatMap((drawing): VerticalPosition[] => {
      if (drawing.type !== "vertical") return [];
      const coordinate = chart.timeScale().timeToCoordinate(drawing.time as Time);
      if (coordinate === null || coordinate < 0 || coordinate > width) return [];
      return [{ id: drawing.id, time: drawing.time, color: drawing.color, x: coordinate }];
    });
    setVerticalPositions(nextPositions);
  }, []);

  const syncHorizontalLines = useCallback(() => {
    const series = priceSeriesRef.current;
    if (!series) return;
    for (const line of priceLinesRef.current) series.removePriceLine(line);
    priceLinesRef.current = drawingsRef.current.flatMap((drawing): IPriceLine[] => {
      if (drawing.type !== "horizontal") return [];
      return [series.createPriceLine({ price: drawing.price, color: drawing.color, lineWidth: 2, axisLabelVisible: true, title: "Level" })];
    });
  }, []);

  useEffect(() => {
    drawingToolRef.current = drawingTool;
  }, [drawingTool]);

  useEffect(() => {
    drawingColorRef.current = drawingColor;
  }, [drawingColor]);

  useEffect(() => {
    drawingsLoadedRef.current = false;
    const timeout = window.setTimeout(() => {
      const stored = parseStoredDrawings(window.localStorage.getItem(drawingStorageKey(ticker)));
      drawingsRef.current = stored;
      drawingsLoadedRef.current = true;
      setDrawings(stored);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [ticker]);

  useEffect(() => {
    drawingsRef.current = drawings;
    if (drawingsLoadedRef.current) window.localStorage.setItem(drawingStorageKey(ticker), JSON.stringify(drawings));
    syncHorizontalLines();
    syncVerticalPositions();
  }, [drawings, syncHorizontalLines, syncVerticalPositions, ticker]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(`/api/stock-history?ticker=${encodeURIComponent(ticker)}&range=${range}&refresh=${reloadKey}`, {
        signal: controller.signal,
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
        .then(async (response) => {
          const result = await response.json() as Partial<HistoryMeta> & { rows?: HistoryRow[]; error?: string };
          if (!response.ok) throw new Error(result.error || "Histori harga gagal dimuat.");
          setRows(result.rows ?? []);
          setHistoryMeta({
            latestCandleDate: result.latestCandleDate ?? result.rows?.at(-1)?.date ?? null,
            marketPrice: result.marketPrice ?? null,
            marketUpdatedAt: result.marketUpdatedAt ?? null,
          });
          setHover(null);
          if (!result.rows?.length) setError("Belum ada histori harga untuk rentang ini.");
        })
        .catch((fetchError: unknown) => {
          if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
          setRows([]);
          setHistoryMeta({ latestCandleDate: null, marketPrice: null, marketUpdatedAt: null });
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
    let renderedPriceSeries: PriceSeriesApi | null = null;
    let clickHandler: ((param: MouseEventParams<Time>) => void) | null = null;

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
      priceSeriesRef.current = priceSeries as PriceSeriesApi;
      renderedPriceSeries = priceSeries as PriceSeriesApi;
      priceLinesRef.current = [];

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
      clickHandler = (param: MouseEventParams<Time>) => {
        const tool = drawingToolRef.current;
        if (tool === "cursor" || !param.point || (param.paneIndex ?? 0) !== 0) return;
        const id = window.crypto.randomUUID();
        if (tool === "horizontal") {
          const price = priceSeries.coordinateToPrice(param.point.y);
          if (price !== null && Number.isFinite(Number(price))) {
            setDrawings((current) => [...current, { id, type: "horizontal", price: Number(price), color: drawingColorRef.current }]);
          }
        } else {
          const time = param.time;
          if (time) setDrawings((current) => [...current, { id, type: "vertical", time: chartTimeToDate(time), color: drawingColorRef.current }]);
        }
        setDrawingTool("cursor");
      };
      chart.subscribeClick(clickHandler);
      chart.timeScale().subscribeVisibleLogicalRangeChange(syncVerticalPositions);
      chart.timeScale().fitContent();
      syncHorizontalLines();
      window.requestAnimationFrame(syncVerticalPositions);

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry && chart) {
          chart.applyOptions({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) });
          window.requestAnimationFrame(syncVerticalPositions);
        }
      });
      resizeObserver.observe(container);
    }

    void renderChart();
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (clickHandler) chart?.unsubscribeClick(clickHandler);
      chart?.timeScale().unsubscribeVisibleLogicalRangeChange(syncVerticalPositions);
      chart?.remove();
      if (chartRef.current === chart) chartRef.current = null;
      if (priceSeriesRef.current === renderedPriceSeries) priceSeriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, [dedupedRows, indicators, mode, showVolume, syncHorizontalLines, syncVerticalPositions]);

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

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 sm:px-4">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600"><MousePointer2 className="size-3.5" />Gambar</span>
        <button type="button" onClick={() => setDrawingTool((current) => current === "horizontal" ? "cursor" : "horizontal")} aria-pressed={drawingTool === "horizontal"} title="Tambah garis horizontal" className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold", drawingTool === "horizontal" ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:bg-gray-50")}><Minus className="size-4" />Horizontal</button>
        <button type="button" onClick={() => setDrawingTool((current) => current === "vertical" ? "cursor" : "vertical")} aria-pressed={drawingTool === "vertical"} title="Tambah garis vertikal" className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold", drawingTool === "vertical" ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:bg-gray-50")}><SeparatorVertical className="size-4" />Vertikal</button>
        <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />
        <div className="flex h-8 items-center gap-1 rounded-md border border-gray-200 px-2" aria-label="Warna garis">
          {drawingColors.map((color) => <button key={color} type="button" onClick={() => setDrawingColor(color)} aria-label={`Pilih warna ${color}`} aria-pressed={drawingColor === color} className={cn("size-4 rounded-full border-2", drawingColor === color ? "border-gray-950 ring-2 ring-gray-200" : "border-white")} style={{ backgroundColor: color }} />)}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-[11px] font-medium text-gray-400">{drawings.length} garis</span>
          <button type="button" onClick={() => setDrawings((current) => current.slice(0, -1))} disabled={drawings.length === 0} title="Urungkan garis terakhir" aria-label="Urungkan garis terakhir" className="inline-flex size-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35"><Undo2 className="size-4" /></button>
          <button type="button" onClick={() => setDrawings([])} disabled={drawings.length === 0} title="Hapus semua garis" aria-label="Hapus semua garis" className="inline-flex size-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-35"><Trash2 className="size-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px border-b border-gray-200 bg-gray-200 sm:grid-cols-6">
        {[['Tanggal', latest ? formatDate(latest.date) : '-'], ['Open', formatPrice(latest?.open)], ['High', formatPrice(latest?.high)], ['Low', formatPrice(latest?.low)], ['Close', formatPrice(latest?.close)], ['Volume', formatVolume(latest?.volume)]].map(([label, value]) => (
          <div key={label} className="min-w-0 bg-white px-3 py-2"><p className="text-[10px] font-semibold uppercase text-gray-400">{label}</p><p className="mt-0.5 truncate text-xs font-semibold text-gray-800">{value}</p></div>
        ))}
      </div>

      <div className={cn("relative w-full", indicators.rsi14 ? "h-[460px] sm:h-[580px]" : "h-[360px] sm:h-[460px]")}>
        <div ref={containerRef} className={cn("size-full", drawingTool !== "cursor" && "cursor-crosshair")} />
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {verticalPositions.map((position) => <div key={position.id} className="absolute inset-y-0 border-l-2" style={{ left: position.x, borderColor: position.color }}><span className="absolute left-1 top-2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm" style={{ backgroundColor: position.color }}>{formatDate(position.time)}</span></div>)}
        </div>
        {drawingTool !== "cursor" && !loading && !error ? <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-gray-950/85 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm">Klik chart untuk menaruh garis {drawingTool === "horizontal" ? "horizontal" : "vertikal"}</div> : null}
        {loading ? <div className="absolute inset-0 flex items-center justify-center bg-white/85 text-sm text-gray-500"><Loader2 className="mr-2 size-5 animate-spin text-red-600" />Memuat chart {ticker}...</div> : null}
        {!loading && error ? <div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-5 text-center"><CandlestickChart className="size-9 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-900">Chart belum tersedia</p><p className="mt-1 max-w-md text-sm text-gray-500">{error}</p><Button type="button" variant="outline" className="mt-4" onClick={() => setReloadKey((value) => value + 1)}><RefreshCw className="size-4" />Coba Lagi</Button></div> : null}
      </div>

      <footer className="flex flex-col gap-1 border-t border-gray-200 bg-gray-50 px-4 py-2 text-[11px] text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Yahoo Finance · {dedupedRows.length} candle
          {historyMeta.latestCandleDate ? ` · Candle terakhir ${formatDate(historyMeta.latestCandleDate)}` : ""}
          {historyMeta.marketUpdatedAt ? ` · Quote ${formatDateTime(historyMeta.marketUpdatedAt)} WIB` : ""}
          {historyMeta.marketPrice !== null ? ` (Rp ${formatPrice(historyMeta.marketPrice)})` : ""}
        </span>
        <span className={cn("font-semibold", change !== null && change >= 0 ? "text-emerald-700" : "text-red-700")}>{change === null || changePercent === null ? "-" : `${change >= 0 ? "+" : ""}${formatPrice(change)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`}</span>
        <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="font-medium text-gray-600 hover:text-red-700">Charts by TradingView</a>
      </footer>
    </div>
  );
}
