"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  History,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type JournalTab = "agenda" | "timeline" | "notes" | "documents";
type FollowUpStatus = "Belum dibaca" | "Perlu dipantau" | "Selesai" | "Berdampak besar";

type CorporateActionEvent = {
  id: string;
  ticker: string;
  company: string;
  type: "RUPST" | "RUPSLB" | "Public Expose";
  date: string;
  displayDate: string;
  state: "Mendatang" | "Selesai";
  topic: string;
  announcementPrice: number;
  currentPrice: number;
  documentLabel: string;
};

type MeetingNote = {
  id: string;
  eventId: string;
  keyMessage: string;
  decision: string;
  followUp: string;
  status: FollowUpStatus;
  updatedAt: string;
};

const storageKey = "bandarlab-corporate-action-notes";
const storageEventName = "bandarlab-corporate-action-notes-change";

const events: CorporateActionEvent[] = [
  {
    id: "tosk-rupslb-2026",
    ticker: "TOSK",
    company: "Topindo Solusi Komunika Tbk",
    type: "RUPSLB",
    date: "2026-08-22",
    displayDate: "22 Agustus 2026",
    state: "Mendatang",
    topic: "Perubahan susunan pengurus dan persetujuan rencana pengembangan usaha.",
    announcementPrice: 168,
    currentPrice: 172,
    documentLabel: "Pemanggilan RUPSLB",
  },
  {
    id: "bren-rupst-2026",
    ticker: "BREN",
    company: "Barito Renewables Energy Tbk",
    type: "RUPST",
    date: "2026-08-27",
    displayDate: "27 Agustus 2026",
    state: "Mendatang",
    topic: "Persetujuan laporan tahunan, penggunaan laba, dan arahan ekspansi.",
    announcementPrice: 8050,
    currentPrice: 8125,
    documentLabel: "Agenda RUPST",
  },
  {
    id: "lapd-pubex-2026",
    ticker: "LAPD",
    company: "Leyand International Tbk",
    type: "Public Expose",
    date: "2026-08-19",
    displayDate: "19 Agustus 2026",
    state: "Mendatang",
    topic: "Paparan kinerja dan perkembangan kegiatan operasional perseroan.",
    announcementPrice: 98,
    currentPrice: 102,
    documentLabel: "Materi Public Expose",
  },
  {
    id: "ammn-rupst-2026",
    ticker: "AMMN",
    company: "Amman Mineral Internasional Tbk",
    type: "RUPST",
    date: "2026-08-15",
    displayDate: "15 Agustus 2026",
    state: "Selesai",
    topic: "Persetujuan laporan tahunan dan pembaruan rencana belanja modal.",
    announcementPrice: 9150,
    currentPrice: 9400,
    documentLabel: "Ringkasan Risalah RUPST",
  },
  {
    id: "adro-rupslb-2026",
    ticker: "ADRO",
    company: "Alamtri Resources Indonesia Tbk",
    type: "RUPSLB",
    date: "2026-08-08",
    displayDate: "8 Agustus 2026",
    state: "Selesai",
    topic: "Persetujuan transaksi material dan perubahan penggunaan dana.",
    announcementPrice: 2380,
    currentPrice: 2460,
    documentLabel: "Ringkasan Risalah RUPSLB",
  },
];

const defaultNotes: MeetingNote[] = [
  {
    id: "note-ammn-2026",
    eventId: "ammn-rupst-2026",
    keyMessage: "Manajemen mempertahankan fokus pada penyelesaian ekspansi fasilitas pengolahan.",
    decision: "Laporan tahunan diterima dan rencana belanja modal dilanjutkan.",
    followUp: "Pantau realisasi capex dan perkembangan produksi kuartal berikutnya.",
    status: "Perlu dipantau",
    updatedAt: "17 Agustus 2026",
  },
];
const defaultNotesSnapshot = JSON.stringify(defaultNotes);

