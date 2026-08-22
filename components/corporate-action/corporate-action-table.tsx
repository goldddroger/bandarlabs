"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { dividendRows } from "@/lib/data";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SortKey = "number" | "subject" | "date";

export function CorporateActionTable() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [ascending, setAscending] = useState(false);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = dividendRows.filter((row) =>
      [row.number, row.subject, row.date].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );

    return filtered.sort((first, second) => {
      const direction = ascending ? 1 : -1;
      return first[sortKey].localeCompare(second[sortKey], "id-ID") * direction;
    });
  }, [ascending, query, sortKey]);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setAscending((value) => !value);
      return;
    }

    setSortKey(nextKey);
    setAscending(true);
  }

  return (
    <section>
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Tampilkan</span>
          <Select aria-label="Jumlah data" defaultValue="10" className="h-9 w-20">
            {["10", "25", "50", "100"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
          <span>data</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600" htmlFor="table-search">
          <span>Cari:</span>
          <span className="relative block w-full md:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              id="table-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari emiten / kode / judul..."
              className="h-10 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm transition duration-150 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </span>
        </label>
      </div>

      <div className="bandarlab-scrollbar overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-[820px] w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-red-600 text-white">
            <tr>
              <SortableHead active={sortKey === "number"} onClick={() => toggleSort("number")}>
                Nomor Surat
              </SortableHead>
              <SortableHead active={sortKey === "subject"} onClick={() => toggleSort("subject")}>
                Perihal
              </SortableHead>
              <SortableHead active={sortKey === "date"} onClick={() => toggleSort("date")} className="w-44">
                Tanggal
              </SortableHead>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.number}
                className={cn(
                  "border-b border-gray-100 transition duration-150 hover:bg-red-50/60",
                  index % 2 === 1 ? "bg-gray-50" : "bg-white",
                )}
              >
                <td className="whitespace-nowrap px-4 py-4 align-top font-medium text-red-600">
                  <button
                    className="inline-flex items-center gap-2 rounded text-left transition duration-150 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500"
                    type="button"
                    onClick={() => toast.info("Dokumen belum tersedia pada mode demo.")}
                  >
                    {row.number}
                    <FileText className="size-4" />
                  </button>
                </td>
                <td className="px-4 py-4 leading-6 text-gray-700">{row.subject}</td>
                <td className="whitespace-nowrap px-4 py-4 text-gray-700">{row.date}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={3}>
                  Tidak ada dokumen yang cocok dengan pencarian.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
        <p>Menampilkan 1 sampai {rows.length || 0} dari 128 data</p>
        <div className="flex flex-wrap items-center gap-1">
          <button className="h-9 rounded-md border border-gray-200 px-3 text-gray-400" disabled type="button">
            Sebelumnya
          </button>
          {["1", "2", "3", "...", "13"].map((page) => (
            <button
              key={page}
              className={cn(
                "h-9 min-w-9 rounded-md border border-gray-200 px-3 text-gray-700 transition duration-150 hover:bg-gray-50",
                page === "1" && "border-red-600 bg-red-600 text-white hover:bg-red-700",
                page === "..." && "cursor-default border-transparent hover:bg-transparent",
              )}
              type="button"
            >
              {page}
            </button>
          ))}
          <button className="h-9 rounded-md border border-gray-200 px-3 text-gray-700 hover:bg-gray-50" type="button">
            Selanjutnya
          </button>
        </div>
      </div>
    </section>
  );
}

function SortableHead({
  children,
  onClick,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  className?: string;
}) {
  return (
    <th className={cn("border-r border-red-500/40 px-4 py-3 last:border-r-0", className)} scope="col">
      <button
        className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold"
        type="button"
        onClick={onClick}
        aria-pressed={active}
      >
        {children}
        <ArrowUpDown className="size-4 opacity-80" />
      </button>
    </th>
  );
}
