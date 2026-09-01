import { extractText } from "unpdf";
import type {
  FinancialEvidence,
  FinancialInsight,
  FinancialSupportingDocument,
  ParsedFinancialReport,
} from "@/lib/financial-report";

type ParsedPdfDocument = Omit<FinancialSupportingDocument, "storagePath" | "downloadUrl"> & {
  insights: FinancialInsight[];
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function evidenceFor(
  report: ParsedFinancialReport,
  concept: string,
  sourceFile: string,
  pageNumber: number,
  label: string,
): FinancialEvidence[] {
  const fact = report.facts.find((row) => row.concept === concept);
  return [{
    label,
    sheetCode: "PDF",
    rowNumber: pageNumber,
    currentValue: fact?.currentValue ?? null,
    priorValue: fact?.priorValue ?? null,
    sourceType: "pdf",
    sourceFile,
    pageNumber,
  }];
}

function pdfEvidence(sourceFile: string, pageNumber: number, label: string, currentValue: number | null = null): FinancialEvidence[] {
  return [{ label, sheetCode: "PDF", rowNumber: pageNumber, currentValue, priorValue: null, sourceType: "pdf", sourceFile, pageNumber }];
}

function pageContaining(pages: string[], pattern: RegExp) {
  const index = pages.findIndex((page) => pattern.test(compact(page)));
  return index < 0 ? 1 : index + 1;
}

function disclosedInsight(
  report: ParsedFinancialReport,
  sourceFile: string,
  pages: string[],
  input: {
    id: string;
    concept: string;
    pattern: RegExp;
    title: string;
    summary: string;
    tone?: FinancialInsight["tone"];
    category?: FinancialInsight["category"];
  },
): FinancialInsight | null {
  const pageNumber = pageContaining(pages, input.pattern);
  if (!input.pattern.test(compact(pages[pageNumber - 1] ?? ""))) return null;
  return {
    id: `pdf-${input.id}`,
    category: input.category ?? (input.tone === "warning" ? "risk" : "balance"),
    tone: input.tone ?? "neutral",
    title: input.title,
    summary: input.summary,
    basis: "disclosed",
    confidence: "high",
    evidence: evidenceFor(report, input.concept, sourceFile, pageNumber, input.title),
  };
}

function movementDisclosureInsights(report: ParsedFinancialReport, sourceFile: string, pages: string[]) {
  const definitions = [
    { id: "liability-homologation", concept: "liabilities", pattern: /liabilitas[\s\S]{0,180}penurunan[\s\S]{0,180}penerapan PSAK 109[\s\S]{0,120}homologasi PKPU/i, title: "Liabilitas turun akibat akuntansi homologasi PKPU", summary: "Emiten menjelaskan penurunan liabilitas berasal dari penerapan PSAK 109 atas hasil homologasi PKPU. Perubahan besar ini berkaitan dengan perlakuan akuntansi restrukturisasi dan bukan semata-mata pelunasan utang secara tunai.", category: "debt" as const },
    { id: "equity-homologation", concept: "equity", pattern: /penerapan PSAK[\s\S]{0,180}ekuitas[\s\S]{0,100}peningkatan/i, title: "Ekuitas naik sebagai dampak homologasi", summary: "Surat penjelasan mengaitkan kenaikan ekuitas dengan penerapan standar akuntansi atas homologasi PKPU. Kenaikan ekuitas ini perlu dibedakan dari tambahan modal tunai atau laba operasional.", category: "balance" as const },
    { id: "current-ratio-restructuring", concept: "currentAssets", pattern: /rasio lancar \(current ratio\)[\s\S]{0,100}(lebih baik|dibanding)/i, title: "Likuiditas membaik setelah restrukturisasi", summary: "Emiten menyatakan current ratio membaik setelah perubahan kewajiban. Perbaikan rasio tetap perlu dibaca bersama kas aktual, jadwal pembayaran baru, dan kemampuan menghasilkan arus kas operasi.", category: "debt" as const },
    { id: "cash-customer-payment", concept: "cash", pattern: /saldo kas dan bank naik[\s\S]{0,100}penerimaan pembayaran dari pelanggan/i, title: "Kas naik karena pembayaran pelanggan", summary: "Emiten menjelaskan saldo kas dan bank naik lebih dari dua kali lipat karena penerimaan pembayaran dari pelanggan.", category: "cash_flow" as const },
    { id: "receivables-meat-sales", concept: "tradeReceivablesThird", pattern: /lonjakan signifikan piutang[\s\S]{0,100}peningkatan penjualan daging/i, title: "Piutang naik seiring penjualan daging", summary: "Emiten mengaitkan lonjakan piutang usaha dengan peningkatan penjualan daging. Pertumbuhan penjualan ini belum seluruhnya berubah menjadi kas pada tanggal laporan.", tone: "warning" as const },
    { id: "inventory-usage", concept: "inventory", pattern: /penurunan persediaan[\s\S]{0,140}penggunaan persediaan[\s\S]{0,80}melebihi pembelian/i, title: "Persediaan turun karena pemakaian melebihi pembelian", summary: "Emiten menjelaskan persediaan turun karena peningkatan penjualan atau penggunaan persediaan yang melebihi pembelian." },
    { id: "advance-meat", concept: "advances", pattern: /pembayaran uang muka[\s\S]{0,60}pembelian daging/i, title: "Uang muka naik untuk pembelian daging", summary: "Kenaikan uang muka berasal dari pembayaran awal untuk pembelian daging, sehingga berkaitan langsung dengan ekspansi aktivitas perdagangan daging." },
    { id: "payables-meat", concept: "tradePayablesThird", pattern: /kenaikan signifikan utang usaha[\s\S]{0,120}aktivitas bisnis daging/i, title: "Utang usaha naik mengikuti bisnis daging", summary: "Emiten menyatakan utang usaha bertambah sejalan dengan peningkatan aktivitas bisnis daging.", category: "debt" as const },
    { id: "accrued-rent-professional", concept: "accruedExpenses", pattern: /hutang sewa dan jasa profesional[\s\S]{0,100}periode berjalan/i, title: "Accrual naik dari sewa dan jasa profesional", summary: "Biaya yang masih harus dibayar meningkat karena kewajiban sewa dan jasa profesional periode berjalan belum ditagihkan dalam jumlah besar.", tone: "warning" as const, category: "debt" as const },
  ];
  return definitions.flatMap((definition) => {
    const insight = disclosedInsight(report, sourceFile, pages, definition);
    return insight ? [insight] : [];
  });
}

function financialStatementInsights(report: ParsedFinancialReport, sourceFile: string, pages: string[]) {
  const definitions = [
    { id: "interim-unaudited", concept: "netIncome", pattern: /laporan keuangan konsolidasian interim[\s\S]{0,120}tidak diaudit/i, title: "Laporan periode berjalan belum diaudit", summary: "Dokumen menyatakan laporan keuangan interim periode berjalan tidak diaudit. Angka tetap berguna untuk analisis, tetapi bukan opini audit dan tidak dapat dipakai untuk menyimpulkan kriteria FCA terkait disclaimer.", tone: "warning" as const, category: "risk" as const },
    { id: "going-concern-uncertainty", concept: "equity", pattern: /akumulasi kerugian[\s\S]{0,180}ketidakpastian[\s\S]{0,120}kelangsungan usaha/i, title: "Terdapat ketidakpastian kelangsungan usaha", summary: "Catatan laporan mengungkap akumulasi kerugian yang menimbulkan ketidakpastian material atas kemampuan grup mempertahankan kelangsungan usaha. Rencana mitigasinya mencakup efisiensi, penagihan piutang, restrukturisasi utang, dan alternatif modal kerja.", tone: "warning" as const, category: "risk" as const },
    { id: "pkpu-homologation", concept: "liabilities", pattern: /mengesahkan perjanjian perdamaian \(homologasi\)[\s\S]{0,100}PKPU/i, title: "Perjanjian PKPU telah dihomologasi", summary: "Catatan peristiwa signifikan menyatakan pengadilan telah mengesahkan perjanjian perdamaian antara emiten dan kreditur. Status hukum ini memberi konteks penting atas perubahan klasifikasi serta pengukuran kewajiban.", tone: "warning" as const, category: "debt" as const },
    { id: "long-term-restructuring", concept: "interestBearingDebt", pattern: /waktu penyelesaian 8 tahun[\s\S]{0,600}jangka waktu penyelesaian 10 tahun[\s\S]{0,120}tanpa (dibebankan )?bunga/i, title: "Sebagian utang direstrukturisasi hingga 8-10 tahun", summary: "Skema perdamaian mengungkap sejumlah kelompok kreditur memperoleh tenor penyelesaian 8 sampai 10 tahun tanpa bunga. Tenor baru membantu likuiditas jangka pendek, tetapi kewajiban pokok tetap harus dipantau.", category: "debt" as const },
    { id: "rights-issue-debt-conversion", concept: "equity", pattern: /PMHMETD[\s\S]{0,220}konversi[\s\S]{0,120}(hak tagih|piutang)[\s\S]{0,120}(MTN|saham)/i, title: "Rights issue mencakup konversi tagihan menjadi saham", summary: "Pemegang saham menyetujui PMHMETD yang dapat digunakan untuk mengonversi tagihan pemegang saham atau pemegang MTN menjadi saham. Aksi ini berpotensi mengurangi utang sekaligus menambah jumlah saham beredar.", category: "debt" as const },
    { id: "operating-cash-detail", concept: "operatingCashFlow", pattern: /penerimaan dari pelanggan[\s\S]*pembayaran kepada pemasok[\s\S]*arus kas bersih yang diperoleh dari[\s\S]*aktivitas operasi/i, title: "Arus kas operasi ditopang penerimaan pelanggan", summary: "Laporan arus kas memperlihatkan penerimaan pelanggan meningkat dan selisih terhadap pembayaran pemasok serta karyawan menghasilkan arus kas operasi positif. Detail modal kerja ini lebih informatif daripada sekadar membandingkan CFO dengan laba.", category: "cash_flow" as const },
    { id: "cement-segment-profitability", concept: "grossProfit", pattern: /INFORMASI SEGMEN[\s\S]*Produksi semen[\s\S]*Produksi non.?semen[\s\S]*Hasil segmen/i, title: "Profitabilitas terkonsentrasi pada segmen semen", summary: "Catatan segmen menunjukkan operasi semen menghasilkan laba segmen, sementara kelompok produksi non-semen masih mencatat hasil segmen negatif. Pertumbuhan konsolidasian perlu diuji terhadap ketergantungan pada mesin laba utama ini.", tone: "warning" as const, category: "business_mix" as const },
    { id: "coal-price-risk", concept: "costOfRevenue", pattern: /risiko harga[\s\S]*pembelian batu bara[\s\S]*kontrak pembelian[\s\S]*12 bulan/i, title: "Biaya produksi sensitif terhadap harga batu bara", summary: "Catatan risiko menyebut batu bara sebagai komponen utama biaya produksi. Mitigasinya mencakup kontrak pembelian berjangka hingga 12 bulan dan pembelian bersama untuk memperoleh harga yang lebih baik.", tone: "warning" as const, category: "risk" as const },
    { id: "meat-sales-mix", concept: "revenue", pattern: /21\. Penjualan[\s\S]*Daging[\s\S]*325\.328\.235\.632/i, title: "Daging menjadi sumber utama pendapatan", summary: "Catatan penjualan menunjukkan bisnis daging menghasilkan Rp325,33 miliar atau sekitar 99,4% dari pendapatan periode berjalan.", category: "business_mix" as const },
    { id: "jakarta-sales", concept: "revenue", pattern: /DKI Jakarta[\s\S]*71,26%/i, title: "Penjualan terkonsentrasi di DKI Jakarta", summary: "Catatan wilayah mengungkapkan DKI Jakarta menyumbang 71,26% penjualan, sehingga perubahan permintaan wilayah ini berdampak material.", category: "business_mix" as const },
    { id: "third-party-sales", concept: "revenue", pattern: /seluruh penjualan perseroan adalah kepada pihak ketiga/i, title: "Seluruh penjualan berasal dari pihak ketiga", summary: "Catatan laporan menyatakan seluruh penjualan periode ini dilakukan kepada pihak ketiga dan tidak terdapat penjualan kepada pihak berelasi." },
    { id: "receivable-management-view", concept: "tradeReceivablesThird", pattern: /manajemen berpendapat bahwa tidak terdapat piutang yang tidak tertagih/i, title: "Manajemen menyatakan tidak ada piutang tak tertagih", summary: "Setelah menelaah kerugian kredit ekspektasian, manajemen menyatakan tidak terdapat piutang pihak ketiga yang tidak tertagih. Pernyataan ini tetap perlu dipantau bersama umur piutang dan realisasi penerimaan kas.", tone: "warning" as const },
    { id: "inventory-uninsured", concept: "inventory", pattern: /belum mengasuransikan persediaan terhadap risiko kebakaran/i, title: "Persediaan belum diasuransikan", summary: "Catatan laporan mengungkapkan persediaan belum diasuransikan terhadap risiko kebakaran dan risiko lainnya.", tone: "warning" as const },
    { id: "supplier-concentration", concept: "costOfRevenue", pattern: /22\. Beban pokok penjualan[\s\S]*PT Segar Baru Abadi[\s\S]*14,80%/i, title: "Satu pemasok menyumbang 14,8% pembelian", summary: "Catatan beban pokok mengungkapkan PT Segar Baru Abadi menyumbang 14,8% pembelian periode berjalan. Konsentrasi pemasok perlu dipantau terhadap harga dan kesinambungan pasokan.", tone: "warning" as const, category: "business_mix" as const },
  ];
  return definitions.flatMap((definition) => {
    const insight = disclosedInsight(report, sourceFile, pages, definition);
    return insight ? [insight] : [];
  });
}

function parseIndonesianAmount(value: string, unit: string) {
  const normalized = Number(value.replace(/\./g, "").replace(",", "."));
  const multiplier = /triliun|\bT\b/i.test(unit) ? 1_000_000_000_000 : /miliar/i.test(unit) ? 1_000_000_000 : /juta/i.test(unit) ? 1_000_000 : 1;
  return Number.isFinite(normalized) ? normalized * multiplier : null;
}

function amountNear(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? parseIndonesianAmount(match[1], match[2]) : null;
}

function materialInformationInsights(report: ParsedFinancialReport, sourceFile: string, pages: string[]) {
  const insights: FinancialInsight[] = [];
  const firstPage = pages[0] ?? "";
  const revenue = amountNear(firstPage, /pendapatan sebesar Rp\s*([\d.,]+)\s*(triliun|miliar|juta|T)\b/i);
  const disclosedProfit = amountNear(firstPage, /laba bersih sebesar Rp\s*([\d.,]+)\s*(triliun|miliar|juta|T)\b/i);
  const totalProfit = report.facts.find((fact) => fact.concept === "netIncome")?.currentValue ?? null;
  const parentProfit = report.facts.find((fact) => fact.concept === "netIncomeParent")?.currentValue ?? report.kpis.netIncome.current;

  if (revenue !== null) {
    insights.push({
      id: "pdf-material-revenue",
      category: "profit",
      tone: "positive",
      title: "Pertumbuhan pendapatan dikonfirmasi keterbukaan emiten",
      summary: "Nilai pendapatan yang disebut dalam keterbukaan dapat direkonsiliasi dengan laporan keuangan. Penjelasan manajemen mengaitkannya dengan peningkatan penjualan dan permintaan protein hewani.",
      basis: "disclosed",
      confidence: "high",
      evidence: pdfEvidence(sourceFile, 1, "Pendapatan dalam keterbukaan", revenue),
    });
  }

  if (disclosedProfit !== null) {
    const matchesTotal = totalProfit !== null && Math.abs(disclosedProfit - totalProfit) / Math.max(Math.abs(totalProfit), 1) < 0.02;
    const differsFromParent = parentProfit !== null && Math.abs(disclosedProfit - parentProfit) / Math.max(Math.abs(parentProfit), 1) >= 0.02;
    insights.push({
      id: "pdf-material-profit-scope",
      category: "profit",
      tone: matchesTotal ? "neutral" : "warning",
      title: matchesTotal && differsFromParent ? "Angka laba memakai scope yang berbeda" : matchesTotal ? "Laba bersih selaras dengan laporan" : "Angka laba perlu direkonsiliasi",
      summary: matchesTotal && differsFromParent
        ? "Laba bersih pada keterbukaan cocok dengan laba konsolidasian periode berjalan, sedangkan KPI utama memakai laba yang dapat diatribusikan kepada pemilik entitas induk. Keduanya valid, tetapi scope-nya berbeda."
        : matchesTotal
          ? "Laba bersih yang disebut dalam keterbukaan dapat direkonsiliasi dengan pos laba periode berjalan pada laporan keuangan."
          : "Laba bersih yang disebut dalam keterbukaan tidak langsung cocok dengan pos laba utama yang terbaca dari Excel. Periksa apakah perbedaannya berasal dari pembulatan, atribusi pemilik, atau scope konsolidasi.",
      basis: "disclosed",
      confidence: "high",
      evidence: pdfEvidence(sourceFile, 1, "Laba bersih dalam keterbukaan", disclosedProfit),
    });
  }

  const definitions = [
    { id: "segment-mix", concept: "revenue", pattern: /pendapatan[\s\S]{0,160}(segmen|lini bisnis)[\s\S]{0,220}%/i, title: "Keterbukaan menjelaskan bauran segmen", summary: "Manajemen merinci kontribusi lini bisnis terhadap pendapatan. Informasi ini membantu memisahkan pertumbuhan grup dari segmen yang benar-benar menjadi penggeraknya.", category: "business_mix" as const },
    { id: "restructuring-liquidity", concept: "currentAssets", pattern: /current ratio[\s\S]{0,160}restrukturisasi kewajiban/i, title: "Perbaikan current ratio dikaitkan dengan restrukturisasi", summary: "Menurut manajemen, perbaikan current ratio merupakan dampak restrukturisasi kewajiban yang disepakati dengan kreditur. Ini memperkuat penjelasan bahwa perubahan rasio bukan hanya hasil peningkatan kas.", category: "debt" as const },
    { id: "rights-issue-use", concept: "equity", pattern: /dana yang terhimpun[\s\S]{0,100}36%[\s\S]{0,100}konversi utang[\s\S]{0,100}64%[\s\S]{0,80}modal kerja/i, title: "Dana rights issue dibagi untuk konversi utang dan modal kerja", summary: "Keterbukaan menyebut sekitar 36% target dana rights issue untuk konversi utang pemegang saham dan pemegang MTN, sedangkan sekitar 64% untuk modal kerja. Struktur ini perlu dipakai saat menilai dilusi dan dampak kas bersih.", category: "debt" as const },
  ];
  for (const definition of definitions) {
    const insight = disclosedInsight(report, sourceFile, pages, definition);
    if (insight) insights.push(insight);
  }
  return insights;
}

export async function parseFinancialPdf(
  data: Uint8Array,
  sourceFile: string,
  report: ParsedFinancialReport,
): Promise<ParsedPdfDocument> {
  const extracted = await extractText(data);
  const pages = (Array.isArray(extracted.text) ? extracted.text : [extracted.text]).map(compact);
  const merged = pages.join(" ");
  const kind: ParsedPdfDocument["kind"] = /perubahan.{0,40}(20|2o)%|perubahan di atas 20/i.test(merged)
    ? "movement_disclosure"
    : /catatan atas laporan keuangan|notes to financial statements/i.test(merged)
      ? "financial_statements"
      : /laporan informasi dan fakta material|laba.{0,40}(YoY|semester)|rights issue|PMHMETD/i.test(`${sourceFile} ${merged}`)
        ? "material_information"
        : "supporting_document";
  const insights = kind === "movement_disclosure"
    ? movementDisclosureInsights(report, sourceFile, pages)
    : kind === "financial_statements"
      ? financialStatementInsights(report, sourceFile, pages)
      : kind === "material_information"
        ? materialInformationInsights(report, sourceFile, pages)
        : [];
  return { name: sourceFile, kind, pageCount: extracted.totalPages, insights };
}

export function mergePdfInsights(existing: FinancialInsight[], documents: ParsedPdfDocument[]) {
  const byTitle = new Map(existing.map((insight) => [insight.title.toLowerCase(), insight]));
  for (const insight of documents.flatMap((document) => document.insights)) byTitle.set(insight.title.toLowerCase(), insight);
  return Array.from(byTitle.values()).slice(0, 40);
}
