"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BellRing, CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  bestEntryChangeEventName,
  emitBestEntryChange,
  getBestEntryLastFiredKey,
  getBestEntrySnapshot,
  getBestEntryStorageKey,
  parseBestEntrySnapshot,
} from "@/lib/best-entry-store";
import { getFcaWatchSnapshot, markFcaAlertsRead, parseFcaWatchSnapshot, subscribeFcaWatch } from "@/lib/fca-watch-store";
import { idxListedStocks } from "@/lib/idx-listed-stocks";
import { stockCaResearchChangeEvent, type StockCaResearchNote } from "@/lib/stock-ca-research";
import { cn } from "@/lib/utils";

type QuoteMap = Record<
  string,
  {
    price: number;
    source?: string;
    updatedAt?: string;
  }
>;

const stockNameByTicker: Map<string, string> = new Map(idxListedStocks.map((stock) => [stock.ticker, stock.name]));

function subscribeBestEntry(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(bestEntryChangeEventName, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(bestEntryChangeEventName, onStoreChange);
  };
}

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function NotificationCenter() {
  const { confirm, confirmationDialog } = useConfirmDialog();
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [caReminders, setCaReminders] = useState<StockCaResearchNote[]>([]);
  const snapshot = useSyncExternalStore(subscribeBestEntry, getBestEntrySnapshot, () => "[]");
  const fcaSnapshot = useSyncExternalStore(subscribeFcaWatch, getFcaWatchSnapshot, () => "[]");
  const entries = useMemo(() => parseBestEntrySnapshot(snapshot), [snapshot]);
  const fcaWatches = useMemo(() => parseFcaWatchSnapshot(fcaSnapshot), [fcaSnapshot]);
  const fcaAlerts = fcaWatches.filter((record) => record.alert);
  const tickers = useMemo(() => entries.map((entry) => entry.ticker).join(","), [entries]);

  const rows = entries.map((entry) => {
    const quote = quotes[entry.ticker];
    const currentPrice = quote?.price ?? null;
    const reached = currentPrice !== null && currentPrice <= entry.price;
    const gapPercent = currentPrice !== null && entry.price > 0 ? ((currentPrice - entry.price) / entry.price) * 100 : null;

    return {
      ...entry,
      name: stockNameByTicker.get(entry.ticker) ?? `${entry.ticker} Stock`,
      currentPrice,
      reached,
      gapPercent,
      source: quote?.source,
      quoteUpdatedAt: quote?.updatedAt,
    };
  });
  const reachedRows = rows.filter((row) => row.reached);
  const waitingRows = rows.filter((row) => !row.reached);

  useEffect(() => {
    if (!tickers) return;

    const controller = new AbortController();
    async function loadQuotes() {
      try {
        const response = await fetch(`/api/stock-quotes?tickers=${encodeURIComponent(tickers)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { quotes?: QuoteMap };
        if (!controller.signal.aborted) {
          setQuotes(payload.quotes ?? {});
        }
      } catch {
        if (!controller.signal.aborted) setQuotes({});
      }
    }

    void loadQuotes();
    return () => controller.abort();
  }, [tickers]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadCaReminders() {
      try {
        const response = await fetch("/api/stock-ca-research?due=1", { signal: controller.signal });
        const payload = response.ok ? await response.json() as { notes?: StockCaResearchNote[] } : { notes: [] };
        if (!controller.signal.aborted) setCaReminders(payload.notes ?? []);
      } catch {
        if (!controller.signal.aborted) setCaReminders([]);
      }
    }
    void loadCaReminders();
    window.addEventListener(stockCaResearchChangeEvent, loadCaReminders);
    return () => { controller.abort(); window.removeEventListener(stockCaResearchChangeEvent, loadCaReminders); };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(markFcaAlertsRead, 800);
    return () => window.clearTimeout(timeout);
  }, [fcaSnapshot]);

  async function deleteEntry(ticker: string) {
    const entry = entries.find((item) => item.ticker === ticker);
    const confirmed = await confirm({
      title: "Hapus alert saham?",
      description: "Best entry ini akan dihapus dari notifikasi dan detail saham.",
      subject: `${ticker} · ${formatPrice(entry?.price ?? null)}`,
      confirmLabel: "Hapus Alert",
    });
    if (!confirmed) return;
    window.localStorage.removeItem(getBestEntryStorageKey(ticker));
    window.localStorage.removeItem(getBestEntryLastFiredKey(ticker));
    emitBestEntryChange();
    toast.info(`Alert ${ticker} dihapus`);
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-gray-950">Notifikasi</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Pusat notifikasi untuk best entry, perubahan FCA, dan reminder research corporate action.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <div className="rounded-md border border-green-100 bg-green-50 px-3 py-2">
            <p className="text-xs font-medium text-green-700">Siap Dicek</p>
            <p className="mt-1 text-xl font-semibold text-green-800">{reachedRows.length}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
            <p className="text-xs font-medium text-gray-500">Dipantau</p>
            <p className="mt-1 text-xl font-semibold text-gray-950">{entries.length}</p>
          </div>
          <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2">
            <p className="text-xs font-medium text-amber-700">Alert FCA</p>
            <p className="mt-1 text-xl font-semibold text-amber-800">{fcaAlerts.length}</p>
          </div>
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-xs font-medium text-blue-700">Reminder CA</p>
            <p className="mt-1 text-xl font-semibold text-blue-800">{caReminders.length}</p>
          </div>
        </div>
      </div>

      {caReminders.length > 0 ? (
        <div className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-gray-950">Research Corporate Action Perlu Dicek</h2>
          <div className="grid gap-3">
            {caReminders.map((reminder) => (
              <Link key={reminder.id} href={`/stocks/${reminder.ticker}#corporate-action`} className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 hover:bg-blue-50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><div className="flex flex-wrap items-center gap-2"><span className="text-lg font-semibold text-gray-950">{reminder.ticker}</span><span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{reminder.actionType}</span></div><p className="mt-1 text-sm font-medium text-gray-800">{reminder.title}</p><p className="mt-1 text-xs text-gray-500">Reminder {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(`${reminder.reminderDate}T00:00:00+07:00`))}</p></div>
                  <span className="text-xs font-semibold text-blue-700">Buka research</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {fcaAlerts.length > 0 ? (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-gray-950">Perubahan FCA</h2><Link href="/fca" className="text-xs font-semibold text-red-700 hover:underline">Buka tracker</Link></div>
          <div className="grid gap-3">
            {fcaAlerts.map((record) => (
              <div key={record.ticker} className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><div className="flex items-center gap-2"><Link href={`/stocks/${record.ticker}`} className="text-lg font-semibold text-gray-950 hover:text-red-700">{record.ticker}</Link><span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">FCA</span></div><p className="mt-1 text-sm text-gray-700">{record.alert?.message}</p><p className="mt-1 text-xs text-gray-500">{record.companyName}</p></div>
                  <Link href="/fca" className="inline-flex h-9 items-center justify-center rounded-md border border-amber-200 bg-white px-3 text-sm font-semibold text-amber-800">Lihat riwayat</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {entries.length === 0 && fcaAlerts.length === 0 && caReminders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <BellRing className="mx-auto size-9 text-gray-400" />
          <h2 className="mt-3 text-base font-semibold text-gray-950">Belum ada notifikasi aktif</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
            Set Best Entry pada detail saham atau pantau emiten di FCA Tracker. Perubahan penting akan muncul di sini.
          </p>
          <Link
            href="/fca"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-red-600 bg-red-600 px-4 text-sm font-semibold text-white transition duration-150 hover:bg-red-700"
          >
            Buka FCA Tracker
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {reachedRows.length > 0 ? (
            <div>
              <h2 className="mb-3 text-base font-semibold text-gray-950">Harga Sudah Masuk Entry</h2>
              <div className="grid gap-3">
                {reachedRows.map((row) => (
                  <NotificationRow key={row.ticker} row={row} onDelete={deleteEntry} highlight />
                ))}
              </div>
            </div>
          ) : null}

          {entries.length > 0 ? <div>
            <h2 className="mb-3 text-base font-semibold text-gray-950">Pantauan Best Entry</h2>
            <div className="grid gap-3">
              {waitingRows.length > 0 ? (
                waitingRows.map((row) => <NotificationRow key={row.ticker} row={row} onDelete={deleteEntry} />)
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
                  Semua best entry yang tersimpan sedang masuk area entry.
                </div>
              )}
            </div>
          </div> : null}
        </div>
      )}
      {confirmationDialog}
    </section>
  );
}

function NotificationRow({
  row,
  onDelete,
  highlight = false,
}: {
  row: {
    ticker: string;
    name: string;
    price: number;
    updatedAt: string;
    currentPrice: number | null;
    reached: boolean;
    gapPercent: number | null;
    source?: string;
    quoteUpdatedAt?: string;
  };
  onDelete: (ticker: string) => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4 shadow-sm",
        highlight ? "border-green-200 bg-green-50/40" : "border-gray-200",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/stocks/${row.ticker}`} className="text-lg font-semibold text-gray-950 hover:text-red-700">
              {row.ticker}
            </Link>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                row.reached ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600",
              )}
            >
              {row.reached ? <CheckCircle2 className="size-3.5" /> : null}
              {row.reached ? "Entry tersentuh" : "Menunggu harga"}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-gray-600">{row.name}</p>
          <p className="mt-2 text-xs text-gray-500">Diset {formatDate(row.updatedAt)}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
          <Metric label="Harga Saat Ini" value={formatPrice(row.currentPrice)} detail={row.source ?? "Quote belum tersedia"} />
          <Metric label="Best Entry" value={formatPrice(row.price)} detail="Harga alert" />
          <Metric
            label="Jarak"
            value={row.gapPercent === null ? "-" : `${row.gapPercent > 0 ? "+" : ""}${row.gapPercent.toFixed(2)}%`}
            detail={row.quoteUpdatedAt ?? "Live quote"}
            positive={row.reached}
          />
        </div>

        <div className="flex gap-2">
          <Link
            href={`/stocks/${row.ticker}`}
            className="inline-flex size-10 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 transition duration-150 hover:bg-gray-50"
            aria-label={`Buka detail ${row.ticker}`}
          >
            <ExternalLink className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(row.ticker)}
            className="inline-flex size-10 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 transition duration-150 hover:bg-gray-50"
            aria-label={`Hapus alert ${row.ticker}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, detail, positive = false }: { label: string; value: string; detail: string; positive?: boolean }) {
  return (
    <div className="rounded-md border border-gray-100 bg-white px-3 py-2">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold", positive ? "text-green-700" : "text-gray-950")}>{value}</p>
      <p className="mt-1 truncate text-xs text-gray-500">{detail}</p>
    </div>
  );
}
