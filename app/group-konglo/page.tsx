import { KongloGroupsView, type KongloGroupViewRow } from "@/components/group-konglo/konglo-groups-view";
import { getIdxStockScreenerRow, idxStockScreenerRows } from "@/lib/idx-stock-screener";
import { kongloGroups } from "@/lib/konglo-groups";

function formatCompactCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";

  if (value >= 1_000_000_000_000) return `Rp ${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(2)}M`;
  return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
}

export default function GroupKongloPage() {
  const groups: KongloGroupViewRow[] = kongloGroups.map((group) => {
    const tickers = group.tickers.map((ticker) => {
      const screener = getIdxStockScreenerRow(ticker);
      return {
        ticker,
        name: screener?.name ?? "Belum ada data screener",
        marketCap: screener?.marketCap ?? 0,
      };
    });
    const marketCap = tickers.reduce((total, stock) => total + stock.marketCap, 0);

    return {
      name: group.name,
      description: group.description,
      tickers: tickers.map((stock) => ({
        ticker: stock.ticker,
        name: stock.name,
      })),
      marketCap: formatCompactCurrency(marketCap || null),
    };
  });
  const totalTickers = groups.reduce((total, group) => total + group.tickers.length, 0);
  const groupsWithTickers = groups.filter((group) => group.tickers.length > 0).length;
  const stockLookup = Object.fromEntries(
    idxStockScreenerRows.map((stock) => [
      stock.ticker,
      {
        name: stock.name,
        marketCap: stock.marketCap ?? 0,
      },
    ]),
  );

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-gray-950">Group Konglo</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Pantauan tematik konglomerasi dan ekosistem saham. Tampilan dibuat padat agar ticker cepat discan dan langsung bisa dibuka ke detail saham.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Group" value={groups.length.toString()} />
          <Metric label="Ada Ticker" value={groupsWithTickers.toString()} />
          <Metric label="Ticker" value={totalTickers.toString()} />
        </div>
      </div>

      <KongloGroupsView groups={groups} stockLookup={stockLookup} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-950">{value}</p>
    </div>
  );
}
