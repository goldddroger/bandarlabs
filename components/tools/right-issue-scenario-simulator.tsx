"use client";

import { useMemo, useState } from "react";
import { BadgeDollarSign, CircleOff, Percent, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

type Scenario = {
  id: "full" | "partial" | "sell" | "expire";
  title: string;
  subtitle: string;
  subscribedShares: number;
  sharesAfter: number;
  cashRequired: number;
  rightsSaleProceeds: number;
  averageCostAfter: number;
  netWealthAtTerp: number;
  netWealthChange: number;
  relativeOwnershipDrop: number;
};

function currency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function shares(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
}

function percent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function RightIssueScenarioSimulator({
  oldShares,
  averageCost,
  marketPrice,
  ratioOld,
  ratioNew,
  exercisePrice,
}: {
  oldShares: number;
  averageCost: number;
  marketPrice: number;
  ratioOld: number;
  ratioNew: number;
  exercisePrice: number;
}) {
  const [partialPercent, setPartialPercent] = useState(50);
  const valid = oldShares > 0 && marketPrice > 0 && ratioOld > 0 && ratioNew > 0 && exercisePrice > 0;

  const calculation = useMemo(() => {
    if (!valid) return null;
    const cost = averageCost > 0 ? averageCost : marketPrice;
    const entitledShares = (oldShares / ratioOld) * ratioNew;
    const totalRatio = ratioOld + ratioNew;
    const terp = ((ratioOld * marketPrice) + (ratioNew * exercisePrice)) / totalRatio;
    const rightValue = Math.max(marketPrice - terp, 0);
    const baselineMarketValue = oldShares * marketPrice;

    const createScenario = (
      id: Scenario["id"],
      title: string,
      subtitle: string,
      participation: number,
      sellRemainder: boolean,
    ): Scenario => {
      const subscribedShares = entitledShares * participation;
      const remainingRights = entitledShares - subscribedShares;
      const cashRequired = subscribedShares * exercisePrice;
      const rightsSaleProceeds = sellRemainder ? remainingRights * rightValue : 0;
      const sharesAfter = oldShares + subscribedShares;
      const averageCostAfter = sharesAfter > 0 ? ((oldShares * cost) + cashRequired) / sharesAfter : 0;
      const netWealthAtTerp = (sharesAfter * terp) + rightsSaleProceeds - cashRequired;
      const netWealthChange = baselineMarketValue > 0 ? ((netWealthAtTerp - baselineMarketValue) / baselineMarketValue) * 100 : 0;
      const relativeOwnershipAfter = (1 + (participation * ratioNew / ratioOld)) / (1 + (ratioNew / ratioOld));
      return {
        id, title, subtitle, subscribedShares, sharesAfter, cashRequired, rightsSaleProceeds,
        averageCostAfter, netWealthAtTerp, netWealthChange,
        relativeOwnershipDrop: Math.max(0, (1 - relativeOwnershipAfter) * 100),
      };
    };

    return {
      entitledShares,
      terp,
      rightValue,
      baselineMarketValue,
      scenarios: [
        createScenario("full", "Tebus seluruh hak", "Menjaga porsi kepemilikan", 1, false),
        createScenario("partial", `Tebus ${partialPercent}%`, "Sisa HMETD diasumsikan dijual", partialPercent / 100, true),
        createScenario("sell", "Jual seluruh HMETD", "Tidak menambah modal", 0, true),
        createScenario("expire", "Biarkan kedaluwarsa", "Hak tidak ditebus atau dijual", 0, false),
      ],
    };
  }, [averageCost, exercisePrice, marketPrice, oldShares, partialPercent, ratioNew, ratioOld, valid]);

  return (
    <section className="mt-6 border-t border-gray-200 pt-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><Scale className="size-5 text-red-600" /><h2 className="text-lg font-semibold text-gray-950">Simulator Keputusan HMETD</h2></div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">Bandingkan konsekuensi setiap pilihan pada harga teoretis ex-rights. Perhitungan belum memasukkan fee transaksi dan pergerakan harga pasar.</p>
        </div>
        <label className="grid gap-1.5 text-sm font-medium text-gray-700 lg:w-64">
          Porsi hak yang ditebus sebagian
          <span className="flex h-10 items-center gap-3 rounded-md border border-gray-200 bg-white px-3">
            <input type="range" min="0" max="100" step="5" value={partialPercent} onChange={(event) => setPartialPercent(Number(event.target.value))} className="min-w-0 flex-1 accent-red-600" />
            <span className="w-10 text-right text-sm font-semibold text-gray-950">{partialPercent}%</span>
          </span>
        </label>
      </div>

      {!calculation ? (
        <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-gray-700">Lengkapi saham lama, harga pasar, rasio, dan harga tebus.</p>
          <p className="mt-1 text-xs text-gray-500">Simulator akan aktif otomatis setelah seluruh angka utama tersedia.</p>
        </div>
      ) : (
        <>
          <dl className="mt-4 grid gap-px overflow-hidden rounded-md border border-gray-200 bg-gray-200 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Hak diperoleh" value={`${shares(calculation.entitledShares)} lembar`} />
            <Summary label="TERP" value={currency(calculation.terp)} />
            <Summary label="Nilai per HMETD" value={currency(calculation.rightValue)} />
            <Summary label="Nilai awal portfolio" value={currency(calculation.baselineMarketValue)} />
          </dl>

          <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
            {calculation.scenarios.map((scenario) => {
              const expires = scenario.id === "expire";
              const full = scenario.id === "full";
              return (
                <article key={scenario.id} className={cn("overflow-hidden rounded-md border bg-white", full ? "border-emerald-200" : expires ? "border-red-200" : "border-gray-200")}>
                  <div className={cn("border-b px-4 py-3", full ? "border-emerald-100 bg-emerald-50" : expires ? "border-red-100 bg-red-50" : "border-gray-100 bg-gray-50")}>
                    <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-gray-950">{scenario.title}</h3><p className="mt-0.5 text-xs text-gray-500">{scenario.subtitle}</p></div>{full ? <BadgeDollarSign className="size-5 text-emerald-600" /> : expires ? <CircleOff className="size-5 text-red-600" /> : <Percent className="size-5 text-gray-500" />}</div>
                  </div>
                  <dl className="divide-y divide-gray-100 px-4 text-sm">
                    <Row label="Saham ditebus" value={`${shares(scenario.subscribedShares)} lembar`} />
                    <Row label="Dana tambahan" value={currency(scenario.cashRequired)} emphasis={scenario.cashRequired > 0} />
                    <Row label="Hasil jual hak" value={currency(scenario.rightsSaleProceeds)} positive={scenario.rightsSaleProceeds > 0} />
                    <Row label="Saham setelah aksi" value={`${shares(scenario.sharesAfter)} lembar`} />
                    <Row label="Average baru" value={currency(scenario.averageCostAfter)} />
                    <Row label="Penurunan porsi relatif" value={`${scenario.relativeOwnershipDrop.toFixed(2)}%`} negative={scenario.relativeOwnershipDrop > 0} />
                    <Row label="Kekayaan neto teoretis" value={currency(scenario.netWealthAtTerp)} />
                  </dl>
                  <div className={cn("mx-4 mb-4 mt-3 rounded-md px-3 py-2 text-xs font-medium", Math.abs(scenario.netWealthChange) < 0.01 ? "bg-blue-50 text-blue-800" : scenario.netWealthChange < 0 ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800")}>
                    Dampak teoritis {percent(scenario.netWealthChange)} terhadap nilai awal
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-500">Pada kondisi teoretis, menebus atau menjual HMETD menjaga nilai ekonomi. Membiarkan hak kedaluwarsa menghilangkan nilai hak dan tetap menyebabkan dilusi.</p>
        </>
      )}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="bg-white px-4 py-3"><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-gray-950">{value}</dd></div>;
}

function Row({ label, value, emphasis = false, positive = false, negative = false }: { label: string; value: string; emphasis?: boolean; positive?: boolean; negative?: boolean }) {
  return <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-xs text-gray-500">{label}</dt><dd className={cn("text-right text-xs font-semibold text-gray-800", emphasis && "text-amber-700", positive && "text-emerald-700", negative && "text-red-700")}>{value}</dd></div>;
}
