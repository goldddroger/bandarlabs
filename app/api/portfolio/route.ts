import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const adminOwnerId = "00000000-0000-4000-8000-000000000001";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

type PortfolioPayload = {
  holdings?: Array<Record<string, unknown>>;
  trades?: Array<Record<string, unknown>>;
  equityHistory?: Array<Record<string, unknown>>;
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
  return invalidHolding || invalidTrade || invalidHistory ? null : { holdings, trades, equityHistory };
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

  const { data, error } = await supabase.rpc("replace_admin_portfolio", {
    p_holdings: payload.holdings,
    p_trades: payload.trades,
    p_equity_history: payload.equityHistory,
  });
  if (error) {
    console.error("Portfolio sync failed", error);
    return NextResponse.json({ error: "Portfolio gagal disimpan. Jalankan migration admin portfolio terbaru." }, { status: 500 });
  }
  return NextResponse.json({ success: true, counts: data });
}
