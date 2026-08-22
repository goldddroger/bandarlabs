"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CalendarDays, History, Pencil, Plus, Search, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  accumulationDataUpdatedAt,
  addSelectedStocks,
  formatChangePercent,
  formatStockPrice,
  getPriceChangePercent,
  hydrateFallbackEntryPrices,
  removeSelectedStock,
  resetSelectedStocks,
  RadarSignalType,
  signalLabel,
  stockUniverse,
  trendLabel,
  updateSelectedStockSignal,
  useSelectedAccumulationRows,
  useSelectedAccumulationStocks,
} from "@/components/accumulation/accumulation-store";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | RadarSignalType;
type LiveStockQuote = {
  ticker: string;
  price: number;
  changePercent: number;
  source: "Yahoo Finance" | "Google Finance" | "Fallback";
  updatedAt?: string;
};
type RecommendationRow = {
  id: string;
  stock: string;
  name: string;
  source: string;
  status: RadarSignalType;
  trend: "Uptrend" | "Sideways" | "Downtrend";
  monitoredAt: string;
  entryPrice: number;
  entryPriceSource?: "market" | "fallback";
  note: string;
};
type RecommendationForm = {
  stock: string;
  source: string;
  status: RadarSignalType;
  trend: RecommendationRow["trend"];
  monitoredAt: string;
  note: string;
};
type TrackRecordTarget = {
  ticker: string;
  name: string;
  source: string;
  status: string;
  startedAt: string;
  entryPrice: number;
  currentPrice: number;
};
type HistoryPriceRow = {
  date: string;
  close: number;
  volume: number | null;
};

const mentorRecommendations: RecommendationRow[] = [
  {
    id: "mentor-bbca",
    stock: "BBCA",
    name: "PT Bank Central Asia Tbk",
    source: "Pak Frans",
    status: "hold",
    trend: "Sideways",
    monitoredAt: "12 Agustus 2026",
    entryPrice: 0,
    entryPriceSource: "fallback",
    note: "Menunggu area demand dan konfirmasi volume.",
  },
  {
    id: "mentor-adro",
    stock: "ADRO",
    name: "PT Alamtri Resources Indonesia Tbk",
    source: "Pak Frans",
    status: "watchlist",
    trend: "Uptrend",
    monitoredAt: "09 Agustus 2026",
    entryPrice: 0,
    entryPriceSource: "fallback",
    note: "Pantau reaksi harga di area konsolidasi.",
  },
  {
    id: "mentor-brpt",
    stock: "BRPT",
    name: "PT Barito Pacific Tbk",
    source: "Pak Frans",
    status: "watchlist",
    trend: "Sideways",
    monitoredAt: "06 Agustus 2026",
    entryPrice: 0,
    entryPriceSource: "fallback",
    note: "Masuk daftar pantau karena mulai ada rotasi sektor.",
  },
];

const bandarTrailRecommendations: RecommendationRow[] = [
  {
    id: "bandar-tosk",
    stock: "TOSK",
    name: "PT Topindo Solusi Komunika Tbk",
    source: "Jejak Bandar / Pak Dhani",
    status: "accumulation",
    trend: "Uptrend",
    monitoredAt: "14 Agustus 2026",
    entryPrice: 0,
    entryPriceSource: "fallback",
    note: "Akumulasi terdeteksi dari konsistensi broker dominan.",
  },
  {
    id: "bandar-lapd",
    stock: "LAPD",
    name: "PT Leyand International Tbk",
    source: "Jejak Bandar / Pak Dhani",
    status: "hold",
    trend: "Downtrend",
    monitoredAt: "13 Agustus 2026",
    entryPrice: 0,
    entryPriceSource: "fallback",
    note: "Hold pemantauan karena harga masih volatile.",
  },
  {
    id: "bandar-ammn",
    stock: "AMMN",
    name: "PT Amman Mineral Internasional Tbk",
    source: "Jejak Bandar / Pak Dhani",
    status: "accumulation",
    trend: "Sideways",
    monitoredAt: "10 Agustus 2026",
    entryPrice: 0,
    entryPriceSource: "fallback",
    note: "Pantau lanjutan setelah volume bertahan di atas rata-rata.",
  },
];

const externalRecommendationStorageKey = "bandarlab.accumulation.externalRecommendations";
const externalRecommendationEventName = "bandarlab-external-recommendations-changed";

function getStockFromUniverse(ticker: string) {
  return stockUniverse.find((stock) => stock.stock === ticker.toUpperCase());
}

function getFallbackStockPrice(ticker: string) {
  return getStockFromUniverse(ticker)?.currentPrice ?? 0;
}

const defaultExternalRecommendations = [...mentorRecommendations, ...bandarTrailRecommendations].map((row) => ({
  ...row,
  entryPrice: getFallbackStockPrice(row.stock),
}));
const defaultExternalRecommendationSnapshot = JSON.stringify(defaultExternalRecommendations);

async function fetchStockQuotes(tickers: string[], signal?: AbortSignal) {
  if (tickers.length === 0) return {};

  const response = await fetch(`/api/stock-quotes?tickers=${tickers.join(",")}`, { signal });
  if (!response.ok) return {};

  const payload = (await response.json()) as { quotes?: Record<string, LiveStockQuote> };
  return payload.quotes ?? {};
}

function signalBadgeClass(signalType: RadarSignalType) {
  if (signalType === "accumulation") return "border-green-100 bg-green-50 text-green-700";
  if (signalType === "hold") return "border-blue-100 bg-blue-50 text-blue-700";
  return "border-amber-100 bg-amber-50 text-amber-700";
}

function StockTickerLink({ ticker, className }: { ticker: string; className?: string }) {
  return (
    <Link
      href={`/stocks/${ticker}`}
      className={cn(
        "inline-flex w-fit items-center rounded-md font-semibold text-gray-950 underline-offset-4 transition duration-150 hover:text-red-700 hover:underline focus-visible:ring-2 focus-visible:ring-red-500",
        className,
      )}
    >
      {ticker}
    </Link>
  );
}

