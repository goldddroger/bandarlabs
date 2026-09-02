import type { FinancialMetric, FinancialReportRecord } from "@/lib/financial-report";

export type FinancialTrendPoint = {
  reportId: string;
  periodEnd: string;
  label: string;
  quarter: number;
  year: number;
  revenue: number | null;
  netIncome: number | null;
  operatingCashFlow: number | null;
  assets: number | null;
  liabilities: number | null;
  equity: number | null;
  cash: number | null;
  debt: number | null;
};

export type FinancialComparisonRow = {
  id: string;
  label: string;
  current: number | null;
  previous: number | null;
  changePercent: number | null;
  format: "amount" | "percent" | "ratio";
  context: string;
};

export type FinancialPeriodComparison = {
  history: FinancialReportRecord[];
  trend: FinancialTrendPoint[];
  previousReport: FinancialReportRecord | null;
  qoq: FinancialComparisonRow[];
  yoy: FinancialComparisonRow[];
  cashConversion: number | null;
  priorCashConversion: number | null;
  nonOperatingSignals: string[];
  documentFindings: Array<{
    id: string;
    periodEnd: string;
    title: string;
    summary: string;
    source: string;
  }>;
};

type MetricKey = "revenue" | "netIncome" | "operatingCashFlow" | "assets" | "liabilities" | "equity" | "cash" | "interestBearingDebt";

function actual(value: number | null | undefined, report: FinancialReportRecord) {
  return value === null || value === undefined || !Number.isFinite(value) ? null : value * report.unitMultiplier;
}

function percentChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function quarterOf(periodEnd: string) {
  return Math.ceil(Number(periodEnd.slice(5, 7)) / 3);
}

function yearOf(periodEnd: string) {
  return Number(periodEnd.slice(0, 4));
}

function metricActual(report: FinancialReportRecord, key: MetricKey) {
  return actual(report.kpis[key]?.current, report);
}

function canDeriveConsecutiveQuarter(current: FinancialReportRecord, previous: FinancialReportRecord) {
  return yearOf(current.periodEnd) === yearOf(previous.periodEnd)
    && quarterOf(current.periodEnd) === quarterOf(previous.periodEnd) + 1
    && current.periodStart.slice(0, 7) === previous.periodStart.slice(0, 7);
}

function standaloneMetric(history: FinancialReportRecord[], index: number, key: MetricKey) {
  const report = history[index];
  const cumulative = metricActual(report, key);
  if (cumulative === null) return null;
  if (quarterOf(report.periodEnd) === 1) return cumulative;
  const previous = history[index - 1];
  if (!previous || !canDeriveConsecutiveQuarter(report, previous)) return null;
  const priorCumulative = metricActual(previous, key);
  return priorCumulative === null ? null : cumulative - priorCumulative;
}

function comparisonRow(
  id: string,
  label: string,
  current: number | null,
  previous: number | null,
  format: FinancialComparisonRow["format"],
  context: string,
): FinancialComparisonRow {
  return { id, label, current, previous, changePercent: percentChange(current, previous), format, context };
}

