import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const stocks = [
  ["TOSK", "PT Topindo Solusi Komunika Tbk", "Technology", 172, 1.18, "1.7T"],
  ["LAPD", "PT Leyand International Tbk", "Energy", 91, 0.72, "640B"],
  ["WEGE", "PT Wijaya Karya Bangunan Gedung Tbk", "Infrastructure", 126, -0.42, "1.2T"],
  ["WMPP", "PT Widodo Makmur Perkasa Tbk", "Consumer Non-Cyclicals", 48, 0.0, "920B"],
  ["BREN", "PT Barito Renewables Energy Tbk", "Energy", 8125, 1.03, "1087T"],
  ["ADRO", "PT Alamtri Resources Indonesia Tbk", "Energy", 2460, -0.2, "74T"],
  ["AMMN", "PT Amman Mineral Internasional Tbk", "Basic Materials", 9350, 0.86, "678T"],
  ["CPIN", "PT Charoen Pokphand Indonesia Tbk", "Consumer Non-Cyclicals", 5025, 0.3, "82T"],
  ["BBNI", "PT Bank Negara Indonesia Tbk", "Financials", 4860, -0.1, "181T"],
  ["BRPT", "PT Barito Pacific Tbk", "Basic Materials", 1065, 0.47, "100T"],
] as const;

async function main() {
  await prisma.alert.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.stockTimeline.deleteMany();
  await prisma.brokerActivity.deleteMany();
  await prisma.corporateAction.deleteMany();
  await prisma.accumulationScore.deleteMany();
  await prisma.stock.deleteMany();

  for (const [ticker, name, sector, price, changePercent, marketCap] of stocks) {
    const stock = await prisma.stock.create({
      data: { ticker, name, sector, price, changePercent, marketCap },
    });

    await prisma.accumulationScore.createMany({
      data: [
        { stockId: stock.id, period: "1M", score: 63, brokerScore: 68, volumeScore: 58, priceScore: 63, date: new Date("2026-08-12") },
        { stockId: stock.id, period: "3M", score: ticker === "TOSK" ? 87 : 76, brokerScore: 82, volumeScore: 79, priceScore: 73, date: new Date("2026-08-12") },
        { stockId: stock.id, period: "6M", score: 82, brokerScore: 78, volumeScore: 80, priceScore: 76, date: new Date("2026-08-12") },
      ],
    });

    await prisma.brokerActivity.createMany({
      data: [
        { stockId: stock.id, brokerCode: "BK", netBuy: 21_300_000_000, averagePrice: 158, buyDays: 41, sellDays: 12, consistency: 79, period: "3M" },
        { stockId: stock.id, brokerCode: "YP", netBuy: 14_800_000_000, averagePrice: 163, buyDays: 38, sellDays: 16, consistency: 76, period: "3M" },
      ],
    });
  }

  const tosk = await prisma.stock.findUniqueOrThrow({ where: { ticker: "TOSK" } });

  await prisma.corporateAction.create({
    data: {
      stockId: tosk.id,
      type: "Dividend",
      title: "Dividend Announcement",
      documentNumber: "KSEI-20885/JKU/0826",
      publishedAt: new Date("2026-08-12"),
      description: "Dummy disclosure for BandarLab demo.",
      impact: "Watch",
    },
  });

  await prisma.watchlist.create({ data: { stockId: tosk.id } });

  await prisma.alert.create({
    data: {
      stockId: tosk.id,
      type: "Accumulation",
      title: "Accumulation score increased",
      description: "Score naik 8 poin dalam periode demo.",
    },
  });

  await prisma.stockTimeline.createMany({
    data: [
      { stockId: tosk.id, type: "Ownership", title: "Change of Share Ownership", description: "Perubahan kepemilikan demo.", eventDate: new Date("2026-08-12") },
      { stockId: tosk.id, type: "Accumulation", title: "Strong Accumulation Start", description: "Awal sinyal akumulasi kuat demo.", eventDate: new Date("2026-05-28") },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
