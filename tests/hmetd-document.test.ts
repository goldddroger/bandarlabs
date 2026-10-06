import assert from "node:assert/strict";
import test from "node:test";
import { isValidHmetdDate, parseHmetdDocument } from "../lib/hmetd-document-parser";
import { initialHmetdReview, reviewHmetdTerms } from "../lib/hmetd-document-review";
import { applyHmetdTerms } from "../lib/calculations/hmetd-terms";
import { emptyRightIssueDraft, rightIssueDemo } from "../lib/calculations/right-issue-draft";
import { calculateRightIssue } from "../lib/calculations/right-issue";

// Representative text fragments retain the two disclosure formats and the conflicting DPS dates.
const buvaPages = [
  `PT BUKIT ULUWATU VILLA TBK. PMHMETD II. Nilai nominal Rp50,- per saham.
   Setiap pemegang 4 (empat) Saham Lama yang namanya tercatat dalam DPS pada tanggal 8 (delapan) Hari Kerja setelah efektifnya Pernyataan Pendaftaran, atau pada tanggal 15 Oktober 2026 pukul 16.00 WIB berhak atas sebanyak 1 (satu) HMETD, dimana setiap 1 (satu) HMETD memberikan hak kepada pemegangnya untuk membeli sebanyak 1 (satu) Saham Baru dengan Harga Pelaksanaan sebesar Rp250,-.
   Periode perdagangan HMETD mulai tanggal 19 Oktober 2026 sampai dengan tanggal 30 Oktober 2026.`,
  `JADWAL SEMENTARA
   RUPS Persetujuan PMHMETD II : 26 Februari 2026 Pencatatan HMETD di Bursa Efek Indonesia : 19 Oktober 2026
   Daftar Pemegang Saham yang Berhak Memperoleh HMETD : 15 Oktober 2026 Periode Distribusi Saham Hasil HMETD : 21 Oktober - 3 November 2026
   Cum-HMETD di Pasar Reguler dan Pasar Negosiasi : 13 Oktober 2026 Akhir Pembayaran Pemesanan Saham Tambahan : 3 November 2026
   Ex-HMETD di Pasar Reguler dan Pasar Negosiasi : 14 Oktober 2026 Penjatahan Saham Tambahan : 4 November 2026
   Cum-HMETD di Pasar Tunai : 15 Oktober 2026
   Ex-HMETD di Pasar Tunai : 16 Oktober 2026
   Setiap pemegang 4 (empat) Saham Lama yang namanya tercatat dalam DPS pada tanggal 14 Oktober 2026 pukul 16.00 WIB berhak atas sebanyak 1 (satu) HMETD.
   Harga pelaksanaan : Rp250,-. Periode perdagangan dan pelaksanaan HMETD : 19 - 30 Oktober 2026`,
];
const buva = () => parseHmetdDocument("20261006_BUVA_Keterbukaan.pdf", buvaPages);
const lapd = () => parseHmetdDocument("20260911_LAPD_Keterbukaan.pdf", [
  "PT LEYAND INTERNATIONAL TBK (kode saham: LAPD). PMHMETD II hanya merupakan usulan. DPS pada tanggal 25 September 2026. RUPSLB akan dilaksanakan pada tanggal 20 Oktober 2026.",
  "Saham Perseroan sebelum PMHMETD II 3.966.350.139. Saham Baru maksimum 2.000.000.000. Nilai nominal Rp25 per saham. Harga pelaksanaan indika^f Rp50 per saham. Perkiraan rasio HMETD Rasio final HMETD akan ditentukan kemudian.",
]);

