"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarClock, CheckCircle2, Loader2, NotebookPen, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { stockCaResearchChangeEvent, stockCaResearchStatuses, type StockCaResearchNote, type StockCaResearchPayload, type StockCaResearchStatus } from "@/lib/stock-ca-research";
import { cn } from "@/lib/utils";

const actionTypes = ["RUPST", "RUPSLB", "Public Expose", "Dividen", "Right Issue", "Stock Split", "Akuisisi", "Lainnya"];

function jakartaDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function formatDate(value: string | null) {
  if (!value) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`));
}

function isDue(note: StockCaResearchNote) {
  return note.status !== "Selesai" && note.reminderDate <= jakartaDate();
}

function emptyNote(ticker: string): StockCaResearchNote {
  return { id: "", ticker, actionType: "RUPST", title: "", researchNote: "", eventDate: null, reminderDate: jakartaDate(), status: "Rencana", createdAt: "", updatedAt: "" };
}

export function StockCaResearchNotes({ ticker }: { ticker: string }) {
  const { confirm, confirmationDialog } = useConfirmDialog();
  const [notes, setNotes] = useState<StockCaResearchNote[]>([]);
  const [editing, setEditing] = useState<StockCaResearchNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/stock-ca-research?ticker=${encodeURIComponent(ticker)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { notes?: StockCaResearchNote[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Research note gagal dimuat.");
        setNotes(payload.notes ?? []);
        setError(null);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Research note gagal dimuat.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reloadKey, ticker]);

  async function saveNote(payload: StockCaResearchPayload, id?: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/stock-ca-research", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id, ...payload } : payload) });
      const result = await response.json() as { note?: StockCaResearchNote; error?: string };
      if (!response.ok || !result.note) throw new Error(result.error || "Research note gagal disimpan.");
      setNotes((current) => id ? current.map((note) => note.id === id ? result.note! : note) : [...current, result.note!].sort((a, b) => a.reminderDate.localeCompare(b.reminderDate)));
      window.dispatchEvent(new Event(stockCaResearchChangeEvent));
      setEditing(null);
      toast.success(id ? "Research note diperbarui." : "Research note dan reminder disimpan.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Research note gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(note: StockCaResearchNote) {
    const confirmed = await confirm({ title: "Hapus research note?", description: "Catatan dan reminder corporate action ini akan dihapus dari database.", subject: `${ticker} · ${note.title}`, confirmLabel: "Hapus Catatan" });
    if (!confirmed) return;
    try {
      const response = await fetch("/api/stock-ca-research", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: note.id }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Research note gagal dihapus.");
      setNotes((current) => current.filter((item) => item.id !== note.id));
      window.dispatchEvent(new Event(stockCaResearchChangeEvent));
      toast.success("Research note dihapus.");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Research note gagal dihapus.");
    }
  }

  const dueCount = notes.filter(isDue).length;
  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-gray-950">Research Corporate Action</h3>{dueCount > 0 ? <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">{dueCount} reminder jatuh tempo</span> : null}</div>
          <p className="mt-1 text-xs text-gray-500">Catat agenda yang sudah diriset dan tentukan kapan harus diperiksa kembali.</p>
        </div>
        <Button type="button" className="h-9 w-full px-3 text-xs sm:w-auto" onClick={() => setEditing(emptyNote(ticker))}><Plus className="size-4" />Tambah research</Button>
      </div>

      {loading ? <div className="flex min-h-36 items-center justify-center text-sm text-gray-500"><Loader2 className="mr-2 size-5 animate-spin text-red-600" />Memuat research note...</div> : null}
      {!loading && error ? <div className="flex min-h-36 flex-col items-center justify-center px-5 text-center"><p className="text-sm font-semibold text-gray-900">Research note belum tersinkron</p><p className="mt-1 text-xs text-gray-500">{error}</p><Button type="button" variant="outline" className="mt-3 h-9" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }}><RefreshCw className="size-4" />Coba Lagi</Button></div> : null}
      {!loading && !error && notes.length === 0 ? <div className="px-5 py-10 text-center"><NotebookPen className="mx-auto size-8 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-900">Belum ada research corporate action {ticker}</p><p className="mt-1 text-sm text-gray-500">Tambahkan thesis, hasil riset, dan tanggal reminder.</p></div> : null}
      {!loading && !error && notes.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {notes.map((note) => {
            const due = isDue(note);
            return (
              <article key={note.id} className={cn("p-4 sm:p-5", due && "bg-red-50/35")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">{note.actionType}</span><span className={cn("rounded px-2 py-1 text-xs font-semibold", note.status === "Selesai" ? "bg-emerald-50 text-emerald-700" : note.status === "Sedang diriset" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700")}>{note.status}</span>{due ? <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700"><BellRing className="size-3" />Perlu dicek</span> : null}</div><h4 className="mt-2 text-sm font-semibold text-gray-950">{note.title}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{note.researchNote || "Belum ada isi research."}</p></div>
                  <div className="flex shrink-0 gap-1 self-end sm:self-auto"><button type="button" onClick={() => setEditing(note)} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label={`Edit ${note.title}`}><Pencil className="size-4" /></button><button type="button" onClick={() => deleteNote(note)} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus ${note.title}`}><Trash2 className="size-4" /></button></div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2"><DateValue icon={CalendarClock} label="Tanggal agenda" value={formatDate(note.eventDate)} /><DateValue icon={due ? BellRing : CheckCircle2} label="Reminder" value={formatDate(note.reminderDate)} tone={due ? "danger" : undefined} /></div>
              </article>
            );
          })}
        </div>
      ) : null}
      {editing ? <ResearchModal note={editing} saving={saving} onClose={() => { if (!saving) setEditing(null); }} onSave={saveNote} /> : null}
      {confirmationDialog}
    </div>
  );
}

