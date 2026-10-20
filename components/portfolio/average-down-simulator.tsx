"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateAverageDown } from "@/lib/portfolio-average-down";
import type { PortfolioHolding } from "@/lib/portfolio-store";

const number = (value: number, decimals = 0) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: decimals }).format(value);
const rupiah = (value: number, decimals = 0) => `Rp ${number(value, decimals)}`;

function middleAverage(price: number, currentAverage: number) {
  if (price >= currentAverage) return currentAverage;
  return Math.min(currentAverage, Math.max(price, Math.round((price + currentAverage) / 2 * 100) / 100));
}

export function AverageDownSimulator({ holding, marketPrice, source, updatedAt, onClose }: {
  holding: PortfolioHolding;
  marketPrice?: number;
  source?: string;
  updatedAt?: string;
  onClose: () => void;
}) {
  const targetId = useId();
  const hasMarketPrice = typeof marketPrice === "number" && Number.isFinite(marketPrice) && marketPrice > 0;
  const [buyPrice, setBuyPrice] = useState(hasMarketPrice ? String(marketPrice) : "");
  const [average, setAverage] = useState(hasMarketPrice ? String(middleAverage(marketPrice, holding.averagePrice)) : "");
  const [buyFee, setBuyFee] = useState("0.15");
  const purchasePrice = buyPrice.trim() ? Number(buyPrice) : NaN;
  const target = average.trim() ? Number(average) : NaN;
  const validPrice = Number.isFinite(purchasePrice) && purchasePrice > 0;
  const minimum = validPrice ? Math.min(purchasePrice, holding.averagePrice) : holding.averagePrice;
  const maximum = holding.averagePrice;
  const result = target > maximum ? { status: "invalid" as const, message: "Target average tidak boleh melebihi average posisi saat ini." } : calculateAverageDown({
    lots: holding.lots, averagePrice: holding.averagePrice,
    referencePrice: hasMarketPrice ? marketPrice : purchasePrice,
    buyPrice: purchasePrice,
    buyFeePercent: buyFee.trim() ? Number(buyFee) : NaN,
    sellFeePercent: 0,
    target: { mode: "average", value: target },
  });

  function updateBuyPrice(value: string) {
    setBuyPrice(value);
    const price = Number(value);
    if (value.trim() && Number.isFinite(price) && price > 0 && (!Number.isFinite(target) || target < price)) {
      setAverage(String(middleAverage(price, maximum)));
    }
  }

  function updateSlider(value: number) {
    const next = value <= minimum ? minimum : value >= maximum ? maximum : Math.max(minimum, Math.min(maximum, Math.round(value * 100) / 100));
    setAverage(String(next));
  }

  return (
    <div className="min-w-0 space-y-5">
      <dl className="grid grid-cols-3 gap-3 border-b border-gray-200 pb-4 text-sm">
        <ResultValue label="Posisi saat ini" value={`${number(holding.lots)} lot`} />
        <ResultValue label="Average awal" value={rupiah(holding.averagePrice, 2)} />
        <ResultValue label="Harga pasar" value={hasMarketPrice ? rupiah(marketPrice, 2) : "Belum tersedia"} />
      </dl>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor={targetId} className="text-sm font-semibold text-gray-900">Target average</label>
          <label className="flex h-11 w-36 shrink-0 items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 text-brand-700 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100"><span className="text-sm">Rp</span><input id={targetId} aria-label="Target average (Rp)" type="number" inputMode="decimal" min="0.01" max={maximum} step="any" value={average} onChange={(event) => setAverage(event.target.value)} className="min-w-0 w-full bg-transparent text-right text-lg font-semibold tabular-nums outline-none" /></label>
        </div>
        <input type="range" aria-label="Geser target average" aria-valuetext={Number.isFinite(target) ? rupiah(target, 4) : "Belum ditentukan"} min={minimum} max={maximum} step="any" value={Number.isFinite(target) ? Math.max(minimum, Math.min(maximum, target)) : maximum} onInput={(event) => updateSlider(Number(event.currentTarget.value))} disabled={!validPrice || minimum >= maximum} className="mt-3 h-10 w-full cursor-pointer accent-brand-600 disabled:cursor-not-allowed" />
        <div className="flex items-start justify-between gap-4 text-xs text-gray-500"><span>{validPrice ? rupiah(minimum, 2) : "Harga beli belum diisi"}</span><span className="text-right">{rupiah(maximum, 2)}</span></div>
      </div>
      <details className="group border-t border-gray-200 pt-3" open={!hasMarketPrice || undefined}>
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm text-gray-600 [&::-webkit-details-marker]:hidden"><span>Asumsi pembelian <span className="text-xs text-gray-500">{validPrice ? `di ${rupiah(purchasePrice, 2)}` : ""}</span></span><ChevronDown className="size-4 shrink-0 group-open:rotate-180" /></summary>
        <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
          <Input label="Harga beli tambahan (Rp)" value={buyPrice} onChange={updateBuyPrice} />
          <Input label="Fee beli (%)" value={buyFee} onChange={setBuyFee} />
        </div>
        <p className="mt-2 text-xs leading-5 text-gray-500">{hasMarketPrice ? `${source ?? "Harga pasar"}${updatedAt && Number.isFinite(Date.parse(updatedAt)) ? `, ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(updatedAt))} WIB` : ""}.` : "Harga pasar belum tersedia. Isi rencana harga beli tambahan."}</p>
      </details>
      <section aria-label="Hasil simulasi average down" aria-live="polite" className="min-w-0 border-y border-gray-200 py-4">
        {"message" in result ? <p className="text-sm leading-6 text-amber-800">{result.status === "impossible" ? `Target ini tidak dapat dicapai dengan dana terbatas. Pilih average di atas harga beli setelah fee (${rupiah(purchasePrice * (1 + Number(buyFee) / 100), 4)}).` : result.message}</p> : <>
          {result.status === "achieved" ? <p className="mb-4 text-sm font-medium text-emerald-700">Target sudah tercapai tanpa tambahan pembelian.</p> : null}
          <dl className="grid min-w-0 grid-cols-2 gap-4">
            <ResultValue label="Dana yang perlu disiapkan" value={rupiah(Math.ceil(result.additionalCapital))} highlight />
            <ResultValue label="Tambahan lot minimum" value={`${number(result.additionalLots)} lot`} highlight />
            <ResultValue label="Average setelah pembelian" value={rupiah(result.averagePrice, 4)} />
            <ResultValue label="Total lot" value={`${number(result.totalLots)} lot`} />
          </dl>
          <p className="mt-3 text-xs leading-5 text-gray-500">Pembelian {rupiah(result.grossBuy, 2)} + fee {rupiah(result.buyFee, 2)}.</p>
          {result.additionalLots > 0 ? <p className="mt-2 text-xs leading-5 text-amber-800">Tambahan modal {number(result.capitalIncreasePercent, 1)}% dari posisi awal.</p> : null}
        </>}
      </section>
      <p className="text-xs leading-5 text-gray-500">Lot dibulatkan ke atas, average termasuk fee beli tambahan. Harga saham di pasar tidak berubah karena average down.</p>
      <div className="flex justify-end border-t border-gray-200 pt-4"><Button type="button" onClick={onClose} className="w-full sm:w-auto">Selesai</Button></div>
    </div>
  );
}

function Input({ label, value, onChange, autoFocus }: { label: string; value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-medium text-gray-700">{label}<input type="number" inputMode="decimal" min="0" step="any" autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full min-w-0 rounded-md border border-gray-300 px-3 tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" /></label>;
}

function ResultValue({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <div className="min-w-0"><dt className="text-xs leading-5 text-gray-500">{label}</dt><dd className={`mt-1 break-words font-semibold tabular-nums ${highlight ? "text-lg text-brand-700" : "text-sm text-gray-900"}`}>{value}</dd></div>;
}
