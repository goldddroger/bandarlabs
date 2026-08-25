import {
  Building2,
  Calculator,
  ChartNoAxesCombined,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Network,
  NotebookPen,
  WalletCards,
  Radar,
  RefreshCw,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { getIdxListedStock } from "@/lib/idx-listed-stocks";

export const months = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const years = ["2024", "2025", "2026"];

export const dividendRows = [
  {
    number: "KSEI-20885/JKU/0826",
    subject:
      "Jadwal Pelaksanaan Pembagian Dividen Interim atas Efek INDONESIAN PARADISE PROPERTY Tbk (INPP).",
    date: "12 Agustus 2026",
  },
  {
    number: "KSEI-20685/JKU/0826",
    subject: "Informasi Tambahan Dividen Tunai HUMPUSS MARITIM INTERNASIONAL Tbk (HUMI).",
    date: "10 Agustus 2026",
  },
  {
    number: "KSEI-20505/JKU/0826",
    subject:
      "Jadwal Pelaksanaan Pembagian Dividen Interim atas Efek MARK DYNAMICS INDONESIA Tbk (MARK).",
    date: "06 Agustus 2026",
  },
  {
    number: "KSEI-20450/JKU/0826",
    subject: "Jadwal Pelaksanaan Pembagian Dividen Interim ECF PT BANGUN BISNIS BERSAMA.",
    date: "06 Agustus 2026",
  },
  {
    number: "KSEI-20373/JKU/0826",
    subject: "Jadwal Pelaksanaan Pembagian Dividen Tunai atas Efek SUMI INDO KABEL Tbk (IKBI).",
    date: "05 Agustus 2026",
  },
  {
    number: "KSEI-20299/JKU/0826",
    subject:
      "Jadwal Pelaksanaan Pembagian Dividen Tunai atas Efek HUMPUSS MARITIM INTERNASIONAL Tbk (HUMI).",
    date: "04 Agustus 2026",
  },
  {
    number: "KSEI-20297/JKU/0826",
    subject:
      "Jadwal Pelaksanaan Pembagian Dividen Interim atas Efek BANK AMAR INDONESIA Tbk (AMAR).",
    date: "04 Agustus 2026",
  },
  {
    number: "KSEI-20295/JKU/0826",
    subject:
      "Jadwal Pelaksanaan Pembagian Dividen Interim atas Efek TRIPUTRA AGRO PERSADA Tbk (TAPG).",
    date: "04 Agustus 2026",
  },
  {
    number: "KSEI-20293/JKU/0826",
    subject: "Jadwal Pelaksanaan Pembagian Dividen Tunai atas Efek NUSA PALAPA GEMILANG Tbk (NPGF).",
    date: "04 Agustus 2026",
  },
  {
    number: "KSEI-20132/JKU/0826",
    subject: "Jadwal Pelaksanaan Pembagian Dividen Interim atas Efek SAMUDERA INDONESIA Tbk (SMDR).",
    date: "03 Agustus 2026",
  },
];

export const corporateActionTypes = [
  ["Right Issue", 28],
  ["Private Placement", 15],
  ["Akuisisi", 8],
  ["Perubahan Kepemilikan", 23],
  ["Tender Offer", 12],
  ["Dividen Tunai", 128],
  ["Stock Split", 3],
  ["Stock Dividend", 4],
  ["RUPS", 67],
  ["Buyback", 6],
] as const;

export const menuSections = [
  {
    label: "MENU UTAMA",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Accumulation Radar", href: "/accumulation", icon: Radar },
      { label: "Jurnal Riset", href: "/journal", icon: NotebookPen },
      { label: "Portfolio Saya", href: "/portfolio", icon: WalletCards },
      { label: "Corporate Action", href: "/corporate-action", icon: FileText },
      { label: "Stocks", href: "/stocks", icon: ChartNoAxesCombined },
      { label: "Broker Summary", href: "/broker-summary", icon: Users },
      { label: "Ownership Tracker", href: "/ownership", icon: Network },
      { label: "FCA Tracker", href: "/fca", icon: ShieldAlert },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { label: "Stock Screener", href: "/stock-screener", icon: RefreshCw },
      { label: "Group Konglo", href: "/group-konglo", icon: Building2 },
      { label: "Kalkulator Saham", href: "/calculator-gain", icon: Calculator },
    ],
  },
  {
    label: "PENGATURAN",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Bantuan", href: "/bantuan", icon: HelpCircle },
    ],
  },
];

export const accumulationRows = [
  { stock: "TOSK", score: 87, oneMonth: 63, threeMonth: 87, sixMonth: 82, trend: "Strong" },
  { stock: "LAPD", score: 81, oneMonth: 57, threeMonth: 81, sixMonth: 74, trend: "Strong" },
  { stock: "AMMN", score: 79, oneMonth: 62, threeMonth: 79, sixMonth: 70, trend: "Strong" },
  { stock: "BREN", score: 78, oneMonth: 61, threeMonth: 78, sixMonth: 72, trend: "Strong" },
  { stock: "ADRO", score: 76, oneMonth: 59, threeMonth: 76, sixMonth: 68, trend: "Strong" },
];

