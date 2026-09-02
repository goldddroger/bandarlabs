export type InvestorClassificationHoldings = Record<string, number>;

export type InvestorClassificationImportRow = {
  ticker: string;
  issuer_name: string;
  report_date: string;
  total_scripless: number;
  holdings: InvestorClassificationHoldings;
};

export type ParsedInvestorClassificationFile = {
  reportDate: string;
  rows: InvestorClassificationImportRow[];
  classifications: Array<{ key: string; label: string }>;
  rejectedRows: number;
};

export const featuredInvestorClassifications = [
  { key: "individual", label: "Individual" },
  { key: "corporate", label: "Corporate" },
  { key: "mutual_funds", label: "Reksa Dana" },
  { key: "pension_funds", label: "Dana Pensiun" },
  { key: "insurance", label: "Asuransi" },
  { key: "securities_company", label: "Sekuritas" },
] as const;

export function investorClassificationLabel(key: string) {
  const featured = featuredInvestorClassifications.find((item) => item.key === key);
  if (featured) return featured.label;
  return key.split("_").map((word) => word ? `${word[0].toUpperCase()}${word.slice(1)}` : "").join(" ");
}

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function header(value: unknown) {
  return text(value).toUpperCase().replace(/\s+/g, " ");
}

function keyFromHeader(value: unknown) {
  return header(value)
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function integer(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : 0;
  const parsed = Number(text(value).replace(/[.,\s]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-");
  }
  const normalized = text(value);
  const match = normalized.match(/^(\d{4})[-/]([01]?\d)[-/]([0-3]?\d)/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : null;
}

export function parseInvestorClassificationWorkbook(rows: readonly (readonly unknown[])[]): ParsedInvestorClassificationFile {
  const headerIndex = rows.slice(0, 30).findIndex((row) => {
    const values = new Set(row.map(header));
    return values.has("DATE") && values.has("SHARE CODE") && values.has("ISSUER NAME") && values.has("TOTAL SCRIPLESS");
  });
  if (headerIndex < 0) throw new Error("Format klasifikasi investor tidak dikenali. Gunakan file klasifikasi resmi BEI/KSEI.");

  const headerRow = rows[headerIndex];
  const dateIndex = headerRow.findIndex((value) => header(value) === "DATE");
  const tickerIndex = headerRow.findIndex((value) => header(value) === "SHARE CODE");
  const issuerIndex = headerRow.findIndex((value) => header(value) === "ISSUER NAME");
  const totalIndex = headerRow.findIndex((value) => header(value) === "TOTAL SCRIPLESS");
  const classificationColumns = headerRow
    .map((value, index) => ({ index, key: keyFromHeader(value), label: text(value) }))
    .filter((column) => column.index > issuerIndex && column.index < totalIndex && column.key);

  const parsedRows: InvestorClassificationImportRow[] = [];
  let rejectedRows = 0;
  for (const row of rows.slice(headerIndex + 1)) {
    if (row.every((value) => !text(value))) continue;
    const reportDate = dateValue(row[dateIndex]);
    const ticker = text(row[tickerIndex]).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const issuerName = text(row[issuerIndex]);
    const totalScripless = integer(row[totalIndex]);
    if (!reportDate || !ticker || !issuerName || totalScripless <= 0) {
      rejectedRows += 1;
      continue;
    }
    const holdings = Object.fromEntries(classificationColumns.map((column) => [column.key, Math.max(0, integer(row[column.index]))]));
    parsedRows.push({ ticker, issuer_name: issuerName, report_date: reportDate, total_scripless: totalScripless, holdings });
  }

  const deduplicated = Array.from(new Map(parsedRows.map((row) => [row.ticker, row])).values());
  if (!deduplicated.length) throw new Error("Tidak ada data klasifikasi investor yang valid.");
  const reportDates = new Set(deduplicated.map((row) => row.report_date));
  if (reportDates.size !== 1) throw new Error("Satu file klasifikasi hanya boleh berisi satu tanggal snapshot.");
  return {
    reportDate: Array.from(reportDates)[0],
    rows: deduplicated,
    classifications: classificationColumns.map(({ key, label }) => ({ key, label })),
    rejectedRows,
  };
}

export function classificationShare(row: Pick<InvestorClassificationImportRow, "holdings" | "total_scripless">, key: string) {
  return row.total_scripless > 0 ? ((row.holdings[key] ?? 0) / row.total_scripless) * 100 : 0;
}
