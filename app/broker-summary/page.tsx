import { BrokerSummaryLookup } from "@/components/broker/broker-summary-lookup";
import { PlaceholderPage } from "@/components/ui/page-shell";

export default function BrokerSummaryPage() {
  return (
    <PlaceholderPage
      title="Broker Summary"
      description="Analisis aktivitas net buy dan net sell broker, atau lanjutkan pemeriksaan emiten melalui Stockbit."
    >
      <BrokerSummaryLookup />
    </PlaceholderPage>
  );
}
