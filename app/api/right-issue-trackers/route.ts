import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/stock-quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminOwnerId = "00000000-0000-4000-8000-000000000001";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const statuses = new Set(["planned", "ongoing", "completed"]);
const proceedsCategories = ["capex", "acquisition", "debtRepayment", "workingCapital", "relatedParty"] as const;

type TrackerPayload = {
  id?: unknown;
  ticker?: unknown;
  issuerName?: unknown;
  referenceDate?: unknown;
  status?: unknown;
  targetFunds?: unknown;
  actualFunds?: unknown;
  offeredShares?: unknown;
  subscribedShares?: unknown;
  sharesBefore?: unknown;
  sharesAfter?: unknown;
  notes?: unknown;
  proceedsPlan?: unknown;
  proceedsActual?: unknown;
  proceedsChanged?: unknown;
  proceedsChangeReason?: unknown;
  ownershipBefore?: unknown;
  ownershipAfter?: unknown;
  controllerBefore?: unknown;
  controllerAfter?: unknown;
  controlChanged?: unknown;
  standbyBuyerName?: unknown;
  standbyBuyerCommitment?: unknown;
  warrantShares?: unknown;
  warrantExercisePrice?: unknown;
  warrantStartDate?: unknown;
  warrantEndDate?: unknown;
};

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function optionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function optionalDate(value: unknown) {
  const date = cleanText(value, 10);
  return date ? (datePattern.test(date) ? date : undefined) : null;
}

function allocations(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result = Object.fromEntries(proceedsCategories.map((category) => [category, optionalNumber(source[category])])) as Record<(typeof proceedsCategories)[number], number | null | undefined>;
  return Object.values(result).some((amount) => amount === undefined) ? null : result as Record<(typeof proceedsCategories)[number], number | null>;
}

function normalizePayload(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as TrackerPayload;
  const ticker = normalizeTicker(cleanText(body.ticker, 12));
  const issuerName = cleanText(body.issuerName, 300);
  const referenceDate = cleanText(body.referenceDate, 10);
  const status = cleanText(body.status, 20);
  const notes = cleanText(body.notes, 4000);
  const targetFunds = optionalNumber(body.targetFunds);
  const actualFunds = optionalNumber(body.actualFunds);
  const offeredShares = optionalNumber(body.offeredShares);
  const subscribedShares = optionalNumber(body.subscribedShares);
  const sharesBefore = optionalNumber(body.sharesBefore);
  const sharesAfter = optionalNumber(body.sharesAfter);
  const proceedsPlan = allocations(body.proceedsPlan);
  const proceedsActual = allocations(body.proceedsActual);
  const standbyBuyerCommitment = optionalNumber(body.standbyBuyerCommitment);
  const warrantShares = optionalNumber(body.warrantShares);
  const warrantExercisePrice = optionalNumber(body.warrantExercisePrice);
  const warrantStartDate = optionalDate(body.warrantStartDate);
  const warrantEndDate = optionalDate(body.warrantEndDate);
  if (!ticker || !datePattern.test(referenceDate) || !statuses.has(status)
    || !proceedsPlan || !proceedsActual
    || [targetFunds, actualFunds, offeredShares, subscribedShares, sharesBefore, sharesAfter, standbyBuyerCommitment, warrantShares, warrantExercisePrice].some((number) => number === undefined)
    || warrantStartDate === undefined || warrantEndDate === undefined) return null;
  return {
    ticker,
    issuer_name: issuerName,
    reference_date: referenceDate,
    status,
    target_funds: targetFunds,
    actual_funds: actualFunds,
    offered_shares: offeredShares,
    subscribed_shares: subscribedShares,
    shares_before: sharesBefore,
    shares_after: sharesAfter,
    notes,
    proceeds_plan: proceedsPlan,
    proceeds_actual: proceedsActual,
    proceeds_changed: body.proceedsChanged === true,
    proceeds_change_reason: cleanText(body.proceedsChangeReason, 4000),
    ownership_before: cleanText(body.ownershipBefore, 6000),
    ownership_after: cleanText(body.ownershipAfter, 6000),
    controller_before: cleanText(body.controllerBefore, 300),
    controller_after: cleanText(body.controllerAfter, 300),
    control_changed: body.controlChanged === true,
    standby_buyer_name: cleanText(body.standbyBuyerName, 300),
    standby_buyer_commitment: standbyBuyerCommitment,
    warrant_shares: warrantShares,
    warrant_exercise_price: warrantExercisePrice,
    warrant_start_date: warrantStartDate,
    warrant_end_date: warrantEndDate,
  };
}

