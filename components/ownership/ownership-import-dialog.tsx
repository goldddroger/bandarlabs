"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import readXlsxFile from "read-excel-file/browser";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseOwnershipWorkbook, type ParsedOwnershipFile } from "@/lib/ownership-import";

type WorkbookSheet = {
  sheet: string;
  data: readonly (readonly unknown[])[];
};

type ImportSuccess = {
  threshold: 1 | 5;
  firstTicker: string;
};

export function OwnershipImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (result: ImportSuccess) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedOwnershipFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);

  const uniqueTickers = useMemo(
    () => new Set(parsed?.rows.map((row) => row.ticker) ?? []).size,
    [parsed],
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !importing) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [importing, onClose, open]);

  if (!open) return null;

  async function readFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setParsed(null);
      setParseError("Gunakan file Excel berformat .xlsx.");
      return;
    }

    setReading(true);
    setParsed(null);
    setParseError(null);
    setFileName(file.name);
    try {
      const workbook = await readXlsxFile(file) as unknown as WorkbookSheet[];
      const firstSheet = workbook[0];
      if (!firstSheet?.data?.length) throw new Error("Worksheet pertama kosong.");
      setParsed(parseOwnershipWorkbook(firstSheet.data));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "File gagal dibaca.");
    } finally {
      setReading(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await readFile(file);
    event.target.value = "";
  }

  async function importData() {
    if (!parsed || !secret.trim()) return;
    setImporting(true);
    try {
      const response = await fetch("/api/ownership/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ownership-import-key": secret,
        },
        body: JSON.stringify({
          threshold: parsed.threshold,
          reportDate: parsed.reportDate,
          sourceFile: fileName,
          rows: parsed.rows,
        }),
      });
      const result = await response.json() as { error?: string; importedCount?: number };
      if (!response.ok) throw new Error(result.error || "Import gagal diproses.");

      toast.success(`${result.importedCount ?? parsed.rows.length} baris ownership berhasil diimpor.`);
      onImported({ threshold: parsed.threshold, firstTicker: parsed.rows[0].ticker });
      setFileName("");
      setParsed(null);
      setSecret("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import gagal diproses.";
      toast.error(message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-5" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ownership-import-title"
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-lg bg-white shadow-xl sm:max-h-[90vh] sm:rounded-lg"
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6">
          <div>
            <h2 id="ownership-import-title" className="text-lg font-semibold text-gray-950">Import data ownership</h2>
            <p className="mt-1 text-sm text-gray-500">Unggah laporan kepemilikan 1% atau 5% resmi. Format dan tanggal akan dideteksi otomatis.</p>
          </div>
          <button type="button" onClick={onClose} disabled={importing} className="flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" title="Tutup">
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <input ref={fileInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileChange} className="sr-only" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={reading || importing}
            className="flex min-h-32 w-full flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center transition hover:border-red-300 hover:bg-red-50/40 disabled:opacity-60"
          >
            {reading ? <Loader2 className="size-7 animate-spin text-red-600" /> : <FileSpreadsheet className="size-7 text-red-600" />}
            <span className="mt-3 text-sm font-semibold text-gray-950">{reading ? "Membaca workbook..." : fileName || "Pilih file Excel"}</span>
            <span className="mt-1 text-xs text-gray-500">File .xlsx laporan bulanan BEI/KSEI</span>
          </button>

          {parseError ? (
            <div className="mt-4 flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          ) : null}

          {parsed ? (
            <div className="mt-5 space-y-5">
              <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-700" />
                <div>
                  <p className="text-sm font-semibold text-green-900">File siap diimpor sebagai data {parsed.format}</p>
                  <p className="mt-1 text-xs leading-5 text-green-800">Snapshot pada tanggal ini akan menggantikan data threshold dan tanggal yang sama, tanpa menghapus bulan lain.</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-y border-gray-200 py-4 sm:grid-cols-4">
                <div><dt className="text-xs text-gray-500">Jenis laporan</dt><dd className="mt-1 text-sm font-semibold text-gray-950">{parsed.threshold}%+</dd></div>
                <div><dt className="text-xs text-gray-500">Tanggal data</dt><dd className="mt-1 text-sm font-semibold text-gray-950">{parsed.reportDate}</dd></div>
                <div><dt className="text-xs text-gray-500">Baris valid</dt><dd className="mt-1 text-sm font-semibold text-gray-950">{parsed.rows.length.toLocaleString("id-ID")}</dd></div>
                <div><dt className="text-xs text-gray-500">Emiten</dt><dd className="mt-1 text-sm font-semibold text-gray-950">{uniqueTickers.toLocaleString("id-ID")}</dd></div>
              </dl>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-950">Preview data</h3>
                  {parsed.rejectedRows > 0 ? <span className="text-xs font-medium text-amber-700">{parsed.rejectedRows} baris dilewati</span> : null}
                </div>
                <div className="mt-2 overflow-x-auto rounded-md border border-gray-200">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr><th className="px-3 py-2 font-semibold">Ticker</th><th className="px-3 py-2 font-semibold">Investor</th><th className="px-3 py-2 font-semibold">Jumlah saham</th><th className="px-3 py-2 font-semibold">Persentase</th><th className="px-3 py-2 font-semibold">Status</th></tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 6).map((row, index) => (
                        <tr key={`${row.ticker}-${row.investor_name}-${index}`} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-semibold text-gray-950">{row.ticker}</td>
                          <td className="max-w-64 px-3 py-2 text-gray-700"><span className="line-clamp-1">{row.investor_name}</span></td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.shares.toLocaleString("id-ID")}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-semibold text-gray-950">{row.percentage.toLocaleString("id-ID", { maximumFractionDigits: 4 })}%</td>
                          <td className="px-3 py-2 text-gray-600">{row.local_foreign === "L" ? "Lokal" : row.local_foreign === "A" ? "Asing" : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <label className="block text-sm font-semibold text-gray-800">
                Kunci admin import
                <input
                  type="password"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  autoComplete="off"
                  placeholder="Masukkan OWNERSHIP_IMPORT_SECRET"
                  className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-sm font-normal text-gray-950 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
                <span className="mt-1.5 block text-xs font-normal leading-5 text-gray-500">Kunci ini hanya memvalidasi proses upload. Service role key tetap tersimpan di server.</span>
              </label>
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-4 py-4 sm:px-6">
          <Button type="button" variant="ghost" onClick={onClose} disabled={importing}>Batal</Button>
          <Button type="button" onClick={importData} disabled={!parsed || !secret.trim() || importing}>
            {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {importing ? "Mengimpor..." : "Import ke Supabase"}
          </Button>
        </footer>
      </section>
    </div>
  );
}
