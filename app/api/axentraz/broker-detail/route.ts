import { fetchAxentraz } from "@/lib/axentraz";

export const dynamic = "force-dynamic";

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

type AxentrazDetailPayload = {
  data?: {
    page: number;
    limit: number;
    total_rows: number;
    total_pages: number;
    transactions: unknown[];
    [key: string]: unknown;
  };
  meta?: Record<string, unknown>;
  message?: string;
};

const upstreamPageSize = 100;

async function fetchDetailPage(brokerCode: string, page: number, from: string, to: string) {
  const query = new URLSearchParams({ page: String(page), limit: String(upstreamPageSize) });
  if (from) query.set("from", from);
  if (to) query.set("to", to);

  const response = await fetchAxentraz(`/${encodeURIComponent(brokerCode)}/detail?${query.toString()}`);
  const payload = await response.json().catch(() => null) as AxentrazDetailPayload | null;
  if (!response.ok || !payload?.data) {
    const message = response.status === 401 || response.status === 403
      ? "Akses Axentraz ditolak. Periksa API key pada server."
      : payload?.message || `Axentraz merespons status ${response.status}.`;
    throw new Error(`${response.status}:${message}`);
  }
  return payload;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const brokerCode = (searchParams.get("brokerCode") ?? "").trim().toUpperCase();
  const from = (searchParams.get("from") ?? "").trim();
  const to = (searchParams.get("to") ?? "").trim();
  const page = Math.max(1, Math.min(10_000, Number(searchParams.get("page")) || 1));
  const limit = Math.max(1, Math.min(1_000, Number(searchParams.get("limit")) || 100));

  if (!/^[A-Z0-9]{2,4}$/.test(brokerCode)) {
    return Response.json({ error: "Kode broker tidak valid." }, { status: 400 });
  }
  if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) {
    return Response.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
  }

  try {
    const startOffset = (page - 1) * limit;
    const firstUpstreamPage = Math.floor(startOffset / upstreamPageSize) + 1;
    const offsetOnFirstPage = startOffset % upstreamPageSize;
    const firstPayload = await fetchDetailPage(brokerCode, firstUpstreamPage, from, to);
    const totalRows = Number(firstPayload.data?.total_rows) || 0;
    const finalOffset = Math.min(totalRows, startOffset + limit);
    const lastUpstreamPage = Math.max(firstUpstreamPage, Math.ceil(finalOffset / upstreamPageSize));
    const payloads = [firstPayload];

    for (let upstreamPage = firstUpstreamPage + 1; upstreamPage <= lastUpstreamPage; upstreamPage += 1) {
      payloads.push(await fetchDetailPage(brokerCode, upstreamPage, from, to));
    }

    const transactions = payloads
      .flatMap((payload) => payload.data?.transactions ?? [])
      .slice(offsetOnFirstPage, offsetOnFirstPage + limit);
    const data = {
      ...firstPayload.data,
      page,
      limit,
      total_rows: totalRows,
      total_pages: Math.max(1, Math.ceil(totalRows / limit)),
      transactions,
    };

    return Response.json(
      { data, meta: firstPayload.meta },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "";
    const statusMatch = rawMessage.match(/^(\d{3}):([\s\S]*)$/);
    const status = statusMatch ? Number(statusMatch[1]) : 503;
    const message = statusMatch?.[2]
      || (rawMessage === "AXENTRAZ_NOT_CONFIGURED" ? "Axentraz belum dikonfigurasi pada server." : "Axentraz sedang tidak dapat dihubungi.");
    return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
