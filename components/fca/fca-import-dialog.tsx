"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import readXlsxFile from "read-excel-file/browser";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseFcaWorkbook, type ParsedFcaFile } from "@/lib/fca-import";

type WorkbookSheet = { sheet: string; data: readonly (readonly unknown[])[] };

export function FcaImportDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedFcaFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape" && !importing) onClose(); };
    window.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", keydown); };
  }, [importing, onClose, open]);

  if (!open) return null;

  async function readFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Gunakan file Excel berformat .xlsx.");
      return;
    }
    setReading(true);
    setError(null);
    setParsed(null);
    setFileName(file.name);
    try {
      const workbook = await readXlsxFile(file) as unknown as WorkbookSheet[];
      if (!workbook[0]?.data?.length) throw new Error("Worksheet pertama kosong.");
      setParsed(parseFcaWorkbook(workbook[0].data, file.name));
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "File gagal dibaca.");
    } finally {
      setReading(false);
    }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await readFile(file);
    event.target.value = "";
  }

  async function importFile() {
    if (!parsed || !secret.trim()) return;
    setImporting(true);
    try {
      const response = await fetch("/api/fca/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-import-key": secret },
        body: JSON.stringify({ sourceDate: parsed.sourceDate, sourceFile: fileName, rows: parsed.rows }),
      });
      const result = await response.json() as { error?: string; importedCount?: number };
      if (!response.ok) throw new Error(result.error || "Import FCA gagal.");
      toast.success(`${result.importedCount ?? parsed.rows.length} episode FCA berhasil diimpor.`);
      onImported();
    } catch (importError) {
      toast.error(importError instanceof Error ? importError.message : "Import FCA gagal.");
    } finally {
      setImporting(false);
    }
  }

  const activeCount = parsed?.rows.filter((row) => !row.exited_at).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="fca-import-title" className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-lg bg-white shadow-xl sm:max-h-[88vh] sm:rounded-lg">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6">
          <div><h2 id="fca-import-title" className="text-lg font-semibold text-gray-950">Perbarui data FCA</h2><p className="mt-1 text-sm text-gray-500">Unggah daftar Papan Pemantauan Khusus terbaru dari BEI.</p></div>
          <button type="button" onClick={onClose} disabled={importing} className="flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" title="Tutup"><X className="size-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <input ref={inputRef} type="file" accept=".xlsx" className="sr-only" onChange={chooseFile} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={reading || importing} className="flex min-h-28 w-full flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-5 py-5 text-center hover:border-red-300 hover:bg-red-50/40">
            {reading ? <Loader2 className="size-7 animate-spin text-red-600" /> : <FileSpreadsheet className="size-7 text-red-600" />}
            <span className="mt-2 text-sm font-semibold text-gray-950">{reading ? "Membaca workbook..." : fileName || "Pilih file Excel FCA"}</span>
            <span className="mt-1 text-xs text-gray-500">Kolom kode saham, tanggal masuk/keluar, dan kriteria</span>
          </button>
          {error ? <div className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div> : null}
          {parsed ? (
            <div className="mt-5 space-y-5">
              <div className="flex gap-3 rounded-md border border-green-200 bg-green-50 p-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-700" /><div><p className="text-sm font-semibold text-green-900">File siap diimpor</p><p className="mt-1 text-xs leading-5 text-green-800">Perubahan terhadap data sebelumnya akan dipakai untuk mendeteksi saham masuk, keluar, atau berganti kriteria.</p></div></div>
              <dl className="grid grid-cols-2 gap-4 border-y border-gray-200 py-4 sm:grid-cols-4">
                <div><dt className="text-xs text-gray-500">Tanggal sumber</dt><dd className="mt-1 text-sm font-semibold">{parsed.sourceDate}</dd></div>
                <div><dt className="text-xs text-gray-500">Total episode</dt><dd className="mt-1 text-sm font-semibold">{parsed.rows.length}</dd></div>
                <div><dt className="text-xs text-gray-500">Masih aktif</dt><dd className="mt-1 text-sm font-semibold text-red-700">{activeCount}</dd></div>
                <div><dt className="text-xs text-gray-500">Sudah keluar</dt><dd className="mt-1 text-sm font-semibold text-green-700">{parsed.rows.length - activeCount}</dd></div>
              </dl>
              <div className="overflow-x-auto rounded-md border border-gray-200"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-2">Ticker</th><th className="px-3 py-2">Perusahaan</th><th className="px-3 py-2">Masuk</th><th className="px-3 py-2">Keluar</th><th className="px-3 py-2">Kriteria</th></tr></thead><tbody>{parsed.rows.slice(0, 6).map((row) => <tr key={`${row.ticker}-${row.entered_at}`} className="border-t border-gray-100"><td className="px-3 py-2 font-semibold">{row.ticker}</td><td className="max-w-52 truncate px-3 py-2">{row.company_name}</td><td className="px-3 py-2">{row.entered_at}</td><td className="px-3 py-2">{row.exited_at ?? "Aktif"}</td><td className="px-3 py-2">{row.criteria.join(", ")}</td></tr>)}</tbody></table></div>
              <label className="block text-sm font-semibold text-gray-800">Kunci admin import<input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="Gunakan secret yang sama dengan import Ownership" className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-sm font-normal" /></label>
            </div>
          ) : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-gray-200 px-4 py-4 sm:px-6"><Button type="button" variant="ghost" onClick={onClose} disabled={importing}>Batal</Button><Button type="button" onClick={importFile} disabled={!parsed || !secret.trim() || importing}>{importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{importing ? "Mengimpor..." : "Import ke Supabase"}</Button></footer>
      </section>
    </div>
  );
}
