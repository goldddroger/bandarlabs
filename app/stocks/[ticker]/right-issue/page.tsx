import { notFound } from "next/navigation";
import { RightIssueSimulator } from "@/components/right-issue/right-issue-simulator";
import { cookies } from "next/headers";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { legacyAdminOwnerId } from "@/lib/request-session";
import { loadCorporateActionWorkspace } from "@/lib/corporate-action-server";

export default async function StockRightIssuePage({ params, searchParams }: { params: Promise<{ ticker: string }>; searchParams: Promise<{ event?: string }> }) {
  const ticker = (await params).ticker.toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(ticker)) notFound();
  const eventId = (await searchParams).event;
  let source: { topic: string; document: string } | undefined;
  let sourceError: string | undefined;
  if (eventId) {
    const session = verifyAdminSession((await cookies()).get(adminSessionCookie)?.value, process.env.AUTH_SESSION_SECRET);
    if (session) {
      try {
        const workspace = await loadCorporateActionWorkspace(session.userId ?? legacyAdminOwnerId);
        const event = workspace.events.find((item) => item.id === eventId && item.ticker === ticker && /right[\s-]*issue|HMETD|PMHMETD/i.test(item.actionType));
        if (event) source = { topic: event.topic, document: event.documentLabel };
        else sourceError = "Agenda asal tidak tersedia. Isi ketentuan right issue dari dokumen emiten.";
      } catch {
        sourceError = "Agenda asal belum dapat dimuat. Simulator tetap dapat digunakan dengan input manual.";
      }
    }
  }
  return <RightIssueSimulator key={`${ticker}:${eventId ?? ""}`} ticker={ticker} source={source} sourceError={sourceError} />;
}
