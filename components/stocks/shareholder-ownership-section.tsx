import {
  ShareholderFivePercentRow,
  ShareholderOnePercentRow,
} from "@/lib/shareholder-ownership";

function formatShares(shares: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(shares);
}

function formatPercent(percentage: number) {
  return `${percentage.toFixed(2)}%`;
}

function OwnershipSummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-gray-950">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

function EmptyOwnershipState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
      Belum ada data {label} untuk saham ini.
    </div>
  );
}

function FivePercentTable({ rows }: { rows: readonly ShareholderFivePercentRow[] }) {
  if (rows.length === 0) return <EmptyOwnershipState label="pemegang saham di atas 5%" />;

  return (
    <div className="bandarlab-scrollbar overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-[920px] w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            {["Pemegang Saham", "Pemegang Rekening", "Domisili", "Status", "Saham", "Persentase", "Perubahan"].map((head) => (
              <th key={head} className="px-4 py-3 font-semibold">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.ticker}-${row.shareholderName}-${row.accountHolder}`} className="border-t border-gray-100">
              <td className="px-4 py-3 font-semibold text-gray-950">{row.shareholderName}</td>
              <td className="px-4 py-3 text-gray-600">{row.accountHolder || "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{row.domicile || "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{row.localForeign || "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatShares(row.shares)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-950">{formatPercent(row.percentage)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatShares(row.change)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OnePercentTable({ rows }: { rows: readonly ShareholderOnePercentRow[] }) {
  if (rows.length === 0) return <EmptyOwnershipState label="pemegang saham di atas 1%" />;

  return (
    <div className="bandarlab-scrollbar overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-[1040px] w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            {["Investor", "Klasifikasi", "Domisili", "Status", "Scripless", "Scrip", "Total Saham", "Persentase"].map((head) => (
              <th key={head} className="px-4 py-3 font-semibold">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.ticker}-${row.investorName}-${row.shares}`} className="border-t border-gray-100">
              <td className="px-4 py-3 font-semibold text-gray-950">{row.investorName}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{row.classification || "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{row.domicile || "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{row.localForeign || "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatShares(row.scriplessShares)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatShares(row.scripShares)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatShares(row.shares)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-950">{formatPercent(row.percentage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ShareholderOwnershipSection({
  onePercentRows,
  fivePercentRows,
}: {
  onePercentRows: readonly ShareholderOnePercentRow[];
  fivePercentRows: readonly ShareholderFivePercentRow[];
}) {
  const onePercentTotal = onePercentRows.reduce((total, row) => total + row.percentage, 0);
  const fivePercentTotal = fivePercentRows.reduce((total, row) => total + row.percentage, 0);
  const scriplessTotal = onePercentRows.reduce((total, row) => total + row.scriplessShares, 0);
  const scripTotal = onePercentRows.reduce((total, row) => total + row.scripShares, 0);

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-950">Struktur Kepemilikan</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Data pemegang saham di atas 1% dan di atas 5% dari file KSEI yang kamu lampirkan. Ini membantu membaca siapa investor besar yang sedang memegang saham tersebut.
          </p>
        </div>
        <span className="w-fit rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
          1% per 31 Jul 2026 · 5% per 13 Aug 2026
        </span>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OwnershipSummaryCard label="Investor 1%+" value={`${onePercentRows.length}`} detail={`${formatPercent(onePercentTotal)} total tercatat`} />
        <OwnershipSummaryCard label="Investor 5%+" value={`${fivePercentRows.length}`} detail={`${formatPercent(fivePercentTotal)} total tercatat`} />
        <OwnershipSummaryCard label="Scripless 1%+" value={formatShares(scriplessTotal)} detail="Total saham tanpa warkat" />
        <OwnershipSummaryCard label="Scrip 1%+" value={formatShares(scripTotal)} detail="Total saham warkat" />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <OwnershipSummaryCard
          label="Terbesar 1%+"
          value={onePercentRows[0] ? formatPercent(onePercentRows[0].percentage) : "-"}
          detail={onePercentRows[0]?.investorName ?? "Belum tersedia"}
        />
        <OwnershipSummaryCard
          label="Terbesar 5%+"
          value={fivePercentRows[0] ? formatPercent(fivePercentRows[0].percentage) : "-"}
          detail={fivePercentRows[0]?.shareholderName ?? "Belum tersedia"}
        />
      </div>

      <div className="grid min-w-0 gap-5">
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-gray-950">Pemegang Saham Di Atas 5%</h3>
          <FivePercentTable rows={fivePercentRows} />
        </div>
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-gray-950">Pemegang Saham Di Atas 1%</h3>
          <OnePercentTable rows={onePercentRows} />
        </div>
      </div>
    </section>
  );
}
