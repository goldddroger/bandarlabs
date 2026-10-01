"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarRange, Loader2, Minus, UserMinus, UserPlus } from "lucide-react";
import type { ShareholderFivePercentRow, ShareholderOnePercentRow } from "@/lib/shareholder-ownership";
import type { OwnershipMovement, OwnershipMovementRow } from "@/lib/ownership-screener";
import { StockInvestorClassification } from "@/components/stocks/stock-investor-classification";
import { cn } from "@/lib/utils";

type Threshold = 1 | 5;
type ScreenerResponse = {
  dates?: string[];
  currentDate?: string;
  comparisonDate?: string;
  rows?: OwnershipMovementRow[];
  counts?: Record<OwnershipMovement, number>;
  snapshotRows?: number;
  error?: string;
};

const emptyCounts: Record<OwnershipMovement, number> = { new: 0, increased: 0, stable: 0, decreased: 0, exited: 0 };
const movementMeta: Record<OwnershipMovement, { label: string; className: string; icon: typeof ArrowUpRight }> = {
  new: { label: "Baru masuk", className: "bg-blue-50 text-blue-700", icon: UserPlus },
  increased: { label: "Akumulasi", className: "bg-green-50 text-green-700", icon: ArrowUpRight },
  stable: { label: "Stabil", className: "bg-gray-100 text-gray-700", icon: Minus },
  decreased: { label: "Distribusi", className: "bg-red-50 text-red-700", icon: ArrowDownRight },
  exited: { label: "Keluar", className: "bg-amber-50 text-amber-700", icon: UserMinus },
};

function formatShares(value: number | null) {
  return value === null ? "-" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number | null) {
  return value === null ? "-" : `${value.toFixed(2)}%`;
}

function formatSignedShares(value: number | null) {
  if (value === null) return "-";
  return `${value > 0 ? "+" : ""}${formatShares(value)}`;
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function SummaryCard({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail: string; tone?: "neutral" | "green" | "red" }) {
  return <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs font-medium uppercase text-gray-500">{label}</p><p className={cn("mt-2 text-xl font-semibold text-gray-950", tone === "green" && "text-green-700", tone === "red" && "text-red-700")}>{value}</p><p className="mt-1 text-xs text-gray-500">{detail}</p></div>;
}

function MovementBadge({ movement }: { movement: OwnershipMovement }) {
  const meta = movementMeta[movement];
  const Icon = meta.icon;
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}><Icon className="size-3.5" />{meta.label}</span>;
}

