import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HoldingModal, SecurityPlacements } from "../components/portfolio/portfolio-dashboard";

const holding = { id: "a", ticker: "BBCA", security: "Sekuritas A", lots: 10, averagePrice: 1000, purchasedAt: "2026-10-28", note: "" };

test("holding editor shows security, lots, price and placement preview", () => {
  const html = renderToStaticMarkup(<HoldingModal draft={holding} securities={["Sekuritas A", "Sekuritas B"]} onSave={() => {}} onClose={() => {}} />);
  assert.match(html, /value="Sekuritas A"/);
  assert.match(html, /Jumlah lot di sekuritas ini/);
  assert.match(html, /Modal penempatan/);
  assert.match(html, /1\.000\.000/);
  assert.match(html, /option value="Sekuritas B"/);
});

test("security summary shows each placement and aggregate capital", () => {
  const html = renderToStaticMarkup(<SecurityPlacements holdings={[holding, { ...holding, id: "b", security: "Sekuritas B", lots: 20, averagePrice: 1200 }]} prices={{ BBCA: 1500 }} />);
  assert.match(html, /Sekuritas A/);
  assert.match(html, /Sekuritas B/);
  assert.match(html, /Total seluruh penempatan/);
  assert.match(html, /3\.400\.000/);
  assert.match(html, /4\.500\.000/);
});
