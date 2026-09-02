"use client";

import Link from "next/link";
import { Download, HardDrive, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateRealizedGain, usePortfolioData } from "@/lib/portfolio-store";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function PortfolioRecovery() {
  const portfolio = usePortfolioData();
  const realized = portfolio.trades.reduce((total, trade) => total + calculateRealizedGain(trade), 0);

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(portfolio, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bandarlab-portfolio-browser-backup-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-gray-500"><HardDrive className="size-4" />Pemulihan lokal</span>
            <h1 className="mt-2 text-2xl font-semibold text-gray-950">Salinan Portfolio di Browser</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Halaman ini hanya membaca penyimpanan browser pada perangkat dan alamat website ini. Tidak ada data yang dikirim ke Supabase.</p>
          </div>
          <Button type="button" onClick={downloadBackup} disabled={!portfolio.holdings.length && !portfolio.trades.length && !portfolio.equityHistory.length}><Download className="size-4" />Unduh JSON</Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Metric label="Posisi aktif" value={portfolio.holdings.length.toLocaleString("id-ID")} />
          <Metric label="Trade selesai" value={portfolio.trades.length.toLocaleString("id-ID")} />
          <Metric label="Riwayat equity" value={portfolio.equityHistory.length.toLocaleString("id-ID")} />
          <Metric label="Total realized" value={formatCurrency(realized)} />
        </div>

        <section className="mt-6 overflow-hidden rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3"><History className="size-4 text-gray-500" /><h2 className="text-sm font-semibold text-gray-950">Trade yang masih tersimpan di browser</h2></div>
          {portfolio.trades.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-xs uppercase text-gray-500"><tr>{["Tanggal", "Ticker", "Lot", "Harga beli", "Harga jual", "Realized"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{[...portfolio.trades].sort((first, second) => second.soldAt.localeCompare(first.soldAt)).map((trade) => <tr key={trade.id}><td className="px-4 py-3 text-gray-600">{trade.soldAt}</td><td className="px-4 py-3 font-semibold text-gray-950">{trade.ticker}</td><td className="px-4 py-3">{trade.lots.toLocaleString("id-ID")}</td><td className="px-4 py-3">{formatCurrency(trade.buyPrice)}</td><td className="px-4 py-3">{formatCurrency(trade.sellPrice)}</td><td className="px-4 py-3 font-semibold">{formatCurrency(calculateRealizedGain(trade))}</td></tr>)}</tbody></table></div> : <div className="px-5 py-12 text-center text-sm text-gray-500">Tidak ada trade pada salinan browser untuk origin ini.</div>}
        </section>

        <p className="mt-5 text-sm text-gray-600">Buka alamat pemulihan ini pada setiap perangkat dan origin yang pernah dipakai, misalnya localhost dan domain Vercel. Bila jumlah trade lebih dari empat, langsung unduh JSON sebelum membuka halaman portfolio biasa.</p>
        <Link href="/portfolio" className="mt-4 inline-flex text-sm font-semibold text-red-700 hover:underline">Kembali ke Portfolio</Link>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 truncate font-semibold text-gray-950">{value}</p></div>;
}
