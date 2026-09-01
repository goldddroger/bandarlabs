import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxFiles = 3;
const maxFileSize = 10 * 1024 * 1024;
const maxTotalSize = 20 * 1024 * 1024;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

function validTicker(value: unknown) {
  const ticker = String(value ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{4,8}$/.test(ticker) ? ticker : "";
}

function validPeriod(value: unknown) {
  const period = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(period) ? period : "";
}

function safeName(value: unknown) {
  return String(value ?? "").replace(/[^A-Za-z0-9._-]/g, "-").slice(-160);
}

export async function POST(request: Request) {
  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as { ticker?: unknown; periodEnd?: unknown; files?: Array<{ name?: unknown; size?: unknown }> } | null;
  const ticker = validTicker(body?.ticker);
  const periodEnd = validPeriod(body?.periodEnd);
  const files = Array.isArray(body?.files) ? body.files : [];
  if (!ticker || !periodEnd || files.length < 1 || files.length > maxFiles) return NextResponse.json({ error: "Permintaan upload PDF tidak valid." }, { status: 400 });
  const normalized = files.map((file) => ({ name: safeName(file.name), size: Number(file.size) }));
  if (normalized.some((file) => !file.name.toLowerCase().endsWith(".pdf") || !Number.isFinite(file.size) || file.size < 1 || file.size > maxFileSize)) return NextResponse.json({ error: "Setiap file harus berupa PDF maksimal 10 MB." }, { status: 400 });
  if (normalized.reduce((sum, file) => sum + file.size, 0) > maxTotalSize) return NextResponse.json({ error: "Total PDF maksimal 20 MB." }, { status: 400 });

  const uploads = [];
  for (const file of normalized) {
    const path = `admin/${ticker}/${periodEnd}/supporting/${crypto.randomUUID()}-${file.name}`;
    const { data, error } = await supabase.storage.from("financial-reports").createSignedUploadUrl(path);
    if (error || !data) {
      const paths = uploads.map((upload) => upload.path);
      if (paths.length) await supabase.storage.from("financial-reports").remove(paths);
      return NextResponse.json({ error: error?.message || "URL upload PDF gagal dibuat." }, { status: 500 });
    }
    uploads.push({ name: file.name, size: file.size, path: data.path, token: data.token });
  }
  return NextResponse.json({ uploads }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as { paths?: unknown[] } | null;
  const paths = (Array.isArray(body?.paths) ? body.paths : []).map(String).filter((path) => /^admin\/[A-Z0-9]{4,8}\/\d{4}-\d{2}-\d{2}\/supporting\/[A-Za-z0-9._-]+$/.test(path)).slice(0, maxFiles);
  if (paths.length) await supabase.storage.from("financial-reports").remove(paths);
  return NextResponse.json({ success: true });
}
