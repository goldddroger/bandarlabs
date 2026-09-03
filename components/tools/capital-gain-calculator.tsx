"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, Calculator, ChartNoAxesCombined, Coins, Layers3, Plus, RefreshCw, Trash2, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { RightIssueAnalyzer } from "@/components/tools/right-issue-analyzer";
import { RightIssueScenarioSimulator } from "@/components/tools/right-issue-scenario-simulator";
import { PrivatePlacementAnalyzer } from "@/components/tools/private-placement-analyzer";

type CalculatorMode = "rightIssue" | "privatePlacement" | "gain" | "dividend" | "averageDown";

const calculatorModes: Array<{ value: CalculatorMode; label: string; icon: typeof Calculator }> = [
  { value: "rightIssue", label: "Right Issue", icon: Layers3 },
  { value: "privatePlacement", label: "Private Placement", icon: BriefcaseBusiness },
  { value: "gain", label: "Capital Gain", icon: ChartNoAxesCombined },
  { value: "dividend", label: "Dividen", icon: Coins },
  { value: "averageDown", label: "Average Down", icon: TrendingDown },
];

type PurchaseRow = { id: number; price: string; lots: string };

const defaultPurchases: PurchaseRow[] = [
  { id: 1, price: "", lots: "" },
  { id: 2, price: "", lots: "" },
];

