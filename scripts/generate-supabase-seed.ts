import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { idxListedStocks } from "../lib/idx-listed-stocks";
import { idxStockScreenerRows } from "../lib/idx-stock-screener";
import { kongloGroups } from "../lib/konglo-groups";
import { shareholderFivePercentRows, shareholderOnePercentRows } from "../lib/shareholder-ownership";
import { accumulationRows, brokerRows, dividendRows, timelineEvents } from "../lib/data";

type DataRow = Record<string, unknown>;

const outputPath = resolve("supabase/seed.sql");
const partsDirectory = resolve("supabase/seed-parts");
const maxPartBytes = 120 * 1024;
const indonesianMonths: Record<string, string> = {
  jan: "01", januari: "01", feb: "02", februari: "02", mar: "03", maret: "03",
  apr: "04", april: "04", may: "05", mei: "05", jun: "06", juni: "06", jul: "07", juli: "07",
  agu: "08", agt: "08", aug: "08", agustus: "08", sep: "09", september: "09", okt: "10",
  oct: "10", oktober: "10", nov: "11", november: "11", dec: "12", des: "12", desember: "12",
};

function cloneRows(value: unknown): DataRow[] {
  return JSON.parse(JSON.stringify(value)) as DataRow[];
}

function parseIndonesianDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const month = indonesianMonths[match[2].toLowerCase()];
  return month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : null;
}

function requiredDate(value: unknown, label: string) {
  const parsed = parseIndonesianDate(value);
  if (!parsed) throw new Error(`Cannot parse ${label}: ${String(value)}`);
  return parsed;
}

function sqlString(value: unknown) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `array[${value.map(sqlString).join(", ")}]::text[]`;
  return sqlString(value);
}

function insertBatches(
  table: string,
  columns: string[],
  rows: unknown[][],
  conflictClause: string,
  batchSize = 75,
) {
  const statements: string[] = [];
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    statements.push(
      `insert into public.${table} (${columns.join(", ")}) values\n${batch
        .map((row) => `  (${row.map(sqlValue).join(", ")})`)
        .join(",\n")}\n${conflictClause};`,
    );
  }
  return statements.join("\n\n");
}

const listedRows = cloneRows(idxListedStocks);
const screenerRows = cloneRows(idxStockScreenerRows);
const onePercentRows = cloneRows(shareholderOnePercentRows);
const fivePercentRows = cloneRows(shareholderFivePercentRows);
const groupRows = cloneRows(kongloGroups);
const stocks = new Map<string, DataRow>();

for (const row of listedRows) {
  const ticker = String(row.ticker ?? "").toUpperCase();
  if (!ticker) continue;
  stocks.set(ticker, {
    ticker,
    name: row.name,
    listingDate: parseIndonesianDate(row.listingDate),
    listedShares: row.listedShares,
    board: row.board,
  });
}

for (const row of screenerRows) {
  const ticker = String(row.ticker ?? "").toUpperCase();
  if (!ticker) continue;
  stocks.set(ticker, { ...(stocks.get(ticker) ?? { ticker }), name: row.name ?? ticker, ...row, ticker });
}

for (const row of [...onePercentRows, ...fivePercentRows]) {
  const ticker = String(row.ticker ?? "").toUpperCase();
  if (!ticker) continue;
  stocks.set(ticker, { ...(stocks.get(ticker) ?? { ticker }), name: stocks.get(ticker)?.name ?? row.issuerName ?? ticker });
}

for (const group of groupRows) {
  for (const tickerValue of (group.tickers as unknown[] | undefined) ?? []) {
    const ticker = String(tickerValue).toUpperCase();
    stocks.set(ticker, stocks.get(ticker) ?? { ticker, name: ticker });
  }
}

for (const ticker of ["TOSK", "LAPD", "BREN", "AMMN", "ADRO", "WEGE", "WMPP", "CPIN", "BBNI", "BRPT"]) {
  stocks.set(ticker, stocks.get(ticker) ?? { ticker, name: ticker });
}

