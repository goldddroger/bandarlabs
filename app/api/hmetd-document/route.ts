import { extractText, getDocumentProxy } from "unpdf";
import { getRequestSession, unauthorizedResponseBody } from "@/lib/request-session";
import { hasFeaturePermission } from "@/lib/feature-permissions";
import { parseHmetdDocument } from "@/lib/hmetd-document-parser";
import { hmetdMaxBytes, hmetdMaxPages } from "@/types/hmetd-document";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = getRequestSession(request);
  if (!session) return Response.json(unauthorizedResponseBody(), { status: 401 });
  if (!hasFeaturePermission(session, "calculator") && !hasFeaturePermission(session, "stocks")) return Response.json({ error: "Akses kalkulator atau detail saham diperlukan." }, { status: 403 });
  if (Number(request.headers.get("content-length")) > hmetdMaxBytes + 64 * 1024) return Response.json({ error: "Maksimal satu PDF berukuran 4 MB." }, { status: 413 });
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    const form = await request.formData();
    const files = form.getAll("file");
    const file = files[0];
    if (files.length !== 1 || !(file instanceof File) || !/\.pdf$/i.test(file.name) || !file.size) return Response.json({ error: "Pilih satu file PDF keterbukaan HMETD." }, { status: 400 });
    if (file.size > hmetdMaxBytes) return Response.json({ error: "PDF terlalu besar. Maksimal 4 MB per dokumen." }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return Response.json({ error: "Isi file bukan PDF yang valid." }, { status: 422 });
    pdf = await getDocumentProxy(bytes, { disableFontFace: true });
    if (pdf.numPages > hmetdMaxPages) return Response.json({ error: `Maksimal ${hmetdMaxPages} halaman per PDF.` }, { status: 413 });
    const result = await extractText(pdf, { mergePages: false });
    if (result.text.join(" ").trim().length < 80) return Response.json({ error: "PDF tidak memiliki teks yang dapat dibaca. Gunakan PDF berbasis teks; dokumen scan memerlukan OCR terlebih dahulu." }, { status: 422 });
    if (result.text.reduce((length, page) => length + page.length, 0) > 1_500_000) return Response.json({ error: "Teks dokumen terlalu panjang untuk satu proses." }, { status: 413 });
    const document = parseHmetdDocument(file.name.slice(0, 240), result.text);
    return Response.json({ document }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error && error.message.startsWith("Dokumen tidak memuat") ? error.message : "PDF tidak dapat dibaca. Periksa apakah file rusak, terlindungi password, atau berupa scan.";
    return Response.json({ error: message }, { status: 422 });
  } finally {
    await pdf?.loadingTask.destroy().catch(() => undefined);
  }
}
