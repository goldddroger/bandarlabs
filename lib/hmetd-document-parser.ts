import { hmetdFieldLabels, type HmetdCandidate, type HmetdDocument, type HmetdField } from "@/types/hmetd-document";

const months = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
const monthPattern = `(?:${months.join("|")})`;
const datePattern = `\\d{1,2}\\s+${monthPattern}\\s+20\\d{2}`;
const numberPattern = "\\d+(?:\\.\\d{3})*(?:,\\d+)?";

export function isValidHmetdDate(value: string) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isoDate(text: string): string | null {
  const match = text.match(new RegExp(`^(\\d{1,2})\\s+(${monthPattern})\\s+(20\\d{2})$`, "i"));
  if (!match) return null;
  const value = `${match[3]}-${String(months.indexOf(match[2].toLowerCase()) + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return isValidHmetdDate(value) ? value : null;
}

export function parseHmetdDocument(filename: string, pages: string[]): HmetdDocument {
  const texts = pages.map((page) => page.replace(/\s+/g, " ").trim());
  const whole = texts.join(" ");
  if (!/\b(?:PMHMETD|HMETD)\b|hak memesan efek terlebih dahulu/i.test(whole)) {
    throw new Error("Dokumen tidak memuat keterbukaan HMETD. Unggah dokumen right issue yang sesuai.");
  }
  const proposal = /(?:rasio final HMETD|harga pelaksanaan[^.]{0,90})(?:[^.]{0,40})(?:ditentukan|ditetapkan) kemudian|hanya merupakan usulan/i.test(whole);
  const tentativeSchedule = /jadwal sementara/i.test(whole);
  const missing = (): HmetdDocument["fields"][HmetdField] => ({ status: "missing", candidates: [] });
  const fields: HmetdDocument["fields"] = { ticker: missing(), ratio: missing(), subscriptionPrice: missing(), cumDate: missing(), exDate: missing(), recordingDate: missing(), tradingStart: missing(), tradingEnd: missing(), subscriptionDeadline: missing() };
  const warnings: string[] = [];
  const context: HmetdDocument["context"] = [];
  const add = (key: HmetdField, value: string | null, page: number, quote: string, indicative = false) => {
    if (!value) return;
    const candidates = fields[key].candidates;
    const existing = candidates.find((candidate) => candidate.value === value);
    // Keep distinct values, including contradictions, instead of selecting the most frequent value.
    if (existing) {
      existing.indicative ||= indicative;
      if (!existing.page && page) { existing.page = page; existing.quote = quote.slice(0, 750); }
      return;
    }
    if (candidates.length < 12) candidates.push({ value, page, quote: quote.slice(0, 750), indicative });
  };
  const filenameTicker = filename.match(/^\d{8}_([A-Z]{4})_/) ?? filename.match(/^([A-Z]{4})\.pdf$/);
  if (filenameTicker) add("ticker", filenameTicker[1], 0, `Nama file: ${filename}`);
  let issuer: string | null = null;
  texts.forEach((text, index) => {
    const page = index + 1;
    issuer ??= text.match(/\bPT\.?\s+[A-Z][A-Z\s&.,()-]{3,90}?\s+T[Bb][Kk]\b/)?.[0] ?? null;
    for (const match of text.matchAll(/(?:kode saham|kode perdagangan|ticker)\s*[:(]?\s*([A-Z]{4})\b/gi)) add("ticker", match[1].toUpperCase(), page, match[0]);
    for (const match of text.matchAll(new RegExp(`(?:setiap\\s+(?:pemegang\\s+)?)(${numberPattern})(?:\\s*\\([^)]{1,90}\\))?\\s+saham lama.{0,500}?(?:berhak(?:\\s+atas)?|mendapatkan|memperoleh)\\s+(?:sebanyak\\s+)?(${numberPattern})(?:\\s*\\([^)]{1,90}\\))?\\s+HMETD\\b`, "gi"))) {
      const old = Number(match[1].replace(/\./g, "").replace(",", "."));
      const rights = Number(match[2].replace(/\./g, "").replace(",", "."));
      if (Number.isSafeInteger(old) && Number.isSafeInteger(rights) && old > 0 && rights > 0) add("ratio", `${old}:${rights}`, page, match[0], proposal);
    }
    for (const match of text.matchAll(/rasio\s+(?:saham lama\s*:\s*HMETD|HMETD|right issue)\s*:?\s*(\d+)\s*:\s*(\d+)\b/gi)) {
      if (Number(match[1]) > 0 && Number(match[2]) > 0) add("ratio", `${Number(match[1])}:${Number(match[2])}`, page, match[0], proposal);
    }
    for (const match of text.matchAll(/setiap\s+(\d+)(?:\s*\([^)]{1,60}\))?\s+HMETD.{0,160}?(?:membeli|memperoleh)\s+(?:sebanyak\s+)?(\d+)(?:\s*\([^)]{1,60}\))?\s+saham baru/gi)) {
      if (match[1] !== match[2]) warnings.push("Hak per HMETD tidak satu banding satu. Rasio perlu dikonversi dan diperiksa manual sebelum simulasi saham baru.");
    }
    for (const match of text.matchAll(new RegExp(`harga pelaksanaan(?:\\s+(?:indika[^\\s:]*|sebesar|adalah|ditetapkan|saham|PMHMETD|II|I)){0,4}\\s*:?\\s*(?:sebesar\\s+)?Rp\\s*(${numberPattern})(?!\\d|\\.\\d|,\\d)`, "gi"))) {
      const price = Number(match[1].replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(price) && price > 0) add("subscriptionPrice", String(price), page, match[0], proposal || /indika/i.test(match[0]));
    }
    const scheduleIndicative = proposal || tentativeSchedule;
    const dates: Array<[HmetdField, string]> = [
      ["cumDate", `cum[-\\s]*(?:HMETD|right)(?:\\s+di)?\\s+pasar reguler(?:\\s+dan(?:\\s+pasar)?\\s+negosiasi)?\\s*:?\\s*(${datePattern})`],
      ["exDate", `ex[-\\s]*(?:HMETD|right)(?:\\s+di)?\\s+pasar reguler(?:\\s+dan(?:\\s+pasar)?\\s+negosiasi)?\\s*:?\\s*(${datePattern})`],
      ["recordingDate", `(?:tanggal\\s+)?(?:daftar|dafar) pemegang saham(?:\\s+yang)?\\s+(?:berhak memperoleh|berhak atas|berhak menerima)\\s+HMETD\\s*:?\\s*(${datePattern})`],
      ["recordingDate", `recording date\\s*:?\\s*(${datePattern})`],
      ["recordingDate", `\\bDPS\\s+pada\\s+tanggal.{0,130}?(${datePattern})`],
      ["subscriptionDeadline", `(?:akhir|batas(?:\\s+akhir)?)\\s+(?:tanggal\\s+)?(?:penebusan|pelaksanaan)\\s+HMETD\\s*:?\\s*(${datePattern})`],
    ];
    for (const [key, pattern] of dates) for (const match of text.matchAll(new RegExp(pattern, "gi"))) add(key, isoDate(match[1]), page, match[0], scheduleIndicative);
    const rangePattern = `(\\d{1,2})(?:\\s+(${monthPattern}))?(?:\\s+(20\\d{2}))?\\s*(?:[-–—]|sampai(?:\\s+dengan)?(?:\\s+tanggal)?|s\\.d\\.)\\s*(\\d{1,2})\\s+(${monthPattern})\\s+(20\\d{2})`;
    for (const match of text.matchAll(new RegExp(`(?:periode\\s+)?perdagangan(?:\\s+dan\\s+pelaksanaan)?\\s+HMETD(?:\\s+mulai)?(?:\\s+tanggal)?\\s*:?\\s*${rangePattern}`, "gi"))) {
      const start = isoDate(`${match[1]} ${match[2] ?? match[5]} ${match[3] ?? match[6]}`);
      const end = isoDate(`${match[4]} ${match[5]} ${match[6]}`);
      if (start && end && start <= end) {
        add("tradingStart", start, page, match[0], scheduleIndicative);
        add("tradingEnd", end, page, match[0], scheduleIndicative);
        if (/dan pelaksanaan/i.test(match[0])) add("subscriptionDeadline", end, page, match[0], scheduleIndicative);
      }
    }
    for (const match of text.matchAll(new RegExp(`(?:periode\\s+)?pelaksanaan HMETD(?:\\s+(?:mulai|dari))?(?:\\s+tanggal)?\\s*:?\\s*${rangePattern}`, "gi"))) {
      add("subscriptionDeadline", isoDate(`${match[4]} ${match[5]} ${match[6]}`), page, match[0], scheduleIndicative);
    }
    const useIndex = text.search(/(?:perkiraan secara garis besar penggunaan dana|rencana penggunaan dana|penggunaan dana hasil)/i);
    if (useIndex >= 0 && context.length < 3) context.push({ page, quote: text.slice(useIndex, useIndex + 900) });
  });
  if (warnings.some((warning) => warning.includes("tidak satu banding satu"))) fields.ratio.candidates = [];
  for (const key of Object.keys(fields) as HmetdField[]) {
    const candidates: HmetdCandidate[] = fields[key].candidates;
    fields[key].status = candidates.length > 1 ? "conflict" : candidates.length === 0 ? "missing" : candidates[0].indicative ? "indicative" : "found";
    if (fields[key].status === "conflict") warnings.push(`${hmetdFieldLabels[key]} memiliki nilai berbeda dalam sumber. Pilih satu nilai, koreksi manual, atau kosongkan secara eksplisit.`);
  }
  if (proposal) warnings.push("Dokumen masih memuat usulan / ketentuan indikatif. Harga dan rasio yang dipakai untuk simulasi bukan konfirmasi ketentuan final.");
  if (tentativeSchedule) warnings.push("Dokumen menyebut jadwal sementara. Verifikasi kembali jadwal resmi sebelum mengambil tindakan.");
  if (proposal) {
    const meeting = whole.match(new RegExp(`RUPSLB.{0,130}?(?:tanggal\\s+)(${datePattern})`, "i"));
    const meetingDate = meeting ? isoDate(meeting[1]) : null;
    if (meetingDate && fields.recordingDate.candidates.some((candidate) => candidate.value < meetingDate)) warnings.push("Recording date yang terbaca mendahului tanggal rencana RUPSLB dalam dokumen. Periksa jadwal; tanggal RUPSLB tidak dipakai sebagai cum / ex-HMETD.");
  }
  if (fields.ratio.status === "missing") warnings.push("Rasio saham lama : HMETD tidak ditemukan secara eksplisit. Jumlah saham perusahaan tidak digunakan untuk menebak rasio.");
  if (fields.subscriptionPrice.status === "missing") warnings.push("Harga pelaksanaan belum ditemukan. Nilai nominal saham bukan harga pelaksanaan.");
  return { filename, pageCount: pages.length, issuer, proposal, tentativeSchedule, fields, warnings: [...new Set(warnings)], context };
}
