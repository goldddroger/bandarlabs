"use client";

import { useMemo, useState } from "react";
import { Calculator, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type CalculatorMode = "gain" | "dividend";

const defaultValues = {
  buyPrice: "",
  sellPrice: "",
  lots: "",
  buyFeePercent: "0,15",
  sellFeePercent: "0,15",
  dividendPerShare: "",
  dividendTaxPercent: "10",
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function Field({
  label,
  value,
  onChange,
  prefix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-gray-700">
      <span>{label}</span>
      <span className="flex h-11 items-center rounded-md border border-gray-200 bg-white px-3 transition duration-150 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100">
        {prefix ? <span className="mr-2 text-sm font-semibold text-gray-500">{prefix}</span> : null}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-gray-950 outline-none placeholder:text-gray-400"
        />
      </span>
    </label>
  );
}

export function CapitalGainCalculator() {
  const [mode, setMode] = useState<CalculatorMode>("gain");
  const [values, setValues] = useState(defaultValues);

  const result = useMemo(() => {
    const buyPrice = parseNumber(values.buyPrice);
    const sellPrice = parseNumber(values.sellPrice);
    const lots = parseNumber(values.lots);
    const shares = lots * 100;
    const buyFeePercent = parseNumber(values.buyFeePercent) / 100;
    const sellFeePercent = parseNumber(values.sellFeePercent) / 100;
    const dividendPerShare = mode === "dividend" ? parseNumber(values.dividendPerShare) : 0;
    const dividendTaxPercent = mode === "dividend" ? parseNumber(values.dividendTaxPercent) / 100 : 0;

    const grossBuy = buyPrice * shares;
    const buyFee = grossBuy * buyFeePercent;
    const totalBuy = grossBuy + buyFee;
    const grossSell = sellPrice * shares;
    const sellFee = grossSell * sellFeePercent;
    const netSell = grossSell - sellFee;
    const grossDividend = dividendPerShare * shares;
    const dividendTax = grossDividend * dividendTaxPercent;
    const netDividend = grossDividend - dividendTax;
    const profitLoss = netSell + netDividend - totalBuy;
    const profitLossPercent = totalBuy > 0 ? (profitLoss / totalBuy) * 100 : 0;

    return {
      shares,
      grossBuy,
      buyFee,
      totalBuy,
      grossSell,
      sellFee,
      netSell,
      grossDividend,
      dividendTax,
      netDividend,
      profitLoss,
      profitLossPercent,
    };
  }, [mode, values]);

  function updateValue(key: keyof typeof defaultValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setValues(defaultValues);
    setMode("gain");
  }

  const positive = result.profitLoss >= 0;

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-gray-950">Calculator Gain</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Hitung estimasi profit/loss saham dari harga beli, harga jual, lot, fee broker, dan dividen tunai bila ada.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition duration-150 hover:bg-gray-50 md:w-auto"
        >
          <RefreshCw className="size-4" />
          Reset
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.7fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 inline-grid rounded-md border border-gray-200 bg-gray-50 p-1 sm:grid-cols-2">
            {[
              ["gain", "Capital Gain"],
              ["dividend", "Calculator Dividen"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value as CalculatorMode)}
                className={cn(
                  "h-9 rounded px-4 text-sm font-semibold transition duration-150",
                  mode === value ? "bg-white text-red-700 shadow-sm" : "text-gray-600 hover:text-gray-950",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Harga beli / lembar"
                prefix="Rp"
                value={values.buyPrice}
                placeholder="Contoh 1.250"
                onChange={(value) => updateValue("buyPrice", value)}
              />
              <Field
                label="Harga jual / lembar"
                prefix="Rp"
                value={values.sellPrice}
                placeholder="Contoh 1.400"
                onChange={(value) => updateValue("sellPrice", value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Lot" value={values.lots} placeholder="Contoh 10" onChange={(value) => updateValue("lots", value)} />
              <Field label="Fee beli (%)" value={values.buyFeePercent} onChange={(value) => updateValue("buyFeePercent", value)} />
              <Field label="Fee jual (%)" value={values.sellFeePercent} onChange={(value) => updateValue("sellFeePercent", value)} />
            </div>
            {mode === "dividend" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Dividen / lembar"
                  prefix="Rp"
                  value={values.dividendPerShare}
                  placeholder="Contoh 25"
                  onChange={(value) => updateValue("dividendPerShare", value)}
                />
                <Field
                  label="Pajak dividen (%)"
                  value={values.dividendTaxPercent}
                  onChange={(value) => updateValue("dividendTaxPercent", value)}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Rumus</p>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              P/L = [(Harga Jual x Lot x 100) - Fee Jual] - [(Harga Beli x Lot x 100) + Fee Beli]
              {mode === "dividend" ? " + [(Dividen per Lembar x Lot x 100) - Pajak Dividen]." : "."}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-red-50 text-red-700">
              <Calculator className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-gray-950">Hasil Perhitungan</h2>
              <p className="text-xs text-gray-500">Estimasi sebelum pajak final lain bila berlaku.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Jumlah lembar" value={`${formatNumber(result.shares)} lembar`} />
            <Metric label="Nilai beli bruto" value={formatCurrency(result.grossBuy)} />
            <Metric label="Fee beli" value={formatCurrency(result.buyFee)} />
            <Metric label="Total modal beli" value={formatCurrency(result.totalBuy)} />
            <Metric label="Nilai jual bruto" value={formatCurrency(result.grossSell)} />
            <Metric label="Fee jual" value={formatCurrency(result.sellFee)} />
            <Metric label="Hasil jual bersih" value={formatCurrency(result.netSell)} />
            <Metric label="P/L %" value={formatPercent(result.profitLossPercent)} tone={positive ? "green" : "red"} />
            {mode === "dividend" ? (
              <>
                <Metric label="Dividen bruto" value={formatCurrency(result.grossDividend)} />
                <Metric label={`Pajak dividen (${values.dividendTaxPercent || 0}%)`} value={formatCurrency(result.dividendTax)} tone="red" />
                <Metric label="Dividen bersih" value={formatCurrency(result.netDividend)} tone="green" />
              </>
            ) : null}
          </div>

          <div
            className={cn(
              "mt-4 rounded-lg border p-4",
              positive ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800",
            )}
          >
            <p className="text-xs font-semibold uppercase">Hasil Profit / Loss</p>
            <p className="mt-2 text-3xl font-semibold">{formatCurrency(result.profitLoss)}</p>
            <p className="mt-2 text-sm">
              {positive ? "Hasil positif berarti transaksi ini menghasilkan keuntungan." : "Hasil negatif berarti transaksi ini mengalami kerugian."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold", tone === "green" && "text-green-700", tone === "red" && "text-red-700", !tone && "text-gray-950")}>
        {value}
      </p>
    </div>
  );
}
