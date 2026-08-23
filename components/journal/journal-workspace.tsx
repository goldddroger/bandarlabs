"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, CalendarDays, Edit3, FileImage, ImagePlus, Loader2, NotebookPen, Pin, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { journalCategories, type JournalCategory, type JournalEntry, type JournalPayload } from "@/lib/journal";
import { cn } from "@/lib/utils";

const emptyPayload = (): JournalPayload => ({
  title: "",
  content: "",
  source_name: "",
  category: "Pelajaran",
  ticker_symbols: [],
  tags: [],
  journal_date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
  pinned: false,
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function categoryClass(category: JournalCategory) {
  const values: Record<JournalCategory, string> = {
    Pelajaran: "bg-blue-50 text-blue-700",
    Observasi: "bg-gray-100 text-gray-700",
    Thesis: "bg-purple-50 text-purple-700",
    Kesalahan: "bg-red-50 text-red-700",
    Mentoring: "bg-green-50 text-green-700",
  };
  return values[category];
}

export function JournalWorkspace() {
  const { confirm, confirmationDialog } = useConfirmDialog();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | JournalCategory>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payload, setPayload] = useState<JournalPayload>(emptyPayload);
  const [tickerText, setTickerText] = useState("");
  const [tagText, setTagText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null;
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (!term) return true;
      return [entry.title, entry.content, entry.source_name, ...entry.tags, ...entry.ticker_symbols].join(" ").toLowerCase().includes(term);
    });
  }, [category, entries, search]);
  const sources = new Set(entries.map((entry) => entry.source_name).filter(Boolean)).size;

  useEffect(() => {
    if (!editorOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [editorOpen]);

  async function api(path: string, options?: RequestInit) {
    return fetch(path, options);
  }

  const loadEntries = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await api("/api/journal");
      const result = await response.json() as { entries?: JournalEntry[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Jurnal gagal dimuat.");
      const nextEntries = result.entries ?? [];
      setEntries(nextEntries);
      setSelectedId((current) => current && nextEntries.some((entry) => entry.id === current) ? current : nextEntries[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Jurnal gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadEntries(false), 0);
    return () => window.clearTimeout(timeout);
  }, [loadEntries]);

  function openEditor(entry?: JournalEntry) {
    if (entry) {
      setEditingId(entry.id);
      setPayload({ title: entry.title, content: entry.content, source_name: entry.source_name, category: entry.category, ticker_symbols: entry.ticker_symbols, tags: entry.tags, journal_date: entry.journal_date, pinned: entry.pinned });
      setTickerText(entry.ticker_symbols.join(", "));
      setTagText(entry.tags.join(", "));
    } else {
      setEditingId(null);
      setPayload(emptyPayload());
      setTickerText("");
      setTagText("");
    }
    setFiles([]);
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) return;
    setEditorOpen(false);
    setFiles([]);
  }

  function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const accepted = selectedFiles.filter((file) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) && file.size <= 8 * 1024 * 1024);
    if (accepted.length !== selectedFiles.length) toast.error("Sebagian file ditolak. Gunakan gambar maksimal 8 MB.");
    setFiles((current) => [...current, ...accepted].slice(0, 5));
    event.target.value = "";
  }

  async function saveEntry(event: FormEvent) {
    event.preventDefault();
    if (!payload.title.trim()) return;
    setSaving(true);
    const normalized: JournalPayload = {
      ...payload,
      title: payload.title.trim(),
      content: payload.content.trim(),
      source_name: payload.source_name.trim(),
      ticker_symbols: Array.from(new Set(tickerText.split(/[,\s]+/).map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))),
      tags: Array.from(new Set(tagText.split(",").map((tag) => tag.trim()).filter(Boolean))),
    };
    try {
      const response = await api("/api/journal", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...normalized } : normalized),
      });
      const result = await response.json() as { entry?: JournalEntry; error?: string };
      if (!response.ok) throw new Error(result.error || "Jurnal gagal disimpan.");
      const entryId = editingId ?? result.entry?.id;
      if (!entryId) throw new Error("ID jurnal tidak diterima server.");

      for (const file of files) {
        const form = new FormData();
        form.append("entryId", entryId);
        form.append("file", file);
        const uploadResponse = await api("/api/journal/upload", { method: "POST", body: form });
        const uploadResult = await uploadResponse.json() as { error?: string };
        if (!uploadResponse.ok) throw new Error(uploadResult.error || `Gambar ${file.name} gagal diunggah.`);
      }

      await loadEntries();
      setSelectedId(entryId);
      setEditorOpen(false);
      setFiles([]);
      toast.success(editingId ? "Jurnal berhasil diperbarui." : "Jurnal berhasil disimpan.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Jurnal gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entry: JournalEntry) {
    const confirmed = await confirm({
      title: "Hapus jurnal?",
      description: "Catatan dan seluruh gambar di dalamnya akan dihapus permanen dari Supabase.",
      subject: entry.title,
      confirmLabel: "Hapus Jurnal",
    });
    if (!confirmed) return;
    const response = await api("/api/journal", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) return toast.error(result.error || "Jurnal gagal dihapus.");
    await loadEntries();
    toast.success("Jurnal berhasil dihapus.");
  }

  async function deleteAttachment(entry: JournalEntry, attachmentId: string) {
    const attachment = entry.journal_attachments.find((item) => item.id === attachmentId);
    const confirmed = await confirm({
      title: "Hapus gambar?",
      description: "Gambar akan dihapus permanen dari lampiran jurnal dan Supabase Storage.",
      subject: attachment?.file_name ?? "Lampiran gambar",
      confirmLabel: "Hapus Gambar",
    });
    if (!confirmed) return;
    const response = await api("/api/journal", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id, attachmentId }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) return toast.error(result.error || "Gambar gagal dihapus.");
    await loadEntries();
    toast.success("Gambar dihapus.");
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-gray-500">BandarLab</p><h1 className="mt-1 text-2xl font-semibold text-gray-950">Jurnal Riset</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Catatan pembelajaran, observasi pasar, thesis, dan diskusi mentor.</p></div>
        <Button type="button" onClick={() => openEditor()}><Plus className="size-4" />Tulis Jurnal</Button>
      </header>

      {error ? <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-gray-200 p-4"><p className="text-xs font-semibold uppercase text-gray-500">Total Catatan</p><p className="mt-2 text-2xl font-semibold text-gray-950">{entries.length}</p></div>
        <div className="rounded-md border border-gray-200 p-4"><p className="text-xs font-semibold uppercase text-gray-500">Sumber & Mentor</p><p className="mt-2 text-2xl font-semibold text-gray-950">{sources}</p></div>
        <div className="rounded-md border border-gray-200 p-4"><p className="text-xs font-semibold uppercase text-gray-500">Lampiran Gambar</p><p className="mt-2 text-2xl font-semibold text-gray-950">{entries.reduce((total, entry) => total + entry.journal_attachments.length, 0)}</p></div>
      </div>

      <div className="mt-5 grid min-h-[620px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-b border-gray-200 lg:border-b-0 lg:border-r">
          <div className="grid gap-2 border-b border-gray-200 p-3 sm:grid-cols-[1fr_160px] lg:grid-cols-1">
            <label className="relative"><span className="sr-only">Cari jurnal</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari catatan, mentor, ticker..." className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm" /></label>
            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"><option value="all">Semua kategori</option>{journalCategories.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          </div>
          <div className="max-h-[520px] overflow-y-auto lg:max-h-[680px]">
            {loading ? <div className="flex items-center justify-center p-10 text-gray-500"><Loader2 className="size-5 animate-spin" /></div> : filtered.length === 0 ? <div className="p-8 text-center"><NotebookPen className="mx-auto size-8 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-800">Belum ada catatan</p><p className="mt-1 text-xs text-gray-500">Mulai dari insight yang ingin kamu ingat.</p></div> : filtered.map((entry) => (
              <button key={entry.id} type="button" onClick={() => setSelectedId(entry.id)} className={cn("w-full border-b border-gray-100 p-4 text-left hover:bg-gray-50", selected?.id === entry.id && "bg-red-50/60")}>
                <div className="flex items-start justify-between gap-2"><span className={cn("rounded px-2 py-1 text-[11px] font-semibold", categoryClass(entry.category))}>{entry.category}</span>{entry.pinned ? <Pin className="size-3.5 text-red-600" /> : null}</div>
                <h2 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-gray-950">{entry.title}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{entry.content || "Catatan tanpa isi tambahan."}</p>
                <p className="mt-2 text-[11px] text-gray-400">{formatDate(entry.journal_date)}{entry.source_name ? ` · ${entry.source_name}` : ""}</p>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6">
          {selected ? (
            <article>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={cn("rounded px-2 py-1 text-xs font-semibold", categoryClass(selected.category))}>{selected.category}</span>{selected.pinned ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"><Pin className="size-3.5" />Disematkan</span> : null}</div><h2 className="mt-3 text-xl font-semibold leading-7 text-gray-950">{selected.title}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500"><span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{formatDate(selected.journal_date)}</span>{selected.source_name ? <span>Sumber: {selected.source_name}</span> : null}</div></div>
                <div className="flex shrink-0 gap-1"><button type="button" onClick={() => openEditor(selected)} title="Edit jurnal" className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"><Edit3 className="size-4" /></button><button type="button" onClick={() => deleteEntry(selected)} title="Hapus jurnal" className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button></div>
              </div>
              {selected.ticker_symbols.length > 0 || selected.tags.length > 0 ? <div className="mt-5 flex flex-wrap gap-2">{selected.ticker_symbols.map((ticker) => <Link key={ticker} href={`/stocks/${ticker}`} className="rounded bg-gray-950 px-2 py-1 text-xs font-semibold text-white">{ticker}</Link>)}{selected.tags.map((tag) => <span key={tag} className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">#{tag}</span>)}</div> : null}
              <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-gray-700">{selected.content || <span className="italic text-gray-400">Belum ada isi catatan.</span>}</div>
              {selected.journal_attachments.length > 0 ? <div className="mt-8"><h3 className="text-sm font-semibold text-gray-950">Lampiran</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{selected.journal_attachments.map((attachment) => <figure key={attachment.id} className="group relative overflow-hidden rounded-md border border-gray-200 bg-gray-50"><a href={attachment.signed_url ?? undefined} target="_blank" rel="noreferrer" className="block aspect-video">{attachment.signed_url ? <span role="img" aria-label={attachment.file_name} style={{ backgroundImage: `url(${attachment.signed_url})` }} className="block size-full bg-cover bg-center" /> : <span className="flex size-full items-center justify-center text-gray-400"><FileImage className="size-7" /></span>}</a><figcaption className="truncate border-t border-gray-200 bg-white px-3 py-2 pr-10 text-xs text-gray-600">{attachment.file_name}</figcaption><button type="button" onClick={() => deleteAttachment(selected, attachment.id)} title="Hapus gambar" className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-md bg-white text-gray-500 shadow-sm hover:text-red-700"><Trash2 className="size-3.5" /></button></figure>)}</div></div> : null}
            </article>
          ) : <div className="flex min-h-[500px] flex-col items-center justify-center text-center"><BookOpenText className="size-10 text-gray-300" /><h2 className="mt-4 text-base font-semibold text-gray-900">Jurnal masih kosong</h2><Button type="button" className="mt-4" onClick={() => openEditor()}><Plus className="size-4" />Tulis Catatan Pertama</Button></div>}
        </main>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-5">
          <form onSubmit={saveEntry} className="flex max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-lg bg-white shadow-xl sm:max-h-[90vh] sm:rounded-lg">
            <header className="flex items-start justify-between border-b border-gray-200 px-4 py-4 sm:px-6"><div><h2 className="text-lg font-semibold text-gray-950">{editingId ? "Edit jurnal" : "Tulis jurnal baru"}</h2><p className="mt-1 text-sm text-gray-500">Simpan konteks yang membuat insight ini berguna saat dibaca kembali.</p></div><button type="button" onClick={closeEditor} aria-label="Tutup editor" className="flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"><X className="size-5" /></button></header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-semibold text-gray-800">Judul<input value={payload.title} onChange={(event) => setPayload((value) => ({ ...value, title: event.target.value }))} maxLength={180} autoFocus placeholder="Contoh: Pelajaran dari distribusi setelah euforia" className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-sm font-normal" /></label>
                <label className="text-sm font-semibold text-gray-800">Kategori<select value={payload.category} onChange={(event) => setPayload((value) => ({ ...value, category: event.target.value as JournalCategory }))} className="mt-2 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-normal">{journalCategories.map((value) => <option key={value}>{value}</option>)}</select></label>
                <label className="text-sm font-semibold text-gray-800">Tanggal<input type="date" value={payload.journal_date} onChange={(event) => setPayload((value) => ({ ...value, journal_date: event.target.value }))} className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-sm font-normal" /></label>
                <label className="text-sm font-semibold text-gray-800">Sumber atau mentor<input value={payload.source_name} onChange={(event) => setPayload((value) => ({ ...value, source_name: event.target.value }))} placeholder="Pak Frans, Pak Dhani, buku, webinar..." className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-sm font-normal" /></label>
                <label className="text-sm font-semibold text-gray-800">Ticker terkait<input value={tickerText} onChange={(event) => setTickerText(event.target.value)} placeholder="BBCA, SINI, DGIK" className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-sm font-normal uppercase" /></label>
                <label className="sm:col-span-2 text-sm font-semibold text-gray-800">Tag<input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="risk management, bandar, psikologi" className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-sm font-normal" /></label>
                <label className="sm:col-span-2 text-sm font-semibold text-gray-800">Isi catatan<textarea value={payload.content} onChange={(event) => setPayload((value) => ({ ...value, content: event.target.value }))} rows={10} placeholder="Tulis insight, konteks, hal yang perlu diuji, dan tindak lanjut..." className="mt-2 w-full resize-y rounded-md border border-gray-300 px-3 py-3 text-sm font-normal leading-6" /></label>
              </div>
              <div className="mt-5 border-t border-gray-200 pt-5"><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={selectFiles} /><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-gray-800">Lampiran gambar</p><p className="mt-1 text-xs text-gray-500">Maksimal 5 gambar per simpan, masing-masing 8 MB.</p></div><Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><ImagePlus className="size-4" />Pilih Gambar</Button></div>{files.length > 0 ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2"><span className="truncate text-xs text-gray-600">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="text-gray-400 hover:text-red-700"><X className="size-4" /></button></div>)}</div> : null}</div>
              <label className="mt-5 flex items-center gap-3 text-sm font-medium text-gray-700"><input type="checkbox" checked={payload.pinned} onChange={(event) => setPayload((value) => ({ ...value, pinned: event.target.checked }))} className="size-4 accent-red-600" />Sematkan jurnal ini</label>
            </div>
            <footer className="flex justify-end gap-2 border-t border-gray-200 px-4 py-4 sm:px-6"><Button type="button" variant="ghost" onClick={closeEditor} disabled={saving}>Batal</Button><Button type="submit" disabled={!payload.title.trim() || saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <NotebookPen className="size-4" />}{saving ? "Menyimpan..." : "Simpan Jurnal"}</Button></footer>
          </form>
        </div>
      ) : null}
      {confirmationDialog}
    </section>
  );
}
