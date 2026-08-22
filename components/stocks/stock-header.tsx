import { cn } from "@/lib/utils";

export function StockHeader({
  ticker,
  name,
  price,
  changePercent,
  priceSource,
  updatedAt,
}: {
  ticker: string;
  name: string;
  price: string;
  changePercent: string;
  priceSource?: string;
  updatedAt?: string;
}) {
  const hasPrice = price !== "-";

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold text-gray-950">{ticker}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{name}</p>
      </div>
      <div className="text-left md:text-right">
        <p className="text-3xl font-semibold text-gray-950">{hasPrice ? price : "N/A"}</p>
        {hasPrice ? (
          <p className={cn("mt-1 text-sm font-semibold", changePercent.startsWith("-") ? "text-red-700" : "text-green-700")}>
            {changePercent}
          </p>
        ) : (
          <p className="mt-1 text-sm font-medium text-gray-500">Harga belum tersedia</p>
        )}
        {priceSource ? (
          <p className="mt-2 text-xs font-medium text-gray-500">
            {priceSource}
            {updatedAt ? ` · ${updatedAt}` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
