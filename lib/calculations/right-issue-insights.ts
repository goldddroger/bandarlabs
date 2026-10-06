import type { RightIssueInput, RightIssueScenarioCalculation } from "@/types/right-issue";
import { formatCurrency, formatPercentage } from "./right-issue-format";

export type RightIssueInsight = { id: string; title: string; text: string; warning: boolean };

export function getRightIssueInsights(input: RightIssueInput, calculation: RightIssueScenarioCalculation): RightIssueInsight[] {
  const { base, scenarios } = calculation;
  const insights: RightIssueInsight[] = [];
  if (base.rightsRatio === 0) return [{ id: "no-rights", title: "Rasio HMETD nol", text: "Tidak ada saham baru atau dana penebusan pada rasio ini. Strategi A, B, dan C memiliki nilai ekonomi yang sama; hasil D tetap mengikuti harga jual induk.", warning: false }];
  if (base.outOfTheMoney) {
    insights.push({ id: "out-of-money", title: "Harga tebus di atas asumsi harga induk", text: `Harga pelaksanaan ${formatCurrency(input.subscriptionPrice, 2)} berada di atas harga cum-right ${formatCurrency(input.cumPrice, 2)} dan TERP ${formatCurrency(base.terp, 2)}. Nilai intrinsik HMETD pada model ini Rp0; menebus tidak otomatis lebih murah daripada membeli induk di pasar. Harga pasar aktual dapat berubah.`, warning: true });
  } else {
    insights.push({ id: "intrinsic", title: base.theoreticalRightsValue > 0 ? "HMETD memiliki nilai intrinsik teoritis" : "Harga tebus setara TERP", text: `Nilai intrinsik per HMETD ${formatCurrency(base.theoreticalRightsValue, 2)}, berdasarkan TERP dikurangi harga pelaksanaan dan dibatasi minimal Rp0. Nilai ini bukan harga HMETD aktual di pasar.`, warning: false });
  }
  if (base.dilution > 25) insights.push({ id: "dilution", title: "Dilusi di atas 25%", text: `Jika seluruh rights issue terserap dan tidak menebus, porsi kepemilikan relatif turun ${formatPercentage(base.dilution)}. Menjual HMETD menghasilkan kas, tetapi tidak menghindari dilusi kepemilikan.`, warning: true });
  if (base.hasFractionalRights) insights.push({ id: "fractional", title: "Hak pecahan dibulatkan turun", text: `Pada pembulatan simulasi ini, strategi A masih memiliki dilusi ${formatPercentage(scenarios[0].dilution)} meskipun menebus seluruh hak utuh. Alokasi pecahan sebenarnya tetap mengikuti ketentuan emiten.`, warning: false });
  if (scenarios[1].effectiveCost !== null && scenarios[1].effectiveCost < 0) insights.push({ id: "negative-cost", title: "Hasil rights melebihi modal awal", text: "Economic cost strategi B menjadi negatif karena hasil penjualan HMETD lebih besar daripada modal historis saham. Ini bukan average negatif di broker, dan tetap bergantung pada asumsi harga jual rights.", warning: false });
  if (input.marketRightsPrice !== null && base.rightsEntitlement > 0) {
    const crossover = input.subscriptionPrice + input.marketRightsPrice;
    if (Number.isFinite(crossover) && crossover <= Number.MAX_SAFE_INTEGER) insights.push({ id: "crossover", title: "Titik setara P/L tebus vs jual rights", text: `Pada harga post-ex ${formatCurrency(crossover, 4)}, P/L nominal A dan B setara. Di bawah titik itu P/L B lebih tinggi; di atasnya P/L A lebih tinggi. Persentase return dapat berbeda karena modal A lebih besar. Asumsi harga jual HMETD tetap, tanpa fee atau biaya modal.`, warning: false });
  } else if (base.rightsEntitlement > 0) insights.push({ id: "missing-price", title: "Harga jual HMETD belum diketahui", text: "Belum ada perbandingan lengkap dengan strategi menjual HMETD. Harga kosong tidak diasumsikan sebagai nol maupun diganti otomatis dengan nilai intrinsik.", warning: true });
  insights.push({ id: "expiry", title: "Rights kedaluwarsa tidak menghasilkan kas", text: "Strategi C mempertahankan saham induk tanpa dana tebus atau hasil penjualan HMETD. Nilai rights yang tidak direalisasi dicatat terpisah sebagai opportunity cost, bukan dipotong lagi dari P/L saham.", warning: false });
  return insights;
}
