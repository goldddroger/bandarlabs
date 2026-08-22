import { accumulationRows } from "@/lib/data";
import { cn } from "@/lib/utils";

function scoreLabel(score: number) {
  if (score >= 90) return "Extreme Accumulation";
  if (score >= 75) return "Strong Accumulation";
  if (score >= 60) return "Accumulation";
  if (score >= 40) return "Early Interest";
  return "No Accumulation";
}

export function AccumulationTable() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            {["Stock", "Score", "1M", "3M", "6M", "Trend"].map((head) => (
              <th key={head} className="px-4 py-3 font-semibold">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {accumulationRows.map((row) => (
            <tr key={row.stock} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold text-gray-950">{row.stock}</td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    row.score >= 75 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700",
                  )}
                >
                  {row.score}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-700">{row.oneMonth}</td>
              <td className="px-4 py-3 text-gray-700">{row.threeMonth}</td>
              <td className="px-4 py-3 text-gray-700">{row.sixMonth}</td>
              <td className="px-4 py-3 text-gray-600">{scoreLabel(row.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
