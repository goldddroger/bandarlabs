import { hmetdFieldLabels, type HmetdDocument, type HmetdField, type HmetdTerms } from "@/types/hmetd-document";
import { isValidHmetdDate } from "./hmetd-document-parser";
import { formatNumber, parseSimulationNumber } from "./calculations/right-issue-format";

export type HmetdReview = Record<HmetdField, string>;
export function initialHmetdReview(document: HmetdDocument): HmetdReview {
  return Object.fromEntries((Object.keys(document.fields) as HmetdField[]).map((key) => {
    const field = document.fields[key];
    const value = field.status === "conflict" ? "" : field.candidates[0]?.value ?? "";
    return [key, key === "subscriptionPrice" && value ? formatNumber(Number(value), 4) : value];
  })) as HmetdReview;
}

export function reviewHmetdTerms(document: HmetdDocument, values: HmetdReview, resolved: Partial<Record<HmetdField, boolean>>, confirmed: boolean): { terms: HmetdTerms | null; errors: string[] } {
  const errors: string[] = [];
  for (const key of Object.keys(document.fields) as HmetdField[]) {
    if (document.fields[key].status === "conflict" && !resolved[key]) errors.push(`${hmetdFieldLabels[key]}: selesaikan perbedaan nilai terlebih dahulu.`);
  }
  const ticker = values.ticker.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(ticker)) errors.push("Kode saham harus terdiri dari 4 karakter.");
  const ratio = values.ratio.trim().replace(/\s/g, "");
  const parts = ratio.split(":");
  if (ratio && (!/^\d+:\d+$/.test(ratio) || !parts.every((part) => Number.isSafeInteger(Number(part)) && Number(part) > 0))) errors.push("Rasio harus berupa dua bilangan bulat positif, misalnya 4:1.");
  const price = parseSimulationNumber(values.subscriptionPrice);
  if (values.subscriptionPrice.trim() && (!Number.isFinite(price) || price <= 0)) errors.push("Harga pelaksanaan harus lebih besar dari nol.");
  const dates = Object.fromEntries((Object.keys(hmetdFieldLabels) as HmetdField[]).filter((key) => !["ticker", "ratio", "subscriptionPrice"].includes(key)).map((key) => [key, values[key].trim()])) as Pick<HmetdTerms, "cumDate" | "exDate" | "recordingDate" | "tradingStart" | "tradingEnd" | "subscriptionDeadline">;
  for (const [key, value] of Object.entries(dates)) if (value && !isValidHmetdDate(value)) errors.push(`${hmetdFieldLabels[key as HmetdField]} tidak valid.`);
  if (dates.tradingStart && dates.tradingEnd && dates.tradingStart > dates.tradingEnd) errors.push("Awal perdagangan tidak boleh setelah akhir perdagangan.");
  if (dates.cumDate && dates.exDate && dates.cumDate >= dates.exDate) errors.push("Cum-HMETD harus sebelum ex-HMETD.");
  if (!confirmed) errors.push("Konfirmasi hasil tinjauan dokumen terlebih dahulu.");
  return { errors, terms: errors.length ? null : { ticker, ratioOld: ratio ? parts[0] : "", ratioNew: ratio ? parts[1] : "", subscriptionPrice: values.subscriptionPrice.trim() ? formatNumber(price, 4) : "", ...dates } };
}
