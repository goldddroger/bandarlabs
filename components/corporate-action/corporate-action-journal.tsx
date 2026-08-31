"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BellRing, CalendarDays, CheckCircle2, ChevronRight, Clock3, ExternalLink,
  FileText, History, Loader2, NotebookPen, Pencil, Plus, RefreshCw, Trash2,
  TrendingDown, TrendingUp, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  corporateActionNoteStatuses,
  type CorporateActionEvent,
  type CorporateActionNote,
  type CorporateActionNotePayload,
  type CorporateActionQuoteMap,
  type FollowUpStatus,
} from "@/lib/corporate-action";
import { cn } from "@/lib/utils";

type JournalTab = "agenda" | "timeline" | "notes" | "documents";
type WorkspacePayload = { events?: CorporateActionEvent[]; notes?: CorporateActionNote[]; error?: string };

const tabs: Array<{ id: JournalTab; label: string; icon: typeof CalendarDays }> = [
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "timeline", label: "Timeline", icon: History },
  { id: "notes", label: "Catatan RUPS", icon: NotebookPen },
  { id: "documents", label: "Dokumen", icon: FileText },
];

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" })
    .format(new Date(`${value.slice(0, 10)}T00:00:00+07:00`));
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function movementPercent(event: CorporateActionEvent, quote?: CorporateActionQuoteMap[string]) {
  if (!event.announcementPrice || !quote?.price) return null;
  return ((quote.price - event.announcementPrice) / event.announcementPrice) * 100;
}

function noteStatusClass(status: FollowUpStatus) {
  if (status === "Selesai") return "bg-emerald-50 text-emerald-700";
  if (status === "Berdampak besar") return "bg-red-50 text-red-700";
  if (status === "Perlu dipantau") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-700";
}

