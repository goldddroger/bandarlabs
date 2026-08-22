export const journalCategories = ["Pelajaran", "Observasi", "Thesis", "Kesalahan", "Mentoring"] as const;
export type JournalCategory = typeof journalCategories[number];

export type JournalAttachment = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  signed_url?: string | null;
  created_at: string;
};

export type JournalEntry = {
  id: string;
  title: string;
  content: string;
  source_name: string;
  category: JournalCategory;
  ticker_symbols: string[];
  tags: string[];
  journal_date: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  journal_attachments: JournalAttachment[];
};

export type JournalPayload = {
  title: string;
  content: string;
  source_name: string;
  category: JournalCategory;
  ticker_symbols: string[];
  tags: string[];
  journal_date: string;
  pinned: boolean;
};
