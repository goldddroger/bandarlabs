"use client";

import { Menu } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationLink } from "@/components/layout/notification-link";

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-4 border-b border-gray-200 bg-white/95 px-4 backdrop-blur lg:ml-[280px] lg:px-6">
      <div className="flex flex-1 items-center gap-3">
        <Button variant="ghost" className="h-10 w-10 p-0 lg:hidden" aria-label="Buka menu" onClick={onMenuClick}>
          <Menu className="size-5" />
        </Button>
        <GlobalSearch />
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <NotificationLink />
        <div className="ml-3 flex items-center gap-3 border-l border-gray-200 pl-4">
          <span className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
            AD
          </span>
          <span className="text-sm font-semibold text-gray-900">Admin</span>
          <LogoutButton compact />
        </div>
      </div>
    </header>
  );
}
