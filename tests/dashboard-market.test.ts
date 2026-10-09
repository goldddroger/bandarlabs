import assert from "node:assert/strict";
import test from "node:test";
import { getDashboardMarketSummary } from "../lib/market-data";
import { previousSessionClose } from "../lib/market-price-session";

const stamp = (date: string) => Date.parse(`${date}T12:00:00-04:00`) / 1000;

test("US 10-Year is a percentage yield and changes are in basis points", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const treasury = String(url).includes("%5ETNX");
    return Response.json({ chart: { result: [{ meta: { regularMarketPrice: treasury ? 4.25 : 100, previousClose: treasury ? 4.2 : 99, regularMarketTime: stamp("2026-10-09"), exchangeTimezoneName: "America/New_York" } }] } });
  };
  try {
    const cards = await getDashboardMarketSummary();
    assert.deepEqual(cards.map((card) => card.label), ["IHSG", "Foreign Flow", "US 10-Year Yield", "VIX"]);
    assert.equal(cards[2].value, "4.25%");
    assert.equal(cards[2].detail, "+5.00 bps vs penutupan sebelumnya");
    assert.equal(cards[2].tone, "warning");
    assert.equal(cards[2].source, "Yahoo Finance");
    assert.equal(cards[1].value, "N/A");
    assert.match(cards[1].sourceUrl ?? "", /idx.co.id/);
  } finally { globalThis.fetch = original; }
});

test("provider failure never displays demo data", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  try {
    const cards = await getDashboardMarketSummary();
    assert.ok(cards.every((card) => card.value === "N/A" && card.source === "Unavailable"));
    assert.ok(!JSON.stringify(cards).includes("Demo"));
  } finally { globalThis.fetch = original; }
});

test("daily comparison excludes same-session candles and handles null final candles", () => {
  const dates = [stamp("2026-10-07"), stamp("2026-10-08"), stamp("2026-10-09")];
  assert.equal(previousSessionClose([4, 4.2, null], dates, stamp("2026-10-09"), "America/New_York"), 4.2);
  assert.equal(previousSessionClose([4, 4.2, 4.25], dates, stamp("2026-10-09"), "America/New_York"), 4.2);
  assert.equal(previousSessionClose([4, 4.2, null], dates, stamp("2026-10-08"), "America/New_York"), 4);
});

test("a 5-day range starting close is not mistaken for the previous close", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => String(url).includes("google.com") ? new Response("")
    : Response.json({ chart: { result: [{ meta: { regularMarketPrice: 100, chartPreviousClose: 90, regularMarketTime: stamp("2026-10-09") }, timestamp: [stamp("2026-10-09")], indicators: { quote: [{ close: [100] }] } }] } });
  try {
    const cards = await getDashboardMarketSummary();
    assert.equal(cards[0].source, "Unavailable");
    assert.equal(cards[2].source, "Unavailable");
  } finally { globalThis.fetch = original; }
});
