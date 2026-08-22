import { getStockQuote, normalizeTicker, StockQuote } from "@/lib/stock-quotes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickers = Array.from(
    new Set(
      (searchParams.get("tickers") ?? "")
        .split(",")
        .map(normalizeTicker)
        .filter(Boolean)
        .slice(0, 80),
    ),
  );

  if (tickers.length === 0) {
    return Response.json({ quotes: {} });
  }

  const quoteEntries = await Promise.all(
    tickers.map(async (ticker) => {
      const quote = await getStockQuote(ticker);
      return [ticker, quote] as const;
    }),
  );

  return Response.json({
    quotes: Object.fromEntries(quoteEntries.filter((entry): entry is readonly [string, StockQuote] => Boolean(entry[1]))),
  });
}
