export function StockMetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-gray-950">{value}</p>
      {detail ? <p className="mt-2 text-sm font-medium text-red-600">{detail}</p> : null}
    </section>
  );
}
