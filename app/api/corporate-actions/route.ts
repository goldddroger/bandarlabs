import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { corporateActionNoteStatuses, type CorporateActionNotePayload } from "@/lib/corporate-action";

export const runtime = "nodejs";
const adminOwnerId = "00000000-0000-4000-8000-000000000001";

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeNote(value: unknown): CorporateActionNotePayload | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const eventId = cleanText(body.eventId, 160);
  const keyMessage = cleanText(body.keyMessage, 8_000);
  const decision = cleanText(body.decision, 8_000);
  const followUp = cleanText(body.followUp, 8_000);
  const status = cleanText(body.status, 40);
  if (!eventId || !keyMessage || !corporateActionNoteStatuses.includes(status as CorporateActionNotePayload["status"])) return null;
  return { eventId, keyMessage, decision, followUp, status: status as CorporateActionNotePayload["status"] };
}

function mapNote(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    keyMessage: String(row.key_message ?? ""),
    decision: String(row.decision ?? ""),
    followUp: String(row.follow_up ?? ""),
    status: String(row.status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function GET() {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase corporate action belum dikonfigurasi." }, { status: 503 });

  const [eventsResult, notesResult] = await Promise.all([
    supabase
      .from("corporate_action_events")
      .select("id,ticker,action_type,event_date,state,topic,announcement_price,document_label,document_number,published_at,description,impact,updated_at,stocks(name)")
      .order("event_date", { ascending: false }),
    supabase
      .from("corporate_action_notes")
      .select("id,event_id,key_message,decision,follow_up,status,created_at,updated_at")
      .eq("owner_id", adminOwnerId)
      .order("updated_at", { ascending: false }),
  ]);

  const error = eventsResult.error ?? notesResult.error;
  if (error) {
    console.error("Corporate action load failed", error);
    return NextResponse.json({ error: "Corporate action gagal dimuat. Jalankan migration corporate action terbaru." }, { status: 500 });
  }

  const events = (eventsResult.data ?? []).map((row) => {
    const relatedStock = Array.isArray(row.stocks) ? row.stocks[0] : row.stocks;
    return {
      id: row.id,
      ticker: row.ticker ?? "",
      company: relatedStock?.name ?? row.ticker ?? "Emiten",
      actionType: row.action_type,
      eventDate: row.event_date,
      state: row.state,
      topic: row.topic,
      announcementPrice: row.announcement_price === null ? null : Number(row.announcement_price),
      documentLabel: row.document_label ?? "Dokumen corporate action",
      documentNumber: row.document_number ?? "",
      publishedAt: row.published_at,
      description: row.description ?? "",
      impact: row.impact ?? "",
      updatedAt: row.updated_at,
    };
  });

  return NextResponse.json({ events, notes: (notesResult.data ?? []).map((row) => mapNote(row as Record<string, unknown>)) });
}

export async function POST(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase corporate action belum dikonfigurasi." }, { status: 503 });
  const payload = normalizeNote(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Catatan corporate action belum valid." }, { status: 400 });

  const { data: event } = await supabase.from("corporate_action_events").select("id").eq("id", payload.eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: "Agenda emiten tidak ditemukan." }, { status: 404 });

  const { data, error } = await supabase.from("corporate_action_notes").insert({
    id: crypto.randomUUID(),
    owner_id: adminOwnerId,
    event_id: payload.eventId,
    key_message: payload.keyMessage,
    decision: payload.decision,
    follow_up: payload.followUp,
    status: payload.status,
  }).select("id,event_id,key_message,decision,follow_up,status,created_at,updated_at").single();

  if (error) {
    console.error("Corporate action note insert failed", error);
    return NextResponse.json({ error: "Catatan gagal disimpan ke database." }, { status: 500 });
  }
  return NextResponse.json({ note: mapNote(data as Record<string, unknown>) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase corporate action belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as (Record<string, unknown> & { id?: string }) | null;
  const id = cleanText(body?.id, 160);
  const payload = normalizeNote(body);
  if (!id || !payload) return NextResponse.json({ error: "Perubahan catatan belum valid." }, { status: 400 });

  const { data, error } = await supabase.from("corporate_action_notes").update({
    event_id: payload.eventId,
    key_message: payload.keyMessage,
    decision: payload.decision,
    follow_up: payload.followUp,
    status: payload.status,
  }).eq("id", id).eq("owner_id", adminOwnerId).select("id,event_id,key_message,decision,follow_up,status,created_at,updated_at").maybeSingle();

  if (error || !data) return NextResponse.json({ error: "Perubahan catatan gagal disimpan." }, { status: 500 });
  return NextResponse.json({ note: mapNote(data as Record<string, unknown>) });
}

export async function DELETE(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase corporate action belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  const id = cleanText(body?.id, 160);
  if (!id) return NextResponse.json({ error: "ID catatan tidak valid." }, { status: 400 });

  const { error } = await supabase.from("corporate_action_notes").delete().eq("id", id).eq("owner_id", adminOwnerId);
  if (error) return NextResponse.json({ error: "Catatan gagal dihapus dari database." }, { status: 500 });
  return NextResponse.json({ success: true });
}