export function CorporateActionJournal({
  initialEvents,
  initialNotes,
  initialQuotes,
  initialError = null,
}: {
  initialEvents: CorporateActionEvent[];
  initialNotes: CorporateActionNote[];
  initialQuotes: CorporateActionQuoteMap;
  initialError?: string | null;
}) {
  const { confirm, confirmationDialog } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<JournalTab>("agenda");
  const [events, setEvents] = useState<CorporateActionEvent[]>(initialEvents);
  const [notes, setNotes] = useState<CorporateActionNote[]>(initialNotes);
  const [quotes, setQuotes] = useState<CorporateActionQuoteMap>(initialQuotes);
  const [selectedEventId, setSelectedEventId] = useState(initialEvents[0]?.id ?? "");
  const [editingNote, setEditingNote] = useState<CorporateActionNote | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const pendingCount = events.filter((event) => event.state === "Mendatang").length;
  const monitorCount = notes.filter((note) => note.status === "Perlu dipantau" || note.status === "Berdampak besar").length;
  const lastUpdated = [...events.map((event) => event.updatedAt), ...notes.map((note) => note.updatedAt)].filter(Boolean).sort().at(-1) ?? null;

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/corporate-actions", { cache: "no-store" });
      const payload = await response.json() as WorkspacePayload;
      if (!response.ok) throw new Error(payload.error || "Corporate action gagal dimuat.");
      const nextEvents = payload.events ?? [];
      const quoteTickers = Array.from(new Set(nextEvents.map((event) => event.ticker))).filter(Boolean).join(",");
      const quoteResponse = quoteTickers
        ? await fetch(`/api/stock-quotes?tickers=${encodeURIComponent(quoteTickers)}`, { cache: "no-store" })
        : null;
      const quotePayload = quoteResponse?.ok
        ? await quoteResponse.json() as { quotes?: CorporateActionQuoteMap }
        : { quotes: {} };

      setEvents(nextEvents);
      setNotes(payload.notes ?? []);
      setQuotes(quotePayload.quotes ?? {});
      setSelectedEventId((current) => current && nextEvents.some((item) => item.id === current) ? current : nextEvents[0]?.id ?? "");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Corporate action gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  function openNewNote(eventId?: string) {
    if (events.length === 0) return toast.error("Belum ada agenda corporate action di database.");
    setEditingNote({
      id: "",
      eventId: eventId ?? selectedEventId ?? events[0].id,
      keyMessage: "",
      decision: "",
      followUp: "",
      status: "Belum dibaca",
      createdAt: "",
      updatedAt: "",
    });
    setModalOpen(true);
  }

  async function saveNote(payload: CorporateActionNotePayload, id?: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/corporate-actions", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id, ...payload } : payload),
      });
      const result = await response.json() as { note?: CorporateActionNote; error?: string };
      if (!response.ok || !result.note) throw new Error(result.error || "Catatan gagal disimpan.");
      setNotes((current) => id ? current.map((note) => note.id === id ? result.note! : note) : [result.note!, ...current]);
      setModalOpen(false);
      setEditingNote(null);
      toast.success(id ? "Catatan berhasil diperbarui." : "Catatan berhasil disimpan ke database.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Catatan gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(note: CorporateActionNote) {
    const relatedEvent = events.find((event) => event.id === note.eventId);
    const confirmed = await confirm({
      title: "Hapus catatan corporate action?",
      description: "Pesan manajemen, keputusan, dan tindak lanjut akan dihapus dari database.",
      subject: relatedEvent ? `${relatedEvent.ticker} · ${relatedEvent.actionType}` : "Catatan corporate action",
      confirmLabel: "Hapus Catatan",
    });
    if (!confirmed) return;
    try {
      const response = await fetch("/api/corporate-actions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Catatan gagal dihapus.");
      setNotes((current) => current.filter((item) => item.id !== note.id));
      toast.success("Catatan berhasil dihapus.");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Catatan gagal dihapus.");
    }
  }

  async function deleteEvent(event: CorporateActionEvent) {
    const relatedNotes = notes.filter((note) => note.eventId === event.id).length;
    const confirmed = await confirm({
      title: "Hapus agenda corporate action?",
      description: relatedNotes > 0
        ? `Agenda dan ${relatedNotes} catatan terkait akan dihapus permanen dari database.`
        : "Agenda ini akan dihapus permanen dari database.",
      subject: `${event.ticker} · ${event.actionType} · ${formatDate(event.eventDate)}`,
      confirmLabel: "Hapus Agenda",
    });
    if (!confirmed) return;

    try {
      const response = await fetch("/api/corporate-actions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, resource: "event" }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Agenda gagal dihapus.");

      const nextEvents = events.filter((item) => item.id !== event.id);
      setEvents(nextEvents);
      setNotes((current) => current.filter((note) => note.eventId !== event.id));
      setSelectedEventId((current) => current === event.id ? nextEvents[0]?.id ?? "" : current);
      toast.success(`Agenda ${event.ticker} berhasil dihapus.`);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Agenda gagal dihapus.");
    }
  }

  if (loading) {
    return <div className="flex min-h-[55vh] items-center justify-center text-sm text-gray-500"><Loader2 className="mr-2 size-5 animate-spin text-red-600" />Menyinkronkan corporate action...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-5 text-center">
        <CalendarDays className="size-10 text-gray-300" />
        <h1 className="mt-4 text-lg font-semibold text-gray-950">Corporate action belum tersinkron</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">{error}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={reload}><RefreshCw className="size-4" />Coba Lagi</Button>
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm text-gray-500">Corporate Action</p>
          <h1 className="text-2xl font-semibold text-gray-950">Corporate Action Journal</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">Pantau agenda dari database dan simpan pesan penting manajemen per emiten.</p>
        </div>
        <Button className="w-full lg:w-auto" type="button" onClick={() => openNewNote()} disabled={events.length === 0}><Plus className="size-4" />Tambah catatan</Button>
      </header>

      <div className="mb-5 grid overflow-hidden rounded-lg border border-gray-200 bg-white sm:grid-cols-3">
        <SummaryMetric label="Agenda mendatang" value={String(pendingCount)} detail={`${events.length} agenda tersinkron`} icon={CalendarDays} />
        <SummaryMetric label="Perlu ditindaklanjuti" value={String(monitorCount)} detail={`${notes.length} catatan database`} icon={BellRing} />
        <SummaryMetric label="Pembaruan terakhir" value={lastUpdated ? formatDateTime(lastUpdated) : "Belum ada"} detail="Supabase dan live quote" icon={Clock3} />
      </div>

      <div className="mb-5 overflow-x-auto border-b border-gray-200">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Corporate Action Journal">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium", activeTab === tab.id ? "border-red-600 text-red-700" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900")}>
                <Icon className="size-4" />{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "agenda" ? <AgendaView events={events} quotes={quotes} onAddNote={openNewNote} onDeleteEvent={deleteEvent} /> : null}
      {activeTab === "timeline" ? <TimelineView events={events} selectedEventId={selectedEventId} onEventChange={setSelectedEventId} /> : null}
      {activeTab === "notes" ? <NotesView events={events} notes={notes} onAdd={() => openNewNote()} onEdit={(note) => { setEditingNote(note); setModalOpen(true); }} onDelete={deleteNote} /> : null}
      {activeTab === "documents" ? <DocumentsView events={events} /> : null}

      {modalOpen && editingNote ? <NoteModal note={editingNote} events={events} saving={saving} onClose={() => { if (!saving) { setModalOpen(false); setEditingNote(null); } }} onSave={saveNote} /> : null}
      {confirmationDialog}
    </section>
  );
}

