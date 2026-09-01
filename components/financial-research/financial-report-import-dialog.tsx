"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import readExcelFile from "read-excel-file/browser";
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileText, Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatFinancialAmount, formatFinancialPercent, type ParsedFinancialReport, type WorkbookSheet } from "@/lib/financial-report";
import { parseFinancialReportWorkbook } from "@/lib/financial-report-parser";
import { createClient } from "@/lib/supabase/client";

export function FinancialReportImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (id: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const supportingInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [parsed, setParsed] = useState<ParsedFinancialReport | null>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const warnings = useMemo(() => parsed?.insights.filter((insight) => insight.tone === "negative" || insight.tone === "warning") ?? [], [parsed]);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !importing) onClose();
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", keydown);
    };
  }, [importing, onClose, open]);

  if (!open) return null;

  async function readFile(selectedFile: File) {
    if (!selectedFile.name.toLowerCase().endsWith(".xlsx")) return setError("Gunakan file Financial Statement IDX berformat .xlsx.");
    if (selectedFile.size > 10 * 1024 * 1024) return setError("Ukuran file maksimal 10 MB.");
    setReading(true);
    setFile(selectedFile);
    setSupportingFiles([]);
    setParsed(null);
    setError("");
    try {
      const workbook = await readExcelFile(selectedFile) as unknown as WorkbookSheet[];
      setParsed(parseFinancialReportWorkbook(workbook, selectedFile.name));
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Workbook gagal dibaca.");
    } finally {
      setReading(false);
    }
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) await readFile(selectedFile);
    event.target.value = "";
  }

  function handleSupportingChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.some((document) => !document.name.toLowerCase().endsWith(".pdf") || document.size > 10 * 1024 * 1024)) {
      setError("Setiap dokumen pendamping harus berupa PDF maksimal 10 MB.");
      return;
    }
    setSupportingFiles((current) => {
      const unique = new Map([...current, ...selected].map((document) => [`${document.name}-${document.size}`, document]));
      const documents = Array.from(unique.values()).slice(0, 3);
      if (unique.size > 3) setError("Maksimal 3 PDF pendamping untuk setiap periode laporan.");
      else setError("");
      return documents;
    });
  }

  async function importReport() {
    if (!file || !parsed) return;
    setImporting(true);
    const uploadedPaths: string[] = [];
    try {
      const supportingUploads: Array<{ name: string; size: number; path: string }> = [];
      if (supportingFiles.length) {
        const uploadResponse = await fetch("/api/financial-reports/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: parsed.ticker, periodEnd: parsed.periodEnd, files: supportingFiles.map((document) => ({ name: document.name, size: document.size })) }),
        });
        const uploadPayload = await uploadResponse.json() as { uploads?: Array<{ name: string; size: number; path: string; token: string }>; error?: string };
        if (!uploadResponse.ok || !uploadPayload.uploads || uploadPayload.uploads.length !== supportingFiles.length) throw new Error(uploadPayload.error || "Persiapan upload PDF gagal.");
        for (let index = 0; index < uploadPayload.uploads.length; index += 1) {
          const upload = uploadPayload.uploads[index];
          const { error } = await supabase.storage.from("financial-reports").uploadToSignedUrl(upload.path, upload.token, supportingFiles[index], { contentType: "application/pdf" });
          if (error) throw new Error(`${upload.name}: ${error.message}`);
          uploadedPaths.push(upload.path);
          supportingUploads.push({ name: upload.name, size: upload.size, path: upload.path });
        }
      }
      const form = new FormData();
      form.append("file", file);
      form.append("payload", JSON.stringify(parsed));
      form.append("supportingUploads", JSON.stringify(supportingUploads));
      const response = await fetch("/api/financial-reports", { method: "POST", body: form });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || "Laporan gagal disimpan.");
      toast.success(`${parsed.ticker} periode ${parsed.periodEnd} tersimpan di Supabase.`);
      onImported(result.id);
      setFile(null);
      setParsed(null);
      setSupportingFiles([]);
    } catch (importError) {
      if (uploadedPaths.length) void fetch("/api/financial-reports/uploads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: uploadedPaths }) });
      toast.error(importError instanceof Error ? importError.message : "Laporan gagal disimpan.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/45 sm:items-center sm:p-5" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="financial-import-title" className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-lg bg-white shadow-xl sm:max-h-[92vh] sm:rounded-lg">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6">
          <div>
            <h2 id="financial-import-title" className="text-lg font-semibold text-gray-950">Upload laporan keuangan IDX</h2>
            <p className="mt-1 text-sm text-gray-500">Ticker, periode, mata uang, taxonomy, angka utama, dan sumber bukti akan dideteksi otomatis.</p>
          </div>
          <button type="button" onClick={onClose} disabled={importing} className="flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label="Tutup"><X className="size-5" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleChange} className="sr-only" />
          <input ref={supportingInputRef} type="file" multiple accept=".pdf,application/pdf" onChange={handleSupportingChange} className="sr-only" />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={reading || importing} className="flex min-h-28 w-full flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-5 py-5 text-center transition hover:border-red-300 hover:bg-red-50/40 disabled:opacity-60">
            {reading ? <Loader2 className="size-7 animate-spin text-red-600" /> : <FileSpreadsheet className="size-7 text-red-600" />}
            <span className="mt-2 text-sm font-semibold text-gray-950">{reading ? "Membaca seluruh taxonomy..." : file?.name || "Pilih FinancialStatement IDX"}</span>
            <span className="mt-1 text-xs text-gray-500">Excel .xlsx · maksimum 10 MB</span>
          </button>

          {parsed ? <div className="mt-4 rounded-md border border-gray-200 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-gray-950">Dokumen pendamping PDF</h3><p className="mt-1 text-xs leading-5 text-gray-500">Tambahkan laporan lengkap atau surat penjelasan emiten agar alasan perubahan angka dapat dibaca dari sumber aktual.</p></div><Button type="button" variant="outline" onClick={() => supportingInputRef.current?.click()} disabled={importing || supportingFiles.length >= 3}><FileText className="size-4" />Tambah PDF</Button></div>{supportingFiles.length ? <div className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-100 bg-gray-50">{supportingFiles.map((document, index) => <div key={`${document.name}-${document.size}`} className="flex items-center gap-3 px-3 py-2.5"><FileText className="size-4 shrink-0 text-red-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-800">{document.name}</p><p className="text-xs text-gray-400">{(document.size / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB</p></div><button type="button" onClick={() => setSupportingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="flex size-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus ${document.name}`}><Trash2 className="size-4" /></button></div>)}</div> : <p className="mt-3 rounded-md bg-gray-50 px-3 py-2.5 text-xs text-gray-400">Opsional · maksimum 3 PDF, masing-masing 10 MB.</p>}</div> : null}

          {error ? <div className="mt-4 flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div> : null}

          {parsed ? (
            <div className="mt-5 space-y-5">
              <div className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="font-semibold text-emerald-950">{parsed.ticker} · {parsed.headline}</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-900">{parsed.entityName} · periode berakhir {formatDate(parsed.periodEnd)} · {parsed.currency} · {parsed.unitLabel}</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-y border-gray-200 py-4 sm:grid-cols-4">
                <Meta label="Taxonomy" value={parsed.taxonomyFamily === "financial" ? "Financial" : "General Industry"} />
                <Meta label="Fakta terbaca" value={parsed.facts.length.toLocaleString("id-ID")} />
                <Meta label="Analisis" value={`${parsed.insights.length} temuan`} />
                <Meta label="Review" value={parsed.reportType || "Tidak disebutkan"} />
              </dl>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PreviewMetric label="Pendapatan" value={formatFinancialAmount(parsed.kpis.revenue.current, parsed.currency, parsed.unitMultiplier)} change={parsed.kpis.revenue.changePercent} />
                <PreviewMetric label="Laba Bersih" value={formatFinancialAmount(parsed.kpis.netIncome.current, parsed.currency, parsed.unitMultiplier)} change={parsed.kpis.netIncome.changePercent} />
                <PreviewMetric label="Arus Kas Operasi" value={formatFinancialAmount(parsed.kpis.operatingCashFlow.current, parsed.currency, parsed.unitMultiplier)} change={parsed.kpis.operatingCashFlow.changePercent} />
                <PreviewMetric label="Liabilitas" value={formatFinancialAmount(parsed.kpis.liabilities.current, parsed.currency, parsed.unitMultiplier)} change={parsed.kpis.liabilities.changePercent} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-950">Preview temuan</h3>
                <div className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-200">
                  {parsed.insights.slice(0, 5).map((insight, index) => (
                    <div key={insight.id} className="flex gap-3 px-3 py-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-gray-600">{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0"><p className="text-sm font-semibold text-gray-950">{insight.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{insight.summary}</p></div>
                    </div>
                  ))}
                </div>
                {warnings.length ? <p className="mt-2 text-xs font-medium text-amber-700">{warnings.length} perhatian material terdeteksi dan akan ditampilkan pada halaman analisis.</p> : null}
              </div>
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-4 py-4 sm:px-6">
          <Button type="button" variant="ghost" onClick={onClose} disabled={importing}>Batal</Button>
          <Button type="button" onClick={importReport} disabled={!parsed || !file || importing}>{importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{importing ? (supportingFiles.length ? "Membaca PDF..." : "Menyimpan...") : "Simpan Analisis"}</Button>
        </footer>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-gray-950">{value}</dd></div>;
}

function PreviewMetric({ label, value, change }: { label: string; value: string; change: number | null }) {
  const tone = change === null ? "text-gray-500" : change >= 0 ? "text-emerald-700" : "text-red-700";
  return <div className="rounded-md border border-gray-200 p-3"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-sm font-semibold text-gray-950">{value}</p><p className={`mt-1 text-xs font-semibold ${tone}`}>{formatFinancialPercent(change)}</p></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`));
}
