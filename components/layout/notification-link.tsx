"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  bestEntryChangeEventName,
  emitBestEntryChange,
  getBestEntryLastFiredKey,
  getBestEntrySnapshot,
  parseBestEntrySnapshot,
} from "@/lib/best-entry-store";
import { getFcaWatchSnapshot, parseFcaWatchSnapshot, subscribeFcaWatch } from "@/lib/fca-watch-store";
import { stockCaResearchChangeEvent, type StockCaResearchNote } from "@/lib/stock-ca-research";
import { useNotificationDatabaseSync } from "@/lib/notification-cloud-sync";
import { bestEntryNotificationId, caNotificationId, fcaNotificationId } from "@/lib/notification-identity";
import { useNotificationReadState } from "@/lib/notification-read-store";

type QuoteMap = Record<
  string,
  {
    price: number;
    updatedAt?: string;
  }
>;

function subscribeBestEntry(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(bestEntryChangeEventName, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(bestEntryChangeEventName, onStoreChange);
  };
}

export function NotificationLink() {
  useNotificationDatabaseSync();
  const { ready, isRead } = useNotificationReadState();
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [caReminders, setCaReminders] = useState<StockCaResearchNote[]>([]);
  const snapshot = useSyncExternalStore(subscribeBestEntry, getBestEntrySnapshot, () => "[]");
  const fcaSnapshot = useSyncExternalStore(subscribeFcaWatch, getFcaWatchSnapshot, () => "[]");
  const entries = useMemo(() => parseBestEntrySnapshot(snapshot), [snapshot]);
  const fcaUnreadCount = parseFcaWatchSnapshot(fcaSnapshot).filter((record) => record.alert?.unread && !isRead(fcaNotificationId(record))).length;
  const tickers = useMemo(() => entries.map((entry) => entry.ticker).join(","), [entries]);
  const reachedCount = ready ? entries.filter((entry) => quotes[entry.ticker]?.price <= entry.price && !isRead(bestEntryNotificationId(entry))).length + fcaUnreadCount + caReminders.filter((note) => !isRead(caNotificationId(note))).length : 0;

  useEffect(() => {
    const controller = new AbortController();
    async function loadReminders() {
      try {
        const response = await fetch("/api/stock-ca-research?due=1", { signal: controller.signal });
        const payload = response.ok ? await response.json() as { notes?: StockCaResearchNote[] } : { notes: [] };
        if (!controller.signal.aborted) setCaReminders(payload.notes ?? []);
      } catch {
        if (!controller.signal.aborted) setCaReminders([]);
      }
    }
    void loadReminders();
    window.addEventListener(stockCaResearchChangeEvent, loadReminders);
    return () => { controller.abort(); window.removeEventListener(stockCaResearchChangeEvent, loadReminders); };
  }, []);

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
    entries.forEach((entry) => {
      if (!ready || isRead(bestEntryNotificationId(entry))) return;
      const quote = quotes[entry.ticker];
      if (!quote || quote.price > entry.price) return;
      const firedValue = bestEntryNotificationId(entry);
      const firedKey = getBestEntryLastFiredKey(entry.ticker);
      if (window.localStorage.getItem(firedKey) === firedValue) return;
      window.localStorage.setItem(firedKey, firedValue);
      emitBestEntryChange();
      if ("Notification" in window && window.Notification.permission === "granted") {
        new window.Notification(`${entry.ticker} masuk area entry`, {
          body: `Harga ${entry.ticker} sudah ${quote.price}, best entry kamu ${entry.price}.`,
        });
      }
    });
  }, [entries, quotes, ready, isRead]);

  return (
    <Link
      href="/notifikasi"
      aria-label={reachedCount > 0 ? `Notifikasi, ${reachedCount} belum dibaca` : "Notifikasi"}
      className="relative inline-flex h-10 items-center justify-center gap-2 rounded-md border border-transparent px-3 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      <Bell className="size-5" />
      Notifikasi
      {reachedCount > 0 ? (
        <span aria-live="polite" className="absolute -right-1 top-1 flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
          {reachedCount > 9 ? "9+" : reachedCount}
        </span>
      ) : null}
    </Link>
  );
}
