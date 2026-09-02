"use client";

import { useState } from "react";
import { OwnershipClassificationTracker } from "@/components/ownership/ownership-classification-tracker";
import { OwnershipMovementScreener } from "@/components/ownership/ownership-movement-screener";
import { OwnershipTracker } from "@/components/ownership/ownership-tracker";
import { cn } from "@/lib/utils";

export function OwnershipWorkspace() {
  const [tab, setTab] = useState<"screener" | "major" | "classification">("screener");
  const tabs = [{ id: "screener", label: "Screener Pergerakan" }, { id: "major", label: "Detail per Emiten" }, { id: "classification", label: "Klasifikasi Investor" }] as const;
  return <div className="space-y-5"><div className="flex overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Jenis data ownership">{tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={cn("min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-semibold", tab === item.id ? "border-red-600 text-red-700" : "border-transparent text-gray-500 hover:text-gray-900")}>{item.label}</button>)}</div>{tab === "screener" ? <OwnershipMovementScreener /> : tab === "major" ? <OwnershipTracker /> : <OwnershipClassificationTracker />}</div>;
}
