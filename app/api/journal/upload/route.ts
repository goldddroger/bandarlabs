import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { journalServerConfig } from "@/lib/journal-server";

export const runtime = "nodejs";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const config = journalServerConfig();
  if (!config) return NextResponse.json({ error: "Upload jurnal belum dikonfigurasi pada server." }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const entryId = String(form?.get("entryId") ?? "");
  const file = form?.get("file");
  if (!entryId || !(file instanceof File) || !allowedTypes.has(file.type) || file.size < 1 || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Gambar harus JPG, PNG, WebP, atau GIF dengan ukuran maksimal 8 MB." }, { status: 400 });
  }
  const { data: entry } = await config.supabase.from("journal_entries").select("id").eq("id", entryId).maybeSingle();
  if (!entry) return NextResponse.json({ error: "Jurnal tujuan tidak ditemukan." }, { status: 404 });

  const extension = file.name.split(".").at(-1)?.toLowerCase().replace(/[^a-z0-9]/g, "") || "image";
  const storagePath = `${entryId}/${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: storageError } = await config.supabase.storage.from("journal-media").upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (storageError) return NextResponse.json({ error: "Gambar gagal diunggah ke Supabase Storage." }, { status: 500 });

  const { data: attachment, error: databaseError } = await config.supabase.from("journal_attachments").insert({ entry_id: entryId, file_name: file.name.slice(0, 180), storage_path: storagePath, mime_type: file.type, size_bytes: file.size }).select("*").single();
  if (databaseError) {
    await config.supabase.storage.from("journal-media").remove([storagePath]);
    return NextResponse.json({ error: "Metadata gambar gagal disimpan." }, { status: 500 });
  }
  const { data: signed } = await config.supabase.storage.from("journal-media").createSignedUrl(storagePath, 3600);
  return NextResponse.json({ attachment: { ...attachment, signed_url: signed?.signedUrl ?? null } }, { status: 201 });
}
