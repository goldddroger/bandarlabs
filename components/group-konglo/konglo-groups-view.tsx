"use client";

import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Edit3, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type KongloGroupViewRow = {
  name: string;
  description: string;
  tickers: Array<{
    ticker: string;
    name: string;
  }>;
  marketCap: string;
};

type StockLookup = Record<string, { name: string; marketCap: number }>;
type FilterMode = "all" | "with-ticker" | "notes";
type SavedGroup = { name: string; description: string; tickers: string[] };
type EditableGroup = SavedGroup & { marketCap: string; tickerRows: KongloGroupViewRow["tickers"] };

const storageKey = "bandarlab-konglo-groups";
const changeEventName = "bandarlab-konglo-groups-change";

function subscribeGroups(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(changeEventName, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(changeEventName, onStoreChange);
  };
}

function getSnapshot() {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(storageKey) ?? "[]";
}

function parseSavedGroups(snapshot: string) {
  try {
    const parsed = JSON.parse(snapshot) as SavedGroup[];
    return Array.isArray(parsed)
      ? parsed.filter((group) => group.name && Array.isArray(group.tickers))
      : [];
  } catch {
    return [];
  }
}

function normalizeTickers(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((ticker) => ticker.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .filter(Boolean),
    ),
  );
}

function formatCompactCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  if (value >= 1_000_000_000_000) return `Rp ${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(2)}M`;
  return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
}

function saveGroups(groups: SavedGroup[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(groups));
  window.dispatchEvent(new Event(changeEventName));
}

function matchesQuery(group: EditableGroup, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return (
    group.name.toLowerCase().includes(normalizedQuery) ||
    group.description.toLowerCase().includes(normalizedQuery) ||
    group.tickerRows.some((stock) => `${stock.ticker} ${stock.name}`.toLowerCase().includes(normalizedQuery))
  );
}

function toSavedGroup(group: KongloGroupViewRow): SavedGroup {
  return {
    name: group.name,
    description: group.description,
    tickers: group.tickers.map((stock) => stock.ticker),
  };
}

function hydrateGroup(group: SavedGroup, stockLookup: StockLookup): EditableGroup {
  const tickerRows = group.tickers.map((ticker) => ({
    ticker,
    name: stockLookup[ticker]?.name ?? "Belum ada data screener",
  }));
  const marketCap = group.tickers.reduce((total, ticker) => total + (stockLookup[ticker]?.marketCap ?? 0), 0);

  return {
    ...group,
    tickerRows,
    marketCap: formatCompactCurrency(marketCap || null),
  };
}

