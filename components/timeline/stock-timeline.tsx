import { timelineEvents } from "@/lib/data";

export type StockTimelineItem = {
  date: string;
  title: string;
  description: string;
  source?: string;
};

export function StockTimeline({ events }: { events?: StockTimelineItem[] }) {
  const items: StockTimelineItem[] = events ?? timelineEvents.map(([date, title]) => ({
    date,
    title,
    description: "Event demo untuk memetakan perubahan penting pada emiten.",
  }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <ol className="relative border-l border-gray-200 pl-6">
        {items.map((item) => (
          <li key={`${item.date}-${item.title}`} className="mb-7 last:mb-0">
            <span className="absolute -left-[7px] mt-1 size-3 rounded-full border-2 border-white bg-red-600" />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase text-gray-500">{item.date}</p>
              {item.source ? <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{item.source}</span> : null}
            </div>
            <h3 className="mt-1 text-sm font-semibold text-gray-950">{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-gray-600">{item.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
