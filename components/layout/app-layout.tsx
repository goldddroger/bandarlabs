"use client";

import { useEffect, useState } from "react";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { AppSession } from "@/lib/feature-permissions";

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<AppSession | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ session: AppSession }> : null)
      .then((payload) => { if (payload) setSession(payload.session); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [pathname]);

  if (pathname === "/login") {
    return <><div className="min-h-screen bg-white text-gray-900">{children}</div><Toaster richColors position="top-right" /></>;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <AppSidebar session={session} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <AppHeader session={session} onMenuClick={() => setMobileMenuOpen(true)} />
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
