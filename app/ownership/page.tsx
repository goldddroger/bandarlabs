import { OwnershipTracker } from "@/components/ownership/ownership-tracker";
import { PlaceholderPage } from "@/components/ui/page-shell";

export default function OwnershipPage() {
  return (
    <PlaceholderPage
      title="Ownership Tracker"
      description="Telusuri pemegang saham besar berdasarkan data kepemilikan 1% dan 5% yang tersimpan di Supabase."
    >
      <OwnershipTracker />
    </PlaceholderPage>
  );
}
