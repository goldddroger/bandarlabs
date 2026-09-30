import type { Metadata } from "next";
import { PublicCapitalGainCalculator } from "@/components/tools/public-capital-gain-calculator";

export const metadata: Metadata = {
  title: "Kalkulator Capital Gain Saham | BandarLab",
  description: "Hitung estimasi profit atau loss saham setelah fee beli dan fee jual tanpa perlu login.",
};

export default function PublicCapitalGainPage() {
  return <PublicCapitalGainCalculator />;
}
