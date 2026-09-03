import { NextResponse } from "next/server";
import { extractText } from "unpdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxFiles = 4;
const maxFileSize = 15 * 1024 * 1024;
const maxTotalSize = 35 * 1024 * 1024;

type Evidence = { label: string; value: string; sourceFile: string; pageNumber: number };
type Finding = { tone: "positive" | "neutral" | "warning"; title: string; detail: string; points: number };
type TimelineEventType = "cum_right" | "ex_right" | "recording_date" | "trading_period" | "exercise_deadline" | "share_distribution";
type TimelineEvent = { type: TimelineEventType; label: string; date: string; endDate: string | null; sourceFile: string; pageNumber: number };

const monthNumbers: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseIndonesianNumber(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\./g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function pageFor(pages: string[], pattern: RegExp) {
  const index = pages.findIndex((page) => pattern.test(page));
  return index < 0 ? 1 : index + 1;
}

function percentFrom(text: string, patterns: RegExp[]) {
  const match = firstMatch(text, patterns);
  return match ? parseIndonesianNumber(match[1]) : null;
}

function numberFrom(text: string, patterns: RegExp[]) {
  const match = firstMatch(text, patterns);
  return match ? parseIndonesianNumber(match[1]) : null;
}

function amountLabel(value: number | null) {
  return value === null ? null : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

function isoDate(day: string, month: string, year: string) {
  const monthNumber = monthNumbers[month.toLowerCase()];
  if (!monthNumber) return null;
  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

function timelineDateNear(
  documents: Array<{ name: string; pages: string[] }>,
  labelPattern: RegExp,
  preferRange = false,
) {
  let singleFallback: { date: string; endDate: null; sourceFile: string; pageNumber: number } | null = null;
  for (const document of documents) {
    for (let pageIndex = 0; pageIndex < document.pages.length; pageIndex += 1) {
      const page = document.pages[pageIndex];
      const labelMatch = page.match(labelPattern);
      if (!labelMatch || labelMatch.index === undefined) continue;
      const nearby = page.slice(labelMatch.index + labelMatch[0].length, labelMatch.index + labelMatch[0].length + 220);
      const range = nearby.match(/(\d{1,2})\s*(?:-|–|—|sampai dengan|s\.d\.)\s*(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i);
      const single = nearby.match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i);
      if (range && (!single || (range.index ?? Infinity) <= (single.index ?? Infinity))) {
        const date = isoDate(range[1], range[3], range[4]);
        const endDate = isoDate(range[2], range[3], range[4]);
        if (date && endDate) return { date, endDate, sourceFile: document.name, pageNumber: pageIndex + 1 };
      }
      if (single) {
        const date = isoDate(single[1], single[2], single[3]);
        if (date) {
          const result = { date, endDate: null, sourceFile: document.name, pageNumber: pageIndex + 1 };
          if (!preferRange) return result;
          singleFallback ??= result;
        }
      }
    }
  }
  return singleFallback;
}

function extractTimeline(documents: Array<{ name: string; pages: string[] }>) {
  const definitions: Array<{ type: Exclude<TimelineEventType, "exercise_deadline">; label: string; pattern: RegExp; preferRange?: boolean }> = [
    { type: "cum_right", label: "Cum-right Pasar Reguler", pattern: /Cum[- ](?:HMETD|Right)(?:\)| di)?[\s\S]{0,80}?Pasar Reguler(?: dan Pasar Negosiasi)?/i },
    { type: "ex_right", label: "Ex-right Pasar Reguler", pattern: /Ex[- ](?:HMETD|Right)(?:\)| di)?[\s\S]{0,80}?Pasar Reguler(?: dan Pasar Negosiasi)?/i },
    { type: "recording_date", label: "Recording date HMETD", pattern: /(?:Tanggal Pencatatan\s*\(Recording Date\)\s*(?:Untuk Memperoleh HMETD)?|Daftar Pemegang Saham yang Berhak (?:Memperoleh )?HMETD)/i },
    { type: "trading_period", label: "Perdagangan dan pelaksanaan HMETD", pattern: /Periode Perdagangan(?: dan Pelaksanaan)? HMETD/i, preferRange: true },
    { type: "share_distribution", label: "Distribusi saham baru", pattern: /(?:Periode )?(?:Distribusi Saham Hasil (?:HMETD|Penjatahan)|Penyerahan Saham Hasil Pelaksanaan HMETD)/i, preferRange: true },
  ];
  const events: TimelineEvent[] = [];
  for (const definition of definitions) {
    const found = timelineDateNear(documents, definition.pattern, definition.preferRange);
    if (found) events.push({ type: definition.type, label: definition.label, ...found });
  }
  const trading = events.find((event) => event.type === "trading_period");
  if (trading) events.push({
    type: "exercise_deadline",
    label: "Batas akhir penebusan HMETD",
    date: trading.endDate ?? trading.date,
    endDate: null,
    sourceFile: trading.sourceFile,
    pageNumber: trading.pageNumber,
  });
  return events.sort((first, second) => first.date.localeCompare(second.date) || first.label.localeCompare(second.label));
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const files = formData?.getAll("files").filter((item): item is File => item instanceof File) ?? [];
  if (files.length < 1 || files.length > maxFiles) return NextResponse.json({ error: `Unggah 1-${maxFiles} dokumen PDF.` }, { status: 400 });
  if (files.some((file) => !file.name.toLowerCase().endsWith(".pdf") || file.size < 1 || file.size > maxFileSize)) return NextResponse.json({ error: "Setiap dokumen harus PDF maksimal 15 MB." }, { status: 400 });
  if (files.reduce((total, file) => total + file.size, 0) > maxTotalSize) return NextResponse.json({ error: "Total dokumen maksimal 35 MB." }, { status: 400 });

  const documents: Array<{ name: string; pages: string[]; pageCount: number }> = [];
  for (const file of files) {
    const extracted = await extractText(new Uint8Array(await file.arrayBuffer()));
    const pages = (Array.isArray(extracted.text) ? extracted.text : [extracted.text]).map(compact);
    documents.push({ name: file.name.slice(0, 180), pages, pageCount: extracted.totalPages });
  }

  const merged = documents.flatMap((document) => document.pages).join(" ");
  if (!/HMETD|PMHMETD|hak memesan efek terlebih dahulu|right issue/i.test(merged)) return NextResponse.json({ error: "Dokumen tidak terdeteksi sebagai keterbukaan right issue/HMETD." }, { status: 422 });

  const ticker = files.map((file) => file.name.match(/(?:^|_)([A-Z]{4})(?:_|\b)/)?.[1]).find(Boolean) ?? null;
  const issuerMatch = firstMatch(merged, [/(PT\s+[A-Z][A-Za-z0-9 .,&()-]{3,90}\s+Tbk)/, /(PT\s+[A-Z][A-Z0-9 .,&()-]{3,90}\s+TBK)/]);
  const issuer = issuerMatch?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  const newShares = numberFrom(merged, [/(?:menawarkan|menerbitkan|HMETD sebanyak-banyaknya)\D{0,90}([\d.]{5,})\s*(?:\([^)]*\)\s*)?saham/i]);
  const dilution = percentFrom(merged, [/(?:dilusi|penurunan (?:persentase|presentasi) kepemilikan)\D{0,100}(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i, /mewakili sebanyak-banyaknya\D{0,50}(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i]);
  const exercisePrice = numberFrom(merged, [/harga pelaksanaan(?: sebesar)?\s*Rp\s*([\d.]+)/i, /harga tebus(?: sebesar)?\s*Rp\s*([\d.]+)/i]);
  const ratioMatch = firstMatch(merged, [/setiap pemegang\s+(\d+)\s*\([^)]*\)?\s*saham lama[\s\S]{0,220}?(?:berhak atas|memperoleh)\s+(?:sebanyak\s+)?(\d+)\s*\([^)]*\)?\s*(?:HMETD|Hak Memesan Efek Terlebih Dahulu)/i, /rasio HMETD atas saham\D{0,200}?(\d+)\s+saham lama[\s\S]{0,150}?(\d+)\s*(?:HMETD|Hak Memesan Efek Terlebih Dahulu)/i]);
  const ratioOld = ratioMatch ? Number(ratioMatch[1]) : null;
  const ratioNew = ratioMatch ? Number(ratioMatch[2]) : null;
  const hasWarrants = /waran seri/i.test(merged);
  const proposalOnly = /harga pelaksanaan (?:final )?.{0,80}(?:akan ditentukan|belum ditentukan)/i.test(merged) || /seluruh informasi.{0,120}hanyalah merupakan usulan/i.test(merged);
  const hasStandbyBuyer = /pembeli siaga/i.test(merged);
  const controllerCommitment = /pemegang saham (?:utama dan )?pengendali[\s\S]{0,1600}(?:akan melaksanakan|menyatakan.{0,180}melaksanakan|mengambil bagian)/i.test(merged);
  const debtUse = /(?:pembayaran|pelunasan|konversi).{0,80}(?:utang|pinjaman|hak tagih|MTN)/i.test(merged);
  const productiveUse = /(?:belanja modal|capex|pembangunan|ekspansi|pengembangan usaha|akuisisi|pengambilalihan saham)/i.test(merged);
  const workingCapitalUse = /modal kerja|opex/i.test(merged);
  const relatedPartyUse = /(?:penggunaan dana|pengambilalihan|transaksi)[\s\S]{0,180}(?:merupakan transaksi afiliasi|kepada pihak berelasi)/i.test(merged)
    && !/(?:bukan|tidak) merupakan transaksi afiliasi/i.test(merged);
  const detailedUse = /rencana penggunaan dana[\s\S]{0,2500}(?:sebesar Rp|sebesar kurang lebih|sekitar \d{1,3}%)/i.test(merged);

  const findings: Finding[] = [];
  if (productiveUse && detailedUse) findings.push({ tone: "positive", title: "Penggunaan dana produktif dan cukup spesifik", detail: "Dokumen merinci penggunaan dana untuk ekspansi, aset, akuisisi, atau belanja modal. Nilai tambah tetap perlu diuji terhadap proyeksi imbal hasil dan waktu realisasi.", points: 18 });
  else if (productiveUse) findings.push({ tone: "neutral", title: "Ada tujuan ekspansi, tetapi detail masih terbatas", detail: "Arah penggunaan dana terlihat produktif, namun nominal, target proyek, atau jadwal realisasinya belum lengkap.", points: 5 });
  if (debtUse) findings.push({ tone: "neutral", title: "Sebagian dana memperbaiki struktur utang", detail: "Pelunasan atau konversi utang dapat memperbaiki leverage dan beban keuangan, tetapi bagian konversi tidak selalu menghasilkan kas baru.", points: 6 });
  if (workingCapitalUse && !detailedUse) findings.push({ tone: "warning", title: "Penggunaan modal kerja masih umum", detail: "Istilah modal kerja tanpa rincian alokasi menyulitkan pengukuran dampak terhadap laba dan arus kas.", points: -10 });
  if (controllerCommitment) findings.push({ tone: "positive", title: "Pengendali menyatakan akan mengambil hak", detail: "Komitmen pemegang saham pengendali mengurangi risiko tidak terserap dan menunjukkan dukungan pendanaan.", points: 12 });
  else findings.push({ tone: "warning", title: "Komitmen pengendali belum terdeteksi", detail: "Periksa prospektus final untuk memastikan jumlah hak yang benar-benar akan diambil pengendali.", points: -7 });
  if (hasStandbyBuyer) findings.push({ tone: "positive", title: "Terdapat pembeli siaga", detail: "Pembeli siaga mengurangi risiko sisa saham tidak terserap. Kapasitas dana dan afiliasinya tetap perlu diperiksa.", points: 8 });
  if (dilution !== null && dilution > 50) findings.push({ tone: "warning", title: `Dilusi maksimum sangat tinggi (${dilution.toFixed(2)}%)`, detail: "Pemegang saham yang tidak menebus hak dapat mengalami penurunan porsi kepemilikan yang material.", points: -28 });
  else if (dilution !== null && dilution > 25) findings.push({ tone: "warning", title: `Dilusi maksimum tinggi (${dilution.toFixed(2)}%)`, detail: "Kebutuhan modal untuk mempertahankan porsi kepemilikan cukup besar.", points: -15 });
  else if (dilution !== null) findings.push({ tone: "neutral", title: `Dilusi maksimum ${dilution.toFixed(2)}%`, detail: "Dilusi perlu dibandingkan dengan potensi kenaikan laba atau penurunan utang setelah dana digunakan.", points: -5 });
  if (hasWarrants) findings.push({ tone: "warning", title: "Right issue disertai waran", detail: "Waran dapat menambah dilusi lanjutan ketika dieksekusi dan menciptakan tambahan suplai saham.", points: -10 });
  if (relatedPartyUse) findings.push({ tone: "warning", title: "Ada konteks transaksi afiliasi/pihak berelasi", detail: "Periksa kewajaran harga, penilai independen, dan manfaat ekonominya bagi pemegang saham publik.", points: -8 });
  if (proposalOnly) findings.push({ tone: "warning", title: "Dokumen masih tahap usulan", detail: "Harga, rasio, jumlah final, atau jadwal dapat berubah. Kesimpulan perlu diperbarui setelah prospektus final terbit.", points: -12 });
  else if (exercisePrice !== null && ratioOld && ratioNew) findings.push({ tone: "positive", title: "Struktur utama sudah final dan dapat dihitung", detail: "Harga pelaksanaan dan rasio tersedia sehingga kebutuhan modal, TERP, dan nilai hak dapat diuji.", points: 7 });

  const rawScore = 50 + findings.reduce((total, finding) => total + finding.points, 0);
  const score = Math.max(0, Math.min(100, rawScore));
  const verdict = score >= 68 ? "positive" : score >= 45 ? "mixed" : "caution";
  const confidence = proposalOnly || dilution === null || exercisePrice === null ? "medium" : documents.some((document) => document.pageCount >= 10) ? "high" : "medium";

  const evidence: Evidence[] = [];
  const timeline = extractTimeline(documents);
  const evidenceSource = (pattern: RegExp) => documents.find((document) => document.pages.some((page) => pattern.test(page))) ?? documents[0];
  if (newShares !== null) { const source = evidenceSource(/jumlah saham baru|menerbitkan HMETD|menawarkan sebanyak/i); evidence.push({ label: "Maksimum saham baru", value: `${amountLabel(newShares)} lembar`, sourceFile: source.name, pageNumber: pageFor(source.pages, /jumlah saham baru|menerbitkan HMETD|menawarkan sebanyak/i) }); }
  if (dilution !== null) { const source = evidenceSource(/dilusi|penurunan (?:persentase|presentasi) kepemilikan/i); evidence.push({ label: "Dilusi maksimum", value: `${dilution.toFixed(2)}%`, sourceFile: source.name, pageNumber: pageFor(source.pages, /dilusi|penurunan (?:persentase|presentasi) kepemilikan/i) }); }
  if (exercisePrice !== null) { const source = evidenceSource(/harga pelaksanaan/i); evidence.push({ label: "Harga pelaksanaan", value: `Rp ${amountLabel(exercisePrice)}`, sourceFile: source.name, pageNumber: pageFor(source.pages, /harga pelaksanaan/i) }); }
  if (ratioOld && ratioNew) { const source = evidenceSource(/rasio HMETD|setiap pemegang.+saham lama/i); evidence.push({ label: "Rasio HMETD", value: `${ratioOld}:${ratioNew}`, sourceFile: source.name, pageNumber: pageFor(source.pages, /rasio HMETD|setiap pemegang.+saham lama/i) }); }

  return NextResponse.json({
    ticker, issuer, score, verdict, confidence, stage: proposalOnly ? "proposal" : "final_or_advanced",
    facts: { newShares, dilution, exercisePrice, ratioOld, ratioNew, hasWarrants, hasStandbyBuyer, controllerCommitment, productiveUse, debtUse, workingCapitalUse },
    findings, evidence, timeline,
    documents: documents.map((document) => ({ name: document.name, pageCount: document.pageCount })),
    disclaimer: "Analisis berbasis isi dokumen dan bersifat alat bantu riset, bukan rekomendasi jual atau beli.",
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
