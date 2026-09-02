"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Cloud,
  Download,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { idxListedStocks } from "@/lib/idx-listed-stocks";
import {
  calculateRealizedGain,
  downloadPortfolioSql,
  getJakartaDate,
  portfolioSyncEventName,
  PortfolioHolding,
  RealizedTrade,
  savePortfolio,
  syncPortfolioWithServer,
  usePortfolioData,
} from "@/lib/portfolio-store";
import { cn } from "@/lib/utils";

type LiveQuote = {
  ticker: string;
  price: number;
  changePercent: number;
  source: "Yahoo Finance" | "Google Finance" | "Fallback";
  updatedAt?: string;
};

type HoldingDraft = Omit<PortfolioHolding, "id"> & { id?: string };
type TradeDraft = Omit<RealizedTrade, "id"> & { id?: string };
type TradeHistoryFocus = { month: string; tradeId: string; requestId: number };
type TradePeriodMode = "month" | "quarter" | "year";
type TradeHistoryFilter = { mode: TradePeriodMode; month: string; quarter: number; year: string };

const emptyHolding: HoldingDraft = {
  ticker: "",
  lots: 0,
  averagePrice: 0,
  purchasedAt: getJakartaDate(),
  note: "",
};

const emptyTrade: TradeDraft = {
  ticker: "",
  lots: 0,
  buyPrice: 0,
  sellPrice: 0,
  buyFeePercent: 0.15,
  sellFeePercent: 0.25,
  soldAt: getJakartaDate(),
  note: "",
};

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
  if (absolute >= 1_000_000_000) return `${sign}Rp ${(absolute / 1_000_000_000).toFixed(2)} Miliar`;
  if (absolute >= 1_000_000) return `${sign}Rp ${(absolute / 1_000_000).toFixed(2)} Juta`;
  if (absolute >= 1_000) return `${sign}Rp ${(absolute / 1_000).toFixed(1)} Ribu`;
  return formatCurrency(value);
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatDisplayDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function normalizeTicker(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function getQuarterFromDate(value: string) {
  const month = Number(value.slice(5, 7));
  return Math.min(4, Math.max(1, Math.ceil(month / 3) || 1));
}

export function PortfolioDashboard() {
  const { confirm, confirmationDialog } = useConfirmDialog();
  const portfolio = usePortfolioData();
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [resolvedQuoteKey, setResolvedQuoteKey] = useState("");
  const [holdingModalOpen, setHoldingModalOpen] = useState(false);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [holdingDraft, setHoldingDraft] = useState<HoldingDraft>(emptyHolding);
  const [tradeDraft, setTradeDraft] = useState<TradeDraft>(emptyTrade);
  const [tradeHistoryFilter, setTradeHistoryFilter] = useState<TradeHistoryFilter>(() => {
    const today = getJakartaDate();
    return { mode: "year", month: today.slice(0, 7), quarter: getQuarterFromDate(today), year: today.slice(0, 4) };
  });
  const [tradeHistoryFocus, setTradeHistoryFocus] = useState<TradeHistoryFocus>({
    month: getJakartaDate().slice(0, 7),
    tradeId: "",
    requestId: 0,
  });
  const [syncState, setSyncState] = useState<"syncing" | "synced" | "error">("syncing");

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      void syncPortfolioWithServer()
        .then((result) => {
          setSyncState("synced");
          if (result === "uploaded") toast.success("Portfolio lokal berhasil dipindahkan ke Supabase.");
        })
        .catch((error: unknown) => {
          setSyncState("error");
          toast.error(error instanceof Error ? error.message : "Portfolio Supabase gagal disinkronkan.");
        });
    }, 0);
    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: string; message?: string }>).detail;
      if (detail?.status === "saved") setSyncState("synced");
      if (detail?.status === "error") {
        setSyncState("error");
        toast.error(detail.message || "Perubahan tersimpan lokal, tetapi gagal dikirim ke Supabase.");
      }
    };
    window.addEventListener(portfolioSyncEventName, handleSync);
    return () => {
      window.clearTimeout(syncTimer);
      window.removeEventListener(portfolioSyncEventName, handleSync);
    };
  }, []);

  const tickerKey = useMemo(
    () => Array.from(new Set(portfolio.holdings.map((holding) => holding.ticker))).sort().join(","),
    [portfolio.holdings],
  );

  useEffect(() => {
    if (!tickerKey) return;
    const controller = new AbortController();

    fetch(`/api/stock-quotes?tickers=${tickerKey}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { quotes: {} }))
      .then((payload: { quotes?: Record<string, LiveQuote> }) => {
        setQuotes(payload.quotes ?? {});
        setResolvedQuoteKey(tickerKey);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResolvedQuoteKey(tickerKey);
      });

    return () => controller.abort();
  }, [tickerKey]);

  const positionRows = useMemo(
    () =>
      portfolio.holdings.map((holding) => {
        const shares = holding.lots * 100;
        const capital = holding.averagePrice * shares;
        const quote = quotes[holding.ticker];
        const currentPrice = quote?.price ?? holding.averagePrice;
        const marketValue = currentPrice * shares;
        const profitLoss = marketValue - capital;
        const profitLossPercent = capital > 0 ? (profitLoss / capital) * 100 : 0;
        return { holding, shares, capital, quote, currentPrice, marketValue, profitLoss, profitLossPercent };
      }),
    [portfolio.holdings, quotes],
  );

  const totalCapital = positionRows.reduce((total, row) => total + row.capital, 0);
  const totalEquity = positionRows.reduce((total, row) => total + row.marketValue, 0);
  const unrealizedGain = totalEquity - totalCapital;
  const unrealizedPercent = totalCapital > 0 ? (unrealizedGain / totalCapital) * 100 : 0;
  const currentMonth = getJakartaDate().slice(0, 7);
  const monthlyTrades = portfolio.trades.filter((trade) => trade.soldAt.startsWith(currentMonth));
  const monthlyRealized = monthlyTrades.reduce((total, trade) => total + calculateRealizedGain(trade), 0);
  const winningTrades = monthlyTrades.filter((trade) => calculateRealizedGain(trade) > 0).length;
  const winRate = monthlyTrades.length > 0 ? (winningTrades / monthlyTrades.length) * 100 : 0;

  useEffect(() => {
    if (portfolio.holdings.length === 0 || resolvedQuoteKey !== tickerKey) return;
    const today = getJakartaDate();
    const existing = portfolio.equityHistory.find((snapshot) => snapshot.date === today);
    if (existing && Math.round(existing.equity) === Math.round(totalEquity)) return;

    const nextHistory = [
      ...portfolio.equityHistory.filter((snapshot) => snapshot.date !== today),
      { date: today, equity: totalEquity },
    ].sort((first, second) => first.date.localeCompare(second.date));
    savePortfolio({ ...portfolio, equityHistory: nextHistory });
  }, [portfolio, resolvedQuoteKey, tickerKey, totalEquity]);

  function openAddHolding() {
    setHoldingDraft({ ...emptyHolding, purchasedAt: getJakartaDate() });
    setHoldingModalOpen(true);
  }

  function editHolding(holding: PortfolioHolding) {
    setHoldingDraft(holding);
    setHoldingModalOpen(true);
  }

  function saveHolding(draft: HoldingDraft) {
    const ticker = normalizeTicker(draft.ticker);
    if (!ticker || draft.lots <= 0 || draft.averagePrice <= 0) {
      toast.error("Data posisi belum lengkap", { description: "Ticker, lot, dan harga rata-rata wajib lebih dari nol." });
      return;
    }

    if (draft.id) {
      savePortfolio({
        ...portfolio,
        holdings: portfolio.holdings.map((holding) =>
          holding.id === draft.id ? { ...draft, id: draft.id, ticker } : holding,
        ),
      });
    } else {
      const existing = portfolio.holdings.find((holding) => holding.ticker === ticker);
      if (existing) {
        const combinedLots = existing.lots + draft.lots;
        const weightedAverage = ((existing.lots * existing.averagePrice) + (draft.lots * draft.averagePrice)) / combinedLots;
        savePortfolio({
          ...portfolio,
          holdings: portfolio.holdings.map((holding) =>
            holding.id === existing.id
              ? { ...holding, lots: combinedLots, averagePrice: weightedAverage, note: draft.note || holding.note }
              : holding,
          ),
        });
      } else {
        savePortfolio({
          ...portfolio,
          holdings: [{ ...draft, id: `holding-${Date.now()}`, ticker }, ...portfolio.holdings],
        });
      }
    }
    setHoldingModalOpen(false);
    toast.success("Posisi portfolio disimpan");
  }

  async function deleteHolding(id: string) {
    const holding = portfolio.holdings.find((item) => item.id === id);
    const confirmed = await confirm({
      title: "Hapus posisi portfolio?",
      description: "Posisi aktif ini akan dikeluarkan dari valuasi dan perhitungan equity portfolio.",
      subject: holding ? `${holding.ticker} · ${holding.lots} lot` : "Posisi portfolio",
      confirmLabel: "Hapus Posisi",
    });
    if (!confirmed) return;
    savePortfolio({ ...portfolio, holdings: portfolio.holdings.filter((holding) => holding.id !== id) }, { holdingIds: [id] });
    toast.info("Posisi dihapus dari portfolio");
  }

  function openAddTrade() {
    setTradeDraft({ ...emptyTrade, soldAt: getJakartaDate() });
    setTradeModalOpen(true);
  }

  function editTrade(trade: RealizedTrade) {
    setTradeDraft(trade);
    setTradeModalOpen(true);
  }

  function saveTrade(draft: TradeDraft) {
    const ticker = normalizeTicker(draft.ticker);
    const lots = Number(draft.lots);
    const buyPrice = Number(draft.buyPrice);
    const sellPrice = Number(draft.sellPrice);
    const buyFeePercent = Number(draft.buyFeePercent);
    const sellFeePercent = Number(draft.sellFeePercent);
    const invalidFields = [
      !ticker && "ticker",
      (!Number.isFinite(lots) || lots <= 0) && "jumlah lot",
      (!Number.isFinite(buyPrice) || buyPrice <= 0) && "harga beli",
      (!Number.isFinite(sellPrice) || sellPrice <= 0) && "harga jual",
      (!Number.isFinite(buyFeePercent) || buyFeePercent < 0) && "fee beli",
      (!Number.isFinite(sellFeePercent) || sellFeePercent < 0) && "fee jual",
      !draft.soldAt && "tanggal jual",
    ].filter(Boolean) as string[];

    if (invalidFields.length > 0) {
      toast.error("Trade gagal disimpan", {
        description: `Periksa kembali: ${invalidFields.join(", ")}.`,
      });
      return;
    }

    const savedTrade: RealizedTrade = {
      ...draft,
      id: draft.id ?? `trade-${Date.now()}`,
      ticker,
      lots,
      buyPrice,
      sellPrice,
      buyFeePercent,
      sellFeePercent,
      note: draft.note.trim(),
    };
    const exists = portfolio.trades.some((trade) => trade.id === savedTrade.id);

    try {
      savePortfolio({
        ...portfolio,
        trades: exists
          ? portfolio.trades.map((trade) => (trade.id === savedTrade.id ? savedTrade : trade))
          : [savedTrade, ...portfolio.trades],
      });
      setTradeModalOpen(false);
      setTradeHistoryFilter({
        mode: "month",
        month: savedTrade.soldAt.slice(0, 7),
        quarter: getQuarterFromDate(savedTrade.soldAt),
        year: savedTrade.soldAt.slice(0, 4),
      });
      setTradeHistoryFocus({
        month: savedTrade.soldAt.slice(0, 7),
        tradeId: savedTrade.id,
        requestId: Date.now(),
      });
      toast.success(exists ? `Trade ${ticker} berhasil diperbarui` : `Trade ${ticker} berhasil ditambahkan`, {
        description: `${lots} lot dengan realized P/L ${formatCurrency(calculateRealizedGain(savedTrade))}. History bulan trade sudah ditampilkan.`,
      });
    } catch {
      toast.error("Trade gagal disimpan", {
        description: "Penyimpanan browser tidak tersedia atau kapasitasnya penuh. Coba muat ulang halaman.",
      });
    }
  }

  async function deleteTrade(id: string) {
    const trade = portfolio.trades.find((item) => item.id === id);
    const confirmed = await confirm({
      title: "Hapus riwayat trade?",
      description: "Trade ini tidak akan lagi dihitung dalam realized profit/loss dan win ratio.",
      subject: trade ? `${trade.ticker} · ${trade.lots} lot · ${formatDisplayDate(trade.soldAt)}` : "Riwayat trade",
      confirmLabel: "Hapus Trade",
    });
    if (!confirmed) return;
    savePortfolio({ ...portfolio, trades: portfolio.trades.filter((trade) => trade.id !== id) }, { tradeIds: [id] });
    toast.info("Riwayat trade dihapus");
  }

  async function clearEquityHistory() {
    if (!portfolio.equityHistory.length) return;
    const confirmed = await confirm({
      title: "Reset riwayat equity?",
      description: "Semua snapshot valuasi harian akan dihapus dari grafik. Posisi aktif dan history realized trade tidak ikut terhapus.",
      subject: `${portfolio.equityHistory.length} snapshot equity`,
      confirmLabel: "Reset Grafik",
    });
    if (!confirmed) return;
    const equityDates = portfolio.equityHistory.map((snapshot) => snapshot.date);
    savePortfolio({ ...portfolio, equityHistory: [] }, { equityDates });
    toast.info("Riwayat equity direset");
  }

  function exportPortfolioSql() {
    downloadPortfolioSql(portfolio);
    toast.success("SQL Portfolio berhasil diunduh.");
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm text-gray-500">Portfolio Pribadi</p>
          <h1 className="text-2xl font-semibold tracking-normal text-gray-950">Portfolio Saya</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Nilai posisi aktif, unrealized profit/loss, serta performa trade yang sudah direalisasikan.
          </p>
          <span className={cn("mt-2 inline-flex items-center gap-1.5 text-xs font-medium", syncState === "error" ? "text-red-700" : "text-gray-500")}>
            <Cloud className="size-3.5" />
            {syncState === "syncing" ? "Menyinkronkan Supabase..." : syncState === "synced" ? "Tersinkron dengan Supabase" : "Sinkronisasi Supabase perlu diperiksa"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button type="button" variant="ghost" className="col-span-2 px-3 sm:col-span-1" onClick={exportPortfolioSql}>
            <Download className="size-4" /> Unduh SQL
          </Button>
          <Button type="button" variant="outline" className="px-3" onClick={openAddTrade}>
            <History className="size-4" /> Catat trade
          </Button>
          <Button type="button" className="px-3" onClick={openAddHolding}>
            <Plus className="size-4" /> Tambah posisi
          </Button>
        </div>
      </div>

      <div className="mb-5 grid overflow-hidden rounded-lg border border-gray-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
        <PortfolioMetric icon={WalletCards} label="Total Equity Saham" value={formatCompactCurrency(totalEquity)} detail={`${portfolio.holdings.length} posisi aktif`} />
        <PortfolioMetric icon={BriefcaseBusiness} label="Modal Posisi" value={formatCompactCurrency(totalCapital)} detail="Berdasarkan harga rata-rata" />
        <PortfolioMetric icon={unrealizedGain >= 0 ? ArrowUpRight : ArrowDownRight} label="Unrealized P/L" value={formatCompactCurrency(unrealizedGain)} detail={formatPercent(unrealizedPercent)} tone={unrealizedGain >= 0 ? "positive" : "negative"} />
        <PortfolioMetric icon={TrendingUp} label="Realized Bulan Ini" value={formatCompactCurrency(monthlyRealized)} detail={`${monthlyTrades.length} trade · win rate ${winRate.toFixed(0)}%`} tone={monthlyRealized >= 0 ? "positive" : "negative"} />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.5fr)]">
        <PortfolioHistoryChart history={portfolio.equityHistory} trades={portfolio.trades} hasActivePositions={portfolio.holdings.length > 0} onClearEquity={clearEquityHistory} />
        <MonthlyPerformance tradeCount={monthlyTrades.length} wins={winningTrades} winRate={winRate} realized={monthlyRealized} />
      </div>

      <PositionsSection rows={positionRows} resolved={resolvedQuoteKey === tickerKey} onAdd={openAddHolding} onEdit={editHolding} onDelete={deleteHolding} />
      <TradeHistorySection trades={portfolio.trades} filter={tradeHistoryFilter} onFilterChange={setTradeHistoryFilter} focus={tradeHistoryFocus} onAdd={openAddTrade} onEdit={editTrade} onDelete={deleteTrade} />

      {holdingModalOpen ? <HoldingModal draft={holdingDraft} onClose={() => setHoldingModalOpen(false)} onSave={saveHolding} /> : null}
      {tradeModalOpen ? <TradeModal draft={tradeDraft} onClose={() => setTradeModalOpen(false)} onSave={saveTrade} /> : null}
      {confirmationDialog}
    </section>
  );
}

function PortfolioMetric({ icon: Icon, label, value, detail, tone }: { icon: typeof WalletCards; label: string; value: string; detail: string; tone?: "positive" | "negative" }) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-b border-gray-200 p-4 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", tone === "positive" ? "bg-emerald-50 text-emerald-700" : tone === "negative" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600")}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className={cn("mt-1 truncate text-lg font-semibold text-gray-950", tone === "positive" && "text-emerald-700", tone === "negative" && "text-red-700")}>{value}</p>
        <p className="mt-0.5 text-xs text-gray-500">{detail}</p>
      </div>
    </div>
  );
}

type PortfolioChartRow = { date: string; value: number; label: string };

function PortfolioHistoryChart({ history, trades, hasActivePositions, onClearEquity }: { history: Array<{ date: string; equity: number }>; trades: RealizedTrade[]; hasActivePositions: boolean; onClearEquity: () => void }) {
  const [mode, setMode] = useState<"equity" | "trade">("equity");
  const equityData: PortfolioChartRow[] = history.slice(-31).map((snapshot) => ({ date: snapshot.date, value: snapshot.equity, label: snapshot.date.slice(5).replace("-", "/") }));
  const tradeData = useMemo<PortfolioChartRow[]>(() => {
    const dailyGain = new Map<string, number>();
    trades.forEach((trade) => {
      dailyGain.set(trade.soldAt, (dailyGain.get(trade.soldAt) ?? 0) + calculateRealizedGain(trade));
    });

    return Array.from(dailyGain.entries())
      .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
      .reduce<{ total: number; rows: PortfolioChartRow[] }>((result, [date, gain]) => {
        const total = result.total + gain;
        return {
          total,
          rows: [...result.rows, { date, value: total, label: date.slice(5).replace("-", "/") }],
        };
      }, { total: 0, rows: [] }).rows;
  }, [trades]);
  const chartData = mode === "equity" ? equityData : tradeData;
  const latestValue = chartData.at(-1)?.value ?? 0;

  return (
    <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-950">Riwayat Performa</h2>
          <p className="mt-1 text-xs text-gray-500">
            {mode === "equity" ? hasActivePositions ? "Valuasi harian posisi aktif." : "Snapshot historis sebelum posisi aktif dihapus atau ditutup." : "Akumulasi realized P/L berdasarkan trade selesai."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-grid grid-cols-2 rounded-md border border-gray-200 bg-gray-50 p-0.5" aria-label="Pilih grafik portfolio">
            <button type="button" onClick={() => setMode("equity")} className={cn("h-8 rounded px-3 text-xs font-semibold transition", mode === "equity" ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900")}>Equity Harian</button>
            <button type="button" onClick={() => setMode("trade")} className={cn("h-8 rounded px-3 text-xs font-semibold transition", mode === "trade" ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900")}>Realized Trade</button>
          </div>
          {mode === "equity" && history.length ? <Button type="button" variant="ghost" className="h-9 px-2.5 text-xs text-gray-500 hover:text-red-700" onClick={onClearEquity} title="Hapus seluruh snapshot equity"><Trash2 className="size-4" />Reset</Button> : null}
        </div>
      </div>
      {chartData.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 px-5 text-center text-sm text-gray-500">
          {mode === "equity" ? "Grafik mulai terisi setelah posisi pertama mendapatkan harga pasar." : "Grafik mulai terisi setelah trade pertama disimpan."}
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-xs text-gray-500">{mode === "equity" ? hasActivePositions ? "Equity terakhir" : "Snapshot terakhir" : "Kumulatif realized"}</p>
            <p className={cn("text-sm font-semibold text-gray-950", mode === "trade" && latestValue >= 0 && "text-emerald-700", mode === "trade" && latestValue < 0 && "text-red-700")}>{formatCurrency(latestValue)}</p>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`portfolioHistoryFill-${mode}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={mode === "equity" ? "#dc2626" : "#059669"} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={mode === "equity" ? "#dc2626" : "#059669"} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis width={68} tickFormatter={(value) => Math.abs(value) >= 1_000_000 ? `${(value / 1_000_000).toFixed(0)}jt` : `${(value / 1_000).toFixed(0)}rb`} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), mode === "equity" ? "Equity" : "Kumulatif realized"]} labelFormatter={(label) => `Tanggal ${label}`} />
                <Area type="monotone" dataKey="value" stroke={mode === "equity" ? "#dc2626" : "#059669"} strokeWidth={2} fill={`url(#portfolioHistoryFill-${mode})`} dot={{ r: 3, fill: mode === "equity" ? "#dc2626" : "#059669" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}

function MonthlyPerformance({ tradeCount, wins, winRate, realized }: { tradeCount: number; wins: number; winRate: number; realized: number }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-gray-950">Performa Bulan Ini</h2>
      <p className="mt-1 text-xs text-gray-500">Hanya menghitung trade yang sudah ditutup.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-1">
        <PerformanceValue label="Total trade" value={String(tradeCount)} />
        <PerformanceValue label="Win / Loss" value={`${wins} / ${tradeCount - wins}`} />
        <PerformanceValue label="Win ratio" value={`${winRate.toFixed(1)}%`} />
        <PerformanceValue label="Realized P/L" value={formatCompactCurrency(realized)} tone={realized >= 0 ? "positive" : "negative"} />
      </div>
    </section>
  );
}

