"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  bestEntryChangeEventName,
  getBestEntrySnapshot,
  parseBestEntrySnapshot,
  type BestEntryRecord,
} from "@/lib/best-entry-store";
import { getFcaWatchSnapshot, parseFcaWatchSnapshot, subscribeFcaWatch } from "@/lib/fca-watch-store";
import { stockCaResearchChangeEvent } from "@/lib/stock-ca-research";

type QuoteMap = Record<
  string,
  {
    price: number;
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

function countReachedEntries(entries: BestEntryRecord[], quotes: QuoteMap) {
  return entries.filter((entry) => {
    const quote = quotes[entry.ticker];
    return quote && quote.price <= entry.price;
  }).length;
}

export function NotificationLink() {
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [caReminderCount, setCaReminderCount] = useState(0);
  const snapshot = useSyncExternalStore(subscribeBestEntry, getBestEntrySnapshot, () => "[]");
  const fcaSnapshot = useSyncExternalStore(subscribeFcaWatch, getFcaWatchSnapshot, () => "[]");
  const entries = useMemo(() => parseBestEntrySnapshot(snapshot), [snapshot]);
  const fcaUnreadCount = useMemo(() => parseFcaWatchSnapshot(fcaSnapshot).filter((record) => record.alert?.unread).length, [fcaSnapshot]);
  const tickers = useMemo(() => entries.map((entry) => entry.ticker).join(","), [entries]);
  const reachedCount = countReachedEntries(entries, quotes) + fcaUnreadCount + caReminderCount;

  useEffect(() => {
    const controller = new AbortController();
    async function loadReminders() {
      try {
        const response = await fetch("/api/stock-ca-research?due=1", { signal: controller.signal });
        const payload = response.ok ? await response.json() as { notes?: unknown[] } : { notes: [] };
        if (!controller.signal.aborted) setCaReminderCount(payload.notes?.length ?? 0);
      } catch {
        if (!controller.signal.aborted) setCaReminderCount(0);
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

  return (
    <Link
      href="/notifikasi"
      className="relative inline-flex h-10 items-center justify-center gap-2 rounded-md border border-transparent px-3 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
    >
      <Bell className="size-5" />
      Notifikasi
      {reachedCount > 0 ? (
        <span className="absolute -right-1 top-1 flex size-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white">
          {reachedCount > 9 ? "9+" : reachedCount}
        </span>
      ) : null}
    </Link>
  );
}
