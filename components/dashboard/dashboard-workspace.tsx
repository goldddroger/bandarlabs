"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Radar,
  SearchCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { DashboardAccumulationPreview } from "@/components/accumulation/dashboard-accumulation-preview";
import { useSelectedAccumulationRows } from "@/components/accumulation/accumulation-store";
import {
  bestEntryChangeEventName,
  getBestEntrySnapshot,
  parseBestEntrySnapshot,
} from "@/lib/best-entry-store";
import type { MarketSummaryCard } from "@/lib/market-data";
import { calculateRealizedGain, getJakartaDate, usePortfolioData } from "@/lib/portfolio-store";
import { cn } from "@/lib/utils";

type QuoteMap = Record<string, { price: number; source?: string; updatedAt?: string }>;

const corporateAgenda = [
  { ticker: "TOSK", type: "RUPSLB", date: "22 Agustus 2026", topic: "Perubahan pengurus dan rencana pengembangan usaha" },
  { ticker: "BREN", type: "RUPST", date: "27 Agustus 2026", topic: "Penggunaan laba dan arahan ekspansi" },
] as const;

const analysisLinks = [
  { label: "Stock Screener", detail: "Cari kandidat berdasarkan market summary", href: "/stock-screener", icon: SearchCheck },
  { label: "Broker Summary", detail: "Lanjutkan analisis aktivitas broker", href: "/broker-summary", icon: TrendingUp },
  { label: "Corporate Action", detail: "Catat keputusan dan tindak lanjut RUPS", href: "/corporate-action", icon: CalendarDays },
  { label: "Portfolio Saya", detail: "Pantau equity dan realized trade", href: "/portfolio", icon: BriefcaseBusiness },
] as const;