function PerformanceValue({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return <div className="rounded-md border border-gray-100 bg-gray-50 p-3"><p className="text-xs text-gray-500">{label}</p><p className={cn("mt-1 text-base font-semibold text-gray-950", tone === "positive" && "text-emerald-700", tone === "negative" && "text-red-700")}>{value}</p></div>;
}

type PositionRow = {
  holding: PortfolioHolding;
  shares: number;
  capital: number;
  quote?: LiveQuote;
  currentPrice: number;
  marketValue: number;
  profitLoss: number;
  profitLossPercent: number;
};

function PositionsSection({ rows, resolved, onAdd, onEdit, onDelete }: { rows: PositionRow[]; resolved: boolean; onAdd: () => void; onEdit: (holding: PortfolioHolding) => void; onDelete: (id: string) => void }) {
  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-gray-950">Posisi Aktif</h2>{rows.length > 0 && !resolved ? <RefreshCw className="size-3.5 animate-spin text-gray-400" /> : null}</div>
          <p className="mt-1 text-xs text-gray-500">Satu lot sama dengan 100 lembar saham.</p>
        </div>
        <Button type="button" className="h-9 px-3 text-xs" onClick={onAdd}><Plus className="size-4" /> Tambah</Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title="Belum ada posisi aktif" description="Tambahkan saham yang sedang kamu hold untuk mulai menghitung equity." action="Tambah posisi" onAction={onAdd} />
      ) : (
        <>
          <div className="bandarlab-scrollbar hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-white text-xs uppercase text-gray-500"><tr>{["Saham", "Lot", "Avg. Beli", "Harga Saat Ini", "Modal", "Valuasi", "Unrealized P/L", "Aksi"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">{rows.map((row) => <PositionTableRow key={row.holding.id} row={row} onEdit={onEdit} onDelete={onDelete} />)}</tbody>
            </table>
          </div>
          <div className="divide-y divide-gray-200 md:hidden">{rows.map((row) => <PositionMobileRow key={row.holding.id} row={row} onEdit={onEdit} onDelete={onDelete} />)}</div>
        </>
      )}
    </section>
  );
}

