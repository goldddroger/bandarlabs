export type OwnershipImportRow = {
  ticker: string;
  issuer_name: string;
  investor_name: string;
  account_holder: string | null;
  classification: string | null;
  local_foreign: string | null;
  nationality: string | null;
  domicile: string | null;
  scripless_shares: number;
  scrip_shares: number;
  shares: number;
  share_change: number | null;
  percentage: number;
  report_date: string;
};

export type ParsedOwnershipFile = {
  format: "BEI 1%" | "BEI 5%";
  threshold: 1 | 5;
  reportDate: string;
  rows: OwnershipImportRow[];
  rejectedRows: number;
};

const monthNumbers: Record<string, string> = {
  jan: "01", january: "01", januari: "01",
  feb: "02", february: "02", februari: "02",
  mar: "03", march: "03", maret: "03",
  apr: "04", april: "04",
  may: "05", mei: "05",
  jun: "06", june: "06", juni: "06",
  jul: "07", july: "07", juli: "07",
  aug: "08", august: "08", agustus: "08", agu: "08", agt: "08",
  sep: "09", september: "09",
  oct: "10", october: "10", oktober: "10", okt: "10",
  nov: "11", november: "11",
  dec: "12", december: "12", desember: "12", des: "12",
};

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function header(value: unknown) {
  return text(value).toUpperCase().replace(/\s+/g, " ");
}

function nullableText(value: unknown) {
  const normalized = text(value);
  return normalized && normalized.toLowerCase() !== "nan" ? normalized : null;
}

