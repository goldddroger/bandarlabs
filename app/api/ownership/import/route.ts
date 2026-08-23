import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { OwnershipImportRow } from "@/lib/ownership-import";

export const runtime = "nodejs";

type ImportRequest = {
  threshold?: number;
  reportDate?: string;
  sourceFile?: string;
  rows?: OwnershipImportRow[];
};

const batchSize = 500;

function batches<T>(items: T[]) {
  return Array.from(
    { length: Math.ceil(items.length / batchSize) },
    (_, index) => items.slice(index * batchSize, (index + 1) * batchSize),
  );
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Import belum dikonfigurasi. Tambahkan Supabase service role key di server." },
      { status: 503 },
    );
  }

  let body: ImportRequest;
  try {
    body = (await request.json()) as ImportRequest;
  } catch {
    return NextResponse.json({ error: "Payload import tidak valid." }, { status: 400 });
  }

  const { threshold, reportDate, sourceFile, rows } = body;
  if (
    (threshold !== 1 && threshold !== 5)
    || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate ?? "")
    || !sourceFile?.trim()
    || !Array.isArray(rows)
    || rows.length < 1
    || rows.length > 15000
    || rows.some((row) => (
      !row.ticker?.trim()
      || !row.issuer_name?.trim()
      || !row.investor_name?.trim()
      || row.shares <= 0
      || row.percentage <= 0
      || row.report_date !== reportDate
    ))
  ) {
    return NextResponse.json({ error: "Metadata atau jumlah baris import tidak valid." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc("replace_shareholder_ownership", {
    p_threshold: threshold,
    p_report_date: reportDate,
    p_rows: rows,
    p_source_file: sourceFile.slice(0, 255),
  });

  if (!error) {
    return NextResponse.json(data);
  }

  if (error.code !== "PGRST202") {
    console.error("Ownership import failed", error.code, error.message, error.details);
    return NextResponse.json(
      { error: `Supabase menolak import: ${error.message}` },
      { status: 500 },
    );
  }

  // Keep imports usable while the remote project has not applied the RPC migration yet.
  const stocks = Array.from(
    new Map(rows.map((row) => [row.ticker, { ticker: row.ticker, name: row.issuer_name }])).values(),
  );
  for (const stockBatch of batches(stocks)) {
    const stockResult = await supabase.from("stocks").upsert(stockBatch, { onConflict: "ticker" });
    if (stockResult.error) {
      console.error("Ownership stock sync failed", stockResult.error.code, stockResult.error.message);
      return NextResponse.json({ error: `Sinkronisasi emiten gagal: ${stockResult.error.message}` }, { status: 500 });
    }
  }

  const deleteResult = await supabase
    .from("shareholder_ownership")
    .delete()
    .eq("disclosure_threshold", threshold)
    .eq("report_date", reportDate);
  if (deleteResult.error) {
    console.error("Ownership snapshot cleanup failed", deleteResult.error.code, deleteResult.error.message);
    return NextResponse.json({ error: `Snapshot lama gagal disiapkan: ${deleteResult.error.message}` }, { status: 500 });
  }

  const ownershipRows = rows.map((row) => ({ ...row, disclosure_threshold: threshold }));
  let importedCount = 0;
  for (const ownershipBatch of batches(ownershipRows)) {
    const insertResult = await supabase.from("shareholder_ownership").insert(ownershipBatch);
    if (insertResult.error) {
      await supabase
        .from("shareholder_ownership")
        .delete()
        .eq("disclosure_threshold", threshold)
        .eq("report_date", reportDate);
      console.error("Ownership batch import failed", insertResult.error.code, insertResult.error.message, insertResult.error.details);
      return NextResponse.json({ error: `Import baris ownership gagal: ${insertResult.error.message}` }, { status: 500 });
    }
    importedCount += ownershipBatch.length;
  }

  const runResult = await supabase.from("ownership_import_runs").insert({
    disclosure_threshold: threshold,
    report_date: reportDate,
    source_file: sourceFile.slice(0, 255),
    row_count: importedCount,
  });
  if (runResult.error && !["42P01", "PGRST205"].includes(runResult.error.code)) {
    console.warn("Ownership import history was not saved", runResult.error.code, runResult.error.message);
  }

  return NextResponse.json({ importedCount, threshold, reportDate, mode: "batch-fallback" });
}
