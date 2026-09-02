import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  buildOwnershipMovements,
  emptyMovementCounts,
  type OwnershipMovement,
  type OwnershipMovementRow,
  type OwnershipSnapshotRow,
} from "@/lib/ownership-screener";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const selectColumns = "id,ticker,disclosure_threshold,issuer_name,investor_name,account_holder,classification,local_foreign,nationality,domicile,shares,percentage,report_date";
const validMovements = new Set<OwnershipMovement>(["new", "increased", "stable", "decreased", "exited"]);
const cacheTtl = 2 * 60 * 1000;
const snapshotCache = new Map<string, { expiresAt: number; rows: OwnershipSnapshotRow[] }>();
const dateCache = new Map<number, { expiresAt: number; dates: string[] }>();

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function noStore(payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, {
    ...init,
    headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate", ...init?.headers },
  });
}

async function loadSnapshot(supabase: SupabaseClient, threshold: 1 | 5, reportDate: string) {
  const cacheKey = `${threshold}:${reportDate}`;
  const cached = snapshotCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;
  const rows: OwnershipSnapshotRow[] = [];
  const batchSize = 1000;
  for (let offset = 0; offset < 20_000; offset += batchSize) {
    const { data, error } = await supabase
      .from("shareholder_ownership")
      .select(selectColumns)
      .eq("disclosure_threshold", threshold)
      .eq("report_date", reportDate)
      .order("id")
      .range(offset, offset + batchSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as OwnershipSnapshotRow[];
    rows.push(...batch);
    if (batch.length < batchSize) break;
  }
  snapshotCache.set(cacheKey, { expiresAt: Date.now() + cacheTtl, rows });
  return rows;
}

async function loadAvailableDates(supabase: SupabaseClient, threshold: 1 | 5) {
  const cached = dateCache.get(threshold);
  if (cached && cached.expiresAt > Date.now()) return cached.dates;
  const remember = (dates: string[]) => {
    dateCache.set(threshold, { expiresAt: Date.now() + cacheTtl, dates });
    return dates;
  };
  const rpcResult = await supabase.rpc("ownership_available_dates", { p_threshold: threshold });
  if (!rpcResult.error && rpcResult.data?.length) {
    return remember(Array.from(new Set((rpcResult.data as Array<{ snapshot_date: string }>).map((row) => String(row.snapshot_date)))).sort().reverse());
  }

  const runResult = await supabase
    .from("ownership_import_runs")
    .select("report_date")
    .eq("disclosure_threshold", threshold)
    .order("report_date", { ascending: false })
    .limit(200);
  if (!runResult.error && runResult.data?.length) {
    return remember(Array.from(new Set(runResult.data.map((run) => String(run.report_date)))).sort().reverse());
  }

  const dates = new Set<string>();
  const batchSize = 1000;
  for (let offset = 0; offset < 100_000; offset += batchSize) {
    const { data, error } = await supabase
      .from("shareholder_ownership")
      .select("report_date")
      .eq("disclosure_threshold", threshold)
      .order("report_date", { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (error) throw new Error(error.message);
    (data ?? []).forEach((row) => dates.add(String(row.report_date)));
    if ((data ?? []).length < batchSize || dates.size >= 24) break;
  }
  return remember(Array.from(dates).sort().reverse());
}

async function loadDatabaseScreener(
  supabase: SupabaseClient,
  input: { threshold: 1 | 5; currentDate: string; comparisonDate: string; search: string; scope: string | null; movement: string; sort: string; page: number; pageSize: number },
) {
  const { data, error } = await supabase.rpc("ownership_movement_screener", {
    p_threshold: input.threshold,
    p_current_date: input.currentDate,
    p_previous_date: input.comparisonDate,
    p_search: input.search,
    p_scope: input.scope,
    p_movement: input.movement,
    p_sort: input.sort,
    p_page: input.page,
    p_page_size: input.pageSize,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as { rows?: OwnershipMovementRow[]; counts?: Record<OwnershipMovement, number>; total?: number; snapshotRows?: number };
}

function movementCounts(rows: OwnershipMovementRow[]) {
  return rows.reduce((counts, row) => {
    counts[row.movement] += 1;
    return counts;
  }, emptyMovementCounts());
}

export async function GET(request: Request) {
  const supabase = adminClient();
  if (!supabase) return noStore({ error: "Supabase Ownership Tracker belum dikonfigurasi." }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const threshold: 1 | 5 = params.get("threshold") === "5" ? 5 : 1;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(params.get("pageSize")) || 25));
  const search = (params.get("search") ?? "").trim().toLowerCase().slice(0, 120);
  const scope = ["L", "A"].includes(params.get("scope") ?? "") ? params.get("scope") : "all";
  const movementParam = params.get("movement") ?? "all";
  const movement = validMovements.has(movementParam as OwnershipMovement) ? movementParam as OwnershipMovement : "all";
  const sort = params.get("sort") ?? "change_desc";

  let dates: string[];
  try {
    dates = await loadAvailableDates(supabase, threshold);
  } catch (error) {
    return noStore({ error: error instanceof Error ? `Periode ownership gagal dimuat: ${error.message}` : "Periode ownership gagal dimuat." }, { status: 500 });
  }
  const currentDate = dates.includes(params.get("currentDate") ?? "") ? params.get("currentDate")! : dates[0] ?? "";
  const requestedPrevious = params.get("comparisonDate") ?? "";
  const comparisonDate = dates.includes(requestedPrevious) && requestedPrevious < currentDate
    ? requestedPrevious
    : dates.find((date) => date < currentDate) ?? "";

  if (!currentDate) return noStore({ dates, currentDate: "", comparisonDate: "", rows: [], counts: emptyMovementCounts(), total: 0, page: 1, totalPages: 1 });

  try {
    if (comparisonDate) {
      const databaseResult = await loadDatabaseScreener(supabase, { threshold, currentDate, comparisonDate, search, scope, movement, sort, page, pageSize });
      if (databaseResult) {
        const total = Number(databaseResult.total || 0);
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages);
        return noStore({
          dates,
          currentDate,
          comparisonDate,
          rows: databaseResult.rows ?? [],
          counts: databaseResult.counts ?? emptyMovementCounts(),
          total,
          page: safePage,
          totalPages,
          snapshotRows: Number(databaseResult.snapshotRows || 0),
        });
      }
    }
    const [currentRows, previousRows] = await Promise.all([
      loadSnapshot(supabase, threshold, currentDate),
      comparisonDate ? loadSnapshot(supabase, threshold, comparisonDate) : Promise.resolve([]),
    ]);
    if (!comparisonDate) return noStore({ dates, currentDate, comparisonDate: "", rows: [], counts: emptyMovementCounts(), total: 0, page: 1, totalPages: 1, snapshotRows: currentRows.length, comparisonRequired: true });
    let rows = buildOwnershipMovements(currentRows, previousRows, currentDate);
    rows = rows.filter((row) => {
      const scopeMatches = scope === "all"
        || (scope === "A" ? ["A", "F"].includes(row.local_foreign ?? "") : row.local_foreign === "L");
      const searchMatches = !search || `${row.investor_name} ${row.account_holder ?? ""} ${row.ticker} ${row.issuer_name}`.toLowerCase().includes(search);
      return scopeMatches && searchMatches;
    });
    const counts = movementCounts(rows);
    if (movement !== "all") rows = rows.filter((row) => row.movement === movement);

    rows.sort((left, right) => {
      if (sort === "change_asc") return Number(left.share_change ?? 0) - Number(right.share_change ?? 0);
      if (sort === "percentage") return Number(right.percentage ?? 0) - Number(left.percentage ?? 0);
      if (sort === "investor") return left.investor_name.localeCompare(right.investor_name, "id");
      if (sort === "ticker") return left.ticker.localeCompare(right.ticker, "id") || left.investor_name.localeCompare(right.investor_name, "id");
      return Number(right.share_change ?? 0) - Number(left.share_change ?? 0);
    });

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return noStore({
      dates,
      currentDate,
      comparisonDate,
      rows: rows.slice(start, start + pageSize),
      counts,
      total,
      page: safePage,
      totalPages,
      snapshotRows: currentRows.length,
    });
  } catch (error) {
    return noStore({ error: error instanceof Error ? `Screener ownership gagal dimuat: ${error.message}` : "Screener ownership gagal dimuat." }, { status: 500 });
  }
}
