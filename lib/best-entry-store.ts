export const bestEntryStoragePrefix = "bandarlab-best-entry:";
export const bestEntryChangeEventName = "bandarlab-best-entry-change";

export type BestEntryRecord = {
  ticker: string;
  price: number;
  updatedAt: string;
};

type StoredBestEntry = {
  price: number;
  updatedAt: string;
};

export function getBestEntryStorageKey(ticker: string) {
  return `${bestEntryStoragePrefix}${ticker.toUpperCase()}`;
}

export function getBestEntryLastFiredKey(ticker: string) {
  return `${getBestEntryStorageKey(ticker)}:last-fired`;
}

export function parseStoredBestEntry(ticker: string, rawEntry: string | null): BestEntryRecord | null {
  if (!rawEntry) return null;

  try {
    const parsed = JSON.parse(rawEntry) as StoredBestEntry;
    if (typeof parsed.price !== "number" || !Number.isFinite(parsed.price)) return null;

    return {
      ticker: ticker.toUpperCase(),
      price: parsed.price,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function emitBestEntryChange() {
  window.dispatchEvent(new Event(bestEntryChangeEventName));
}

export function getBestEntrySnapshot() {
  if (typeof window === "undefined") return "[]";

  const rows: BestEntryRecord[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(bestEntryStoragePrefix) || key.endsWith(":last-fired")) continue;

    const ticker = key.replace(bestEntryStoragePrefix, "");
    const row = parseStoredBestEntry(ticker, window.localStorage.getItem(key));
    if (row) rows.push(row);
  }

  return JSON.stringify(rows.sort((first, second) => first.ticker.localeCompare(second.ticker)));
}

export function parseBestEntrySnapshot(snapshot: string) {
  try {
    const parsed = JSON.parse(snapshot) as BestEntryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