function createRecommendationId(ticker: string, source: string) {
  return `${ticker}-${source}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function createBlankRecommendationForm(): RecommendationForm {
  return {
    stock: "",
    source: "Pak Frans",
    status: "watchlist",
    trend: "Sideways",
    monitoredAt: new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
    note: "",
  };
}

function parseExternalRecommendations(snapshot: string): RecommendationRow[] {
  try {
    const parsedRows = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsedRows)) return defaultExternalRecommendations;

    const rows = parsedRows
      .map((row) => {
        if (typeof row !== "object" || row === null || !("stock" in row)) return null;

        const stock = String(row.stock).toUpperCase();
        const profile = getStockFromUniverse(stock);
        if (!profile) return null;

        const status =
          "status" in row && (row.status === "accumulation" || row.status === "watchlist" || row.status === "hold")
            ? row.status
            : "watchlist";
        const trend =
          "trend" in row && (row.trend === "Uptrend" || row.trend === "Sideways" || row.trend === "Downtrend")
            ? row.trend
            : "Sideways";
        const entryPrice =
          "entryPrice" in row && typeof row.entryPrice === "number" && Number.isFinite(row.entryPrice)
            ? row.entryPrice
            : profile.currentPrice;
        const entryPriceSource =
          "entryPriceSource" in row && (row.entryPriceSource === "market" || row.entryPriceSource === "fallback")
            ? row.entryPriceSource
            : "fallback";

        return {
          id: "id" in row && typeof row.id === "string" && row.id.trim() ? row.id : createRecommendationId(stock, "source" in row ? String(row.source) : "external"),
          stock,
          name: profile.name,
          source: "source" in row && typeof row.source === "string" && row.source.trim() ? row.source : "Eksternal",
          status,
          trend,
          monitoredAt:
            "monitoredAt" in row && typeof row.monitoredAt === "string" && row.monitoredAt.trim()
              ? row.monitoredAt
              : "Belum ditentukan",
          entryPrice,
          entryPriceSource,
          note: "note" in row && typeof row.note === "string" ? row.note : "",
        };
      })
      .filter(Boolean) as RecommendationRow[];

    return rows;
  } catch {
    return defaultExternalRecommendations;
  }
}

function subscribeToExternalRecommendations(onStoreChange: () => void) {
  window.addEventListener(externalRecommendationEventName, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(externalRecommendationEventName, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getExternalRecommendationSnapshot() {
  return window.localStorage.getItem(externalRecommendationStorageKey) ?? defaultExternalRecommendationSnapshot;
}

function getServerExternalRecommendationSnapshot() {
  return defaultExternalRecommendationSnapshot;
}

function saveExternalRecommendations(rows: RecommendationRow[]) {
  window.localStorage.setItem(externalRecommendationStorageKey, JSON.stringify(rows));
  window.dispatchEvent(new Event(externalRecommendationEventName));
}

const indonesianMonths: Record<string, string> = {
  jan: "01",
  januari: "01",
  feb: "02",
  februari: "02",
  mar: "03",
  maret: "03",
  apr: "04",
  april: "04",
  mei: "05",
  jun: "06",
  juni: "06",
  jul: "07",
  juli: "07",
  agu: "08",
  agustus: "08",
  sep: "09",
  september: "09",
  okt: "10",
  oktober: "10",
  nov: "11",
  november: "11",
  des: "12",
  desember: "12",
};

function parseRadarDate(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[.,]/g, "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const match = normalized.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const month = indonesianMonths[match[2]];
  if (!month) return null;
  return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatVolume(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("id-ID").format(value);
}

function dailyCondition(changePercent: number) {
  if (changePercent > 0.25) return "Naik";
  if (changePercent < -0.25) return "Turun";
  return "Stabil";
}

function TrackRecordModal({ target, onClose }: { target: TrackRecordTarget; onClose: () => void }) {
  const [historyRows, setHistoryRows] = useState<HistoryPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const startDate = parseRadarDate(target.startedAt);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ ticker: target.ticker });
    if (startDate) params.set("start", startDate);

    fetch(`/api/stock-history?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as { rows?: HistoryPriceRow[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Histori harga belum tersedia.");
        return payload.rows ?? [];
      })
      .then((rows) => setHistoryRows(startDate ? rows : rows.slice(-60)))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Gagal mengambil histori harga.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [startDate, target.ticker]);

  const dailyRows = historyRows.map((row, index) => {
    const previousPrice = index === 0 ? target.entryPrice : historyRows[index - 1].close;
    const dailyChange = getPriceChangePercent(row.close, previousPrice);
    return {
      ...row,
      dailyChange,
      returnFromEntry: getPriceChangePercent(row.close, target.entryPrice),
      condition: dailyCondition(dailyChange),
    };
  });
  const latestPrice = dailyRows.at(-1)?.close ?? target.currentPrice;
  const totalReturn = getPriceChangePercent(latestPrice, target.entryPrice);
  const returns = dailyRows.map((row) => row.returnFromEntry);
  const bestReturn = returns.length > 0 ? Math.max(...returns) : totalReturn;
  const worstReturn = returns.length > 0 ? Math.min(...returns) : totalReturn;
  const daysAboveEntry = dailyRows.filter((row) => row.close > target.entryPrice).length;
  const aboveEntryRatio = dailyRows.length > 0 ? (daysAboveEntry / dailyRows.length) * 100 : 0;
  const chartStartDate = startDate ?? dailyRows[0]?.date ?? "Entry";
  const chartRows = [
    { date: chartStartDate, close: target.entryPrice, entry: target.entryPrice },
    ...dailyRows.map((row) => ({ date: row.date, close: row.close, entry: target.entryPrice })),
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/50 p-3 sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex min-w-0 max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="track-record-title">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="track-record-title" className="text-lg font-semibold text-gray-950">Track Record {target.ticker}</h2>
              <span className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{target.status}</span>
            </div>
            <p className="mt-1 truncate text-sm text-gray-600">{target.name} · {target.source}</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label="Tutup track record"><X className="size-5" /></button>
        </div>

        <div className="bandarlab-scrollbar min-w-0 overflow-y-auto p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" /> Mulai dipantau {target.startedAt}</span>
            <span>Harga masuk Rp {formatStockPrice(target.entryPrice)} · Stabil jika perubahan harian antara -0,25% dan +0,25%</span>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center text-sm text-gray-500">Memuat histori tanggal bursa...</div>
          ) : error ? (
            <div className="rounded-md border border-red-100 bg-red-50 p-5 text-center text-sm text-red-700">{error}</div>
          ) : (
            <>
              <div className="mb-4 grid overflow-hidden rounded-lg border border-gray-200 sm:grid-cols-2 xl:grid-cols-5">
                <TrackMetric label="Harga masuk" value={`Rp ${formatStockPrice(target.entryPrice)}`} />
                <TrackMetric label="Close terakhir" value={`Rp ${formatStockPrice(latestPrice)}`} />
                <TrackMetric label="Return benchmark" value={formatChangePercent(totalReturn)} tone={totalReturn} />
                <TrackMetric label="Best / Worst" value={`${formatChangePercent(bestReturn)} / ${formatChangePercent(worstReturn)}`} />
                <TrackMetric label="Hari di atas entry" value={`${aboveEntryRatio.toFixed(0)}%`} detail={`${daysAboveEntry} dari ${dailyRows.length} hari bursa`} />
              </div>

              <div className="mb-4 min-w-0 rounded-lg border border-gray-200 p-3 sm:p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-950">Harga sejak masuk radar</h3>
                  <p className="mt-1 text-xs text-gray-500">Garis abu-abu menunjukkan harga entry sebagai benchmark.</p>
                </div>
                {chartRows.length > 1 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(date) => String(date).slice(5).replace("-", "/")} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <YAxis domain={["auto", "auto"]} width={54} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value, name) => [`Rp ${formatStockPrice(Number(value))}`, name === "entry" ? "Harga masuk" : "Close"]} labelFormatter={(date) => formatHistoryDate(String(date))} />
                        <Line type="monotone" dataKey="entry" stroke="#9ca3af" strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
                        <Line type="monotone" dataKey="close" stroke="#dc2626" dot={{ r: 2.5 }} activeDot={{ r: 4 }} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-gray-500">Belum ada tanggal bursa setelah saham masuk radar.</div>
                )}
              </div>

              <div className="bandarlab-scrollbar min-w-0 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Tanggal Bursa", "Close", "Perubahan Harian", "Dari Harga Masuk", "Kondisi", "Volume"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {dailyRows.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Belum ada data penutupan sejak tanggal pemantauan.</td></tr> : null}
                    {[...dailyRows].reverse().map((row) => (
                      <tr key={row.date} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatHistoryDate(row.date)}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-950">Rp {formatStockPrice(row.close)}</td>
                        <td className={cn("whitespace-nowrap px-4 py-3 font-semibold", row.dailyChange > 0.25 ? "text-green-700" : row.dailyChange < -0.25 ? "text-red-700" : "text-gray-600")}>{formatChangePercent(row.dailyChange)}</td>
                        <td className={cn("whitespace-nowrap px-4 py-3 font-semibold", row.returnFromEntry > 0 ? "text-green-700" : row.returnFromEntry < 0 ? "text-red-700" : "text-gray-600")}>{formatChangePercent(row.returnFromEntry)}</td>
                        <td className="px-4 py-3"><ConditionBadge condition={row.condition} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatVolume(row.volume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TrackMetric({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: number }) {
  return <div className="border-b border-gray-200 p-3 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0"><p className="text-xs text-gray-500">{label}</p><p className={cn("mt-1 text-base font-semibold text-gray-950", typeof tone === "number" && tone > 0 && "text-green-700", typeof tone === "number" && tone < 0 && "text-red-700")}>{value}</p>{detail ? <p className="mt-1 text-xs text-gray-500">{detail}</p> : null}</div>;
}

function ConditionBadge({ condition }: { condition: string }) {
  const Icon = condition === "Naik" ? TrendingUp : condition === "Turun" ? TrendingDown : History;
  return <span className={cn("inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold", condition === "Naik" ? "bg-green-50 text-green-700" : condition === "Turun" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600")}><Icon className="size-3.5" />{condition}</span>;
}

function RecommendationTable({
  rows,
  liveQuotes,
  onHistory,
  onEdit,
  onDelete,
}: {
  rows: RecommendationRow[];
  liveQuotes: Record<string, LiveStockQuote>;
  onHistory: (target: TrackRecordTarget) => void;
  onEdit: (row: RecommendationRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="grid gap-3 p-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            Belum ada rekomendasi eksternal. Gunakan tombol Tambah Rekomendasi untuk mulai mencatat sumber pantauan.
          </div>
        ) : null}
        {rows.map((row) => {
          const currentPrice = liveQuotes[row.stock]?.price ?? getFallbackStockPrice(row.stock);
          const changePercent = getPriceChangePercent(currentPrice, row.entryPrice);

          return (
            <article key={row.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <StockTickerLink ticker={row.stock} className="text-base" />
                  <p className="mt-1 truncate text-sm text-gray-600">{row.name}</p>
                  <p className="mt-1 text-xs font-medium text-gray-500">{row.source}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-red-500"
                    type="button"
                    aria-label={`Track record ${row.stock}`}
                    onClick={() => onHistory({
                      ticker: row.stock,
                      name: row.name,
                      source: row.source,
                      status: signalLabel(row.status),
                      startedAt: row.monitoredAt,
                      entryPrice: row.entryPrice,
                      currentPrice,
                    })}
                  >
                    <History className="size-4" />
                  </button>
                  <button
                    className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-red-500"
                    type="button"
                    aria-label={`Edit rekomendasi ${row.stock}`}
                    onClick={() => onEdit(row)}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500"
                    type="button"
                    aria-label={`Hapus rekomendasi ${row.stock}`}
                    onClick={() => onDelete(row.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", signalBadgeClass(row.status))}>
                  {signalLabel(row.status)}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{row.trend}</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    changePercent > 0
                      ? "bg-green-50 text-green-700"
                      : changePercent < 0
                        ? "bg-red-50 text-red-700"
                        : "bg-gray-100 text-gray-600",
                  )}
                >
                  {formatChangePercent(changePercent)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-gray-50 p-2">
                  <p className="text-xs text-gray-500">Harga Saat Ini</p>
                  <p className="font-semibold text-gray-950">Rp {formatStockPrice(currentPrice)}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-2">
                  <p className="text-xs text-gray-500">Harga Masuk</p>
                  <p className="font-semibold text-gray-950">Rp {formatStockPrice(row.entryPrice)}</p>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-gray-50 p-2">
                <p className="text-xs text-gray-500">Mulai Dipantau</p>
                <p className="text-sm font-medium text-gray-700">{row.monitoredAt}</p>
                <p className="mt-2 text-sm text-gray-600">{row.note || "-"}</p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden md:block">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col />
            <col className="w-[116px]" />
          </colgroup>
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {["Saham", "Sumber", "Status", "Harga", "Kinerja", "Mulai", "Catatan", ""].map((head) => (
                <th key={head} className="px-4 py-3 font-semibold">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={8}>
                  Belum ada rekomendasi eksternal. Gunakan tombol Tambah Rekomendasi untuk mulai mencatat sumber pantauan.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const currentPrice = liveQuotes[row.stock]?.price ?? getFallbackStockPrice(row.stock);
              const changePercent = getPriceChangePercent(currentPrice, row.entryPrice);

              return (
                <tr key={row.id} className="border-t border-gray-100 transition duration-150 hover:bg-gray-50">
                  <td className="px-4 py-4 align-top">
                    <StockTickerLink ticker={row.stock} />
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500" title={row.name}>{row.name}</p>
                  </td>
                  <td className="px-4 py-4 align-top text-gray-600">
                    <p className="line-clamp-2 break-words text-xs leading-5" title={row.source}>{row.source}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className={cn("inline-flex max-w-full truncate rounded-full border px-2.5 py-1 text-xs font-semibold", signalBadgeClass(row.status))}>
                      {signalLabel(row.status)}
                    </span>
                    <span className="mt-2 block text-xs font-medium text-gray-500">{row.trend}</span>
                  </td>
                  <td className="px-4 py-4 align-top font-semibold text-gray-950">
                    <span className="block">Rp {formatStockPrice(currentPrice)}</span>
                    <span className="mt-1 block text-xs font-normal text-gray-500">Entry Rp {formatStockPrice(row.entryPrice)}</span>
                    {liveQuotes[row.stock]?.source ? (
                      <span className="block text-[11px] font-medium text-gray-400">{liveQuotes[row.stock]?.source}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span
                      className={cn(
                        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
                        changePercent > 0
                          ? "bg-green-50 text-green-700"
                          : changePercent < 0
                            ? "bg-red-50 text-red-700"
                            : "bg-gray-100 text-gray-600",
                      )}
                    >
                      {formatChangePercent(changePercent)}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top text-gray-600">{row.monitoredAt}</td>
                  <td className="px-4 py-4 align-top text-gray-600">
                    <p className="line-clamp-2 leading-5" title={row.note || undefined}>{row.note || "-"}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex justify-end gap-0.5">
                      <button
                        className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-red-500"
                        type="button"
                        aria-label={`Track record ${row.stock}`}
                        onClick={() => onHistory({
                          ticker: row.stock,
                          name: row.name,
                          source: row.source,
                          status: signalLabel(row.status),
                          startedAt: row.monitoredAt,
                          entryPrice: row.entryPrice,
                          currentPrice,
                        })}
                      >
                        <History className="size-4" />
                      </button>
                      <button
                        className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-red-500"
                        type="button"
                        aria-label={`Edit rekomendasi ${row.stock}`}
                        onClick={() => onEdit(row)}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500"
                        type="button"
                        aria-label={`Hapus rekomendasi ${row.stock}`}
                        onClick={() => onDelete(row.id)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AccumulationRadar() {
  const selectedStocks = useSelectedAccumulationStocks();
  const selectedRows = useSelectedAccumulationRows();
  const externalRecommendationSnapshot = useSyncExternalStore(
    subscribeToExternalRecommendations,
    getExternalRecommendationSnapshot,
    getServerExternalRecommendationSnapshot,
  );
  const externalRecommendations = useMemo(
    () => parseExternalRecommendations(externalRecommendationSnapshot),
    [externalRecommendationSnapshot],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [checkedStocks, setCheckedStocks] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [recommendationModalOpen, setRecommendationModalOpen] = useState(false);
  const [editingRecommendationId, setEditingRecommendationId] = useState<string | null>(null);
  const [trackRecordTarget, setTrackRecordTarget] = useState<TrackRecordTarget | null>(null);
  const [recommendationForm, setRecommendationForm] = useState<RecommendationForm>(() => createBlankRecommendationForm());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveStockQuote>>({});
  const [quoteLoading, setQuoteLoading] = useState(false);
  const selectedStocksKey = selectedStocks.join(",");
  const externalStocksKey = externalRecommendations.map((row) => row.stock).join(",");

  const availableStocks = stockUniverse.filter((stock) => !selectedStocks.includes(stock.stock));
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredAvailableStocks = normalizedQuery
    ? availableStocks.filter((stock) =>
        [stock.stock, stock.name, stock.sector].some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
    : availableStocks;
  const visibleAvailableStocks = filteredAvailableStocks;
  const validCheckedStocks = checkedStocks.filter((ticker) =>
    availableStocks.some((stock) => stock.stock === ticker),
  );
  const livePriceMap = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(liveQuotes)
          .filter(([, quote]) => Number.isFinite(quote.price))
          .map(([ticker, quote]) => [ticker, quote.price]),
      ),
    [liveQuotes],
  );
  const selectedRowsWithLivePrices = useMemo(
    () =>
      selectedRows.map((row) => ({
        ...row,
        currentPrice: liveQuotes[row.stock]?.price ?? row.currentPrice,
        quoteSource: liveQuotes[row.stock]?.source,
        quoteUpdatedAt: liveQuotes[row.stock]?.updatedAt,
      })),
    [liveQuotes, selectedRows],
  );
  const filteredSelectedRows =
    statusFilter === "all"
      ? selectedRowsWithLivePrices
      : selectedRowsWithLivePrices.filter((row) => row.signalType === statusFilter);

  useEffect(() => {
    if (!modalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  useEffect(() => {
    const selectedTickers = selectedStocksKey ? selectedStocksKey.split(",") : [];

    if (selectedTickers.length === 0) return;

    const abortController = new AbortController();

    async function fetchLiveQuotes() {
      setQuoteLoading(true);

      try {
        const quotes = await fetchStockQuotes(selectedTickers, abortController.signal);

        setLiveQuotes((currentQuotes) => ({ ...currentQuotes, ...quotes }));
        hydrateFallbackEntryPrices(
          Object.fromEntries(Object.entries(quotes).map(([ticker, quote]) => [ticker, quote.price])),
        );
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch live stock quotes", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setQuoteLoading(false);
        }
      }
    }

    void fetchLiveQuotes();

    return () => abortController.abort();
  }, [selectedStocksKey]);

  useEffect(() => {
    const externalTickers = externalStocksKey ? externalStocksKey.split(",") : [];

    if (externalTickers.length === 0) return;

    const abortController = new AbortController();

    async function fetchExternalQuotes() {
      setQuoteLoading(true);

      try {
        const quotes = await fetchStockQuotes(externalTickers, abortController.signal);
        setLiveQuotes((currentQuotes) => ({ ...currentQuotes, ...quotes }));

        const prices = Object.fromEntries(Object.entries(quotes).map(([ticker, quote]) => [ticker, quote.price]));
        const hydratedRecommendations = externalRecommendations.map((row) => {
          const marketPrice = prices[row.stock];

          if (row.entryPriceSource === "market" || !Number.isFinite(marketPrice)) {
            return row;
          }

          return {
            ...row,
            entryPrice: marketPrice,
            entryPriceSource: "market" as const,
          };
        });

        if (JSON.stringify(hydratedRecommendations) !== JSON.stringify(externalRecommendations)) {
          saveExternalRecommendations(hydratedRecommendations);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch external recommendation quotes", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setQuoteLoading(false);
        }
      }
    }

    void fetchExternalQuotes();

    return () => abortController.abort();
  }, [externalStocksKey, externalRecommendations]);

  async function addStock() {
    if (validCheckedStocks.length === 0) return;
    setQuoteLoading(true);

    try {
      const quotes = await fetchStockQuotes(validCheckedStocks);
      const entryPrices = Object.fromEntries(Object.entries(quotes).map(([ticker, quote]) => [ticker, quote.price]));

      setLiveQuotes((currentQuotes) => ({ ...currentQuotes, ...quotes }));
      addSelectedStocks(validCheckedStocks, { ...livePriceMap, ...entryPrices });
    } finally {
      setQuoteLoading(false);
    }

    setCheckedStocks([]);
    setSearchQuery("");
    setModalOpen(false);
  }

  function removeStock(ticker: string) {
    removeSelectedStock(ticker);
    setCheckedStocks((currentStocks) => currentStocks.filter((stock) => stock !== ticker));
  }

  function resetStocks() {
    resetSelectedStocks();
    setCheckedStocks([]);
  }

  function toggleCheckedStock(ticker: string) {
    setCheckedStocks((currentStocks) =>
      currentStocks.includes(ticker)
        ? currentStocks.filter((stock) => stock !== ticker)
        : [...currentStocks, ticker],
    );
  }

  function updateStockStatus(ticker: string, signalType: RadarSignalType) {
    updateSelectedStockSignal(ticker, signalType);
  }

  function openAddRecommendation() {
    setEditingRecommendationId(null);
    setRecommendationForm(createBlankRecommendationForm());
    setRecommendationModalOpen(true);
  }

  function openEditRecommendation(row: RecommendationRow) {
    setEditingRecommendationId(row.id);
    setRecommendationForm({
      stock: row.stock,
      source: row.source,
      status: row.status,
      trend: row.trend,
      monitoredAt: row.monitoredAt,
      note: row.note,
    });
    setRecommendationModalOpen(true);
  }

  function deleteRecommendation(id: string) {
    saveExternalRecommendations(externalRecommendations.filter((row) => row.id !== id));
  }

  async function saveRecommendation() {
    const ticker = recommendationForm.stock.trim().toUpperCase();
    const stock = getStockFromUniverse(ticker);

    if (!stock || !recommendationForm.source.trim()) return;

    const existingRow = editingRecommendationId
      ? externalRecommendations.find((row) => row.id === editingRecommendationId)
      : undefined;
    const tickerChanged = existingRow ? existingRow.stock !== ticker : true;
    let entryPrice = existingRow && !tickerChanged ? existingRow.entryPrice : livePriceMap[ticker];
    let entryPriceSource: RecommendationRow["entryPriceSource"] = existingRow && !tickerChanged ? existingRow.entryPriceSource : "market";

    if (!Number.isFinite(entryPrice)) {
      const quotes = await fetchStockQuotes([ticker]);
      const quote = quotes[ticker];

      if (quote?.price) {
        entryPrice = quote.price;
        entryPriceSource = "market";
        setLiveQuotes((currentQuotes) => ({ ...currentQuotes, ...quotes }));
      } else {
        entryPrice = stock.currentPrice;
        entryPriceSource = "fallback";
      }
    }

    const nextRow: RecommendationRow = {
      id: existingRow?.id ?? createRecommendationId(ticker, recommendationForm.source),
      stock: ticker,
      name: stock.name,
      source: recommendationForm.source.trim(),
      status: recommendationForm.status,
      trend: recommendationForm.trend,
      monitoredAt: recommendationForm.monitoredAt.trim() || "Belum ditentukan",
      entryPrice,
      entryPriceSource,
      note: recommendationForm.note.trim(),
    };

    saveExternalRecommendations(
      existingRow
        ? externalRecommendations.map((row) => (row.id === existingRow.id ? nextRow : row))
        : [nextRow, ...externalRecommendations],
    );
    setRecommendationModalOpen(false);
    setEditingRecommendationId(null);
  }

  return (
    <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold text-gray-950">Pemantauan Saham</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Kelola saham yang kamu pilih sendiri, lihat harga saat masuk watchlist, lalu bandingkan dengan harga market saat ini. Status membantu membedakan saham siap pantau, accumulation, dan hold.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
            <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-lg font-semibold text-gray-950">{selectedRows.length}</p>
              <p className="text-xs text-gray-500">Dipantau</p>
            </div>
            <div className="rounded-md border border-green-100 bg-green-50 px-3 py-2">
              <p className="text-lg font-semibold text-green-700">
                {selectedRows.filter((row) => row.signalType === "accumulation").length}
              </p>
              <p className="text-xs text-green-700">Accumulation</p>
            </div>
            <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-lg font-semibold text-blue-700">
                {selectedRows.filter((row) => row.signalType === "hold").length}
              </p>
              <p className="text-xs text-blue-700">Hold</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-950">Saham Pilihan</h2>
          <p className="mt-1 text-sm text-gray-600">
            {stockUniverse.length} saham tersedia dari daftar Indonesia. Radar membedakan saham yang sudah masuk fase accumulation dan saham siap pantau.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
              {selectedRows.length} aktif
            </span>
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
              {selectedRows.filter((row) => row.signalType === "accumulation").length} accumulation
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {selectedRows.filter((row) => row.signalType === "watchlist").length} siap pantau
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {selectedRows.filter((row) => row.signalType === "hold").length} hold
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {availableStocks.length} belum dipilih
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              Data update {accumulationDataUpdatedAt}
            </span>
          </div>
        </div>
        <div className="grid shrink-0 gap-2 sm:flex">
          <Button className="h-10 w-full whitespace-nowrap sm:w-auto" type="button" onClick={() => setModalOpen(true)}>
            <Plus className="size-4" />
            Tambah Saham
          </Button>
          <Button className="h-10 w-full sm:w-auto" variant="outline" type="button" onClick={resetStocks}>
            Reset
          </Button>
        </div>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-stock-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
              <div>
                <h3 id="add-stock-title" className="text-lg font-semibold text-gray-950">
                  Tambah Saham ke Radar
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Cari kode atau nama emiten, lalu pilih beberapa saham sekaligus.
                </p>
              </div>
              <button
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-red-500"
                type="button"
                aria-label="Tutup modal tambah saham"
                onClick={() => setModalOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="border-b border-gray-100 p-5">
              <label className="grid gap-2 text-sm text-gray-600" htmlFor="accumulation-stock-search">
                <span>Cari Saham</span>
                <span className="relative block">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="accumulation-stock-search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Contoh: AHAP, JATI, BBCA..."
                    className="h-11 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 transition duration-150 placeholder:text-gray-400 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    autoFocus
                  />
                </span>
              </label>
              <div className="mt-3 flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Menampilkan {visibleAvailableStocks.length} saham tersedia.
                </p>
                {validCheckedStocks.length > 0 ? (
                  <p className="font-semibold text-red-600">{validCheckedStocks.join(", ")} dipilih</p>
                ) : null}
              </div>
            </div>

            <div className="bandarlab-scrollbar grid max-h-[min(60vh,520px)] overflow-y-auto overscroll-contain p-3 sm:grid-cols-2">
              {visibleAvailableStocks.map((stock) => {
                const checked = validCheckedStocks.includes(stock.stock);

                return (
                  <label
                    key={stock.stock}
                    className={cn(
                      "flex min-h-14 cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-sm transition duration-150 hover:bg-gray-50",
                      checked && "bg-red-50 hover:bg-red-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCheckedStock(stock.stock)}
                      className="mt-1 size-4 rounded border-gray-300 accent-red-600"
                    />
                    <span className="min-w-0">
                      <span className={cn("block font-semibold text-gray-950", checked && "text-red-700")}>{stock.stock}</span>
                      <span className="block truncate text-xs text-gray-500">{stock.name}</span>
                    </span>
                  </label>
                );
              })}
              {visibleAvailableStocks.length === 0 ? (
                <p className="px-3 py-8 text-sm text-gray-500">Tidak ada saham yang cocok dengan pencarian.</p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              <Button className="h-10" variant="ghost" type="button" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button className="h-10" type="button" onClick={addStock} disabled={validCheckedStocks.length === 0}>
                <Plus className="size-4" />
                Tambah {validCheckedStocks.length > 0 ? validCheckedStocks.length : ""}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {recommendationModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="external-recommendation-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
              <div>
                <h3 id="external-recommendation-title" className="text-lg font-semibold text-gray-950">
                  {editingRecommendationId ? "Edit Rekomendasi Eksternal" : "Tambah Rekomendasi Eksternal"}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Simpan sumber rekomendasi, tanggal mulai dipantau, harga masuk watchlist, dan catatan pemantauan.
                </p>
              </div>
              <button
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-red-500"
                type="button"
                aria-label="Tutup modal rekomendasi eksternal"
                onClick={() => setRecommendationModalOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="bandarlab-scrollbar grid gap-4 overflow-y-auto p-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-gray-600" htmlFor="external-stock">
                <span>Kode Saham</span>
                <input
                  id="external-stock"
                  list="external-stock-options"
                  value={recommendationForm.stock}
                  onChange={(event) =>
                    setRecommendationForm((currentForm) => ({ ...currentForm, stock: event.target.value.toUpperCase() }))
                  }
                  placeholder="Contoh: LAPD"
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 transition duration-150 placeholder:text-gray-400 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
                <datalist id="external-stock-options">
                  {stockUniverse.map((stock) => (
                    <option key={stock.stock} value={stock.stock}>
                      {stock.name}
                    </option>
                  ))}
                </datalist>
              </label>

              <label className="grid gap-2 text-sm text-gray-600" htmlFor="external-source">
                <span>Sumber</span>
                <input
                  id="external-source"
                  value={recommendationForm.source}
                  onChange={(event) => setRecommendationForm((currentForm) => ({ ...currentForm, source: event.target.value }))}
                  placeholder="Pak Frans / Jejak Bandar / Pak Dhani"
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 transition duration-150 placeholder:text-gray-400 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-600" htmlFor="external-status">
                <span>Status</span>
                <select
                  id="external-status"
                  value={recommendationForm.status}
                  onChange={(event) =>
                    setRecommendationForm((currentForm) => ({
                      ...currentForm,
                      status: event.target.value as RadarSignalType,
                    }))
                  }
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 transition duration-150 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="accumulation">Accumulation</option>
                  <option value="watchlist">Siap Pantau</option>
                  <option value="hold">Hold</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-gray-600" htmlFor="external-trend">
                <span>Trend</span>
                <select
                  id="external-trend"
                  value={recommendationForm.trend}
                  onChange={(event) =>
                    setRecommendationForm((currentForm) => ({
                      ...currentForm,
                      trend: event.target.value as RecommendationRow["trend"],
                    }))
                  }
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 transition duration-150 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="Uptrend">Uptrend</option>
                  <option value="Sideways">Sideways</option>
                  <option value="Downtrend">Downtrend</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-gray-600 sm:col-span-2" htmlFor="external-monitored-at">
                <span>Mulai Dipantau</span>
                <input
                  id="external-monitored-at"
                  value={recommendationForm.monitoredAt}
                  onChange={(event) => setRecommendationForm((currentForm) => ({ ...currentForm, monitoredAt: event.target.value }))}
                  placeholder="Contoh: 17 Agustus 2026"
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 transition duration-150 placeholder:text-gray-400 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-600 sm:col-span-2" htmlFor="external-note">
                <span>Catatan</span>
                <textarea
                  id="external-note"
                  value={recommendationForm.note}
                  onChange={(event) => setRecommendationForm((currentForm) => ({ ...currentForm, note: event.target.value }))}
                  placeholder="Tulis alasan pemantauan, area harga, atau kondisi yang perlu dicek lagi."
                  className="min-h-24 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 transition duration-150 placeholder:text-gray-400 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              <Button className="h-10" variant="ghost" type="button" onClick={() => setRecommendationModalOpen(false)}>
                Batal
              </Button>
              <Button
                className="h-10"
                type="button"
                onClick={saveRecommendation}
                disabled={!recommendationForm.stock.trim() || !recommendationForm.source.trim()}
              >
                {editingRecommendationId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                {editingRecommendationId ? "Simpan Perubahan" : "Tambah Rekomendasi"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-1 px-1">
        <h1 className="text-xl font-semibold text-gray-950">Watchlist Pribadi</h1>
        <p className="text-sm leading-6 text-gray-600">
          Area ini berisi saham yang kamu masukkan sendiri. Harga masuk watchlist disimpan sebagai titik awal pemantauan, sementara harga saat ini mengikuti data Yahoo Finance atau Google Finance jika tersedia.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-950">Saham Aktif</h3>
            <p className="text-xs text-gray-500">
              Daftar ini otomatis dipakai juga di preview Accumulation Radar pada Dashboard. Data update {accumulationDataUpdatedAt}.
              {quoteLoading ? " Memuat harga market..." : " Harga saat ini dari Yahoo Finance atau Google Finance jika tersedia."}
            </p>
          </div>
          <label className="grid gap-2 text-sm text-gray-600 lg:w-52" htmlFor="radar-status-filter">
            <span>Filter Status</span>
            <select
              id="radar-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 transition duration-150 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="all">Semua Status</option>
              <option value="accumulation">Accumulation</option>
              <option value="watchlist">Siap Pantau</option>
              <option value="hold">Hold</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {filteredSelectedRows.map((row) => {
            const changePercent = getPriceChangePercent(row.currentPrice, row.entryPrice);

            return (
              <article key={row.stock} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <StockTickerLink ticker={row.stock} className="text-base" />
                    <p className="mt-1 truncate text-sm text-gray-600">{row.name}</p>
                    <p className="mt-1 text-xs font-medium text-gray-500">{row.sector}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-red-500"
                      type="button"
                      aria-label={`Track record ${row.stock}`}
                      onClick={() => setTrackRecordTarget({
                        ticker: row.stock,
                        name: row.name,
                        source: "Watchlist Pribadi",
                        status: signalLabel(row.signalType),
                        startedAt: row.addedAt,
                        entryPrice: row.entryPrice,
                        currentPrice: row.currentPrice,
                      })}
                    >
                      <History className="size-4" />
                    </button>
                    <button
                      className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500"
                      type="button"
                      aria-label={`Hapus ${row.stock} dari radar`}
                      onClick={() => removeStock(row.stock)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`mobile-status-${row.stock}`}>
                    Ubah status {row.stock}
                  </label>
                  <select
                    id={`mobile-status-${row.stock}`}
                    value={row.signalType}
                    onChange={(event) => updateStockStatus(row.stock, event.target.value as RadarSignalType)}
                    className={cn(
                      "h-8 rounded-full border px-2.5 text-xs font-semibold transition duration-150 focus:ring-2 focus:ring-red-100",
                      signalBadgeClass(row.signalType),
                    )}
                  >
                    <option value="accumulation">{signalLabel("accumulation")}</option>
                    <option value="watchlist">{signalLabel("watchlist")}</option>
                    <option value="hold">{signalLabel("hold")}</option>
                  </select>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      row.trend === "uptrend"
                        ? "bg-green-50 text-green-700"
                        : row.trend === "downtrend"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {trendLabel(row.trend)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      changePercent > 0
                        ? "bg-green-50 text-green-700"
                        : changePercent < 0
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {formatChangePercent(changePercent)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-gray-50 p-2">
                    <p className="text-xs text-gray-500">Harga Saat Ini</p>
                    <p className="font-semibold text-gray-950">Rp {formatStockPrice(row.currentPrice)}</p>
                    {row.quoteSource ? <p className="text-[11px] text-gray-400">{row.quoteSource}</p> : null}
                  </div>
                  <div className="rounded-md bg-gray-50 p-2">
                    <p className="text-xs text-gray-500">Harga Masuk</p>
                    <p className="font-semibold text-gray-950">Rp {formatStockPrice(row.entryPrice)}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">Masuk radar {row.addedAt}</p>
              </article>
            );
          })}
          {filteredSelectedRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              {selectedRows.length === 0
                ? "Belum ada saham di radar. Gunakan tombol Tambah Saham di bagian atas untuk memilih saham."
                : "Tidak ada saham yang cocok dengan filter status."}
            </div>
          ) : null}
        </div>
        <div className="bandarlab-scrollbar hidden overflow-x-auto md:block">
          <table className="min-w-[1180px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {["Stock", "Nama Emiten", "Sektor", "Status", "Harga Saat Ini", "Harga Masuk Watchlist", "Change", "Trend", "Masuk Radar", ""].map((head) => (
                  <th key={head || "actions"} className="px-4 py-3 font-semibold">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSelectedRows.map((row) => (
                <tr key={row.stock} className="border-t border-gray-100 transition duration-150 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <StockTickerLink ticker={row.stock} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.name}</td>
                  <td className="px-4 py-3 text-gray-600">{row.sector}</td>
                  <td className="px-4 py-3">
                    <label className="sr-only" htmlFor={`status-${row.stock}`}>
                      Ubah status {row.stock}
                    </label>
                    <select
                      id={`status-${row.stock}`}
                      value={row.signalType}
                      onChange={(event) => updateStockStatus(row.stock, event.target.value as RadarSignalType)}
                      className={cn(
                        "h-8 rounded-full border px-2.5 text-xs font-semibold transition duration-150 focus:ring-2 focus:ring-red-100",
                        signalBadgeClass(row.signalType),
                      )}
                    >
                      <option value="accumulation">{signalLabel("accumulation")}</option>
                      <option value="watchlist">{signalLabel("watchlist")}</option>
                      <option value="hold">{signalLabel("hold")}</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-950">
                    <span className="block">Rp {formatStockPrice(row.currentPrice)}</span>
                    {row.quoteSource ? (
                      <span className="block text-[11px] font-medium text-gray-400">{row.quoteSource}</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    Rp {formatStockPrice(row.entryPrice)}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const changePercent = getPriceChangePercent(row.currentPrice, row.entryPrice);

                      return (
                        <span
                          className={cn(
                            "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
                            changePercent > 0
                              ? "bg-green-50 text-green-700"
                              : changePercent < 0
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-100 text-gray-600",
                          )}
                        >
                          {formatChangePercent(changePercent)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
                        row.trend === "uptrend"
                          ? "bg-green-50 text-green-700"
                          : row.trend === "downtrend"
                            ? "bg-red-50 text-red-700"
                            : "bg-gray-100 text-gray-600",
                      )}
                    >
                      {trendLabel(row.trend)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{row.addedAt}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-red-500"
                        type="button"
                        aria-label={`Track record ${row.stock}`}
                        onClick={() => setTrackRecordTarget({
                          ticker: row.stock,
                          name: row.name,
                          source: "Watchlist Pribadi",
                          status: signalLabel(row.signalType),
                          startedAt: row.addedAt,
                          entryPrice: row.entryPrice,
                          currentPrice: row.currentPrice,
                        })}
                      >
                        <History className="size-4" />
                      </button>
                      <button
                        className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500"
                        type="button"
                        aria-label={`Hapus ${row.stock} dari radar`}
                        onClick={() => removeStock(row.stock)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSelectedRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-500" colSpan={10}>
                    {selectedRows.length === 0
                      ? "Belum ada saham di radar. Gunakan tombol Tambah Saham di bagian atas untuk memilih saham."
                      : "Tidak ada saham yang cocok dengan filter status."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 px-1">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-950">Rekomendasi Eksternal</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
              Bagian ini menyatukan saham yang sedang dipantau dari referensi luar, seperti mentor Pak Frans atau pendekatan jejak bandar Pak Dhani. Tanggal mulai dipantau dibuat jelas supaya konteks rekomendasinya tidak tercampur dengan watchlist pribadi.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button className="h-10 w-full whitespace-nowrap sm:w-auto" type="button" onClick={openAddRecommendation}>
              <Plus className="size-4" />
              Tambah Rekomendasi
            </Button>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                {externalRecommendations.length} rekomendasi
              </span>
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                {externalRecommendations.filter((row) => row.status === "accumulation").length} accumulation
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {externalRecommendations.filter((row) => row.status === "hold").length} hold
              </span>
            </div>
          </div>
        </div>
        <RecommendationTable
          rows={externalRecommendations}
          liveQuotes={liveQuotes}
          onHistory={setTrackRecordTarget}
          onEdit={openEditRecommendation}
          onDelete={deleteRecommendation}
        />
      </div>
      {trackRecordTarget ? (
        <TrackRecordModal
          key={`${trackRecordTarget.source}-${trackRecordTarget.ticker}-${trackRecordTarget.startedAt}`}
          target={trackRecordTarget}
          onClose={() => setTrackRecordTarget(null)}
        />
      ) : null}
    </section>
  );
}
