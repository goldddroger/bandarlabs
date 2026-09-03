"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarRange, CheckCircle2, CircleDollarSign, Landmark, Loader2, Pencil, Plus, RefreshCw, ShieldAlert, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type RightIssueTrackerDraft = {
  ticker?: string;
  issuerName?: string;
  referenceDate?: string;
  targetFunds?: number;
  offeredShares?: number;
  hasStandbyBuyer?: boolean;
};

type TrackerStatus = "planned" | "ongoing" | "completed";
type ProceedsCategory = "capex" | "acquisition" | "debtRepayment" | "workingCapital" | "relatedParty";
type Allocations = Record<ProceedsCategory, number | null>;
type Tracker = Required<Pick<RightIssueTrackerDraft, "ticker" | "issuerName" | "referenceDate">> & {
  id: string;
  status: TrackerStatus;
  targetFunds: number | null;
  actualFunds: number | null;
  offeredShares: number | null;
  subscribedShares: number | null;
  sharesBefore: number | null;
  sharesAfter: number | null;
  notes: string;
  proceedsPlan: Allocations;
  proceedsActual: Allocations;
  proceedsChanged: boolean;
  proceedsChangeReason: string;
  ownershipBefore: string;
  ownershipAfter: string;
  controllerBefore: string;
  controllerAfter: string;
  controlChanged: boolean;
  standbyBuyerName: string;
  standbyBuyerCommitment: number | null;
  warrantShares: number | null;
  warrantExercisePrice: number | null;
  warrantStartDate: string | null;
  warrantEndDate: string | null;
  updatedAt: string;
};
type Candle = { date: string; close: number };
type PriceHistory = { rows?: Candle[]; source?: string; error?: string };
type TrackerForm = {
  ticker: string;
  issuerName: string;
  referenceDate: string;
  status: TrackerStatus;
  targetFunds: string;
  actualFunds: string;
  offeredShares: string;
  subscribedShares: string;
  sharesBefore: string;
  sharesAfter: string;
  notes: string;
  planCapex: string;
  planAcquisition: string;
  planDebtRepayment: string;
  planWorkingCapital: string;
  planRelatedParty: string;
  actualCapex: string;
  actualAcquisition: string;
  actualDebtRepayment: string;
  actualWorkingCapital: string;
  actualRelatedParty: string;
  proceedsChanged: string;
  proceedsChangeReason: string;
  ownershipBefore: string;
  ownershipAfter: string;
  controllerBefore: string;
  controllerAfter: string;
  controlChanged: string;
  standbyBuyerName: string;
  standbyBuyerCommitment: string;
  warrantShares: string;
  warrantExercisePrice: string;
  warrantStartDate: string;
  warrantEndDate: string;
};

