import { AlertTriangle, Info } from "lucide-react";
import { getRightIssueInsights } from "@/lib/calculations/right-issue-insights";
import type { RightIssueInput, RightIssueScenarioCalculation } from "@/types/right-issue";

export function ScenarioInsight({ input, calculation }: { input: RightIssueInput; calculation: RightIssueScenarioCalculation | null }) {
  if (!calculation) return null;
  return <section aria-label="Penjelasan skenario" className="mt-8 border-t border-gray-200 pt-6">
    <h2 className="text-lg font-semibold text-gray-950">Scenario Insight</h2>
    <div className="mt-3 divide-y divide-gray-100">{getRightIssueInsights(input, calculation).map((insight) => {
      const Icon = insight.warning ? AlertTriangle : Info;
      return <div key={insight.id} className="flex items-start gap-3 py-4"><Icon className={`mt-0.5 size-4 shrink-0 ${insight.warning ? "text-amber-700" : "text-gray-400"}`} /><div><h3 className="text-sm font-semibold text-gray-950">{insight.title}</h3><p className="mt-1 text-sm leading-6 text-gray-600">{insight.text}</p></div></div>;
    })}</div>
  </section>;
}