function PositionTableRow({ row, onEdit, onDelete }: { row: PositionRow; onEdit: (holding: PortfolioHolding) => void; onDelete: (id: string) => void }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4"><Link href={`/stocks/${row.holding.ticker}`} className="font-semibold text-red-700 hover:underline">{row.holding.ticker}</Link><p className="mt-1 text-xs text-gray-500">{row.holding.note || formatDisplayDate(row.holding.purchasedAt)}</p></td>
      <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-900">{row.holding.lots}</td>
      <td className="whitespace-nowrap px-4 py-4 text-gray-700">{formatCurrency(row.holding.averagePrice)}</td>
      <td className="whitespace-nowrap px-4 py-4 text-gray-700">{formatCurrency(row.currentPrice)}<p className="mt-1 text-xs text-gray-500">{row.quote?.source ?? "Harga beli fallback"}</p></td>
      <td className="whitespace-nowrap px-4 py-4 text-gray-700">{formatCurrency(row.capital)}</td>
      <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-950">{formatCurrency(row.marketValue)}</td>
      <td className={cn("whitespace-nowrap px-4 py-4 font-semibold", row.profitLoss >= 0 ? "text-emerald-700" : "text-red-700")}>{formatCurrency(row.profitLoss)}<p className="mt-1 text-xs">{formatPercent(row.profitLossPercent)}</p></td>
      <td className="px-4 py-4"><RowActions label={row.holding.ticker} onEdit={() => onEdit(row.holding)} onDelete={() => onDelete(row.holding.id)} /></td>
    </tr>
  );
}