function ratio(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

function yoyMetric(report: FinancialReportRecord, key: MetricKey) {
  const metric = report.kpis[key] as FinancialMetric | undefined;
  return {
    current: actual(metric?.current, report),
    prior: actual(metric?.prior, report),
  };
}

export function buildFinancialPeriodComparison(
  reports: FinancialReportRecord[],
  selected: FinancialReportRecord,
): FinancialPeriodComparison {
  const history = reports
    .filter((report) => report.ticker === selected.ticker && report.periodEnd <= selected.periodEnd && report.currency === selected.currency)
    .sort((left, right) => left.periodEnd.localeCompare(right.periodEnd));

  const selectedIndex = history.findIndex((report) => report.id === selected.id);
  const previousReport = selectedIndex > 0 ? history[selectedIndex - 1] : null;
  const currentRevenue = standaloneMetric(history, selectedIndex, "revenue");
  const currentNetIncome = standaloneMetric(history, selectedIndex, "netIncome");
  const currentCashFlow = standaloneMetric(history, selectedIndex, "operatingCashFlow");
  const previousRevenue = selectedIndex > 0 ? standaloneMetric(history, selectedIndex - 1, "revenue") : null;
  const previousNetIncome = selectedIndex > 0 ? standaloneMetric(history, selectedIndex - 1, "netIncome") : null;
  const previousCashFlow = selectedIndex > 0 ? standaloneMetric(history, selectedIndex - 1, "operatingCashFlow") : null;
  const currentMargin = ratio(currentNetIncome, currentRevenue);
  const previousMargin = ratio(previousNetIncome, previousRevenue);

  const qoq: FinancialComparisonRow[] = [
    comparisonRow("quarter-revenue", "Pendapatan kuartal", currentRevenue, previousRevenue, "amount", "Angka kuartal tunggal, bukan kumulatif YTD"),
    comparisonRow("quarter-profit", "Laba bersih kuartal", currentNetIncome, previousNetIncome, "amount", "Laba periode berjalan setelah dikurangi kuartal sebelumnya"),
    comparisonRow("quarter-cfo", "Arus kas operasi kuartal", currentCashFlow, previousCashFlow, "amount", "CFO kuartal tunggal jika periode berurutan tersedia"),
    comparisonRow("quarter-margin", "Net margin kuartal", currentMargin === null ? null : currentMargin * 100, previousMargin === null ? null : previousMargin * 100, "percent", "Laba bersih kuartal dibagi pendapatan kuartal"),
    comparisonRow("assets", "Total aset", metricActual(selected, "assets"), previousReport ? metricActual(previousReport, "assets") : null, "amount", "Posisi pada tanggal akhir laporan"),
    comparisonRow("liabilities", "Total liabilitas", metricActual(selected, "liabilities"), previousReport ? metricActual(previousReport, "liabilities") : null, "amount", "Posisi pada tanggal akhir laporan"),
    comparisonRow("debt", "Utang berbunga", metricActual(selected, "interestBearingDebt"), previousReport ? metricActual(previousReport, "interestBearingDebt") : null, "amount", "Pinjaman dan liabilitas berbunga teridentifikasi"),
    comparisonRow("cash", "Kas dan setara kas", metricActual(selected, "cash"), previousReport ? metricActual(previousReport, "cash") : null, "amount", "Posisi kas pada tanggal akhir laporan"),
  ];

  const yoyKeys: Array<[MetricKey, string, string]> = [
    ["revenue", "Pendapatan YTD", "Periode berjalan dibanding pembanding pada workbook"],
    ["netIncome", "Laba bersih YTD", "Periode berjalan dibanding pembanding pada workbook"],
    ["operatingCashFlow", "Arus kas operasi YTD", "Periode berjalan dibanding pembanding pada workbook"],
    ["assets", "Total aset", "Tanggal laporan dibanding tanggal pembanding workbook"],
    ["liabilities", "Total liabilitas", "Tanggal laporan dibanding tanggal pembanding workbook"],
    ["equity", "Total ekuitas", "Tanggal laporan dibanding tanggal pembanding workbook"],
  ];
  const yoy = yoyKeys.map(([key, label, context]) => {
    const values = yoyMetric(selected, key);
    return comparisonRow(`yoy-${key}`, label, values.current, values.prior, "amount", context);
  });

  const trend = history.map((report, index): FinancialTrendPoint => ({
    reportId: report.id,
    periodEnd: report.periodEnd,
    label: `Q${quarterOf(report.periodEnd)} ${String(yearOf(report.periodEnd)).slice(-2)}`,
    quarter: quarterOf(report.periodEnd),
    year: yearOf(report.periodEnd),
    revenue: standaloneMetric(history, index, "revenue"),
    netIncome: standaloneMetric(history, index, "netIncome"),
    operatingCashFlow: standaloneMetric(history, index, "operatingCashFlow"),
    assets: metricActual(report, "assets"),
    liabilities: metricActual(report, "liabilities"),
    equity: metricActual(report, "equity"),
    cash: metricActual(report, "cash"),
    debt: metricActual(report, "interestBearingDebt"),
  }));

  const selectedCfo = metricActual(selected, "operatingCashFlow");
  const selectedProfit = metricActual(selected, "netIncome");
  const priorCfo = selected.kpis.operatingCashFlow.prior === null ? null : actual(selected.kpis.operatingCashFlow.prior, selected);
  const priorProfit = selected.kpis.netIncome.prior === null ? null : actual(selected.kpis.netIncome.prior, selected);
  const signalPattern = /nilai wajar|fair value|selisih kurs|foreign exchange|penjualan aset|pelepasan aset|dividen|investasi|entitas asosiasi|joint venture|pendapatan lain|other income|keuntungan sekali|one.?off/i;
  const nonOperatingSignals = selected.insights
    .filter((insight) => signalPattern.test(`${insight.title} ${insight.summary}`))
    .map((insight) => insight.title)
    .filter((title, index, values) => values.indexOf(title) === index)
    .slice(0, 5);

  const documentFindings = history
    .slice(-4)
    .flatMap((report) => report.insights.flatMap((insight) => {
      const evidence = insight.evidence.find((item) => item.sourceType === "pdf");
      if (!evidence) return [];
      return [{
        id: `${report.id}-${insight.id}`,
        periodEnd: report.periodEnd,
        title: insight.title,
        summary: insight.summary,
        source: `${evidence.sourceFile || "PDF pendamping"}${evidence.pageNumber ? ` · halaman ${evidence.pageNumber}` : ""}`,
      }];
    }))
    .slice(-8)
    .reverse();

  return {
    history,
    trend,
    previousReport,
    qoq,
    yoy,
    cashConversion: ratio(selectedCfo, selectedProfit),
    priorCashConversion: ratio(priorCfo, priorProfit),
    nonOperatingSignals,
    documentFindings,
  };
}