export function KongloGroupsView({ groups, stockLookup }: { groups: KongloGroupViewRow[]; stockLookup: StockLookup }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<FilterMode>("all");
  const [editingGroup, setEditingGroup] = useState<SavedGroup | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const snapshot = useSyncExternalStore(subscribeGroups, getSnapshot, () => "[]");
  const savedGroups = useMemo(() => parseSavedGroups(snapshot), [snapshot]);
  const editableGroups = useMemo(() => {
    const savedByName = new Map(savedGroups.map((group) => [group.name.toLowerCase(), group]));
    const baseRows = groups.map((group) => {
      const saved = savedByName.get(group.name.toLowerCase());
      return hydrateGroup(saved ?? toSavedGroup(group), stockLookup);
    });
    const customRows = savedGroups
      .filter((saved) => !groups.some((group) => group.name.toLowerCase() === saved.name.toLowerCase()))
      .map((group) => hydrateGroup(group, stockLookup));

    return [...baseRows, ...customRows];
  }, [groups, savedGroups, stockLookup]);

  const filteredGroups = useMemo(
    () =>
      editableGroups
        .filter((group) => {
          if (mode === "with-ticker") return group.tickers.length > 0;
          if (mode === "notes") return group.tickers.length === 0;
          return true;
        })
        .filter((group) => matchesQuery(group, query)),
    [editableGroups, mode, query],
  );

  function openAddModal() {
    setEditingGroup({ name: "", description: "", tickers: [] });
    setModalOpen(true);
  }

  function openEditModal(group: EditableGroup) {
    setEditingGroup({ name: group.name, description: group.description, tickers: group.tickers });
    setModalOpen(true);
  }

  function handleSave(group: SavedGroup) {
    const nextGroup = {
      ...group,
      name: group.name.trim(),
      description: group.description.trim(),
      tickers: group.tickers,
    };

    if (!nextGroup.name) {
      toast.error("Nama group wajib diisi");
      return;
    }

    const withoutSameGroup = savedGroups.filter((item) => item.name.toLowerCase() !== nextGroup.name.toLowerCase());
    saveGroups([...withoutSameGroup, nextGroup]);
    setModalOpen(false);
    setEditingGroup(null);
    toast.success("Group konglo disimpan");
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-20 z-10 rounded-lg border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto] xl:items-center">
          <label className="relative block" htmlFor="konglo-search">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              id="konglo-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari group atau ticker..."
              className="h-10 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 transition duration-150 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </label>
          <div className="grid grid-cols-3 rounded-md border border-gray-200 bg-gray-50 p-1 text-sm font-semibold">
            {[
              ["all", "Semua"],
              ["with-ticker", "Ticker"],
              ["notes", "Catatan"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value as FilterMode)}
                className={cn(
                  "h-8 rounded px-3 transition duration-150",
                  mode === value ? "bg-white text-red-700 shadow-sm" : "text-gray-600 hover:text-gray-950",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-600 bg-red-600 px-4 text-sm font-semibold text-white transition duration-150 hover:bg-red-700"
          >
            <Plus className="size-4" />
            Tambah Group
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Menampilkan {filteredGroups.length} dari {editableGroups.length} group.
        </p>
      </div>

      <div className="grid gap-3 md:hidden">
        {filteredGroups.map((group) => (
          <article key={group.name} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 text-sm font-semibold text-gray-950">{group.name}</h2>
              <button
                type="button"
                onClick={() => openEditModal(group)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600"
                aria-label={`Edit ${group.name}`}
              >
                <Edit3 className="size-4" />
              </button>
            </div>
            <TickerCloud tickers={group.tickerRows} />
          </article>
        ))}
      </div>

      <div className="bandarlab-scrollbar hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm md:block">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="w-[260px] px-4 py-3 font-semibold">Group</th>
              <th className="px-4 py-3 font-semibold">Ticker Radar</th>
              <th className="w-28 px-4 py-3 font-semibold">Jumlah</th>
              <th className="w-40 px-4 py-3 font-semibold">Market Cap</th>
              <th className="w-20 px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map((group) => (
              <tr key={group.name} className="border-t border-gray-100 align-top transition duration-150 hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-gray-950">{group.name}</p>
                </td>
                <td className="px-4 py-2.5">
                  <TickerCloud tickers={group.tickerRows} />
                </td>
                <td className="px-4 py-2.5 font-semibold text-gray-950">{group.tickers.length}</td>
                <td className="px-4 py-2.5 font-semibold text-gray-950">{group.marketCap}</td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(group)}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition duration-150 hover:bg-gray-50 hover:text-red-700"
                    aria-label={`Edit ${group.name}`}
                  >
                    <Edit3 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          Tidak ada group yang cocok dengan filter ini.
        </div>
      ) : null}

      {modalOpen && editingGroup ? (
        <GroupModal
          group={editingGroup}
          onClose={() => {
            setModalOpen(false);
            setEditingGroup(null);
          }}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}

function GroupModal({ group, onClose, onSave }: { group: SavedGroup; onClose: () => void; onSave: (group: SavedGroup) => void }) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [tickerText, setTickerText] = useState(group.tickers.join(", "));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      name,
      description,
      tickers: normalizeTickers(tickerText),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-lg border border-gray-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-950">{group.name ? "Edit Group" : "Tambah Group"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Tutup modal"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Nama group
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Konglo Baru"
              className="h-10 rounded-md border border-gray-200 px-3 text-sm text-gray-950 transition duration-150 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Ticker
            <textarea
              value={tickerText}
              onChange={(event) => setTickerText(event.target.value)}
              placeholder="Contoh: BRPT, TPIA, BREN"
              rows={4}
              className="resize-none rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-950 transition duration-150 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Catatan internal
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Opsional, tidak ditampilkan di tabel utama."
              rows={3}
              className="resize-none rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-950 transition duration-150 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </label>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition duration-150 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md border border-red-600 bg-red-600 px-4 text-sm font-semibold text-white transition duration-150 hover:bg-red-700"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}

function TickerCloud({ tickers }: { tickers: KongloGroupViewRow["tickers"] }) {
  if (tickers.length === 0) {
    return <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">Belum ada ticker core</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tickers.map((stock) => (
        <Link
          key={stock.ticker}
          href={`/stocks/${stock.ticker}`}
          title={stock.name}
          className="inline-flex h-7 items-center rounded-full border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-800 transition duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          {stock.ticker}
        </Link>
      ))}
    </div>
  );
}
