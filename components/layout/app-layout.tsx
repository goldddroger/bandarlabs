"use client";

import { useState } from "react";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <AppSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <AppHeader onMenuClick={() => setMobileMenuOpen(true)} />
      <main className="min-h-[calc(100vh-80px)] bg-white px-4 py-6 lg:ml-[280px] lg:px-6">{children}</main>
      <footer className="border-t border-gray-200 bg-white px-4 py-4 text-xs text-gray-500 lg:ml-[280px] lg:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>Data yang ditampilkan pada BandarLab merupakan data demo dan digunakan untuk pengembangan aplikasi.</p>
          <p>BandarLab bukan merupakan rekomendasi jual atau beli saham.</p>
        </div>
      </footer>
      <Toaster richColors position="top-right" />
    </div>
  );
}
