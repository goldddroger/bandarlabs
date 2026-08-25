import "server-only";

const axentrazBaseUrl = "https://api.axentraz.id/v1/broker-activity";

export async function fetchAxentraz(path: string) {
  const apiKey = process.env.AXENTRAZ_API_KEY;
  if (!apiKey) throw new Error("AXENTRAZ_NOT_CONFIGURED");

  return fetch(`${axentrazBaseUrl}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
}

export async function axentrazJsonResponse(path: string) {
  try {
    const upstream = await fetchAxentraz(path);
    const payload = await upstream.json().catch(() => null) as Record<string, unknown> | null;

    if (!upstream.ok) {
      const upstreamMessage = typeof payload?.message === "string" ? payload.message : null;
      const message = upstream.status === 401 || upstream.status === 403
        ? "Akses Axentraz ditolak. Periksa API key pada server."
        : upstreamMessage || `Axentraz merespons status ${upstream.status}.`;
      return Response.json({ error: message }, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
    }

    return Response.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error && error.message === "AXENTRAZ_NOT_CONFIGURED"
      ? "Axentraz belum dikonfigurasi pada server."
      : "Axentraz sedang tidak dapat dihubungi.";
    return Response.json({ error: message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
