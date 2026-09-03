import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/stock-quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminOwnerId = "00000000-0000-4000-8000-000000000001";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const allowedTypes = new Set(["cum_right", "ex_right", "recording_date", "trading_period", "exercise_deadline", "share_distribution"]);

type ReminderEvent = {
  type?: unknown;
  label?: unknown;
  date?: unknown;
  endDate?: unknown;
  sourceFile?: unknown;
  pageNumber?: unknown;
};

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function reminderDate(eventDate: string, leadDays: number) {
  const date = new Date(`${eventDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - leadDays);
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase reminder belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as { ticker?: unknown; issuer?: unknown; leadDays?: unknown; events?: ReminderEvent[] } | null;
  const ticker = normalizeTicker(cleanText(body?.ticker, 12));
  const issuer = cleanText(body?.issuer, 300);
  const leadDays = Math.max(0, Math.min(14, Math.trunc(Number(body?.leadDays) || 0)));
  const events = Array.isArray(body?.events) ? body.events.slice(0, 6).map((event) => ({
    type: cleanText(event.type, 40),
    label: cleanText(event.label, 160),
    date: cleanText(event.date, 10),
    endDate: cleanText(event.endDate, 10) || null,
    sourceFile: cleanText(event.sourceFile, 180),
    pageNumber: Math.max(1, Math.trunc(Number(event.pageNumber) || 1)),
  })) : [];
  if (!ticker || events.length === 0 || events.some((event) => !allowedTypes.has(event.type) || !event.label || !datePattern.test(event.date) || (event.endDate && !datePattern.test(event.endDate)))) return NextResponse.json({ error: "Timeline right issue belum valid." }, { status: 400 });

  const { data: existing, error: existingError } = await supabase
    .from("stock_ca_research_notes")
    .select("id,title,event_date,reminder_date")
    .eq("owner_id", adminOwnerId)
    .eq("ticker", ticker)
    .eq("action_type", "Right Issue Timeline");
  if (existingError) return NextResponse.json({ error: "Reminder lama gagal diperiksa." }, { status: 500 });

  const existingByKey = new Map((existing ?? []).map((row) => [`${row.title}|${row.event_date}`, row]));
  const inserts = events
    .filter((event) => !existingByKey.has(`${event.label}|${event.date}`))
    .map((event) => ({
      owner_id: adminOwnerId,
      ticker,
      action_type: "Right Issue Timeline",
      title: event.label,
      research_note: [
        issuer ? `Emiten: ${issuer}.` : "",
        event.endDate ? `Periode sampai ${event.endDate}.` : "",
        `Diekstrak otomatis dari ${event.sourceFile}, halaman ${event.pageNumber}.`,
      ].filter(Boolean).join(" "),
      event_date: event.date,
      reminder_date: reminderDate(event.date, leadDays),
      status: "Rencana",
    }));

  const updates = events.flatMap((event) => {
    const row = existingByKey.get(`${event.label}|${event.date}`);
    const nextReminderDate = reminderDate(event.date, leadDays);
    if (!row || row.reminder_date === nextReminderDate) return [];
    return [{ id: row.id as string, reminderDate: nextReminderDate }];
  });

  if (inserts.length > 0) {
    const { error } = await supabase.from("stock_ca_research_notes").insert(inserts);
    if (error) {
      console.error("Right issue reminder insert failed", error);
      return NextResponse.json({ error: "Reminder gagal disimpan. Pastikan ticker tersedia di database saham." }, { status: 500 });
    }
  }

  if (updates.length > 0) {
    const results = await Promise.all(updates.map((update) => supabase
      .from("stock_ca_research_notes")
      .update({ reminder_date: update.reminderDate })
      .eq("id", update.id)
      .eq("owner_id", adminOwnerId)));
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      console.error("Right issue reminder update failed", failed.error);
      return NextResponse.json({ error: "Jarak pengingat gagal diperbarui." }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    created: inserts.length,
    updated: updates.length,
    skipped: events.length - inserts.length - updates.length,
  });
}
