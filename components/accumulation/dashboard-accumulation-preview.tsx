"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { signalLabel, trendLabel, useSelectedAccumulationRows } from "@/components/accumulation/accumulation-store";
import { cn } from "@/lib/utils";

function signalBadgeClass(signalType: "accumulation" | "watchlist" | "hold") {
  if (signalType === "accumulation") return "bg-green-50 text-green-700";
  if (signalType === "hold") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

export function DashboardAccumulationPreview() {
  const selectedRows = useSelectedAccumulationRows();

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-medium text-gray-600">{selectedRows.length} saham dipantau</p>
        <Link
          href="/accumulation"
          className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 transition duration-150 hover:text-red-700"
        >
          Kelola
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <div className="bandarlab-scrollbar overflow-x-auto">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {["Stock", "Status", "Trend", "Masuk Radar"].map((head) => (
                <th key={head} className="px-4 py-3 font-semibold">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selectedRows.slice(0, 6).map((row) => (
              <tr key={row.stock} className="border-t border-gray-100 transition duration-150 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/stocks/${row.stock}`} className="font-semibold text-red-700 hover:underline">
                    {row.stock}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
                      signalBadgeClass(row.signalType),
                    )}
                  >
                    {signalLabel(row.signalType)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
                      row.trend === "uptrend"
                        ? "bg-green-50 text-green-700"
                        : row.trend === "downtrend"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {trendLabel(row.trend)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{row.addedAt}</td>
              </tr>
            ))}
            {selectedRows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={4}>
                  Belum ada saham di radar. Tambahkan dari halaman Accumulation Radar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
