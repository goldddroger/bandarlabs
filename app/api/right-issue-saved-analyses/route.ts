import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/stock-quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminOwnerId = "00000000-0000-4000-8000-000000000001";
const verdicts = new Set(["positive", "mixed", "caution"]);
const stages = new Set(["proposal", "final_or_advanced"]);

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateFromDocuments(documents: unknown) {
  if (!Array.isArray(documents)) return null;
  for (const document of documents) {
    const name = cleanText(safeObject(document).name, 180);
    const match = name.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return null;
}

function documentStage(documents: unknown, fallback: string) {
  const names = Array.isArray(documents) ? documents.map((item) => cleanText(safeObject(item).name, 180)).join(" ") : "";
  if (/hasil pelaksanaan|realisasi/i.test(names)) return "Hasil pelaksanaan";
  if (/revisi|perubahan|tambahan/i.test(names)) return "Revisi";
  if (/prospektus/i.test(names)) return "Prospektus final";
  return fallback === "proposal" ? "Usulan" : "Dokumen lanjutan";
}

function comparableSnapshot(value: unknown) {
  const snapshot = safeObject(value);
  const facts = safeObject(snapshot.facts);
  return {
    exercisePrice: optionalNumber(facts.exercisePrice),
    ratioOld: optionalNumber(facts.ratioOld),
    ratioNew: optionalNumber(facts.ratioNew),
    newShares: optionalNumber(facts.newShares),
    dilution: optionalNumber(facts.dilution),
    timeline: Array.isArray(snapshot.timeline) ? snapshot.timeline : [],
    productiveUse: Boolean(facts.productiveUse),
    debtUse: Boolean(facts.debtUse),
    workingCapitalUse: Boolean(facts.workingCapitalUse),
    useOfProceedsSummary: cleanText(facts.useOfProceedsSummary, 1200),
  };
}

function detectChanges(previous: unknown, current: unknown) {
  if (!previous || Object.keys(safeObject(previous)).length === 0) return [{ field: "Dokumen", before: null, after: "Versi awal", tone: "neutral" }];
  const before = comparableSnapshot(previous);
  const after = comparableSnapshot(current);
  const labels: Record<string, string> = {
    exercisePrice: "Harga pelaksanaan", ratioOld: "Rasio saham lama", ratioNew: "Rasio saham baru",
    newShares: "Jumlah saham baru", dilution: "Dilusi", timeline: "Jadwal", productiveUse: "Penggunaan dana produktif",
    debtUse: "Pelunasan utang", workingCapitalUse: "Modal kerja", useOfProceedsSummary: "Rincian penggunaan dana",
  };
  return Object.keys(labels).flatMap((key) => {
    const previousValue = before[key as keyof typeof before];
    const currentValue = after[key as keyof typeof after];
    if (JSON.stringify(previousValue) === JSON.stringify(currentValue)) return [];
    return [{ field: labels[key], before: previousValue, after: currentValue, tone: key === "dilution" && Number(currentValue) > Number(previousValue) ? "warning" : "changed" }];
  });
}

function mapAnalysis(row: Record<string, unknown>, versions: Array<Record<string, unknown>> = []) {
  return {
    id: row.id,
    ticker: row.ticker,
    issuer: row.issuer_name,
    score: row.score,
    verdict: row.verdict,
    stage: row.stage,
    marketPrice: optionalNumber(row.market_price),
    result: row.analysis_snapshot,
    financialInputs: row.financial_inputs,
    financialProjection: row.financial_projection,
    note: row.personal_note,
    updatedAt: row.updated_at,
    versions: versions.map((version) => ({
      id: version.id,
      versionNo: version.version_no,
      stage: version.stage,
      documentDate: version.document_date,
      documents: version.documents,
      changes: version.changes,
      createdAt: version.created_at,
    })),
  };
}

export async function GET(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase analisis belum dikonfigurasi." }, { status: 503 });
  const ticker = normalizeTicker(new URL(request.url).searchParams.get("ticker") ?? "");
  if (!ticker) {
    const { data, error } = await supabase.from("right_issue_analyses").select("*").eq("owner_id", adminOwnerId).order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Analisis tersimpan gagal dimuat. Jalankan migration terbaru." }, { status: 500 });
    return NextResponse.json({ analyses: (data ?? []).map((row) => mapAnalysis(row)) }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }
  const { data: analysis, error } = await supabase.from("right_issue_analyses").select("*").eq("owner_id", adminOwnerId).eq("ticker", ticker).maybeSingle();
  if (error) return NextResponse.json({ error: "Analisis tersimpan gagal dimuat. Jalankan migration terbaru." }, { status: 500 });
  if (!analysis) return NextResponse.json({ analysis: null });
  const { data: versions } = await supabase.from("right_issue_analysis_versions").select("*").eq("analysis_id", analysis.id).order("version_no", { ascending: false });
  return NextResponse.json({ analysis: mapAnalysis(analysis, versions ?? []) }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase analisis belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const ticker = normalizeTicker(cleanText(body?.ticker, 12));
  const score = Math.max(0, Math.min(100, Math.trunc(Number(body?.score) || 0)));
  const verdict = cleanText(body?.verdict, 24);
  const stage = cleanText(body?.stage, 30);
  const result = safeObject(body?.result);
  const documents = Array.isArray(result.documents) ? result.documents.slice(0, 12) : [];
  if (!ticker || !verdicts.has(verdict) || !stages.has(stage) || documents.length === 0) return NextResponse.json({ error: "Hasil analisis belum valid." }, { status: 400 });

  const { data: existing } = await supabase.from("right_issue_analyses").select("id,analysis_snapshot").eq("owner_id", adminOwnerId).eq("ticker", ticker).maybeSingle();
  const payload = {
    owner_id: adminOwnerId,
    ticker,
    issuer_name: cleanText(body?.issuer, 300),
    score,
    verdict,
    stage,
    market_price: optionalNumber(body?.marketPrice),
    analysis_snapshot: result,
    financial_inputs: safeObject(body?.financialInputs),
    financial_projection: safeObject(body?.financialProjection),
    personal_note: cleanText(body?.note, 8000),
  };
  const { data: analysis, error } = await supabase.from("right_issue_analyses").upsert(payload, { onConflict: "owner_id,ticker" }).select("*").single();
  if (error || !analysis) return NextResponse.json({ error: "Analisis gagal disimpan. Pastikan migration dan ticker tersedia." }, { status: 500 });

  const { data: lastVersion } = await supabase.from("right_issue_analysis_versions").select("version_no").eq("analysis_id", analysis.id).order("version_no", { ascending: false }).limit(1).maybeSingle();
  const changes = detectChanges(existing?.analysis_snapshot, result);
  const { error: versionError } = await supabase.from("right_issue_analysis_versions").insert({
    analysis_id: analysis.id,
    version_no: Number(lastVersion?.version_no ?? 0) + 1,
    stage: documentStage(documents, stage),
    document_date: dateFromDocuments(documents),
    documents,
    snapshot: result,
    changes,
  });
  if (versionError) return NextResponse.json({ error: "Analisis tersimpan, tetapi riwayat versi gagal dibuat." }, { status: 500 });
  const { data: versions } = await supabase.from("right_issue_analysis_versions").select("*").eq("analysis_id", analysis.id).order("version_no", { ascending: false });
  return NextResponse.json({ analysis: mapAnalysis(analysis, versions ?? []), changes });
}
