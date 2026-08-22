import { Activity, BarChart3, ExternalLink, SlidersHorizontal } from "lucide-react";
import { PlaceholderPage } from "@/components/ui/page-shell";

const screenerSources = [
  {
    name: "NeoBDM Market Summary",
    description: "Lihat ringkasan kondisi pasar dan hasil pemindaian untuk membaca momentum secara cepat.",
    href: "https://neobdm.tech/new-market-summary/",
    label: "Ringkasan pasar",
    icon: BarChart3,
    accent: "bg-red-50 text-red-700",
  },
  {
    name: "Stockbit Screener",
    description: "Saring saham memakai preset atau kriteria fundamental, valuasi, teknikal, dan momentum.",
    href: "https://stockbit.com/screener",
    label: "Fundamental & teknikal",
    icon: SlidersHorizontal,
    accent: "bg-emerald-50 text-emerald-700",
  },
  {
    name: "Axentraz Broker Activity",
    description: "Pantau pergerakan dan aktivitas broker untuk mencari indikasi akumulasi atau distribusi.",
    href: "https://axentraz.id/broker-activity",
    label: "Aktivitas broker",
    icon: Activity,
    accent: "bg-blue-50 text-blue-700",
  },
] as const;

export default function StockScreenerPage() {
  return (
    <PlaceholderPage
      title="Stock Screener"
      description="Pilih alat sesuai jenis analisis yang ingin dilakukan. Hasil screener adalah bahan shortlist, bukan sinyal transaksi."
    >
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-gray-950">Sumber analisis eksternal</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Setiap alat dibuka di tab baru. Login dan akses premium mengikuti ketentuan penyedia.
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {screenerSources.map((source) => {
            const Icon = source.icon;

            return (
              <div
                key={source.name}
                className="grid gap-4 px-4 py-5 transition-colors hover:bg-gray-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
              >
                <div className="flex min-w-0 gap-4">
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-md ${source.accent}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-gray-950">{source.name}</h2>
                      <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        {source.label}
                      </span>
                    </div>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-600">{source.description}</p>
                  </div>
                </div>

                <a
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 sm:w-auto"
                >
                  Buka alat
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </PlaceholderPage>
  );
}
