import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminOwnerId = "00000000-0000-4000-8000-000000000001";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthNumbers: Record<string, string> = {
  jan: "01", januari: "01", feb: "02", februari: "02", mar: "03", maret: "03",
  apr: "04", april: "04", mei: "05", jun: "06", juni: "06", jul: "07", juli: "07",
  agu: "08", agustus: "08", sep: "09", september: "09", okt: "10", oktober: "10",
  nov: "11", november: "11", des: "12", desember: "12",
};

type AccumulationPayload = {
  entries?: Array<Record<string, unknown>>;
  recommendations?: Array<Record<string, unknown>>;
};

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function nonNegativeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function optionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return normalizeDate(value);
}

function normalizeDate(value: unknown) {
  const text = cleanText(value, 40).toLowerCase().replace(/[.,]/g, "");
  if (datePattern.test(text)) return text;
  const match = text.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  const month = match ? monthNumbers[match[2]] : null;
  return match && month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : null;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

function todayInJakarta() {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date());
}

function normalizePayload(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as AccumulationPayload;
  if (!Array.isArray(body.entries) || !Array.isArray(body.recommendations)) return null;
  if (body.entries.length > 2_000 || body.recommendations.length > 2_000) return null;

  const fallbackDate = todayInJakarta();
  const entries = body.entries.map((row) => ({
    ticker: cleanText(row.ticker, 12).toUpperCase(),
    status: cleanText(row.signalType, 20),
    trend: cleanText(row.trend, 20).toLowerCase() || null,
    entry_price: nonNegativeNumber(row.entryPrice),
    entry_price_source: cleanText(row.entryPriceSource, 20) || null,
    started_at: normalizeDate(row.addedAt) ?? fallbackDate,
    watchlist_category: cleanText(row.watchlistCategory, 20) || "personal",
    thesis_tags: Array.isArray(row.thesisTags)
      ? row.thesisTags.map((tag) => cleanText(tag, 40)).filter(Boolean).slice(0, 12)
      : [],
    lifecycle: cleanText(row.lifecycle, 20) || "waiting",
    breakout_price: nonNegativeNumber(row.breakoutPrice),
    support_low: nonNegativeNumber(row.supportLow),
    support_high: nonNegativeNumber(row.supportHigh),
    ema_timeframe: cleanText(row.emaTimeframe, 20) || null,
    catalyst_date: optionalDate(row.catalystDate),
    review_date: optionalDate(row.reviewDate),
    plan_source: cleanText(row.source, 300) || null,
    plan_note: cleanText(row.note, 8_000) || null,
  }));
  const recommendations = body.recommendations.map((row) => ({
    id: cleanText(row.id, 160),
    ticker: cleanText(row.stock, 12).toUpperCase(),
    source: cleanText(row.source, 200),
    status: cleanText(row.status, 20),
    trend: cleanText(row.trend, 20),
    monitored_at: normalizeDate(row.monitoredAt) ?? fallbackDate,
    entry_price: nonNegativeNumber(row.entryPrice),
    entry_price_source: cleanText(row.entryPriceSource, 20) || null,
    note: cleanText(row.note, 8_000),
  }));

  const validStatuses = new Set(["accumulation", "watchlist", "hold"]);
  const validRadarTrends = new Set(["uptrend", "sideways", "downtrend"]);
  const validRecommendationTrends = new Set(["Uptrend", "Sideways", "Downtrend"]);
  const validCategories = new Set(["personal", "daily", "swing"]);
  const validLifecycles = new Set(["waiting", "triggered", "invalid", "completed"]);
  const validTheses = new Set(["breakout", "support", "ema10_bounce", "financial_report", "acquisition", "audit_catalyst", "corporate_action"]);
  const invalidEntry = entries.some((row) => !row.ticker || !validStatuses.has(row.status) || (row.trend && !validRadarTrends.has(row.trend)) || row.entry_price === null || !row.started_at || !validCategories.has(row.watchlist_category) || !validLifecycles.has(row.lifecycle) || row.thesis_tags.some((tag) => !validTheses.has(tag)) || (row.ema_timeframe && row.ema_timeframe !== "daily" && row.ema_timeframe !== "weekly"));
  const invalidRecommendation = recommendations.some((row) => !row.id || !row.ticker || !row.source || !validStatuses.has(row.status) || !validRecommendationTrends.has(row.trend) || row.entry_price === null || !row.monitored_at);
  if (invalidEntry || invalidRecommendation) return null;
  return {
    entries: Array.from(new Map(entries.map((row) => [row.ticker, row])).values()),
    recommendations: Array.from(new Map(recommendations.map((row) => [row.id, row])).values()),
  };
}

