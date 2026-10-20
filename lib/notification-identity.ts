import type { BestEntryRecord } from "./best-entry-store";
import type { FcaWatchRecord } from "./fca-watch-store";
import type { StockCaResearchNote } from "./stock-ca-research";

function timestamp(value: string | undefined) {
  const date = new Date(value ?? "");
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}

export function bestEntryNotificationId(entry: BestEntryRecord) {
  return JSON.stringify(["entry", entry.ticker.toUpperCase(), entry.price, timestamp(entry.updatedAt)]);
}

export function caNotificationId(note: StockCaResearchNote) {
  return JSON.stringify(["ca", note.id, note.reminderDate, timestamp(note.updatedAt)]);
}

export function fcaNotificationId(record: FcaWatchRecord) {
  return JSON.stringify(["fca", record.ticker.toUpperCase(), record.alert?.type, timestamp(record.alert?.createdAt)]);
}

export function normalizeNotificationIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) return null;
  if (value.some((id) => typeof id !== "string" || !id || id.length > 512)) return null;
  for (const id of value) {
    try {
      const parts: unknown = JSON.parse(id);
      if (!Array.isArray(parts) || !["entry", "ca", "fca"].includes(parts[0]) || parts.length !== 4 || parts.slice(1).some((part) => part === null || part === undefined || (typeof part !== "string" && typeof part !== "number"))) return null;
    } catch {
      return null;
    }
  }
  return [...new Set(value)] as string[];
}
