import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { FcaEpisode } from "@/lib/fca-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Import FCA belum dikonfigurasi pada server." }, { status: 503 });
  }

  let body: { sourceDate?: string; sourceFile?: string; rows?: FcaEpisode[] };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Payload import tidak valid." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.sourceDate ?? "") || !body.sourceFile?.trim() || !Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > 5000) {
    return NextResponse.json({ error: "Metadata atau jumlah baris FCA tidak valid." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase.rpc("replace_fca_episodes", {
    p_source_date: body.sourceDate,
    p_source_file: body.sourceFile.slice(0, 255),
    p_rows: body.rows,
  });
  if (error) {
    console.error("FCA import failed", error);
    return NextResponse.json({ error: "Supabase menolak import FCA. Pastikan migration terbaru sudah dijalankan." }, { status: 500 });
  }
  return NextResponse.json(data);
}
