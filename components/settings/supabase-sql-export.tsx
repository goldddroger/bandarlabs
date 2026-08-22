"use client";

import { useState } from "react";
import { Database, Download, FileCode2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type StoredRow = Record<string, unknown>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const months: Record<string, string> = {
  jan: "01", januari: "01", feb: "02", februari: "02", mar: "03", maret: "03",
  apr: "04", april: "04", mei: "05", jun: "06", juni: "06", jul: "07", juli: "07",
  agu: "08", agt: "08", agustus: "08", sep: "09", september: "09", okt: "10",
  oktober: "10", nov: "11", november: "11", des: "12", desember: "12",
};

function readRows(key: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(value) ? value.filter((row): row is StoredRow => Boolean(row) && typeof row === "object") : [];
  } catch {
    return [];
  }
}

function readObject(key: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "{}") as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as StoredRow) : {};
  } catch {
    return {};
  }
}

function textValue(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sqlText(value: unknown) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

function sqlNullableText(value: unknown) {
  const normalized = textValue(value);
  return normalized ? sqlText(normalized) : "null";
}

function normalizeDate(value: unknown) {
  const normalized = textValue(value);
  const isoMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const localMatch = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  const month = localMatch ? months[localMatch[2].toLowerCase()] : undefined;
  if (localMatch && month) return `${localMatch[3]}-${month}-${localMatch[1].padStart(2, "0")}`;

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

function insertRows(table: string, columns: string[], rows: string[][], conflict: string) {
  if (rows.length === 0) return "";
  return `insert into public.${table} (${columns.join(", ")}) values\n${rows
    .map((row) => `  (${row.join(", ")})`)
    .join(",\n")}\n${conflict};`;
}

function createPersonalDataSql(ownerId: string) {
  const owner = sqlText(ownerId);
  const statements: string[] = [];
  const counts: Record<string, number> = {};

  const radar = readRows("bandarlab.accumulation.selectedStocks");
  counts.radar = radar.length;
  statements.push(insertRows(
    "radar_entries",
    ["owner_id", "ticker", "status", "entry_price", "entry_price_source", "started_at"],
    radar.map((row) => [
      owner,
      sqlText(textValue(row.ticker).toUpperCase()),
      sqlText(row.signalType),
      String(numberValue(row.entryPrice)),
      sqlNullableText(row.entryPriceSource),
      sqlText(normalizeDate(row.addedAt)),
    ]),
    "on conflict (owner_id, ticker) do update set status = excluded.status, entry_price = excluded.entry_price, entry_price_source = excluded.entry_price_source, started_at = excluded.started_at",
  ));

  const recommendations = readRows("bandarlab.accumulation.externalRecommendations");
  counts.rekomendasi = recommendations.length;
  statements.push(insertRows(
    "external_recommendations",
    ["id", "owner_id", "ticker", "source", "status", "trend", "monitored_at", "entry_price", "entry_price_source", "note"],
    recommendations.map((row) => [
      sqlText(row.id), owner, sqlText(textValue(row.stock).toUpperCase()), sqlText(row.source), sqlText(row.status),
      sqlText(row.trend), sqlText(normalizeDate(row.monitoredAt)), String(numberValue(row.entryPrice)),
      sqlNullableText(row.entryPriceSource), sqlText(row.note),
    ]),
    "on conflict (owner_id, id) do update set ticker = excluded.ticker, source = excluded.source, status = excluded.status, trend = excluded.trend, monitored_at = excluded.monitored_at, entry_price = excluded.entry_price, entry_price_source = excluded.entry_price_source, note = excluded.note",
  ));

  const portfolio = readObject("bandarlab.portfolio.v1");
  const holdings = Array.isArray(portfolio.holdings) ? (portfolio.holdings as StoredRow[]) : [];
  const trades = Array.isArray(portfolio.trades) ? (portfolio.trades as StoredRow[]) : [];
  const equityHistory = Array.isArray(portfolio.equityHistory) ? (portfolio.equityHistory as StoredRow[]) : [];
  counts.posisi = holdings.length;
  counts.trade = trades.length;
  counts.equity = equityHistory.length;

  statements.push(insertRows(
    "portfolio_holdings",
    ["id", "owner_id", "ticker", "lots", "average_price", "purchased_at", "note"],
    holdings.map((row) => [
      sqlText(row.id), owner, sqlText(textValue(row.ticker).toUpperCase()), String(numberValue(row.lots)),
      String(numberValue(row.averagePrice)), sqlText(normalizeDate(row.purchasedAt)), sqlText(row.note),
    ]),
    "on conflict (owner_id, id) do update set ticker = excluded.ticker, lots = excluded.lots, average_price = excluded.average_price, purchased_at = excluded.purchased_at, note = excluded.note",
  ));

  statements.push(insertRows(
    "portfolio_trades",
    ["id", "owner_id", "ticker", "lots", "buy_price", "sell_price", "buy_fee_percent", "sell_fee_percent", "sold_at", "note"],
    trades.map((row) => [
      sqlText(row.id), owner, sqlText(textValue(row.ticker).toUpperCase()), String(numberValue(row.lots)),
      String(numberValue(row.buyPrice)), String(numberValue(row.sellPrice)), String(numberValue(row.buyFeePercent)),
      String(numberValue(row.sellFeePercent)), sqlText(normalizeDate(row.soldAt)), sqlText(row.note),
    ]),
    "on conflict (owner_id, id) do update set ticker = excluded.ticker, lots = excluded.lots, buy_price = excluded.buy_price, sell_price = excluded.sell_price, buy_fee_percent = excluded.buy_fee_percent, sell_fee_percent = excluded.sell_fee_percent, sold_at = excluded.sold_at, note = excluded.note",
  ));

  statements.push(insertRows(
    "portfolio_equity_history",
    ["owner_id", "snapshot_date", "equity"],
    equityHistory.map((row) => [owner, sqlText(normalizeDate(row.date)), String(numberValue(row.equity))]),
    "on conflict (owner_id, snapshot_date) do update set equity = excluded.equity",
  ));

  const bestEntries: StoredRow[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith("bandarlab-best-entry:") || key.endsWith(":last-fired")) continue;
    const ticker = key.replace("bandarlab-best-entry:", "").toUpperCase();
    const entry = readObject(key);
    if (numberValue(entry.price) <= 0) continue;
    bestEntries.push({ ticker, price: entry.price, lastFired: window.localStorage.getItem(`${key}:last-fired`) });
  }
  counts.alert = bestEntries.length;
  statements.push(insertRows(
    "best_entry_alerts",
    ["owner_id", "ticker", "entry_price", "last_fired_value"],
    bestEntries.map((row) => [owner, sqlText(row.ticker), String(numberValue(row.price)), sqlNullableText(row.lastFired)]),
    "on conflict (owner_id, ticker) do update set entry_price = excluded.entry_price, last_fired_value = excluded.last_fired_value",
  ));

  const notes = readRows("bandarlab-corporate-action-notes");
  counts.catatanCA = notes.length;
  statements.push(insertRows(
    "corporate_action_notes",
    ["id", "owner_id", "event_id", "key_message", "decision", "follow_up", "status", "updated_label"],
    notes.map((row) => [
      sqlText(row.id), owner, sqlText(row.eventId), sqlText(row.keyMessage), sqlText(row.decision),
      sqlText(row.followUp), sqlText(row.status), sqlNullableText(row.updatedAt),
    ]),
    "on conflict (owner_id, id) do update set event_id = excluded.event_id, key_message = excluded.key_message, decision = excluded.decision, follow_up = excluded.follow_up, status = excluded.status, updated_label = excluded.updated_label",
  ));

  const groups = readRows("bandarlab-konglo-groups");
  counts.grup = groups.length;
  for (const group of groups) {
    const tickers = Array.isArray(group.tickers)
      ? group.tickers.map((ticker) => textValue(ticker).toUpperCase()).filter(Boolean)
      : [];
    const memberValues = tickers.map((ticker) => `(${sqlText(ticker)})`).join(", ");
    statements.push(`with saved_group as (
  insert into public.conglomerate_groups (owner_id, name, description, is_system)
  values (${owner}, ${sqlText(group.name)}, ${sqlText(group.description)}, false)
  on conflict (owner_id, name) do update set description = excluded.description
  returning id
)${memberValues ? `,
members(ticker) as (values ${memberValues})
insert into public.conglomerate_group_members (group_id, ticker)
select saved_group.id, members.ticker
from saved_group cross join members
join public.stocks on stocks.ticker = members.ticker
on conflict (group_id, ticker) do nothing` : "\nselect id from saved_group"};`);
  }

  const body = statements.filter(Boolean).join("\n\n");
  const sql = `-- BandarLab personal data export
-- Owner auth.users.id: ${ownerId}
-- Run after the schema migration and supabase/seed.sql.

begin;

do $$
begin
  if not exists (select 1 from auth.users where id = ${owner}::uuid) then
    raise exception 'Supabase auth user ${ownerId} tidak ditemukan';
  end if;
end $$;

${body || "-- Tidak ada data lokal yang perlu dipindahkan."}

commit;
`;

  return { sql, counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) };
}

