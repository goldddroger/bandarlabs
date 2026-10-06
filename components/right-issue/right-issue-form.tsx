import { CalendarDays } from "lucide-react";
import type { RightIssueDraft } from "@/types/right-issue";
import { formatLots, formatSimulationInput, parseSimulationNumber } from "@/lib/calculations/right-issue-format";

type Props = { draft: RightIssueDraft; onChange: (key: keyof RightIssueDraft, value: string) => void };

export function RightIssueForm({ draft, onChange }: Props) {
  const shares = parseSimulationNumber(draft.ownedShares);
  function field(key: keyof RightIssueDraft, label: string, options: { prefix?: string; suffix?: string; integer?: boolean; placeholder?: string } = {}) {
    return <label className="grid min-w-0 gap-1.5 text-sm font-medium text-gray-700" htmlFor={`ri-${key}`}>
      <span>{label}</span>
      <span className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100">
        {options.prefix ? <span className="shrink-0 text-xs text-gray-500">{options.prefix}</span> : null}
        <input id={`ri-${key}`} value={draft[key]} inputMode={options.integer ? "numeric" : "decimal"} autoComplete="off" placeholder={options.placeholder ?? "0"} onChange={(event) => onChange(key, formatSimulationInput(event.target.value, options.integer))} className="w-full min-w-0 bg-transparent text-sm tabular-nums text-gray-950 outline-none" />
        {options.suffix ? <span className="shrink-0 text-xs text-gray-500">{options.suffix}</span> : null}
      </span>
    </label>;
  }
  return <div className="min-w-0 divide-y divide-gray-200 border-y border-gray-200">
    <fieldset className="py-5">
      <legend className="float-left mb-4 w-full text-base font-semibold text-gray-950">Posisi Saya</legend>
      <div className="clear-both grid gap-4 sm:grid-cols-2">
        <label htmlFor="ri-ticker" className="grid gap-1.5 text-sm font-medium text-gray-700">Ticker<input id="ri-ticker" value={draft.ticker} placeholder="Contoh WMPP" maxLength={12} onChange={(event) => onChange("ticker", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} className="h-11 min-w-0 rounded-md border border-gray-300 px-3 text-sm text-gray-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>
        {field("ownedShares", "Jumlah saham", { suffix: "saham", integer: true, placeholder: "3.000.000" })}
        {field("averageBuy", "Average buy", { prefix: "Rp", placeholder: "27" })}
        {field("cumPrice", "Harga saham cum-right (asumsi)", { prefix: "Rp", placeholder: "30" })}
      </div>
      {Number.isFinite(shares) && shares >= 0 ? <p className="mt-2 text-xs text-gray-500">{draft.ownedShares} saham = {formatLots(shares)}</p> : null}
    </fieldset>
    <fieldset className="py-5">
      <legend className="float-left mb-4 w-full text-base font-semibold text-gray-950">Informasi Right Issue</legend>
      <div className="clear-both grid gap-4 sm:grid-cols-2">
        {field("ratioOld", "Setiap saham lama", { suffix: "saham", placeholder: "5" })}
        {field("ratioNew", "Memperoleh HMETD", { suffix: "hak", placeholder: "2" })}
        {field("subscriptionPrice", "Harga pelaksanaan", { prefix: "Rp", placeholder: "50" })}
        {field("marketRightsPrice", "Harga HMETD di pasar (opsional)", { prefix: "Rp", placeholder: "3" })}
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500">Satu HMETD diasumsikan memberi hak membeli satu saham baru. Harga HMETD di pasar dapat berbeda dari nilai intrinsik teoritis.</p>
    </fieldset>
    <details className="py-5">
      <summary className="cursor-pointer text-sm font-semibold text-gray-950"><CalendarDays className="mr-2 inline size-4 text-gray-500" />Corporate Action Schedule <span className="font-normal text-gray-500">(opsional)</span></summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{([
        ["cumDate", "Cum date"], ["exDate", "Ex date"], ["recordingDate", "Recording date"], ["tradingStart", "Perdagangan HMETD mulai"], ["tradingEnd", "Perdagangan HMETD selesai"], ["subscriptionDeadline", "Batas penebusan"],
      ] as const).map(([key, label]) => <label key={key} htmlFor={`ri-${key}`} className="grid min-w-0 gap-1.5 text-xs font-medium text-gray-700">{label}<input id={`ri-${key}`} type="date" value={draft[key]} onChange={(event) => onChange(key, event.target.value)} className="h-11 w-full min-w-0 max-w-full rounded-md border border-gray-300 bg-white px-3 text-sm" /></label>)}</div>
    </details>
  </div>;
}