function mapRow(row: Record<string, unknown>) {
  const numeric = (value: unknown) => value === null || value === undefined ? null : Number(value);
  const allocation = (value: unknown) => {
    const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return Object.fromEntries(proceedsCategories.map((category) => [category, numeric(source[category])])) as Record<(typeof proceedsCategories)[number], number | null>;
  };
  return {
    id: row.id,
    ticker: row.ticker,
    issuerName: row.issuer_name,
    referenceDate: row.reference_date,
    status: row.status,
    targetFunds: numeric(row.target_funds),
    actualFunds: numeric(row.actual_funds),
    offeredShares: numeric(row.offered_shares),
    subscribedShares: numeric(row.subscribed_shares),
    sharesBefore: numeric(row.shares_before),
    sharesAfter: numeric(row.shares_after),
    notes: row.notes,
    proceedsPlan: allocation(row.proceeds_plan),
    proceedsActual: allocation(row.proceeds_actual),
    proceedsChanged: Boolean(row.proceeds_changed),
    proceedsChangeReason: row.proceeds_change_reason ?? "",
    ownershipBefore: row.ownership_before ?? "",
    ownershipAfter: row.ownership_after ?? "",
    controllerBefore: row.controller_before ?? "",
    controllerAfter: row.controller_after ?? "",
    controlChanged: Boolean(row.control_changed),
    standbyBuyerName: row.standby_buyer_name ?? "",
    standbyBuyerCommitment: numeric(row.standby_buyer_commitment),
    warrantShares: numeric(row.warrant_shares),
    warrantExercisePrice: numeric(row.warrant_exercise_price),
    warrantStartDate: row.warrant_start_date ?? null,
    warrantEndDate: row.warrant_end_date ?? null,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase tracker belum dikonfigurasi." }, { status: 503 });
  const { data, error } = await supabase.from("right_issue_post_trackers").select("*").eq("owner_id", adminOwnerId).order("reference_date", { ascending: false });
  if (error) return NextResponse.json({ error: "Tracker gagal dimuat. Jalankan migration terbaru di Supabase." }, { status: 500 });
  return NextResponse.json({ trackers: (data ?? []).map(mapRow) }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase tracker belum dikonfigurasi." }, { status: 503 });
  const payload = normalizePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Data tracker belum valid." }, { status: 400 });
  const { data, error } = await supabase.from("right_issue_post_trackers").insert({ ...payload, owner_id: adminOwnerId }).select("*").single();
  if (error) {
    console.error("Right issue tracker insert failed", error);
    const duplicate = error.code === "23505";
    return NextResponse.json({ error: duplicate ? "Ticker dan tanggal acuan tersebut sudah dipantau." : "Tracker gagal disimpan. Pastikan migration dan ticker saham sudah tersedia." }, { status: duplicate ? 409 : 500 });
  }
  return NextResponse.json({ tracker: mapRow(data) });
}

export async function PATCH(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase tracker belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as TrackerPayload | null;
  const id = cleanText(body?.id, 80);
  const payload = normalizePayload(body);
  if (!id || !payload) return NextResponse.json({ error: "Data tracker belum valid." }, { status: 400 });
  const { data, error } = await supabase.from("right_issue_post_trackers").update(payload).eq("id", id).eq("owner_id", adminOwnerId).select("*").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Tracker gagal diperbarui." }, { status: 500 });
  return NextResponse.json({ tracker: mapRow(data) });
}

export async function DELETE(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase tracker belum dikonfigurasi." }, { status: 503 });
  const id = cleanText(new URL(request.url).searchParams.get("id"), 80);
  if (!id) return NextResponse.json({ error: "ID tracker wajib diisi." }, { status: 400 });
  const { error } = await supabase.from("right_issue_post_trackers").delete().eq("id", id).eq("owner_id", adminOwnerId);
  if (error) return NextResponse.json({ error: "Tracker gagal dihapus." }, { status: 500 });
  return NextResponse.json({ success: true });
}