function PositionMobileRow({ row, onEdit, onDelete }: { row: PositionRow; onEdit: (holding: PortfolioHolding) => void; onDelete: (id: string) => void }) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3"><div><Link href={`/stocks/${row.holding.ticker}`} className="font-semibold text-red-700">{row.holding.ticker}</Link><p className="mt-1 text-xs text-gray-500">{row.holding.lots} lot · avg {formatCurrency(row.holding.averagePrice)}</p></div><RowActions label={row.holding.ticker} onEdit={() => onEdit(row.holding)} onDelete={() => onDelete(row.holding.id)} /></div>
      <div className="mt-4 grid grid-cols-2 gap-3"><MobileValue label="Modal" value={formatCompactCurrency(row.capital)} /><MobileValue label="Valuasi" value={formatCompactCurrency(row.marketValue)} /><MobileValue label="Harga saat ini" value={formatCurrency(row.currentPrice)} /><MobileValue label="Unrealized" value={`${formatCompactCurrency(row.profitLoss)} · ${formatPercent(row.profitLossPercent)}`} tone={row.profitLoss >= 0 ? "positive" : "negative"} /></div>
    </article>
  );
}

function MobileValue({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return <div><p className="text-xs text-gray-500">{label}</p><p className={cn("mt-1 break-words text-sm font-semibold text-gray-900", tone === "positive" && "text-emerald-700", tone === "negative" && "text-red-700")}>{value}</p></div>;
}

function RowActions({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return <div className="flex justify-end gap-1"><button type="button" onClick={onEdit} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label={`Edit ${label}`}><Pencil className="size-4" /></button><button type="button" onClick={onDelete} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus ${label}`}><Trash2 className="size-4" /></button></div>;
}

function TradeHistorySection({ trades, filter, onFilterChange, focus, onAdd, onEdit, onDelete }: { trades: RealizedTrade[]; filter: TradeHistoryFilter; onFilterChange: (filter: TradeHistoryFilter) => void; focus: TradeHistoryFocus; onAdd: () => void; onEdit: (trade: RealizedTrade) => void; onDelete: (id: string) => void }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (focus.requestId === 0) return;
    const scrollTimer = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(scrollTimer);
  }, [focus]);

  const availableYears = Array.from(new Set([getJakartaDate().slice(0, 4), filter.year, ...trades.map((trade) => trade.soldAt.slice(0, 4))]))
    .filter(Boolean)
    .sort((first, second) => second.localeCompare(first));
  const sortedTrades = trades
    .filter((trade) => {
      if (filter.mode === "month") return trade.soldAt.startsWith(filter.month);
      if (filter.mode === "quarter") return trade.soldAt.startsWith(filter.year) && getQuarterFromDate(trade.soldAt) === filter.quarter;
      return trade.soldAt.startsWith(filter.year);
    })
    .sort((first, second) => second.soldAt.localeCompare(first.soldAt));
  const periodRealized = sortedTrades.reduce((total, trade) => total + calculateRealizedGain(trade), 0);
  const periodLabel = filter.mode === "month"
    ? new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${filter.month}-01T00:00:00Z`))
    : filter.mode === "quarter"
      ? `Kuartal ${filter.quarter} ${filter.year}`
      : `Tahun ${filter.year}`;

  return (
    <section ref={sectionRef} className="scroll-mt-24 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-950">History Trade</h2>
            <p className="mt-1 text-xs text-gray-500">Lookup realized gain berdasarkan bulan, kuartal, atau satu tahun.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">{periodLabel}</span>
              <span className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">{sortedTrades.length} trade</span>
              <span className={cn("rounded px-2 py-1 text-xs font-semibold", periodRealized >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{formatCompactCurrency(periodRealized)}</span>
            </div>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] xl:min-w-[560px]">
            <div className="inline-grid grid-cols-3 rounded-md border border-gray-200 bg-white p-0.5 sm:col-span-3" aria-label="Periode history trade">
              {([['month', 'Bulanan'], ['quarter', 'Kuartal'], ['year', '1 Tahun']] as const).map(([mode, label]) => (
                <button key={mode} type="button" onClick={() => onFilterChange({ ...filter, mode })} className={cn("h-8 rounded px-3 text-xs font-semibold transition", filter.mode === mode ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900")}>{label}</button>
              ))}
            </div>

            <div className="min-w-0 sm:col-span-2">
              {filter.mode === "month" ? (
                <input
                  type="month"
                  value={filter.month}
                  onChange={(event) => {
                    const month = event.target.value;
                    onFilterChange({ ...filter, month, year: month.slice(0, 4), quarter: getQuarterFromDate(`${month}-01`) });
                  }}
                  aria-label="Filter bulan trade"
                  className="h-9 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 text-xs"
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filter.mode === "quarter" ? (
                    <select value={filter.quarter} onChange={(event) => onFilterChange({ ...filter, quarter: Number(event.target.value) })} aria-label="Filter kuartal trade" className="h-9 rounded-md border border-gray-300 bg-white px-3 text-xs">
                      {[1, 2, 3, 4].map((quarter) => <option key={quarter} value={quarter}>Kuartal {quarter}</option>)}
                    </select>
                  ) : <span />}
                  <select value={filter.year} onChange={(event) => onFilterChange({ ...filter, year: event.target.value })} aria-label="Filter tahun trade" className={cn("h-9 rounded-md border border-gray-300 bg-white px-3 text-xs", filter.mode === "year" && "col-span-2")}>
                    {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
              )}
            </div>
            <Button type="button" variant="outline" className="h-9 whitespace-nowrap px-3 text-xs" onClick={onAdd}><Plus className="size-4" /> Catat</Button>
          </div>
        </div>
      </div>
      {sortedTrades.length === 0 ? <EmptyState icon={History} title="Belum ada trade pada periode ini" description="Ubah periode atau catat transaksi yang sudah ditutup untuk melihat realized gain." action="Catat trade" onAction={onAdd} /> : (
        <div className="bandarlab-scrollbar overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-white text-xs uppercase text-gray-500"><tr>{["Tanggal Jual", "Saham", "Lot", "Harga Beli", "Harga Jual", "Realized P/L", "Hasil", "Aksi"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{sortedTrades.map((trade) => { const gain = calculateRealizedGain(trade); return <tr key={trade.id} className={cn("transition duration-300 hover:bg-gray-50", trade.id === focus.tradeId && "bg-red-50/70")}><td className="whitespace-nowrap px-4 py-4 text-gray-600">{formatDisplayDate(trade.soldAt)}</td><td className="px-4 py-4"><Link href={`/stocks/${trade.ticker}`} className="font-semibold text-red-700 hover:underline">{trade.ticker}</Link></td><td className="px-4 py-4 font-semibold text-gray-900">{trade.lots}</td><td className="whitespace-nowrap px-4 py-4 text-gray-700">{formatCurrency(trade.buyPrice)}</td><td className="whitespace-nowrap px-4 py-4 text-gray-700">{formatCurrency(trade.sellPrice)}</td><td className={cn("whitespace-nowrap px-4 py-4 font-semibold", gain >= 0 ? "text-emerald-700" : "text-red-700")}>{formatCurrency(gain)}</td><td className="px-4 py-4"><span className={cn("rounded px-2 py-1 text-xs font-semibold", gain > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{gain > 0 ? "WIN" : "LOSS"}</span></td><td className="px-4 py-4"><RowActions label={`trade ${trade.ticker}`} onEdit={() => onEdit(trade)} onDelete={() => onDelete(trade.id)} /></td></tr>; })}</tbody></table></div>
      )}
    </section>
  );
}

function EmptyState({ icon: Icon, title, description, action, onAction }: { icon: typeof History; title: string; description: string; action: string; onAction: () => void }) {
  return <div className="px-5 py-12 text-center"><Icon className="mx-auto size-8 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-900">{title}</p><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">{description}</p><Button type="button" className="mt-4" onClick={onAction}>{action}</Button></div>;
}

function HoldingModal({ draft: initialDraft, onClose, onSave }: { draft: HoldingDraft; onClose: () => void; onSave: (draft: HoldingDraft) => void }) {
  const [draft, setDraft] = useState(initialDraft);
  const stock = idxListedStocks.find((item) => item.ticker === normalizeTicker(draft.ticker));
  return <PortfolioModal title={draft.id ? "Edit posisi" : "Tambah posisi aktif"} description="Masukkan posisi saham yang masih kamu hold." onClose={onClose}><form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><TickerField value={draft.ticker} onChange={(ticker) => setDraft({ ...draft, ticker })} stockName={stock?.name} /><div className="grid gap-4 sm:grid-cols-2"><NumberField label="Jumlah lot" value={draft.lots} onChange={(lots) => setDraft({ ...draft, lots })} min="1" step="1" /><NumberField label="Harga rata-rata / lembar" value={draft.averagePrice} onChange={(averagePrice) => setDraft({ ...draft, averagePrice })} min="1" /></div><label className="grid gap-1.5 text-sm font-medium text-gray-700">Tanggal mulai hold<input type="date" value={draft.purchasedAt} onChange={(event) => setDraft({ ...draft, purchasedAt: event.target.value })} className="h-11 rounded-md border border-gray-300 px-3" /></label><label className="grid gap-1.5 text-sm font-medium text-gray-700">Catatan<textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Contoh: Swing posisi utama" className="min-h-20 resize-y rounded-md border border-gray-300 px-3 py-2 text-sm" /></label><ModalActions onClose={onClose} submitLabel="Simpan posisi" /></form></PortfolioModal>;
}

function TradeModal({ draft: initialDraft, onClose, onSave }: { draft: TradeDraft; onClose: () => void; onSave: (draft: TradeDraft) => void }) {
  const [draft, setDraft] = useState(initialDraft);
  const stock = idxListedStocks.find((item) => item.ticker === normalizeTicker(draft.ticker));
  const preview = calculateRealizedGain({ ...draft, id: draft.id ?? "preview", ticker: normalizeTicker(draft.ticker) });
  return (
    <PortfolioModal
      title={draft.id ? "Edit trade selesai" : "Catat trade selesai"}
      description="Trade history tidak mengubah jumlah posisi aktif secara otomatis."
      onClose={onClose}
    >
      <form
        className="grid min-w-0 gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
      >
        <TickerField
          value={draft.ticker}
          onChange={(ticker) => setDraft({ ...draft, ticker })}
          stockName={stock?.name}
        />

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField label="Jumlah lot" value={draft.lots} onChange={(lots) => setDraft({ ...draft, lots })} min="1" step="1" />
          <NumberField label="Harga beli" value={draft.buyPrice} onChange={(buyPrice) => setDraft({ ...draft, buyPrice })} min="1" />
          <NumberField label="Harga jual" value={draft.sellPrice} onChange={(sellPrice) => setDraft({ ...draft, sellPrice })} min="1" />
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField label="Fee beli (%)" value={draft.buyFeePercent} onChange={(buyFeePercent) => setDraft({ ...draft, buyFeePercent })} min="0" step="0.01" />
          <NumberField label="Fee jual (%)" value={draft.sellFeePercent} onChange={(sellFeePercent) => setDraft({ ...draft, sellFeePercent })} min="0" step="0.01" />
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-gray-700 sm:col-span-2 lg:col-span-1">
            Tanggal jual
            <input
              type="date"
              value={draft.soldAt}
              onChange={(event) => setDraft({ ...draft, soldAt: event.target.value })}
              className="h-11 min-w-0 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900"
            />
          </label>
        </div>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-gray-700">
          Catatan
          <textarea
            value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            placeholder="Alasan entry atau exit"
            className="min-h-24 w-full min-w-0 resize-y rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <div className={cn("flex flex-col gap-1 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between", preview >= 0 ? "border-emerald-100 bg-emerald-50" : "border-red-100 bg-red-50")}>
          <p className="text-xs font-semibold uppercase text-gray-500">Estimasi realized P/L</p>
          <p className={cn("text-xl font-semibold", preview >= 0 ? "text-emerald-700" : "text-red-700")}>{formatCurrency(preview)}</p>
        </div>

        <ModalActions onClose={onClose} submitLabel="Simpan trade" />
      </form>
    </PortfolioModal>
  );
}

function PortfolioModal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolio-modal-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-lg bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 id="portfolio-modal-title" className="text-base font-semibold text-gray-950">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label="Tutup modal">
            <X className="size-5" />
          </button>
        </div>
        <div className="bandarlab-scrollbar min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function TickerField({ value, onChange, stockName }: { value: string; onChange: (value: string) => void; stockName?: string }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-medium text-gray-700">Kode ticker<input list="portfolio-ticker-list" value={value} onChange={(event) => onChange(normalizeTicker(event.target.value))} placeholder="Contoh: LAPD" autoComplete="off" className="h-11 min-w-0 w-full rounded-md border border-gray-300 px-3 font-semibold uppercase" /><datalist id="portfolio-ticker-list">{idxListedStocks.map((stock) => <option key={stock.ticker} value={stock.ticker}>{stock.name}</option>)}</datalist><span className="min-h-4 text-xs font-normal text-gray-500">{stockName ?? (value ? "Ticker belum ditemukan di snapshot IDX" : "")}</span></label>;
}

function NumberField({ label, value, onChange, min, step }: { label: string; value: number; onChange: (value: number) => void; min?: string; step?: string }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-medium text-gray-700">{label}<input type="number" inputMode="decimal" min={min} step={step ?? "any"} value={value || ""} onChange={(event) => onChange(Number(event.target.value))} className="h-11 min-w-0 w-full rounded-md border border-gray-300 px-3 tabular-nums" /></label>;
}

function ModalActions({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) {
  return <div className="sticky -bottom-4 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-200 bg-white px-4 pb-4 pt-4 shadow-[0_-8px_16px_-16px_rgba(17,24,39,0.35)] sm:-bottom-5 sm:-mx-5 sm:flex-row sm:justify-end sm:px-5 sm:pb-5"><Button className="w-full sm:w-auto" type="button" variant="outline" onClick={onClose}>Batal</Button><Button className="w-full sm:w-auto" type="submit">{submitLabel}</Button></div>;
}
