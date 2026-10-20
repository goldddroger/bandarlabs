import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AverageDownSimulator } from "../components/portfolio/average-down-simulator";

const holding = { id: "test", ticker: "TEST", lots: 100, averagePrice: 120, purchasedAt: "2026-10-20", note: "" };

test("average down opens directly on target price slider and preparation budget, without BEP modes", () => {
  const html = renderToStaticMarkup(<AverageDownSimulator holding={holding} marketPrice={56} source="Yahoo Finance" onClose={() => {}} />);
  assert.match(html, /type="range"[^>]*min="56"[^>]*max="120"[^>]*value="88"/);
  assert.match(html, /aria-label="Target average \(Rp\)"/);
  assert.match(html, /Dana yang perlu disiapkan/);
  assert.match(html, /Rp 566\.449/);
  assert.match(html, /101 lot/);
  assert.doesNotMatch(html, /type="radio"|Fee jual|Kenaikan harga menuju BEP/);
});

test("missing market quote opens purchase assumptions, not a fake market price", () => {
  const html = renderToStaticMarkup(<AverageDownSimulator holding={holding} onClose={() => {}} />);
  assert.match(html, /Belum tersedia/);
  assert.match(html, /Harga pasar belum tersedia/);
  assert.match(html, /<details[^>]*open=""/);
  assert.match(html, /type="range"[^>]*disabled=""/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("fractional average and price above existing average keep default target within slider bounds", () => {
  const html = renderToStaticMarkup(<AverageDownSimulator holding={{ ...holding, averagePrice: 120.123 }} marketPrice={150} onClose={() => {}} />);
  assert.match(html, /type="range"[^>]*min="120\.123"[^>]*max="120\.123"[^>]*disabled=""[^>]*value="120\.123"/);
  assert.match(html, /Target sudah tercapai/);
  assert.match(html, /Rp 0/);
});
