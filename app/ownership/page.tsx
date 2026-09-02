import { OwnershipWorkspace } from "@/components/ownership/ownership-workspace";
import { PlaceholderPage } from "@/components/ui/page-shell";

export default function OwnershipPage() {
  return (
    <PlaceholderPage
      title="Ownership Tracker"
      description="Telusuri pemegang saham besar dan perubahan komposisi investor berdasarkan snapshot resmi BEI/KSEI."
    >
      <OwnershipWorkspace />
    </PlaceholderPage>
  );
}
