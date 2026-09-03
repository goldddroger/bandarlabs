import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/stock-quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminOwnerId = "00000000-0000-4000-8000-000000000001";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

function todayInJakarta() {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date());
}

export async function POST(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase radar belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const ticker = normalizeTicker(String(body?.ticker ?? ""));
  const category = body?.category === "daily" ? "daily" : body?.category === "swing" ? "swing" : null;
  const price = Number(body?.price);
  const reminderDate = String(body?.reminderDate ?? "").trim() || null;
  if (!ticker || !category || !Number.isFinite(price) || price <= 0 || (reminderDate && !datePattern.test(reminderDate))) return NextResponse.json({ error: "Ticker, kategori, harga awal, atau reminder belum valid." }, { status: 400 });

  const startedAt = todayInJakarta();
  const { data: existing } = await supabase.from("radar_entries").select("id,thesis_tags").eq("owner_id", adminOwnerId).eq("ticker", ticker).maybeSingle();
  const sharedPlan = {
    watchlist_category: category,
    thesis_tags: Array.from(new Set([...(existing?.thesis_tags ?? []), "corporate_action"])),
    lifecycle: "waiting",
    catalyst_date: reminderDate,
    review_date: reminderDate,
    plan_source: "Right Issue Analyzer",
    plan_note: "Dipantau dari hasil analisis right issue dengan thesis Potensi Corporate Action.",
  };
  const operation = existing
    ? supabase.from("radar_entries").update(sharedPlan).eq("id", existing.id).eq("owner_id", adminOwnerId)
    : supabase.from("radar_entries").insert({
      ...sharedPlan,
      owner_id: adminOwnerId,
      ticker,
      status: "watchlist",
      trend: "sideways",
      entry_price: price,
      entry_price_source: "market",
      started_at: startedAt,
    });
  const { error } = await operation;
  if (error) return NextResponse.json({ error: "Watchlist gagal disimpan. Pastikan ticker dan migration accumulation tersedia." }, { status: 500 });
  await supabase.from("accumulation_workspaces").upsert({ owner_id: adminOwnerId, updated_at: new Date().toISOString() }, { onConflict: "owner_id" });

  if (reminderDate) {
    const title = "Review thesis right issue";
    const { data: existing } = await supabase.from("stock_ca_research_notes").select("id").eq("owner_id", adminOwnerId).eq("ticker", ticker).eq("action_type", "Right Issue Watchlist").eq("title", title).maybeSingle();
    const reminder = { owner_id: adminOwnerId, ticker, action_type: "Right Issue Watchlist", title, research_note: `Review ${category === "daily" ? "watchlist harian" : "watchlist swing"} dan perkembangan corporate action.`, event_date: reminderDate, reminder_date: reminderDate, status: "Rencana" };
    if (existing) await supabase.from("stock_ca_research_notes").update(reminder).eq("id", existing.id);
    else await supabase.from("stock_ca_research_notes").insert(reminder);
  }
  return NextResponse.json({ success: true, ticker, category, startedAt });
}