export const brokerRows = [
  { broker: "BK", netBuy: "21.3B", averagePrice: 158, buyDays: 41, consistency: 79 },
  { broker: "YP", netBuy: "14.8B", averagePrice: 163, buyDays: 38, consistency: 76 },
  { broker: "CC", netBuy: "9.7B", averagePrice: 156, buyDays: 35, consistency: 70 },
  { broker: "ZP", netBuy: "6.5B", averagePrice: 162, buyDays: 30, consistency: 68 },
  { broker: "AK", netBuy: "4.2B", averagePrice: 159, buyDays: 26, consistency: 65 },
];

export const timelineEvents = [
  ["12 Aug 2026", "Change of Share Ownership"],
  ["22 Jul 2026", "Extraordinary RUPS"],
  ["5 Jul 2026", "Material Transaction Disclosure"],
  ["18 Jun 2026", "Volume Anomaly Detected"],
  ["28 May 2026", "Strong Accumulation Start"],
  ["15 Apr 2026", "Price Consolidation"],
] as const;

export const stockProfiles = [
  {
    ticker: "TOSK",
    name: "PT Topindo Solusi Komunika Tbk",
    sector: "Technology",
    price: "172",
    changePercent: "+1.18%",
    accumulationScore: 87,
    zone: "154 - 168",
    distance: "+6.80%",
  },
  {
    ticker: "LAPD",
    name: "PT Leyand International Tbk",
    sector: "Energy",
    price: "91",
    changePercent: "+0.72%",
    accumulationScore: 81,
    zone: "82 - 89",
    distance: "+2.25%",
  },
  {
    ticker: "WEGE",
    name: "PT Wijaya Karya Bangunan Gedung Tbk",
    sector: "Infrastructure",
    price: "126",
    changePercent: "-0.42%",
    accumulationScore: 64,
    zone: "118 - 130",
    distance: "-3.08%",
  },
  {
    ticker: "WMPP",
    name: "PT Widodo Makmur Perkasa Tbk",
    sector: "Consumer Non-Cyclicals",
    price: "48",
    changePercent: "0.00%",
    accumulationScore: 58,
    zone: "44 - 50",
    distance: "+1.96%",
  },
  {
    ticker: "BREN",
    name: "PT Barito Renewables Energy Tbk",
    sector: "Energy",
    price: "8,125",
    changePercent: "+1.03%",
    accumulationScore: 78,
    zone: "7,650 - 8,050",
    distance: "+0.93%",
  },
  {
    ticker: "ADRO",
    name: "PT Alamtri Resources Indonesia Tbk",
    sector: "Energy",
    price: "2,460",
    changePercent: "-0.20%",
    accumulationScore: 76,
    zone: "2,310 - 2,480",
    distance: "-0.81%",
  },
  {
    ticker: "AMMN",
    name: "PT Amman Mineral Internasional Tbk",
    sector: "Basic Materials",
    price: "9,350",
    changePercent: "+0.86%",
    accumulationScore: 79,
    zone: "8,900 - 9,280",
    distance: "+0.75%",
  },
  {
    ticker: "CPIN",
    name: "PT Charoen Pokphand Indonesia Tbk",
    sector: "Consumer Non-Cyclicals",
    price: "5,025",
    changePercent: "+0.30%",
    accumulationScore: 62,
    zone: "4,820 - 5,100",
    distance: "-1.47%",
  },
  {
    ticker: "BBNI",
    name: "PT Bank Negara Indonesia Tbk",
    sector: "Financials",
    price: "4,860",
    changePercent: "-0.10%",
    accumulationScore: 60,
    zone: "4,720 - 4,940",
    distance: "-1.62%",
  },
  {
    ticker: "BRPT",
    name: "PT Barito Pacific Tbk",
    sector: "Basic Materials",
    price: "1,065",
    changePercent: "+0.47%",
    accumulationScore: 67,
    zone: "995 - 1,080",
    distance: "-1.39%",
  },
] as const;

export function getStockProfile(ticker: string) {
  const normalizedTicker = ticker.toUpperCase();
  const profile = stockProfiles.find((stock) => stock.ticker === normalizedTicker);
  if (profile) return profile;

  const listedStock = getIdxListedStock(normalizedTicker);

  return {
    ticker: normalizedTicker,
    name: listedStock?.name ?? `${normalizedTicker} Stock`,
    sector: "Indonesia Equity",
    price: "-",
    changePercent: "0.00%",
    accumulationScore: 0,
    zone: "-",
    distance: "-",
  };
}
