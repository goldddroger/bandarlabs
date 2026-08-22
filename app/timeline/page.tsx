import { StockTimeline } from "@/components/timeline/stock-timeline";
import { PlaceholderPage } from "@/components/ui/page-shell";

export default function TimelinePage() {
  return (
    <PlaceholderPage title="Stock Timeline" description="Timeline demo untuk kejadian penting emiten dan sinyal BandarLab.">
      <StockTimeline />
    </PlaceholderPage>
  );
}
