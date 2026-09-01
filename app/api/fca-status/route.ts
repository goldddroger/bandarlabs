import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import fcaSeed from "@/data/fca-episodes.json";
import type { FcaEpisode } from "@/lib/fca-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fallbackRows = fcaSeed as FcaEpisode[];

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(ticker)) {
    return NextResponse.json({ error: "Ticker tidak valid." }, { status: 400 });
  }

  let rows = fallbackRows.filter((row) => row.ticker === ticker);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase
      .from("fca_episodes")
      .select("ticker,company_name,entered_at,exited_at,criteria,source_date")
      .eq("ticker", ticker)
      .order("entered_at", { ascending: false });
    if (!error && data?.length) rows = data as FcaEpisode[];
  }

  rows.sort((first, second) => second.entered_at.localeCompare(first.entered_at));
  const active = rows.find((row) => !row.exited_at) ?? null;
  return NextResponse.json(
    { active, latest: active ?? rows[0] ?? null, historyCount: rows.length },
    { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
  );
}
