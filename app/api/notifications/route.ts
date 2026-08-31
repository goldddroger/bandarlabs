import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/stock-quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminOwnerId = "00000000-0000-4000-8000-000000000001";

type NotificationPayload = {
  bestEntries?: Array<Record<string, unknown>>;
  fcaWatches?: Array<Record<string, unknown>>;
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

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function validDateTime(value: unknown, fallback?: string) {
  const text = cleanText(value, 60) || fallback || "";
  return text && Number.isFinite(new Date(text).getTime()) ? new Date(text).toISOString() : null;
}

function normalizePayload(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as NotificationPayload;
  if (!Array.isArray(body.bestEntries) || !Array.isArray(body.fcaWatches)) return null;
  if (body.bestEntries.length > 2_000 || body.fcaWatches.length > 5_000) return null;

  const now = new Date().toISOString();
  const bestEntries = body.bestEntries.map((row) => ({
    ticker: normalizeTicker(cleanText(row.ticker, 12)),
    entry_price: positiveNumber(row.price),
    updated_at: validDateTime(row.updatedAt, now),
    last_fired_value: cleanText(row.lastFiredValue, 500) || null,
  }));
  const fcaWatches = body.fcaWatches.map((row) => {
    const alert = row.alert && typeof row.alert === "object" ? row.alert as Record<string, unknown> : null;
    const criteria = Array.isArray(row.lastKnownCriteria)
      ? Array.from(new Set(row.lastKnownCriteria.map(Number).filter((item) => Number.isInteger(item) && item >= 1 && item <= 11)))
      : [];
    return {
      ticker: normalizeTicker(cleanText(row.ticker, 12)),
      company_name: cleanText(row.companyName, 300),
      watched_at: validDateTime(row.watchedAt, now),
      last_known_active: Boolean(row.lastKnownActive),
      last_known_criteria: criteria,
      alert_type: alert ? cleanText(alert.type, 30) || null : null,
      alert_message: alert ? cleanText(alert.message, 1_000) || null : null,
      alert_created_at: alert ? validDateTime(alert.createdAt) : null,
      alert_unread: alert ? Boolean(alert.unread) : false,
    };
  });

  const alertTypes = new Set(["entered", "exited", "criteria_changed"]);
  if (bestEntries.some((row) => !row.ticker || row.entry_price === null || !row.updated_at)) return null;
  if (fcaWatches.some((row) => !row.ticker || !row.company_name || !row.watched_at || (row.alert_type && !alertTypes.has(row.alert_type)))) return null;
  return {
    bestEntries: Array.from(new Map(bestEntries.map((row) => [row.ticker, row])).values()),
    fcaWatches: Array.from(new Map(fcaWatches.map((row) => [row.ticker, row])).values()),
  };
}

export async function GET() {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase notifikasi belum dikonfigurasi." }, { status: 503 });
  const [bestResult, fcaResult, workspaceResult] = await Promise.all([
    supabase.from("best_entry_alerts").select("ticker,entry_price,last_fired_value,updated_at").eq("owner_id", adminOwnerId).order("ticker"),
    supabase.from("fca_watch_records").select("ticker,company_name,watched_at,last_known_active,last_known_criteria,alert_type,alert_message,alert_created_at,alert_unread").eq("owner_id", adminOwnerId).order("watched_at", { ascending: false }),
    supabase.from("notification_workspaces").select("updated_at").eq("owner_id", adminOwnerId).maybeSingle(),
  ]);
  const error = bestResult.error ?? fcaResult.error ?? workspaceResult.error;
  if (error) {
    console.error("Notification workspace load failed", error);
    return NextResponse.json({ error: "Notifikasi gagal dimuat. Jalankan migration notifikasi terbaru." }, { status: 500 });
  }

  return NextResponse.json({
    initialized: Boolean(workspaceResult.data),
    updatedAt: workspaceResult.data?.updated_at ?? null,
    bestEntries: (bestResult.data ?? []).map((row) => ({
      ticker: row.ticker,
      price: Number(row.entry_price),
      updatedAt: row.updated_at,
      lastFiredValue: row.last_fired_value ?? null,
    })),
    fcaWatches: (fcaResult.data ?? []).map((row) => ({
      ticker: row.ticker,
      companyName: row.company_name,
      watchedAt: row.watched_at,
      lastKnownActive: row.last_known_active,
      lastKnownCriteria: row.last_known_criteria ?? [],
      alert: row.alert_type ? {
        type: row.alert_type,
        message: row.alert_message ?? "Perubahan FCA terdeteksi.",
        createdAt: row.alert_created_at ?? row.watched_at,
        unread: row.alert_unread,
      } : null,
    })),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } });
}

export async function PUT(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase notifikasi belum dikonfigurasi." }, { status: 503 });
  const payload = normalizePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Data notifikasi tidak valid." }, { status: 400 });

  const { data, error } = await supabase.rpc("replace_admin_notifications", {
    p_best_entries: payload.bestEntries,
    p_fca_watches: payload.fcaWatches,
  });
  if (error) {
    console.error("Notification workspace sync failed", error);
    return NextResponse.json({ error: "Notifikasi gagal disimpan. Jalankan migration notifikasi terbaru." }, { status: 500 });
  }
  return NextResponse.json({ success: true, counts: data });
}