const defaultValues = {
  buyPrice: "",
  sellPrice: "",
  lots: "",
  buyFeePercent: "0,15",
  sellFeePercent: "0,15",
  dividendPerShare: "",
  dividendTaxPercent: "10",
  oldShares: "",
  averageCost: "",
  marketPrice: "",
  ratioOld: "",
  ratioNew: "",
  exercisePrice: "",
  outstandingShares: "",
  newPlacementShares: "",
  placementMarketPrice: "",
  placementPrice: "",
  ownedShares: "",
  targetSellPrice: "",
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

function formatLots(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShares(value: number) {
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
  suffix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
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
        {suffix ? <span className="ml-2 text-xs font-semibold text-gray-500">{suffix}</span> : null}
      </span>
    </label>
  );
}

export function CapitalGainCalculator() {
  const [mode, setMode] = useState<CalculatorMode>("rightIssue");
  const [values, setValues] = useState(defaultValues);
  const [purchases, setPurchases] = useState<PurchaseRow[]>(defaultPurchases);
  const [nextPurchaseId, setNextPurchaseId] = useState(3);

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

  const rightIssueResult = useMemo(() => {
    const oldShares = parseNumber(values.oldShares);
    const marketPrice = parseNumber(values.marketPrice);
    const ratioOld = parseNumber(values.ratioOld);
    const ratioNew = parseNumber(values.ratioNew);
    const exercisePrice = parseNumber(values.exercisePrice);
    const newShares = ratioOld > 0 ? (oldShares / ratioOld) * ratioNew : 0;
    const totalShares = oldShares + newShares;
    const additionalCapital = newShares * exercisePrice;
    const terp = ratioOld + ratioNew > 0 ? ((ratioOld * marketPrice) + (ratioNew * exercisePrice)) / (ratioOld + ratioNew) : 0;
    const rightValue = Math.max(marketPrice - terp, 0);
    const theoreticalPortfolioValue = totalShares * terp;
    return { newShares, totalShares, additionalCapital, terp, rightValue, theoreticalPortfolioValue };
  }, [values.exercisePrice, values.marketPrice, values.oldShares, values.ratioNew, values.ratioOld]);

  const privatePlacementResult = useMemo(() => {
    const outstandingShares = parseNumber(values.outstandingShares);
    const newShares = parseNumber(values.newPlacementShares);
    const marketPrice = parseNumber(values.placementMarketPrice);
    const placementPrice = parseNumber(values.placementPrice);
    const ownedShares = parseNumber(values.ownedShares);
    const totalSharesAfter = outstandingShares + newShares;
    const capitalRaised = newShares * placementPrice;
    const dilutionPercent = totalSharesAfter > 0 ? (newShares / totalSharesAfter) * 100 : 0;
    const theoreticalPrice = totalSharesAfter > 0
      ? ((outstandingShares * marketPrice) + capitalRaised) / totalSharesAfter
      : 0;
    const placementDiscountPercent = marketPrice > 0 ? ((placementPrice - marketPrice) / marketPrice) * 100 : 0;
    const ownershipBefore = outstandingShares > 0 ? (ownedShares / outstandingShares) * 100 : 0;
    const ownershipAfter = totalSharesAfter > 0 ? (ownedShares / totalSharesAfter) * 100 : 0;
    const ownershipDilution = ownershipBefore - ownershipAfter;

    return {
      totalSharesAfter,
      capitalRaised,
      dilutionPercent,
      theoreticalPrice,
      placementDiscountPercent,
      ownedShares,
      ownershipBefore,
      ownershipAfter,
      ownershipDilution,
    };
  }, [values.newPlacementShares, values.outstandingShares, values.ownedShares, values.placementMarketPrice, values.placementPrice]);

  const averageDownResult = useMemo(() => {
    const rows = purchases.map((purchase) => ({ price: parseNumber(purchase.price), shares: parseNumber(purchase.lots) * 100 }));
    const totalShares = rows.reduce((total, row) => total + row.shares, 0);
    const totalCapital = rows.reduce((total, row) => total + (row.price * row.shares), 0);
    const averagePrice = totalShares > 0 ? totalCapital / totalShares : 0;
    const targetSellPrice = parseNumber(values.targetSellPrice);
    const targetValue = targetSellPrice * totalShares;
    const targetProfitLoss = targetSellPrice > 0 ? targetValue - totalCapital : 0;
    const targetProfitLossPercent = totalCapital > 0 && targetSellPrice > 0 ? (targetProfitLoss / totalCapital) * 100 : 0;
    return { totalShares, totalCapital, averagePrice, targetSellPrice, targetValue, targetProfitLoss, targetProfitLossPercent };
  }, [purchases, values.targetSellPrice]);

  function updateValue(key: keyof typeof defaultValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setValues(defaultValues);
    setPurchases(defaultPurchases);
    setNextPurchaseId(3);
    setMode("rightIssue");
  }

  function updatePurchase(id: number, key: "price" | "lots", value: string) {
    setPurchases((current) => current.map((purchase) => purchase.id === id ? { ...purchase, [key]: value } : purchase));
  }

  function addPurchase() {
    setPurchases((current) => [...current, { id: nextPurchaseId, price: "", lots: "" }]);
    setNextPurchaseId((current) => current + 1);
  }

  function removePurchase(id: number) {
    setPurchases((current) => current.length > 1 ? current.filter((purchase) => purchase.id !== id) : current);
  }

  const positive = result.profitLoss >= 0;

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-gray-950">Kalkulator Saham</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Hitung estimasi right issue, private placement, average down, capital gain, fee transaksi, serta dividen saham Indonesia.
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
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-100 p-2 sm:grid-cols-6">
              {calculatorModes.map(({ value, label, icon: Icon }, index) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    "col-span-1 inline-flex h-11 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-semibold transition duration-150 sm:col-span-2",
                    index >= 3 && "sm:col-span-3",
                    mode === value
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-white hover:text-gray-950",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
          </div>

          {mode === "rightIssue" ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Jumlah saham lama" suffix="lembar" value={values.oldShares} placeholder="Contoh 1.000" onChange={(value) => updateValue("oldShares", value)} />
                <Field label="Harga pasar saat ini" prefix="Rp" value={values.marketPrice} placeholder="Contoh 1.000" onChange={(value) => updateValue("marketPrice", value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Rasio saham lama" value={values.ratioOld} placeholder="Contoh 2" onChange={(value) => updateValue("ratioOld", value)} />
                <Field label="Rasio saham baru" value={values.ratioNew} placeholder="Contoh 1" onChange={(value) => updateValue("ratioNew", value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Harga tebus (exercise)" prefix="Rp" value={values.exercisePrice} placeholder="Contoh 800" onChange={(value) => updateValue("exercisePrice", value)} />
                <Field label="Harga average kepemilikan (opsional)" prefix="Rp" value={values.averageCost} placeholder="Jika kosong, gunakan harga pasar" onChange={(value) => updateValue("averageCost", value)} />
              </div>
              <p className="text-xs leading-5 text-gray-500">Contoh rasio 2:1 berarti setiap 2 saham lama memperoleh hak menebus 1 saham baru.</p>
              <RightIssueAnalyzer
                marketPrice={parseNumber(values.marketPrice)}
                onApplyFacts={(facts) => setValues((current) => ({
                  ...current,
                  exercisePrice: facts.exercisePrice === undefined ? current.exercisePrice : String(facts.exercisePrice),
                  ratioOld: facts.ratioOld === undefined ? current.ratioOld : String(facts.ratioOld),
                  ratioNew: facts.ratioNew === undefined ? current.ratioNew : String(facts.ratioNew),
                }))}
              />
            </div>
          ) : mode === "privatePlacement" ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Saham beredar sebelum placement" suffix="lembar" value={values.outstandingShares} placeholder="Contoh 1.000.000.000" onChange={(value) => updateValue("outstandingShares", value)} />
                <Field label="Saham baru diterbitkan" suffix="lembar" value={values.newPlacementShares} placeholder="Contoh 100.000.000" onChange={(value) => updateValue("newPlacementShares", value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Harga pasar sebelum placement" prefix="Rp" value={values.placementMarketPrice} placeholder="Contoh 1.000" onChange={(value) => updateValue("placementMarketPrice", value)} />
                <Field label="Harga pelaksanaan placement" prefix="Rp" value={values.placementPrice} placeholder="Contoh 850" onChange={(value) => updateValue("placementPrice", value)} />
              </div>
              <Field label="Saham yang kamu miliki (opsional)" suffix="lembar" value={values.ownedShares} placeholder="Contoh 10.000" onChange={(value) => updateValue("ownedShares", value)} />
              <p className="text-xs leading-5 text-gray-500">Private placement menambah saham beredar tanpa memberikan hak pembelian kepada seluruh pemegang saham lama.</p>
              <PrivatePlacementAnalyzer
                marketPrice={parseNumber(values.placementMarketPrice)}
                onApplyFacts={(facts) => setValues((current) => ({
                  ...current,
                  outstandingShares: facts.sharesBefore === undefined ? current.outstandingShares : String(facts.sharesBefore),
                  newPlacementShares: facts.newShares === undefined ? current.newPlacementShares : String(facts.newShares),
                  placementPrice: facts.placementPrice === undefined ? current.placementPrice : String(facts.placementPrice),
                }))}
              />
            </div>
          ) : mode === "averageDown" ? (
            <div className="grid gap-4">
              <div className="grid gap-4">
                {purchases.map((purchase, index) => (
                  <div key={purchase.id} className="grid gap-3 rounded-md border border-gray-100 bg-gray-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] sm:items-end">
                    <Field label={`Harga beli #${index + 1}`} prefix="Rp" value={purchase.price} placeholder="Contoh 1.000" onChange={(value) => updatePurchase(purchase.id, "price", value)} />
                    <Field label="Jumlah pembelian" suffix="lot" value={purchase.lots} placeholder="Contoh 10" onChange={(value) => updatePurchase(purchase.id, "lots", value)} />
                    <button type="button" onClick={() => removePurchase(purchase.id)} disabled={purchases.length === 1} className="inline-flex size-10 items-center justify-center justify-self-end rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Hapus pembelian ${index + 1}`}><Trash2 className="size-4" /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addPurchase} className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"><Plus className="size-4" />Tambah pembelian</button>
              <Field label="Target harga jual (opsional)" prefix="Rp" value={values.targetSellPrice} placeholder="Contoh 1.200" onChange={(value) => updateValue("targetSellPrice", value)} />
            </div>
          ) : <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Harga beli per saham"
                prefix="Rp"
                value={values.buyPrice}
                placeholder="Contoh 1.250"
                onChange={(value) => updateValue("buyPrice", value)}
              />
              <Field
                label="Harga jual per saham"
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
                  label="Dividen per saham"
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
          </div>}

          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Rumus</p>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              {mode === "rightIssue"
                ? "TERP = [(Rasio Lama x Harga Pasar) + (Rasio Baru x Harga Tebus)] / Total Rasio. Nilai HMETD = Harga Pasar - TERP."
                : mode === "privatePlacement"
                  ? "Harga teoretis = [(Saham Lama x Harga Pasar) + (Saham Baru x Harga Placement)] / Total Saham Baru. Dilusi = Saham Baru / Total Saham Setelah Placement."
                : mode === "averageDown"
                  ? "Setiap input lot dikonversi menjadi 100 saham. Harga rata-rata = Total nilai seluruh pembelian / Total jumlah saham. Estimasi P/L target = (Target Jual x Total Saham) - Total Modal."
                : <>P/L = [(Harga Jual x Lot x 100) - Fee Jual] - [(Harga Beli x Lot x 100) + Fee Beli]{mode === "dividend" ? " + [(Dividen per Saham x Lot x 100) - Pajak Dividen]." : "."}</>}
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

          {mode === "rightIssue" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Saham baru diperoleh" value={`${formatShares(rightIssueResult.newShares)} lembar`} />
              <Metric label="Total saham setelah tebus" value={`${formatShares(rightIssueResult.totalShares)} lembar`} />
              <Metric label="Tambahan modal" value={formatCurrency(rightIssueResult.additionalCapital)} />
              <Metric label="Nilai teoretis portfolio" value={formatCurrency(rightIssueResult.theoreticalPortfolioValue)} />
              <Metric label="Nilai HMETD / hak" value={formatCurrency(rightIssueResult.rightValue)} tone="green" />
              <Metric label="Harga teoretis ex-rights (TERP)" value={formatCurrency(rightIssueResult.terp)} tone="green" />
            </div>
          ) : mode === "privatePlacement" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Total saham setelah placement" value={`${formatShares(privatePlacementResult.totalSharesAfter)} lembar`} />
              <Metric label="Dana yang dihimpun" value={formatCurrency(privatePlacementResult.capitalRaised)} />
              <Metric label="Dilusi pemegang saham lama" value={formatPercent(-privatePlacementResult.dilutionPercent)} tone="red" />
              <Metric label="Harga teoretis setelah placement" value={formatCurrency(privatePlacementResult.theoreticalPrice)} tone="green" />
              <Metric
                label="Diskon / premium harga placement"
                value={formatPercent(privatePlacementResult.placementDiscountPercent)}
                tone={privatePlacementResult.placementDiscountPercent >= 0 ? "green" : "red"}
              />
              {privatePlacementResult.ownedShares > 0 ? (
                <Metric
                  label="Perubahan kepemilikan pribadi"
                  value={`${privatePlacementResult.ownershipBefore.toFixed(4)}% menjadi ${privatePlacementResult.ownershipAfter.toFixed(4)}%`}
                  tone="red"
                />
              ) : null}
            </div>
          ) : mode === "averageDown" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Total lot" value={`${formatLots(averageDownResult.totalShares / 100)} lot`} />
              <Metric label="Total modal" value={formatCurrency(averageDownResult.totalCapital)} />
              <Metric label="Harga rata-rata baru" value={formatCurrency(averageDownResult.averagePrice)} tone="green" />
              {averageDownResult.targetSellPrice > 0 ? <Metric label="Nilai pada target" value={formatCurrency(averageDownResult.targetValue)} /> : null}
              {averageDownResult.targetSellPrice > 0 ? <Metric label="Estimasi P/L target" value={`${formatCurrency(averageDownResult.targetProfitLoss)} · ${formatPercent(averageDownResult.targetProfitLossPercent)}`} tone={averageDownResult.targetProfitLoss >= 0 ? "green" : "red"} /> : null}
            </div>
          ) : <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Jumlah lot" value={`${formatLots(parseNumber(values.lots))} lot`} />
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
          </div>}

          {mode === "gain" || mode === "dividend" ? <div
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
          </div> : mode === "rightIssue" ? (
            <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4 text-violet-900">
              <p className="text-xs font-semibold uppercase">Estimasi Right Issue</p>
              <p className="mt-2 text-3xl font-semibold">{formatCurrency(rightIssueResult.terp)}</p>
              <p className="mt-2 text-sm">Perkiraan TERP setelah saham diperdagangkan tanpa hak. Hasil dapat berbeda karena pergerakan pasar dan pembulatan hak.</p>
            </div>
          ) : mode === "privatePlacement" ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="text-xs font-semibold uppercase">Dampak Private Placement</p>
              <p className="mt-2 text-3xl font-semibold">{formatPercent(-privatePlacementResult.dilutionPercent)}</p>
              <p className="mt-2 text-sm">
                Estimasi harga teoretis menjadi {formatCurrency(privatePlacementResult.theoreticalPrice)}.
                {privatePlacementResult.ownedShares > 0 ? ` Porsi kepemilikan berkurang ${privatePlacementResult.ownershipDilution.toFixed(4)} poin persentase.` : " Isi jumlah saham pribadi untuk melihat perubahan porsi kepemilikan."}
              </p>
            </div>
          ) : (
            <div className={cn("mt-4 rounded-lg border p-4", averageDownResult.targetSellPrice <= 0 ? "border-blue-200 bg-blue-50 text-blue-900" : averageDownResult.targetProfitLoss >= 0 ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800")}>
              <p className="text-xs font-semibold uppercase">Harga Average</p>
              <p className="mt-2 text-3xl font-semibold">{formatCurrency(averageDownResult.averagePrice)}</p>
              <p className="mt-2 text-sm">{averageDownResult.targetSellPrice > 0 ? `Pada target ${formatCurrency(averageDownResult.targetSellPrice)}, estimasi hasil ${formatCurrency(averageDownResult.targetProfitLoss)} (${formatPercent(averageDownResult.targetProfitLossPercent)}).` : "Tambahkan target harga jual untuk melihat estimasi profit atau loss."}</p>
            </div>
          )}
        </div>
      </div>
      {mode === "rightIssue" ? (
        <RightIssueScenarioSimulator
          oldShares={parseNumber(values.oldShares)}
          averageCost={parseNumber(values.averageCost)}
          marketPrice={parseNumber(values.marketPrice)}
          ratioOld={parseNumber(values.ratioOld)}
          ratioNew={parseNumber(values.ratioNew)}
          exercisePrice={parseNumber(values.exercisePrice)}
        />
      ) : null}
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
