import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compile } from "@tailwindcss/node";
import { Button } from "../components/ui/button";

const css = readFileSync("app/globals.css", "utf8");
const colors = new Map([...css.matchAll(/--color-brand-(\d+):\s*(#[0-9a-f]{6})/g)].map((match) => [match[1], match[2]]));

function luminance(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("brand palette is blue and primary text combinations meet WCAG AA contrast", () => {
  assert.equal(colors.size, 11);
  for (const color of colors.values()) assert.ok(Number.parseInt(color.slice(5, 7), 16) > Number.parseInt(color.slice(1, 3), 16));
  assert.ok(contrast(colors.get("600")!, "#ffffff") >= 4.5);
  assert.ok(contrast(colors.get("700")!, colors.get("50")!) >= 4.5);
  assert.ok(contrast(colors.get("500")!, "#ffffff") >= 3);
  assert.match(css, /--primary:\s*var\(--color-brand-600\)/);
  assert.doesNotMatch(css, /--color-red-\d+:/);
});

test("Tailwind compiles the brand background, text, border and focus utilities", async () => {
  const compiler = await compile(css, { base: process.cwd(), onDependency() {} });
  const output = compiler.build(["bg-brand-600", "text-brand-700", "border-brand-200", "focus:ring-brand-100", "hover:bg-brand-700"]);
  for (const selector of [".bg-brand-600", ".text-brand-700", ".border-brand-200", "focus\\:ring-brand-100", "hover\\:bg-brand-700"]) assert.ok(output.includes(selector), selector);
});

test("primary/outline buttons use brand blue and destructive actions remain red", () => {
  const primary = renderToStaticMarkup(createElement(Button, null, "Simpan"));
  assert.match(primary, /bg-brand-600/);
  assert.doesNotMatch(primary, /bg-red-/);
  const outline = renderToStaticMarkup(createElement(Button, { variant: "outline" }));
  assert.match(outline, /text-brand-700/);
  const destructive = renderToStaticMarkup(createElement(Button, { variant: "destructive" }, "Hapus"));
  assert.match(destructive, /bg-red-600/);
  assert.doesNotMatch(destructive, /bg-brand-/);
});

test("Tailwind merge preserves explicit destructive overrides on primary buttons", () => {
  const html = renderToStaticMarkup(createElement(Button, { className: "bg-red-600 text-white" }));
  assert.match(html, /bg-red-600/);
  assert.doesNotMatch(html, /bg-brand-600/);
});

test("navigation uses blue while loss candles, negative heatmap cells and errors retain red", () => {
  assert.doesNotMatch(readFileSync("components/layout/app-sidebar.tsx", "utf8"), /red-\d/);
  assert.match(readFileSync("components/stocks/stock-chart.tsx", "utf8"), /downColor: "#dc2626"/);
  assert.match(readFileSync("components/dashboard/ihsg-drivers-heatmap.tsx", "utf8"), /if \(change < 0\) return "#dc2626"/);
  assert.match(readFileSync("components/auth/login-form.tsx", "utf8"), /error \? <div className="[^"]*text-red-700/);
  assert.match(readFileSync("components/ui/confirm-dialog.tsx", "utf8"), /variant="destructive"/);
  assert.match(readFileSync("components/tools/right-issue-scenario-simulator.tsx", "utf8"), /<CircleOff className="size-5 text-red-600"/);
});
