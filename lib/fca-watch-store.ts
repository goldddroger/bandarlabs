import type { FcaEpisode } from "@/lib/fca-import";

export const fcaWatchEventName = "bandarlab:fca-watch-change";
const storageKey = "bandarlab-fca-watch-v1";

export type FcaWatchRecord = {
  ticker: string;
  companyName: string;
  watchedAt: string;
  lastKnownActive: boolean;
  lastKnownCriteria: number[];
  alert: null | {
    type: "entered" | "exited" | "criteria_changed";
    message: string;
    createdAt: string;
    unread: boolean;
  };
};

export function getFcaWatchSnapshot() {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(storageKey) ?? "[]";
}

export function parseFcaWatchSnapshot(snapshot: string): FcaWatchRecord[] {
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    return Array.isArray(parsed) ? parsed as FcaWatchRecord[] : [];
  } catch {
    return [];
  }
}

export function subscribeFcaWatch(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(fcaWatchEventName, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(fcaWatchEventName, onStoreChange);
  };
}

function save(records: FcaWatchRecord[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(records));
  window.dispatchEvent(new Event(fcaWatchEventName));
}

export function toggleFcaWatch(episode: FcaEpisode) {
  const records = parseFcaWatchSnapshot(getFcaWatchSnapshot());
  const existing = records.find((record) => record.ticker === episode.ticker);
  if (existing) {
    save(records.filter((record) => record.ticker !== episode.ticker));
    return false;
  }
  records.push({
    ticker: episode.ticker,
    companyName: episode.company_name,
    watchedAt: new Date().toISOString(),
    lastKnownActive: !episode.exited_at,
    lastKnownCriteria: episode.criteria,
    alert: null,
  });
  save(records);
  return true;
}

export function syncFcaWatches(episodes: FcaEpisode[]) {
  const latest = new Map<string, FcaEpisode>();
  episodes.forEach((episode) => {
    const current = latest.get(episode.ticker);
    if (!current || episode.entered_at > current.entered_at) latest.set(episode.ticker, episode);
  });
  const records = parseFcaWatchSnapshot(getFcaWatchSnapshot());
  let changed = false;
  const next = records.map((record) => {
    const episode = latest.get(record.ticker);
    if (!episode) return record;
    const active = !episode.exited_at;
    const criteriaChanged = record.lastKnownCriteria.join(",") !== episode.criteria.join(",");
    let alert = record.alert;
    if (record.lastKnownActive && !active) {
      alert = { type: "exited" as const, message: `${record.ticker} tercatat keluar dari FCA.`, createdAt: new Date().toISOString(), unread: true };
    } else if (!record.lastKnownActive && active) {
      alert = { type: "entered" as const, message: `${record.ticker} kembali masuk FCA.`, createdAt: new Date().toISOString(), unread: true };
    } else if (criteriaChanged) {
      alert = { type: "criteria_changed" as const, message: `Kriteria FCA ${record.ticker} berubah menjadi ${episode.criteria.join(", ")}.`, createdAt: new Date().toISOString(), unread: true };
    }
    if (active !== record.lastKnownActive || criteriaChanged) changed = true;
    return { ...record, companyName: episode.company_name, lastKnownActive: active, lastKnownCriteria: episode.criteria, alert };
  });
  if (changed) save(next);
}

export function markFcaAlertsRead() {
  const records = parseFcaWatchSnapshot(getFcaWatchSnapshot());
  if (!records.some((record) => record.alert?.unread)) return;
  save(records.map((record) => record.alert ? { ...record, alert: { ...record.alert, unread: false } } : record));
}
