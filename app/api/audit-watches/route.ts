import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/stock-quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminOwnerId = "00000000-0000-4000-8000-000000000001";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const statuses = new Set(["waiting", "released", "cancelled"]);

type AuditWatchPayload = {
  ticker?: unknown;
  issuer?: unknown;
  announcementDate?: unknown;
  periodEnd?: unknown;
  reportLabel?: unknown;
  auditor?: unknown;
  watchStart?: unknown;
  watchEnd?: unknown;
  statedDueDate?: unknown;
  catalysts?: unknown;
  sourceFile?: unknown;
  sourcePage?: unknown;
};

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizePayload(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as AuditWatchPayload;
  const ticker = normalizeTicker(cleanText(body.ticker, 12));
  const announcementDate = cleanText(body.announcementDate, 10);
  const periodEnd = cleanText(body.periodEnd, 10);
  const watchStart = cleanText(body.watchStart, 10);
  const watchEnd = cleanText(body.watchEnd, 10);
  const statedDueDate = cleanText(body.statedDueDate, 10) || null;
  const reportLabel = cleanText(body.reportLabel, 240);
  const catalysts = Array.isArray(body.catalysts) ? body.catalysts.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 12) : [];
  if (!ticker || !reportLabel || ![announcementDate, periodEnd, watchStart, watchEnd].every((date) => datePattern.test(date)) || (statedDueDate && !datePattern.test(statedDueDate))) return null;
  return {
    ticker,
    issuer_name: cleanText(body.issuer, 300),
    announcement_date: announcementDate,
    period_end: periodEnd,
    report_label: reportLabel,
    auditor_name: cleanText(body.auditor, 300),
    watch_start: watchStart,
    watch_end: watchEnd,
    stated_due_date: statedDueDate,
    catalyst_summary: catalysts.join(", "),
    source_file: cleanText(body.sourceFile, 180),
    source_page: Math.max(1, Math.trunc(Number(body.sourcePage) || 1)),
  };
}

