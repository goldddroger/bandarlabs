import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/stock-quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ownerId = "00000000-0000-4000-8000-000000000001";
const types = new Set(["rups_approval", "execution_deadline", "funding", "distribution", "listing", "result_announcement"]);
function db() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null; }
function clean(value: unknown, max: number) { return String(value ?? "").trim().slice(0, max); }
function before(date: string, days: number) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() - days); return value.toISOString().slice(0, 10); }

export async function POST(request: Request) {
  const supabase = db(); if (!supabase) return NextResponse.json({ error: "Supabase reminder belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; const ticker = normalizeTicker(clean(body?.ticker, 12)); const issuer = clean(body?.issuer, 300); const leadDays = Math.max(0, Math.min(30, Math.trunc(Number(body?.leadDays) || 0))); const raw = Array.isArray(body?.events) ? body.events.slice(0, 8) : [];
  const events = raw.map((item) => { const event = item as Record<string, unknown>; return { type: clean(event.type, 40), label: clean(event.label, 160), date: clean(event.date, 10), sourceFile: clean(event.sourceFile, 180), pageNumber: Math.max(1, Math.trunc(Number(event.pageNumber) || 1)) }; });
  if (!ticker || !events.length || events.some((event) => !types.has(event.type) || !event.label || !/^\d{4}-\d{2}-\d{2}$/.test(event.date))) return NextResponse.json({ error: "Timeline Private Placement belum valid." }, { status: 400 });
  const { data: existing, error } = await supabase.from("stock_ca_research_notes").select("id,title,event_date,reminder_date").eq("owner_id", ownerId).eq("ticker", ticker).eq("action_type", "Private Placement Timeline"); if (error) return NextResponse.json({ error: "Reminder lama gagal diperiksa." }, { status: 500 });
  const byKey = new Map((existing ?? []).map((row) => [`${row.title}|${row.event_date}`, row])); let created = 0; let updated = 0;
  for (const event of events) { const old = byKey.get(`${event.label}|${event.date}`); const reminderDate = before(event.date, leadDays); if (old) { if (old.reminder_date !== reminderDate) { await supabase.from("stock_ca_research_notes").update({ reminder_date: reminderDate }).eq("id", old.id); updated += 1; } } else { const result = await supabase.from("stock_ca_research_notes").insert({ owner_id: ownerId, ticker, action_type: "Private Placement Timeline", title: event.label, research_note: `${issuer ? `Emiten: ${issuer}. ` : ""}Diekstrak dari ${event.sourceFile}, halaman ${event.pageNumber}.`, event_date: event.date, reminder_date: reminderDate, status: "Rencana" }); if (!result.error) created += 1; } }
  return NextResponse.json({ success: true, created, updated, skipped: events.length - created - updated });
}
