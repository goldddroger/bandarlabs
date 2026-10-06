import type { RightIssueDraft } from "./right-issue";

export const hmetdFieldLabels = {
  ticker: "Kode saham",
  ratio: "Rasio saham lama : HMETD",
  subscriptionPrice: "Harga pelaksanaan (Rp)",
  cumDate: "Cum-HMETD (reguler / negosiasi)",
  exDate: "Ex-HMETD (reguler / negosiasi)",
  recordingDate: "Recording date",
  tradingStart: "Mulai perdagangan HMETD",
  tradingEnd: "Akhir perdagangan HMETD",
  subscriptionDeadline: "Akhir pelaksanaan HMETD",
} as const;

export type HmetdField = keyof typeof hmetdFieldLabels;
export type HmetdEvidence = { page: number; quote: string };
export type HmetdCandidate = HmetdEvidence & { value: string; indicative: boolean };
export type HmetdDocument = {
  filename: string;
  pageCount: number;
  issuer: string | null;
  proposal: boolean;
  tentativeSchedule: boolean;
  nonStandardRight: boolean;
  fields: Record<HmetdField, { status: "found" | "missing" | "indicative" | "conflict"; candidates: HmetdCandidate[] }>;
  warnings: string[];
  context: HmetdEvidence[];
};
export type HmetdTerms = Pick<RightIssueDraft, "ticker" | "ratioOld" | "ratioNew" | "subscriptionPrice" | "cumDate" | "exDate" | "recordingDate" | "tradingStart" | "tradingEnd" | "subscriptionDeadline">;
export const hmetdMaxBytes = 4 * 1024 * 1024;
export const hmetdMaxPages = 150;
