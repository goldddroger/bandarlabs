import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { CorporateActionEvent, CorporateActionNote } from "@/lib/corporate-action";

export const corporateActionAdminOwnerId = "00000000-0000-4000-8000-000000000001";

export function createCorporateActionAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function mapCorporateActionNote(row: Record<string, unknown>): CorporateActionNote {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    keyMessage: String(row.key_message ?? ""),
    decision: String(row.decision ?? ""),
    followUp: String(row.follow_up ?? ""),
    status: String(row.status) as CorporateActionNote["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function loadCorporateActionWorkspace(): Promise<{
  events: CorporateActionEvent[];
  notes: CorporateActionNote[];
}> {
  const supabase = createCorporateActionAdminClient();
  if (!supabase) throw new Error("Supabase corporate action belum dikonfigurasi.");

  const [eventsResult, notesResult] = await Promise.all([
    supabase
      .from("corporate_action_events")
      .select("id,ticker,action_type,event_date,state,topic,announcement_price,document_label,document_number,published_at,description,impact,updated_at,stocks(name)")
      .order("event_date", { ascending: false }),
    supabase
      .from("corporate_action_notes")
      .select("id,event_id,key_message,decision,follow_up,status,created_at,updated_at")
      .eq("owner_id", corporateActionAdminOwnerId)
      .order("updated_at", { ascending: false }),
  ]);

  const error = eventsResult.error ?? notesResult.error;
  if (error) {
    console.error("Corporate action load failed", error);
    throw new Error("Corporate action gagal dimuat. Jalankan migration corporate action terbaru.");
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
    } as CorporateActionEvent;
  });

  return {
    events,
    notes: (notesResult.data ?? []).map((row) => mapCorporateActionNote(row as Record<string, unknown>)),
  };
}
