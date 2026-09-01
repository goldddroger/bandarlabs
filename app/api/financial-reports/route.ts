import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type {
  FinancialBreakdown,
  FinancialInsight,
  FinancialReportFact,
  FinancialReportKpis,
  FinancialSupportingDocument,
  ParsedFinancialReport,
} from "@/lib/financial-report";
import { mergePdfInsights, parseFinancialPdf } from "@/lib/financial-pdf-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminOwnerId = "00000000-0000-4000-8000-000000000001";
const workbookMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const maxFileSize = 10 * 1024 * 1024;
const maxSupportingFiles = 3;
const maxSupportingTotalSize = 20 * 1024 * 1024;
const reportColumns = "id,ticker,entity_name,industry_family,sector,subsector,taxonomy_family,period_label,period_start,period_end,prior_period_start,prior_period_end,currency,unit_label,unit_multiplier,report_type,auditor,source_file,storage_path,supporting_documents,headline,executive_summary,kpis,insights,breakdowns,analyst_note,created_at,updated_at";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function noStore(payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, {
    ...init,
    headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate", ...init?.headers },
  });
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function validDate(value: unknown) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""));
}

function validReport(value: unknown): value is ParsedFinancialReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<ParsedFinancialReport>;
  return /^[A-Z0-9]{4,8}$/.test(report.ticker ?? "")
    && Boolean(cleanText(report.entityName, 240))
    && validDate(report.periodStart)
    && validDate(report.periodEnd)
    && Boolean(cleanText(report.currency, 12))
    && Number.isFinite(report.unitMultiplier)
    && Number(report.unitMultiplier) > 0
    && Boolean(cleanText(report.headline, 500))
    && Boolean(cleanText(report.executiveSummary, 12_000))
    && Boolean(report.kpis && typeof report.kpis === "object")
    && Array.isArray(report.insights)
    && report.insights.length <= 40
    && Array.isArray(report.breakdowns)
    && report.breakdowns.length <= 30
    && Array.isArray(report.facts)
    && report.facts.length > 0
    && report.facts.length <= 4_000;
}

