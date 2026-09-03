import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/stock-quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ownerId = "00000000-0000-4000-8000-000000000001";
function db() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null; }
function today() { return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date()); }

export async function POST(request: Request) {
  const supabase = db(); if (!supabase) return NextResponse.json({ error: "Supabase radar belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; const ticker = normalizeTicker(String(body?.ticker ?? "")); const category = body?.category === "daily" ? "daily" : body?.category === "swing" ? "swing" : null; const price = Number(body?.price); const reminderDate = String(body?.reminderDate ?? "").trim() || null;
  if (!ticker || !category || !(price > 0) || (reminderDate && !/^\d{4}-\d{2}-\d{2}$/.test(reminderDate))) return NextResponse.json({ error: "Ticker, kategori, harga, atau reminder belum valid." }, { status: 400 });
  const { data: existing } = await supabase.from("radar_entries").select("id,thesis_tags").eq("owner_id", ownerId).eq("ticker", ticker).maybeSingle();
  const plan = { watchlist_category: category, thesis_tags: Array.from(new Set([...(existing?.thesis_tags ?? []), "corporate_action"])), lifecycle: "waiting", catalyst_date: reminderDate, review_date: reminderDate, plan_source: "Private Placement Analyzer", plan_note: "Dipantau dari analisis private placement dengan thesis Potensi Corporate Action." };
  const operation = existing ? supabase.from("radar_entries").update(plan).eq("id", existing.id).eq("owner_id", ownerId) : supabase.from("radar_entries").insert({ ...plan, owner_id: ownerId, ticker, status: "watchlist", trend: "sideways", entry_price: price, entry_price_source: "market", started_at: today() });
  const { error } = await operation; if (error) return NextResponse.json({ error: "Watchlist gagal disimpan." }, { status: 500 });
  await supabase.from("accumulation_workspaces").upsert({ owner_id: ownerId, updated_at: new Date().toISOString() }, { onConflict: "owner_id" });
  if (reminderDate) { const title = "Review thesis private placement"; const reminder = { owner_id: ownerId, ticker, action_type: "Private Placement Watchlist", title, research_note: `Review watchlist ${category} dan perkembangan private placement.`, event_date: reminderDate, reminder_date: reminderDate, status: "Rencana" }; const { data: old } = await supabase.from("stock_ca_research_notes").select("id").eq("owner_id", ownerId).eq("ticker", ticker).eq("action_type", reminder.action_type).eq("title", title).maybeSingle(); if (old) await supabase.from("stock_ca_research_notes").update(reminder).eq("id", old.id); else await supabase.from("stock_ca_research_notes").insert(reminder); }
  return NextResponse.json({ success: true, ticker, category });
}
