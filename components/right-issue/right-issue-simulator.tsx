"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Calculator, FlaskConical, RotateCcw } from "lucide-react";
import { RightIssueForm } from "@/components/right-issue/right-issue-form";
import { emptyRightIssueDraft, emptyRightIssueScenarioDraft, rightIssueDemo, rightIssueScenarioDemo } from "@/lib/calculations/right-issue-draft";
import type { RightIssueDraft, RightIssueScenarioDraft } from "@/types/right-issue";
import { calculateRightIssue } from "@/lib/calculations/right-issue";
import { parseSimulationNumber } from "@/lib/calculations/right-issue-format";
import { RightIssueSummary } from "@/components/right-issue/right-issue-summary";
import { calculateRightIssueScenarios, calculateRightIssuePriceMatrix } from "@/lib/calculations/right-issue-scenarios";
import { ScenarioAssumptions } from "./scenario-assumptions";
import { ScenarioResults } from "./scenario-results";
import { ScenarioComparison } from "./scenario-comparison";
import { ScenarioPriceMatrix } from "./scenario-price-matrix";
import { ScenarioInsight } from "./scenario-insight";
import { ExDateImpact } from "./ex-date-impact";

export function RightIssueSimulator({ ticker = "", source, sourceError }: { ticker?: string; source?: { topic: string; document: string }; sourceError?: string }) {
  const [draft, setDraft] = useState(() => emptyRightIssueDraft(ticker));
  const [demo, setDemo] = useState(false);
  const [scenarioDraft, setScenarioDraft] = useState(emptyRightIssueScenarioDraft);
  const incomplete = [draft.ownedShares, draft.averageBuy, draft.cumPrice, draft.ratioOld, draft.ratioNew, draft.subscriptionPrice].some((value) => !value.trim());
  const input = useMemo(() => ({
    ownedShares: parseSimulationNumber(draft.ownedShares), averageBuy: parseSimulationNumber(draft.averageBuy), cumPrice: parseSimulationNumber(draft.cumPrice), ratioOld: parseSimulationNumber(draft.ratioOld), ratioNew: parseSimulationNumber(draft.ratioNew), subscriptionPrice: parseSimulationNumber(draft.subscriptionPrice), marketRightsPrice: draft.marketRightsPrice ? parseSimulationNumber(draft.marketRightsPrice) : null,
  }), [draft]);
  const result = useMemo(() => calculateRightIssue(input), [input]);
  const parentSalePrice = scenarioDraft.parentSalePrice.trim() ? parseSimulationNumber(scenarioDraft.parentSalePrice) : null;
  const scenarios = useMemo(() => calculateRightIssueScenarios(input, {
    postExPrice: scenarioDraft.postExPrice.trim() ? parseSimulationNumber(scenarioDraft.postExPrice) : null,
    parentSalePrice,
  }), [input, scenarioDraft.postExPrice, parentSalePrice]);
  const matrix = useMemo(() => {
    if (![scenarioDraft.matrixLow, scenarioDraft.matrixHigh, scenarioDraft.matrixStep].every((value) => value.trim())) return null;
    return calculateRightIssuePriceMatrix(input, {
      low: parseSimulationNumber(scenarioDraft.matrixLow), high: parseSimulationNumber(scenarioDraft.matrixHigh), step: parseSimulationNumber(scenarioDraft.matrixStep), parentSalePrice,
    });
  }, [input, scenarioDraft.matrixLow, scenarioDraft.matrixHigh, scenarioDraft.matrixStep, parentSalePrice]);
  function update(key: keyof RightIssueDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function updateScenario(key: keyof RightIssueScenarioDraft, value: string) {
    setScenarioDraft((current) => ({ ...current, [key]: value }));
  }
  return (
    <section className="mx-auto w-full max-w-7xl">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap gap-2 text-xs text-gray-500">
        <Link href={ticker ? "/corporate-action" : "/tools/right-issue-simulator"}>{ticker ? "Corporate Action" : "Tools"}</Link>
        <span>/</span>{ticker ? <><Link href={`/stocks/${ticker}`}>{ticker}</Link><span>/</span></> : null}<span>Right Issue Simulator</span>
      </nav>
      <div className="mb-6 flex items-start gap-3">
        <Calculator className="mt-1 size-6 shrink-0 text-red-600" />
        <div><h1 className="text-2xl font-semibold text-gray-950">Right Issue Scenario Simulator</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">Bandingkan dampak menebus HMETD, menjual HMETD, mempertahankan saham induk, atau keluar sebelum ex-date.</p></div>
      </div>
      {source && !demo && draft.ticker === ticker ? <div className="mb-5 border-l-2 border-red-500 bg-gray-50 px-4 py-3"><p className="text-sm font-semibold text-gray-950">Agenda {ticker}: {source.topic}</p><p className="mt-1 text-xs leading-5 text-gray-500">{source.document} · Rasio, harga pelaksanaan, dan tanggal spesifik diisi dari dokumen resmi emiten.</p></div> : null}
      {sourceError ? <p className="mb-5 text-xs leading-5 text-amber-800">{sourceError}</p> : null}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setDraft(rightIssueDemo); setScenarioDraft(rightIssueScenarioDemo); setDemo(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><FlaskConical className="size-4" />Load Example</button>
        <button type="button" onClick={() => { setDraft(emptyRightIssueDraft(ticker)); setScenarioDraft(emptyRightIssueScenarioDraft()); setDemo(false); }} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><RotateCcw className="size-4" />Reset Simulation</button>
        {demo ? <span className="rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Demo Data · bukan ketentuan aktual WMPP</span> : null}
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <RightIssueForm draft={draft} onChange={update} />
        <RightIssueSummary calculation={result.data} draft={draft} errors={incomplete ? [] : result.errors} incomplete={incomplete} />
      </div>
      <ScenarioAssumptions draft={scenarioDraft} terp={result.data?.terp ?? null} cumPrice={result.ok ? input.cumPrice : null} onChange={updateScenario} />
      <ScenarioResults calculation={incomplete ? null : scenarios.data} errors={result.ok ? scenarios.errors : []} missingRightsPrice={input.marketRightsPrice === null} />
      <ScenarioComparison calculation={incomplete ? null : scenarios.data} />
      <ScenarioPriceMatrix draft={scenarioDraft} rows={incomplete ? null : matrix?.data ?? null} errors={result.ok ? matrix?.errors ?? [] : []} onChange={updateScenario} />
      <ExDateImpact input={input} calculation={incomplete ? null : result.data} />
      <ScenarioInsight input={input} calculation={incomplete ? null : scenarios.data} />
      <p className="mt-6 border-t border-gray-200 pt-4 text-xs leading-5 text-gray-500">Simulator ini menggunakan perhitungan matematis dan asumsi harga. Harga pasar setelah ex-date dapat bergerak berbeda dari harga teoritis. Hasil simulasi bukan merupakan rekomendasi jual atau beli.</p>
    </section>
  );
}
