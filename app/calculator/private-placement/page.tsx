import { CapitalGainCalculator } from "@/components/tools/capital-gain-calculator";

export default function PrivatePlacementCalculatorPage() {
  return <CapitalGainCalculator initialMode="privatePlacement" showModeNavigation={false} />;
}
