"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import readXlsxFile from "read-excel-file/browser";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { classificationShare, featuredInvestorClassifications, parseInvestorClassificationWorkbook, type ParsedInvestorClassificationFile } from "@/lib/ownership-classification";

type WorkbookSheet = { sheet: string; data: readonly (readonly unknown[])[] };

export function OwnershipClassificationImportDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: (reportDate: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedInvestorClassificationFile | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const previewCategories = useMemo(() => featuredInvestorClassifications.slice(0, 4), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape" && !importing) onClose(); };
    window.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", keydown); };
  }, [importing, onClose, open]);

  if (!open) return null;

  async function readFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".xlsx") || file.size > 15 * 1024 * 1024) {
      setError("Gunakan file klasifikasi .xlsx maksimal 15 MB.");
      setParsed(null);
      return;
    }
    setReading(true);
    setError("");
    setParsed(null);
    setFileName(file.name);
    try {
      const workbook = await readXlsxFile(file) as unknown as WorkbookSheet[];
      if (!workbook[0]?.data.length) throw new Error("Worksheet pertama kosong.");
      setParsed(parseInvestorClassificationWorkbook(workbook[0].data));
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Workbook gagal dibaca.");
    } finally {
      setReading(false);
    }
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await readFile(file);
    event.target.value = "";
  }

  async function importData() {
    if (!parsed) return;
    setImporting(true);
    try {
      const response = await fetch("/api/ownership/classification/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportDate: parsed.reportDate, sourceFile: fileName, rows: parsed.rows }),
      });
      const result = await response.json() as { importedCount?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "Import klasifikasi gagal.");
      toast.success(`${result.importedCount ?? parsed.rows.length} emiten berhasil disimpan.`);
      onImported(parsed.reportDate);
      setParsed(null);
      setFileName("");
    } catch (importError) {
      toast.error(importError instanceof Error ? importError.message : "Import klasifikasi gagal.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-5" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="classification-import-title" className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-lg bg-white shadow-xl sm:max-h-[90vh] sm:rounded-lg">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6"><div><h2 id="classification-import-title" className="text-lg font-semibold text-gray-950">Import klasifikasi investor</h2><p className="mt-1 text-sm text-gray-500">Unggah snapshot jumlah saham scripless berdasarkan tipe investor dari BEI/KSEI.</p></div><button type="button" onClick={onClose} disabled={importing} className="flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label="Tutup"><X className="size-5" /></button></header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleChange} className="sr-only" />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={reading || importing} className="flex min-h-32 w-full flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center hover:border-red-300 hover:bg-red-50/40 disabled:opacity-60">{reading ? <Loader2 className="size-7 animate-spin text-red-600" /> : <FileSpreadsheet className="size-7 text-red-600" />}<span className="mt-3 text-sm font-semibold text-gray-950">{reading ? "Membaca 40 klasifikasi..." : fileName || "Pilih file klasifikasi investor"}</span><span className="mt-1 text-xs text-gray-500">Excel .xlsx · satu snapshot per file</span></button>
          {error ? <div className="mt-4 flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div> : null}
          {parsed ? <div className="mt-5 space-y-5"><div className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" /><div><p className="text-sm font-semibold text-emerald-950">Snapshot {parsed.reportDate} siap diimpor</p><p className="mt-1 text-xs leading-5 text-emerald-800">Tanggal yang sama akan diganti secara atomik. Snapshot bulan lain tetap tersimpan untuk perbandingan.</p></div></div>
            <dl className="grid grid-cols-2 gap-4 border-y border-gray-200 py-4 sm:grid-cols-4"><Meta label="Tanggal" value={parsed.reportDate} /><Meta label="Emiten" value={parsed.rows.length.toLocaleString("id-ID")} /><Meta label="Klasifikasi" value={parsed.classifications.length.toLocaleString("id-ID")} /><Meta label="Dilewati" value={parsed.rejectedRows.toLocaleString("id-ID")} /></dl>
            <div><h3 className="text-sm font-semibold text-gray-950">Preview komposisi scripless</h3><div className="mt-2 overflow-x-auto rounded-md border border-gray-200"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-2 font-semibold">Ticker</th><th className="px-3 py-2 font-semibold">Emiten</th>{previewCategories.map((category) => <th key={category.key} className="px-3 py-2 text-right font-semibold">{category.label}</th>)}<th className="px-3 py-2 text-right font-semibold">Total</th></tr></thead><tbody>{parsed.rows.slice(0, 6).map((row) => <tr key={row.ticker} className="border-t border-gray-100"><td className="px-3 py-2 font-semibold text-gray-950">{row.ticker}</td><td className="max-w-52 truncate px-3 py-2 text-gray-600">{row.issuer_name}</td>{previewCategories.map((category) => <td key={category.key} className="whitespace-nowrap px-3 py-2 text-right text-gray-700">{classificationShare(row, category.key).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</td>)}<td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-gray-950">{row.total_scripless.toLocaleString("id-ID")}</td></tr>)}</tbody></table></div></div>
          </div> : null}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-4 sm:px-6"><Button type="button" variant="ghost" onClick={onClose} disabled={importing}>Batal</Button><Button type="button" onClick={importData} disabled={!parsed || importing}>{importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{importing ? "Mengimpor..." : "Import ke Supabase"}</Button></footer>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-gray-950">{value}</dd></div>;
}
