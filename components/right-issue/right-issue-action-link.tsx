import Link from "next/link";
import { Calculator } from "lucide-react";
import type { CorporateActionEvent } from "@/lib/corporate-action";

export function RightIssueActionLink({ event }: { event: CorporateActionEvent }) {
  if (!/right[\s-]*issue|HMETD|PMHMETD/i.test(event.actionType)) return null;
  return <Link href={`/stocks/${event.ticker}/right-issue?event=${encodeURIComponent(event.id)}`} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"><Calculator className="size-3.5 shrink-0" />Simulasikan Right Issue</Link>;
}