test("BUVA: harga pelaksanaan bukan nominal, rasio eksplisit dan evidence fisik", () => {
  const doc = buva();
  assert.equal(doc.fields.subscriptionPrice.candidates[0].value, "250");
  assert.equal(doc.fields.subscriptionPrice.candidates[0].page, 1);
  assert.match(doc.fields.subscriptionPrice.candidates[0].quote, /Harga Pelaksanaan/);
  assert.equal(doc.fields.ratio.candidates[0].value, "4:1");
  assert.equal(doc.issuer, "PT BUKIT ULUWATU VILLA TBK");
  assert.equal(doc.proposal, false);
});
test("BUVA: jadwal reguler tidak tertukar pasar tunai, distribusi dan pembayaran tambahan", () => {
  const fields = buva().fields;
  for (const [key, expected] of Object.entries({ cumDate: "2026-10-13", exDate: "2026-10-14", tradingStart: "2026-10-19", tradingEnd: "2026-10-30", subscriptionDeadline: "2026-10-30" })) assert.equal(fields[key as keyof typeof fields].candidates[0].value, expected);
  assert.equal(fields.cumDate.candidates.length, 1);
  assert.equal(fields.subscriptionDeadline.candidates.length, 1);
  assert.equal(fields.cumDate.status, "indicative");
});
test("BUVA: recording date bertentangan tidak dipilih diam-diam", () => {
  const doc = buva(); const values = initialHmetdReview(doc);
  assert.equal(doc.fields.recordingDate.status, "conflict");
  assert.deepEqual(doc.fields.recordingDate.candidates.map((item) => item.value).sort(), ["2026-10-14", "2026-10-15"]);
  assert.equal(values.recordingDate, "");
  assert.equal(reviewHmetdTerms(doc, values, {}, true).terms, null);
  assert.equal(reviewHmetdTerms(doc, { ...values, recordingDate: "2026-10-15" }, { recordingDate: true }, true).terms?.recordingDate, "2026-10-15");
  assert.equal(reviewHmetdTerms(doc, values, { recordingDate: true }, true).terms?.recordingDate, "");
});
test("LAPD: rasio TBD tidak dihitung dari jumlah saham dan harga indikatif tetap ditandai", () => {
  const doc = lapd();
  assert.equal(doc.proposal, true);
  assert.equal(doc.fields.ratio.status, "missing");
  assert.equal(doc.fields.subscriptionPrice.status, "indicative");
  assert.equal(doc.fields.subscriptionPrice.candidates[0].value, "50");
  assert.equal(doc.fields.ticker.candidates[0].page, 1);
  assert.equal(doc.fields.cumDate.status, "missing");
  assert.ok(doc.warnings.some((warning) => warning.includes("mendahului")));
  const values = initialHmetdReview(doc);
  assert.equal(reviewHmetdTerms(doc, values, {}, false).terms, null);
  assert.equal(reviewHmetdTerms(doc, values, {}, true).terms?.ratioOld, "");
});
test("harga bertentangan dipertahankan dan nominal saja tidak menjadi harga tebus", () => {
  const doc = parseHmetdDocument("ABCD.pdf", ["HMETD. Nilai nominal Rp50. Harga pelaksanaan : Rp250. Harga pelaksanaan sebesar Rp300."]);
  assert.equal(doc.fields.subscriptionPrice.status, "conflict");
  assert.deepEqual(doc.fields.subscriptionPrice.candidates.map((candidate) => candidate.value), ["250", "300"]);
  assert.equal(parseHmetdDocument("ABCD.pdf", ["HMETD. Nilai nominal Rp50"]).fields.subscriptionPrice.status, "missing");
});
test("ticker filename yang berbeda dengan isi wajib ditinjau, filename umum bukan ticker", () => {
  const doc = parseHmetdDocument("20261006_BUVA_Keterbukaan.pdf", ["HMETD. Kode saham: LAPD."]);
  assert.equal(doc.fields.ticker.status, "conflict");
  assert.equal(initialHmetdReview(doc).ticker, "");
  assert.equal(parseHmetdDocument("INFO_Laporan.pdf", ["HMETD"]).fields.ticker.status, "missing");
});
test("tanggal kalender salah ditolak dan rentang lintas bulan dibaca", () => {
  assert.equal(isValidHmetdDate("2026-02-30"), false);
  assert.equal(isValidHmetdDate("2028-02-29"), true);
  const doc = parseHmetdDocument("ABCD.pdf", ["HMETD. Recording date: 31 Februari 2026. Periode perdagangan dan pelaksanaan HMETD: 28 Oktober - 6 November 2026."]);
  assert.equal(doc.fields.recordingDate.status, "missing");
  assert.equal(doc.fields.tradingStart.candidates[0].value, "2026-10-28");
  assert.equal(doc.fields.subscriptionDeadline.candidates[0].value, "2026-11-06");
});
test("rasio eksplisit dan nominal ribuan / desimal lokal", () => {
  const doc = parseHmetdDocument("ABCD.pdf", ["Rasio HMETD: 10:3. Harga pelaksanaan: Rp1.250,50"]);
  assert.equal(doc.fields.ratio.candidates[0].value, "10:3");
  assert.equal(doc.fields.subscriptionPrice.candidates[0].value, "1250.5");
  assert.equal(initialHmetdReview(doc).subscriptionPrice, "1.250,5");
});
test("HMETD non satu-saham tidak diterapkan otomatis", () => {
  const doc = parseHmetdDocument("ABCD.pdf", ["Rasio HMETD: 4:1. Setiap 1 HMETD memberikan hak untuk membeli sebanyak 2 Saham Baru."]);
  assert.equal(doc.fields.ratio.status, "missing");
  assert.ok(doc.warnings.some((warning) => warning.includes("tidak satu banding satu")));
});
test("format file lain tidak diartikan sebagai HMETD", () => {
  assert.throws(() => parseHmetdDocument("ABCD.pdf", ["Laporan keuangan dan laba bersih"]), /tidak memuat/);
});
test("validasi koreksi manual: ticker, rasio, harga, tanggal, dan konfirmasi", () => {
  const doc = lapd(); const values = initialHmetdReview(doc);
  for (const change of [{ ticker: "" }, { ratio: "4:0" }, { ratio: "4:1,5" }, { subscriptionPrice: "NaN" }, { subscriptionPrice: "-1" }, { cumDate: "2026-02-30" }, { cumDate: "2026-10-15", exDate: "2026-10-14" }, { tradingStart: "2026-10-30", tradingEnd: "2026-10-19" }]) assert.equal(reviewHmetdTerms(doc, { ...values, ...change }, {}, true).terms, null);
});
test("apply: berbeda emiten membersihkan posisi, terms lama dan harga HMETD", () => {
  const doc = buva(); const values = { ...initialHmetdReview(doc), recordingDate: "2026-10-15" };
  const reviewed = reviewHmetdTerms(doc, values, { recordingDate: true }, true);
  assert.ok(reviewed.terms);
  const next = applyHmetdTerms(rightIssueDemo, reviewed.terms);
  assert.equal(next.ticker, "BUVA"); assert.equal(next.ownedShares, ""); assert.equal(next.averageBuy, ""); assert.equal(next.cumPrice, ""); assert.equal(next.marketRightsPrice, "");
  assert.equal(next.ratioOld, "4"); assert.equal(next.ratioNew, "1"); assert.equal(next.subscriptionPrice, "250");
});
test("apply: emiten sama mempertahankan posisi, terms yang absen tetap kosong", () => {
  const doc = lapd(); const reviewed = reviewHmetdTerms(doc, initialHmetdReview(doc), {}, true);
  assert.ok(reviewed.terms);
  const next = applyHmetdTerms({ ...rightIssueDemo, ticker: "LAPD", exDate: "2026-10-14" }, reviewed.terms);
  assert.equal(next.ownedShares, rightIssueDemo.ownedShares);
  assert.equal(next.ratioOld, ""); assert.equal(next.ratioNew, ""); assert.equal(next.exDate, "");
});
test("hasil review BUVA benar-benar dipakai mesin entitlement, modal dan TERP", () => {
  const doc = buva(); const reviewed = reviewHmetdTerms(doc, { ...initialHmetdReview(doc), recordingDate: "2026-10-15" }, { recordingDate: true }, true);
  assert.ok(reviewed.terms);
  const draft = applyHmetdTerms(emptyRightIssueDraft("BUVA"), reviewed.terms);
  const calculation = calculateRightIssue({ ownedShares: 4000, averageBuy: 300, cumPrice: 400, ratioOld: Number(draft.ratioOld), ratioNew: Number(draft.ratioNew), subscriptionPrice: Number(draft.subscriptionPrice), marketRightsPrice: null });
  assert.ok(calculation.ok);
  assert.equal(calculation.data.rightsEntitlement, 1000);
  assert.equal(calculation.data.cashRequired, 250000);
  assert.equal(calculation.data.terp, 370);
});