function integer(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : 0;
  const normalized = text(value).replace(/[.,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function decimal(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = text(value).replace(/\s/g, "");
  const normalized = raw.includes(",") && raw.includes(".")
    ? raw.lastIndexOf(",") > raw.lastIndexOf(".")
      ? raw.replaceAll(".", "").replace(",", ".")
      : raw.replaceAll(",", "")
    : raw.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-");
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const parsed = new Date(excelEpoch + value * 86_400_000);
    return parsed.toISOString().slice(0, 10);
  }

  const normalized = text(value);
  const isoMatch = normalized.match(/^(\d{4})[-/]([01]?\d)[-/]([0-3]?\d)/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;

  const localMatch = normalized.match(/([0-3]?\d)[\s/-]+([A-Za-z]+)[\s/-]+(\d{4})/);
  if (!localMatch) return null;
  const month = monthNumbers[localMatch[2].toLowerCase()];
  return month ? `${localMatch[3]}-${month}-${localMatch[1].padStart(2, "0")}` : null;
}

function localForeign(value: unknown) {
  const normalized = header(value);
  if (["F", "A", "FOREIGN", "ASING"].includes(normalized)) return "A";
  if (["L", "LOCAL", "LOKAL"].includes(normalized)) return "L";
  return normalized || null;
}

function mapHeaders(row: readonly unknown[]) {
  const columns = new Map<string, number>();
  row.forEach((value, index) => {
    const name = header(value);
    if (name) columns.set(name, index);
  });
  return columns;
}

function valueAt(row: readonly unknown[], columns: Map<string, number>, name: string) {
  const index = columns.get(name);
  return index === undefined ? undefined : row[index];
}

function deduplicateRows(rows: OwnershipImportRow[]) {
  const uniqueRows = new Map<string, OwnershipImportRow>();
  rows.forEach((row) => {
    const key = [row.ticker, row.investor_name, row.account_holder ?? "", row.report_date].join("|");
    uniqueRows.set(key, row);
  });
  return Array.from(uniqueRows.values());
}

function parseOnePercent(rows: readonly (readonly unknown[])[], headerIndex: number): ParsedOwnershipFile {
  const columns = mapHeaders(rows[headerIndex]);
  const parsedRows: OwnershipImportRow[] = [];
  let rejectedRows = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    if (row.every((value) => !text(value))) continue;
    const reportDate = dateValue(valueAt(row, columns, "DATE"));
    const ticker = text(valueAt(row, columns, "SHARE_CODE")).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const investorName = text(valueAt(row, columns, "INVESTOR_NAME"));
    const issuerName = text(valueAt(row, columns, "ISSUER_NAME"));
    const shares = integer(valueAt(row, columns, "TOTAL_HOLDING_SHARES"));
    const percentage = decimal(valueAt(row, columns, "PERCENTAGE"));

    if (!reportDate || !ticker || !investorName || !issuerName || shares <= 0 || percentage <= 0) {
      rejectedRows += 1;
      continue;
    }

    parsedRows.push({
      ticker,
      issuer_name: issuerName,
      investor_name: investorName,
      account_holder: null,
      classification: nullableText(valueAt(row, columns, "INVESTOR_CLASSIFICATION")),
      local_foreign: localForeign(valueAt(row, columns, "LOCAL_FOREIGN")),
      nationality: nullableText(valueAt(row, columns, "NATIONALITY")),
      domicile: nullableText(valueAt(row, columns, "DOMICILE")),
      scripless_shares: integer(valueAt(row, columns, "HOLDINGS_SCRIPLESS")),
      scrip_shares: integer(valueAt(row, columns, "HOLDINGS_SCRIP")),
      shares,
      share_change: null,
      percentage,
      report_date: reportDate,
    });
  }

  return finishParsing("BEI 1%", 1, parsedRows, rejectedRows);
}

function parseFivePercent(rows: readonly (readonly unknown[])[], headerIndex: number): ParsedOwnershipFile {
  const topHeaders = rows[headerIndex];
  const columns = mapHeaders(topHeaders);
  const currentGroupIndexes = topHeaders
    .map((value, index) => ({ value: header(value), index }))
    .filter((item) => item.value.startsWith("KEPEMILIKAN PER"));
  const currentStart = currentGroupIndexes.at(-1)?.index;
  const reportDate = currentStart === undefined ? null : dateValue(topHeaders[currentStart]);
  if (!reportDate || currentStart === undefined) throw new Error("Tanggal laporan pada header file 5% tidak dapat dibaca.");

  const parsedRows: OwnershipImportRow[] = [];
  let rejectedRows = 0;
  const noIndex = columns.get("NO") ?? 0;

  for (const row of rows.slice(headerIndex + 2)) {
    const sequenceValue = row[noIndex];
    if (!text(sequenceValue)) continue;
    const sequence = Number(sequenceValue);
    if (!Number.isFinite(sequence)) continue;

    const ticker = text(valueAt(row, columns, "KODE EFEK")).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const issuerName = text(valueAt(row, columns, "NAMA EMITEN"));
    const investorName = text(valueAt(row, columns, "NAMA PEMEGANG SAHAM"));
    const shares = integer(row[currentStart + 1]);
    const percentage = decimal(row[currentStart + 2]);
    const previousGroup = currentGroupIndexes.length > 1 ? currentGroupIndexes.at(-2)?.index : undefined;
    const previousShares = previousGroup === undefined ? null : integer(row[previousGroup + 1]);

    if (!ticker || !issuerName || !investorName || shares <= 0 || percentage <= 0) {
      rejectedRows += 1;
      continue;
    }

    parsedRows.push({
      ticker,
      issuer_name: issuerName,
      investor_name: investorName,
      account_holder: nullableText(valueAt(row, columns, "NAMA PEMEGANG REKENING EFEK")),
      classification: null,
      local_foreign: localForeign(valueAt(row, columns, "STATUS (LOKAL/ASING)")),
      nationality: nullableText(valueAt(row, columns, "KEBANGSAAN")),
      domicile: nullableText(valueAt(row, columns, "DOMISILI")),
      scripless_shares: 0,
      scrip_shares: 0,
      shares,
      share_change: previousShares === null ? null : shares - previousShares,
      percentage,
      report_date: reportDate,
    });
  }

  return finishParsing("BEI 5%", 5, parsedRows, rejectedRows);
}

function finishParsing(
  format: ParsedOwnershipFile["format"],
  threshold: ParsedOwnershipFile["threshold"],
  rows: OwnershipImportRow[],
  rejectedRows: number,
) {
  const uniqueRows = deduplicateRows(rows);
  if (uniqueRows.length === 0) throw new Error("Tidak ada baris ownership valid di dalam file.");
  const reportDates = new Set(uniqueRows.map((row) => row.report_date));
  if (reportDates.size !== 1) throw new Error("Satu file hanya boleh berisi satu tanggal laporan.");

  return {
    format,
    threshold,
    reportDate: Array.from(reportDates)[0],
    rows: uniqueRows,
    rejectedRows,
  } satisfies ParsedOwnershipFile;
}

export function parseOwnershipWorkbook(rows: readonly (readonly unknown[])[]): ParsedOwnershipFile {
  const scanRows = rows.slice(0, 30);
  const onePercentHeader = scanRows.findIndex((row) => {
    const values = new Set(row.map(header));
    return values.has("DATE") && values.has("SHARE_CODE") && values.has("INVESTOR_NAME");
  });
  if (onePercentHeader >= 0) return parseOnePercent(rows, onePercentHeader);

  const fivePercentHeader = scanRows.findIndex((row) => {
    const values = new Set(row.map(header));
    return values.has("KODE EFEK") && values.has("NAMA PEMEGANG SAHAM");
  });
  if (fivePercentHeader >= 0) return parseFivePercent(rows, fivePercentHeader);

  throw new Error("Format tidak dikenali. Gunakan file kepemilikan 1% atau 5% resmi dari BEI/KSEI.");
}