function DateValue({ icon: Icon, label, value, tone }: { icon: typeof CalendarClock; label: string; value: string; tone?: "danger" }) {
  return <div className={cn("flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2", tone === "danger" && "border-red-100 bg-red-50")}><Icon className={cn("size-4 text-gray-400", tone === "danger" && "text-red-600")} /><span><span className="block text-[10px] font-semibold uppercase text-gray-400">{label}</span><span className={cn("block text-xs font-medium text-gray-700", tone === "danger" && "text-red-700")}>{value}</span></span></div>;
}

function ResearchModal({ note, saving, onClose, onSave }: { note: StockCaResearchNote; saving: boolean; onClose: () => void; onSave: (payload: StockCaResearchPayload, id?: string) => void }) {
  const [draft, setDraft] = useState<StockCaResearchPayload>({ ticker: note.ticker, actionType: note.actionType, title: note.title, researchNote: note.researchNote, eventDate: note.eventDate, reminderDate: note.reminderDate, status: note.status });
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/50 p-3 sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="research-modal-title">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-5"><div><h2 id="research-modal-title" className="text-base font-semibold text-gray-950">{note.id ? "Edit research corporate action" : "Tambah research corporate action"}</h2><p className="mt-1 text-xs text-gray-500">{note.ticker} · simpan catatan dan reminder.</p></div><button type="button" disabled={saving} onClick={onClose} className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label="Tutup modal"><X className="size-5" /></button></div>
        <form className="grid gap-4 p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); onSave(draft, note.id || undefined); }}>
          <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Jenis corporate action" value={draft.actionType} options={actionTypes} onChange={(value) => setDraft({ ...draft, actionType: value })} /><SelectField label="Status research" value={draft.status} options={[...stockCaResearchStatuses]} onChange={(value) => setDraft({ ...draft, status: value as StockCaResearchStatus })} /></div>
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">Judul research<input required maxLength={200} className="h-11 min-w-0 rounded-md border border-gray-300 px-3 text-sm" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Contoh: Pantau hasil RUPSLB dan perubahan direksi" /></label>
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">Catatan research<textarea maxLength={12000} className="min-h-32 min-w-0 resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-6" value={draft.researchNote} onChange={(event) => setDraft({ ...draft, researchNote: event.target.value })} placeholder="Thesis, pertanyaan untuk manajemen, risiko, dan hasil riset..." /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-gray-700">Tanggal agenda<input type="date" className="h-11 min-w-0 rounded-md border border-gray-300 px-3 text-sm" value={draft.eventDate ?? ""} onChange={(event) => setDraft({ ...draft, eventDate: event.target.value || null })} /></label><label className="grid gap-1.5 text-sm font-medium text-gray-700">Tanggal reminder<input required type="date" className="h-11 min-w-0 rounded-md border border-gray-300 px-3 text-sm" value={draft.reminderDate} onChange={(event) => setDraft({ ...draft, reminderDate: event.target.value })} /></label></div>
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Batal</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : null}{saving ? "Menyimpan..." : "Simpan research"}</Button></div>
        </form>
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="grid gap-1.5 text-sm font-medium text-gray-700">{label}<select className="h-11 min-w-0 rounded-md border border-gray-300 bg-white px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
