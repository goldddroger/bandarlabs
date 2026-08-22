import { timingSafeEqual } from "node:crypto";
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

function secretsMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const importSecret = process.env.OWNERSHIP_IMPORT_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !importSecret) {
    return NextResponse.json(
      { error: "Import belum dikonfigurasi. Tambahkan service role key dan ownership import secret di server." },
      { status: 503 },
    );
  }

  const suppliedSecret = request.headers.get("x-ownership-import-key") ?? "";
  if (!secretsMatch(suppliedSecret, importSecret)) {
    return NextResponse.json({ error: "Kunci admin import tidak valid." }, { status: 401 });
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

  if (error) {
    console.error("Ownership import failed", error);
    return NextResponse.json({ error: "Supabase menolak import. Periksa format file dan migration database." }, { status: 500 });
  }

  return NextResponse.json(data);
}
