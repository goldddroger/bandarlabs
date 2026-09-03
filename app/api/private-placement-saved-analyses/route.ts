import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/stock-quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ownerId = "00000000-0000-4000-8000-000000000001";
const stages = new Set(["proposal", "approved", "revision", "completed"]);
const verdicts = new Set(["positive", "mixed", "caution"]);

function db() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null; }
function object(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, max: number) { return String(value ?? "").trim().slice(0, max); }
function optionalNumber(value: unknown) { const parsed = Number(value); return value !== null && value !== "" && Number.isFinite(parsed) ? parsed : null; }
function documentDate(documents: unknown) {
  if (!Array.isArray(documents)) return null;
  for (const document of documents) { const match = text(object(document).name, 180).match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/); if (match) return `${match[1]}-${match[2]}-${match[3]}`; }
  return null;
}
function snapshot(value: unknown) {
  const result = object(value); const facts = object(result.facts);
  return { stage: text(result.stage, 30), maximumNewShares: optionalNumber(facts.maximumNewShares), actualNewShares: optionalNumber(facts.actualNewShares), placementPrice: optionalNumber(facts.placementPrice), dilutionAfter: optionalNumber(facts.dilutionAfter), actualFunds: optionalNumber(facts.actualFunds), investorName: text(facts.investorName, 200), affiliated: Boolean(facts.affiliated), controllerInvestor: Boolean(facts.controllerInvestor), useOfProceedsSummary: text(facts.useOfProceedsSummary, 1200), timeline: Array.isArray(result.timeline) ? result.timeline : [] };
}
function changes(previous: unknown, current: unknown) {
  if (!previous || !Object.keys(object(previous)).length) return [{ field: "Dokumen", before: null, after: "Versi awal", tone: "neutral" }];
  const before = snapshot(previous); const after = snapshot(current);
  const labels: Record<keyof typeof before, string> = { stage: "Tahap", maximumNewShares: "Maksimum saham baru", actualNewShares: "Saham aktual", placementPrice: "Harga placement", dilutionAfter: "Dilusi", actualFunds: "Dana aktual", investorName: "Pemodal", affiliated: "Afiliasi", controllerInvestor: "Pemodal pengendali", useOfProceedsSummary: "Penggunaan dana", timeline: "Jadwal" };
  return (Object.keys(labels) as Array<keyof typeof before>).flatMap((key) => JSON.stringify(before[key]) === JSON.stringify(after[key]) ? [] : [{ field: labels[key], before: before[key], after: after[key], tone: key === "dilutionAfter" && Number(after[key]) > Number(before[key]) ? "warning" : "changed" }]);
}
function map(row: Record<string, unknown>, versions: Array<Record<string, unknown>> = []) { return { id: row.id, ticker: row.ticker, issuer: row.issuer_name, score: row.score, verdict: row.verdict, stage: row.stage, marketPrice: optionalNumber(row.market_price), result: row.analysis_snapshot, financialInputs: row.financial_inputs, financialProjection: row.financial_projection, note: row.personal_note, updatedAt: row.updated_at, versions: versions.map((version) => ({ id: version.id, versionNo: version.version_no, stage: version.stage, documentDate: version.document_date, documents: version.documents, changes: version.changes, createdAt: version.created_at })) }; }

export async function GET(request: Request) {
  const supabase = db(); if (!supabase) return NextResponse.json({ error: "Supabase analisis belum dikonfigurasi." }, { status: 503 });
  const ticker = normalizeTicker(new URL(request.url).searchParams.get("ticker") ?? "");
  if (!ticker) { const { data, error } = await supabase.from("private_placement_analyses").select("*").eq("owner_id", ownerId).order("updated_at", { ascending: false }); if (error) return NextResponse.json({ error: "Analisis gagal dimuat. Jalankan migration Private Placement." }, { status: 500 }); return NextResponse.json({ analyses: (data ?? []).map((row) => map(row)) }); }
  const { data: analysis, error } = await supabase.from("private_placement_analyses").select("*").eq("owner_id", ownerId).eq("ticker", ticker).maybeSingle();
  if (error) return NextResponse.json({ error: "Analisis gagal dimuat. Jalankan migration Private Placement." }, { status: 500 });
  if (!analysis) return NextResponse.json({ analysis: null });
  const { data: versions } = await supabase.from("private_placement_analysis_versions").select("*").eq("analysis_id", analysis.id).order("version_no", { ascending: false });
  return NextResponse.json({ analysis: map(analysis, versions ?? []) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const supabase = db(); if (!supabase) return NextResponse.json({ error: "Supabase analisis belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const ticker = normalizeTicker(text(body?.ticker, 12)); const result = object(body?.result); const documents = Array.isArray(result.documents) ? result.documents.slice(0, 16) : []; const verdict = text(body?.verdict, 24); const stage = text(body?.stage, 30);
  if (!ticker || !verdicts.has(verdict) || !stages.has(stage) || !documents.length) return NextResponse.json({ error: "Hasil analisis belum valid." }, { status: 400 });
  const { data: existing } = await supabase.from("private_placement_analyses").select("id,analysis_snapshot").eq("owner_id", ownerId).eq("ticker", ticker).maybeSingle();
  const { data: analysis, error } = await supabase.from("private_placement_analyses").upsert({ owner_id: ownerId, ticker, issuer_name: text(body?.issuer, 300), score: Math.max(0, Math.min(100, Math.trunc(Number(body?.score) || 0))), verdict, stage, market_price: optionalNumber(body?.marketPrice), analysis_snapshot: result, financial_inputs: object(body?.financialInputs), financial_projection: object(body?.financialProjection), personal_note: text(body?.note, 8000) }, { onConflict: "owner_id,ticker" }).select("*").single();
  if (error || !analysis) return NextResponse.json({ error: "Analisis gagal disimpan. Pastikan migration dan ticker tersedia." }, { status: 500 });
  const { data: last } = await supabase.from("private_placement_analysis_versions").select("version_no").eq("analysis_id", analysis.id).order("version_no", { ascending: false }).limit(1).maybeSingle();
  const detectedChanges = changes(existing?.analysis_snapshot, result);
  const { error: versionError } = await supabase.from("private_placement_analysis_versions").insert({ analysis_id: analysis.id, version_no: Number(last?.version_no ?? 0) + 1, stage, document_date: documentDate(documents), documents, snapshot: result, changes: detectedChanges });
  if (versionError) return NextResponse.json({ error: "Analisis tersimpan, tetapi riwayat versi gagal dibuat." }, { status: 500 });
  const { data: versions } = await supabase.from("private_placement_analysis_versions").select("*").eq("analysis_id", analysis.id).order("version_no", { ascending: false });
  return NextResponse.json({ analysis: map(analysis, versions ?? []), changes: detectedChanges });
}
