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
  ["dividendPayable", ["utang dividen", "dividends payable"]],
  ["taxPayable", ["utang pajak", "taxes payable"]],
  ["currentLiabilities", ["jumlah liabilitas jangka pendek", "total current liabilities"]],
  ["nonCurrentLiabilities", ["jumlah liabilitas jangka panjang", "total non current liabilities"]],
  ["liabilities", ["jumlah liabilitas", "total liabilities"]],
  ["equity", ["jumlah ekuitas", "total equity"]],
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

function buildBreakdowns(noteSheets: WorkbookSheet[], facts: FinancialReportFact[], revenue: FinancialMetric) {
  const groups: FinancialBreakdown[] = [];
  for (const [code, label] of Object.entries(breakdownSheetLabels)) {
    if (!noteSheets.some((sheet) => sheetCode(sheet) === code)) continue;
    const items = facts
      .filter((fact) => fact.statement === "note" && fact.sheetCode === code && fact.currentValue !== null && fact.currentValue > 0)
      .filter((fact) => {
        const labelValue = normalize(fact.label);
        const aggregateLabels = new Set([
          "pendapatan domestik", "pendapatan ekspor", "pendapatan dari produk", "pendapatan dari jasa",
          "pihak berelasi", "pihak ketiga", "persediaan kotor", "persediaan lancar",
          "harga pokok produksi", "beban pokok penjualan dan pendapatan",
        ]);
        return !labelValue.startsWith("jumlah ")
          && !labelValue.includes("saldo akhir")
          && !labelValue.includes("tipe pendapatan")
          && !labelValue.includes("sumber pendapatan")
          && !aggregateLabels.has(labelValue);
      })
      .map((fact) => ({
        label: fact.label.replace(/^[^·]+·\s*/, ""),
        value: fact.currentValue!,
        priorValue: fact.priorValue,
        sharePercent: revenue.current && fact.currentValue! <= revenue.current * 1.05 ? (fact.currentValue! / revenue.current) * 100 : null,
        sheetCode: fact.sheetCode,
        rowNumber: fact.rowNumber,
      }))
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

  if (kpis.revenue.current !== null && kpis.grossProfit.current !== null) {
    const marginDirection = (kpis.grossMargin.changeAmount ?? 0) >= 0 ? "membaik" : "menyempit";
    add({
      category: "profit",
      tone: marginDirection === "membaik" ? "positive" : "warning",
      title: `Margin bruto ${marginDirection}`,
      summary: `Pendapatan ${movementWord(kpis.revenue.changePercent)} ${formatFinancialPercent(Math.abs(kpis.revenue.changePercent ?? 0), false)}, sementara beban pokok ${movementWord(metric(index, "costOfRevenue").changePercent)} ${formatFinancialPercent(Math.abs(metric(index, "costOfRevenue").changePercent ?? 0), false)}. Margin bruto bergerak dari ${formatFinancialPercent(kpis.grossMargin.prior, false)} menjadi ${formatFinancialPercent(kpis.grossMargin.current, false)}.`,
      basis: "calculated",
      confidence: "high",
      evidence: evidenceMany([index.get("revenue"), index.get("costOfRevenue"), index.get("grossProfit")]),
    });
  }

  const profitDriverConcepts = ["grossProfit", "sellingExpense", "generalAdminExpense", "financeIncome", "financeCost", "interestIncome", "interestExpense", "fairValueGainLoss", "foreignExchange", "associateProfit", "jointVentureProfit", "dividendIncome", "otherIncome", "otherExpense"];
  const profitDrivers = profitDriverConcepts
    .map((concept) => index.get(concept))
    .filter((fact): fact is FinancialReportFact => Boolean(fact && fact.currentValue !== null && fact.priorValue !== null))
    .map((fact) => ({ fact, contribution: fact.currentValue! - fact.priorValue! }))
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
    add({
      category: "cash_flow",
      tone: cashWarning ? "negative" : qualityRatio !== null && qualityRatio < 0.6 ? "warning" : "positive",
      title: cashWarning ? "Laba belum berubah menjadi kas" : "Kualitas arus kas operasi",
      summary: cashWarning
        ? `Perusahaan membukukan laba ${amount(report, netCurrent, true)}, tetapi arus kas operasi negatif ${amount(report, kpis.operatingCashFlow.current, true)}. Perubahan modal kerja, pembayaran pemasok, dan pajak perlu ditelusuri.`
        : `Arus kas operasi tercatat ${amount(report, kpis.operatingCashFlow.current)} dibandingkan ${amount(report, kpis.operatingCashFlow.prior)}. ${qualityRatio !== null ? `Rasionya terhadap laba bersih sekitar ${formatFinancialPercent(qualityRatio * 100, false)}.` : ""}`,
      basis: cashWarning ? "inference" : "calculated",
      confidence: cashWarning ? "medium" : "high",
      evidence: evidenceMany([index.get("operatingCashFlow"), index.get("netIncomeParent") ?? index.get("netIncome"), index.get("customerReceipts"), index.get("supplierPayments"), index.get("incomeTaxPayments")]),
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
    breakdowns: buildBreakdowns(noteSheets, facts, revenue),
    facts,
    sourceFile,
  };
  report.insights = buildInsights(report, index);
  report.headline = report.insights[0]?.title ?? `Laporan keuangan ${ticker}`;
  report.executiveSummary = report.insights.slice(0, 3).map((insight) => insight.summary).join(" ");
  return report;
}
