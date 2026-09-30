"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Calculator, LogIn, RefreshCw, WalletCards } from "lucide-react";
import { calculateCapitalGain, formatLotInput } from "@/lib/capital-gain";
import { cn } from "@/lib/utils";

const defaults = {
  buyPrice: "",
  sellPrice: "",
  lots: "",
  buyFeePercent: "0,15",
  sellFeePercent: "0,25",
};

function parseNumber(value: string) {
  const normalized = value.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(value);
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function InputField({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <label htmlFor={id} className="grid min-w-0 gap-2 text-sm font-semibold text-gray-800">
      <span>{label}</span>
      <span className="flex h-12 min-w-0 items-center rounded-md border border-gray-300 bg-white px-3 transition focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100">
        {prefix ? <span className="mr-2 shrink-0 text-sm font-semibold text-gray-500">{prefix}</span> : null}
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-base font-semibold text-gray-950 outline-none placeholder:font-normal placeholder:text-gray-400"
        />
        {suffix ? <span className="ml-2 shrink-0 text-xs font-semibold text-gray-500">{suffix}</span> : null}
      </span>
    </label>
  );
}

export function PublicCapitalGainCalculator() {
  const [values, setValues] = useState(defaults);

  const result = useMemo(() => calculateCapitalGain({
    buyPrice: parseNumber(values.buyPrice),
    sellPrice: parseNumber(values.sellPrice),
    lots: parseNumber(values.lots),
    buyFeePercent: parseNumber(values.buyFeePercent),
    sellFeePercent: parseNumber(values.sellFeePercent),
  }), [values]);

  const complete = result.totalBuy > 0 && result.grossSell > 0;
  const positive = result.profitLoss >= 0;

  function update(key: keyof typeof defaults, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/capital-gain" className="flex min-w-0 items-center gap-3" aria-label="BandarLab Capital Gain">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-red-600 text-white"><BarChart3 className="size-6" /></span>
            <span className="min-w-0"><span className="block text-lg font-bold leading-5">Bandar<span className="text-red-600">Lab</span></span><span className="block truncate text-[11px] text-gray-500">Kalkulator Capital Gain</span></span>
          </Link>
          <Link href="/login" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:px-4"><LogIn className="size-4" /><span className="hidden sm:inline">Masuk BandarLab</span><span className="sm:hidden">Masuk</span></Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-red-600">Alat publik</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-gray-950 sm:text-3xl">Kalkulator Capital Gain</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Hitung estimasi profit atau loss transaksi saham Indonesia setelah fee beli dan fee jual. Tidak perlu login.</p>
          </div>
          <button type="button" onClick={() => setValues(defaults)} className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"><RefreshCw className="size-4" />Reset</button>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)] lg:gap-6">
          <section className="rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="transaction-input">
            <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
              <h2 id="transaction-input" className="flex items-center gap-2 text-base font-semibold"><Calculator className="size-5 text-red-600" />Detail Transaksi</h2>
              <p className="mt-1 text-xs leading-5 text-gray-500">Satu lot sama dengan 100 lembar saham.</p>
            </div>
            <div className="grid gap-5 p-4 sm:p-5">
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <InputField id="buy-price" label="Harga beli per saham" prefix="Rp" value={values.buyPrice} placeholder="Contoh 1.250" onChange={(value) => update("buyPrice", value)} />
                <InputField id="sell-price" label="Harga jual per saham" prefix="Rp" value={values.sellPrice} placeholder="Contoh 1.400" onChange={(value) => update("sellPrice", value)} />
              </div>
              <InputField id="lots" label="Jumlah lot" suffix="lot" value={values.lots} placeholder="Contoh 1.000" onChange={(value) => update("lots", formatLotInput(value))} />
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <InputField id="buy-fee" label="Fee beli" suffix="%" value={values.buyFeePercent} onChange={(value) => update("buyFeePercent", value)} />
                <InputField id="sell-fee" label="Fee jual" suffix="%" value={values.sellFeePercent} onChange={(value) => update("sellFeePercent", value)} />
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-xs leading-5 text-gray-600"><span className="font-semibold text-gray-800">Rumus:</span> hasil jual bersih dikurangi total modal beli. Fee dihitung dari nilai bruto masing-masing transaksi.</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" aria-live="polite">
            <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
              <h2 className="flex items-center gap-2 text-base font-semibold"><WalletCards className="size-5 text-red-600" />Hasil Perhitungan</h2>
              <p className="mt-1 text-xs text-gray-500">Estimasi berdasarkan data yang kamu masukkan.</p>
            </div>
            <div className="p-4 sm:p-5">
              <div className={cn("rounded-md border p-4", !complete ? "border-gray-200 bg-gray-50" : positive ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")}>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-600">{complete ? positive ? <ArrowUpRight className="size-4 text-green-700" /> : <ArrowDownRight className="size-4 text-red-700" /> : <Calculator className="size-4" />}Profit / Loss Bersih</div>
                <p className={cn("mt-2 break-words text-2xl font-semibold sm:text-3xl", complete && positive && "text-green-700", complete && !positive && "text-red-700")}>{formatCurrency(result.profitLoss)}</p>
                <p className={cn("mt-2 text-sm font-semibold", complete && positive && "text-green-700", complete && !positive && "text-red-700")}>{formatPercent(result.profitLossPercent)}</p>
              </div>

              <dl className="mt-4 divide-y divide-gray-100 border-y border-gray-100">
                <ResultRow label="Jumlah saham" value={`${formatNumber(result.shares)} lembar`} />
                <ResultRow label="Nilai beli bruto" value={formatCurrency(result.grossBuy)} />
                <ResultRow label="Fee beli" value={formatCurrency(result.buyFee)} />
                <ResultRow label="Total modal beli" value={formatCurrency(result.totalBuy)} strong />
                <ResultRow label="Nilai jual bruto" value={formatCurrency(result.grossSell)} />
                <ResultRow label="Fee jual" value={formatCurrency(result.sellFee)} />
                <ResultRow label="Hasil jual bersih" value={formatCurrency(result.netSell)} strong />
                <ResultRow label="Harga break-even" value={`${formatCurrency(result.breakEvenPrice)} / saham`} strong />
              </dl>
            </div>
          </section>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-gray-500">Hasil kalkulator merupakan estimasi edukasi dan bukan rekomendasi jual atau beli saham.</p>
      </main>
    </div>
  );
}

function ResultRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 py-3 text-sm"><dt className="text-gray-500">{label}</dt><dd className={cn("min-w-0 break-words text-right text-gray-800", strong && "font-semibold text-gray-950")}>{value}</dd></div>;
}
