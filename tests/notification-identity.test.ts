import assert from "node:assert/strict";
import test from "node:test";
import { bestEntryNotificationId, caNotificationId, fcaNotificationId, normalizeNotificationIds } from "../lib/notification-identity";
import type { StockCaResearchNote } from "../lib/stock-ca-research";
import type { FcaWatchRecord } from "../lib/fca-watch-store";

const entry = { ticker: "BBCA", price: 6000, updatedAt: "2026-10-20T01:00:00Z" };
const note: StockCaResearchNote = { id: "ca-1", ticker: "BBCA", actionType: "RUPS", title: "Research", researchNote: "", eventDate: null, reminderDate: "2026-10-20", status: "Rencana", createdAt: entry.updatedAt, updatedAt: entry.updatedAt };
const fca: FcaWatchRecord = { ticker: "TGUK", companyName: "TGUK", watchedAt: entry.updatedAt, lastKnownActive: true, lastKnownCriteria: [5], alert: { type: "criteria_changed", createdAt: entry.updatedAt, message: "Perubahan", unread: true } };

test("entry identity survives database timestamp normalization and ticker casing", () => {
  assert.equal(bestEntryNotificationId(entry), bestEntryNotificationId({ ...entry, ticker: "bbca", updatedAt: "2026-10-20T08:00:00+07:00" }));
});

test("new targets/reconfigured alerts create new notifications, quotes do not", () => {
  assert.notEqual(bestEntryNotificationId(entry), bestEntryNotificationId({ ...entry, price: 5900 }));
  assert.notEqual(bestEntryNotificationId(entry), bestEntryNotificationId({ ...entry, updatedAt: "2026-10-21T01:00:00Z" }));
  const quoteChanged = { ...entry, currentPrice: 5800, quoteUpdatedAt: "2026-10-21T02:00:00Z" };
  assert.equal(bestEntryNotificationId(entry), bestEntryNotificationId(quoteChanged));
});

test("revised CA reminders and new FCA changes remain unread independently", () => {
  assert.notEqual(caNotificationId(note), caNotificationId({ ...note, reminderDate: "2026-10-21" }));
  assert.notEqual(caNotificationId(note), caNotificationId({ ...note, updatedAt: "2026-10-21T01:00:00Z" }));
  assert.notEqual(fcaNotificationId(fca), fcaNotificationId({ ...fca, alert: { ...fca.alert!, type: "exited" } }));
  assert.equal(fcaNotificationId(fca), fcaNotificationId({ ...fca, alert: { ...fca.alert!, unread: false } }));
});

test("read acknowledgement validation deduplicates and rejects malformed or oversized input", () => {
  const id = bestEntryNotificationId(entry);
  assert.deepEqual(normalizeNotificationIds([id, id]), [id]);
  assert.deepEqual(normalizeNotificationIds([id, caNotificationId(note), fcaNotificationId(fca)]), [id, caNotificationId(note), fcaNotificationId(fca)]);
  for (const input of [null, [], ["bad"], [JSON.stringify(["unknown", "id", "x", "y"])], [JSON.stringify(["entry", null, 10, "date"])], ["x".repeat(513)], Array(501).fill(id)]) assert.equal(normalizeNotificationIds(input), null);
});