function mapRow(row: Record<string, unknown>, actions: Array<Record<string, unknown>>, reportAvailable: boolean) {
  return {
    id: String(row.id),
    ticker: String(row.ticker),
    issuer: String(row.issuer_name ?? ""),
    announcementDate: String(row.announcement_date),
    periodEnd: String(row.period_end),
    reportLabel: String(row.report_label),
    auditor: String(row.auditor_name ?? ""),
    watchStart: String(row.watch_start),
    watchEnd: String(row.watch_end),
    statedDueDate: row.stated_due_date ? String(row.stated_due_date) : null,
    catalysts: String(row.catalyst_summary ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    sourceFile: String(row.source_file ?? ""),
    sourcePage: Number(row.source_page ?? 1),
    status: String(row.status),
    reportAvailable,
    linkedActions: actions.map((action) => ({ id: String(action.id), actionType: String(action.action_type), eventDate: String(action.event_date), topic: String(action.topic ?? "") })),
  };
}

async function relatedActions(supabase: NonNullable<ReturnType<typeof serverClient>>, ticker: string, announcementDate: string, endDate: string) {
  const { data } = await supabase.from("corporate_action_events").select("id,ticker,action_type,event_date,topic").eq("ticker", ticker).gte("event_date", addDays(announcementDate, -45)).lte("event_date", addDays(endDate, 45)).order("event_date", { ascending: true });
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function GET() {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase audit watch belum dikonfigurasi." }, { status: 503 });
  const { data, error } = await supabase.from("financial_audit_watches").select("*").eq("owner_id", adminOwnerId).order("announcement_date", { ascending: false });
  if (error) return NextResponse.json({ error: "Audit watch gagal dimuat. Jalankan migration terbaru." }, { status: 500 });
  const watches = data ?? [];
  const tickers = Array.from(new Set(watches.map((row) => String(row.ticker))));
  const periods = watches.map((row) => String(row.period_end));
  const [actionsResult, reportsResult] = await Promise.all([
    tickers.length ? supabase.from("corporate_action_events").select("id,ticker,action_type,event_date,topic").in("ticker", tickers).order("event_date", { ascending: true }) : Promise.resolve({ data: [], error: null }),
    tickers.length ? supabase.from("financial_reports").select("ticker,period_end").in("ticker", tickers).in("period_end", periods) : Promise.resolve({ data: [], error: null }),
  ]);
  const actions = (actionsResult.data ?? []) as Array<Record<string, unknown>>;
  const available = new Set((reportsResult.data ?? []).map((row) => `${row.ticker}|${row.period_end}`));
  return NextResponse.json({ watches: watches.map((row) => {
    const start = addDays(String(row.announcement_date), -45);
    const end = addDays(String(row.stated_due_date ?? row.watch_end), 45);
    const linked = actions.filter((action) => action.ticker === row.ticker && String(action.event_date) >= start && String(action.event_date) <= end);
    return mapRow(row as Record<string, unknown>, linked, available.has(`${row.ticker}|${row.period_end}`));
  }) }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase audit watch belum dikonfigurasi." }, { status: 503 });
  const payload = normalizePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Data audit watch belum valid." }, { status: 400 });
  const { data: duplicate } = await supabase.from("financial_audit_watches").select("id").eq("owner_id", adminOwnerId).eq("ticker", payload.ticker).eq("period_end", payload.period_end).maybeSingle();
  if (duplicate) return NextResponse.json({ error: "Periode laporan tersebut sudah dipantau." }, { status: 409 });

  const actions = await relatedActions(supabase, payload.ticker, payload.announcement_date, payload.stated_due_date ?? payload.watch_end);
  const actionSummary = actions.length ? `Corporate action terkait: ${actions.map((action) => `${action.action_type} (${action.event_date})`).join(", ")}.` : "Belum ada corporate action terkait di database.";
  const catalyst = payload.catalyst_summary ? `Katalis dokumen: ${payload.catalyst_summary}.` : "";
  const actionType = actions.length ? "Audit Watch + CA" : "Audit Watch";
  const reminderRows = [
    { owner_id: adminOwnerId, ticker: payload.ticker, action_type: actionType, title: `Mulai pantau ${payload.report_label}`, research_note: `${catalyst} ${actionSummary}`.trim(), event_date: payload.stated_due_date ?? payload.watch_end, reminder_date: payload.watch_start, status: "Rencana" },
    { owner_id: adminOwnerId, ticker: payload.ticker, action_type: actionType, title: `Cek realisasi ${payload.report_label}`, research_note: `${catalyst} ${actionSummary}`.trim(), event_date: payload.stated_due_date ?? payload.watch_end, reminder_date: payload.stated_due_date ?? payload.watch_end, status: "Rencana" },
  ];
  const { data: reminders, error: reminderError } = await supabase.from("stock_ca_research_notes").insert(reminderRows).select("id");
  if (reminderError || !reminders?.length) return NextResponse.json({ error: "Reminder audit gagal dibuat. Pastikan ticker tersedia di database." }, { status: 500 });
  const { data, error } = await supabase.from("financial_audit_watches").insert({ ...payload, owner_id: adminOwnerId, watch_reminder_id: reminders[0]?.id, deadline_reminder_id: reminders[1]?.id }).select("*").single();
  if (error) {
    await supabase.from("stock_ca_research_notes").delete().in("id", reminders.map((row) => row.id));
    return NextResponse.json({ error: "Audit watch gagal disimpan." }, { status: 500 });
  }
  return NextResponse.json({ watch: mapRow(data as Record<string, unknown>, actions, false) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase audit watch belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown } | null;
  const id = cleanText(body?.id, 80);
  const status = cleanText(body?.status, 20);
  if (!id || !statuses.has(status)) return NextResponse.json({ error: "Status audit watch tidak valid." }, { status: 400 });
  const { data: watch, error } = await supabase.from("financial_audit_watches").update({ status }).eq("id", id).eq("owner_id", adminOwnerId).select("watch_reminder_id,deadline_reminder_id").maybeSingle();
  if (error || !watch) return NextResponse.json({ error: "Status audit watch gagal diperbarui." }, { status: 500 });
  const reminderIds = [watch.watch_reminder_id, watch.deadline_reminder_id].filter(Boolean);
  if (reminderIds.length) await supabase.from("stock_ca_research_notes").update({ status: status === "waiting" ? "Rencana" : "Selesai" }).in("id", reminderIds).eq("owner_id", adminOwnerId);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase audit watch belum dikonfigurasi." }, { status: 503 });
  const id = cleanText(new URL(request.url).searchParams.get("id"), 80);
  if (!id) return NextResponse.json({ error: "ID audit watch wajib diisi." }, { status: 400 });
  const { data: watch } = await supabase.from("financial_audit_watches").select("watch_reminder_id,deadline_reminder_id").eq("id", id).eq("owner_id", adminOwnerId).maybeSingle();
  const { error } = await supabase.from("financial_audit_watches").delete().eq("id", id).eq("owner_id", adminOwnerId);
  if (error) return NextResponse.json({ error: "Audit watch gagal dihapus." }, { status: 500 });
  const reminderIds = [watch?.watch_reminder_id, watch?.deadline_reminder_id].filter(Boolean);
  if (reminderIds.length) await supabase.from("stock_ca_research_notes").delete().in("id", reminderIds).eq("owner_id", adminOwnerId);
  return NextResponse.json({ success: true });
}
