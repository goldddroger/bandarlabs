"use client";

import { Landmark, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinancialImpactInputs = {
  equity: string;
  debt: string;
  netIncome: string;
  interestExpense: string;
  outstandingShares: string;
  debtRepayment: string;
  expectedProfitIncrease: string;
  taxRate: string;
};

export type FinancialImpactProjection = {
  fundsRaised: number;
  equityBefore: number;
  equityAfter: number;
  debtBefore: number;
  debtAfter: number;
  derBefore: number;
  derAfter: number;
  bvpsBefore: number;
  bvpsAfter: number;
  epsBefore: number;
  epsAfter: number;
  roeBefore: number;
  roeAfter: number;
  interestBefore: number;
  interestAfter: number;
  interestSavings: number;
  sharesAfter: number;
};

export const emptyFinancialImpactInputs: FinancialImpactInputs = {
  equity: "", debt: "", netIncome: "", interestExpense: "", outstandingShares: "",
  debtRepayment: "", expectedProfitIncrease: "", taxRate: "22",
};

function number(value: string) {
  const parsed = Number(value.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateFinancialImpact(inputs: FinancialImpactInputs, newShares: number, exercisePrice: number): FinancialImpactProjection {
  const equity = number(inputs.equity);
  const debt = number(inputs.debt);
  const netIncome = number(inputs.netIncome);
  const interestExpense = number(inputs.interestExpense);
  const outstandingShares = number(inputs.outstandingShares);
  const debtRepayment = Math.min(number(inputs.debtRepayment), debt);
  const expectedProfitIncrease = number(inputs.expectedProfitIncrease);
  const taxRate = Math.max(0, Math.min(100, number(inputs.taxRate))) / 100;
  const fundsRaised = Math.max(0, newShares) * Math.max(0, exercisePrice);
  const equityAfter = equity + fundsRaised;
  const debtAfter = Math.max(0, debt - debtRepayment);
  const interestSavings = debt > 0 ? interestExpense * Math.min(debtRepayment / debt, 1) : 0;
  const interestAfter = Math.max(0, interestExpense - interestSavings);
  const projectedNetIncome = netIncome + expectedProfitIncrease + (interestSavings * (1 - taxRate));
  const sharesAfter = outstandingShares + Math.max(0, newShares);
  return {
    fundsRaised,
    equityBefore: equity,
    equityAfter,
    debtBefore: debt,
    debtAfter,
    derBefore: equity > 0 ? debt / equity : 0,
    derAfter: equityAfter > 0 ? debtAfter / equityAfter : 0,
    bvpsBefore: outstandingShares > 0 ? equity / outstandingShares : 0,
    bvpsAfter: sharesAfter > 0 ? equityAfter / sharesAfter : 0,
    epsBefore: outstandingShares > 0 ? netIncome / outstandingShares : 0,
    epsAfter: sharesAfter > 0 ? projectedNetIncome / sharesAfter : 0,
    roeBefore: equity > 0 ? (netIncome / equity) * 100 : 0,
    roeAfter: equityAfter > 0 ? (projectedNetIncome / equityAfter) * 100 : 0,
    interestBefore: interestExpense,
    interestAfter,
    interestSavings,
    sharesAfter,
  };
}

function money(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", notation: Math.abs(value) >= 1_000_000_000 ? "compact" : "standard", maximumFractionDigits: 2 }).format(value);
}

function perShare(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value)}`;
}

export function RightIssueFinancialImpact({ inputs, onChange, newShares, exercisePrice }: { inputs: FinancialImpactInputs; onChange: (inputs: FinancialImpactInputs) => void; newShares: number; exercisePrice: number }) {
  const projection = calculateFinancialImpact(inputs, newShares, exercisePrice);
  const ready = number(inputs.equity) > 0 && number(inputs.outstandingShares) > 0 && newShares > 0 && exercisePrice > 0;
  const update = (key: keyof FinancialImpactInputs, value: string) => onChange({ ...inputs, [key]: value });
  return <section className="mt-6 border-t border-gray-200 pt-5">
    <div className="flex items-start gap-3"><Landmark className="mt-0.5 size-5 shrink-0 text-red-600" /><div><h3 className="text-base font-semibold text-gray-950">Financial Impact Projection</h3><p className="mt-1 text-sm leading-6 text-gray-600">Masukkan angka laporan terakhir dalam rupiah dan lembar saham. Proyeksi memakai dana bruto right issue serta asumsi yang dapat kamu ubah.</p></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Input label="Ekuitas saat ini" prefix="Rp" value={inputs.equity} onChange={(value) => update("equity", value)} />
      <Input label="Total utang berbunga" prefix="Rp" value={inputs.debt} onChange={(value) => update("debt", value)} />
      <Input label="Laba bersih tahunan" prefix="Rp" value={inputs.netIncome} onChange={(value) => update("netIncome", value)} />
      <Input label="Beban bunga tahunan" prefix="Rp" value={inputs.interestExpense} onChange={(value) => update("interestExpense", value)} />
      <Input label="Saham beredar sebelum RI" suffix="lembar" value={inputs.outstandingShares} onChange={(value) => update("outstandingShares", value)} />
      <Input label="Dana untuk bayar utang" prefix="Rp" value={inputs.debtRepayment} onChange={(value) => update("debtRepayment", value)} />
      <Input label="Tambahan laba operasional" prefix="Rp" value={inputs.expectedProfitIncrease} onChange={(value) => update("expectedProfitIncrease", value)} />
      <Input label="Tarif pajak" suffix="%" value={inputs.taxRate} onChange={(value) => update("taxRate", value)} />
    </div>
    {!ready ? <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">Lengkapi ekuitas, saham beredar, jumlah saham baru, dan harga pelaksanaan untuk melihat proyeksi.</div> : <>
      <div className="mt-4 grid overflow-hidden rounded-md border border-gray-200 sm:grid-cols-2 lg:grid-cols-3">
        <Impact label="Ekuitas" before={money(projection.equityBefore)} after={money(projection.equityAfter)} positive={projection.equityAfter >= projection.equityBefore} />
        <Impact label="Debt-to-equity" before={`${projection.derBefore.toFixed(2)}x`} after={`${projection.derAfter.toFixed(2)}x`} positive={projection.derAfter <= projection.derBefore} />
        <Impact label="Book value/share" before={perShare(projection.bvpsBefore)} after={perShare(projection.bvpsAfter)} positive={projection.bvpsAfter >= projection.bvpsBefore} />
        <Impact label="EPS terdilusi" before={perShare(projection.epsBefore)} after={perShare(projection.epsAfter)} positive={projection.epsAfter >= projection.epsBefore} />
        <Impact label="ROE" before={`${projection.roeBefore.toFixed(2)}%`} after={`${projection.roeAfter.toFixed(2)}%`} positive={projection.roeAfter >= projection.roeBefore} />
        <Impact label="Beban bunga" before={money(projection.interestBefore)} after={money(projection.interestAfter)} positive={projection.interestAfter <= projection.interestBefore} />
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500">Dana bruto terhimpun {money(projection.fundsRaised)}. Penghematan bunga dihitung proporsional terhadap utang yang dilunasi; laba tambahan adalah asumsi pengguna, bukan hasil prediksi otomatis.</p>
    </>}
  </section>;
}

function Input({ label, value, prefix, suffix, onChange }: { label: string; value: string; prefix?: string; suffix?: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1.5 text-xs font-medium text-gray-600"><span>{label}</span><span className="flex h-10 items-center rounded-md border border-gray-200 bg-white px-3 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100">{prefix ? <span className="mr-2 text-gray-400">{prefix}</span> : null}<input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none" placeholder="0" />{suffix ? <span className="ml-2 text-gray-400">{suffix}</span> : null}</span></label>;
}

function Impact({ label, before, after, positive }: { label: string; before: string; after: string; positive: boolean }) {
  const Icon = positive ? TrendingUp : TrendingDown;
  return <div className="border-b border-gray-100 p-4 last:border-0 sm:border-r"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-gray-500">{label}</p><Icon className={cn("size-4", positive ? "text-emerald-600" : "text-red-600")} /></div><div className="mt-2 flex items-baseline gap-2"><span className="text-xs text-gray-400">{before}</span><span className="text-gray-300">→</span><strong className={cn("text-sm", positive ? "text-emerald-700" : "text-red-700")}>{after}</strong></div></div>;
}
