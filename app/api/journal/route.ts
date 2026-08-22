import { NextResponse } from "next/server";
import { journalCategories, type JournalAttachment, type JournalEntry, type JournalPayload } from "@/lib/journal";
import { journalAccessKey, journalKeyMatches, journalServerConfig } from "@/lib/journal-server";

export const runtime = "nodejs";

function authorize(request: Request) {
  const config = journalServerConfig();
  if (!config) return { response: NextResponse.json({ error: "Jurnal belum dikonfigurasi pada server." }, { status: 503 }) };
  if (!journalKeyMatches(journalAccessKey(request), config.accessKey)) {
    return { response: NextResponse.json({ error: "Kunci akses jurnal tidak valid." }, { status: 401 }) };
  }
  return { config };
}

function normalizePayload(value: unknown): JournalPayload | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Partial<JournalPayload>;
  const title = String(body.title ?? "").trim().slice(0, 180);
  const content = String(body.content ?? "").trim().slice(0, 50_000);
  const sourceName = String(body.source_name ?? "").trim().slice(0, 120);
  const category = journalCategories.includes(body.category as JournalPayload["category"]) ? body.category as JournalPayload["category"] : null;
  const journalDate = String(body.journal_date ?? "");
  if (!title || !category || !/^\d{4}-\d{2}-\d{2}$/.test(journalDate)) return null;
  const cleanList = (items: unknown, pattern?: RegExp) => Array.isArray(items)
    ? Array.from(new Set(items.map((item) => String(item).trim()).filter((item) => item && (!pattern || pattern.test(item))).slice(0, 20)))
    : [];
  return {
    title,
    content,
    source_name: sourceName,
    category,
    ticker_symbols: cleanList(body.ticker_symbols, /^[A-Z0-9]{2,12}$/).map((ticker) => ticker.toUpperCase()),
    tags: cleanList(body.tags).map((tag) => tag.slice(0, 40)),
    journal_date: journalDate,
    pinned: Boolean(body.pinned),
  };
}

async function withSignedUrls(entries: JournalEntry[], supabase: NonNullable<ReturnType<typeof journalServerConfig>>["supabase"]) {
  return Promise.all(entries.map(async (entry) => ({
    ...entry,
    journal_attachments: await Promise.all((entry.journal_attachments ?? []).map(async (attachment: JournalAttachment) => {
      const { data } = await supabase.storage.from("journal-media").createSignedUrl(attachment.storage_path, 3600);
      return { ...attachment, signed_url: data?.signedUrl ?? null };
    })),
  })));
}

export async function GET(request: Request) {
  const auth = authorize(request);
  if ("response" in auth) return auth.response;
  const { data, error } = await auth.config.supabase
    .from("journal_entries")
    .select("*,journal_attachments(*)")
    .order("pinned", { ascending: false })
    .order("journal_date", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Jurnal gagal dimuat. Pastikan migration jurnal sudah dijalankan." }, { status: 500 });
  return NextResponse.json({ entries: await withSignedUrls((data ?? []) as JournalEntry[], auth.config.supabase) });
}

export async function POST(request: Request) {
  const auth = authorize(request);
  if ("response" in auth) return auth.response;
  const payload = normalizePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Isi jurnal belum valid." }, { status: 400 });
  const { data, error } = await auth.config.supabase.from("journal_entries").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: "Jurnal gagal disimpan." }, { status: 500 });
  return NextResponse.json({ entry: { ...data, journal_attachments: [] } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = authorize(request);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as ({ id?: string } & Partial<JournalPayload>) | null;
  const payload = normalizePayload(body);
  if (!body?.id || !payload) return NextResponse.json({ error: "Perubahan jurnal belum valid." }, { status: 400 });
  const { error } = await auth.config.supabase.from("journal_entries").update(payload).eq("id", body.id);
  if (error) return NextResponse.json({ error: "Perubahan jurnal gagal disimpan." }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const auth = authorize(request);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as { id?: string; attachmentId?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "ID jurnal tidak valid." }, { status: 400 });

  if (body.attachmentId) {
    const { data } = await auth.config.supabase.from("journal_attachments").select("storage_path").eq("id", body.attachmentId).eq("entry_id", body.id).maybeSingle();
    if (data?.storage_path) await auth.config.supabase.storage.from("journal-media").remove([data.storage_path]);
    const { error } = await auth.config.supabase.from("journal_attachments").delete().eq("id", body.attachmentId).eq("entry_id", body.id);
    return error ? NextResponse.json({ error: "Lampiran gagal dihapus." }, { status: 500 }) : NextResponse.json({ success: true });
  }

  const { data: attachments } = await auth.config.supabase.from("journal_attachments").select("storage_path").eq("entry_id", body.id);
  const paths = (attachments ?? []).map((attachment) => attachment.storage_path);
  if (paths.length > 0) await auth.config.supabase.storage.from("journal-media").remove(paths);
  const { error } = await auth.config.supabase.from("journal_entries").delete().eq("id", body.id);
  return error ? NextResponse.json({ error: "Jurnal gagal dihapus." }, { status: 500 }) : NextResponse.json({ success: true });
}
