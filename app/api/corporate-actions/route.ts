import { NextResponse } from "next/server";
import { corporateActionNoteStatuses, type CorporateActionNotePayload } from "@/lib/corporate-action";
import {
  corporateActionAdminOwnerId,
  createCorporateActionAdminClient,
  loadCorporateActionWorkspace,
  mapCorporateActionNote,
} from "@/lib/corporate-action-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET() {
  try {
    return NextResponse.json(
      await loadCorporateActionWorkspace(),
      { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Corporate action gagal dimuat.";
    const status = message.includes("belum dikonfigurasi") ? 503 : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
    );
  }
}

export async function POST(request: Request) {
  const supabase = createCorporateActionAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase corporate action belum dikonfigurasi." }, { status: 503 });
  const payload = normalizeNote(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Catatan corporate action belum valid." }, { status: 400 });

  const { data: event } = await supabase.from("corporate_action_events").select("id").eq("id", payload.eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: "Agenda emiten tidak ditemukan." }, { status: 404 });

  const { data, error } = await supabase.from("corporate_action_notes").insert({
    id: crypto.randomUUID(),
    owner_id: corporateActionAdminOwnerId,
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
  return NextResponse.json({ note: mapCorporateActionNote(data as Record<string, unknown>) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = createCorporateActionAdminClient();
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
  }).eq("id", id).eq("owner_id", corporateActionAdminOwnerId).select("id,event_id,key_message,decision,follow_up,status,created_at,updated_at").maybeSingle();

  if (error || !data) return NextResponse.json({ error: "Perubahan catatan gagal disimpan." }, { status: 500 });
  return NextResponse.json({ note: mapCorporateActionNote(data as Record<string, unknown>) });
}

export async function DELETE(request: Request) {
  const supabase = createCorporateActionAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase corporate action belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as { id?: string; resource?: string } | null;
  const id = cleanText(body?.id, 160);
  if (!id) return NextResponse.json({ error: "ID corporate action tidak valid." }, { status: 400 });

  if (body?.resource === "event") {
    const { data, error } = await supabase
      .from("corporate_action_events")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) return NextResponse.json({ error: "Agenda gagal dihapus dari database." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Agenda corporate action tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true, deletedEventId: id });
  }

  const { error } = await supabase.from("corporate_action_notes").delete().eq("id", id).eq("owner_id", corporateActionAdminOwnerId);
  if (error) return NextResponse.json({ error: "Catatan gagal dihapus dari database." }, { status: 500 });
  return NextResponse.json({ success: true });
}
