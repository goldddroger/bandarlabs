import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";
import { getDashboardMarketSummary } from "@/lib/market-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const marketSummary = await getDashboardMarketSummary();

  return <DashboardWorkspace marketSummary={marketSummary} />;
}
