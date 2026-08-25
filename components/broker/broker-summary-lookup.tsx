"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { idxListedStocks } from "@/lib/idx-listed-stocks";
import { cn } from "@/lib/utils";

type SourceMode = "axentraz" | "stockbit";
type SideFilter = "all" | "buy" | "sell";
type SortMode = "net-buy" | "net-sell" | "net-lot" | "buy-value" | "sell-value" | "date" | "ticker";

const tablePageSize = 50;
const maxSelectedBrokers = 5;

type Broker = {
  broker_id?: number;
  broker_code: string;
  broker_name: string;
  is_foreign: boolean | 0 | 1;
};

type BrokerTransaction = {
  date: string;
  symbol: string;
  symbol_name: string;
  side: "buy" | "sell";
  buy_lot: number;
  buy_value: number;
  buy_avg_price: string | number;
  sell_lot: number;
  sell_value: number;
  sell_avg_price: string | number;
  net_lot: number;
  net_value: number;
};

type BrokerDetail = {
  broker_code: string;
  broker_name: string;
  is_foreign: boolean;
  transaction_type: string;
  market_board: string;
  from: string;
  to: string;
  page: number;
  limit: number;
  total_rows: number;
  total_pages: number;
  transactions: BrokerTransaction[];
  source_rows?: number;
};

type ApiMeta = {
  request_id?: string;
  generated_at?: string;
};