function subscribeBestEntry(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(bestEntryChangeEventName, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(bestEntryChangeEventName, onStoreChange);
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatCompactCurrency(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1_000_000_000) return `${sign}Rp ${(absolute / 1_000_000_000).toFixed(2)} M`;
  if (absolute >= 1_000_000) return `${sign}Rp ${(absolute / 1_000_000).toFixed(2)} Jt`;
  if (absolute >= 1_000) return `${sign}Rp ${(absolute / 1_000).toFixed(1)} Rb`;
  return formatCurrency(value);
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function marketToneClass(tone: MarketSummaryCard["tone"]) {
  if (tone === "positive") return "text-emerald-700";
  if (tone === "negative") return "text-red-700";
  if (tone === "warning") return "text-amber-700";
  return "text-gray-600";
}

export function DashboardWorkspace({ marketSummary }: { marketSummary: MarketSummaryCard[] }) {
  const portfolio = usePortfolioData();
  const radarRows = useSelectedAccumulationRows();
  const bestEntrySnapshot = useSyncExternalStore(subscribeBestEntry, getBestEntrySnapshot, () => "[]");
  const bestEntries = useMemo(() => parseBestEntrySnapshot(bestEntrySnapshot), [bestEntrySnapshot]);
  const [quotes, setQuotes] = useState<QuoteMap>({});

  const quoteTickers = useMemo(
    () => Array.from(new Set([
      ...portfolio.holdings.map((holding) => holding.ticker),
      ...bestEntries.map((entry) => entry.ticker),
    ])).sort().join(","),
    [bestEntries, portfolio.holdings],
  );

  useEffect(() => {
    if (!quoteTickers) return;
    const controller = new AbortController();

    fetch(`/api/stock-quotes?tickers=${encodeURIComponent(quoteTickers)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { quotes: {} }))
      .then((payload: { quotes?: QuoteMap }) => {
        if (!controller.signal.aborted) setQuotes(payload.quotes ?? {});
      })
      .catch(() => {
        if (!controller.signal.aborted) setQuotes({});
      });

    return () => controller.abort();
  }, [quoteTickers]);

  const portfolioSummary = useMemo(() => {
    const rows = portfolio.holdings.map((holding) => {
      const shares = holding.lots * 100;
      const capital = holding.averagePrice * shares;
      const currentPrice = quotes[holding.ticker]?.price ?? holding.averagePrice;
      const marketValue = currentPrice * shares;
      return { ...holding, capital, marketValue, profitLoss: marketValue - capital };
    });
    const capital = rows.reduce((total, row) => total + row.capital, 0);
    const equity = rows.reduce((total, row) => total + row.marketValue, 0);
    const profitLoss = equity - capital;
    const profitLossPercent = capital > 0 ? (profitLoss / capital) * 100 : 0;
    const currentMonth = getJakartaDate().slice(0, 7);
    const realized = portfolio.trades
      .filter((trade) => trade.soldAt.startsWith(currentMonth))
      .reduce((total, trade) => total + calculateRealizedGain(trade), 0);
    return { rows, capital, equity, profitLoss, profitLossPercent, realized };
  }, [portfolio.holdings, portfolio.trades, quotes]);

  const bestEntryRows = bestEntries.map((entry) => {
    const currentPrice = quotes[entry.ticker]?.price ?? null;
    const gapPercent = currentPrice !== null && entry.price > 0 ? ((currentPrice - entry.price) / entry.price) * 100 : null;
    return { ...entry, currentPrice, gapPercent, reached: currentPrice !== null && currentPrice <= entry.price };
  });
  const reachedEntries = bestEntryRows.filter((entry) => entry.reached);
  const nearEntries = bestEntryRows.filter((entry) => !entry.reached && entry.gapPercent !== null && entry.gapPercent <= 3);
  const accumulationCount = radarRows.filter((row) => row.signalType === "accumulation").length;
  const holdCount = radarRows.filter((row) => row.signalType === "hold").length;
  const losingPositions = portfolioSummary.rows.filter((row) => row.profitLoss < 0).length;

  const priorityItems = [
    reachedEntries.length > 0 ? {
      title: `${reachedEntries.length} best entry sudah tersentuh`,
      detail: reachedEntries.map((entry) => entry.ticker).slice(0, 4).join(", "),
      href: "/notifikasi",
      icon: BellRing,
      tone: "urgent" as const,
    } : null,
    nearEntries.length > 0 ? {
      title: `${nearEntries.length} saham mendekati best entry`,
      detail: "Jarak harga maksimal 3% dari entry pribadi",
      href: "/notifikasi",
      icon: CircleDollarSign,
      tone: "warning" as const,
    } : null,
    accumulationCount > 0 ? {
      title: `${accumulationCount} saham berstatus accumulation`,
      detail: `${radarRows.length} saham sedang dipantau di radar pribadi`,
      href: "/accumulation",
      icon: Radar,
      tone: "positive" as const,
    } : null,
    losingPositions > 0 ? {
      title: `${losingPositions} posisi aktif berada di bawah modal`,
      detail: "Periksa thesis, risiko, dan rencana exit",
      href: "/portfolio",
      icon: TrendingDown,
      tone: "negative" as const,
    } : null,
    {
      title: "Agenda corporate action terdekat",
      detail: `${corporateAgenda[0].ticker} ${corporateAgenda[0].type} pada ${corporateAgenda[0].date}`,
      href: "/corporate-action",
      icon: CalendarDays,
      tone: "neutral" as const,
    },
  ].filter(Boolean).slice(0, 4) as Array<{
    title: string;
    detail: string;
    href: string;
    icon: typeof BellRing;
    tone: "urgent" | "warning" | "positive" | "negative" | "neutral";
  }>;

  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${getJakartaDate()}T00:00:00+07:00`));

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-gray-500">{todayLabel}</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-950">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Pusat kontrol untuk market, radar saham, portfolio, best entry, dan corporate action.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href="/accumulation" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <Radar className="size-4" /> Kelola Radar
          </Link>
          <Link href="/portfolio" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-600 bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700">
            <BriefcaseBusiness className="size-4" /> Buka Portfolio
          </Link>
        </div>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan market">
        {marketSummary.map((item) => (
          <div key={item.label} className="min-w-0 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-600">{item.label}</p>
              <span className="max-w-28 truncate rounded bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-500" title={item.source}>{item.source}</span>
            </div>
            <p className="mt-3 truncate text-xl font-semibold text-gray-950">{item.value}</p>
            <p className={cn("mt-1 min-h-5 text-xs font-semibold leading-5", marketToneClass(item.tone))}>{item.detail}</p>
            {item.updatedAt ? <p className="mt-2 truncate text-xs text-gray-400">Update {item.updatedAt}</p> : null}
          </div>
        ))}
      </section>

      <div className="mb-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <div className="grid min-w-0 gap-5">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-950">Prioritas Hari Ini</h2>
                <p className="mt-1 text-xs text-gray-500">Hal yang perlu diperiksa dari data pribadi dan agenda terdekat.</p>
              </div>
              <span className="text-xs font-semibold text-gray-500">{priorityItems.length} item</span>
            </div>
            <div className="divide-y divide-gray-100">
              {priorityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={`${item.href}-${item.title}`} href={item.href} className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50">
                    <span className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md",
                      item.tone === "urgent" || item.tone === "negative" ? "bg-red-50 text-red-700" :
                        item.tone === "warning" ? "bg-amber-50 text-amber-700" :
                          item.tone === "positive" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600",
                    )}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900">{item.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500">{item.detail}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-gray-400" />
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-950">Accumulation Radar</h2>
                <p className="mt-1 text-xs text-gray-500">Status saham pribadi yang sama dengan halaman radar.</p>
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <span className="text-emerald-700">{accumulationCount} accumulation</span>
                <span className="text-blue-700">{holdCount} hold</span>
              </div>
            </div>
            <DashboardAccumulationPreview />
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <WalletCards className="size-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-950">Portfolio Snapshot</h2>
              </div>
              <Link href="/portfolio" className="text-xs font-semibold text-red-700 hover:underline">Detail</Link>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
              <DashboardValue label="Total equity" value={formatCompactCurrency(portfolioSummary.equity)} />
              <DashboardValue label="Modal" value={formatCompactCurrency(portfolioSummary.capital)} />
              <DashboardValue label="Unrealized" value={formatCompactCurrency(portfolioSummary.profitLoss)} detail={formatPercent(portfolioSummary.profitLossPercent)} tone={portfolioSummary.profitLoss >= 0 ? "positive" : "negative"} />
              <DashboardValue label="Realized bulan ini" value={formatCompactCurrency(portfolioSummary.realized)} tone={portfolioSummary.realized >= 0 ? "positive" : "negative"} />
            </div>
            <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">{portfolio.holdings.length} posisi aktif · {portfolio.trades.length} trade tercatat</p>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <BellRing className="size-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-950">Best Entry</h2>
              </div>
              <Link href="/notifikasi" className="text-xs font-semibold text-red-700 hover:underline">Semua</Link>
            </div>
            {bestEntryRows.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">Belum ada best entry yang disimpan.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {bestEntryRows.slice(0, 4).map((entry) => (
                  <Link key={entry.ticker} href={`/stocks/${entry.ticker}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">{entry.ticker}</span>
                      <span className="text-xs text-gray-500">Entry {formatCurrency(entry.price)}</span>
                    </span>
                    <span className={cn("text-right text-xs font-semibold", entry.reached ? "text-emerald-700" : "text-gray-600")}>
                      <span className="block">{entry.currentPrice === null ? "Memuat" : formatCurrency(entry.currentPrice)}</span>
                      <span className="mt-0.5 block font-medium">{entry.reached ? "Tersentuh" : entry.gapPercent === null ? "-" : `${entry.gapPercent.toFixed(2)}% lagi`}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-950">Agenda Corporate Action</h2>
              </div>
              <Link href="/corporate-action" className="text-xs font-semibold text-red-700 hover:underline">Journal</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {corporateAgenda.map((event) => (
                <Link key={`${event.ticker}-${event.type}`} href="/corporate-action" className="block px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-900">{event.ticker} · {event.type}</span>
                    <span className="text-xs text-gray-500">{event.date}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500">{event.topic}</p>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-950">Lanjutkan Analisis</h2>
            <p className="mt-1 text-xs text-gray-500">Masuk langsung ke workflow yang paling sering digunakan.</p>
          </div>
        </div>
        <div className="grid overflow-hidden rounded-lg border border-gray-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
          {analysisLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex min-w-0 items-center gap-3 border-b border-gray-200 p-4 transition last:border-b-0 hover:bg-gray-50 sm:border-r xl:border-b-0 xl:last:border-r-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600"><Icon className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900">{item.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-gray-500">{item.detail}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-gray-400" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DashboardValue({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: "positive" | "negative" }) {
  return (
    <div className="min-w-0 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn("mt-1 truncate text-base font-semibold text-gray-950", tone === "positive" && "text-emerald-700", tone === "negative" && "text-red-700")}>{value}</p>
      {detail ? <p className={cn("mt-0.5 text-xs font-medium", tone === "positive" ? "text-emerald-700" : "text-red-700")}>{detail}</p> : null}
    </div>
  );
}
