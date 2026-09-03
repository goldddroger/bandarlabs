import { NextResponse } from "next/server";
import { extractText } from "unpdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxFileSize = 15 * 1024 * 1024;
const months: Record<string, number> = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12 };

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isoDate(day: string, month: string, year: string) {
  const monthNumber = months[month.toLowerCase()];
  if (!monthNumber) return null;
  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function endOfMonthAfter(value: string, monthsAfter: number) {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month + monthsAfter, 0, 12)).toISOString().slice(0, 10);
}

function previousQuarterEnd(value: string) {
  const [year, month] = value.split("-").map(Number);
  const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
  const endMonth = quarterStartMonth - 1 || 12;
  const endYear = endMonth === 12 ? year - 1 : year;
  return new Date(Date.UTC(endYear, endMonth, 0, 12)).toISOString().slice(0, 10);
}

function metadataFromFilename(filename: string) {
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})_([A-Z]{4})(?:_|\b)/i);
  if (!match) return null;
  return {
    announcementDate: `${match[1]}-${match[2]}-${match[3]}`,
    ticker: match[4].toUpperCase(),
  };
}

function extractDate(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(match[1])) {
      const [day, month, year] = match[1].split("-");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    const date = isoDate(match[1], match[2], match[3]);
    if (date) return date;
  }
  return null;
}

function pageFor(pages: string[], pattern: RegExp) {
  const index = pages.findIndex((page) => pattern.test(page));
  return index < 0 ? 1 : index + 1;
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".pdf") || file.size < 1 || file.size > maxFileSize) return NextResponse.json({ error: "Pilih satu PDF rencana laporan audit maksimal 15 MB." }, { status: 400 });

  const extracted = await extractText(new Uint8Array(await file.arrayBuffer()));
  const pages = (Array.isArray(extracted.text) ? extracted.text : [extracted.text]).map(compact);
  const text = pages.join(" ");
  const filenameMetadata = metadataFromFilename(file.name);
  if (!text.trim()) {
    if (!filenameMetadata) return NextResponse.json({ error: "PDF berupa hasil scan dan metadata ticker atau tanggal tidak ditemukan pada nama file." }, { status: 422 });
    const periodEnd = previousQuarterEnd(filenameMetadata.announcementDate);
    return NextResponse.json({
      ticker: filenameMetadata.ticker,
      issuer: null,
      announcementDate: filenameMetadata.announcementDate,
      periodEnd,
      reportLabel: `Laporan Keuangan periode ${periodEnd} - Audit`,
      auditor: "",
      watchStart: addDays(filenameMetadata.announcementDate, 21),
      watchEnd: addDays(filenameMetadata.announcementDate, 28),
      statedDueDate: null,
      catalysts: [],
      sourceFile: file.name.slice(0, 180),
      sourcePage: 1,
      pageCount: extracted.totalPages,
      extractionMode: "filename",
      warnings: ["PDF berupa hasil scan. Tanggal dan ticker dibaca dari nama file, sedangkan periode laporan hanya saran berdasarkan kuartal sebelumnya. Periksa semua field sebelum mengaktifkan reminder."],
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }
  if (!/(?:rencana|berencana).{0,100}(?:laporan keuangan|audit)|laporan keuangan.{0,100}(?:diaudit|telah diaudit)/i.test(text)) return NextResponse.json({ error: "Dokumen tidak terdeteksi sebagai rencana penyampaian laporan keuangan audit." }, { status: 422 });

  const ticker = filenameMetadata?.ticker
    ?? file.name.match(/(?:^|_)([A-Z]{4})(?:_|\b)/)?.[1]
    ?? text.match(/(?:Kode Emiten|Issuer Code)\s+(?:Lampiran\s+Perihal\s+)?([A-Z]{4})\b/i)?.[1]?.toUpperCase()
    ?? text.match(/(?:Kode Emiten|Issuer Code)[\s\S]{0,180}?\b([A-Z]{4})\s+\d+\s+(?:Rencana|Submission Plan)/i)?.[1]?.toUpperCase()
    ?? null;
  const issuer = text.match(/(PT\s+[A-Z][A-Za-z0-9 .,&()-]{3,90}\s+Tbk\.?)/)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  const announcementDate = extractDate(text, [/(?:Jakarta,?\s*)?(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i, /Tanggal dan Waktu\s+(\d{1,2}-\d{1,2}-\d{4})/i]) ?? filenameMetadata?.announcementDate ?? null;
  let periodEnd = extractDate(text, [/(?:periode|period).{0,100}?berakhir pada tanggal\s+(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i]);
  const quarter = text.match(/(?:Kuartal|Quarter|Triwulan)\s+(I{1,3}|IV)\s+(?:(?:untuk\s+)?Tahun(?:\s+Buku)?\s+)?(\d{4})/i);
  if (!periodEnd && quarter) {
    const quarterEnd: Record<string, string> = { I: "03-31", II: "06-30", III: "09-30", IV: "12-31" };
    periodEnd = `${quarter[2]}-${quarterEnd[quarter[1].toUpperCase()]}`;
  }
  if (!ticker || !announcementDate || !periodEnd) return NextResponse.json({ error: "Ticker, tanggal pengumuman, atau periode laporan belum dapat diekstrak." }, { status: 422 });

  const extractedAuditor = text.match(/(?:diaudit oleh|audited by)\s+(?:Kantor Akuntan Publik\s+)?([^.]{3,120}?)(?:\.| Laporan| The financial)/i)?.[1]?.trim();
  const auditor = extractedAuditor && !/^Akuntan Publik\s+(?:sesuai|dalam rangka|yang akan)/i.test(extractedAuditor)
    ? extractedAuditor
    : /diaudit oleh Akuntan Publik/i.test(text) ? "Akuntan Publik (belum disebutkan)" : "";
  const thirdMonthDeadline = /akhir bulan ketiga setelah tanggal laporan keuangan interim/i.test(text);
  const statedDueDate = thirdMonthDeadline ? endOfMonthAfter(periodEnd, 3) : null;
  const catalystLabels = [
    [/divestasi/i, "Divestasi"],
    [/ekuitas.{0,80}negatif.{0,80}positif/i, "Potensi ekuitas kembali positif"],
    [/akuisisi|pengambilalihan/i, "Akuisisi"],
    [/HMETD|right issue/i, "Right issue"],
    [/restrukturisasi/i, "Restrukturisasi"],
    [/perubahan pengendali/i, "Perubahan pengendali"],
    [/rencana aksi korporasi/i, "Rencana aksi korporasi"],
  ] as const;
  const catalysts = catalystLabels.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  const reportLabel = quarter ? `Laporan Keuangan Kuartal ${quarter[1].toUpperCase()} ${quarter[2]} - Audit` : `Laporan Keuangan periode ${periodEnd} - Audit`;

  return NextResponse.json({
    ticker,
    issuer,
    announcementDate,
    periodEnd,
    reportLabel,
    auditor,
    watchStart: addDays(announcementDate, 21),
    watchEnd: addDays(announcementDate, 28),
    statedDueDate,
    catalysts,
    sourceFile: file.name.slice(0, 180),
    sourcePage: pageFor(pages, /rencana|berencana/i),
    pageCount: extracted.totalPages,
    extractionMode: "text",
    warnings: [],
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