function SummaryMetric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof CalendarDays }) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-b border-gray-200 p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700"><Icon className="size-4" /></span>
      <div className="min-w-0"><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-1 truncate text-base font-semibold text-gray-950">{value}</p><p className="mt-0.5 text-xs text-gray-500">{detail}</p></div>
    </div>
  );
}

function AgendaView({ events, quotes, onAddNote, onDeleteEvent }: { events: CorporateActionEvent[]; quotes: CorporateActionQuoteMap; onAddNote: (eventId: string) => void; onDeleteEvent: (event: CorporateActionEvent) => void }) {
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [query, setQuery] = useState("");
  const visibleEvents = events.filter((event) =>
    (statusFilter === "Semua" || event.state === statusFilter)
    && `${event.ticker} ${event.company} ${event.actionType}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 className="text-sm font-semibold text-gray-950">Agenda dan movement</h2><p className="mt-1 text-xs text-gray-500">Movement dari harga pengumuman database ke harga Yahoo Finance terbaru.</p></div>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_150px]">
          <input className="h-9 rounded-md border border-gray-300 px-3 text-sm" placeholder="Cari ticker atau emiten..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Semua</option><option>Mendatang</option><option>Selesai</option></select>
        </div>
      </div>
      {visibleEvents.length === 0 ? <EmptyState text="Tidak ada agenda yang cocok dengan filter." /> : null}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500"><tr><th className="px-4 py-3">Emiten</th><th className="px-4 py-3">Agenda</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Movement</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
          <tbody className="divide-y divide-gray-100">{visibleEvents.map((event) => <AgendaRow key={event.id} event={event} quote={quotes[event.ticker]} onAddNote={onAddNote} onDeleteEvent={onDeleteEvent} />)}</tbody>
        </table>
      </div>
      <div className="divide-y divide-gray-200 md:hidden">{visibleEvents.map((event) => <AgendaCard key={event.id} event={event} quote={quotes[event.ticker]} onAddNote={onAddNote} onDeleteEvent={onDeleteEvent} />)}</div>
    </div>
  );
}

function AgendaRow({ event, quote, onAddNote, onDeleteEvent }: { event: CorporateActionEvent; quote?: CorporateActionQuoteMap[string]; onAddNote: (eventId: string) => void; onDeleteEvent: (event: CorporateActionEvent) => void }) {
  return (
    <tr className="align-top hover:bg-gray-50">
      <td className="px-4 py-4"><Link href={`/stocks/${event.ticker}`} className="font-semibold text-red-700 hover:underline">{event.ticker}</Link><p className="mt-1 max-w-48 text-xs leading-5 text-gray-500">{event.company}</p></td>
      <td className="px-4 py-4"><span className="font-semibold text-gray-900">{event.actionType}</span><p className="mt-1 max-w-sm text-xs leading-5 text-gray-600">{event.topic}</p></td>
      <td className="whitespace-nowrap px-4 py-4 text-gray-700">{formatDate(event.eventDate)}</td>
      <td className="px-4 py-4"><MovementValue movement={movementPercent(event, quote)} /><p className="mt-1 whitespace-nowrap text-xs text-gray-500">{formatCurrency(event.announcementPrice)} → {formatCurrency(quote?.price ?? null)}</p><p className="mt-0.5 text-[11px] text-gray-400">{quote?.source ?? "Menunggu quote"}</p></td>
      <td className="px-4 py-4"><StateBadge state={event.state} /></td>
      <td className="px-4 py-4"><div className="flex items-center justify-end gap-1"><button type="button" onClick={() => onAddNote(event.id)} className="h-8 rounded-md px-2 text-xs font-semibold text-red-700 hover:bg-red-50">Tambah catatan</button><button type="button" onClick={() => onDeleteEvent(event)} className="flex size-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus agenda ${event.ticker}`} title="Hapus agenda"><Trash2 className="size-4" /></button></div></td>
    </tr>
  );
}

