"use client";

import { useEffect } from "react";
import type { BestEntryRecord } from "@/lib/best-entry-store";
import type { FcaWatchRecord } from "@/lib/fca-watch-store";

const bestEntryPrefix = "bandarlab-best-entry:";
const bestEntryEvent = "bandarlab-best-entry-change";
const fcaStorageKey = "bandarlab-fca-watch-v1";
const fcaEvent = "bandarlab:fca-watch-change";

type CloudBestEntry = BestEntryRecord & { lastFiredValue?: string | null };
type NotificationWorkspace = {
  initialized?: boolean;
  bestEntries?: CloudBestEntry[];
  fcaWatches?: FcaWatchRecord[];
  error?: string;
};

let initializationPromise: Promise<void> | null = null;
let syncQueue: Promise<void> = Promise.resolve();
let syncTimer: number | null = null;
let applyingCloudSnapshot = false;

function readLocalBestEntries(): CloudBestEntry[] {
  const entries: CloudBestEntry[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(bestEntryPrefix) || key.endsWith(":last-fired")) continue;
    try {
      const ticker = key.slice(bestEntryPrefix.length).toUpperCase();
      const value = JSON.parse(window.localStorage.getItem(key) ?? "null") as { price?: unknown; updatedAt?: unknown } | null;
      const price = Number(value?.price);
      if (!ticker || !Number.isFinite(price) || price <= 0) continue;
      entries.push({
        ticker,
        price,
        updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
        lastFiredValue: window.localStorage.getItem(`${key}:last-fired`),
      });
    } catch {
      // Ignore malformed legacy entries while migrating the remaining records.
    }
  }
  return entries.sort((first, second) => first.ticker.localeCompare(second.ticker));
}

function readLocalFcaWatches(): FcaWatchRecord[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(fcaStorageKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed as FcaWatchRecord[] : [];
  } catch {
    return [];
  }
}

function currentPayload() {
  return { bestEntries: readLocalBestEntries(), fcaWatches: readLocalFcaWatches() };
}

async function saveWorkspace(payload = currentPayload()) {
  const response = await fetch("/api/notifications", {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error || "Notifikasi gagal disimpan ke database.");
}

function applyWorkspace(bestEntries: CloudBestEntry[], fcaWatches: FcaWatchRecord[]) {
  applyingCloudSnapshot = true;
  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(bestEntryPrefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  bestEntries.forEach((entry) => {
    const key = `${bestEntryPrefix}${entry.ticker}`;
    window.localStorage.setItem(key, JSON.stringify({ price: entry.price, updatedAt: entry.updatedAt }));
    if (entry.lastFiredValue) window.localStorage.setItem(`${key}:last-fired`, entry.lastFiredValue);
  });
  window.localStorage.setItem(fcaStorageKey, JSON.stringify(fcaWatches));
  window.dispatchEvent(new Event(bestEntryEvent));
  window.dispatchEvent(new Event(fcaEvent));
  applyingCloudSnapshot = false;
}

async function initializeWorkspace() {
  const response = await fetch("/api/notifications", { cache: "no-store" });
  const workspace = await response.json() as NotificationWorkspace;
  if (!response.ok) throw new Error(workspace.error || "Notifikasi gagal dimuat dari database.");

  const local = currentPayload();
  const bestEntries = workspace.initialized ? workspace.bestEntries ?? [] : local.bestEntries;
  const fcaWatches = workspace.initialized ? workspace.fcaWatches ?? [] : local.fcaWatches;
  if (!workspace.initialized) await saveWorkspace({ bestEntries, fcaWatches });
  applyWorkspace(bestEntries, fcaWatches);
}

export function ensureNotificationDatabaseSync() {
  if (!initializationPromise) {
    initializationPromise = initializeWorkspace().catch((error) => {
      initializationPromise = null;
      console.error("Notification database initialization failed", error);
    });
  }
  return initializationPromise;
}

export function scheduleNotificationDatabaseSync() {
  if (applyingCloudSnapshot) return;
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncQueue = syncQueue
      .catch(() => undefined)
      .then(async () => {
        await ensureNotificationDatabaseSync();
        await saveWorkspace(currentPayload());
      })
      .catch((error) => console.error("Notification database sync failed", error));
  }, 350);
}

export function useNotificationDatabaseSync() {
  useEffect(() => {
    const handleChange = () => scheduleNotificationDatabaseSync();
    window.addEventListener(bestEntryEvent, handleChange);
    window.addEventListener(fcaEvent, handleChange);
    void ensureNotificationDatabaseSync();
    return () => {
      window.removeEventListener(bestEntryEvent, handleChange);
      window.removeEventListener(fcaEvent, handleChange);
    };
  }, []);
}