export function ShareholderOwnershipSection({ ticker, onePercentRows, fivePercentRows }: { ticker: string; onePercentRows: readonly ShareholderOnePercentRow[]; fivePercentRows: readonly ShareholderFivePercentRow[] }) {
  const [threshold, setThreshold] = useState<Threshold>(1);
  const [dates, setDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState("");
  const [comparisonDate, setComparisonDate] = useState("");
  const [rows, setRows] = useState<OwnershipMovementRow[]>([]);
  const [counts, setCounts] = useState(emptyCounts);
  const [snapshotRows, setSnapshotRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ threshold: String(threshold), ticker, pageSize: "100", sort: "change_desc" });
    if (currentDate) params.set("currentDate", currentDate);
    if (comparisonDate) params.set("comparisonDate", comparisonDate);
    fetch(`/api/ownership/screener?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as ScreenerResponse;
        if (!response.ok) throw new Error(payload.error || "Data ownership gagal dimuat.");
        return payload;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setDates(payload.dates ?? []);
        setCurrentDate(payload.currentDate ?? "");
        setComparisonDate(payload.comparisonDate ?? "");
        setRows(payload.rows ?? []);
        setCounts(payload.counts ?? emptyCounts);
        setSnapshotRows(Number(payload.snapshotRows ?? 0));
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setRows([]);
        setCounts(emptyCounts);
        setError(loadError instanceof Error ? loadError.message : "Data ownership gagal dimuat.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [comparisonDate, currentDate, threshold, ticker]);

  const comparisonOptions = useMemo(() => dates.filter((date) => date < currentDate), [currentDate, dates]);
  const accumulationShares = rows.reduce((total, row) => total + Math.max(0, Number(row.share_change ?? 0)), 0);
  const distributionShares = Math.abs(rows.reduce((total, row) => total + Math.min(0, Number(row.share_change ?? 0)), 0));
  const activeRows = rows.filter((row) => row.movement !== "exited").length;
  const legacyRows = threshold === 1 ? onePercentRows.length : fivePercentRows.length;

  function changeThreshold(nextThreshold: Threshold) {
    setLoading(true);
    setError(null);
    setThreshold(nextThreshold);
    setDates([]);
    setCurrentDate("");
    setComparisonDate("");
    setRows([]);
  }

  function changeCurrentDate(value: string) {
    setLoading(true);
    setError(null);
    setCurrentDate(value);
    setComparisonDate(dates.find((date) => date < value) ?? "");
  }

  function changeComparisonDate(value: string) {
    setLoading(true);
    setError(null);
    setComparisonDate(value);
  }

  return (
    <>
      <StockInvestorClassification ticker={ticker} />
      <section className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0"><h2 className="text-base font-semibold text-gray-950">Struktur Kepemilikan</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">Bandingkan laporan kepemilikan 1%–5% antarbulan untuk melihat investor yang sedang akumulasi, distribusi, baru masuk, keluar, atau stabil.</p></div>
            <div className="grid grid-cols-2 rounded-md border border-gray-200 bg-gray-50 p-1" aria-label="Ambang kepemilikan">
              {([1, 5] as const).map((value) => <button key={value} type="button" onClick={() => changeThreshold(value)} className={cn("h-9 rounded px-4 text-sm font-semibold transition", threshold === value ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:bg-white")}>{value}%+</button>)}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
            <label className="grid gap-1.5 text-xs font-semibold text-gray-600">Periode akhir<select value={currentDate} onChange={(event) => changeCurrentDate(event.target.value)} disabled={loading || dates.length === 0} className="h-11 min-w-0 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 disabled:bg-gray-100">{dates.length === 0 ? <option value="">Belum ada periode</option> : dates.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-semibold text-gray-600">Bandingkan dengan<select value={comparisonDate} onChange={(event) => changeComparisonDate(event.target.value)} disabled={loading || comparisonOptions.length === 0} className="h-11 min-w-0 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 disabled:bg-gray-100">{comparisonOptions.length === 0 ? <option value="">Tidak ada periode sebelumnya</option> : comparisonOptions.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}</select></label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500"><span className="inline-flex items-center gap-1.5"><CalendarRange className="size-3.5" />{comparisonDate && currentDate ? `${formatDate(comparisonDate)} → ${formatDate(currentDate)}` : "Pilih dua periode untuk dibandingkan"}</span><span>·</span><span>{loading ? legacyRows : snapshotRows} baris snapshot {threshold}%+</span></div>
        </div>

        <div className="p-4 sm:p-5">
          {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Pemegang Aktif" value={loading ? "-" : String(activeRows)} detail={`Snapshot ${threshold}%+ periode akhir`} />
            <SummaryCard label="Akumulasi" value={loading ? "-" : formatShares(accumulationShares)} detail={`${counts.increased} naik · ${counts.new} baru masuk`} tone="green" />
            <SummaryCard label="Distribusi" value={loading ? "-" : formatShares(distributionShares)} detail={`${counts.decreased} turun · ${counts.exited} keluar`} tone="red" />
            <SummaryCard label="Stabil" value={loading ? "-" : String(counts.stable)} detail="Jumlah saham tidak berubah" />
          </div>

          {loading ? <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="size-5 animate-spin" />Memuat perbandingan ownership...</div> : rows.length === 0 ? <div className="mt-5 rounded-md border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">Belum ada dua periode data {threshold}%+ yang dapat dibandingkan untuk {ticker}.</div> : <>
            <div className="mt-5 hidden overflow-x-auto rounded-md border border-gray-200 md:block"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Investor", "Klasifikasi", "Status", "Periode Sebelumnya", "Periode Akhir", "Perubahan", "% Akhir"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.row_key} className="border-t border-gray-100"><td className="px-4 py-3"><p className="font-semibold text-gray-950">{row.investor_name}</p><p className="mt-1 text-xs text-gray-500">{row.account_holder || row.domicile || "-"}</p></td><td className="px-4 py-3 text-gray-600">{row.classification || "-"}</td><td className="px-4 py-3"><MovementBadge movement={row.movement} /></td><td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatShares(row.previous_shares)}</td><td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{formatShares(row.shares)}</td><td className={cn("whitespace-nowrap px-4 py-3 font-semibold", Number(row.share_change) > 0 ? "text-green-700" : Number(row.share_change) < 0 ? "text-red-700" : "text-gray-600")}>{formatSignedShares(row.share_change)}</td><td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">{formatPercent(row.percentage)}</td></tr>)}</tbody></table></div>
            <div className="mt-5 grid gap-3 md:hidden">{rows.map((row) => <article key={row.row_key} className="rounded-md border border-gray-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-gray-950">{row.investor_name}</h3><p className="mt-1 text-xs text-gray-500">{row.classification || row.account_holder || "-"}</p></div><MovementBadge movement={row.movement} /></div><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs"><div><dt className="text-gray-500">Sebelumnya</dt><dd className="mt-1 font-semibold text-gray-800">{formatShares(row.previous_shares)}</dd></div><div><dt className="text-gray-500">Periode akhir</dt><dd className="mt-1 font-semibold text-gray-800">{formatShares(row.shares)}</dd></div><div><dt className="text-gray-500">Perubahan</dt><dd className={cn("mt-1 font-semibold", Number(row.share_change) > 0 ? "text-green-700" : Number(row.share_change) < 0 ? "text-red-700" : "text-gray-800")}>{formatSignedShares(row.share_change)}</dd></div><div><dt className="text-gray-500">Persentase akhir</dt><dd className="mt-1 font-semibold text-gray-800">{formatPercent(row.percentage)}</dd></div></dl></article>)}</div>
          </>}
        </div>
      </section>
    </>
  );
}
