import { brokerRows } from "@/lib/data";

export function BrokerSummaryTable() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            {["Broker", "Net Buy", "Average Price", "Buy Days", "Consistency"].map((head) => (
              <th key={head} className="px-4 py-3 font-semibold">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {brokerRows.map((row) => (
            <tr key={row.broker} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold text-gray-950">{row.broker}</td>
              <td className="px-4 py-3 font-medium text-green-700">{row.netBuy}</td>
              <td className="px-4 py-3 text-gray-700">{row.averagePrice}</td>
              <td className="px-4 py-3 text-gray-700">{row.buyDays}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-28 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-red-600" style={{ width: `${row.consistency}%` }} />
                  </div>
                  <span className="text-gray-700">{row.consistency}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
