export type FcaEpisode = {
  ticker: string;
  company_name: string;
  entered_at: string;
  exited_at: string | null;
  criteria: number[];
  source_date: string;
};

export type ParsedFcaFile = {
  sourceDate: string;
  rows: FcaEpisode[];
  rejectedRows: number;
};

const monthNumbers: Record<string, string> = {
  jan: "01", januari: "01",
  feb: "02", februari: "02",
  mar: "03", maret: "03",
  apr: "04", april: "04",
  mei: "05", may: "05",
  jun: "06", juni: "06",
  jul: "07", juli: "07",
  agt: "08", agu: "08", aug: "08", agustus: "08",
  sep: "09", september: "09",
  okt: "10", oct: "10", oktober: "10",
  nov: "11", november: "11",
  des: "12", dec: "12", desember: "12",
};

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizedHeader(value: unknown) {
  return text(value).toUpperCase().replace(/\s+/g, " ");
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000).toISOString().slice(0, 10);
  }

  const raw = text(value);
  const iso = raw.match(/^(\d{4})[-/]([01]?\d)[-/]([0-3]?\d)$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const localized = raw.match(/^([0-3]?\d)\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!localized) return null;
  const month = monthNumbers[localized[2].toLowerCase()];
  return month ? `${localized[3]}-${month}-${localized[1].padStart(2, "0")}` : null;
}

function sourceDateFromFile(fileName: string, rows: Array<{ entered_at: string; exited_at: string | null }>) {
  const matches = Array.from(fileName.matchAll(/(?:19|20)\d{6}/g), (match) => match[0]);
  const compact = matches.at(-1);
  if (compact) return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  return rows.flatMap((row) => [row.entered_at, row.exited_at ?? ""]).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
}

export function parseFcaWorkbook(rows: readonly (readonly unknown[])[], fileName: string): ParsedFcaFile {
  const headerIndex = rows.slice(0, 20).findIndex((row) => {
    const headers = new Set(row.map(normalizedHeader));
    return headers.has("KODE SAHAM") && headers.has("TANGGAL MASUK") && headers.has("KRITERIA");
  });
  if (headerIndex < 0) throw new Error("Format tidak dikenali. Gunakan daftar Efek Papan Pemantauan Khusus dari BEI.");

  const columns = new Map<string, number>();
  rows[headerIndex].forEach((value, index) => columns.set(normalizedHeader(value), index));
  const parsedRows: Omit<FcaEpisode, "source_date">[] = [];
  let rejectedRows = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    if (row.every((value) => !text(value))) continue;
    const ticker = text(row[columns.get("KODE SAHAM") ?? -1]).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const companyName = text(row[columns.get("NAMA PERUSAHAAN") ?? -1]);
    const enteredAt = dateValue(row[columns.get("TANGGAL MASUK") ?? -1]);
    const rawExit = row[columns.get("TANGGAL KELUAR") ?? -1];
    const exitedAt = text(rawExit) ? dateValue(rawExit) : null;
    const criteria = Array.from(new Set(text(row[columns.get("KRITERIA") ?? -1])
      .split(/[,;]+/)
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 11)))
      .sort((first, second) => first - second);

    if (!ticker || !companyName || !enteredAt || (text(rawExit) && !exitedAt) || criteria.length === 0) {
      rejectedRows += 1;
      continue;
    }
    parsedRows.push({ ticker, company_name: companyName, entered_at: enteredAt, exited_at: exitedAt, criteria });
  }

  const unique = new Map(parsedRows.map((row) => [`${row.ticker}|${row.entered_at}`, row]));
  const deduplicated = Array.from(unique.values());
  if (deduplicated.length === 0) throw new Error("Tidak ada baris FCA valid di dalam file.");
  const sourceDate = sourceDateFromFile(fileName, deduplicated);
  return {
    sourceDate,
    rows: deduplicated.map((row) => ({ ...row, source_date: sourceDate })),
    rejectedRows,
  };
}