const stockValues = Array.from(stocks.values())
  .sort((first, second) => String(first.ticker).localeCompare(String(second.ticker)))
  .map((row) => [
    row.ticker,
    row.name ?? row.ticker,
    row.listingDate ?? null,
    row.listedShares ?? null,
    row.board ?? null,
    row.sector ?? null,
    row.subsector ?? null,
    row.industry ?? null,
    row.subindustry ?? null,
    row.subindustryCode ?? null,
    row.indexes ?? [],
    "2026-08-17",
  ]);

const screenerValues = screenerRows.map((row) => [
  String(row.ticker).toUpperCase(), row.per, row.pbv, row.roe, row.roa, row.der, row.marketCap,
  row.totalRevenue, row.priceChange4w, row.priceChange13w, row.priceChange26w, row.priceChange52w,
  row.npm, row.mtd, row.ytd, "2026-08-17",
]);

function ownershipValues(rows: DataRow[], threshold: number) {
  return rows.map((row) => [
    String(row.ticker).toUpperCase(), threshold, row.issuerName, row.investorName ?? row.shareholderName,
    row.accountHolder, row.classification,
    row.localForeign, row.nationality, row.domicile, row.scriplessShares ?? 0, row.scripShares ?? 0,
    row.shares ?? 0, row.change, row.percentage, requiredDate(row.date, `ownership date for ${String(row.ticker)}`),
  ]);
}

const corporateEvents = [
  ["tosk-rupslb-2026", "TOSK", "RUPSLB", "2026-08-22", "Mendatang", "Perubahan susunan pengurus dan persetujuan rencana pengembangan usaha.", 168, "Pemanggilan RUPSLB"],
  ["bren-rupst-2026", "BREN", "RUPST", "2026-08-27", "Mendatang", "Persetujuan laporan tahunan, penggunaan laba, dan arahan ekspansi.", 8050, "Agenda RUPST"],
  ["lapd-pubex-2026", "LAPD", "Public Expose", "2026-08-19", "Mendatang", "Paparan kinerja dan perkembangan kegiatan operasional perseroan.", 98, "Materi Public Expose"],
  ["ammn-rupst-2026", "AMMN", "RUPST", "2026-08-15", "Selesai", "Persetujuan laporan tahunan dan pembaruan rencana belanja modal.", 9150, "Ringkasan Risalah RUPST"],
  ["adro-rupslb-2026", "ADRO", "RUPSLB", "2026-08-08", "Selesai", "Persetujuan transaksi material dan perubahan penggunaan dana.", 2380, "Ringkasan Risalah RUPSLB"],
];

