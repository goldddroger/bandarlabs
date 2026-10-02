import { CapitalGainCalculator } from "@/components/tools/capital-gain-calculator";

export default function DividendCalculatorPage() {
  return <CapitalGainCalculator initialMode="dividend" showModeNavigation={false} />;
}