const emptyForm: TrackerForm = {
  ticker: "", issuerName: "", referenceDate: "", status: "planned", targetFunds: "", actualFunds: "",
  offeredShares: "", subscribedShares: "", sharesBefore: "", sharesAfter: "", notes: "",
  planCapex: "", planAcquisition: "", planDebtRepayment: "", planWorkingCapital: "", planRelatedParty: "",
  actualCapex: "", actualAcquisition: "", actualDebtRepayment: "", actualWorkingCapital: "", actualRelatedParty: "",
  proceedsChanged: "no", proceedsChangeReason: "", ownershipBefore: "", ownershipAfter: "", controllerBefore: "",
  controllerAfter: "", controlChanged: "no", standbyBuyerName: "", standbyBuyerCommitment: "", warrantShares: "",
  warrantExercisePrice: "", warrantStartDate: "", warrantEndDate: "",
};
const allocationFields: Array<{ category: ProceedsCategory; label: string; plan: keyof TrackerForm; actual: keyof TrackerForm }> = [
  { category: "capex", label: "Capex", plan: "planCapex", actual: "actualCapex" },
  { category: "acquisition", label: "Akuisisi", plan: "planAcquisition", actual: "actualAcquisition" },
  { category: "debtRepayment", label: "Pelunasan utang", plan: "planDebtRepayment", actual: "actualDebtRepayment" },
  { category: "workingCapital", label: "Modal kerja", plan: "planWorkingCapital", actual: "actualWorkingCapital" },
  { category: "relatedParty", label: "Pihak berelasi", plan: "planRelatedParty", actual: "actualRelatedParty" },
];
const statusCopy: Record<TrackerStatus, { label: string; className: string }> = {
  planned: { label: "Menunggu pelaksanaan", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  ongoing: { label: "Sedang berjalan", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  completed: { label: "Selesai", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

function numberInput(value: string) {
  if (!value.trim()) return null;
  const number = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value: number | null, compact = false) {
  if (value === null) return "-";
  return new Intl.NumberFormat("id-ID", compact ? { notation: "compact", maximumFractionDigits: 2 } : { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number | null, compact = false) {
  if (value === null) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 2 : 0 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function percent(numerator: number | null, denominator: number | null) {
  return numerator !== null && denominator !== null && denominator > 0 ? (numerator / denominator) * 100 : null;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function priceMetrics(rows: Candle[], referenceDate: string) {
  const sorted = rows.filter((row) => Number.isFinite(row.close)).sort((a, b) => a.date.localeCompare(b.date));
  const before = [...sorted].reverse().find((row) => row.date < referenceDate) ?? null;
  const after = sorted.find((row) => row.date >= referenceDate) ?? null;
  const atHorizon = (days: number) => sorted.find((row) => row.date >= addDays(referenceDate, days)) ?? null;
  const change = (row: Candle | null) => before && row ? ((row.close - before.close) / before.close) * 100 : null;
  return { before, after, current: sorted.at(-1) ?? null, week: change(atHorizon(7)), month: change(atHorizon(30)), quarter: change(atHorizon(90)) };
}

function formFromTracker(tracker: Tracker): TrackerForm {
  const value = (number: number | null) => number === null ? "" : String(number);
  return {
    ticker: tracker.ticker, issuerName: tracker.issuerName, referenceDate: tracker.referenceDate, status: tracker.status,
    targetFunds: value(tracker.targetFunds), actualFunds: value(tracker.actualFunds), offeredShares: value(tracker.offeredShares),
    subscribedShares: value(tracker.subscribedShares), sharesBefore: value(tracker.sharesBefore), sharesAfter: value(tracker.sharesAfter), notes: tracker.notes,
    planCapex: value(tracker.proceedsPlan.capex), planAcquisition: value(tracker.proceedsPlan.acquisition), planDebtRepayment: value(tracker.proceedsPlan.debtRepayment), planWorkingCapital: value(tracker.proceedsPlan.workingCapital), planRelatedParty: value(tracker.proceedsPlan.relatedParty),
    actualCapex: value(tracker.proceedsActual.capex), actualAcquisition: value(tracker.proceedsActual.acquisition), actualDebtRepayment: value(tracker.proceedsActual.debtRepayment), actualWorkingCapital: value(tracker.proceedsActual.workingCapital), actualRelatedParty: value(tracker.proceedsActual.relatedParty),
    proceedsChanged: tracker.proceedsChanged ? "yes" : "no", proceedsChangeReason: tracker.proceedsChangeReason,
    ownershipBefore: tracker.ownershipBefore, ownershipAfter: tracker.ownershipAfter, controllerBefore: tracker.controllerBefore,
    controllerAfter: tracker.controllerAfter, controlChanged: tracker.controlChanged ? "yes" : "no", standbyBuyerName: tracker.standbyBuyerName,
    standbyBuyerCommitment: value(tracker.standbyBuyerCommitment), warrantShares: value(tracker.warrantShares),
    warrantExercisePrice: value(tracker.warrantExercisePrice), warrantStartDate: tracker.warrantStartDate ?? "", warrantEndDate: tracker.warrantEndDate ?? "",
  };
}

export function RightIssuePostTracker({ draft }: { draft?: RightIssueTrackerDraft | null }) {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [histories, setHistories] = useState<Record<string, PriceHistory>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TrackerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tracker | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState<"all" | "proceeds" | "control" | "warrant">("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/right-issue-trackers", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { trackers?: Tracker[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Tracker gagal dimuat.");
        if (!cancelled) setTrackers(payload.trackers ?? []);
      })
      .catch((error: unknown) => { if (!cancelled) toast.error(error instanceof Error ? error.message : "Tracker gagal dimuat."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function refreshHistories() {
    if (trackers.length === 0) return;
    setRefreshing(true);
    try {
      const entries = await Promise.all(trackers.map(async (tracker) => {
        const key = `${tracker.ticker}-${tracker.referenceDate}`;
        const response = await fetch(`/api/stock-history?ticker=${encodeURIComponent(tracker.ticker)}&start=${tracker.referenceDate}&includeBefore=1`, { cache: "no-store" });
        const payload = await response.json() as PriceHistory;
        return [key, response.ok ? payload : { error: payload.error || "Harga belum tersedia." }] as const;
      }));
      setHistories((current) => ({ ...current, ...Object.fromEntries(entries) }));
    } catch {
      toast.error("Harga historis gagal diperbarui.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (trackers.length === 0) return;
    let cancelled = false;
    Promise.all(trackers.map(async (tracker) => {
      const key = `${tracker.ticker}-${tracker.referenceDate}`;
      const response = await fetch(`/api/stock-history?ticker=${encodeURIComponent(tracker.ticker)}&start=${tracker.referenceDate}&includeBefore=1`, { cache: "no-store" });
      const payload = await response.json() as PriceHistory;
      return [key, response.ok ? payload : { error: payload.error || "Harga belum tersedia." }] as const;
    }))
      .then((entries) => { if (!cancelled) setHistories((current) => ({ ...current, ...Object.fromEntries(entries) })); })
      .catch(() => { if (!cancelled) toast.error("Sebagian harga historis gagal dimuat."); });
    return () => { cancelled = true; };
  }, [trackers]);

  const summary = useMemo(() => ({
    total: trackers.length,
    completed: trackers.filter((tracker) => tracker.status === "completed").length,
    changed: trackers.filter((tracker) => tracker.proceedsChanged).length,
    averageAbsorption: (() => {
      const values = trackers.map((tracker) => percent(tracker.subscribedShares, tracker.offeredShares)).filter((value): value is number => value !== null);
      return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
    })(),
  }), [trackers]);
  const changedCounts = useMemo(() => trackers.reduce<Record<string, number>>((counts, tracker) => {
    if (tracker.proceedsChanged) counts[tracker.ticker] = (counts[tracker.ticker] ?? 0) + 1;
    return counts;
  }, {}), [trackers]);
  const visibleTrackers = useMemo(() => trackers.filter((tracker) => {
    if (riskFilter === "proceeds") return tracker.proceedsChanged;
    if (riskFilter === "control") return tracker.controlChanged;
    if (riskFilter === "warrant") {
      const metrics = priceMetrics(histories[`${tracker.ticker}-${tracker.referenceDate}`]?.rows ?? [], tracker.referenceDate);
      return monitorSignals(tracker, metrics.current?.close ?? null, metrics.current?.date ?? null).warrantPressure;
    }
    return true;
  }), [histories, riskFilter, trackers]);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      ticker: draft?.ticker ?? "",
      issuerName: draft?.issuerName ?? "",
      referenceDate: draft?.referenceDate ?? "",
      targetFunds: draft?.targetFunds ? String(Math.round(draft.targetFunds)) : "",
      offeredShares: draft?.offeredShares ? String(Math.round(draft.offeredShares)) : "",
      standbyBuyerName: draft?.hasStandbyBuyer ? "Terdeteksi pada prospektus" : "",
    });
    setModalOpen(true);
  }

  function openEdit(tracker: Tracker) {
    setEditingId(tracker.id);
    setForm(formFromTracker(tracker));
    setModalOpen(true);
  }

  function updateForm(key: keyof TrackerForm, value: string) {
    setForm((current) => ({ ...current, [key]: key === "ticker" ? value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 12) : value }));
  }

  async function save() {
    if (!form.ticker || !form.referenceDate) return toast.error("Ticker dan tanggal acuan wajib diisi.");
    setSaving(true);
    try {
      const numbers = ["targetFunds", "actualFunds", "offeredShares", "subscribedShares", "sharesBefore", "sharesAfter", "standbyBuyerCommitment", "warrantShares", "warrantExercisePrice"] as const;
      const proceedsPlan = Object.fromEntries(allocationFields.map((field) => [field.category, numberInput(form[field.plan])])) as Allocations;
      const proceedsActual = Object.fromEntries(allocationFields.map((field) => [field.category, numberInput(form[field.actual])])) as Allocations;
      const body = {
        ...form,
        id: editingId,
        ...Object.fromEntries(numbers.map((key) => [key, numberInput(form[key])])),
        proceedsPlan,
        proceedsActual,
        proceedsChanged: form.proceedsChanged === "yes",
        controlChanged: form.controlChanged === "yes",
      };
      const response = await fetch("/api/right-issue-trackers", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { tracker?: Tracker; error?: string };
      if (!response.ok || !payload.tracker) throw new Error(payload.error || "Tracker gagal disimpan.");
      setTrackers((current) => editingId ? current.map((tracker) => tracker.id === editingId ? payload.tracker! : tracker) : [payload.tracker!, ...current]);
      setHistories((current) => { const next = { ...current }; delete next[`${payload.tracker!.ticker}-${payload.tracker!.referenceDate}`]; return next; });
      setModalOpen(false);
      toast.success(editingId ? "Tracker berhasil diperbarui." : "Tracker pasca-right issue berhasil ditambahkan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tracker gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/right-issue-trackers?id=${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Tracker gagal dihapus.");
      setTrackers((current) => current.filter((tracker) => tracker.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Tracker berhasil dihapus.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tracker gagal dihapus.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 border-t border-gray-200 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2"><Activity className="size-5 text-red-600" /><h2 className="text-lg font-semibold text-gray-950">Post-Right Issue Tracker</h2></div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">Bandingkan janji prospektus dengan hasil aktual dan reaksi harga setelah saham baru didistribusikan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="right-issue-risk-filter">Filter risiko</label><select id="right-issue-risk-filter" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as typeof riskFilter)} className="h-10 min-w-0 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none focus:border-red-500"><option value="all">Semua evaluasi</option><option value="proceeds">Penggunaan dana berubah</option><option value="control">Kontrol berubah</option><option value="warrant">Tekanan waran aktif</option></select>
          <button type="button" onClick={() => void refreshHistories()} disabled={refreshing || trackers.length === 0} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw className={cn("size-4", refreshing && "animate-spin")} /><span className="hidden sm:inline">Perbarui harga</span></button>
          <button type="button" onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"><Plus className="size-4" />Tambah tracker</button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 border-y border-gray-200 sm:grid-cols-4">
        <Summary label="Total dipantau" value={String(summary.total)} />
        <Summary label="Sudah selesai" value={String(summary.completed)} />
        <Summary label="Penggunaan berubah" value={String(summary.changed)} />
        <Summary label="Rata-rata terserap" value={summary.averageAbsorption === null ? "-" : `${summary.averageAbsorption.toFixed(1)}%`} />
      </div>

      {loading ? <div className="flex min-h-32 items-center justify-center"><Loader2 className="size-5 animate-spin text-red-600" /></div> : trackers.length === 0 ? (
        <button type="button" onClick={openCreate} className="mt-5 flex min-h-32 w-full flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 text-center hover:border-red-300"><CalendarRange className="size-6 text-gray-400" /><span className="mt-2 text-sm font-semibold text-gray-800">Belum ada right issue yang dievaluasi</span><span className="mt-1 text-xs text-gray-500">Tambahkan hasil pelaksanaan untuk mulai mengukur realisasi katalis.</span></button>
      ) : (
        <div className="mt-5 overflow-hidden rounded-md border border-gray-200">
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1240px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Emiten</th><th className="px-4 py-3">Realisasi dana</th><th className="px-4 py-3">Penyerapan</th><th className="px-4 py-3">Dana / kontrol / waran</th><th className="px-4 py-3">Harga sebelum / sesudah</th><th className="px-4 py-3">1W / 1M / 3M</th><th className="w-24 px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-gray-100">{visibleTrackers.map((tracker) => <TrackerRow key={tracker.id} tracker={tracker} repeatChanges={changedCounts[tracker.ticker] ?? 0} history={histories[`${tracker.ticker}-${tracker.referenceDate}`]} onEdit={() => openEdit(tracker)} onDelete={() => setDeleteTarget(tracker)} />)}</tbody></table></div>
          <div className="divide-y divide-gray-200 lg:hidden">{visibleTrackers.map((tracker) => <TrackerCard key={tracker.id} tracker={tracker} repeatChanges={changedCounts[tracker.ticker] ?? 0} history={histories[`${tracker.ticker}-${tracker.referenceDate}`]} onEdit={() => openEdit(tracker)} onDelete={() => setDeleteTarget(tracker)} />)}</div>
          {visibleTrackers.length === 0 ? <div className="px-5 py-10 text-center text-sm text-gray-500">Tidak ada tracker yang cocok dengan filter.</div> : null}
        </div>
      )}

      {modalOpen ? <TrackerModal form={form} editing={Boolean(editingId)} saving={saving} onChange={updateForm} onClose={() => setModalOpen(false)} onSave={() => void save()} /> : null}
      {deleteTarget ? <ConfirmDelete ticker={deleteTarget.ticker} saving={saving} onClose={() => setDeleteTarget(null)} onConfirm={() => void remove()} /> : null}
    </section>
  );
}

function Summary({ label, value, className }: { label: string; value: string; className?: string }) {
  return <div className={cn("border-r border-gray-200 px-4 py-3 last:border-r-0", className)}><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-lg font-semibold text-gray-950">{value}</p></div>;
}

function Status({ value }: { value: TrackerStatus }) {
  const status = statusCopy[value];
  return <span className={cn("inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ring-inset", status.className)}>{status.label}</span>;
}

function Change({ value }: { value: number | null }) {
  return <span className={cn("font-semibold", value === null ? "text-gray-400" : value > 0 ? "text-emerald-700" : value < 0 ? "text-red-700" : "text-gray-600")}>{value === null ? "-" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`}</span>;
}

function monitorSignals(tracker: Tracker, currentPrice: number | null, currentDate: string | null) {
  const warrantDilution = tracker.warrantShares !== null && tracker.sharesAfter !== null && tracker.sharesAfter + tracker.warrantShares > 0
    ? (tracker.warrantShares / (tracker.sharesAfter + tracker.warrantShares)) * 100
    : null;
  const warrantActive = Boolean(currentDate && tracker.warrantStartDate && tracker.warrantEndDate && tracker.warrantStartDate <= currentDate && tracker.warrantEndDate >= currentDate);
  const warrantInMoney = currentPrice !== null && tracker.warrantExercisePrice !== null && currentPrice >= tracker.warrantExercisePrice;
  return {
    warrantDilution,
    warrantPressure: warrantActive && warrantInMoney,
    ownershipLabel: tracker.controlChanged ? "Kontrol berubah" : tracker.controllerBefore || tracker.controllerAfter ? "Kontrol tetap" : "Kontrol belum diisi",
    proceedsLabel: tracker.proceedsChanged ? "Alokasi berubah" : Object.values(tracker.proceedsActual).some((value) => value !== null) ? "Alokasi sesuai" : "Realisasi belum diisi",
  };
}

function Signal({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "risk" }) {
  return <span className={cn("inline-flex rounded px-2 py-1 text-[11px] font-semibold", tone === "risk" ? "bg-red-50 text-red-700" : tone === "good" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600")}>{label}</span>;
}

function TrackerRow({ tracker, repeatChanges, history, onEdit, onDelete }: { tracker: Tracker; repeatChanges: number; history?: PriceHistory; onEdit: () => void; onDelete: () => void }) {
  const metrics = priceMetrics(history?.rows ?? [], tracker.referenceDate);
  const funds = percent(tracker.actualFunds, tracker.targetFunds);
  const absorption = percent(tracker.subscribedShares, tracker.offeredShares);
  const signals = monitorSignals(tracker, metrics.current?.close ?? null, metrics.current?.date ?? null);
  return <tr className="align-top text-gray-700"><td className="px-4 py-4"><p className="font-semibold text-gray-950">{tracker.ticker}</p><p className="mt-0.5 max-w-44 truncate text-xs text-gray-500">{tracker.issuerName || "-"}</p><div className="mt-2"><Status value={tracker.status} /></div><p className="mt-1 text-[11px] text-gray-400">Acuan {formatDate(tracker.referenceDate)}</p></td><td className="px-4 py-4"><p className="font-semibold text-gray-900">{formatCurrency(tracker.actualFunds, true)}</p><p className="mt-1 text-xs text-gray-500">Target {formatCurrency(tracker.targetFunds, true)}</p><p className="mt-1 text-xs font-semibold text-gray-600">{funds === null ? "Belum dilaporkan" : `${funds.toFixed(1)}% tercapai`}</p></td><td className="px-4 py-4"><p className="font-semibold text-gray-900">{formatNumber(tracker.subscribedShares, true)} / {formatNumber(tracker.offeredShares, true)}</p><div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-red-500" style={{ width: `${Math.min(absorption ?? 0, 100)}%` }} /></div><p className="mt-1 text-xs text-gray-500">{absorption === null ? "Belum dilaporkan" : `${absorption.toFixed(1)}% terserap`}</p></td><td className="px-4 py-4"><div className="flex max-w-44 flex-wrap gap-1"><Signal label={repeatChanges > 1 ? `Alokasi berubah ${repeatChanges}x` : signals.proceedsLabel} tone={tracker.proceedsChanged ? "risk" : "neutral"} /><Signal label={signals.ownershipLabel} tone={tracker.controlChanged ? "risk" : "neutral"} />{signals.warrantDilution !== null ? <Signal label={`${signals.warrantPressure ? "Tekanan waran" : "Waran"} ${signals.warrantDilution.toFixed(1)}%`} tone={signals.warrantPressure ? "risk" : "neutral"} /> : <Signal label="Tanpa data waran" />}</div></td><td className="px-4 py-4"><p className="font-semibold text-gray-900">{formatCurrency(metrics.before?.close ?? null)} → {formatCurrency(metrics.after?.close ?? null)}</p><p className="mt-1 text-xs text-gray-500">{history?.error ?? history?.source ?? "Memuat Yahoo Finance..."}</p></td><td className="px-4 py-4"><div className="flex gap-3"><span><small className="block text-[10px] text-gray-400">1W</small><Change value={metrics.week} /></span><span><small className="block text-[10px] text-gray-400">1M</small><Change value={metrics.month} /></span><span><small className="block text-[10px] text-gray-400">3M</small><Change value={metrics.quarter} /></span></div></td><td className="px-4 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={onEdit} className="inline-flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label={`Edit ${tracker.ticker}`}><Pencil className="size-4" /></button><button type="button" onClick={onDelete} className="inline-flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus ${tracker.ticker}`}><Trash2 className="size-4" /></button></div></td></tr>;
}

function TrackerCard({ tracker, repeatChanges, history, onEdit, onDelete }: { tracker: Tracker; repeatChanges: number; history?: PriceHistory; onEdit: () => void; onDelete: () => void }) {
  const metrics = priceMetrics(history?.rows ?? [], tracker.referenceDate);
  const absorption = percent(tracker.subscribedShares, tracker.offeredShares);
  const signals = monitorSignals(tracker, metrics.current?.close ?? null, metrics.current?.date ?? null);
  return <article className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-gray-950">{tracker.ticker}</strong><Status value={tracker.status} /></div><p className="mt-1 text-xs text-gray-500">Acuan {formatDate(tracker.referenceDate)}</p></div><div className="flex"><button type="button" onClick={onEdit} className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label={`Edit ${tracker.ticker}`}><Pencil className="size-4" /></button><button type="button" onClick={onDelete} className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus ${tracker.ticker}`}><Trash2 className="size-4" /></button></div></div><div className="mt-3 flex flex-wrap gap-1"><Signal label={repeatChanges > 1 ? `Alokasi berubah ${repeatChanges}x` : signals.proceedsLabel} tone={tracker.proceedsChanged ? "risk" : "neutral"} /><Signal label={signals.ownershipLabel} tone={tracker.controlChanged ? "risk" : "neutral"} />{signals.warrantDilution !== null ? <Signal label={`${signals.warrantPressure ? "Tekanan waran" : "Dilusi waran"} ${signals.warrantDilution.toFixed(1)}%`} tone={signals.warrantPressure ? "risk" : "neutral"} /> : null}</div><div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><Mini label="Realisasi dana" value={`${formatCurrency(tracker.actualFunds, true)} / ${formatCurrency(tracker.targetFunds, true)}`} /><Mini label="Penyerapan" value={absorption === null ? "-" : `${absorption.toFixed(1)}%`} /><Mini label="Harga sebelum / sesudah" value={`${formatCurrency(metrics.before?.close ?? null)} / ${formatCurrency(metrics.after?.close ?? null)}`} /><Mini label="Saham beredar" value={`${formatNumber(tracker.sharesBefore, true)} → ${formatNumber(tracker.sharesAfter, true)}`} /></div><div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3 text-xs sm:flex-row sm:items-center sm:justify-between"><span className="text-gray-500">Performa dari harga sebelum RI</span><div className="flex gap-3"><span>1W <Change value={metrics.week} /></span><span>1M <Change value={metrics.month} /></span><span>3M <Change value={metrics.quarter} /></span></div></div></article>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-semibold text-gray-900">{value}</p></div>;
}

function Input({ label, value, onChange, type = "text", placeholder, numeric = false }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "date"; placeholder?: string; numeric?: boolean }) {
  return <label className="grid gap-1.5 text-sm font-medium text-gray-700"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={numeric ? "decimal" : undefined} className="h-11 min-w-0 rounded-md border border-gray-200 px-3 text-sm text-gray-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>;
}

function TrackerModal({ form, editing, saving, onChange, onClose, onSave }: { form: TrackerForm; editing: boolean; saving: boolean; onChange: (key: keyof TrackerForm, value: string) => void; onClose: () => void; onSave: () => void }) {
  const [tab, setTab] = useState<"result" | "proceeds" | "ownership" | "warrant">("result");
  const tabs = [
    { value: "result" as const, label: "Realisasi", icon: Activity },
    { value: "proceeds" as const, label: "Dana", icon: CircleDollarSign },
    { value: "ownership" as const, label: "Ownership", icon: Landmark },
    { value: "warrant" as const, label: "Waran", icon: ShieldAlert },
  ];
  const warrantShares = numberInput(form.warrantShares);
  const sharesAfter = numberInput(form.sharesAfter);
  const warrantDilution = warrantShares !== null && sharesAfter !== null && warrantShares + sharesAfter > 0 ? (warrantShares / (warrantShares + sharesAfter)) * 100 : null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-gray-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={editing ? "Edit tracker right issue" : "Tambah tracker right issue"}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-lg bg-white shadow-xl sm:max-w-3xl sm:rounded-lg">
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div><h3 className="text-lg font-semibold text-gray-950">{editing ? "Edit hasil right issue" : "Tambah post-right issue"}</h3><p className="mt-1 text-xs text-gray-500">Evaluasi pelaksanaan, penggunaan dana, kontrol, dan potensi dilusi lanjutan.</p></div>
          <button type="button" onClick={onClose} className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label="Tutup"><X className="size-5" /></button>
        </div>

        <div className="shrink-0 overflow-x-auto border-b border-gray-200 bg-gray-50 p-2">
          <div className="grid min-w-[440px] grid-cols-4 gap-1">
            {tabs.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => setTab(value)} className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold", tab === value ? "bg-white text-red-700 shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-white/70")}><Icon className="size-4" />{label}</button>)}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "result" ? (
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2"><Input label="Kode ticker" value={form.ticker} onChange={(value) => onChange("ticker", value)} placeholder="Contoh CBRE" /><Input label="Nama emiten" value={form.issuerName} onChange={(value) => onChange("issuerName", value)} placeholder="Opsional" /><Input label="Tanggal distribusi / acuan" type="date" value={form.referenceDate} onChange={(value) => onChange("referenceDate", value)} /><SelectField label="Status pelaksanaan" value={form.status} onChange={(value) => onChange("status", value)} options={[{ value: "planned", label: "Menunggu pelaksanaan" }, { value: "ongoing", label: "Sedang berjalan" }, { value: "completed", label: "Selesai" }]} /></div>
              <div className="border-t border-gray-200 pt-5"><h4 className="mb-3 text-sm font-semibold text-gray-950">Dana dan penyerapan</h4><div className="grid gap-4 sm:grid-cols-2"><Input numeric label="Target dana (Rp)" value={form.targetFunds} onChange={(value) => onChange("targetFunds", value)} placeholder="Dari prospektus" /><Input numeric label="Dana berhasil dihimpun (Rp)" value={form.actualFunds} onChange={(value) => onChange("actualFunds", value)} placeholder="Dari hasil pelaksanaan" /><Input numeric label="Saham ditawarkan" value={form.offeredShares} onChange={(value) => onChange("offeredShares", value)} placeholder="Lembar" /><Input numeric label="Saham terserap" value={form.subscribedShares} onChange={(value) => onChange("subscribedShares", value)} placeholder="Lembar" /></div></div>
              <div className="border-t border-gray-200 pt-5"><h4 className="mb-3 text-sm font-semibold text-gray-950">Perubahan saham beredar</h4><div className="grid gap-4 sm:grid-cols-2"><Input numeric label="Saham beredar sebelum" value={form.sharesBefore} onChange={(value) => onChange("sharesBefore", value)} placeholder="Lembar" /><Input numeric label="Saham beredar sesudah" value={form.sharesAfter} onChange={(value) => onChange("sharesAfter", value)} placeholder="Lembar" /></div></div>
              <TextArea label="Catatan realisasi katalis" value={form.notes} onChange={(value) => onChange("notes", value)} placeholder="Dampak aksi terhadap bisnis atau harga saham" />
            </div>
          ) : null}

          {tab === "proceeds" ? (
            <div className="grid gap-5">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(100px,0.7fr)_minmax(100px,0.7fr)] gap-2 border-b border-gray-200 pb-2 text-xs font-semibold uppercase text-gray-500"><span>Kategori</span><span>Rencana</span><span>Realisasi</span></div>
              <div className="grid gap-3">{allocationFields.map((field) => <div key={field.category} className="grid grid-cols-[minmax(0,1fr)_minmax(100px,0.7fr)_minmax(100px,0.7fr)] items-center gap-2"><span className="text-sm font-medium text-gray-700">{field.label}</span><input value={form[field.plan]} onChange={(event) => onChange(field.plan, event.target.value)} inputMode="decimal" aria-label={`Rencana ${field.label}`} placeholder="Rp" className="h-10 min-w-0 rounded-md border border-gray-200 px-2 text-sm outline-none focus:border-red-500" /><input value={form[field.actual]} onChange={(event) => onChange(field.actual, event.target.value)} inputMode="decimal" aria-label={`Realisasi ${field.label}`} placeholder="Rp" className="h-10 min-w-0 rounded-md border border-gray-200 px-2 text-sm outline-none focus:border-red-500" /></div>)}</div>
              <div className="grid gap-4 border-t border-gray-200 pt-5 sm:grid-cols-2"><SelectField label="Perubahan penggunaan dana" value={form.proceedsChanged} onChange={(value) => onChange("proceedsChanged", value)} options={[{ value: "no", label: "Tidak berubah" }, { value: "yes", label: "Berubah dari prospektus" }]} /><div className="text-sm text-gray-600"><p className="font-medium text-gray-700">Total teralokasi</p><p className="mt-2 text-lg font-semibold text-gray-950">{formatCurrency(allocationFields.reduce((total, field) => total + (numberInput(form[field.actual]) ?? 0), 0), true)}</p></div></div>
              {form.proceedsChanged === "yes" ? <TextArea label="Alasan dan kronologi perubahan" value={form.proceedsChangeReason} onChange={(value) => onChange("proceedsChangeReason", value)} placeholder="Tanggal persetujuan dan alasan perubahan" /> : null}
            </div>
          ) : null}

          {tab === "ownership" ? (
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2"><Input label="Pengendali sebelum aksi" value={form.controllerBefore} onChange={(value) => onChange("controllerBefore", value)} /><Input label="Pengendali sesudah aksi" value={form.controllerAfter} onChange={(value) => onChange("controllerAfter", value)} /><SelectField label="Perubahan pengendali" value={form.controlChanged} onChange={(value) => onChange("controlChanged", value)} options={[{ value: "no", label: "Tidak berubah" }, { value: "yes", label: "Berubah / berpotensi berubah" }]} /><Input label="Pembeli siaga" value={form.standbyBuyerName} onChange={(value) => onChange("standbyBuyerName", value)} placeholder="Nama pihak" /><Input numeric label="Komitmen pembeli siaga" value={form.standbyBuyerCommitment} onChange={(value) => onChange("standbyBuyerCommitment", value)} placeholder="Lembar saham" /></div>
              <div className="grid gap-4 border-t border-gray-200 pt-5 sm:grid-cols-2"><TextArea label="Struktur sebelum aksi" value={form.ownershipBefore} onChange={(value) => onChange("ownershipBefore", value)} placeholder={"Nama pemegang | 55,20%\nPublik | 44,80%"} /><TextArea label="Struktur sesudah aksi" value={form.ownershipAfter} onChange={(value) => onChange("ownershipAfter", value)} placeholder={"Nama pemegang | 40,10%\nPembeli siaga | 30,00%"} /></div>
            </div>
          ) : null}

          {tab === "warrant" ? (
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2"><Input numeric label="Jumlah waran beredar" value={form.warrantShares} onChange={(value) => onChange("warrantShares", value)} placeholder="Lembar" /><Input numeric label="Harga pelaksanaan waran" value={form.warrantExercisePrice} onChange={(value) => onChange("warrantExercisePrice", value)} placeholder="Rp" /><Input type="date" label="Awal pelaksanaan" value={form.warrantStartDate} onChange={(value) => onChange("warrantStartDate", value)} /><Input type="date" label="Akhir pelaksanaan" value={form.warrantEndDate} onChange={(value) => onChange("warrantEndDate", value)} /></div>
              <div className={cn("border-l-2 px-4 py-2", (warrantDilution ?? 0) >= 15 ? "border-red-500" : "border-gray-300")}><p className="text-xs font-medium text-gray-500">Potensi dilusi tambahan</p><p className={cn("mt-1 text-2xl font-semibold", (warrantDilution ?? 0) >= 15 ? "text-red-700" : "text-gray-950")}>{warrantDilution === null ? "-" : `${warrantDilution.toFixed(2)}%`}</p><p className="mt-1 text-xs leading-5 text-gray-500">Dihitung terhadap saham beredar sesudah right issue jika seluruh waran dieksekusi.</p></div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4"><button type="button" onClick={onClose} className="h-10 rounded-md border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50">Batal</button><button type="button" onClick={onSave} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Simpan tracker</button></div>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label className="grid gap-1.5 text-sm font-medium text-gray-700"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-0 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-950 outline-none focus:border-red-500">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="grid gap-1.5 text-sm font-medium text-gray-700"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} placeholder={placeholder} className="min-h-24 resize-y rounded-md border border-gray-200 p-3 text-sm text-gray-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>;
}

function ConfirmDelete({ ticker, saving, onClose, onConfirm }: { ticker: string; saving: boolean; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/45 p-5 backdrop-blur-sm" role="alertdialog" aria-modal="true"><div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"><div className="flex size-10 items-center justify-center rounded-md bg-red-50 text-red-700"><Trash2 className="size-5" /></div><h3 className="mt-4 text-lg font-semibold text-gray-950">Hapus tracker {ticker}?</h3><p className="mt-2 text-sm leading-6 text-gray-600">Data realisasi dan benchmark right issue ini akan dihapus dari database.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-md border border-gray-200 px-4 text-sm font-semibold text-gray-700">Batal</button><button type="button" onClick={onConfirm} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="size-4 animate-spin" /> : null}Hapus</button></div></div></div>;
}