const dividendEvents = dividendRows.map((row) => {
  const tickerMatch = row.subject.match(/\(([A-Z0-9]{4,5})\)\.?$/);
  return [
    `dividend-${row.number.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    tickerMatch?.[1] ?? null,
    "Dividen Tunai",
    requiredDate(row.date, `dividend date for ${row.number}`),
    "Selesai",
    row.subject,
    null,
    "Dokumen KSEI",
    row.number,
  ];
});

const demoTickers = ["TOSK", "LAPD", "WEGE", "WMPP", "BREN", "ADRO", "AMMN", "CPIN", "BBNI", "BRPT"];
const accumulationValues = accumulationRows.flatMap((row) => [
  [row.stock, "1M", row.oneMonth, null, null, null, "2026-08-12"],
  [row.stock, "3M", row.threeMonth, null, null, null, "2026-08-12"],
  [row.stock, "6M", row.sixMonth, null, null, null, "2026-08-12"],
]);
const brokerValues = demoTickers.flatMap((ticker) => brokerRows.map((row) => [
  ticker,
  row.broker,
  Number.parseFloat(row.netBuy) * 1_000_000_000,
  row.averagePrice,
  row.buyDays,
  null,
  row.consistency,
  "3M",
  "2026-08-12",
]));
const timelineValues = timelineEvents.map(([date, title]) => [
  "TOSK",
  title,
  title,
  "Timeline demo awal BandarLab.",
  requiredDate(date, `timeline date for ${title}`),
]);

const groupStatements = groupRows.flatMap((group, index) => {
  const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
  const members = ((group.tickers as unknown[] | undefined) ?? []).map((ticker) => [id, String(ticker).toUpperCase()]);
  return [
    `insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values (${sqlString(id)}, null, ${sqlString(group.name)}, ${sqlString(group.description)}, true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;`,
    insertBatches("conglomerate_group_members", ["group_id", "ticker"], members, "on conflict (group_id, ticker) do nothing"),
  ];
});

const sections = [
  "-- Generated by scripts/generate-supabase-seed.ts. Do not edit manually.",
  "begin;",
  insertBatches(
    "stocks",
    ["ticker", "name", "listing_date", "listed_shares", "listing_board", "sector", "subsector", "industry", "subindustry", "subindustry_code", "indexes", "source_updated_at"],
    stockValues,
    "on conflict (ticker) do update set name = excluded.name, listing_date = excluded.listing_date, listed_shares = excluded.listed_shares, listing_board = excluded.listing_board, sector = excluded.sector, subsector = excluded.subsector, industry = excluded.industry, subindustry = excluded.subindustry, subindustry_code = excluded.subindustry_code, indexes = excluded.indexes, source_updated_at = excluded.source_updated_at",
  ),
  insertBatches(
    "stock_screener_metrics",
    ["ticker", "per", "pbv", "roe", "roa", "der", "market_cap", "total_revenue", "price_change_4w", "price_change_13w", "price_change_26w", "price_change_52w", "npm", "mtd", "ytd", "source_updated_at"],
    screenerValues,
    "on conflict (ticker) do update set per = excluded.per, pbv = excluded.pbv, roe = excluded.roe, roa = excluded.roa, der = excluded.der, market_cap = excluded.market_cap, total_revenue = excluded.total_revenue, price_change_4w = excluded.price_change_4w, price_change_13w = excluded.price_change_13w, price_change_26w = excluded.price_change_26w, price_change_52w = excluded.price_change_52w, npm = excluded.npm, mtd = excluded.mtd, ytd = excluded.ytd, source_updated_at = excluded.source_updated_at",
  ),
  insertBatches(
    "shareholder_ownership",
    ["ticker", "disclosure_threshold", "issuer_name", "investor_name", "account_holder", "classification", "local_foreign", "nationality", "domicile", "scripless_shares", "scrip_shares", "shares", "share_change", "percentage", "report_date"],
    ownershipValues(onePercentRows, 1),
    "on conflict (ticker, disclosure_threshold, investor_name, account_holder, report_date) do update set shares = excluded.shares, share_change = excluded.share_change, percentage = excluded.percentage, scripless_shares = excluded.scripless_shares, scrip_shares = excluded.scrip_shares",
  ),
  insertBatches(
    "shareholder_ownership",
    ["ticker", "disclosure_threshold", "issuer_name", "investor_name", "account_holder", "classification", "local_foreign", "nationality", "domicile", "scripless_shares", "scrip_shares", "shares", "share_change", "percentage", "report_date"],
    ownershipValues(fivePercentRows, 5),
    "on conflict (ticker, disclosure_threshold, investor_name, account_holder, report_date) do update set shares = excluded.shares, share_change = excluded.share_change, percentage = excluded.percentage, scripless_shares = excluded.scripless_shares, scrip_shares = excluded.scrip_shares",
  ),
  insertBatches("accumulation_scores", ["ticker", "period", "score", "broker_score", "volume_score", "price_score", "score_date"], accumulationValues, "on conflict (ticker, period, score_date) do update set score = excluded.score, broker_score = excluded.broker_score, volume_score = excluded.volume_score, price_score = excluded.price_score"),
  insertBatches("broker_activities", ["ticker", "broker_code", "net_buy", "average_price", "buy_days", "sell_days", "consistency", "period", "activity_date"], brokerValues, "on conflict (ticker, broker_code, period, activity_date) do update set net_buy = excluded.net_buy, average_price = excluded.average_price, buy_days = excluded.buy_days, sell_days = excluded.sell_days, consistency = excluded.consistency"),
  insertBatches("corporate_action_events", ["id", "ticker", "action_type", "event_date", "state", "topic", "announcement_price", "document_label"], corporateEvents, "on conflict (id) do update set ticker = excluded.ticker, action_type = excluded.action_type, event_date = excluded.event_date, state = excluded.state, topic = excluded.topic, announcement_price = excluded.announcement_price, document_label = excluded.document_label"),
  insertBatches("corporate_action_events", ["id", "ticker", "action_type", "event_date", "state", "topic", "announcement_price", "document_label", "document_number"], dividendEvents, "on conflict (id) do update set ticker = excluded.ticker, action_type = excluded.action_type, event_date = excluded.event_date, state = excluded.state, topic = excluded.topic, document_label = excluded.document_label, document_number = excluded.document_number"),
  insertBatches("stock_timeline", ["ticker", "event_type", "title", "description", "event_date"], timelineValues, "on conflict (ticker, event_type, title, event_date) do update set description = excluded.description"),
  ...groupStatements,
  "commit;",
  "",
];

const generatedSections = sections.filter(Boolean);
const seedSql = generatedSections.join("\n\n");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, seedSql, "utf8");

const statements = generatedSections
  .filter((section) => section !== "begin;" && section !== "commit;" && !section.startsWith("-- Generated"))
  .flatMap((section) => section.split(/\n\n(?=insert into public\.)/));
const parts: string[][] = [];
let currentPart: string[] = [];
let currentBytes = 0;

for (const statement of statements) {
  const statementBytes = Buffer.byteLength(statement, "utf8");
  if (statementBytes > maxPartBytes) {
    throw new Error(`Generated statement exceeds ${maxPartBytes} bytes. Reduce insert batch size.`);
  }
  if (currentPart.length > 0 && currentBytes + statementBytes > maxPartBytes) {
    parts.push(currentPart);
    currentPart = [];
    currentBytes = 0;
  }
  currentPart.push(statement);
  currentBytes += statementBytes;
}
if (currentPart.length > 0) parts.push(currentPart);

await rm(partsDirectory, { recursive: true, force: true });
await mkdir(partsDirectory, { recursive: true });
await Promise.all(parts.map((part, index) => {
  const sequence = String(index + 1).padStart(3, "0");
  const content = `-- BandarLab seed part ${sequence} of ${String(parts.length).padStart(3, "0")}\n-- Run files in numeric order after the schema migration.\n\nbegin;\n\n${part.join("\n\n")}\n\ncommit;\n`;
  return writeFile(resolve(partsDirectory, `${sequence}-seed.sql`), content, "utf8");
}));
await writeFile(
  resolve(partsDirectory, "RUN_IN_ORDER.md"),
  `# BandarLab seed parts\n\nRun the \`${String(parts.length).padStart(3, "0")}\` SQL files in numeric order after the schema migration. Each file is kept below 120 KB for the Supabase SQL Editor.\n`,
  "utf8",
);

console.log(`Generated ${outputPath}`);
console.log(`Seed parts: ${parts.length} in ${partsDirectory}`);
console.log(`Stocks: ${stockValues.length}`);
console.log(`Screener rows: ${screenerValues.length}`);
console.log(`Ownership 1%: ${onePercentRows.length}`);
console.log(`Ownership 5%: ${fivePercentRows.length}`);
console.log(`Konglo groups: ${groupRows.length}`);
