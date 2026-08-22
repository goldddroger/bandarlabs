import { corporateActionTypes } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const sectors = [
  "Semua Sektor",
  "Basic Materials",
  "Consumer Cyclicals",
  "Consumer Non-Cyclicals",
  "Energy",
  "Financials",
  "Healthcare",
  "Industrials",
  "Infrastructure",
  "Properties",
  "Technology",
  "Transportation",
];

export function CorporateActionSidebar() {
  return (
    <aside className="grid gap-4 xl:w-60 xl:shrink-0">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-gray-950">Jenis Corporate Action</h2>
        <div className="grid gap-1">
          {corporateActionTypes.map(([label, count]) => {
            const active = label === "Dividen Tunai";

            return (
              <button
                key={label}
                className={cn(
                  "flex h-8 items-center justify-between rounded-md px-2 text-left text-sm text-gray-700 transition duration-150 hover:bg-gray-50",
                  active && "bg-red-50 font-semibold text-red-700 hover:bg-red-50",
                )}
                type="button"
              >
                <span>{label}</span>
                <span
                  className={cn(
                    "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600",
                    active && "bg-red-100 text-red-700",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <Button variant="outline" className="mt-4 w-full">
          Lihat Semua
        </Button>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-gray-950">Filter Tambahan</h2>
        <form className="grid gap-4">
          <Select label="Sektor">
            {sectors.map((sector) => (
              <option key={sector}>{sector}</option>
            ))}
          </Select>
          <Select label="Tipe Emiten">
            {["Semua", "Main Board", "Development Board", "New Economy Board"].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
          <Select label="Tipe Dividen">
            {["Semua", "Interim", "Final", "Special"].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
          <div className="flex items-center gap-3">
            <Button type="button" className="h-9 px-3 text-xs">
              Terapkan Filter
            </Button>
            <button className="text-sm font-medium text-red-600 hover:text-red-700" type="reset">
              Reset
            </button>
          </div>
        </form>
      </section>
    </aside>
  );
}
