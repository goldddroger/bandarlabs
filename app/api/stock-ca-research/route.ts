import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/stock-quotes";
import { stockCaResearchStatuses, type StockCaResearchPayload } from "@/lib/stock-ca-research";

export const runtime = "nodejs";
const adminOwnerId = "00000000-0000-4000-8000-000000000001";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizePayload(value: unknown): StockCaResearchPayload | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const ticker = normalizeTicker(cleanText(body.ticker, 12));
  const actionType = cleanText(body.actionType, 80);
  const title = cleanText(body.title, 200);
  const researchNote = cleanText(body.researchNote, 12_000);
  const eventDate = cleanText(body.eventDate, 10) || null;
  const reminderDate = cleanText(body.reminderDate, 10);
  const status = cleanText(body.status, 40);
  if (!ticker || !actionType || !title || !datePattern.test(reminderDate) || (eventDate && !datePattern.test(eventDate)) || !stockCaResearchStatuses.includes(status as StockCaResearchPayload["status"])) return null;
  return { ticker, actionType, title, researchNote, eventDate, reminderDate, status: status as StockCaResearchPayload["status"] };
}

function mapNote(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    ticker: String(row.ticker),
    actionType: String(row.action_type),
    title: String(row.title),
    researchNote: String(row.research_note ?? ""),
    eventDate: row.event_date ? String(row.event_date) : null,
    reminderDate: String(row.reminder_date),
    status: String(row.status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function GET(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase research note belum dikonfigurasi." }, { status: 503 });
  const { searchParams } = new URL(request.url);
  const ticker = normalizeTicker(searchParams.get("ticker") ?? "");
  const dueOnly = searchParams.get("due") === "1";
  let query = supabase.from("stock_ca_research_notes").select("*").eq("owner_id", adminOwnerId);
  if (ticker) query = query.eq("ticker", ticker);
  if (dueOnly) query = query.neq("status", "Selesai").lte("reminder_date", new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }));
  const { data, error } = await query.order("reminder_date", { ascending: true }).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Research note gagal dimuat. Jalankan migration stock CA research terbaru." }, { status: 500 });
  return NextResponse.json({ notes: (data ?? []).map((row) => mapNote(row as Record<string, unknown>)) });
}

export async function POST(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase research note belum dikonfigurasi." }, { status: 503 });
  const payload = normalizePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Isi research note belum valid." }, { status: 400 });
  const { data, error } = await supabase.from("stock_ca_research_notes").insert({ owner_id: adminOwnerId, ticker: payload.ticker, action_type: payload.actionType, title: payload.title, research_note: payload.researchNote, event_date: payload.eventDate, reminder_date: payload.reminderDate, status: payload.status }).select("*").single();
  if (error) return NextResponse.json({ error: "Research note gagal disimpan." }, { status: 500 });
  return NextResponse.json({ note: mapNote(data as Record<string, unknown>) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase research note belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as (Record<string, unknown> & { id?: string }) | null;
  const id = cleanText(body?.id, 80);
  const payload = normalizePayload(body);
  if (!id || !payload) return NextResponse.json({ error: "Perubahan research note belum valid." }, { status: 400 });
  const { data, error } = await supabase.from("stock_ca_research_notes").update({ action_type: payload.actionType, title: payload.title, research_note: payload.researchNote, event_date: payload.eventDate, reminder_date: payload.reminderDate, status: payload.status }).eq("id", id).eq("owner_id", adminOwnerId).eq("ticker", payload.ticker).select("*").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Research note gagal diperbarui." }, { status: 500 });
  return NextResponse.json({ note: mapNote(data as Record<string, unknown>) });
}

export async function DELETE(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase research note belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  const id = cleanText(body?.id, 80);
  if (!id) return NextResponse.json({ error: "ID research note tidak valid." }, { status: 400 });
  const { error } = await supabase.from("stock_ca_research_notes").delete().eq("id", id).eq("owner_id", adminOwnerId);
  if (error) return NextResponse.json({ error: "Research note gagal dihapus." }, { status: 500 });
  return NextResponse.json({ success: true });
}