function normalizeTicker(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 1_000_000 ? 2 : 0,
  }).format(Number(value) || 0);
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatGeneratedAt(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function combineBrokerDetails(details: BrokerDetail[]) {
  if (details.length === 1) return details[0];

  const grouped = new Map<string, BrokerTransaction>();
  for (const detail of details) {
    for (const transaction of detail.transactions) {
      const current = grouped.get(transaction.symbol);
      if (!current) {
        grouped.set(transaction.symbol, { ...transaction });
        continue;
      }

      const buyLot = Number(current.buy_lot) + Number(transaction.buy_lot);
      const sellLot = Number(current.sell_lot) + Number(transaction.sell_lot);
      const currentBuyWeighted = Number(current.buy_avg_price) * Number(current.buy_lot);
      const nextBuyWeighted = Number(transaction.buy_avg_price) * Number(transaction.buy_lot);
      const currentSellWeighted = Number(current.sell_avg_price) * Number(current.sell_lot);
      const nextSellWeighted = Number(transaction.sell_avg_price) * Number(transaction.sell_lot);
      const netValue = Number(current.net_value) + Number(transaction.net_value);

      grouped.set(transaction.symbol, {
        ...current,
        date: transaction.date > current.date ? transaction.date : current.date,
        side: netValue >= 0 ? "buy" : "sell",
        buy_lot: buyLot,
        buy_value: Number(current.buy_value) + Number(transaction.buy_value),
        buy_avg_price: buyLot ? (currentBuyWeighted + nextBuyWeighted) / buyLot : 0,
        sell_lot: sellLot,
        sell_value: Number(current.sell_value) + Number(transaction.sell_value),
        sell_avg_price: sellLot ? (currentSellWeighted + nextSellWeighted) / sellLot : 0,
        net_lot: Number(current.net_lot) + Number(transaction.net_lot),
        net_value: netValue,
      });
    }
  }

  const first = details[0];
  const transactions = [...grouped.values()];
  return {
    ...first,
    broker_code: details.map((detail) => detail.broker_code).join(" + "),
    broker_name: details.map((detail) => detail.broker_name).join(", "),
    is_foreign: details.every((detail) => detail.is_foreign),
    from: details.reduce((earliest, detail) => detail.from < earliest ? detail.from : earliest, first.from),
    to: details.reduce((latest, detail) => detail.to > latest ? detail.to : latest, first.to),
    page: 1,
    limit: transactions.length,
    total_rows: details.reduce((total, detail) => total + detail.total_rows, 0),
    total_pages: 1,
    transactions,
    source_rows: details.reduce((total, detail) => total + detail.transactions.length, 0),
  } satisfies BrokerDetail;
}

export function BrokerSummaryLookup() {
  const [mode, setMode] = useState<SourceMode>("axentraz");
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [brokerCodes, setBrokerCodes] = useState<string[]>([]);
  const [brokerSearch, setBrokerSearch] = useState("");
  const [brokerPickerOpen, setBrokerPickerOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<BrokerDetail | null>(null);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("net-buy");
  const [tickerFilter, setTickerFilter] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [loadingBrokers, setLoadingBrokers] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const brokerPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/axentraz/brokers", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { data?: Broker[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Daftar broker gagal dimuat.");
        const rows = [...(payload.data ?? [])].sort((first, second) => first.broker_code.localeCompare(second.broker_code));
        setBrokers(rows);
        const initialCode = rows.find((broker) => broker.broker_code === "MG")?.broker_code ?? rows[0]?.broker_code;
        setBrokerCodes(initialCode ? [initialCode] : []);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Daftar broker gagal dimuat.");
      })
      .finally(() => setLoadingBrokers(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    function closePicker(event: MouseEvent) {
      if (!brokerPickerRef.current?.contains(event.target as Node)) setBrokerPickerOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setBrokerPickerOpen(false);
    }
    document.addEventListener("mousedown", closePicker);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closePicker);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const loadDetail = useCallback(async () => {
    if (brokerCodes.length === 0) return;
    setLoadingDetail(true);
    setError(null);
    try {
      const results = await Promise.all(brokerCodes.map(async (brokerCode) => {
        const query = new URLSearchParams({ brokerCode, page: "1", limit: "1000" });
        if (from) query.set("from", from);
        if (to) query.set("to", to);
        const response = await fetch(`/api/axentraz/broker-detail?${query.toString()}`);
        const payload = await response.json() as { data?: BrokerDetail; meta?: ApiMeta; error?: string };
        if (!response.ok || !payload.data) throw new Error(`${brokerCode}: ${payload.error || "Aktivitas broker gagal dimuat."}`);
        return payload;
      }));
      setDetail(combineBrokerDetails(results.map((result) => result.data!)));
      setMeta(results.map((result) => result.meta).filter(Boolean).sort((first, second) => (second?.generated_at ?? "").localeCompare(first?.generated_at ?? ""))[0] ?? null);
      setSideFilter("all");
      setSortMode("net-buy");
      setTickerFilter("");
      setTablePage(1);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Aktivitas broker gagal dimuat.");
    } finally {
      setLoadingDetail(false);
    }
  }, [brokerCodes, from, to]);

  function submitAxentraz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadDetail();
  }

  const filteredTransactions = useMemo(() => {
    const normalizedTicker = normalizeTicker(tickerFilter);
    const rows = (detail?.transactions ?? []).filter((transaction) => (
      (sideFilter === "all" || transaction.side === sideFilter)
      && (!normalizedTicker || transaction.symbol.includes(normalizedTicker))
    ));

    return [...rows].sort((first, second) => {
      if (sortMode === "net-sell") return Number(first.net_value) - Number(second.net_value);
      if (sortMode === "net-lot") return Number(second.net_lot) - Number(first.net_lot);
      if (sortMode === "buy-value") return Number(second.buy_value) - Number(first.buy_value);
      if (sortMode === "sell-value") return Number(second.sell_value) - Number(first.sell_value);
      if (sortMode === "date") return second.date.localeCompare(first.date);
      if (sortMode === "ticker") return first.symbol.localeCompare(second.symbol);
      return Number(second.net_value) - Number(first.net_value);
    });
  }, [detail, sideFilter, sortMode, tickerFilter]);
  const tablePages = Math.max(1, Math.ceil(filteredTransactions.length / tablePageSize));
  const visibleTransactions = filteredTransactions.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize);
  const pageSummary = useMemo(() => {
    const rows = detail?.transactions ?? [];
    return {
      buyValue: rows.reduce((total, row) => total + Number(row.buy_value || 0), 0),
      sellValue: rows.reduce((total, row) => total + Number(row.sell_value || 0), 0),
      netValue: rows.reduce((total, row) => total + Number(row.net_value || 0), 0),
      symbols: new Set(rows.map((row) => row.symbol)).size,
    };
  }, [detail]);
  const selectedBrokers = useMemo(
    () => brokerCodes.map((code) => brokers.find((broker) => broker.broker_code === code)).filter((broker): broker is Broker => Boolean(broker)),
    [brokerCodes, brokers],
  );
  const filteredBrokers = useMemo(() => {
    const query = brokerSearch.trim().toLowerCase();
    if (!query) return brokers;
    return brokers.filter((broker) => `${broker.broker_code} ${broker.broker_name}`.toLowerCase().includes(query));
  }, [brokerSearch, brokers]);

  function toggleBroker(code: string) {
    setBrokerCodes((current) => {
      if (current.includes(code)) return current.filter((brokerCode) => brokerCode !== code);
      if (current.length >= maxSelectedBrokers) return current;
      return [...current, code];
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1.5">
        <button type="button" onClick={() => setMode("axentraz")} className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold", mode === "axentraz" ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:bg-white")}>
          <Database className="size-4" /> Axentraz API
        </button>
        <button type="button" onClick={() => setMode("stockbit")} className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold", mode === "stockbit" ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:bg-white")}>
          <ExternalLink className="size-4" /> Stockbit
        </button>
      </div>

      {mode === "axentraz" ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <form onSubmit={submitAxentraz} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(280px,1.4fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_auto] lg:items-end">
              <div ref={brokerPickerRef} className="relative min-w-0 text-xs font-semibold text-gray-600">
                Broker <span className="font-normal text-gray-400">(maks. {maxSelectedBrokers})</span>
                <button type="button" onClick={() => setBrokerPickerOpen((open) => !open)} disabled={loadingBrokers} aria-haspopup="listbox" aria-expanded={brokerPickerOpen} className="mt-1.5 flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm font-normal text-gray-950 disabled:bg-gray-50">
                  <span className="min-w-0 truncate">{loadingBrokers ? "Memuat broker..." : brokerCodes.length ? `${brokerCodes.join(", ")} · ${brokerCodes.length} dipilih` : "Pilih broker"}</span>
                  <ChevronsUpDown className="size-4 shrink-0 text-gray-400" />
                </button>
                {brokerPickerOpen ? (
                  <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                    <div className="border-b border-gray-100 p-2">
                      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><input value={brokerSearch} onChange={(event) => setBrokerSearch(event.target.value)} placeholder="Cari kode atau nama broker" autoFocus className="h-10 w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm font-normal text-gray-950" /></div>
                      <p className="mt-2 px-1 text-[11px] font-normal text-gray-500">{brokerCodes.length}/{maxSelectedBrokers} broker dipilih</p>
                    </div>
                    <div role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto p-1.5">
                      {filteredBrokers.map((broker) => {
                        const selected = brokerCodes.includes(broker.broker_code);
                        const disabled = !selected && brokerCodes.length >= maxSelectedBrokers;
                        return <button key={broker.broker_code} type="button" role="option" aria-selected={selected} disabled={disabled} onClick={() => toggleBroker(broker.broker_code)} className={cn("flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40", selected && "bg-red-50")}><span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border", selected ? "border-red-600 bg-red-600 text-white" : "border-gray-300 bg-white")}>{selected ? <Check className="size-3" /> : null}</span><span className="min-w-0"><strong className="block text-xs text-gray-950">{broker.broker_code}</strong><span className="block truncate text-[11px] font-normal text-gray-500">{broker.broker_name}</span></span></button>;
                      })}
                      {filteredBrokers.length === 0 ? <p className="px-3 py-8 text-center text-xs font-normal text-gray-500">Broker tidak ditemukan.</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <label className="text-xs font-semibold text-gray-600">
                Dari tanggal
                <input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="mt-1.5 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-normal text-gray-950" />
              </label>
              <label className="text-xs font-semibold text-gray-600">
                Sampai tanggal
                <input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="mt-1.5 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-normal text-gray-950" />
              </label>
              <button type="submit" disabled={brokerCodes.length === 0 || loadingBrokers || loadingDetail} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">
                {loadingDetail ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                {loadingDetail ? `Menggabungkan ${brokerCodes.length}` : "Tampilkan"}
              </button>
              {selectedBrokers.length ? <div className="flex flex-wrap gap-1.5 lg:col-span-4">{selectedBrokers.map((broker) => <span key={broker.broker_code} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-red-100 bg-red-50 pl-2.5 pr-1.5 text-xs font-semibold text-red-700" title={broker.broker_name}>{broker.broker_code}<button type="button" onClick={() => toggleBroker(broker.broker_code)} className="inline-flex size-5 items-center justify-center rounded text-red-500 hover:bg-red-100" aria-label={`Hapus broker ${broker.broker_code}`}><X className="size-3.5" /></button></span>)}</div> : null}
            </form>
          </section>

          {error ? (
            <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-center">
              <p className="text-sm font-semibold text-red-900">Data broker belum dapat dimuat</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              {brokerCodes.length ? <button type="button" onClick={() => void loadDetail()} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700"><RefreshCw className="size-4" />Coba lagi</button> : null}
            </section>
          ) : null}

          {loadingDetail && !detail ? <section className="flex min-h-64 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500"><Loader2 className="mr-2 size-5 animate-spin text-red-600" />Menggabungkan aktivitas {brokerCodes.length} broker...</section> : null}

          {detail ? (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label={detail.source_rows ? "Broker gabungan" : "Broker"} value={detail.broker_code} detail={detail.broker_name} icon={Building2} />
                <Metric label="Net value dimuat" value={formatCurrency(pageSummary.netValue)} detail={`${pageSummary.symbols} saham`} tone={pageSummary.netValue >= 0 ? "positive" : "negative"} icon={pageSummary.netValue >= 0 ? ArrowUpRight : ArrowDownRight} />
                <Metric label="Buy value dimuat" value={formatCurrency(pageSummary.buyValue)} detail={`${detail.source_rows ?? detail.transactions.length} dari ${detail.total_rows} baris sumber`} tone="positive" icon={ArrowUpRight} />
                <Metric label="Sell value dimuat" value={formatCurrency(pageSummary.sellValue)} detail={`${formatDate(detail.from)} - ${formatDate(detail.to)}`} tone="negative" icon={ArrowDownRight} />
              </section>

              <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-950">{detail.source_rows ? "Akumulasi gabungan per saham" : "Aktivitas transaksi"}</h2>
                    <p className="mt-1 text-xs text-gray-500">{detail.market_board} · {detail.transaction_type} · {detail.source_rows ? `${detail.broker_code} · ` : ""}Data {formatGeneratedAt(meta?.generated_at)}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[180px_210px_auto]">
                    <label className="text-xs font-semibold text-gray-600">
                      Cari ticker
                      <span className="relative mt-1 block"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" /><input value={tickerFilter} onChange={(event) => { setTickerFilter(normalizeTicker(event.target.value)); setTablePage(1); }} placeholder="Contoh: BBCA" className="h-9 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-xs font-normal uppercase text-gray-950" /></span>
                    </label>
                    <label className="text-xs font-semibold text-gray-600">
                      Urutkan
                      <select value={sortMode} onChange={(event) => { setSortMode(event.target.value as SortMode); setTablePage(1); }} className="mt-1 h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-xs font-normal text-gray-950">
                        <option value="net-buy">Net Buy terbesar</option>
                        <option value="net-sell">Net Sell terbesar</option>
                        <option value="net-lot">Net lot terbesar</option>
                        <option value="buy-value">Buy value terbesar</option>
                        <option value="sell-value">Sell value terbesar</option>
                        <option value="date">Tanggal terbaru</option>
                        <option value="ticker">Ticker A-Z</option>
                      </select>
                    </label>
                    <div className="grid grid-cols-3 gap-1 self-end rounded-md bg-gray-100 p-1">
                      {(["all", "buy", "sell"] as const).map((side) => <button key={side} type="button" onClick={() => { setSideFilter(side); setTablePage(1); }} className={cn("h-8 rounded px-3 text-xs font-semibold", sideFilter === side ? "bg-white text-gray-950 shadow-sm" : "text-gray-500")}>{side === "all" ? "Semua" : side === "buy" ? "Net Buy" : "Net Sell"}</button>)}
                    </div>
                  </div>
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[1150px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>{[detail.source_rows ? "Terakhir" : "Tanggal", "Saham", "Side", "Buy lot", "Buy value", "Buy avg", "Sell lot", "Sell value", "Sell avg", "Net lot", "Net value"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr>
                    </thead>
                    <tbody>
                      {visibleTransactions.map((transaction, index) => (
                        <tr key={`${transaction.date}-${transaction.symbol}-${index}`} className="border-t border-gray-100 hover:bg-gray-50/70">
                          <td className="whitespace-nowrap px-3 py-3 text-gray-600">{formatDate(transaction.date)}</td>
                          <td className="max-w-52 px-3 py-3"><Link href={`/stocks/${transaction.symbol}`} className="font-semibold text-gray-950 hover:text-red-700">{transaction.symbol}</Link><span className="mt-0.5 block truncate text-xs text-gray-500">{transaction.symbol_name}</span></td>
                          <td className="px-3 py-3"><SideBadge side={transaction.side} /></td>
                          <td className="whitespace-nowrap px-3 py-3 text-gray-700">{formatNumber(transaction.buy_lot)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-emerald-700">{formatCurrency(transaction.buy_value)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-gray-700">{formatNumber(Number(transaction.buy_avg_price))}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-gray-700">{formatNumber(transaction.sell_lot)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-red-700">{formatCurrency(transaction.sell_value)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-gray-700">{formatNumber(Number(transaction.sell_avg_price))}</td>
                          <td className={cn("whitespace-nowrap px-3 py-3 font-semibold", transaction.net_lot >= 0 ? "text-emerald-700" : "text-red-700")}>{transaction.net_lot > 0 ? "+" : ""}{formatNumber(transaction.net_lot)}</td>
                          <td className={cn("whitespace-nowrap px-3 py-3 font-semibold", transaction.net_value >= 0 ? "text-emerald-700" : "text-red-700")}>{formatCurrency(transaction.net_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-gray-100 lg:hidden">
                  {visibleTransactions.map((transaction, index) => (
                    <article key={`${transaction.date}-${transaction.symbol}-${index}`} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span><Link href={`/stocks/${transaction.symbol}`} className="text-sm font-semibold text-gray-950">{transaction.symbol}</Link><span className="mt-0.5 block text-xs text-gray-500">{formatDate(transaction.date)}</span></span>
                        <SideBadge side={transaction.side} />
                      </div>
                      <p className="mt-2 truncate text-xs text-gray-500">{transaction.symbol_name}</p>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                        <span><span className="block text-gray-500">Buy</span><strong className="mt-1 block text-emerald-700">{formatNumber(transaction.buy_lot)} lot</strong></span>
                        <span><span className="block text-gray-500">Sell</span><strong className="mt-1 block text-red-700">{formatNumber(transaction.sell_lot)} lot</strong></span>
                        <span><span className="block text-gray-500">Net value</span><strong className={cn("mt-1 block", transaction.net_value >= 0 ? "text-emerald-700" : "text-red-700")}>{formatCurrency(transaction.net_value)}</strong></span>
                      </div>
                    </article>
                  ))}
                </div>

                {visibleTransactions.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">Tidak ada transaksi pada filter ini.</div> : null}
                <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-gray-500">{filteredTransactions.length === 0 ? "0 data" : `${(tablePage - 1) * tablePageSize + 1}-${Math.min(tablePage * tablePageSize, filteredTransactions.length)} dari ${filteredTransactions.length} hasil`} · {detail.source_rows ?? detail.transactions.length} dari {detail.total_rows} baris sumber dimuat</p>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={tablePage <= 1} onClick={() => setTablePage((current) => Math.max(1, current - 1))} className="inline-flex size-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 disabled:opacity-40" aria-label="Halaman sebelumnya"><ChevronLeft className="size-4" /></button>
                    <span className="min-w-16 text-center text-xs font-semibold text-gray-600">{tablePage} / {tablePages}</span>
                    <button type="button" disabled={tablePage >= tablePages} onClick={() => setTablePage((current) => Math.min(tablePages, current + 1))} className="inline-flex size-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 disabled:opacity-40" aria-label="Halaman berikutnya"><ChevronRight className="size-4" /></button>
                  </div>
                </div>
              </section>
            </>
          ) : !loadingDetail && !error ? <section className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-12 text-center"><BarChart3 className="mx-auto size-7 text-gray-400" /><p className="mt-3 text-sm font-semibold text-gray-800">Pilih broker dan tampilkan aktivitas</p></section> : null}
        </div>
      ) : <StockbitLookup />}
    </div>
  );
}

function SideBadge({ side }: { side: "buy" | "sell" }) {
  return <span className={cn("rounded px-2 py-1 text-xs font-semibold", side === "buy" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{side === "buy" ? "Net Buy" : "Net Sell"}</span>;
}

function Metric({ label, value, detail, tone, icon: Icon }: { label: string; value: string; detail: string; tone?: "positive" | "negative"; icon: typeof Building2 }) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-gray-500"><Icon className="size-4" /><span className="text-xs font-semibold uppercase">{label}</span></div>
      <p className={cn("mt-3 truncate text-lg font-semibold text-gray-950", tone === "positive" && "text-emerald-700", tone === "negative" && "text-red-700")}>{value}</p>
      <p className="mt-1 truncate text-xs text-gray-500" title={detail}>{detail}</p>
    </div>
  );
}

function StockbitLookup() {
  const [ticker, setTicker] = useState("");
  const normalizedTicker = normalizeTicker(ticker);
  const selectedStock = useMemo(() => idxListedStocks.find((stock) => stock.ticker === normalizedTicker), [normalizedTicker]);

  function openStockbit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (normalizedTicker) window.open(`https://stockbit.com/symbol/${encodeURIComponent(normalizedTicker)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-5"><h2 className="text-sm font-semibold text-gray-950">Buka emiten di Stockbit</h2></div>
      <form className="p-4 sm:p-6" onSubmit={openStockbit}>
        <label className="text-sm font-semibold text-gray-800" htmlFor="broker-summary-ticker">Kode ticker</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><input id="broker-summary-ticker" list="idx-ticker-list" value={ticker} onChange={(event) => setTicker(normalizeTicker(event.target.value))} placeholder="Contoh: LAPD" autoComplete="off" className="h-11 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm font-semibold uppercase text-gray-950 placeholder:font-normal placeholder:normal-case placeholder:text-gray-400" /><datalist id="idx-ticker-list">{idxListedStocks.map((stock) => <option key={stock.ticker} value={stock.ticker}>{stock.name}</option>)}</datalist></div>
          <button type="submit" disabled={!normalizedTicker} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-500">Buka Stockbit <ArrowUpRight className="size-4" /></button>
        </div>
        <div className="mt-3 min-h-10 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">{normalizedTicker ? selectedStock ? <span><strong className="text-gray-900">{selectedStock.ticker}</strong> · {selectedStock.name}</span> : <span>Ticker <strong className="text-gray-900">{normalizedTicker}</strong> belum ada di snapshot lokal.</span> : <span>Masukkan ticker saham Indonesia.</span>}</div>
      </form>
    </section>
  );
}
