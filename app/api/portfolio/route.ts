import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const adminOwnerId = "00000000-0000-4000-8000-000000000001";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

type PortfolioPayload = {
  holdings?: Array<Record<string, unknown>>;
  trades?: Array<Record<string, unknown>>;
  equityHistory?: Array<Record<string, unknown>>;
  deleted?: {
    holdingIds?: unknown[];
    tradeIds?: unknown[];
  };
};

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function cleanText(value: unknown, length: number) {
  return String(value ?? "").trim().slice(0, length);
}

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function nonNegativeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizePayload(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as PortfolioPayload;
  if (!Array.isArray(body.holdings) || !Array.isArray(body.trades) || !Array.isArray(body.equityHistory)) return null;
  if (body.holdings.length > 500 || body.trades.length > 5000 || body.equityHistory.length > 5000) return null;

  const holdings = body.holdings.map((row) => ({
    id: cleanText(row.id, 120),
    ticker: cleanText(row.ticker, 12).toUpperCase(),
    lots: positiveNumber(row.lots),
    average_price: positiveNumber(row.averagePrice),
    purchased_at: cleanText(row.purchasedAt, 10),
    note: cleanText(row.note, 2000),
  }));
  const trades = body.trades.map((row) => ({
    id: cleanText(row.id, 120),
    ticker: cleanText(row.ticker, 12).toUpperCase(),
    lots: positiveNumber(row.lots),
    buy_price: positiveNumber(row.buyPrice),
    sell_price: positiveNumber(row.sellPrice),
    buy_fee_percent: nonNegativeNumber(row.buyFeePercent),
    sell_fee_percent: nonNegativeNumber(row.sellFeePercent),
    sold_at: cleanText(row.soldAt, 10),
    note: cleanText(row.note, 2000),
  }));
  const equityHistory = body.equityHistory.map((row) => ({
    snapshot_date: cleanText(row.date, 10),
    equity: nonNegativeNumber(row.equity),
  }));

  const invalidHolding = holdings.some((row) => !row.id || !row.ticker || row.lots === null || row.average_price === null || !datePattern.test(row.purchased_at));
  const invalidTrade = trades.some((row) => !row.id || !row.ticker || row.lots === null || row.buy_price === null || row.sell_price === null || row.buy_fee_percent === null || row.sell_fee_percent === null || !datePattern.test(row.sold_at));
  const invalidHistory = equityHistory.some((row) => row.equity === null || !datePattern.test(row.snapshot_date));
  const deletedHoldingIds = Array.isArray(body.deleted?.holdingIds) ? body.deleted.holdingIds.map((id) => cleanText(id, 120)).filter(Boolean) : [];
  const deletedTradeIds = Array.isArray(body.deleted?.tradeIds) ? body.deleted.tradeIds.map((id) => cleanText(id, 120)).filter(Boolean) : [];
  const invalidDeletion = deletedHoldingIds.length > 100 || deletedTradeIds.length > 100;
  return invalidHolding || invalidTrade || invalidHistory || invalidDeletion
    ? null
    : { holdings, trades, equityHistory, deletedHoldingIds, deletedTradeIds };
}

export async function GET() {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase portfolio belum dikonfigurasi." }, { status: 503 });

  const [holdingsResult, tradesResult, historyResult] = await Promise.all([
    supabase.from("portfolio_holdings").select("id,ticker,lots,average_price,purchased_at,note").eq("owner_id", adminOwnerId).order("created_at", { ascending: false }),
    supabase.from("portfolio_trades").select("id,ticker,lots,buy_price,sell_price,buy_fee_percent,sell_fee_percent,sold_at,note").eq("owner_id", adminOwnerId).order("sold_at", { ascending: false }),
    supabase.from("portfolio_equity_history").select("snapshot_date,equity").eq("owner_id", adminOwnerId).order("snapshot_date", { ascending: true }),
  ]);
  const error = holdingsResult.error ?? tradesResult.error ?? historyResult.error;
  if (error) return NextResponse.json({ error: "Data portfolio Supabase gagal dimuat." }, { status: 500 });

  return NextResponse.json({
    portfolio: {
      holdings: (holdingsResult.data ?? []).map((row) => ({ id: row.id, ticker: row.ticker, lots: Number(row.lots), averagePrice: Number(row.average_price), purchasedAt: row.purchased_at, note: row.note })),
      trades: (tradesResult.data ?? []).map((row) => ({ id: row.id, ticker: row.ticker, lots: Number(row.lots), buyPrice: Number(row.buy_price), sellPrice: Number(row.sell_price), buyFeePercent: Number(row.buy_fee_percent), sellFeePercent: Number(row.sell_fee_percent), soldAt: row.sold_at, note: row.note })),
      equityHistory: (historyResult.data ?? []).map((row) => ({ date: row.snapshot_date, equity: Number(row.equity) })),
    },
  });
}

export async function PUT(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase portfolio belum dikonfigurasi." }, { status: 503 });
  const payload = normalizePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Data portfolio tidak valid." }, { status: 400 });

  const holdingRows = payload.holdings.map((row) => ({ ...row, owner_id: adminOwnerId }));
  const tradeRows = payload.trades.map((row) => ({ ...row, owner_id: adminOwnerId }));
  const historyRows = payload.equityHistory.map((row) => ({ ...row, owner_id: adminOwnerId }));
  const operations = [
    holdingRows.length ? supabase.from("portfolio_holdings").upsert(holdingRows, { onConflict: "owner_id,id" }) : Promise.resolve({ error: null }),
    tradeRows.length ? supabase.from("portfolio_trades").upsert(tradeRows, { onConflict: "owner_id,id" }) : Promise.resolve({ error: null }),
    historyRows.length ? supabase.from("portfolio_equity_history").upsert(historyRows, { onConflict: "owner_id,snapshot_date" }) : Promise.resolve({ error: null }),
    payload.deletedHoldingIds.length ? supabase.from("portfolio_holdings").delete().eq("owner_id", adminOwnerId).in("id", payload.deletedHoldingIds) : Promise.resolve({ error: null }),
    payload.deletedTradeIds.length ? supabase.from("portfolio_trades").delete().eq("owner_id", adminOwnerId).in("id", payload.deletedTradeIds) : Promise.resolve({ error: null }),
  ];
  const results = await Promise.all(operations);
  const error = results.find((result) => result.error)?.error;
  if (error) {
    console.error("Portfolio merge failed", error);
    return NextResponse.json({ error: "Portfolio gagal disinkronkan ke Supabase." }, { status: 500 });
  }
  return NextResponse.json({
    success: true,
    counts: { holdings: holdingRows.length, trades: tradeRows.length, equityHistory: historyRows.length },
  });
}
