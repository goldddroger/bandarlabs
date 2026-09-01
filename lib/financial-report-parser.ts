import {
  financialMetric,
  formatFinancialAmount,
  formatFinancialPercent,
  type FinancialBreakdown,
  type FinancialEvidence,
  type FinancialInsight,
  type FinancialMetric,
  type FinancialReportFact,
  type FinancialReportKpis,
  type FinancialStatementKind,
  type ParsedFinancialReport,
  type WorkbookSheet,
} from "@/lib/financial-report";

type FactIndex = Map<string, FinancialReportFact>;

const conceptAliases: Array<[string, string[]]> = [
  ["revenue", ["penjualan dan pendapatan usaha", "sales and revenue"]],
  ["costOfRevenue", ["beban pokok penjualan dan pendapatan", "cost of sales and revenue"]],
  ["grossProfit", ["jumlah laba bruto", "total gross profit"]],
  ["sellingExpense", ["beban penjualan", "selling expenses"]],
  ["generalAdminExpense", ["beban umum dan administrasi", "general and administrative expenses"]],
  ["financeIncome", ["pendapatan keuangan", "finance income"]],
  ["investmentIncome", ["pendapatan investasi", "investment income"]],
  ["financeCost", ["beban bunga dan keuangan", "interest and finance costs"]],
  ["interestIncome", ["pendapatan bunga", "interest income"]],
  ["interestExpense", ["beban bunga", "interest expenses"]],
  ["dividendIncome", ["pendapatan dividen", "dividends income"]],
  ["fairValueGainLoss", ["keuntungan kerugian perubahan nilai wajar efek", "gains losses on changes in fair value of marketable securities"]],
  ["foreignExchange", ["keuntungan kerugian selisih kurs mata uang asing", "gains losses on changes in foreign exchange rates"]],
  ["associateProfit", ["bagian atas laba rugi entitas asosiasi yang dicatat dengan menggunakan metode ekuitas", "share of profit loss of associates accounted for using equity method"]],
  ["jointVentureProfit", ["bagian atas laba rugi entitas ventura bersama yang dicatat menggunakan metode ekuitas", "share of profit loss of joint ventures accounted for using equity method"]],
  ["otherIncome", ["pendapatan lainnya", "other income"]],
  ["otherExpense", ["beban lainnya", "other expenses"]],
  ["pretaxProfit", ["jumlah laba rugi sebelum pajak penghasilan", "total profit loss before tax"]],
  ["taxExpense", ["pendapatan beban pajak", "tax benefit expenses"]],
  ["netIncome", ["jumlah laba rugi", "total profit loss"]],
  ["netIncomeParent", ["laba rugi yang dapat diatribusikan ke entitas induk", "profit loss attributable to parent entity"]],
  ["cash", ["kas dan setara kas", "cash and cash equivalents"]],
  ["cash", ["kas", "cash"]],
  ["currentAssets", ["jumlah aset lancar", "total current assets"]],
  ["nonCurrentAssets", ["jumlah aset tidak lancar", "total non current assets"]],
  ["assets", ["jumlah aset", "total assets"]],
  ["tradeReceivablesThird", ["piutang usaha pihak ketiga", "trade receivables third parties"]],
  ["tradeReceivablesRelated", ["piutang usaha pihak berelasi", "trade receivables related parties"]],
  ["inventory", ["persediaan lancar", "current inventories"]],
  ["advances", ["uang muka lancar lainnya", "other current advances"]],
  ["ppe", ["aset tetap", "property plant and equipment"]],
  ["associateInvestment", ["investasi pada entitas asosiasi", "investments in associates"]],
  ["jointVentureInvestment", ["investasi pada entitas ventura bersama", "investments in joint ventures"]],
  ["shortBankLoans", ["utang bank jangka pendek", "short term bank loans"]],
  ["currentBankMaturity", ["liabilitas jangka panjang yang jatuh tempo dalam satu tahun atas utang bank", "current maturities of bank loans"]],
  ["longBankLoans", ["liabilitas jangka panjang atas utang bank", "long term bank loans"]],
  ["currentLease", ["liabilitas jangka panjang yang jatuh tempo dalam satu tahun atas liabilitas sewa pembiayaan", "current maturities of finance lease liabilities"]],
  ["longLease", ["liabilitas jangka panjang atas liabilitas sewa pembiayaan", "long term finance lease liabilities"]],
  ["otherBorrowings", ["pinjaman yang diterima pihak ketiga", "borrowings third parties"]],
  ["tradePayablesThird", ["utang usaha pihak ketiga", "trade payables third parties"]],
  ["tradePayablesRelated", ["utang usaha pihak berelasi", "trade payables related parties"]],
  ["accruedExpenses", ["biaya yang masih harus dibayar", "accrued expenses"]],
  ["dividendPayable", ["utang dividen", "dividends payable"]],
  ["taxPayable", ["utang pajak", "taxes payable"]],
  ["currentLiabilities", ["jumlah liabilitas jangka pendek", "total current liabilities"]],
  ["nonCurrentLiabilities", ["jumlah liabilitas jangka panjang", "total non current liabilities"]],
  ["liabilities", ["jumlah liabilitas", "total liabilities"]],
  ["equity", ["jumlah ekuitas", "total equity"]],
  ["equityParent", ["jumlah ekuitas yang diatribusikan kepada pemilik entitas induk", "total equity attributable to owners of parent entity"]],
  ["operatingCashFlow", ["jumlah arus kas bersih yang diperoleh dari digunakan untuk aktivitas operasi", "total net cash flows received from used in operating activities"]],
  ["investingCashFlow", ["jumlah arus kas bersih yang diperoleh dari digunakan untuk aktivitas investasi", "total net cash flows received from used in investing activities"]],
  ["financingCashFlow", ["jumlah arus kas bersih yang diperoleh dari digunakan untuk aktivitas pendanaan", "total net cash flows received from used in financing activities"]],
  ["customerReceipts", ["penerimaan dari pelanggan", "receipts from customers"]],
  ["supplierPayments", ["pembayaran kepada pemasok atas barang dan jasa", "payments to suppliers for goods and services"]],
  ["incomeTaxPayments", ["pembayaran pajak penghasilan badan", "payments for corporate income tax"]],
  ["capex", ["pembayaran untuk perolehan aset tetap", "payments for acquisition of property plant and equipment"]],
  ["bankLoanProceeds", ["penerimaan pinjaman bank", "proceeds from bank loans"]],
  ["bankLoanRepayments", ["pembayaran pinjaman bank", "payments of bank loans"]],
  ["dividendsPaid", ["pembayaran dividen dari aktivitas pendanaan", "dividends paid from financing activities"]],
];

