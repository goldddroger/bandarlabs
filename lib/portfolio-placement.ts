import type { PortfolioHolding } from "./portfolio-store";

export function normalizeSecurity(value?: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
}

export function samePlacement(first: Pick<PortfolioHolding, "ticker" | "security">, second: Pick<PortfolioHolding, "ticker" | "security">) {
  return first.ticker === second.ticker
    && normalizeSecurity(first.security).toLowerCase() === normalizeSecurity(second.security).toLowerCase();
}

export function summarizePlacements(holdings: PortfolioHolding[], prices: Record<string, number> = {}) {
  const groups = new Map<string, { security: string; lots: number; capital: number; marketValue: number; tickers: Set<string> }>();
  for (const holding of holdings) {
    const security = normalizeSecurity(holding.security);
    const key = security.toLowerCase();
    const group = groups.get(key) ?? { security: security || "Belum diisi", lots: 0, capital: 0, marketValue: 0, tickers: new Set<string>() };
    const price = prices[holding.ticker];
    group.lots += holding.lots;
    group.capital += holding.lots * 100 * holding.averagePrice;
    group.marketValue += holding.lots * 100 * (Number.isFinite(price) && price > 0 ? price : holding.averagePrice);
    group.tickers.add(holding.ticker);
    groups.set(key, group);
  }
  return Array.from(groups.values()).map(({ tickers, ...group }) => ({ ...group, tickerCount: tickers.size }));
}

export type HoldingPlacementDraft = Omit<PortfolioHolding, "id"> & { id?: string };

// Validate the complete form before changing any positions. In edit mode the
// original ticker's placements are replaced, so splitting a legacy holding
// does not add its old lots a second time.
export function applyHoldingPlacements(
  holdings: PortfolioHolding[],
  drafts: HoldingPlacementDraft[],
  editingIds: string[] = [],
  createId: () => string = () => `holding-${crypto.randomUUID()}`,
) {
  if (!drafts.length) throw new Error("Tambahkan minimal satu sekuritas.");
  const normalized = drafts.map((draft) => ({ ...draft, ticker: draft.ticker.trim().toUpperCase(), security: normalizeSecurity(draft.security) }));
  const keys = new Set<string>();
  for (const draft of normalized) {
    if (!/^[A-Z0-9]{1,8}$/.test(draft.ticker) || draft.ticker !== normalized[0].ticker) throw new Error("Periksa kembali kode ticker.");
    if (!Number.isSafeInteger(draft.lots) || draft.lots <= 0) throw new Error("Jumlah lot setiap sekuritas harus bilangan bulat positif.");
    if (!Number.isFinite(draft.averagePrice) || draft.averagePrice <= 0) throw new Error("Harga rata-rata setiap sekuritas wajib lebih dari nol.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.purchasedAt)) throw new Error("Tanggal mulai hold wajib diisi.");
    const key = draft.security.toLowerCase();
    if (keys.has(key)) throw new Error("Sekuritas yang sama cukup diisi dalam satu baris.");
    keys.add(key);
  }
  const editing = new Set(editingIds);
  const next = holdings.filter((holding) => !editing.has(holding.id));
  for (const draft of normalized) {
    const index = next.findIndex((holding) => samePlacement(holding, draft));
    if (index >= 0) {
      const existing = next[index];
      const lots = existing.lots + draft.lots;
      const averagePrice = (existing.lots * existing.averagePrice + draft.lots * draft.averagePrice) / lots;
      next[index] = { ...existing, lots, averagePrice, note: draft.note || existing.note };
    } else {
      next.push({ ...draft, id: draft.id && editing.has(draft.id) ? draft.id : createId() });
    }
  }
  if (next.length > 500) throw new Error("Maksimal 500 posisi aktif dapat disimpan.");
  const remainingIds = new Set(next.map((holding) => holding.id));
  const deletedHoldingIds = editingIds.filter((id) => !remainingIds.has(id));
  return { holdings: next, deletedHoldingIds };
}
