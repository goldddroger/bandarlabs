export const stockCaResearchStatuses = ["Rencana", "Sedang diriset", "Selesai"] as const;
export const stockCaResearchChangeEvent = "bandarlab-stock-ca-research-change";

export type StockCaResearchStatus = typeof stockCaResearchStatuses[number];

export type StockCaResearchNote = {
  id: string;
  ticker: string;
  actionType: string;
  title: string;
  researchNote: string;
  eventDate: string | null;
  reminderDate: string;
  status: StockCaResearchStatus;
  createdAt: string;
  updatedAt: string;
};

export type StockCaResearchPayload = Omit<StockCaResearchNote, "id" | "ticker" | "createdAt" | "updatedAt"> & { ticker: string };