const breakdownSheetLabels: Record<string, string> = {
  "1616000": "Pendapatan berdasarkan pihak",
  "1617000": "Pendapatan berdasarkan tipe",
  "1618000": "Pendapatan berdasarkan sumber",
  "1619000": "Pelanggan dengan kontribusi besar",
  "1630000": "Komposisi persediaan",
  "1670000": "Komponen beban pokok",
};

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function normalize(value: unknown) {
  return text(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[()/,.-]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const normalized = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function sheetCode(sheet: WorkbookSheet) {
  return sheet.sheet.replace(/PY$/i, "");
}

function statementKind(sheet: WorkbookSheet): FinancialStatementKind | null {
  const title = normalize(sheet.data[0]?.[0]);
  if (title.includes("general information")) return "profile";
  if (title.includes("statement of financial position")) return "balance_sheet";
  if (title.includes("statement of profit or loss")) return "income_statement";
  if (title.includes("statement of cash flows")) return "cash_flow";
  if (title.includes("notes to the financial statements")) return "note";
  return null;
}

function detectConcept(label: string, labelEn: string) {
  const candidates = [normalize(label), normalize(labelEn)];
  for (const [concept, aliases] of conceptAliases) {
    if (aliases.some((alias) => candidates.includes(normalize(alias)))) return concept;
  }
  return null;
}

function numericRowCount(sheet: WorkbookSheet) {
  return sheet.data.reduce((count, row) => count + (numeric(row[1]) !== null || numeric(row[2]) !== null ? 1 : 0), 0);
}

function selectPrimarySheet(sheets: WorkbookSheet[], kind: FinancialStatementKind) {
  return sheets
    .filter((sheet) => statementKind(sheet) === kind && !/PY$/i.test(sheet.sheet))
    .sort((first, second) => numericRowCount(second) - numericRowCount(first))[0] ?? null;
}

function primaryFacts(sheet: WorkbookSheet, statement: FinancialStatementKind) {
  const title = text(sheet.data[0]?.[0]);
  return sheet.data.flatMap<FinancialReportFact>((row, index) => {
    const label = text(row[0]);
    const currentValue = numeric(row[1]);
    const priorValue = numeric(row[2]);
    if (!label || (currentValue === null && priorValue === null)) return [];
    const labelEn = text(row[3]);
    return [{
      statement,
      sheetCode: sheetCode(sheet),
      sheetTitle: title,
      rowNumber: index + 1,
      label,
      labelEn,
      concept: detectConcept(label, labelEn),
      currentValue,
      priorValue,
    }];
  });
}

function noteFacts(sheet: WorkbookSheet) {
  const title = text(sheet.data[0]?.[0]);
  return sheet.data.flatMap<FinancialReportFact>((row, index) => {
    const labelA = text(row[0]);
    if (!labelA) return [];
    const valueB = numeric(row[1]);
    const valueC = numeric(row[2]);
    const valueD = numeric(row[3]);
    let label = labelA;
    let currentValue = valueB;
    let priorValue = valueC;

    if (valueB === null && valueC !== null) {
      const dimension = text(row[1]);
      label = dimension ? `${labelA} · ${dimension}` : labelA;
      currentValue = valueC;
      priorValue = valueD;
    }
    if (currentValue === null && priorValue === null) return [];
    return [{
      statement: "note",
      sheetCode: sheetCode(sheet),
      sheetTitle: title,
      rowNumber: index + 1,
      label,
      labelEn: text(row[3]),
      concept: null,
      currentValue,
      priorValue,
    }];
  });
}

function metadata(sheet: WorkbookSheet | null) {
  const values = new Map<string, unknown>();
  sheet?.data.forEach((row) => {
    const key = normalize(row[0]);
    if (key) values.set(key, row[1]);
  });
  const get = (...labels: string[]) => {
    for (const label of labels) {
      const value = values.get(normalize(label));
      if (value !== undefined && text(value)) return value;
    }
    return null;
  };
  return { get };
}

function createFactIndex(facts: FinancialReportFact[]) {
  const index: FactIndex = new Map();
  facts.forEach((fact) => {
    if (fact.concept && !index.has(fact.concept)) index.set(fact.concept, fact);
  });
  return index;
}

function metric(index: FactIndex, concept: string): FinancialMetric {
  const fact = index.get(concept);
  return financialMetric(fact?.currentValue ?? null, fact?.priorValue ?? null);
}

function sumMetric(index: FactIndex, concepts: string[]) {
  const rows = concepts.map((concept) => index.get(concept)).filter(Boolean) as FinancialReportFact[];
  const currentRows = rows.filter((row) => row.currentValue !== null);
  const priorRows = rows.filter((row) => row.priorValue !== null);
  return financialMetric(
    currentRows.length ? currentRows.reduce((sum, row) => sum + Math.abs(row.currentValue ?? 0), 0) : null,
    priorRows.length ? priorRows.reduce((sum, row) => sum + Math.abs(row.priorValue ?? 0), 0) : null,
  );
}

function combineMetric(index: FactIndex, concepts: string[]) {
  const rows = concepts.map((concept) => index.get(concept)).filter(Boolean) as FinancialReportFact[];
  return financialMetric(
    rows.some((row) => row.currentValue !== null) ? rows.reduce((sum, row) => sum + (row.currentValue ?? 0), 0) : null,
    rows.some((row) => row.priorValue !== null) ? rows.reduce((sum, row) => sum + (row.priorValue ?? 0), 0) : null,
  );
}

function marginMetric(numerator: FinancialMetric, denominator: FinancialMetric) {
  const current = numerator.current !== null && denominator.current ? (numerator.current / denominator.current) * 100 : null;
  const prior = numerator.prior !== null && denominator.prior ? (numerator.prior / denominator.prior) * 100 : null;
  return financialMetric(current, prior);
}

function ratioMetric(numerator: FinancialMetric, denominator: FinancialMetric) {
  const current = numerator.current !== null && denominator.current ? numerator.current / denominator.current : null;
  const prior = numerator.prior !== null && denominator.prior ? numerator.prior / denominator.prior : null;
  return financialMetric(current, prior);
}

function annualizationFactor(periodStart: string, periodEnd: string) {
  const start = Date.parse(`${periodStart}T00:00:00Z`);
  const end = Date.parse(`${periodEnd}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  const days = Math.max(1, Math.round((end - start) / 86_400_000) + 1);
  return 365 / days;
}

function annualizedReturnMetric(profit: FinancialMetric, balance: FinancialMetric, factor: number) {
  const averageBalance = balance.current !== null && balance.prior !== null ? (balance.current + balance.prior) / 2 : balance.current;
  const current = profit.current !== null && averageBalance ? (profit.current * factor / averageBalance) * 100 : null;
  return financialMetric(current, null);
}

function subtractMetric(minuend: FinancialMetric, subtrahend: FinancialMetric) {
  const current = minuend.current !== null && subtrahend.current !== null ? minuend.current - subtrahend.current : null;
  const prior = minuend.prior !== null && subtrahend.prior !== null ? minuend.prior - subtrahend.prior : null;
  return financialMetric(current, prior);
}

function magnitudeMetric(value: FinancialMetric) {
  return financialMetric(
    value.current === null ? null : Math.abs(value.current),
    value.prior === null ? null : Math.abs(value.prior),
  );
}

function interestCoverageMetric(index: FactIndex) {
  const pretax = metric(index, "pretaxProfit");
  const financeCost = metric(index, index.has("financeCost") ? "financeCost" : "interestExpense");
  const financeIncome = metric(index, index.has("financeIncome") ? "financeIncome" : "interestIncome");
  const coverage = (period: "current" | "prior") => {
    const profit = pretax[period];
    const cost = financeCost[period];
    if (profit === null || cost === null || cost === 0) return null;
    const income = financeIncome[period] ?? 0;
    const ebitProxy = profit - income + Math.abs(cost);
    return ebitProxy / Math.abs(cost);
  };
  return financialMetric(coverage("current"), coverage("prior"));
}

function evidence(fact: FinancialReportFact | undefined): FinancialEvidence[] {
  if (!fact) return [];
  return [{ label: fact.label, sheetCode: fact.sheetCode, rowNumber: fact.rowNumber, currentValue: fact.currentValue, priorValue: fact.priorValue }];
}

function evidenceMany(facts: Array<FinancialReportFact | undefined>) {
  return facts.flatMap((fact) => evidence(fact)).slice(0, 5);
}

function movementWord(percent: number | null) {
  if (percent === null) return "berubah";
  return percent >= 0 ? "naik" : "turun";
}

function amount(report: Pick<ParsedFinancialReport, "currency" | "unitMultiplier">, value: number | null, absolute = false) {
  return formatFinancialAmount(value, report.currency, report.unitMultiplier, { absolute });
}

function buildBreakdowns(noteSheets: WorkbookSheet[], facts: FinancialReportFact[], denominators: Record<string, number | null>) {
  const groups: FinancialBreakdown[] = [];
  for (const [code, label] of Object.entries(breakdownSheetLabels)) {
    if (!noteSheets.some((sheet) => sheetCode(sheet) === code)) continue;
    const items = facts
      .filter((fact) => fact.statement === "note" && fact.sheetCode === code && fact.currentValue !== null && fact.currentValue > 0)
      .filter((fact) => {
        const labelValue = normalize(fact.label);
        const aggregateLabels = new Set([
          "pendapatan domestik", "pendapatan ekspor", "pendapatan dari produk", "pendapatan dari jasa",
          "tipe pihak", "pihak berelasi", "pihak ketiga", "pihak dengan pendapatan lebih dari 10", "persediaan", "persediaan kotor", "persediaan lancar",
          "aset real estat", "aset real estat kotor", "aset real estat lancar", "aset real estat tidak lancar",
          "bahan baku yang digunakan", "jumlah biaya produksi", "harga pokok produksi", "beban pokok penjualan dan pendapatan",
        ]);
        return !labelValue.startsWith("jumlah ")
          && !labelValue.includes("saldo akhir")
          && !labelValue.includes("tipe pendapatan")
          && !labelValue.includes("sumber pendapatan")
          && !aggregateLabels.has(labelValue);
      })
      .map((fact) => {
        const denominator = denominators[code];
        return {
        label: fact.label.replace(/^[^·]+·\s*/, ""),
        value: fact.currentValue!,
        priorValue: fact.priorValue,
        sharePercent: denominator && fact.currentValue! <= denominator * 1.05 ? (fact.currentValue! / denominator) * 100 : null,
        sheetCode: fact.sheetCode,
        rowNumber: fact.rowNumber,
      }; })
      .sort((first, second) => second.value - first.value)
      .slice(0, 8);
    if (items.length >= 2) groups.push({ id: code, label, items });
  }
  return groups;
}

function buildInsights(report: ParsedFinancialReport, index: FactIndex) {
  const insights: FinancialInsight[] = [];
  const add = (insight: Omit<FinancialInsight, "id">) => insights.push({ id: `${insight.category}-${insights.length + 1}`, ...insight });
  const { kpis } = report;
  const net = kpis.netIncome;
  const turnedToLoss = net.current !== null && net.prior !== null && net.current < 0 && net.prior >= 0;
  const turnedToProfit = net.current !== null && net.prior !== null && net.current >= 0 && net.prior < 0;
  const headlineTitle = turnedToLoss
    ? "Berbalik mencatat rugi bersih"
    : turnedToProfit
      ? "Berbalik mencatat laba bersih"
      : `${net.current !== null && net.current < 0 ? "Rugi bersih" : "Laba bersih"} ${movementWord(net.changePercent)} ${formatFinancialPercent(Math.abs(net.changePercent ?? 0), false)}`;
  const revenueSentence = kpis.revenue.current !== null
    ? ` Pendapatan ${movementWord(kpis.revenue.changePercent)} ${formatFinancialPercent(Math.abs(kpis.revenue.changePercent ?? 0), false)} menjadi ${amount(report, kpis.revenue.current, true)}.`
    : " Struktur pendapatan emiten ini tidak disajikan seperti perusahaan industri umum; komponen laba rugi utama ditelaah secara terpisah.";

  add({
    category: "headline",
    tone: (net.changePercent ?? 0) >= 0 ? "positive" : "negative",
    title: headlineTitle,
    summary: `${report.ticker} mencatat ${net.current !== null && net.current < 0 ? "rugi" : "laba"} bersih ${amount(report, net.current, true)} dibandingkan ${net.prior !== null && net.prior < 0 ? "rugi" : "laba"} ${amount(report, net.prior, true)} pada periode pembanding.${revenueSentence}`,
    basis: "calculated",
    confidence: "high",
    evidence: evidenceMany([index.get("netIncomeParent") ?? index.get("netIncome"), index.get("revenue")]),
  });

  const totalNet = metric(index, "netIncome");
  const parentNet = metric(index, "netIncomeParent");
  if (totalNet.current !== null && parentNet.current !== null && totalNet.changePercent !== null && parentNet.changePercent !== null && Math.abs(totalNet.changePercent - parentNet.changePercent) >= 10) {
    add({
      category: "profit",
      tone: "neutral",
      title: "Persentase laba bergantung pada scope",
      summary: `Laba konsolidasian naik ${formatFinancialPercent(totalNet.changePercent, false)} menjadi ${amount(report, totalNet.current, true)}, sedangkan laba yang diatribusikan kepada pemilik induk naik ${formatFinancialPercent(parentNet.changePercent, false)} menjadi ${amount(report, parentNet.current, true)}. Gunakan scope yang sama saat membandingkan angka dari berita atau komentar pasar.`,
      basis: "calculated",
      confidence: "high",
      evidence: evidenceMany([index.get("netIncome"), index.get("netIncomeParent")]),
    });
  }

  const priorNetMargin = net.prior !== null && kpis.revenue.prior ? (net.prior / Math.abs(kpis.revenue.prior)) * 100 : null;
  if ((net.changePercent ?? 0) >= 100 && net.prior !== null && net.prior > 0 && priorNetMargin !== null && priorNetMargin < 1) {
    add({
      category: "risk",
      tone: "warning",
      title: "Lonjakan laba ditopang basis pembanding rendah",
      summary: `Laba pembanding hanya ${amount(report, net.prior, true)} dengan margin sekitar ${formatFinancialPercent(priorNetMargin, false)}. Karena titik awalnya sangat kecil, kenaikan ${formatFinancialPercent(net.changePercent, false)} perlu dibaca bersama laba absolut, margin, dan imbal hasil modal.`,
      basis: "calculated",
      confidence: "high",
      evidence: evidenceMany([index.get("netIncomeParent") ?? index.get("netIncome"), index.get("revenue")]),
    });
  }

  if (kpis.annualizedRoa?.current !== null && kpis.annualizedRoa?.current !== undefined && kpis.annualizedRoe?.current !== null && kpis.annualizedRoe?.current !== undefined && (kpis.annualizedRoa.current < 2 || kpis.annualizedRoe.current < 3)) {
    add({
      category: "profit",
      tone: "warning",
      title: "Imbal hasil aset dan modal masih rendah",
      summary: `Annualized ROA tersirat sekitar ${formatFinancialPercent(kpis.annualizedRoa.current, false)} dan annualized ROE sekitar ${formatFinancialPercent(kpis.annualizedRoe.current, false)}, dengan net margin ${formatFinancialPercent(kpis.netMargin?.current ?? null, false)}. Persentase pertumbuhan laba yang tinggi belum otomatis menunjukkan produktivitas aset dan modal yang tinggi.`,
      basis: "calculated",
      confidence: "medium",
      evidence: evidenceMany([index.get("netIncomeParent") ?? index.get("netIncome"), index.get("assets"), index.get("equityParent") ?? index.get("equity"), index.get("revenue")]),
    });
  }

  if (kpis.revenue.current !== null && kpis.grossProfit.current !== null) {
    const marginDirection = (kpis.grossMargin.changeAmount ?? 0) >= 0 ? "membaik" : "menyempit";
    const costBurden = magnitudeMetric(metric(index, "costOfRevenue"));
    add({
      category: "profit",
      tone: marginDirection === "membaik" ? "positive" : "warning",
      title: `Margin bruto ${marginDirection}`,
      summary: `Pendapatan ${movementWord(kpis.revenue.changePercent)} ${formatFinancialPercent(Math.abs(kpis.revenue.changePercent ?? 0), false)}, sementara beban pokok ${movementWord(costBurden.changePercent)} ${formatFinancialPercent(Math.abs(costBurden.changePercent ?? 0), false)}. Margin bruto bergerak dari ${formatFinancialPercent(kpis.grossMargin.prior, false)} menjadi ${formatFinancialPercent(kpis.grossMargin.current, false)}.`,
      basis: "calculated",
      confidence: "high",
      evidence: evidenceMany([index.get("revenue"), index.get("costOfRevenue"), index.get("grossProfit")]),
    });
  }

  if (kpis.revenue.current !== null && kpis.revenue.prior !== null && kpis.revenue.prior > 0 && kpis.revenue.current / kpis.revenue.prior >= 6) {
    add({
      category: "risk",
      tone: "warning",
      title: "Pertumbuhan tinggi berasal dari basis pembanding rendah",
      summary: `Pendapatan periode pembanding hanya ${amount(report, kpis.revenue.prior, true)}, sekitar ${formatFinancialPercent((kpis.revenue.prior / kpis.revenue.current) * 100, false)} dari pendapatan saat ini. Persentase pertumbuhan perlu dibaca bersama perubahan model bisnis, volume, dan margin, bukan sebagai pertumbuhan normal tahunan.`,
      basis: "calculated",
      confidence: "high",
      evidence: evidence(index.get("revenue")),
    });
  }

  const profitDriverConcepts = ["grossProfit", "sellingExpense", "generalAdminExpense", "financeIncome", "investmentIncome", "financeCost", "interestIncome", "interestExpense", "fairValueGainLoss", "foreignExchange", "associateProfit", "jointVentureProfit", "dividendIncome", "otherIncome", "otherExpense"];
  const expenseConcepts = new Set(["sellingExpense", "generalAdminExpense", "financeCost", "interestExpense", "otherExpense"]);
  const profitDrivers = profitDriverConcepts
    .map((concept) => ({ concept, fact: index.get(concept) }))
    .filter((row): row is { concept: string; fact: FinancialReportFact } => Boolean(row.fact && row.fact.currentValue !== null && row.fact.priorValue !== null))
    .map(({ concept, fact }) => ({
      fact,
      contribution: expenseConcepts.has(concept)
        ? Math.abs(fact.priorValue!) - Math.abs(fact.currentValue!)
        : fact.currentValue! - fact.priorValue!,
    }))
    .filter((row) => Math.abs(row.contribution) > 0)
    .sort((first, second) => Math.abs(second.contribution) - Math.abs(first.contribution))
    .slice(0, 4);
  if (profitDrivers.length) {
    const driverText = profitDrivers.map(({ fact, contribution }) => `${fact.label} memberi dampak ${contribution >= 0 ? "positif" : "negatif"} sekitar ${amount(report, contribution, true)}`).join("; ");
    add({
      category: "profit",
      tone: "neutral",
      title: "Jembatan perubahan laba",
      summary: `${driverText}. Ini adalah hubungan matematis antarpos laporan, bukan pernyataan penyebab operasional dari manajemen.`,
      basis: "calculated",
      confidence: "high",
      evidence: evidenceMany(profitDrivers.map((row) => row.fact)),
    });
  }

  const balanceDrivers = ["cash", "tradeReceivablesThird", "tradeReceivablesRelated", "inventory", "ppe", "associateInvestment", "jointVentureInvestment"]
    .map((concept) => index.get(concept))
    .filter((fact): fact is FinancialReportFact => Boolean(fact && fact.currentValue !== null && fact.priorValue !== null))
    .map((fact) => ({ fact, change: fact.currentValue! - fact.priorValue! }))
    .sort((first, second) => Math.abs(second.change) - Math.abs(first.change))
    .slice(0, 4);
  if (kpis.assets.current !== null && balanceDrivers.length) {
    add({
      category: "balance",
      tone: "neutral",
      title: `Total aset ${movementWord(kpis.assets.changePercent)} ${formatFinancialPercent(Math.abs(kpis.assets.changePercent ?? 0), false)}`,
      summary: `Perubahan terbesar terlihat pada ${balanceDrivers.map(({ fact, change }) => `${fact.label} ${change >= 0 ? "bertambah" : "berkurang"} ${amount(report, change, true)}`).join("; ")}.`,
      basis: "calculated",
      confidence: "high",
      evidence: evidenceMany([index.get("assets"), ...balanceDrivers.map((row) => row.fact)]),
    });
  }


  if (kpis.receivables.current !== null && kpis.assets.current && kpis.receivables.current / kpis.assets.current >= 0.4) {
    const share = (kpis.receivables.current / kpis.assets.current) * 100;
    add({
      category: "risk",
      tone: "warning",
      title: "Aset terkonsentrasi pada piutang usaha",
      summary: `Piutang usaha mencapai ${formatFinancialPercent(share, false)} dari total aset dan ${movementWord(kpis.receivables.changePercent)} ${formatFinancialPercent(Math.abs(kpis.receivables.changePercent ?? 0), false)} dari periode pembanding. Kualitas debitur, umur piutang, dan pencadangan kerugian kredit perlu diperiksa.`,
      basis: "calculated",
      confidence: "high",
      evidence: evidenceMany([index.get("tradeReceivablesThird"), index.get("tradeReceivablesRelated"), index.get("assets")]),
    });
  }

  const debtComponents = ["shortBankLoans", "currentBankMaturity", "longBankLoans", "currentLease", "longLease", "otherBorrowings"]
    .map((concept) => index.get(concept))
    .filter((fact): fact is FinancialReportFact => Boolean(fact && (fact.currentValue !== null || fact.priorValue !== null)));
  const liabilityComponents = ["dividendPayable", "taxPayable", "tradePayablesThird", "tradePayablesRelated"]
    .map((concept) => index.get(concept))
    .filter((fact): fact is FinancialReportFact => Boolean(fact && fact.currentValue !== null && fact.priorValue !== null))
    .map((fact) => ({ fact, change: fact.currentValue! - fact.priorValue! }))
    .sort((first, second) => Math.abs(second.change) - Math.abs(first.change));
  if (kpis.liabilities.current !== null) {
    const debtText = kpis.interestBearingDebt.current !== null
      ? `Utang berbunga ${movementWord(kpis.interestBearingDebt.changePercent)} menjadi ${amount(report, kpis.interestBearingDebt.current, true)}`
      : "Rincian utang berbunga belum lengkap";
    const otherText = liabilityComponents.slice(0, 3).map(({ fact, change }) => `${fact.label} ${change >= 0 ? "naik" : "turun"} ${amount(report, change, true)}`).join("; ");
    add({
      category: "debt",
      tone: (kpis.interestBearingDebt.changePercent ?? 0) > 30 ? "warning" : "neutral",
      title: `Liabilitas ${movementWord(kpis.liabilities.changePercent)} ${formatFinancialPercent(Math.abs(kpis.liabilities.changePercent ?? 0), false)}`,
      summary: `${debtText}.${otherText ? ` Di luar utang berbunga: ${otherText}.` : ""} Kenaikan liabilitas tidak otomatis berarti seluruhnya merupakan pinjaman baru.`,
      basis: "calculated",
      confidence: debtComponents.length ? "high" : "medium",
      evidence: evidenceMany([index.get("liabilities"), ...debtComponents, ...liabilityComponents.slice(0, 2).map((row) => row.fact)]),
    });
  }

  if (kpis.operatingCashFlow.current !== null) {
    const netCurrent = kpis.netIncome.current;
    const qualityRatio = netCurrent && netCurrent > 0 ? kpis.operatingCashFlow.current / netCurrent : null;
    const cashWarning = netCurrent !== null && netCurrent > 0 && kpis.operatingCashFlow.current < 0;
    const unusuallyHighCashConversion = qualityRatio !== null && qualityRatio >= 3;
    add({
      category: "cash_flow",
      tone: cashWarning ? "negative" : qualityRatio !== null && qualityRatio < 0.6 ? "warning" : unusuallyHighCashConversion ? "neutral" : "positive",
      title: cashWarning ? "Laba belum berubah menjadi kas" : unusuallyHighCashConversion ? "Arus kas operasi jauh di atas laba" : "Kualitas arus kas operasi",
      summary: cashWarning
        ? `Perusahaan membukukan laba ${amount(report, netCurrent, true)}, tetapi arus kas operasi negatif ${amount(report, kpis.operatingCashFlow.current, true)}. Perubahan modal kerja, pembayaran pemasok, dan pajak perlu ditelusuri.`
        : `Arus kas operasi tercatat ${amount(report, kpis.operatingCashFlow.current)} dibandingkan ${amount(report, kpis.operatingCashFlow.prior)}. ${qualityRatio !== null ? `Rasionya terhadap laba bersih sekitar ${formatFinancialPercent(qualityRatio * 100, false)}.` : ""}${unusuallyHighCashConversion ? " Selisih yang sangat besar dapat berasal dari pelepasan modal kerja atau pos nonkas dan perlu diperiksa sebelum dianggap berulang." : ""}`,
      basis: cashWarning ? "inference" : "calculated",
      confidence: cashWarning ? "medium" : "high",
      evidence: evidenceMany([index.get("operatingCashFlow"), index.get("netIncomeParent") ?? index.get("netIncome"), index.get("customerReceipts"), index.get("supplierPayments"), index.get("incomeTaxPayments")]),
    });
  }

  const nonOperatingFacts = ["financeIncome", "investmentIncome", "interestIncome", "dividendIncome", "fairValueGainLoss", "foreignExchange", "associateProfit", "jointVentureProfit"]
    .map((concept) => index.get(concept))
    .filter((fact): fact is FinancialReportFact => Boolean(fact && (fact.currentValue ?? 0) > 0));
  const nonOperatingPositive = nonOperatingFacts.reduce((sum, fact) => sum + (fact.currentValue ?? 0), 0);
  if (net.current !== null && net.current > 0 && nonOperatingPositive > Math.abs(net.current) * 0.5 && nonOperatingPositive > Math.abs(kpis.revenue.current ?? 0) * 0.05) {
    add({
      category: "risk",
      tone: "warning",
      title: "Laba sensitif terhadap pos non-operasional",
      summary: `Pos non-operasional positif mencapai sekitar ${amount(report, nonOperatingPositive, true)}, setara ${(nonOperatingPositive / Math.abs(net.current)).toLocaleString("id-ID", { maximumFractionDigits: 1 })}x laba bersih. Angka ini tidak otomatis bersifat sekali jalan, tetapi keberlanjutan laba perlu diuji dari catatan manajemen.`,
      basis: "inference",
      confidence: "medium",
      evidence: evidenceMany([index.get("netIncomeParent") ?? index.get("netIncome"), ...nonOperatingFacts]),
    });
  }

  const customerReceipts = index.get("customerReceipts");
  const supplierPayments = index.get("supplierPayments");
  if (customerReceipts?.currentValue !== null && customerReceipts?.currentValue !== undefined && supplierPayments?.currentValue !== null && supplierPayments?.currentValue !== undefined) {
    const supplierGap = customerReceipts.currentValue - Math.abs(supplierPayments.currentValue);
    if (supplierGap < 0) {
      add({
        category: "cash_flow",
        tone: "warning",
        title: "Pembayaran pemasok melampaui penerimaan pelanggan",
        summary: `Pembayaran kepada pemasok lebih besar sekitar ${amount(report, supplierGap, true)} daripada penerimaan pelanggan. Selisih ini membantu menjelaskan tekanan arus kas, meski bukan satu-satunya komponen arus kas operasi.`,
        basis: "calculated",
        confidence: "high",
        evidence: evidenceMany([customerReceipts, supplierPayments, index.get("operatingCashFlow")]),
      });
    }
  }

  if (kpis.currentRatio?.current !== null && kpis.currentRatio?.current !== undefined && kpis.currentRatio.current < 1) {
    add({
      category: "risk",
      tone: "warning",
      title: "Aset lancar belum menutup liabilitas lancar",
      summary: `Current ratio berada di ${kpis.currentRatio.current.toLocaleString("id-ID", { maximumFractionDigits: 2 })}x. Artinya, secara angka laporan, setiap 1x kewajiban jangka pendek hanya ditopang ${kpis.currentRatio.current.toLocaleString("id-ID", { maximumFractionDigits: 2 })}x aset lancar.`,
      basis: "calculated",
      confidence: "high",
      evidence: evidenceMany([index.get("currentAssets"), index.get("currentLiabilities")]),
    });
  }

  if (kpis.debtToEquity?.current !== null && kpis.debtToEquity?.current !== undefined && kpis.debtToEquity.current > 1) {
    add({
      category: "debt",
      tone: "warning",
      title: "Leverage utang berbunga tergolong tinggi",
      summary: `Debt-to-equity tercatat ${kpis.debtToEquity.current.toLocaleString("id-ID", { maximumFractionDigits: 2 })}x dengan net debt ${amount(report, kpis.netDebt?.current ?? null, true)}. Ruang refinancing, biaya bunga, dan jadwal jatuh tempo perlu menjadi fokus riset lanjutan.`,
      basis: "calculated",
      confidence: "high",
      evidence: evidenceMany([...debtComponents, index.get("cash"), index.get("equity")]),
    });
  }


  if (kpis.interestCoverage?.current !== null && kpis.interestCoverage?.current !== undefined && kpis.interestCoverage.current < 1.5) {
    add({
      category: "debt",
      tone: "warning",
      title: "Kemampuan menutup beban bunga terbatas",
      summary: `Interest coverage proksi berada di ${kpis.interestCoverage.current.toLocaleString("id-ID", { maximumFractionDigits: 2 })}x. Nilai di bawah 1,5x menunjukkan laba operasi memiliki bantalan terbatas terhadap beban bunga; angka ini perlu dikonfirmasi dengan rincian restrukturisasi dan jatuh tempo utang.`,
      basis: "calculated",
      confidence: "medium",
      evidence: evidenceMany([index.get("pretaxProfit"), index.get("financeCost") ?? index.get("interestExpense"), index.get("financeIncome") ?? index.get("interestIncome")]),
    });
  }

  const revenueGrowth = kpis.revenue.changePercent;
  for (const [metricName, metricValue, fact] of [
    ["Persediaan", kpis.inventory, index.get("inventory")],
    ["Piutang usaha", kpis.receivables, index.get("tradeReceivablesThird")],
  ] as Array<[string, FinancialMetric, FinancialReportFact | undefined]>) {
    if (metricValue.changePercent !== null && revenueGrowth !== null && metricValue.changePercent > Math.max(30, revenueGrowth + 20)) {
      add({
        category: "risk",
        tone: "warning",
        title: `${metricName} tumbuh lebih cepat dari pendapatan`,
        summary: `${metricName} naik ${formatFinancialPercent(metricValue.changePercent, false)}, jauh di atas pertumbuhan pendapatan ${formatFinancialPercent(revenueGrowth, false)}. Ini dapat menyerap modal kerja; alasan bisnisnya perlu dikonfirmasi dari catatan emiten atau PDF.`,
        basis: "inference",
        confidence: "medium",
        evidence: evidenceMany([fact, index.get("revenue")]),
      });
    }
  }

  const revenueBreakdown = report.breakdowns.find((breakdown) => ["1617000", "1618000"].includes(breakdown.id));
  const concentratedItem = revenueBreakdown?.items.find((item) => (item.sharePercent ?? 0) >= 50);
  if (concentratedItem) {
    add({
      category: "business_mix",
      tone: "neutral",
      title: `Pendapatan terkonsentrasi pada ${concentratedItem.label}`,
      summary: `${concentratedItem.label} menyumbang sekitar ${formatFinancialPercent(concentratedItem.sharePercent, false)} dari pendapatan periode berjalan. Perubahan harga, volume, atau permintaan pada segmen ini dapat berdampak material.`,
      basis: "calculated",
      confidence: "high",
      evidence: [{ label: concentratedItem.label, sheetCode: concentratedItem.sheetCode, rowNumber: concentratedItem.rowNumber, currentValue: concentratedItem.value, priorValue: concentratedItem.priorValue }],
    });
  }

  if (!report.breakdowns.some((breakdown) => ["1617000", "1618000"].includes(breakdown.id))) {
    add({
      category: "business_mix",
      tone: "neutral",
      title: "Penyebab operasional memerlukan dokumen pendamping",
      summary: "Workbook menjelaskan perubahan akuntansi, tetapi belum cukup untuk memastikan pengaruh harga jual, volume produksi, utilisasi, atau biaya per unit. Tambahkan PDF atau laporan periode sebelumnya untuk analisis bisnis yang lebih kuat.",
      basis: "insufficient_data",
      confidence: "low",
      evidence: [],
    });
  }

  return insights;
}

export function parseFinancialReportWorkbook(workbook: readonly WorkbookSheet[], sourceFile = ""): ParsedFinancialReport {
  if (!workbook.length) throw new Error("Workbook tidak memiliki worksheet.");
  const profileSheet = workbook.find((sheet) => sheet.sheet === "1000000") ?? workbook.find((sheet) => statementKind(sheet) === "profile") ?? null;
  if (!profileSheet) throw new Error("Sheet informasi umum [1000000] tidak ditemukan. Gunakan file Financial Statement resmi IDX.");
  const meta = metadata(profileSheet);
  const ticker = text(meta.get("Kode entitas", "Entity code")).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const entityName = text(meta.get("Nama entitas", "Entity name"));
  const periodStart = isoDate(meta.get("Tanggal awal periode berjalan", "Current period start date"));
  const periodEnd = isoDate(meta.get("Tanggal akhir periode berjalan", "Current period end date"));
  if (!ticker || !entityName || !periodStart || !periodEnd) throw new Error("Ticker, nama emiten, atau periode laporan tidak dapat dibaca.");

  const currencyText = text(meta.get("Mata uang pelaporan", "Description of presentation currency"));
  const currency = /dollar|usd/i.test(currencyText) ? "USD" : /rupiah|idr/i.test(currencyText) ? "IDR" : currencyText || "IDR";
  const unitLabel = text(meta.get("Pembulatan yang digunakan dalam penyajian jumlah dalam laporan keuangan", "Level of rounding used in financial statements"));
  const unitMultiplier = /juta|million/i.test(unitLabel) ? 1_000_000 : /ribu|thousand/i.test(unitLabel) ? 1_000 : 1;
  const industryText = text(meta.get("Industri utama entitas", "Entity main industry"));
  const taxonomyFamily = /keuangan|financial|syariah|sharia/i.test(industryText) ? "financial" : /umum|general/i.test(industryText) ? "general" : "unknown";
  const balanceSheet = selectPrimarySheet([...workbook], "balance_sheet");
  const incomeSheet = selectPrimarySheet([...workbook], "income_statement");
  const cashFlowSheet = selectPrimarySheet([...workbook], "cash_flow");
  if (!balanceSheet || !incomeSheet || !cashFlowSheet) throw new Error("Neraca, laba rugi, atau arus kas aktif tidak ditemukan di workbook.");

  const noteSheets = workbook.filter((sheet) => statementKind(sheet) === "note" && !/PY$/i.test(sheet.sheet));
  const facts = [
    ...primaryFacts(balanceSheet, "balance_sheet"),
    ...primaryFacts(incomeSheet, "income_statement"),
    ...primaryFacts(cashFlowSheet, "cash_flow"),
    ...noteSheets.flatMap(noteFacts),
  ].slice(0, 4_000);
  const index = createFactIndex(facts);
  const revenue = metric(index, "revenue");
  const grossProfit = metric(index, "grossProfit");
  const netIncome = metric(index, index.has("netIncomeParent") ? "netIncomeParent" : "netIncome");
  const receivables = combineMetric(index, ["tradeReceivablesThird", "tradeReceivablesRelated"]);
  const kpis: FinancialReportKpis = {
    revenue,
    grossProfit,
    grossMargin: marginMetric(grossProfit, revenue),
    netIncome,
    operatingCashFlow: metric(index, "operatingCashFlow"),
    cash: metric(index, "cash"),
    assets: metric(index, "assets"),
    liabilities: metric(index, "liabilities"),
    equity: metric(index, "equity"),
    interestBearingDebt: sumMetric(index, ["shortBankLoans", "currentBankMaturity", "longBankLoans", "currentLease", "longLease", "otherBorrowings"]),
    inventory: metric(index, "inventory"),
    receivables,
  };
  kpis.currentRatio = ratioMetric(metric(index, "currentAssets"), metric(index, "currentLiabilities"));
  kpis.debtToEquity = ratioMetric(kpis.interestBearingDebt, kpis.equity);
  kpis.netDebt = subtractMetric(kpis.interestBearingDebt, kpis.cash);
  kpis.interestCoverage = interestCoverageMetric(index);
  kpis.netMargin = marginMetric(kpis.netIncome, kpis.revenue);
  const annualFactor = annualizationFactor(periodStart, periodEnd);
  kpis.annualizedRoa = annualizedReturnMetric(metric(index, "netIncome"), kpis.assets, annualFactor);
  kpis.annualizedRoe = annualizedReturnMetric(kpis.netIncome, index.has("equityParent") ? metric(index, "equityParent") : kpis.equity, annualFactor);
  kpis.freeCashFlow = subtractMetric(kpis.operatingCashFlow, magnitudeMetric(metric(index, "capex")));
  const report: ParsedFinancialReport = {
    ticker,
    entityName,
    industryFamily: industryText,
    sector: text(meta.get("Sektor", "Sector")),
    subsector: text(meta.get("Subsektor", "Subsector")),
    periodLabel: text(meta.get("Periode penyampaian laporan keuangan", "Period of financial statements submissions")),
    periodStart,
    periodEnd,
    priorPeriodStart: isoDate(meta.get("Tanggal awal periode sebelumnya", "Prior period start date")) || null,
    priorPeriodEnd: isoDate(meta.get("Tanggal akhir periode sebelumnya", "Prior period end date")) || null,
    currency,
    unitLabel,
    unitMultiplier,
    reportType: text(meta.get("Jenis laporan atas laporan keuangan", "Type of report on financial statements")),
    auditor: text(meta.get("Auditor tahun berjalan", "Current year auditor")),
    taxonomyFamily,
    headline: "",
    executiveSummary: "",
    kpis,
    insights: [],
    breakdowns: buildBreakdowns(noteSheets, facts, {
      "1616000": revenue.current,
      "1617000": revenue.current,
      "1618000": revenue.current,
      "1619000": revenue.current,
      "1630000": kpis.inventory.current,
      "1670000": Math.abs(metric(index, "costOfRevenue").current ?? 0) || null,
    }),
    facts,
    sourceFile,
  };
  report.insights = buildInsights(report, index);
  report.headline = report.insights[0]?.title ?? `Laporan keuangan ${ticker}`;
  report.executiveSummary = report.insights.slice(0, 3).map((insight) => insight.summary).join(" ");
  return report;
}
