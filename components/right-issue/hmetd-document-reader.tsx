"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, ExternalLink, FileText, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { hmetdFieldLabels, hmetdMaxBytes, type HmetdDocument, type HmetdField, type HmetdTerms } from "@/types/hmetd-document";
import { initialHmetdReview, reviewHmetdTerms, type HmetdReview } from "@/lib/hmetd-document-review";
import { formatNumber, formatSimulationInput } from "@/lib/calculations/right-issue-format";

const statusLabels = { found: "Terbaca", missing: "Belum ditemukan", indicative: "Indikatif", conflict: "Perlu pilihan" };
const inputClass = "h-11 w-full min-w-0 max-w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100";

export function HmetdDocumentReader({ onApply }: { onApply: (terms: HmetdTerms, document: HmetdDocument) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const fileUrl = useRef("");
  const [pdfUrl, setPdfUrl] = useState("");
  const controller = useRef<AbortController | null>(null);
  const [document, setDocument] = useState<HmetdDocument | null>(null);
  const [values, setValues] = useState<HmetdReview | null>(null);
  const [resolved, setResolved] = useState<Partial<Record<HmetdField, boolean>>>({});
  const [choices, setChoices] = useState<Partial<Record<HmetdField, string>>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [applied, setApplied] = useState(false);
  useEffect(() => () => { controller.current?.abort(); if (fileUrl.current) URL.revokeObjectURL(fileUrl.current); }, []);

  async function upload(file: File) {
    if (!/\.pdf$/i.test(file.name) || !file.size || file.size > hmetdMaxBytes) {
      const message = "Pilih satu PDF berbasis teks, maksimal 4 MB.";
      setError(message); toast.error(message); return;
    }
    setBusy(true); setError(""); setDocument(null); setValues(null); setConfirmed(false); setResolved({}); setChoices({}); setApplied(false);
    if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
    fileUrl.current = "";
    setPdfUrl("");
    controller.current = new AbortController();
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/hmetd-document", { method: "POST", body: form, signal: controller.current.signal });
      const payload = await response.json();
      if (!response.ok || !payload.document) throw new Error(payload.error ?? "Dokumen gagal dibaca. Coba unggah kembali.");
      const result = payload.document as HmetdDocument;
      fileUrl.current = URL.createObjectURL(file);
      setPdfUrl(fileUrl.current);
      setDocument(result); setValues(initialHmetdReview(result)); setExpanded(true);
      toast.success("Dokumen terbaca. Ketentuan siap ditinjau.");
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      const message = cause instanceof Error ? cause.message : "Dokumen gagal dibaca.";
      setError(message); toast.error(message);
    } finally { setBusy(false); }
  }
  function edit(key: HmetdField, value: string, resolution?: boolean) {
    setValues((current) => current ? { ...current, [key]: value } : current);
    setResolved((current) => ({ ...current, [key]: resolution ?? Boolean(value.trim()) }));
    setConfirmed(false); setApplied(false); setError("");
  }
  function apply() {
    if (!document || !values) return;
    const review = reviewHmetdTerms(document, values, resolved, confirmed);
    if (!review.terms) { setError(review.errors.join(" ")); toast.error("Periksa kembali hasil tinjauan."); return; }
    onApply(review.terms, document); setError(""); setApplied(true); setExpanded(false);
    toast.success(`Ketentuan ${review.terms.ticker} diterapkan ke simulator.`);
  }
  const unresolved = document ? (Object.keys(document.fields) as HmetdField[]).filter((key) => document.fields[key].status === "conflict" && !resolved[key]).length : 0;

  return <section aria-labelledby="hmetd-reader-title" className="mb-6 min-w-0 border-y border-gray-200 bg-gray-50/60 px-3 py-4 sm:px-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3"><FileText className="size-5 shrink-0 text-red-600" /><div className="min-w-0"><h2 id="hmetd-reader-title" className="text-base font-semibold text-gray-950">Keterbukaan Informasi HMETD</h2><p className="mt-1 text-xs text-gray-500">PDF berbasis teks · maksimal 4 MB · 150 halaman</p></div></div>
      <input ref={fileInput} type="file" accept="application/pdf,.pdf" disabled={busy} aria-label="File keterbukaan HMETD" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
      <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-60">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{busy ? "Membaca PDF..." : document ? "Ganti PDF" : "Unggah PDF"}</button>
    </div>
    {busy ? <p role="status" className="mt-4 text-sm text-gray-600">Membaca ketentuan dan sumber per halaman...</p> : null}
    {error ? <p role="alert" className="mt-4 break-words border-l-2 border-red-500 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p> : null}
    {document && values ? <>
      <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-950">{document.issuer ?? "Emiten belum teridentifikasi"}</p><p className="mt-1 break-all text-xs leading-5 text-gray-500">{document.filename}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="text-gray-500">{document.pageCount} halaman</span><span className={document.proposal ? "text-amber-800" : "text-gray-700"}>{document.proposal ? "Usulan / indikatif" : "Ketentuan tercantum"}</span>{applied ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="size-3" />Diterapkan</span> : null}</div></div>
        <button type="button" onClick={() => setExpanded(!expanded)} className="inline-flex min-h-10 shrink-0 self-start items-center gap-2 rounded-md px-2 text-sm font-medium text-gray-700 hover:bg-gray-100" aria-expanded={expanded}>{expanded ? "Tutup tinjauan" : "Tinjau dokumen"}{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button>
      </div>
      {expanded ? <div className="mt-4">
        {document.warnings.length ? <div className="mb-5 flex items-start gap-2 border-l-2 border-amber-400 bg-amber-50 px-3 py-3"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" /><ul className="space-y-2 text-xs leading-5 text-amber-900">{document.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
        <div className="grid min-w-0 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(hmetdFieldLabels) as HmetdField[]).map((key) => {
            const field = document.fields[key]; const isDate = !["ticker", "ratio", "subscriptionPrice"].includes(key);
            return <div key={key} className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-1"><label htmlFor={`hmetd-${key}`} className="text-xs font-semibold text-gray-700">{hmetdFieldLabels[key]}</label><span className={`text-[11px] ${field.status === "conflict" ? "font-semibold text-red-700" : field.status === "indicative" ? "text-amber-700" : "text-gray-500"}`}>{statusLabels[field.status]}</span></div>
              {field.status === "conflict" ? <select aria-label={`Pilihan ${hmetdFieldLabels[key]}`} className={`${inputClass} mb-2`} value={choices[key] ?? ""} onChange={(event) => {
                const choice = event.target.value; setChoices((current) => ({ ...current, [key]: choice }));
                edit(key, choice === "skip" || choice === "manual" || !choice ? "" : key === "subscriptionPrice" ? formatNumber(Number(choice), 4) : choice, choice === "skip" || (choice !== "manual" && Boolean(choice)));
              }}><option value="">Pilih hasil tinjauan</option>{field.candidates.map((candidate) => <option key={candidate.value} value={candidate.value}>{candidate.value} ({candidate.page ? `hal. ${candidate.page}` : "nama file"})</option>)}<option value="manual">Koreksi manual</option><option value="skip">Kosongkan ketentuan ini</option></select> : null}
              <input id={`hmetd-${key}`} type={isDate ? "date" : "text"} inputMode={key === "subscriptionPrice" ? "decimal" : undefined} placeholder={key === "ratio" ? "Contoh 4:1" : key === "ticker" ? "Ticker" : "Belum ditemukan"} value={values[key]} maxLength={key === "ticker" ? 4 : undefined} className={inputClass} onChange={(event) => edit(key, key === "ticker" ? event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") : key === "subscriptionPrice" ? formatSimulationInput(event.target.value) : event.target.value)} />
              {field.candidates.length ? <details className="mt-2 text-xs"><summary className="cursor-pointer text-gray-500">Sumber ({field.candidates.length})</summary><div className="mt-2 space-y-3 border-l border-gray-300 pl-3">{field.candidates.map((candidate) => <div key={candidate.value}>{candidate.page ? <a href={`${pdfUrl}#page=${candidate.page}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-red-600">Halaman PDF {candidate.page}<ExternalLink className="size-3" /></a> : <span className="font-semibold text-gray-600">Nama file, belum diverifikasi dari isi</span>}<p className="mt-1 break-words leading-5 text-gray-600">{candidate.quote}</p></div>)}</div></details> : null}
            </div>;
          })}
        </div>
        {document.context.length ? <details className="mt-5 border-t border-gray-200 pt-4 text-sm"><summary className="cursor-pointer font-semibold text-gray-800">Kutipan penggunaan dana</summary><div className="mt-3 space-y-4">{document.context.map((item) => <blockquote key={item.page} className="border-l-2 border-gray-300 pl-3 text-xs leading-6 text-gray-600"><a href={`${pdfUrl}#page=${item.page}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-red-600">Halaman PDF {item.page}</a><p className="mt-1">{item.quote}...</p></blockquote>)}</div></details> : null}
        <div className="mt-5 flex flex-col gap-4 border-t border-gray-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex max-w-2xl items-start gap-2 text-xs leading-5 text-gray-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-4 shrink-0 accent-red-600" /><span>Saya telah meninjau sumber dan koreksi di atas{document.proposal || document.tentativeSchedule ? ", termasuk ketentuan indikatif / jadwal sementara" : ""}. Ketentuan kosong tetap kosong; ini bukan rekomendasi investasi.</span></label>
          <button type="button" disabled={!confirmed || unresolved > 0} onClick={apply} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"><Check className="size-4" />Terapkan ke simulasi</button>
        </div>
        {unresolved ? <p className="mt-2 text-xs text-red-700">{unresolved} ketentuan masih memiliki perbedaan yang belum dipilih.</p> : null}
        <p className="mt-3 text-xs leading-5 text-gray-500">Dokumen hanya diproses untuk sesi ini, tidak disimpan ke database. Ketentuan right issue dan asumsi skenario sebelumnya akan diganti. Posisi dan harga asumsi tetap dipakai hanya untuk ticker yang sama.</p>
      </div> : null}
    </> : null}
  </section>;
}
