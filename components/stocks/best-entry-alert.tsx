"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BellRing, CheckCircle2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  bestEntryChangeEventName,
  emitBestEntryChange,
  getBestEntryLastFiredKey,
  getBestEntryStorageKey,
  parseStoredBestEntry,
} from "@/lib/best-entry-store";
import { cn } from "@/lib/utils";

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

function parsePriceInput(value: string) {
  const normalized = value.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatSavedAt(updatedAt?: string) {
  if (!updatedAt) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(updatedAt));
}

export function BestEntryAlert({
  ticker,
  currentPrice,
  priceSource,
  updatedAt,
}: {
  ticker: string;
  currentPrice: number | null;
  priceSource?: string;
  updatedAt?: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const storageKey = getBestEntryStorageKey(ticker);
  const rawEntry = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener(bestEntryChangeEventName, onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(bestEntryChangeEventName, onStoreChange);
      };
    },
    () => window.localStorage.getItem(storageKey) ?? "",
    () => "",
  );
  const entry = parseStoredBestEntry(ticker, rawEntry);
  const isEntryReached = entry !== null && currentPrice !== null && currentPrice <= entry.price;
  const gapPercent =
    entry !== null && currentPrice !== null && entry.price > 0 ? ((currentPrice - entry.price) / entry.price) * 100 : null;
  const savedAtLabel = formatSavedAt(entry?.updatedAt);

  useEffect(() => {
    if (!isEntryReached || !entry || currentPrice === null) return;

    const notificationKey = getBestEntryLastFiredKey(ticker);
    const notificationValue = `${entry.price}:${currentPrice}:${updatedAt ?? "live"}`;
    if (window.localStorage.getItem(notificationKey) === notificationValue) return;

    window.localStorage.setItem(notificationKey, notificationValue);
    const message = `${ticker} sudah di ${formatPrice(currentPrice)}, entry kamu ${formatPrice(entry.price)}.`;
    toast.success("Best entry tersentuh", {
      description: message,
      duration: 8000,
    });

    if ("Notification" in window && window.Notification.permission === "granted") {
      new window.Notification(`${ticker} masuk area entry`, {
        body: message,
      });
    }
  }, [currentPrice, entry, isEntryReached, storageKey, ticker, updatedAt]);

  function handleSave() {
    const parsedPrice = parsePriceInput(inputValue);
    if (parsedPrice === null) {
      toast.error("Harga entry belum valid", {
        description: "Masukkan angka harga, contoh 172 atau 1.250.",
      });
      return;
    }

    const nextEntry = {
      price: parsedPrice,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(storageKey, JSON.stringify(nextEntry));
    window.localStorage.removeItem(getBestEntryLastFiredKey(ticker));
    emitBestEntryChange();
    setInputValue(formatPrice(parsedPrice));
    toast.success("Best entry disimpan", {
      description: `${ticker} akan memberi notifikasi saat harga di ${formatPrice(parsedPrice)} atau lebih rendah.`,
    });
  }

  function handleDelete() {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(getBestEntryLastFiredKey(ticker));
    emitBestEntryChange();
    setInputValue("");
    toast.info("Best entry dihapus");
  }

  async function handleEnableBrowserNotification() {
    if (!("Notification" in window)) {
      toast.error("Browser belum mendukung notifikasi");
      return;
    }

    const permission = await window.Notification.requestPermission();
    toast[permission === "granted" ? "success" : "info"](
      permission === "granted" ? "Notifikasi browser aktif" : "Notifikasi browser belum diizinkan",
    );
  }

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-gray-950">Best Entry Alert</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                isEntryReached ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600",
              )}
            >
              {isEntryReached ? "Entry tersentuh" : "Pantauan pribadi"}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
            Set harga entry hasil analisis kamu sendiri. Saat harga saat ini sama dengan atau di bawah entry, BandarLab akan menampilkan notifikasi.
          </p>
        </div>
        <button
          type="button"
          onClick={handleEnableBrowserNotification}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition duration-150 hover:bg-gray-50 lg:w-auto"
        >
          <BellRing className="size-4" />
          Aktifkan Browser
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase text-gray-500">Harga Saat Ini</p>
            <p className="mt-2 text-xl font-semibold text-gray-950">{formatPrice(currentPrice)}</p>
            <p className="mt-1 text-xs text-gray-500">{priceSource ?? "Live quote"}</p>
          </div>
          <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase text-gray-500">Best Entry</p>
            <p className="mt-2 text-xl font-semibold text-gray-950">{formatPrice(entry?.price ?? null)}</p>
            <p className="mt-1 text-xs text-gray-500">Diset {savedAtLabel}</p>
          </div>
          <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase text-gray-500">Jarak ke Entry</p>
            <p className={cn("mt-2 text-xl font-semibold", isEntryReached ? "text-green-700" : "text-gray-950")}>
              {gapPercent === null ? "-" : `${gapPercent > 0 ? "+" : ""}${gapPercent.toFixed(2)}%`}
            </p>
            <p className="mt-1 text-xs text-gray-500">{updatedAt ? `Update ${updatedAt}` : "Mengikuti harga terbaru"}</p>
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-3">
          <label className="text-xs font-semibold uppercase text-gray-500" htmlFor={`${ticker}-best-entry`}>
            Harga best entry
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id={`${ticker}-best-entry`}
              inputMode="decimal"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={entry ? formatPrice(entry.price) : "Contoh 172"}
              className="h-10 min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-950 outline-none transition duration-150 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-600 bg-red-600 px-3 text-sm font-semibold text-white transition duration-150 hover:bg-red-700"
            >
              <Save className="size-4" />
              Simpan
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!entry}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Hapus best entry"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          {isEntryReached ? (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-green-100 bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <p>Harga sudah masuk area entry kamu. Cocokkan lagi dengan rencana trading sebelum eksekusi.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
