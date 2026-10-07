"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { BarChart3, Calculator, ChevronDown, ExternalLink, X } from "lucide-react";
import { calculatorMenuItems } from "@/lib/data";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";
import { type AppSession } from "@/lib/feature-permissions";
import { getActiveSidebarHref, getVisibleSidebarSections } from "@/lib/sidebar-navigation";

function SidebarContent({ session, onNavigate }: { session: AppSession | null; onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeHref = getActiveSidebarHref(pathname);
  const calculatorActive = calculatorMenuItems.some((item) => item.href === activeHref);
  const [calculatorState, setCalculatorState] = useState({ pathname, open: calculatorActive });
  const calculatorExpanded = calculatorState.pathname === pathname ? calculatorState.open : calculatorActive;
  const calculatorId = useId();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const activeItem = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !activeItem) return;
    const viewport = nav.getBoundingClientRect();
    const item = activeItem.getBoundingClientRect();
    if (item.bottom > viewport.bottom) nav.scrollTop += item.bottom - viewport.bottom + 12;
    else if (item.top < viewport.top) nav.scrollTop -= viewport.top - item.top + 12;
  }, [pathname, calculatorExpanded]);

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

      <nav ref={navRef} aria-label="Navigasi BandarLab" className="sidebar-navigation bandarlab-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {getVisibleSidebarSections(session).map((section) => (
          <div key={section.id} className="mb-4 last:mb-0">
            <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-normal text-gray-500">{section.label}</p>
            <div className="grid gap-0.5">
              {section.items.map((item) => {
                const active = activeHref === item.href;
                const Icon = item.icon;
                const external = "external" in item && item.external === true;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-50 hover:text-gray-950",
                      active && "bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700",
                    )}
                  >
                    {active ? <span className="absolute left-0 top-2 h-6 w-1 rounded-r bg-red-600" /> : null}
                    <Icon aria-hidden="true" className={cn("size-5 shrink-0 text-gray-500", active && "text-red-600")} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {external ? (
                      <ExternalLink className="size-3.5 text-gray-400" aria-hidden="true" />
                    ) : null}
                  </Link>
                );
              })}
              {section.calculator ? (
                <div>
                  <button
                    type="button"
                    aria-expanded={calculatorExpanded}
                    aria-controls={calculatorId}
                    onClick={() => setCalculatorState({ pathname, open: !calculatorExpanded })}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-100 hover:text-gray-950",
                      calculatorActive && "bg-gray-100 text-gray-950",
                    )}
                  >
                    <Calculator aria-hidden="true" className={cn("size-5 shrink-0 text-gray-500", calculatorActive && "text-red-600")} />
                    <span className="flex-1">Kalkulator Saham</span>
                    <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-gray-400 transition-transform duration-200", calculatorExpanded && "rotate-180")} />
                  </button>
                  {calculatorExpanded ? (
                    <div id={calculatorId} className="ml-5 mt-1 grid gap-0.5 border-l border-gray-200 pl-3">
                      {calculatorMenuItems.map((item) => {
                        const active = activeHref === item.href;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-gray-600 transition duration-150 hover:bg-gray-50 hover:text-gray-950",
                              active && "bg-red-50 font-semibold text-red-700 hover:bg-red-50 hover:text-red-700",
                            )}
                          >
                            <Icon aria-hidden="true" className={cn("size-4 shrink-0 text-gray-400", active && "text-red-600")} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <LogoutButton />
      </div>
    </>
  );
}

export function AppSidebar({ session, mobileOpen, onMobileClose }: { session: AppSession | null; mobileOpen: boolean; onMobileClose: () => void }) {
  return (
    <>
      <aside aria-label="Sidebar desktop" className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-gray-200 bg-white lg:flex lg:flex-col">
        <SidebarContent session={session} />
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
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <button
          className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-md text-gray-500 transition duration-150 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-red-500"
          type="button"
          aria-label="Tutup menu"
          onClick={onMobileClose}
        >
          <X className="size-5" />
        </button>
        <SidebarContent session={session} onNavigate={onMobileClose} />
      </aside>
    </>
  );
}
