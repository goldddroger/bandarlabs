import { NextResponse } from "next/server";
import { extractText } from "unpdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DocumentText = { name: string; pages: string[]; pageCount: number; readable: boolean };
type Evidence = { label: string; value: string; sourceFile: string; pageNumber: number };
type TimelineEvent = { type: "rups_approval" | "execution_deadline" | "funding" | "distribution" | "listing" | "result_announcement"; label: string; date: string; endDate: null; sourceFile: string; pageNumber: number };

const months: Record<string, number> = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12 };
const maxFiles = 8;
const maxFileSize = 15 * 1024 * 1024;
const maxTotalSize = 55 * 1024 * 1024;

function compact(value: string) { return value.replace(/\s+/g, " ").trim(); }
function parseNumber(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  const commaParts = cleaned.split(",");
  const normalized = cleaned.includes(",")
    ? commaParts.length > 2 || commaParts.at(-1)?.length === 3
      ? cleaned.replace(/[.,]/g, "")
      : cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\./g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
function numberFrom(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) { const match = text.match(pattern); if (match) return parseNumber(match[1]); }
  return null;
}
function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) { const match = text.match(pattern); if (match) return match; }
  return null;
}
function allNumbers(text: string, pattern: RegExp) {
  return Array.from(text.matchAll(pattern)).map((match) => parseNumber(match[1])).filter((value): value is number => value !== null && value >= 100_000);
}
function idNumber(value: number | null) { return value === null ? "-" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value); }
function isoDate(day: string, month: string, year: string) {
  const monthNumber = months[month.toLowerCase()];
  return monthNumber ? `${year}-${String(monthNumber).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}` : null;
}
function pageFor(documents: DocumentText[], pattern: RegExp) {
  for (const document of documents) {
    const pageIndex = document.pages.findIndex((page) => pattern.test(page));
    if (pageIndex >= 0) return { sourceFile: document.name, pageNumber: pageIndex + 1 };
  }
  return { sourceFile: documents[0]?.name ?? "Dokumen", pageNumber: 1 };
}
function timelineNear(documents: DocumentText[], type: TimelineEvent["type"], label: string, pattern: RegExp) {
  for (const document of documents) for (let index = 0; index < document.pages.length; index += 1) {
    const page = document.pages[index];
    const hit = page.match(pattern);
    if (!hit || hit.index === undefined) continue;
    const nearby = page.slice(Math.max(0, hit.index - 80), hit.index + hit[0].length + 220);
    const date = nearby.match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(20\d{2})/i);
    const value = date ? isoDate(date[1], date[2], date[3]) : null;
    if (value) return { type, label, date: value, endDate: null, sourceFile: document.name, pageNumber: index + 1 } satisfies TimelineEvent;
  }
  return null;
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const files = formData?.getAll("files").filter((item): item is File => item instanceof File) ?? [];
  if (files.length < 1 || files.length > maxFiles) return NextResponse.json({ error: `Unggah 1-${maxFiles} dokumen PDF.` }, { status: 400 });
  if (files.some((file) => !file.name.toLowerCase().endsWith(".pdf") || file.size < 1 || file.size > maxFileSize)) return NextResponse.json({ error: "Setiap dokumen harus PDF maksimal 15 MB." }, { status: 400 });
  if (files.reduce((sum, file) => sum + file.size, 0) > maxTotalSize) return NextResponse.json({ error: "Total dokumen maksimal 55 MB." }, { status: 400 });

  const documents: DocumentText[] = [];
  for (const file of files) {
    const extracted = await extractText(new Uint8Array(await file.arrayBuffer()));
    const pages = (Array.isArray(extracted.text) ? extracted.text : [extracted.text]).map(compact);
    documents.push({ name: file.name.slice(0, 180), pages, pageCount: extracted.totalPages, readable: pages.join(" ").length >= 120 });
  }
  const merged = documents.flatMap((document) => document.pages).join(" ");
  const administrativeProof = /PENYAMPAIAN BUKTI[\s\S]{0,120}(?:PENGUMUMAN|KETERBUKAAN INFORMASI)/i.test(merged);
  if (!/PMTHMETD|penambahan modal tanpa (?:memberikan )?hak memesan|saham tanpa HMETD/i.test(merged) && !administrativeProof) {
    if (documents.every((document) => !document.readable)) return NextResponse.json({ error: "PDF berupa hasil scan dan tidak memiliki lapisan teks. Gabungkan dengan keterbukaan/prospektus yang dapat diseleksi teksnya." }, { status: 422 });
    return NextResponse.json({ error: "Dokumen tidak terdeteksi sebagai keterbukaan Private Placement/PMTHMETD." }, { status: 422 });
  }

  const ticker = files.map((file) => file.name.match(/(?:^|_)([A-Z]{4})(?:_|\b)/)?.[1]).find(Boolean) ?? null;
  const issuer = firstMatch(merged, [/(PT\s+[A-Z][A-Za-z0-9 .,&()-]{3,90}\s+Tbk)/, /(PT\s+[A-Z][A-Z0-9 .,&()-]{3,90}\s+TBK)/])?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  const completed = /pengumuman hasil (?:PMTHMETD|PMTMETD)|telah dilaksanakan seluruhnya|pelaksanaan PMTHMETD tersebut telah dilaksanakan dengan perincian/i.test(merged);
  const revision = /(?:^|[_\s-])revisi(?:[_\s-]|$)/i.test(files.map((file) => file.name).join(" ")) || /revisi atas rincian/i.test(merged.slice(0, 2500));
  const approved = /telah mendapat persetujuan dari.{0,80}pemegang saham|RUPSLB Perseroan yang telah diselenggarakan/i.test(merged);
  const proposal = !completed && /bermaksud|berencana|sebanyak-banyaknya|calon investor belum/i.test(merged);
  const stage = completed ? "completed" : revision ? "revision" : approved ? "approved" : "proposal";

  const actualNewShares = completed ? numberFrom(merged, [/jumlah saham baru dari\s*PMTHMETD\s*:\s*sebanyak\s+([\d.]{5,})/i, /pelaksanaan PMTHMETD sebanyak\s+([\d.]{5,})/i, /jumlah saham hasil penambahan saham tanpa HMETD[^\d]{0,30}([\d.]{5,})/i]) : null;
  const maximumNewShares = numberFrom(merged, [/menerbitkan\s+sebanyak-banyaknya\s+([\d.]{5,})/i, /Perseroan sebanyak\s+([\d.]{5,})[^.]{0,80}saham Perseroan/i, /PMTHMETD dalam jumlah sebanyak-banyaknya\s+([\d.]{5,})/i, /sebanyak-banyaknya\s+([\d.]{5,})\s*(?:\([^)]*\)\s*)?(?:lembar\s*)?saham/i]);
  const newShares = actualNewShares ?? maximumNewShares;
  const placementPrice = numberFrom(merged, [/harga pelaksanaan(?: saham PMTHMETD)?\s*(?:adalah\s*)?(?:sebesar\s*)?(?::\s*)?Rp\s*([\d.]+)/i, /dengan harga pelaksanaan\s*Rp\s*([\d.]+)/i, /asumsi harga pelaksanaan\s*\(Rp\/saham\)\s*([\d.,]+)/i]);
  const detectedSharesBefore = numberFrom(merged, [/jumlah saham sebelum (?:penambahan saham tanpa HMETD|PMTHMETD)[^\d]{0,60}([\d.,]{5,})/i, /saham beredar sebelum PMTHMETD[^\d]{0,60}([\d.,]{5,})/i]);
  const detectedSharesAfter = numberFrom(merged, [/jumlah saham setelah (?:penambahan saham tanpa HMETD|PMTHMETD)(?:\s*\([^)]*\))?[^\d]{0,60}([\d.,]{5,})/i, /saham beredar setelah PMTHMETD[^\d]{0,60}([\d.,]{5,})/i]);
  const sharesBefore = detectedSharesBefore ?? (detectedSharesAfter && newShares && detectedSharesAfter > newShares ? detectedSharesAfter - newShares : null);
  const sharesAfter = detectedSharesAfter ?? (sharesBefore && newShares ? sharesBefore + newShares : null);
  const percentOfExisting = numberFrom(merged, [/(?:atau sebesar|paling banyak)\s*(\d{1,2}(?:[.,]\d+)?)\s*%[^.]{0,100}(?:saham yang telah ditempatkan|jumlah seluruh saham)/i]);
  const statedDilution = numberFrom(merged, [/(?:dilusi|penurunan \(dilusi\) kepemilikan saham)[^\d]{0,80}(\d{1,2}(?:[.,]\d+)?)\s*%/i]);
  const dilutionAfter = sharesBefore && newShares ? (newShares / (sharesBefore + newShares)) * 100 : statedDilution ?? (percentOfExisting ? (percentOfExisting / (100 + percentOfExisting)) * 100 : null);
  const actualFunds = numberFrom(merged, [/(?:senilai|dana hasil PMTHMETD\s*\(Rp\))\s*Rp?\s*([\d.]{6,})/i]) ?? (newShares && placementPrice ? newShares * placementPrice : null);
  const investorMatch = firstMatch(merged, [/(?:dilaksanakan seluruhnya oleh|saham baru akan dikeluarkan kepada)\s+(PT\s+[A-Z][A-Za-z0-9 .,&-]{2,100}|[A-Z]{3,12})(?=\s*[.(,]|\s+Keterangan)/i]);
  const investorName = investorMatch?.[1]?.trim() ?? null;
  const investorPending = /belum (?:terdapat|ada)[\s\S]{0,80}(?:calon investor|pemodal)|belum dapat menginformasikan[\s\S]{0,80}calon investor/i.test(merged);
  const affiliated = /PMTHMETD merupakan transaksi afiliasi|calon pemodal[\s\S]{0,600}afiliasi/i.test(merged) && !/belum dapat menginformasikan hubungan afiliasi/i.test(merged);
  const controllerInvestor = /(?:pemegang saham pengendali|pengendali Perseroan)[\s\S]{0,700}(?:melaksanakan|mengambil bagian|calon pemodal)|dilaksanakan seluruhnya oleh PIMSF/i.test(merged);
  const debtConversion = /konversi.{0,80}(?:utang|pinjaman|hak tagih)|penyetoran selain uang/i.test(merged);
  const productiveUse = /belanja modal|capex|kapal|ekspansi|akuisisi|pengembangan usaha/i.test(merged);
  const debtUse = /pelunasan|pembayaran.{0,50}(?:utang|pinjaman|kredit)/i.test(merged);
  const workingCapitalUse = /modal kerja/i.test(merged);
  const useIndex = merged.search(/(?:rencana|prakiraan) penggunaan dana/i);
  const useOfProceedsSummary = useIndex >= 0 ? compact(merged.slice(useIndex, useIndex + 1000)) : "";
  const shareCandidates = Array.from(new Set([
    ...allNumbers(merged, /(?:sebanyak-banyaknya|sebanyak)\s+([\d.]{5,})\s*(?:\([^)]*\)\s*)?(?:lembar\s*)?saham/gi),
    ...allNumbers(merged, /PMTHMETD dalam jumlah sebanyak-banyaknya\s+([\d.]{5,})/gi),
  ])).filter((value) => !sharesBefore || value < sharesBefore).sort((a, b) => a - b);

  const findings: Array<{ tone: "positive" | "neutral" | "warning"; title: string; detail: string; points: number }> = [];
  if (administrativeProof && !/PMTHMETD|penambahan modal tanpa (?:memberikan )?hak memesan/i.test(merged)) findings.push({ tone: "warning", title: "Bukti iklan tidak memuat struktur transaksi", detail: "Dokumen ini hanya membuktikan publikasi keterbukaan. Tambahkan dokumen yang ditautkan pada situs BEI atau emiten agar saham baru, harga, pemodal, dan penggunaan dana dapat dianalisis.", points: -25 });
  if (completed) findings.push({ tone: "positive", title: "Pelaksanaan telah diumumkan", detail: "Jumlah, harga, investor, dan dana aktual lebih dapat diandalkan daripada batas maksimum pada dokumen usulan.", points: 12 });
  if (productiveUse) findings.push({ tone: "positive", title: "Ada tujuan produktif", detail: "Dana diarahkan ke ekspansi, aset, atau pengembangan usaha. Realisasinya tetap perlu dipantau setelah transaksi.", points: 14 });
  if (debtUse) findings.push({ tone: "neutral", title: "Dana digunakan untuk utang", detail: "Leverage dan beban bunga dapat turun, tetapi manfaatnya bergantung pada biaya utang dan porsi dana yang benar-benar dialokasikan.", points: 7 });
  if (workingCapitalUse && !productiveUse) findings.push({ tone: "warning", title: "Tujuan modal kerja masih umum", detail: "Dampak laba sulit diukur bila alokasi dan target operasional tidak dirinci.", points: -7 });
  if (investorName) findings.push({ tone: controllerInvestor ? "neutral" : "positive", title: `Pemodal teridentifikasi: ${investorName}`, detail: controllerInvestor ? "Pemodal terkait pengendali meningkatkan kepastian penyerapan, sekaligus perlu diperiksa dari sisi afiliasi dan perubahan kontrol." : "Identitas pemodal memungkinkan pengecekan kualitas modal, afiliasi, dan rekam jejaknya.", points: controllerInvestor ? 3 : 8 });
  else if (investorPending) findings.push({ tone: "warning", title: "Calon pemodal belum diungkap", detail: "Belum dapat menilai kualitas investor, afiliasi, maupun potensi perubahan pengendalian.", points: -12 });
  if (affiliated) findings.push({ tone: "warning", title: "Ada konteks transaksi afiliasi", detail: "Periksa kewajaran harga, persetujuan pemegang saham independen, dan manfaat ekonominya bagi publik.", points: -8 });
  if (debtConversion) findings.push({ tone: "warning", title: "Tidak seluruhnya menghasilkan kas baru", detail: "Konversi utang atau setoran non-tunai memperbaiki neraca, tetapi tidak menambah likuiditas sebesar nilai penerbitan.", points: -6 });
  if (dilutionAfter !== null && dilutionAfter > 15) findings.push({ tone: "warning", title: `Dilusi tinggi ${dilutionAfter.toFixed(2)}%`, detail: "Pertumbuhan laba pascatransaksi perlu lebih besar agar EPS pemegang saham lama tidak turun berkepanjangan.", points: -20 });
  else if (dilutionAfter !== null && dilutionAfter > 8) findings.push({ tone: "warning", title: `Dilusi material ${dilutionAfter.toFixed(2)}%`, detail: "Bandingkan tambahan modal dengan proyeksi laba, BVPS, ROE, dan perubahan kendali.", points: -10 });
  else if (dilutionAfter !== null) findings.push({ tone: "neutral", title: `Dilusi pascapenerbitan ${dilutionAfter.toFixed(2)}%`, detail: "Angka ini memakai saham baru dibagi total saham setelah placement, bukan hanya persentase terhadap saham lama.", points: -3 });
  if (proposal) findings.push({ tone: "warning", title: "Struktur masih dapat berubah", detail: "Harga, jumlah aktual, investor, dan jadwal perlu diperbarui dari dokumen pelaksanaan atau hasil.", points: -8 });
  if (shareCandidates.length > 1 && shareCandidates.at(-1)! / shareCandidates[0] > 1.05) findings.push({ tone: "warning", title: "Jumlah saham berbeda antarbab atau dokumen", detail: `Terdeteksi beberapa angka kandidat: ${shareCandidates.map((value) => idNumber(value)).join(", ")}. Pastikan angka persetujuan RUPSLB, rencana pelaksanaan, dan hasil aktual tidak tertukar.`, points: -8 });
  if (documents.some((document) => !document.readable)) findings.push({ tone: "warning", title: "Ada PDF scan yang belum terbaca", detail: "Dokumen tetap tercatat dalam versi, tetapi fakta di dalam gambar tidak dipakai untuk skor otomatis. Verifikasi visual diperlukan.", points: -3 });

  const score = Math.max(0, Math.min(100, 50 + findings.reduce((sum, finding) => sum + finding.points, 0)));
  const verdict = score >= 68 ? "positive" : score >= 45 ? "mixed" : "caution";
  const confidence = completed && placementPrice && newShares && investorName && documents.every((document) => document.readable) ? "high" : "medium";
  const evidence: Evidence[] = [];
  const pushEvidence = (label: string, value: string, pattern: RegExp) => { const source = pageFor(documents, pattern); evidence.push({ label, value, ...source }); };
  if (newShares) pushEvidence(completed ? "Saham baru aktual" : "Maksimum saham baru", `${idNumber(newShares)} lembar`, /sebanyak-banyaknya|jumlah saham hasil|pelaksanaan PMTHMETD sebanyak/i);
  if (placementPrice) pushEvidence("Harga placement", `Rp ${idNumber(placementPrice)}`, /harga pelaksanaan/i);
  if (dilutionAfter !== null) pushEvidence("Dilusi pascapenerbitan", `${dilutionAfter.toFixed(2)}%`, /dilusi|jumlah saham sebelum/i);
  if (investorName) pushEvidence("Pemodal", investorName, /dilaksanakan seluruhnya oleh|dikeluarkan kepada/i);
  if (actualFunds) pushEvidence("Dana penerbitan", `Rp ${idNumber(actualFunds)}`, /senilai|dana hasil PMTHMETD/i);

  const timeline = [
    timelineNear(documents, "rups_approval", "Persetujuan RUPSLB", /RUPSLB.{0,80}(?:tanggal|pada)/i),
    timelineNear(documents, "execution_deadline", "Batas pelaksanaan", /(?:dilaksanakan paling lama sampai dengan|diselesaikan dalam waktu)/i),
    timelineNear(documents, "funding", "Penyetoran modal", /(?:tanggal pelaksanaan|penyetoran modal)/i),
    timelineNear(documents, "distribution", "Distribusi saham baru", /distribusi (?:PMTHMETD|saham)/i),
    timelineNear(documents, "listing", "Pencatatan saham baru", /pencatatan saham (?:dari|hasil) PMTHMETD/i),
    timelineNear(documents, "result_announcement", "Pengumuman hasil", /pengumuman hasil PMT?HM?ETD/i),
  ].filter((item): item is TimelineEvent => item !== null).filter((item, index, all) => all.findIndex((other) => other.type === item.type && other.date === item.date) === index).sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    ticker, issuer, score, verdict, confidence, stage,
    facts: { sharesBefore, maximumNewShares, actualNewShares, newShares, sharesAfter, placementPrice, percentOfExisting, dilutionAfter, actualFunds, investorName, investorPending, affiliated, controllerInvestor, approved, completed, debtConversion, productiveUse, debtUse, workingCapitalUse, useOfProceedsSummary, shareCandidates },
    findings, evidence, timeline,
    documents: documents.map(({ name, pageCount, readable }) => ({ name, pageCount, readable })),
    disclaimer: "Analisis berbasis teks dokumen dan merupakan alat bantu riset, bukan rekomendasi jual atau beli.",
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