const tabs: Array<{ id: JournalTab; label: string; icon: typeof CalendarDays }> = [
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "timeline", label: "Timeline", icon: History },
  { id: "notes", label: "Catatan RUPS", icon: NotebookPen },
  { id: "documents", label: "Dokumen", icon: FileText },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function movementPercent(event: CorporateActionEvent) {
  return ((event.currentPrice - event.announcementPrice) / event.announcementPrice) * 100;
}

function statusStyle(status: FollowUpStatus) {
  if (status === "Selesai") return "bg-emerald-50 text-emerald-700";
  if (status === "Berdampak besar") return "bg-red-50 text-red-700";
  if (status === "Perlu dipantau") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-700";
}

function parseNotesSnapshot(snapshot: string) {
  try {
    const parsed = JSON.parse(snapshot) as MeetingNote[];
    return Array.isArray(parsed) ? parsed : defaultNotes;
  } catch {
    return defaultNotes;
  }
}

function subscribeToNotes(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(storageEventName, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(storageEventName, onStoreChange);
  };
}

function getNotesSnapshot() {
  return window.localStorage.getItem(storageKey) ?? defaultNotesSnapshot;
}

function saveNotes(notes: MeetingNote[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(notes));
  window.dispatchEvent(new Event(storageEventName));
}

export function CorporateActionJournal() {
  const [activeTab, setActiveTab] = useState<JournalTab>("agenda");
  const [selectedTicker, setSelectedTicker] = useState(events[0].ticker);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const notesSnapshot = useSyncExternalStore(subscribeToNotes, getNotesSnapshot, () => defaultNotesSnapshot);
  const notes = useMemo(() => parseNotesSnapshot(notesSnapshot), [notesSnapshot]);

  const selectedEvents = useMemo(() => events.filter((event) => event.ticker === selectedTicker), [selectedTicker]);
  const pendingCount = events.filter((event) => event.state === "Mendatang").length;
  const monitorCount = notes.filter((note) => note.status === "Perlu dipantau" || note.status === "Berdampak besar").length;

  function openNewNote(eventId?: string) {
    setEditingNote({
      id: "",
      eventId: eventId ?? events[0].id,
      keyMessage: "",
      decision: "",
      followUp: "",
      status: "Belum dibaca",
      updatedAt: "",
    });
    setModalOpen(true);
  }

  function saveNote(note: MeetingNote) {
    const savedNote = {
      ...note,
      id: note.id || `note-${Date.now()}`,
      updatedAt: new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date()),
    };
    const exists = notes.some((item) => item.id === savedNote.id);
    saveNotes(exists ? notes.map((item) => (item.id === savedNote.id ? savedNote : item)) : [savedNote, ...notes]);
    setModalOpen(false);
    setEditingNote(null);
  }

  function deleteNote(noteId: string) {
    saveNotes(notes.filter((note) => note.id !== noteId));
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm text-gray-500">Corporate Action</p>
          <h1 className="text-2xl font-semibold tracking-normal text-gray-950">Corporate Action Journal</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Pantau agenda emiten, simpan pesan penting manajemen, dan catat tindak lanjut setelah RUPST atau RUPSLB.
          </p>
        </div>
        <Button className="w-full lg:w-auto" type="button" onClick={() => openNewNote()}>
          <Plus className="size-4" />
          Tambah catatan
        </Button>
      </div>

      <div className="mb-5 grid overflow-hidden rounded-lg border border-gray-200 bg-white sm:grid-cols-3">
        <SummaryMetric label="Agenda mendatang" value={String(pendingCount)} detail="RUPS dan public expose" icon={CalendarDays} />
        <SummaryMetric label="Perlu ditindaklanjuti" value={String(monitorCount)} detail="Catatan yang masih aktif" icon={BellRing} />
        <SummaryMetric label="Pembaruan terakhir" value="17 Agu 2026" detail="Data contoh untuk rancangan awal" icon={Clock3} />
      </div>

      <div className="mb-5 overflow-x-auto border-b border-gray-200">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Corporate Action Journal">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-red-600 text-red-700"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "agenda" ? <AgendaView onAddNote={openNewNote} /> : null}
      {activeTab === "timeline" ? (
        <TimelineView selectedTicker={selectedTicker} onTickerChange={setSelectedTicker} events={selectedEvents} />
      ) : null}
      {activeTab === "notes" ? (
        <NotesView
          notes={notes}
          onAdd={() => openNewNote()}
          onEdit={(note) => {
            setEditingNote(note);
            setModalOpen(true);
          }}
          onDelete={deleteNote}
        />
      ) : null}
      {activeTab === "documents" ? <DocumentsView /> : null}

      {modalOpen && editingNote ? (
        <NoteModal
          note={editingNote}
          onClose={() => {
            setModalOpen(false);
            setEditingNote(null);
          }}
          onSave={saveNote}
        />
      ) : null}
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof CalendarDays;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-200 p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-lg font-semibold text-gray-950">{value}</p>
        <p className="mt-0.5 text-xs text-gray-500">{detail}</p>
      </div>
    </div>
  );
}

