"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      title={compact ? "Keluar" : undefined}
      aria-label={compact ? "Keluar" : undefined}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-3 rounded-md text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 disabled:opacity-50",
        compact ? "w-10" : "w-full px-3",
      )}
    >
      <LogOut className="size-4" />
      {compact ? null : <span>Keluar</span>}
    </button>
  );
}
