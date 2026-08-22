import Link from "next/link";
import { ArrowUpRight, NotebookPen } from "lucide-react";
import { BestEntryAlert } from "@/components/stocks/best-entry-alert";
import { ShareholderOwnershipSection } from "@/components/stocks/shareholder-ownership-section";
import { StockAccumulationSnapshot } from "@/components/stocks/stock-accumulation-snapshot";
import { StockHeader } from "@/components/stocks/stock-header";
import { StockMetricCard } from "@/components/stocks/stock-metric-card";
import { StockTabs } from "@/components/stocks/stock-tabs";
import { StockTimeline } from "@/components/timeline/stock-timeline";
import { dividendRows, getStockProfile, stockProfiles } from "@/lib/data";
import { getIdxStockScreenerRow } from "@/lib/idx-stock-screener";
import { getIdxListedStock, idxListedStocks } from "@/lib/idx-listed-stocks";
import { getShareholderFivePercentRows, getShareholderOnePercentRows } from "@/lib/shareholder-ownership";
import { formatQuoteChangePercent, formatQuotePrice, getStockQuote } from "@/lib/stock-quotes";

function formatNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}%`;
}

function formatCompactCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";

  if (value >= 1_000_000_000_000) return `Rp ${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(2)}M`;
  return `Rp ${formatNumber(value)}`;
}

function parseDisplayPrice(value: string) {
  const parsed = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function generateStaticParams() {
  const tickers = new Set([...stockProfiles.map((stock) => stock.ticker), ...idxListedStocks.map((stock) => stock.ticker)]);
  return Array.from(tickers).map((ticker) => ({ ticker }));
}

export default async function StockDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const stock = getStockProfile(ticker);
  const quote = await getStockQuote(ticker);
  const currentPrice = quote ? formatQuotePrice(quote.price) : stock.price;
  const currentPriceNumber = quote?.price ?? parseDisplayPrice(stock.price);
  const currentChangePercent = quote ? formatQuoteChangePercent(quote.changePercent) : stock.changePercent;
  const listedStock = getIdxListedStock(ticker);
  const screener = getIdxStockScreenerRow(ticker);
  const onePercentRows = getShareholderOnePercentRows(ticker);
  const fivePercentRows = getShareholderFivePercentRows(ticker);
  const stockbitUrl = `https://stockbit.com/symbol/${stock.ticker}`;
  const corporateActions = dividendRows.filter((row) => row.subject.includes(`(${stock.ticker})`));
  const detailTimeline = [
    ...(quote?.updatedAt
      ? [{ date: quote.updatedAt, title: "Harga pasar diperbarui", description: `Harga ${stock.ticker} diperbarui dari ${quote.source}.`, source: quote.source }]
      : []),
    { date: "17 Agustus 2026", title: "Snapshot IDX Screener", description: "Valuasi, profitabilitas, sektor, dan keanggotaan indeks diperbarui.", source: "IDX Screener" },
    ...(fivePercentRows.length > 0
      ? [{ date: "13 Agustus 2026", title: "Kepemilikan 5%+ diperbarui", description: `${fivePercentRows.length} pemegang saham tercatat untuk ${stock.ticker}.`, source: "KSEI" }]
      : []),
    ...(onePercentRows.length > 0
      ? [{ date: "31 Juli 2026", title: "Kepemilikan 1%+ diperbarui", description: `${onePercentRows.length} investor tercatat untuk ${stock.ticker}.`, source: "KSEI" }]
      : []),
    ...(listedStock?.listingDate
      ? [{ date: listedStock.listingDate, title: "Pencatatan saham", description: `${listedStock.name} tercatat di Bursa Efek Indonesia.`, source: "IDX" }]
      : []),
  ];
  const listingFacts = [
    ["Kode Saham", stock.ticker],
    ["Nama Perusahaan", listedStock?.name ?? stock.name],
    ["Papan Pencatatan", listedStock?.board ?? "-"],
    ["Tanggal Pencatatan", listedStock?.listingDate ?? "-"],
    ["Saham Tercatat", listedStock?.listedSharesText ?? "-"],
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <StockHeader
        ticker={stock.ticker}
        name={stock.name}
        price={currentPrice}
        changePercent={currentChangePercent}
        priceSource={quote?.source ?? "Demo fallback"}
        updatedAt={quote?.updatedAt}
      />
      <StockTabs />

      <section id="overview" className="scroll-mt-36">
        <SectionHeading
          title="Overview"
          description="Ringkasan harga, valuasi, klasifikasi, dan informasi pencatatan saham."
        />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StockMetricCard label="Accumulation Score" value={`${stock.accumulationScore} / 100`} detail="Strong Accumulation" />
        <StockMetricCard label="Current Price" value={currentPrice} detail={quote ? quote.source : "Demo fallback"} />
        <StockMetricCard label="Market Cap" value={formatCompactCurrency(screener?.marketCap ?? null)} detail="IDX Screener" />
        <StockMetricCard label="ROE" value={formatPercent(screener?.roe ?? null)} detail="Return on Equity" />
      </div>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-950">IDX Screener Snapshot</h2>
            <p className="mt-1 text-sm text-gray-600">
              Valuasi, profitabilitas, klasifikasi sektor, dan indeks dari file IDX Stock Screener per 17 Agustus 2026.
            </p>
          </div>
          <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {screener ? "IDX Stock Screener" : "Belum ada data screener"}
          </span>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase text-gray-500">Sektor</p>
            <p className="mt-2 text-sm font-semibold text-gray-950">{screener?.sector ?? "-"}</p>
            <p className="mt-1 text-xs text-gray-500">{screener?.subsector ?? "-"}</p>
          </div>
          <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase text-gray-500">Industri</p>
            <p className="mt-2 text-sm font-semibold text-gray-950">{screener?.industry ?? "-"}</p>
            <p className="mt-1 text-xs text-gray-500">{screener?.subindustry ?? "-"}</p>
          </div>
          <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase text-gray-500">Market Cap</p>
            <p className="mt-2 text-sm font-semibold text-gray-950">{formatCompactCurrency(screener?.marketCap ?? null)}</p>
            <p className="mt-1 text-xs text-gray-500">Revenue {formatCompactCurrency(screener?.totalRevenue ?? null)}</p>
          </div>
          <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase text-gray-500">Index</p>
            <p className="mt-2 text-sm font-semibold text-gray-950">{screener?.indexes.slice(0, 3).join(", ") || "-"}</p>
            <p className="mt-1 text-xs text-gray-500">{screener && screener.indexes.length > 3 ? `+${screener.indexes.length - 3} index lain` : "Membership index"}</p>
          </div>
        </div>

        <div className="bandarlab-scrollbar overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {["PER", "PBV", "ROE", "ROA", "DER", "NPM", "MTD", "YTD"].map((head) => (
                  <th key={head} className="px-4 py-3 font-semibold">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatNumber(screener?.per ?? null)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatNumber(screener?.pbv ?? null)}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-950">{formatPercent(screener?.roe ?? null)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatPercent(screener?.roa ?? null)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatNumber(screener?.der ?? null)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatPercent(screener?.npm ?? null)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatPercent(screener?.mtd ?? null)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatPercent(screener?.ytd ?? null)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-950">Informasi Pencatatan IDX</h2>
            <p className="mt-1 text-sm text-gray-600">
              Data dasar emiten dari daftar saham IDX per 17 Agustus 2026 untuk membantu membaca konteks saham sebelum masuk watchlist.
            </p>
          </div>
          <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {listedStock ? "IDX Listed Stock" : "Belum ada di file IDX"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {listingFacts.map(([label, value]) => (
            <div key={label} className="rounded-md border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
              <p className="mt-2 break-words text-sm font-semibold text-gray-950">{value}</p>
            </div>
          ))}
        </div>
      </section>
      </section>

      <section id="accumulation" className="scroll-mt-36">
        <SectionHeading
          title="Accumulation"
          description="Status saham di radar pribadi, harga masuk, perubahan harga, dan pengaturan best entry."
        />
        <StockAccumulationSnapshot
          ticker={stock.ticker}
          currentPrice={currentPriceNumber}
          fallbackScore={stock.accumulationScore}
        />
        <BestEntryAlert
          ticker={stock.ticker}
          currentPrice={currentPriceNumber}
          priceSource={quote?.source ?? "Demo fallback"}
          updatedAt={quote?.updatedAt}
        />
      </section>

      <section id="corporate-action" className="mb-6 scroll-mt-36">
        <SectionHeading
          title="Corporate Action"
          description="Dokumen corporate action yang terhubung dengan ticker dan akses ke jurnal catatan RUPS."
        />
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-950">Corporate action {stock.ticker}</p>
              <p className="mt-1 text-xs text-gray-500">Pencocokan berdasarkan ticker pada dokumen yang tersedia.</p>
            </div>
            <Link href="/corporate-action" className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 sm:w-auto">
              <NotebookPen className="size-4" /> Buka jurnal CA
            </Link>
          </div>
          {corporateActions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {corporateActions.map((action) => (
                <div key={action.number} className="grid gap-2 px-4 py-4 sm:grid-cols-[180px_minmax(0,1fr)_140px] sm:items-start">
                  <p className="text-sm font-semibold text-red-700">{action.number}</p>
                  <p className="text-sm leading-6 text-gray-700">{action.subject}</p>
                  <p className="text-xs font-medium text-gray-500 sm:text-right">{action.date}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <FileEmptyState ticker={stock.ticker} />
            </div>
          )}
        </div>
      </section>

      <section id="ownership" className="scroll-mt-36">
        <ShareholderOwnershipSection onePercentRows={onePercentRows} fivePercentRows={fivePercentRows} />
      </section>

      <section id="timeline" className="mb-6 scroll-mt-36">
        <SectionHeading
          title="Timeline"
          description={`Urutan pembaruan data yang benar-benar tersedia untuk ${stock.ticker}.`}
        />
        <StockTimeline events={detailTimeline} />
      </section>

      <section id="broker-summary" className="mb-6 scroll-mt-36">
        <SectionHeading
          title="Broker Summary"
          description="Analisis broker dibuka dari halaman simbol Stockbit agar mengikuti data terbaru."
        />
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-950">Stockbit · {stock.ticker}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Lanjutkan ke halaman {stock.ticker} untuk melihat broker summary, chart, berita, dan informasi pasar yang tersedia.
              </p>
            </div>
            <a
              href={stockbitUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-red-600 bg-red-600 px-4 text-sm font-semibold text-white transition duration-150 hover:bg-red-700 md:w-auto"
            >
              Buka Stockbit <ArrowUpRight className="size-4" />
            </a>
          </div>
          <p className="mt-4 break-all rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">{stockbitUrl}</p>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

function FileEmptyState({ ticker }: { ticker: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900">Belum ada dokumen yang cocok untuk {ticker}</p>
      <p className="mt-1 text-sm text-gray-500">Tambahkan catatan pemantauan melalui Corporate Action Journal.</p>
    </div>
  );
}