function mapReport(row: Record<string, unknown>) {
  const supportingDocuments: FinancialSupportingDocument[] = Array.isArray(row.supporting_documents)
    ? row.supporting_documents.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const document = value as Partial<FinancialSupportingDocument>;
      if (!document.name || !document.storagePath) return [];
      return [{
        name: String(document.name),
        kind: document.kind === "financial_statements" || document.kind === "movement_disclosure" || document.kind === "material_information" ? document.kind : "supporting_document",
        pageCount: Number(document.pageCount) || 0,
        storagePath: String(document.storagePath),
        downloadUrl: null,
      } satisfies FinancialSupportingDocument];
    })
    : [];
  return {
    id: String(row.id),
    ticker: String(row.ticker),
    entityName: String(row.entity_name),
    industryFamily: String(row.industry_family ?? ""),
    sector: String(row.sector ?? ""),
    subsector: String(row.subsector ?? ""),
    taxonomyFamily: String(row.taxonomy_family ?? "unknown"),
    periodLabel: String(row.period_label ?? ""),
    periodStart: String(row.period_start),
    periodEnd: String(row.period_end),
    priorPeriodStart: row.prior_period_start ? String(row.prior_period_start) : null,
    priorPeriodEnd: row.prior_period_end ? String(row.prior_period_end) : null,
    currency: String(row.currency),
    unitLabel: String(row.unit_label ?? ""),
    unitMultiplier: Number(row.unit_multiplier),
    reportType: String(row.report_type ?? ""),
    auditor: String(row.auditor ?? ""),
    sourceFile: String(row.source_file ?? ""),
    storagePath: row.storage_path ? String(row.storage_path) : null,
    supportingDocuments,
    headline: String(row.headline),
    executiveSummary: String(row.executive_summary),
    kpis: (row.kpis ?? {}) as FinancialReportKpis,
    insights: (row.insights ?? []) as FinancialInsight[],
    breakdowns: (row.breakdowns ?? []) as FinancialBreakdown[],
    analystNote: String(row.analyst_note ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapFact(row: Record<string, unknown>): FinancialReportFact {
  return {
    statement: row.statement as FinancialReportFact["statement"],
    sheetCode: String(row.sheet_code),
    sheetTitle: String(row.sheet_title ?? ""),
    rowNumber: Number(row.row_number),
    label: String(row.label),
    labelEn: String(row.label_en ?? ""),
    concept: row.concept ? String(row.concept) : null,
    currentValue: row.current_value === null ? null : Number(row.current_value),
    priorValue: row.prior_value === null ? null : Number(row.prior_value),
  };
}

function databaseError(error: { code?: string; message?: string } | null, fallback: string) {
  if (/supporting_documents/i.test(error?.message ?? "")) {
    return "Database PDF pendamping belum siap. Jalankan migration 202609010001_financial_report_pdf_sources.sql di Supabase.";
  }
  if (["42P01", "PGRST202", "PGRST205"].includes(error?.code ?? "")) {
    return "Database riset laporan belum siap. Jalankan migration 202608310002_financial_report_research.sql di Supabase.";
  }
  return error?.message ? `${fallback}: ${error.message}` : fallback;
}

export async function GET(request: Request) {
  const supabase = adminClient();
  if (!supabase) return noStore({ error: "Supabase riset laporan belum dikonfigurasi." }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    const { data, error } = await supabase
      .from("financial_reports")
      .select(reportColumns)
      .eq("owner_id", adminOwnerId)
      .order("period_end", { ascending: false })
      .order("ticker");
    if (error) return noStore({ error: databaseError(error, "Daftar laporan gagal dimuat") }, { status: 500 });
    return noStore({ reports: (data ?? []).map((row) => mapReport(row as Record<string, unknown>)) });
  }

  const [reportResult, factsResult] = await Promise.all([
    supabase.from("financial_reports").select(reportColumns).eq("id", id).eq("owner_id", adminOwnerId).maybeSingle(),
    supabase.from("financial_report_facts").select("statement,sheet_code,sheet_title,row_number,label,label_en,concept,current_value,prior_value").eq("report_id", id).order("statement").order("row_number"),
  ]);
  if (reportResult.error || !reportResult.data) return noStore({ error: databaseError(reportResult.error, "Laporan tidak ditemukan") }, { status: 404 });
  if (factsResult.error) return noStore({ error: databaseError(factsResult.error, "Fakta laporan gagal dimuat") }, { status: 500 });
  const report = mapReport(reportResult.data as Record<string, unknown>);
  let downloadUrl: string | null = null;
  if (report.storagePath) {
    const { data } = await supabase.storage.from("financial-reports").createSignedUrl(report.storagePath, 900);
    downloadUrl = data?.signedUrl ?? null;
  }
  report.supportingDocuments = await Promise.all(report.supportingDocuments.map(async (document) => {
    const { data } = await supabase.storage.from("financial-reports").createSignedUrl(document.storagePath, 900);
    return { ...document, downloadUrl: data?.signedUrl ?? null };
  }));
  return noStore({ report, facts: (factsResult.data ?? []).map((row) => mapFact(row as Record<string, unknown>)), downloadUrl });
}

export async function POST(request: Request) {
  const supabase = adminClient();
  if (!supabase) return noStore({ error: "Supabase riset laporan belum dikonfigurasi." }, { status: 503 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const payloadText = form?.get("payload");
  const supportingUploadsText = form?.get("supportingUploads");
  if (!(file instanceof File) || typeof payloadText !== "string") return noStore({ error: "File dan hasil pembacaan workbook wajib dikirim." }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".xlsx") || file.size < 1 || file.size > maxFileSize) return noStore({ error: "Gunakan file .xlsx dengan ukuran maksimal 10 MB." }, { status: 400 });

  let report: ParsedFinancialReport;
  try {
    report = JSON.parse(payloadText) as ParsedFinancialReport;
  } catch {
    return noStore({ error: "Hasil pembacaan workbook tidak valid." }, { status: 400 });
  }
  if (!validReport(report)) return noStore({ error: "Struktur laporan hasil ekstraksi tidak valid." }, { status: 400 });

  type SupportingUpload = { name: string; size: number; path: string };
  let supportingUploads: SupportingUpload[] = [];
  try {
    const candidate = typeof supportingUploadsText === "string" ? JSON.parse(supportingUploadsText) as unknown : [];
    if (!Array.isArray(candidate)) throw new Error("Metadata PDF tidak valid.");
    supportingUploads = candidate.map((value) => {
      if (!value || typeof value !== "object") throw new Error("Metadata PDF tidak valid.");
      const upload = value as Partial<SupportingUpload>;
      return { name: cleanText(upload.name, 160), size: Number(upload.size), path: cleanText(upload.path, 500) };
    });
  } catch (error) {
    return noStore({ error: error instanceof Error ? error.message : "Metadata PDF tidak valid." }, { status: 400 });
  }
  const expectedPrefix = `admin/${report.ticker}/${report.periodEnd}/supporting/`;
  if (supportingUploads.length > maxSupportingFiles || supportingUploads.some((document) => !document.name.toLowerCase().endsWith(".pdf") || document.size < 1 || document.size > maxFileSize || !document.path.startsWith(expectedPrefix)) || supportingUploads.reduce((total, document) => total + document.size, 0) > maxSupportingTotalSize) return noStore({ error: "Metadata PDF pendamping tidak valid." }, { status: 400 });

  let parsedDocuments: Awaited<ReturnType<typeof parseFinancialPdf>>[] = [];
  try {
    parsedDocuments = await Promise.all(supportingUploads.map(async (document) => {
      const { data, error } = await supabase.storage.from("financial-reports").download(document.path);
      if (error || !data) throw new Error(`${document.name}: ${error?.message || "file tidak ditemukan"}`);
      if (data.size > maxFileSize) throw new Error(`${document.name}: ukuran melebihi 10 MB`);
      return parseFinancialPdf(new Uint8Array(await data.arrayBuffer()), document.name, report);
    }));
  } catch (error) {
    const paths = supportingUploads.map((document) => document.path);
    if (paths.length) await supabase.storage.from("financial-reports").remove(paths);
    return noStore({ error: error instanceof Error ? `PDF pendamping gagal dibaca: ${error.message}` : "PDF pendamping gagal dibaca." }, { status: 400 });
  }

  const safeFileName = file.name.replace(/[^A-Za-z0-9._-]/g, "-").slice(-160);
  const storagePath = `admin/${report.ticker}/${report.periodEnd}/${crypto.randomUUID()}-${safeFileName}`;
  const uploadedPaths: string[] = supportingUploads.map((document) => document.path);
  const { error: uploadError } = await supabase.storage.from("financial-reports").upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: workbookMime, upsert: false });
  if (uploadError) {
    if (uploadedPaths.length) await supabase.storage.from("financial-reports").remove(uploadedPaths);
    return noStore({ error: databaseError(uploadError, "File sumber gagal disimpan") }, { status: 500 });
  }
  uploadedPaths.push(storagePath);

  const supportingDocuments: FinancialSupportingDocument[] = [];
  for (let index = 0; index < supportingUploads.length; index += 1) {
    const document = supportingUploads[index];
    const parsed = parsedDocuments[index];
    supportingDocuments.push({ name: document.name, kind: parsed.kind, pageCount: parsed.pageCount, storagePath: document.path });
  }

  const { data: existing, error: existingError } = await supabase.from("financial_reports").select("storage_path,supporting_documents").eq("owner_id", adminOwnerId).eq("ticker", report.ticker).eq("period_end", report.periodEnd).maybeSingle();
  if (existingError) {
    await supabase.storage.from("financial-reports").remove(uploadedPaths);
    return noStore({ error: databaseError(existingError, "Database PDF pendamping belum siap") }, { status: 500 });
  }
  const enhancedInsights = mergePdfInsights(report.insights, parsedDocuments);
  const reportPayload = {
    ticker: report.ticker,
    entity_name: cleanText(report.entityName, 240),
    industry_family: cleanText(report.industryFamily, 160),
    sector: cleanText(report.sector, 160),
    subsector: cleanText(report.subsector, 160),
    taxonomy_family: report.taxonomyFamily,
    period_label: cleanText(report.periodLabel, 100),
    period_start: report.periodStart,
    period_end: report.periodEnd,
    prior_period_start: report.priorPeriodStart,
    prior_period_end: report.priorPeriodEnd,
    currency: cleanText(report.currency, 12),
    unit_label: cleanText(report.unitLabel, 80),
    unit_multiplier: report.unitMultiplier,
    report_type: cleanText(report.reportType, 160),
    auditor: cleanText(report.auditor, 240),
    source_file: safeFileName,
    storage_path: storagePath,
    headline: cleanText(report.headline, 500),
    executive_summary: cleanText(report.executiveSummary, 12_000),
    kpis: report.kpis,
    insights: enhancedInsights,
    breakdowns: report.breakdowns,
  };
  const factsPayload = report.facts.map((fact) => ({
    statement: fact.statement,
    sheet_code: cleanText(fact.sheetCode, 40),
    sheet_title: cleanText(fact.sheetTitle, 500),
    row_number: fact.rowNumber,
    label: cleanText(fact.label, 800),
    label_en: cleanText(fact.labelEn, 800),
    concept: fact.concept ? cleanText(fact.concept, 100) : null,
    current_value: fact.currentValue,
    prior_value: fact.priorValue,
  }));

  const stockSync = await supabase.from("stocks").upsert({ ticker: report.ticker, name: report.entityName }, { onConflict: "ticker" });
  if (stockSync.error) console.warn("Financial report stock sync failed", stockSync.error.message);
  const { data: reportId, error } = await supabase.rpc("replace_admin_financial_report", { p_report: reportPayload, p_facts: factsPayload });
  if (error || !reportId) {
    await supabase.storage.from("financial-reports").remove(uploadedPaths);
    return noStore({ error: databaseError(error, "Laporan gagal disimpan") }, { status: 500 });
  }
  const documentUpdate = await supabase.from("financial_reports").update({ supporting_documents: supportingDocuments }).eq("id", reportId).eq("owner_id", adminOwnerId);
  if (documentUpdate.error) {
    await supabase.storage.from("financial-reports").remove(uploadedPaths);
    return noStore({ error: databaseError(documentUpdate.error, "Metadata PDF gagal disimpan") }, { status: 500 });
  }
  const previousStoragePath = existing?.storage_path ? String(existing.storage_path) : null;
  const previousDocuments = Array.isArray(existing?.supporting_documents) ? existing.supporting_documents : [];
  const previousPaths = previousDocuments.flatMap((value) => value && typeof value === "object" && "storagePath" in value ? [String(value.storagePath)] : []);
  const obsoletePaths = [previousStoragePath, ...previousPaths].filter((path): path is string => Boolean(path && !uploadedPaths.includes(path)));
  if (obsoletePaths.length) await supabase.storage.from("financial-reports").remove(obsoletePaths);
  return noStore({ id: String(reportId), ticker: report.ticker, periodEnd: report.periodEnd }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = adminClient();
  if (!supabase) return noStore({ error: "Supabase riset laporan belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as { id?: string; analystNote?: string } | null;
  const id = cleanText(body?.id, 100);
  const analystNote = cleanText(body?.analystNote, 20_000);
  if (!id) return noStore({ error: "ID laporan tidak valid." }, { status: 400 });
  const { data, error } = await supabase.from("financial_reports").update({ analyst_note: analystNote }).eq("id", id).eq("owner_id", adminOwnerId).select(reportColumns).maybeSingle();
  if (error || !data) return noStore({ error: databaseError(error, "Catatan gagal disimpan") }, { status: 500 });
  return noStore({ report: mapReport(data as Record<string, unknown>) });
}

export async function DELETE(request: Request) {
  const supabase = adminClient();
  if (!supabase) return noStore({ error: "Supabase riset laporan belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  const id = cleanText(body?.id, 100);
  if (!id) return noStore({ error: "ID laporan tidak valid." }, { status: 400 });
  const { data: report } = await supabase.from("financial_reports").select("storage_path,supporting_documents").eq("id", id).eq("owner_id", adminOwnerId).maybeSingle();
  const { data, error } = await supabase.from("financial_reports").delete().eq("id", id).eq("owner_id", adminOwnerId).select("id").maybeSingle();
  if (error || !data) return noStore({ error: databaseError(error, "Laporan gagal dihapus") }, { status: 500 });
  const supportingPaths = Array.isArray(report?.supporting_documents) ? report.supporting_documents.flatMap((value) => value && typeof value === "object" && "storagePath" in value ? [String(value.storagePath)] : []) : [];
  const paths = [report?.storage_path ? String(report.storage_path) : null, ...supportingPaths].filter((path): path is string => Boolean(path));
  if (paths.length) await supabase.storage.from("financial-reports").remove(paths);
  return noStore({ success: true });
}
