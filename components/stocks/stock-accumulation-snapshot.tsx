"use client";

import Link from "next/link";
import { ArrowRight, Radar } from "lucide-react";
import {
  formatChangePercent,
  formatStockPrice,
  getPriceChangePercent,
  scoreLabel,
  signalLabel,
  trendLabel,
  useSelectedAccumulationRows,
} from "@/components/accumulation/accumulation-store";
import { cn } from "@/lib/utils";

export function StockAccumulationSnapshot({
  ticker,
  currentPrice,
  fallbackScore,
}: {
  ticker: string;
  currentPrice: number | null;
  fallbackScore: number;
}) {
  const selectedRows = useSelectedAccumulationRows();
  const row = selectedRows.find((item) => item.ticker === ticker);

  if (!row) {
    return (
      <div className="mb-4 flex flex-col gap-4 rounded-lg border border-dashed border-gray-300 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500">
            <Radar className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-950">{ticker} belum masuk Accumulation Radar</p>
            <p className="mt-1 text-sm text-gray-600">Skor profil saat ini {fallbackScore}/100. Tambahkan saham untuk menyimpan status, harga masuk, dan tanggal pantauan.</p>
          </div>
        </div>
        <Link href="/accumulation" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 sm:w-auto">
          Kelola radar <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  const effectiveCurrentPrice = currentPrice ?? row.currentPrice;
  const changePercent = getPriceChangePercent(effectiveCurrentPrice, row.entryPrice);

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-950">Status di Accumulation Radar</p>
          <p className="mt-1 text-xs text-gray-500">Mulai dipantau {row.addedAt}</p>
        </div>
        <span className="w-fit rounded bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{signalLabel(row.signalType)}</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5">
        <RadarMetric label="Skor" value={`${row.score}/100`} detail={scoreLabel(row.score)} />
        <RadarMetric label="Trend" value={trendLabel(row.trend)} detail="Arah pemantauan" />
        <RadarMetric label="Harga masuk" value={formatStockPrice(row.entryPrice)} detail={row.entryPriceSource === "market" ? "Harga pasar" : "Fallback"} />
        <RadarMetric label="Harga saat ini" value={formatStockPrice(effectiveCurrentPrice)} detail="Quote terbaru" />
        <RadarMetric
          label="Change"
          value={formatChangePercent(changePercent)}
          detail="Dari harga masuk"
          valueClassName={changePercent > 0 ? "text-emerald-700" : changePercent < 0 ? "text-red-700" : undefined}
        />
      </div>
      <div className="border-t border-gray-200 px-4 py-3 text-right">
        <Link href="/accumulation" className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline">Edit status radar <ArrowRight className="size-3.5" /></Link>
      </div>
    </div>
  );
}

function RadarMetric({ label, value, detail, valueClassName }: { label: string; value: string; detail: string; valueClassName?: string }) {
  return (
    <div className="border-b border-gray-200 p-4 last:border-b-0 sm:border-r lg:border-b-0 lg:last:border-r-0">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className={cn("mt-2 text-lg font-semibold text-gray-950", valueClassName)}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}
