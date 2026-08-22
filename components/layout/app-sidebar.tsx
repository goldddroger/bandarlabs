"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ExternalLink, X } from "lucide-react";
import { menuSections } from "@/lib/data";
import { cn } from "@/lib/utils";

function getMenuKey(sectionLabel: string, itemLabel: string) {
  return `${sectionLabel}:${itemLabel}`;
}

function getActiveMenuKey(pathname: string) {
  const normalizedPath = pathname === "/" ? "/dashboard" : pathname;
  const exactMatch = menuSections
    .flatMap((section) =>
      section.items.map((item) => ({
        key: getMenuKey(section.label, item.label),
        href: item.href,
        external: "external" in item && item.external,
      })),
    )
    .find((item) => !item.external && item.href === normalizedPath);

  if (exactMatch) {
    return exactMatch.key;
  }

  const prefixMatch = menuSections
    .flatMap((section) =>
      section.items.map((item) => ({
        key: getMenuKey(section.label, item.label),
        href: item.href,
        external: "external" in item && item.external,
      })),
    )
    .filter((item) => !item.external && normalizedPath.startsWith(`${item.href}/`))
    .sort((first, second) => second.href.length - first.href.length)[0];

  return prefixMatch?.key;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeMenuKey = getActiveMenuKey(pathname);

  return (
    <>
      <Link
        href="/corporate-action/dividend"
        className="flex h-20 items-center gap-3 border-b border-gray-200 px-5"
        onClick={onNavigate}
      >
        <span className="flex size-12 items-center justify-center rounded-lg bg-red-600 text-white">
          <BarChart3 className="size-7" strokeWidth={2.4} />
        </span>
        <span>
          <span className="block text-2xl font-bold leading-6 text-gray-950">
            Bandar<span className="text-red-600">Lab</span>
          </span>
          <span className="mt-1 block text-xs text-gray-500">Indonesian Stock Intelligence</span>
        </span>
      </Link>

      <nav className="bandarlab-scrollbar flex-1 overflow-y-auto px-3 py-5">
        {menuSections.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-normal text-gray-500">{section.label}</p>
            <div className="grid gap-1">
              {section.items.map((item) => {
                const itemKey = getMenuKey(section.label, item.label);
                const active = activeMenuKey === itemKey;
                const Icon = item.icon;

                return (
                  <Link
                    key={itemKey}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noreferrer" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-50 hover:text-gray-950",
                      active && "bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700",
                    )}
                  >
                    {active ? <span className="absolute left-0 top-2 h-6 w-1 rounded-r bg-red-600" /> : null}
                    <Icon className={cn("size-5 text-gray-500", active && "text-red-600")} />
                    <span className="flex-1">{item.label}</span>
                    {item.external ? (
                      <ExternalLink className="size-3.5 text-gray-400" aria-hidden="true" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}

export function AppSidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-gray-200 bg-white lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-gray-950/40 transition duration-200 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
        onClick={onMobileClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-gray-200 bg-white transition duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Menu utama"
      >
        <button
          className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-red-500"
          type="button"
          aria-label="Tutup menu"
          onClick={onMobileClose}
        >
          <X className="size-5" />
        </button>
        <SidebarContent onNavigate={onMobileClose} />
      </aside>
    </>
  );
}
