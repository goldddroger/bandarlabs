import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppLayout } from "@/components/layout/app-layout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BandarLab - Indonesian Stock Intelligence",
  description: "UI MVP for an Indonesian capital market intelligence terminal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${inter.className}`}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