export async function GET() {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase accumulation belum dikonfigurasi." }, { status: 503 });

  const [entriesResult, recommendationsResult, workspaceResult] = await Promise.all([
    supabase.from("radar_entries").select("ticker,status,trend,entry_price,entry_price_source,started_at,watchlist_category,thesis_tags,lifecycle,breakout_price,support_low,support_high,ema_timeframe,catalyst_date,review_date,plan_source,plan_note").eq("owner_id", adminOwnerId).order("created_at", { ascending: true }),
    supabase.from("external_recommendations").select("id,ticker,source,status,trend,monitored_at,entry_price,entry_price_source,note").eq("owner_id", adminOwnerId).order("created_at", { ascending: false }),
    supabase.from("accumulation_workspaces").select("updated_at").eq("owner_id", adminOwnerId).maybeSingle(),
  ]);
  const error = entriesResult.error ?? recommendationsResult.error ?? workspaceResult.error;
  if (error) {
    console.error("Accumulation workspace load failed", error);
    return NextResponse.json({ error: "Accumulation gagal dimuat. Jalankan migration accumulation terbaru." }, { status: 500 });
  }

  return NextResponse.json({
    initialized: Boolean(workspaceResult.data),
    updatedAt: workspaceResult.data?.updated_at ?? null,
    entries: (entriesResult.data ?? []).map((row) => ({
      ticker: row.ticker,
      signalType: row.status,
      addedAt: displayDate(row.started_at),
      entryPrice: Number(row.entry_price),
      entryPriceSource: row.entry_price_source ?? undefined,
      watchlistCategory: row.watchlist_category ?? "personal",
      thesisTags: row.thesis_tags ?? [],
      lifecycle: row.lifecycle ?? "waiting",
      breakoutPrice: row.breakout_price === null ? undefined : Number(row.breakout_price),
      supportLow: row.support_low === null ? undefined : Number(row.support_low),
      supportHigh: row.support_high === null ? undefined : Number(row.support_high),
      emaTimeframe: row.ema_timeframe ?? undefined,
      catalystDate: row.catalyst_date ?? undefined,
      reviewDate: row.review_date ?? undefined,
      source: row.plan_source ?? undefined,
      note: row.plan_note ?? undefined,
    })),
    recommendations: (recommendationsResult.data ?? []).map((row) => ({
      id: row.id,
      stock: row.ticker,
      source: row.source,
      status: row.status,
      trend: row.trend,
      monitoredAt: displayDate(row.monitored_at),
      entryPrice: Number(row.entry_price),
      entryPriceSource: row.entry_price_source ?? undefined,
      note: row.note ?? "",
    })),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } });
}

export async function PUT(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase accumulation belum dikonfigurasi." }, { status: 503 });
  const payload = normalizePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Data accumulation tidak valid." }, { status: 400 });

  const { data, error } = await supabase.rpc("replace_admin_accumulation", {
    p_entries: payload.entries,
    p_recommendations: payload.recommendations,
  });
  if (error) {
    console.error("Accumulation workspace sync failed", error);
    return NextResponse.json({ error: "Accumulation gagal disimpan. Jalankan migration accumulation terbaru." }, { status: 500 });
  }
  return NextResponse.json({ success: true, counts: data });
}