function AgendaCard({ event, quote, onAddNote, onDeleteEvent }: { event: CorporateActionEvent; quote?: CorporateActionQuoteMap[string]; onAddNote: (eventId: string) => void; onDeleteEvent: (event: CorporateActionEvent) => void }) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3"><div><Link href={`/stocks/${event.ticker}`} className="font-semibold text-red-700 hover:underline">{event.ticker}</Link><p className="mt-1 text-xs text-gray-500">{event.company}</p></div><StateBadge state={event.state} /></div>
      <p className="mt-3 text-sm font-semibold text-gray-900">{event.actionType} · {formatDate(event.eventDate)}</p>
      <p className="mt-1 text-sm leading-6 text-gray-600">{event.topic}</p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3"><MovementValue movement={movementPercent(event, quote)} /><div className="flex items-center gap-1"><button type="button" onClick={() => onAddNote(event.id)} className="h-8 rounded-md px-2 text-xs font-semibold text-red-700 hover:bg-red-50">Tambah catatan</button><button type="button" onClick={() => onDeleteEvent(event)} className="flex size-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus agenda ${event.ticker}`}><Trash2 className="size-4" /></button></div></div>
    </article>
  );
}

function StateBadge({ state }: { state: CorporateActionEvent["state"] }) {
  return <span className={cn("shrink-0 rounded px-2 py-1 text-xs font-semibold", state === "Mendatang" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700")}>{state}</span>;
}

function MovementValue({ movement }: { movement: number | null }) {
  if (movement === null) return <span className="text-xs font-medium text-gray-400">Belum tersedia</span>;
  const positive = movement >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", positive ? "text-emerald-700" : "text-red-700")}><Icon className="size-4" />{positive ? "+" : ""}{movement.toFixed(2)}%</span>;
}

function TimelineView({ events, selectedEventId, onEventChange }: { events: CorporateActionEvent[]; selectedEventId: string; onEventChange: (id: string) => void }) {
  const event = events.find((item) => item.id === selectedEventId) ?? events[0];
  if (!event) return <EmptyState text="Belum ada agenda corporate action di database." />;
  const stages = [
    { title: "Publikasi", date: event.publishedAt ? formatDateTime(event.publishedAt) : "Belum dicatat", complete: Boolean(event.publishedAt), detail: event.documentLabel },
    { title: "Pelaksanaan", date: formatDate(event.eventDate), complete: event.state === "Selesai", detail: `${event.actionType} ${event.ticker}` },
    { title: "Dampak", date: event.impact ? "Tercatat" : "Belum dicatat", complete: Boolean(event.impact), detail: event.impact || "Dampak belum diisi pada database." },
    { title: "Tindak lanjut", date: event.state === "Selesai" ? "Evaluasi" : "Menunggu", complete: false, detail: "Gunakan catatan emiten untuk menyimpan tindak lanjut pribadi." },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-gray-200 bg-white p-4">
        <label className="text-xs font-semibold uppercase text-gray-500" htmlFor="timeline-event">Pilih agenda</label>
        <select id="timeline-event" className="mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={event.id} onChange={(changeEvent) => onEventChange(changeEvent.target.value)}>{events.map((item) => <option key={item.id} value={item.id}>{item.ticker} · {item.actionType}</option>)}</select>
        <div className="mt-4 border-t border-gray-100 pt-4"><p className="text-sm font-semibold text-gray-950">{event.company}</p><p className="mt-2 text-xs leading-5 text-gray-600">{event.topic}</p></div>
      </aside>
      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-gray-950">Timeline {event.ticker}</h2><p className="mt-1 text-xs text-gray-500">Jejak berdasarkan data corporate action.</p></div><Link href={`/stocks/${event.ticker}`} className="flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline">Detail saham <ChevronRight className="size-3.5" /></Link></div>
        {stages.map((stage, index) => (
          <div key={stage.title} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3">
            <div className="flex flex-col items-center"><span className={cn("mt-0.5 flex size-6 items-center justify-center rounded-full border", stage.complete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-300 bg-white text-gray-400")}>{stage.complete ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-3.5" />}</span>{index < stages.length - 1 ? <span className="min-h-12 w-px flex-1 bg-gray-200" /> : null}</div>
            <div className="pb-6"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-gray-950">{stage.title}</p><span className="text-xs text-gray-500">{stage.date}</span></div><p className="mt-1 text-sm leading-5 text-gray-600">{stage.detail}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesView({ events, notes, onAdd, onEdit, onDelete }: { events: CorporateActionEvent[]; notes: CorporateActionNote[]; onAdd: () => void; onEdit: (note: CorporateActionNote) => void; onDelete: (note: CorporateActionNote) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3"><div><h2 className="text-sm font-semibold text-gray-950">Pesan penting emiten</h2><p className="mt-1 text-xs text-gray-500">Tersimpan di Supabase dan tersedia pada setiap perangkat.</p></div><Button type="button" className="h-9 px-3 text-xs" onClick={onAdd}><Plus className="size-4" />Tambah</Button></div>
      {notes.length === 0 ? <EmptyState text="Belum ada catatan. Pilih agenda emiten untuk mulai mencatat." /> : (
        <div className="divide-y divide-gray-200">
          {notes.map((note) => {
            const event = events.find((item) => item.id === note.eventId);
            return (
              <article key={note.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><div className="flex flex-wrap items-center gap-2">{event ? <Link href={`/stocks/${event.ticker}`} className="font-semibold text-red-700 hover:underline">{event.ticker}</Link> : <span className="font-semibold text-gray-700">Agenda dihapus</span>}<span className="text-sm font-medium text-gray-700">{event?.actionType}</span><span className={cn("rounded px-2 py-1 text-xs font-semibold", noteStatusClass(note.status))}>{note.status}</span></div><p className="mt-1 text-xs text-gray-500">Diperbarui {formatDateTime(note.updatedAt)}</p></div>
                  <div className="flex gap-1 self-end sm:self-auto"><button type="button" onClick={() => onEdit(note)} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label={`Edit catatan ${event?.ticker ?? "emiten"}`}><Pencil className="size-4" /></button><button type="button" onClick={() => onDelete(note)} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus catatan ${event?.ticker ?? "emiten"}`}><Trash2 className="size-4" /></button></div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-3"><NoteField label="Pesan manajemen" value={note.keyMessage} /><NoteField label="Keputusan" value={note.decision} /><NoteField label="Tindak lanjut" value={note.followUp} /></div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoteField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-gray-500">{label}</p><p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-gray-700">{value || "Belum diisi"}</p></div>;
}

