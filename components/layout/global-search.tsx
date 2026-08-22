"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { idxListedStocks } from "@/lib/idx-listed-stocks";
import { cn } from "@/lib/utils";

const searchStocks = idxListedStocks.map((stock) => ({
  ticker: stock.ticker,
  name: stock.name,
  board: stock.board,
}));

function getMatches(query: string) {
  const normalizedQuery = query.trim().toUpperCase();
  if (normalizedQuery.length < 1) return [];

  return searchStocks
    .filter((stock) => stock.ticker.includes(normalizedQuery) || stock.name.toUpperCase().includes(normalizedQuery))
    .sort((first, second) => {
      const firstExact = first.ticker === normalizedQuery ? -1 : 0;
      const secondExact = second.ticker === normalizedQuery ? -1 : 0;
      const firstStarts = first.ticker.startsWith(normalizedQuery) ? -1 : 0;
      const secondStarts = second.ticker.startsWith(normalizedQuery) ? -1 : 0;
      return firstExact - secondExact || firstStarts - secondStarts || first.ticker.localeCompare(second.ticker);
    })
    .slice(0, 8);
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = getMatches(query);
  const showDropdown = open && query.trim().length > 0;

  function goToTicker(ticker: string) {
    setQuery("");
    setOpen(false);
    router.push(`/stocks/${ticker}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (matches[0]) {
      goToTicker(matches[0].ticker);
      return;
    }

    const normalizedTicker = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (normalizedTicker) {
      goToTicker(normalizedTicker);
    }
  }

  return (
    <form className="relative w-full max-w-xl" role="search" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="global-search">
        Cari saham
      </label>
      <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
      <input
        id="global-search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder="Cari ticker atau nama emiten..."
        className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-20 text-sm text-gray-900 transition duration-150 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
        autoComplete="off"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-gray-200 px-2 py-1 text-xs text-gray-500">
        Enter
      </kbd>

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          {matches.length > 0 ? (
            <div className="max-h-80 overflow-y-auto py-1">
              {matches.map((stock, index) => (
                <Link
                  key={stock.ticker}
                  href={`/stocks/${stock.ticker}`}
                  onClick={() => {
                    setQuery("");
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition duration-150 hover:bg-red-50",
                    index === 0 && "bg-gray-50",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-950">{stock.ticker}</span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">{stock.name}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                    {stock.board}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-gray-600">
              Ticker belum ada di daftar IDX. Tekan Enter untuk membuka pencarian ticker ini.
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}
