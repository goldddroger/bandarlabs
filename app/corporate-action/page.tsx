import { CorporateActionJournal } from "@/components/corporate-action/corporate-action-journal";
import type { CorporateActionQuoteMap } from "@/lib/corporate-action";
import { loadCorporateActionWorkspace } from "@/lib/corporate-action-server";
import { getStockQuote } from "@/lib/stock-quotes";

export const dynamic = "force-dynamic";

async function loadInitialQuotes(tickers: string[]): Promise<CorporateActionQuoteMap> {
  const entries = await Promise.all(
    Array.from(new Set(tickers.filter(Boolean))).slice(0, 80).map(async (ticker) => {
      const quote = await getStockQuote(ticker);
      return [ticker, quote] as const;
    }),
  );
  return entries.reduce<CorporateActionQuoteMap>((quotes, [ticker, quote]) => {
    if (quote) quotes[ticker] = quote;
    return quotes;
  }, {});
}

async function loadInitialWorkspace() {
  try {
    const workspace = await loadCorporateActionWorkspace();
    const quotes = await loadInitialQuotes(workspace.events.map((event) => event.ticker));
    return { ...workspace, quotes, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Corporate action gagal dimuat.";
    return { events: [], notes: [], quotes: {}, error: message };
  }
}

export default async function CorporateActionPage() {
  const workspace = await loadInitialWorkspace();
  return <CorporateActionJournal initialEvents={workspace.events} initialNotes={workspace.notes} initialQuotes={workspace.quotes} initialError={workspace.error} />;
}
