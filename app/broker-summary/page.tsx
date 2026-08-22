import { BrokerSummaryLookup } from "@/components/broker/broker-summary-lookup";
import { PlaceholderPage } from "@/components/ui/page-shell";

export default function BrokerSummaryPage() {
  return (
    <PlaceholderPage
      title="Broker Summary"
      description="Buka halaman emiten di Stockbit untuk melihat broker summary dan informasi transaksi terkini."
    >
      <BrokerSummaryLookup />
    </PlaceholderPage>
  );
}
