import Link from "next/link";
import { Search } from "lucide-react";
import { PlaceholderPage } from "@/components/ui/page-shell";
import { idxStockScreenerRows } from "@/lib/idx-stock-screener";
import { cn } from "@/lib/utils";

function formatNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";

  if (value >= 1_000_000_000_000) return `Rp ${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(2)}M`;
  return `Rp ${formatNumber(value)}`;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}%`;
}

function metricTone(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "text-gray-500";
  if (value > 0) return "text-green-700";
  if (value < 0) return "text-red-700";
  return "text-gray-600";
}

export default async function StocksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sector?: string }>;
}) {
  const { q = "", sector = "all" } = await searchParams;
  const query = q.trim().toLowerCase();
  const sectors = Array.from(new Set(idxStockScreenerRows.map((stock) => stock.sector).filter(Boolean))).sort();
  const filteredStocks = idxStockScreenerRows
    .filter((stock) => sector === "all" || stock.sector === sector)
    .filter((stock) =>
      query
        ? [stock.ticker, stock.name, stock.sector, stock.subsector, stock.industry, stock.subindustry].some((value) =>
            value.toLowerCase().includes(query),
          )
        : true,
    );
  const visibleStocks = filteredStocks.slice(0, 120);
  const totalMarketCap = idxStockScreenerRows.reduce((total, stock) => total + (stock.marketCap ?? 0), 0);

  return (
    <PlaceholderPage
      title="Stocks"
      description="Direktori emiten IDX berbasis data screener 17 Agustus 2026, lengkap dengan sektor, valuasi, profitabilitas, market cap, dan momentum."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Emiten</p>
          <p className="mt-2 text-2xl font-semibold text-gray-950">{idxStockScreenerRows.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Sektor</p>
          <p className="mt-2 text-2xl font-semibold text-gray-950">{sectors.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Market Cap</p>
          <p className="mt-2 text-2xl font-semibold text-gray-950">{formatCompactCurrency(totalMarketCap)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Data Source</p>
          <p className="mt-2 text-base font-semibold text-gray-950">IDX Screener</p>
          <p className="mt-1 text-xs text-gray-500">17 Agustus 2026</p>
        </div>
      </div>

      <form className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_260px_auto] lg:items-end">
          <label className="grid gap-2 text-sm text-gray-600" htmlFor="stock-search">
            <span>Cari Saham</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                id="stock-search"
                name="q"
                defaultValue={q}
                placeholder="Ticker, nama emiten, sektor, industri..."
                className="h-10 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 transition duration-150 placeholder:text-gray-400 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </span>
          </label>
          <label className="grid gap-2 text-sm text-gray-600" htmlFor="stock-sector">
            <span>Sektor</span>
            <select
              id="stock-sector"
              name="sector"
              defaultValue={sector}
              className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 transition duration-150 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="all">Semua Sektor</option>
              {sectors.map((sectorName) => (
                <option key={sectorName} value={sectorName}>
                  {sectorName}
                </option>
              ))}
            </select>
          </label>
          <button className="h-10 rounded-md border border-red-600 bg-red-600 px-4 text-sm font-semibold text-white transition duration-150 hover:bg-red-700" type="submit">
            Terapkan
          </button>
        </div>
      </form>

      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Menampilkan {visibleStocks.length} dari {filteredStocks.length} saham.
        </p>
        {filteredStocks.length > visibleStocks.length ? (
          <p className="text-xs text-gray-500">Persempit pencarian untuk melihat hasil yang lebih spesifik.</p>
        ) : null}
      </div>

      <div className="grid gap-3 md:hidden">
        {visibleStocks.map((stock) => (
          <Link key={stock.ticker} href={`/stocks/${stock.ticker}`} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition duration-150 hover:border-red-200 hover:bg-red-50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-950">{stock.ticker}</p>
                <p className="mt-1 truncate text-sm text-gray-600">{stock.name}</p>
              </div>
              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{stock.sector}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-white/80 p-2">
                <p className="text-xs text-gray-500">Market Cap</p>
                <p className="font-semibold text-gray-950">{formatCompactCurrency(stock.marketCap)}</p>
              </div>
              <div className="rounded-md bg-white/80 p-2">
                <p className="text-xs text-gray-500">ROE</p>
                <p className={cn("font-semibold", metricTone(stock.roe))}>{formatPercent(stock.roe)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bandarlab-scrollbar hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm md:block">
        <table className="min-w-[1120px] w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {["Ticker", "Nama Emiten", "Sektor", "Subindustri", "Market Cap", "PER", "PBV", "ROE", "DER", "NPM", "YTD"].map((head) => (
                <th key={head} className="px-4 py-3 font-semibold">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleStocks.map((stock) => (
              <tr key={stock.ticker} className="border-t border-gray-100 transition duration-150 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/stocks/${stock.ticker}`} className="font-semibold text-gray-950 underline-offset-4 hover:text-red-700 hover:underline">
                    {stock.ticker}
                  </Link>
                </td>
                <td className="min-w-64 px-4 py-3 text-gray-700">{stock.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{stock.sector || "-"}</td>
                <td className="min-w-52 px-4 py-3 text-gray-600">{stock.subindustry || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-950">{formatCompactCurrency(stock.marketCap)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatNumber(stock.per)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatNumber(stock.pbv)}</td>
                <td className={cn("whitespace-nowrap px-4 py-3 font-semibold", metricTone(stock.roe))}>{formatPercent(stock.roe)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatNumber(stock.der)}</td>
                <td className={cn("whitespace-nowrap px-4 py-3 font-semibold", metricTone(stock.npm))}>{formatPercent(stock.npm)}</td>
                <td className={cn("whitespace-nowrap px-4 py-3 font-semibold", metricTone(stock.ytd))}>{formatPercent(stock.ytd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PlaceholderPage>
  );
}
