"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "accumulation", label: "Accumulation" },
  { id: "corporate-action", label: "Corporate Action" },
  { id: "ownership", label: "Ownership" },
  { id: "timeline", label: "Timeline" },
  { id: "broker-summary", label: "Broker Summary" },
] as const;

type StockSectionId = (typeof tabs)[number]["id"];

function subscribeToHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function getHashSection(): StockSectionId {
  const hash = window.location.hash.slice(1);
  return tabs.some((tab) => tab.id === hash) ? (hash as StockSectionId) : "overview";
}

export function StockTabs() {
  const activeTab = useSyncExternalStore(subscribeToHash, getHashSection, () => "overview");

  return (
    <nav className="bandarlab-scrollbar sticky top-20 z-20 mb-5 overflow-x-auto border-b border-gray-200 bg-white/95 backdrop-blur" aria-label="Navigasi detail saham">
      <div className="flex min-w-max gap-1">
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={`#${tab.id}`}
          aria-current={activeTab === tab.id ? "location" : undefined}
          className={cn(
            "flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors",
            activeTab === tab.id
              ? "border-red-600 text-red-700"
              : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-950",
          )}
        >
          {tab.label}
        </a>
      ))}
      </div>
    </nav>
  );
}
