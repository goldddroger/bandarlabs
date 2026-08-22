"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, Search } from "lucide-react";
import { idxListedStocks } from "@/lib/idx-listed-stocks";

function normalizeTicker(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export function BrokerSummaryLookup() {
  const [ticker, setTicker] = useState("");
  const normalizedTicker = normalizeTicker(ticker);
  const selectedStock = useMemo(
    () => idxListedStocks.find((stock) => stock.ticker === normalizedTicker),
    [normalizedTicker],
  );

  function openStockbit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizedTicker) return;

    window.open(`https://stockbit.com/symbol/${encodeURIComponent(normalizedTicker)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-red-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-gray-950">Cari emiten</h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-gray-500">Sumber analisis akan dibuka langsung melalui Stockbit.</p>
      </div>

      <form className="p-4 sm:p-6" onSubmit={openStockbit}>
        <label className="text-sm font-semibold text-gray-800" htmlFor="broker-summary-ticker">
          Kode ticker
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              id="broker-summary-ticker"
              list="idx-ticker-list"
              value={ticker}
              onChange={(event) => setTicker(normalizeTicker(event.target.value))}
              placeholder="Contoh: LAPD"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="h-11 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm font-semibold uppercase text-gray-950 placeholder:font-normal placeholder:normal-case placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
            <datalist id="idx-ticker-list">
              {idxListedStocks.map((stock) => (
                <option key={stock.ticker} value={stock.ticker}>{stock.name}</option>
              ))}
            </datalist>
          </div>
          <button
            type="submit"
            disabled={!normalizedTicker}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-red-600 bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500 sm:w-auto"
          >
            Buka Stockbit
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 min-h-10 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">
          {normalizedTicker ? (
            selectedStock ? (
              <span><strong className="text-gray-900">{selectedStock.ticker}</strong> · {selectedStock.name}</span>
            ) : (
              <span>Ticker <strong className="text-gray-900">{normalizedTicker}</strong> belum ada di snapshot lokal, tetapi tetap dapat dibuka di Stockbit.</span>
            )
          ) : (
            <span>Masukkan ticker saham Indonesia yang ingin dianalisis.</span>
          )}
        </div>
      </form>
    </div>
  );
}