function AgendaView({ onAddNote }: { onAddNote: (eventId: string) => void }) {
  const [statusFilter, setStatusFilter] = useState("Semua");
  const visibleEvents = events.filter((event) => statusFilter === "Semua" || event.state === statusFilter);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-950">Agenda dan movement</h2>
          <p className="mt-1 text-xs text-gray-500">Perubahan harga dihitung sejak tanggal pengumuman.</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
          Status
          <select
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option>Semua</option>
            <option>Mendatang</option>
            <option>Selesai</option>
          </select>
        </label>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Emiten</th>
              <th className="px-4 py-3">Agenda</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Movement</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleEvents.map((event) => (
              <AgendaRow key={event.id} event={event} onAddNote={onAddNote} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-gray-200 md:hidden">
        {visibleEvents.map((event) => (
          <AgendaCard key={event.id} event={event} onAddNote={onAddNote} />
        ))}
      </div>
    </div>
  );
}

function AgendaRow({ event, onAddNote }: { event: CorporateActionEvent; onAddNote: (eventId: string) => void }) {
  const movement = movementPercent(event);
  return (
    <tr className="align-top hover:bg-gray-50">
      <td className="px-4 py-4">
        <Link href={`/stocks/${event.ticker}`} className="font-semibold text-red-700 hover:underline">
          {event.ticker}
        </Link>
        <p className="mt-1 max-w-48 text-xs leading-5 text-gray-500">{event.company}</p>
      </td>
      <td className="px-4 py-4">
        <span className="font-semibold text-gray-900">{event.type}</span>
        <p className="mt-1 max-w-sm text-xs leading-5 text-gray-600">{event.topic}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-gray-700">{event.displayDate}</td>
      <td className="px-4 py-4">
        <MovementValue movement={movement} />
        <p className="mt-1 whitespace-nowrap text-xs text-gray-500">
          {formatCurrency(event.announcementPrice)} → {formatCurrency(event.currentPrice)}
        </p>
      </td>
      <td className="px-4 py-4">
        <span className={cn("rounded px-2 py-1 text-xs font-semibold", event.state === "Mendatang" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700")}>
          {event.state}
        </span>
      </td>
      <td className="px-4 py-4 text-right">
        <button type="button" onClick={() => onAddNote(event.id)} className="text-xs font-semibold text-red-700 hover:underline">
          Tambah catatan
        </button>
      </td>
    </tr>
  );
}

function AgendaCard({ event, onAddNote }: { event: CorporateActionEvent; onAddNote: (eventId: string) => void }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/stocks/${event.ticker}`} className="font-semibold text-red-700 hover:underline">{event.ticker}</Link>
          <p className="mt-1 text-xs text-gray-500">{event.company}</p>
        </div>
        <span className={cn("shrink-0 rounded px-2 py-1 text-xs font-semibold", event.state === "Mendatang" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700")}>{event.state}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-900">{event.type} · {event.displayDate}</p>
      <p className="mt-1 text-sm leading-6 text-gray-600">{event.topic}</p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <MovementValue movement={movementPercent(event)} />
        <button type="button" onClick={() => onAddNote(event.id)} className="text-xs font-semibold text-red-700">Tambah catatan</button>
      </div>
    </div>
  );
}

function MovementValue({ movement }: { movement: number }) {
  const positive = movement >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", positive ? "text-emerald-700" : "text-red-700")}>
      <Icon className="size-4" />
      {positive ? "+" : ""}{movement.toFixed(2)}%
    </span>
  );
}

function TimelineView({ selectedTicker, onTickerChange, events: tickerEvents }: { selectedTicker: string; onTickerChange: (ticker: string) => void; events: CorporateActionEvent[] }) {
  const event = tickerEvents[0] ?? events[0];
  const stages = [
    { title: "Pengumuman", date: "6 Agustus 2026", complete: true, detail: "Emiten menyampaikan rencana corporate action." },
    { title: "Pemanggilan", date: "10 Agustus 2026", complete: true, detail: event.documentLabel },
    { title: "Pelaksanaan", date: event.displayDate, complete: event.state === "Selesai", detail: `${event.type} ${event.ticker}` },
    { title: "Ringkasan hasil", date: event.state === "Selesai" ? "Tersedia" : "Menunggu", complete: event.state === "Selesai", detail: "Keputusan dan pesan utama manajemen." },
    { title: "Tindak lanjut", date: "Belum selesai", complete: false, detail: "Pantau realisasi keputusan dan respons harga." },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-gray-200 bg-white p-4">
        <label className="text-xs font-semibold uppercase text-gray-500" htmlFor="timeline-ticker">Pilih emiten</label>
        <select id="timeline-ticker" className="mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={selectedTicker} onChange={(e) => onTickerChange(e.target.value)}>
          {events.map((item) => <option key={item.id} value={item.ticker}>{item.ticker} · {item.type}</option>)}
        </select>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-950">{event.company}</p>
          <p className="mt-2 text-xs leading-5 text-gray-600">{event.topic}</p>
        </div>
      </aside>

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-950">Timeline {event.ticker}</h2>
            <p className="mt-1 text-xs text-gray-500">Jejak informasi dari pengumuman sampai tindak lanjut.</p>
          </div>
          <Link href={`/stocks/${event.ticker}`} className="flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline">Detail saham <ChevronRight className="size-3.5" /></Link>
        </div>
        <div className="grid gap-0">
          {stages.map((stage, index) => (
            <div key={stage.title} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3">
              <div className="flex flex-col items-center">
                <span className={cn("mt-0.5 flex size-6 items-center justify-center rounded-full border", stage.complete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-300 bg-white text-gray-400")}>
                  {stage.complete ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-3.5" />}
                </span>
                {index < stages.length - 1 ? <span className="min-h-12 w-px flex-1 bg-gray-200" /> : null}
              </div>
              <div className="pb-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-950">{stage.title}</p>
                  <span className="text-xs text-gray-500">{stage.date}</span>
                </div>
                <p className="mt-1 text-sm leading-5 text-gray-600">{stage.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotesView({ notes, onAdd, onEdit, onDelete }: { notes: MeetingNote[]; onAdd: () => void; onEdit: (note: MeetingNote) => void; onDelete: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-950">Pesan penting emiten</h2>
          <p className="mt-1 text-xs text-gray-500">Catatan tersimpan di browser perangkat ini.</p>
        </div>
        <Button type="button" className="h-9 px-3 text-xs" onClick={onAdd}><Plus className="size-4" /> Tambah</Button>
      </div>
      {notes.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <NotebookPen className="mx-auto size-8 text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-900">Belum ada catatan RUPS</p>
          <p className="mt-1 text-sm text-gray-500">Tambahkan pesan manajemen atau hal yang perlu dipantau.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {notes.map((note) => {
            const event = events.find((item) => item.id === note.eventId) ?? events[0];
            return (
              <article key={note.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/stocks/${event.ticker}`} className="font-semibold text-red-700 hover:underline">{event.ticker}</Link>
                      <span className="text-sm font-medium text-gray-700">{event.type}</span>
                      <span className={cn("rounded px-2 py-1 text-xs font-semibold", statusStyle(note.status))}>{note.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Diperbarui {note.updatedAt}</p>
                  </div>
                  <div className="flex gap-1 self-end sm:self-auto">
                    <button type="button" onClick={() => onEdit(note)} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label={`Edit catatan ${event.ticker}`}><Pencil className="size-4" /></button>
                    <button type="button" onClick={() => onDelete(note.id)} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus catatan ${event.ticker}`}><Trash2 className="size-4" /></button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <NoteField label="Pesan manajemen" value={note.keyMessage} />
                  <NoteField label="Keputusan" value={note.decision} />
                  <NoteField label="Tindak lanjut" value={note.followUp} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoteField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-gray-500">{label}</p><p className="mt-1.5 text-sm leading-6 text-gray-700">{value || "Belum diisi"}</p></div>;
}

function DocumentsView() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-950">Dokumen corporate action</h2>
        <p className="mt-1 text-xs text-gray-500">Gunakan sumber resmi untuk memeriksa dokumen sebelum menulis catatan.</p>
      </div>
      <div className="divide-y divide-gray-200">
        {events.map((event) => (
          <div key={event.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:items-center">
            <Link href={`/stocks/${event.ticker}`} className="font-semibold text-red-700 hover:underline">{event.ticker}</Link>
            <div>
              <p className="text-sm font-medium text-gray-900">{event.documentLabel}</p>
              <p className="mt-1 text-xs text-gray-500">{event.type} · {event.displayDate}</p>
            </div>
            <a href="https://www.idx.co.id/id/perusahaan-tercatat/keterbukaan-informasi/" target="_blank" rel="noreferrer" className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto">
              Cari di IDX <ExternalLink className="size-3.5" />
            </a>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        Dokumen dan angka harga pada rancangan awal ini masih berupa data contoh. Pastikan cocokkan dengan keterbukaan resmi emiten.
      </div>
    </div>
  );
}

function NoteModal({ note, onClose, onSave }: { note: MeetingNote; onClose: () => void; onSave: (note: MeetingNote) => void }) {
  const [draft, setDraft] = useState(note);
  const selectedEvent = events.find((event) => event.id === draft.eventId) ?? events[0];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
          <div>
            <h2 id="note-modal-title" className="text-base font-semibold text-gray-950">{note.id ? "Edit catatan RUPS" : "Tambah catatan RUPS"}</h2>
            <p className="mt-1 text-xs text-gray-500">Simpan inti pesan agar mudah ditindaklanjuti.</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label="Tutup modal"><X className="size-5" /></button>
        </div>

        <form className="grid gap-4 p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">
            Agenda emiten
            <select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm" value={draft.eventId} onChange={(event) => setDraft({ ...draft, eventId: event.target.value })}>
              {events.map((item) => <option key={item.id} value={item.id}>{item.ticker} · {item.type} · {item.displayDate}</option>)}
            </select>
          </label>
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">{selectedEvent.topic}</div>
          <TextAreaField label="Pesan utama manajemen" value={draft.keyMessage} onChange={(value) => setDraft({ ...draft, keyMessage: value })} placeholder="Contoh: Manajemen menargetkan pertumbuhan pendapatan..." required />
          <TextAreaField label="Keputusan RUPS" value={draft.decision} onChange={(value) => setDraft({ ...draft, decision: value })} placeholder="Tuliskan keputusan yang paling relevan..." />
          <TextAreaField label="Tindak lanjut pribadi" value={draft.followUp} onChange={(value) => setDraft({ ...draft, followUp: value })} placeholder="Apa yang perlu diperiksa pada laporan atau periode berikutnya?" />
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">
            Status
            <select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as FollowUpStatus })}>
              {(["Belum dibaca", "Perlu dipantau", "Selesai", "Berdampak besar"] as FollowUpStatus[]).map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit">Simpan catatan</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-gray-700">
      {label}
      <textarea className="min-h-24 resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-6" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </label>
  );
}
