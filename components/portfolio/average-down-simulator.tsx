"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateAverageDown } from "@/lib/portfolio-average-down";
import type { PortfolioHolding } from "@/lib/portfolio-store";

const number = (value: number, decimals = 0) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: decimals }).format(value);
const rupiah = (value: number, decimals = 0) => `Rp ${number(value, decimals)}`;

export function AverageDownSimulator({ holding, marketPrice, source, updatedAt, onClose }: {
  holding: PortfolioHolding;
  marketPrice?: number;
  source?: string;
  updatedAt?: string;
  onClose: () => void;
}) {
  const [reference, setReference] = useState(marketPrice ? String(marketPrice) : "");
  const [buyPrice, setBuyPrice] = useState(marketPrice ? String(marketPrice) : "");
  const [mode, setMode] = useState<"recovery" | "average">("recovery");
  const [recovery, setRecovery] = useState("10");
  const [average, setAverage] = useState("");
  const [buyFee, setBuyFee] = useState("0.15");
  const [sellFee, setSellFee] = useState("0.25");
  const result = calculateAverageDown({
    lots: holding.lots, averagePrice: holding.averagePrice,
    referencePrice: reference.trim() ? Number(reference) : NaN,
    buyPrice: buyPrice.trim() ? Number(buyPrice) : NaN,
    buyFeePercent: buyFee.trim() ? Number(buyFee) : NaN,
    sellFeePercent: sellFee.trim() ? Number(sellFee) : NaN,
    target: { mode, value: mode === "recovery" ? recovery.trim() ? Number(recovery) : NaN : average.trim() ? Number(average) : NaN },
  });

  return (
    <div className="min-w-0 space-y-5">
      <dl className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4 text-sm">
        <ResultValue label="Posisi saat ini" value={`${number(holding.lots)} lot`} />
        <ResultValue label="Average awal" value={rupiah(holding.averagePrice, 2)} />
      </dl>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Input label="Harga acuan pasar (Rp)" value={reference} onChange={setReference} autoFocus />
        <Input label="Harga beli tambahan (Rp)" value={buyPrice} onChange={setBuyPrice} />
      </div>
      <p className="text-xs leading-5 text-gray-500">
        {marketPrice ? `Acuan awal ${source}${updatedAt && Number.isFinite(Date.parse(updatedAt)) ? `, ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(updatedAt))} WIB` : ""}.` : "Harga pasar belum tersedia. Isi harga acuan secara manual."}
        {marketPrice && Number(reference) !== marketPrice ? " Acuan telah diubah manual." : ""}
      </p>
      <fieldset className="min-w-0 space-y-3">
        <legend className="mb-2 text-sm font-semibold text-gray-900">Target simulasi</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex min-h-10 items-center gap-2 text-sm text-gray-700"><input type="radio" name="avg-down-target" checked={mode === "recovery"} onChange={() => setMode("recovery")} />Kenaikan harga menuju BEP</label>
          <label className="flex min-h-10 items-center gap-2 text-sm text-gray-700"><input type="radio" name="avg-down-target" checked={mode === "average"} onChange={() => setMode("average")} />Target average manual</label>
        </div>
        {mode === "recovery" ? <div className="space-y-2">
          <Input label="BEP saat harga naik dari acuan (%)" value={recovery} onChange={setRecovery} />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan target kenaikan">
            {[5, 10, 15, 20].map((value) => <button key={value} type="button" aria-pressed={Number(recovery) === value} onClick={() => setRecovery(String(value))} className="h-9 min-w-14 rounded-md border border-gray-200 px-3 text-sm tabular-nums text-gray-600 aria-pressed:border-brand-300 aria-pressed:bg-brand-50 aria-pressed:text-brand-700">{value}%</button>)}
          </div>
        </div> : <Input label="Target average setelah fee beli (Rp)" value={average} onChange={setAverage} />}
      </fieldset>
      <div className="grid min-w-0 grid-cols-2 gap-4">
        <Input label="Fee beli (%)" value={buyFee} onChange={setBuyFee} />
        <Input label="Fee jual (%)" value={sellFee} onChange={setSellFee} />
      </div>
      <section aria-label="Hasil simulasi average down" aria-live="polite" className="min-w-0 border-y border-gray-200 py-4">
        {"message" in result ? <p className="text-sm leading-6 text-amber-800">{result.message}</p> : <>
          {result.status === "achieved" ? <p className="mb-4 text-sm font-medium text-emerald-700">Target sudah tercapai tanpa tambahan pembelian.</p> : null}
          <dl className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <ResultValue label="Tambahan lot minimum" value={`${number(result.additionalLots)} lot`} highlight />
            <ResultValue label="Dana tambahan termasuk fee" value={rupiah(result.additionalCapital, 2)} highlight />
            <ResultValue label="Nilai beli / Fee beli" value={`${rupiah(result.grossBuy, 2)} / ${rupiah(result.buyFee, 2)}`} />
            <ResultValue label="Total lot setelah pembelian" value={`${number(result.totalLots)} lot`} />
            <ResultValue label="Average baru termasuk fee beli" value={rupiah(result.averagePrice, 4)} />
            <ResultValue label="BEP setelah fee jual" value={rupiah(result.breakevenPrice, 4)} />
            <ResultValue label="Kenaikan dari acuan menuju BEP" value={`${number(Math.max(0, result.recoveryPercent), 2)}%${result.recoveryPercent < 0 ? " (sudah di atas BEP)" : ""}`} />
            <ResultValue label="Total modal setelah pembelian" value={rupiah(result.totalCapital, 2)} />
          </dl>
          {result.additionalLots > 0 ? <p className="mt-4 text-xs leading-5 text-amber-800">Modal bertambah {number(result.capitalIncreasePercent, 1)}% dari modal posisi awal. Average lebih rendah tidak mengurangi risiko penurunan harga.</p> : null}
        </>}
      </section>
      <p className="flex items-start gap-2 text-xs leading-5 text-gray-500"><Info className="mt-0.5 size-4 shrink-0" />Average awal dianggap sebagai modal per lembar yang tercatat; fee beli lama tidak ditambahkan lagi. BEP teoretis belum menyesuaikan fraksi harga bursa.</p>
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
