export const corporateActionNoteStatuses = ["Belum dibaca", "Perlu dipantau", "Selesai", "Berdampak besar"] as const;

export type FollowUpStatus = typeof corporateActionNoteStatuses[number];

export type CorporateActionEvent = {
  id: string;
  ticker: string;
  company: string;
  actionType: string;
  eventDate: string;
  state: "Mendatang" | "Selesai";
  topic: string;
  announcementPrice: number | null;
  documentLabel: string;
  documentNumber: string;
  publishedAt: string | null;
  description: string;
  impact: string;
  updatedAt: string;
};

export type CorporateActionNote = {
  id: string;
  eventId: string;
  keyMessage: string;
  decision: string;
  followUp: string;
  status: FollowUpStatus;
  createdAt: string;
  updatedAt: string;
};

export type CorporateActionNotePayload = Omit<CorporateActionNote, "id" | "createdAt" | "updatedAt">;

export type CorporateActionQuoteMap = Record<string, {
  price: number;
  source?: string;
  updatedAt?: string;
}>;
