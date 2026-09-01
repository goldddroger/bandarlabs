export type FinancialStatementKind = "profile" | "balance_sheet" | "income_statement" | "cash_flow" | "note";

export type FinancialReportFact = {
  statement: FinancialStatementKind;
  sheetCode: string;
  sheetTitle: string;
  rowNumber: number;
  label: string;
  labelEn: string;
  concept: string | null;
  currentValue: number | null;
  priorValue: number | null;
};

export type FinancialMetric = {
  current: number | null;
  prior: number | null;
  changeAmount: number | null;
  changePercent: number | null;
};

export type FinancialEvidence = {
  label: string;
  sheetCode: string;
  rowNumber: number;
  currentValue: number | null;
  priorValue: number | null;
  sourceType?: "xlsx" | "pdf";
  sourceFile?: string;
  pageNumber?: number;
};

export type FinancialSupportingDocument = {
  name: string;
  kind: "financial_statements" | "movement_disclosure" | "material_information" | "supporting_document";
  pageCount: number;
  storagePath: string;
  downloadUrl?: string | null;
};

export type FinancialInsight = {
  id: string;
  category: "headline" | "profit" | "balance" | "debt" | "cash_flow" | "risk" | "business_mix";
  tone: "positive" | "negative" | "warning" | "neutral";
  title: string;
  summary: string;
  basis: "disclosed" | "calculated" | "inference" | "insufficient_data";
  confidence: "high" | "medium" | "low";
  evidence: FinancialEvidence[];
};

export type FinancialBreakdownItem = {
  label: string;
  value: number;
  priorValue: number | null;
  sharePercent: number | null;
  sheetCode: string;
  rowNumber: number;
};

export type FinancialBreakdown = {
  id: string;
  label: string;
  items: FinancialBreakdownItem[];
};

export type FinancialReportKpis = {
  revenue: FinancialMetric;
  grossProfit: FinancialMetric;
  grossMargin: FinancialMetric;
  netIncome: FinancialMetric;
  operatingCashFlow: FinancialMetric;
  cash: FinancialMetric;
  assets: FinancialMetric;
  liabilities: FinancialMetric;
  equity: FinancialMetric;
  interestBearingDebt: FinancialMetric;
  inventory: FinancialMetric;
  receivables: FinancialMetric;
  currentRatio?: FinancialMetric;
  debtToEquity?: FinancialMetric;
  netDebt?: FinancialMetric;
  interestCoverage?: FinancialMetric;
  netMargin?: FinancialMetric;
  annualizedRoa?: FinancialMetric;
  annualizedRoe?: FinancialMetric;
  freeCashFlow?: FinancialMetric;
};

export type ParsedFinancialReport = {
  ticker: string;
  entityName: string;
  industryFamily: string;
  sector: string;
  subsector: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  priorPeriodStart: string | null;
  priorPeriodEnd: string | null;
  currency: "IDR" | "USD" | string;
  unitLabel: string;
  unitMultiplier: number;
  reportType: string;
  auditor: string;
  taxonomyFamily: "general" | "financial" | "unknown";
  headline: string;
  executiveSummary: string;
  kpis: FinancialReportKpis;
  insights: FinancialInsight[];
  breakdowns: FinancialBreakdown[];
  facts: FinancialReportFact[];
  sourceFile?: string;
};

export type FinancialReportRecord = Omit<ParsedFinancialReport, "facts"> & {
  id: string;
  analystNote: string;
  storagePath: string | null;
  supportingDocuments: FinancialSupportingDocument[];
  createdAt: string;
  updatedAt: string;
};

export type WorkbookSheet = {
  sheet: string;
  data: readonly (readonly unknown[])[];
};

export function financialChange(current: number | null, prior: number | null) {
  if (current === null || prior === null) return { amount: null, percent: null };
  const amount = current - prior;
  const percent = prior === 0 ? null : (amount / Math.abs(prior)) * 100;
  return { amount, percent };
}

export function financialMetric(current: number | null, prior: number | null): FinancialMetric {
  const change = financialChange(current, prior);
  return { current, prior, changeAmount: change.amount, changePercent: change.percent };
}

export function formatFinancialAmount(
  value: number | null,
  currency: string,
  multiplier: number,
  options: { absolute?: boolean } = {},
) {
  if (value === null || !Number.isFinite(value)) return "-";
  const normalized = (options.absolute ? Math.abs(value) : value) * multiplier;
  const absolute = Math.abs(normalized);
  const prefix = currency === "IDR" ? "Rp" : currency === "USD" ? "US$" : currency;
  const sign = normalized < 0 ? "-" : "";
  const units = currency === "IDR"
    ? [[1_000_000_000_000, "T"], [1_000_000_000, "M"], [1_000_000, "Jt"]] as const
    : [[1_000_000_000, "B"], [1_000_000, "M"], [1_000, "K"]] as const;
  const unit = units.find(([threshold]) => absolute >= threshold);
  if (!unit) return `${sign}${prefix} ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(absolute)}`;
  const scaled = absolute / unit[0];
  return `${sign}${prefix} ${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(scaled)} ${unit[1]}`;
}

export function formatFinancialPercent(value: number | null, includeSign = true) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${includeSign && value > 0 ? "+" : ""}${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
}