export function SupabaseSqlExport() {
  const [ownerId, setOwnerId] = useState("");

  function downloadSql() {
    const normalizedOwnerId = ownerId.trim();
    if (!uuidPattern.test(normalizedOwnerId)) {
      toast.error("UUID user Supabase belum valid", {
        description: "Salin User UID dari Supabase Authentication > Users.",
      });
      return;
    }

    try {
      const result = createPersonalDataSql(normalizedOwnerId);
      const blobUrl = URL.createObjectURL(new Blob([result.sql], { type: "application/sql;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `bandarlab-user-data-${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      toast.success("SQL data pribadi berhasil dibuat", {
        description: `${result.total} baris lokal siap dimigrasikan ke Supabase.`,
      });
    } catch {
      toast.error("SQL gagal dibuat", { description: "Data lokal tidak dapat dibaca oleh browser." });
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
            <Database className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Ekspor Data Pribadi</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Ubah data yang tersimpan di browser menjadi SQL dengan kepemilikan user Supabase yang benar.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="text-sm font-semibold text-gray-800" htmlFor="supabase-owner-id">
            Supabase User UID
          </label>
          <input
            id="supabase-owner-id"
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            placeholder="00000000-0000-4000-8000-000000000000"
            className="mt-2 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
          <p className="mt-2 text-xs leading-5 text-gray-500">
            UID tersedia di Supabase Dashboard pada menu Authentication, lalu Users.
          </p>
        </div>

        <div className="mt-5 rounded-md border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Isi file ekspor</p>
          <div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-gray-700 sm:grid-cols-2">
            <span>Radar dan rekomendasi</span>
            <span>Portfolio dan riwayat trade</span>
            <span>Equity history dan alert entry</span>
            <span>Catatan CA dan grup kustom</span>
          </div>
        </div>

        <Button className="mt-5 w-full sm:w-auto" onClick={downloadSql}>
          <Download className="size-4" />
          Unduh SQL Data Pribadi
        </Button>
      </section>

      <aside className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <FileCode2 className="size-5 text-red-700" />
          <h3 className="mt-3 text-sm font-semibold text-gray-950">Urutan migrasi</h3>
          <ol className="mt-3 space-y-2 text-sm leading-5 text-gray-600">
            <li>1. Jalankan migration schema.</li>
            <li>2. Jalankan seed data referensi.</li>
            <li>3. Jalankan SQL hasil ekspor ini.</li>
          </ol>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-5">
          <ShieldCheck className="size-5 text-green-700" />
          <h3 className="mt-3 text-sm font-semibold text-green-950">Aman per akun</h3>
          <p className="mt-2 text-sm leading-5 text-green-800">
            Row Level Security membatasi radar, portfolio, alert, dan catatan hanya untuk pemilik datanya.
          </p>
        </div>
      </aside>
    </div>
  );
}
