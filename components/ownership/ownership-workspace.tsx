"use client";

import { useState } from "react";
import { OwnershipClassificationTracker } from "@/components/ownership/ownership-classification-tracker";
import { OwnershipTracker } from "@/components/ownership/ownership-tracker";
import { cn } from "@/lib/utils";

export function OwnershipWorkspace() {
  const [tab, setTab] = useState<"major" | "classification">("major");
  return <div className="space-y-5"><div className="flex overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Jenis data ownership"><button type="button" role="tab" aria-selected={tab === "major"} onClick={() => setTab("major")} className={cn("min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-semibold", tab === "major" ? "border-red-600 text-red-700" : "border-transparent text-gray-500 hover:text-gray-900")}>Pemegang Saham Besar</button><button type="button" role="tab" aria-selected={tab === "classification"} onClick={() => setTab("classification")} className={cn("min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-semibold", tab === "classification" ? "border-red-600 text-red-700" : "border-transparent text-gray-500 hover:text-gray-900")}>Klasifikasi Investor</button></div>{tab === "major" ? <OwnershipTracker /> : <OwnershipClassificationTracker />}</div>;
}