function DocumentsView({ events }: { events: CorporateActionEvent[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-semibold text-gray-950">Dokumen corporate action</h2><p className="mt-1 text-xs text-gray-500">Metadata dari database; dokumen resmi tetap diperiksa melalui IDX.</p></div>
      {events.length === 0 ? <EmptyState text="Belum ada dokumen corporate action di database." /> : <div className="divide-y divide-gray-200">{events.map((event) => <div key={event.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:items-center"><Link href={`/stocks/${event.ticker}`} className="font-semibold text-red-700 hover:underline">{event.ticker}</Link><div><p className="text-sm font-medium text-gray-900">{event.documentLabel}</p><p className="mt-1 text-xs text-gray-500">{event.actionType} · {formatDate(event.eventDate)}{event.documentNumber ? ` · ${event.documentNumber}` : ""}</p></div><a href="https://www.idx.co.id/id/perusahaan-tercatat/keterbukaan-informasi/" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">Cari di IDX <ExternalLink className="size-3.5" /></a></div>)}</div>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-5 py-12 text-center"><NotebookPen className="mx-auto size-8 text-gray-300" /><p className="mt-3 text-sm text-gray-500">{text}</p></div>;
}

function NoteModal({ note, events, saving, onClose, onSave }: { note: CorporateActionNote; events: CorporateActionEvent[]; saving: boolean; onClose: () => void; onSave: (payload: CorporateActionNotePayload, id?: string) => void }) {
  const [draft, setDraft] = useState<CorporateActionNotePayload>({ eventId: note.eventId, keyMessage: note.keyMessage, decision: note.decision, followUp: note.followUp, status: note.status });
  const selectedEvent = events.find((event) => event.id === draft.eventId);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/50 p-3 sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-5"><div><h2 id="note-modal-title" className="text-base font-semibold text-gray-950">{note.id ? "Edit catatan emiten" : "Tambah catatan emiten"}</h2><p className="mt-1 text-xs text-gray-500">Catatan akan disimpan ke database BandarLab.</p></div><button type="button" onClick={onClose} disabled={saving} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label="Tutup modal"><X className="size-5" /></button></div>
        <form className="grid gap-4 p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); onSave(draft, note.id || undefined); }}>
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">Agenda emiten<select className="h-11 min-w-0 rounded-md border border-gray-300 bg-white px-3 text-sm" value={draft.eventId} onChange={(event) => setDraft({ ...draft, eventId: event.target.value })}>{events.map((item) => <option key={item.id} value={item.id}>{item.ticker} · {item.actionType} · {formatDate(item.eventDate)}</option>)}</select></label>
          {selectedEvent ? <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">{selectedEvent.topic}</div> : null}
          <TextAreaField label="Pesan utama manajemen" value={draft.keyMessage} onChange={(value) => setDraft({ ...draft, keyMessage: value })} placeholder="Apa pesan utama yang disampaikan emiten?" required />
          <TextAreaField label="Keputusan" value={draft.decision} onChange={(value) => setDraft({ ...draft, decision: value })} placeholder="Tuliskan keputusan RUPS atau hasil public expose..." />
          <TextAreaField label="Tindak lanjut pribadi" value={draft.followUp} onChange={(value) => setDraft({ ...draft, followUp: value })} placeholder="Apa yang perlu dipantau setelah agenda ini?" />
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">Status<select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as FollowUpStatus })}>{corporateActionNoteStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Batal</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : null}{saving ? "Menyimpan..." : "Simpan catatan"}</Button></div>
        </form>
      </div>
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
  return <label className="grid gap-1.5 text-sm font-medium text-gray-700">{label}<textarea className="min-h-24 min-w-0 resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-6" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} maxLength={8000} /></label>;
}
