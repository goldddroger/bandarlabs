import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { InvestorClassificationImportRow } from "@/lib/ownership-classification";

export const runtime = "nodejs";

type ImportRequest = {
  reportDate?: string;
  sourceFile?: string;
  rows?: InvestorClassificationImportRow[];
};

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: "Import belum dikonfigurasi pada server." }, { status: 503 });

  const body = await request.json().catch(() => null) as ImportRequest | null;
  const reportDate = body?.reportDate ?? "";
  const sourceFile = body?.sourceFile?.trim() ?? "";
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  const invalid = !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)
    || !sourceFile
    || rows.length < 1
    || rows.length > 2000
    || rows.some((row) => !/^[A-Z0-9]{4,8}$/.test(row.ticker) || !row.issuer_name?.trim() || row.report_date !== reportDate || row.total_scripless <= 0 || !row.holdings || typeof row.holdings !== "object" || Object.values(row.holdings).some((value) => !Number.isFinite(value) || value < 0));
  if (invalid) return NextResponse.json({ error: "Metadata atau data klasifikasi investor tidak valid." }, { status: 400 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase.rpc("replace_ownership_classification", {
    p_report_date: reportDate,
    p_rows: rows,
    p_source_file: sourceFile.slice(0, 255),
  });
  if (error) {
    console.error("Ownership classification import failed", error.code, error.message, error.details);
    const migrationMissing = ["PGRST202", "42P01"].includes(error.code);
    return NextResponse.json({ error: migrationMissing ? "Migration klasifikasi investor belum dijalankan di Supabase." : `Supabase menolak import: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json(data);
}
