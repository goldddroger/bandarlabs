import { CircleHelp, ChevronRight } from "lucide-react";
import { CorporateActionFilter } from "@/components/corporate-action/corporate-action-filter";
import { CorporateActionSidebar } from "@/components/corporate-action/corporate-action-sidebar";
import { CorporateActionTable } from "@/components/corporate-action/corporate-action-table";
import { Button } from "@/components/ui/button";

export default function DividendPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="mb-3 flex items-center gap-2 text-sm text-gray-500" aria-label="Breadcrumb">
            <span>Corporate Action</span>
            <ChevronRight className="size-4" />
            <span className="font-medium text-gray-900">Dividen Tunai</span>
          </nav>
          <h1 className="text-3xl font-semibold tracking-normal text-red-600">Dividen Tunai</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Dokumen keterbukaan informasi terkait pembagian dividen tunai emiten di BEI.
          </p>
        </div>
        <Button variant="outline" className="self-start md:self-auto">
          <CircleHelp className="size-4" />
          Panduan
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <CorporateActionFilter />
          <CorporateActionTable />
        </div>
        <CorporateActionSidebar />
      </div>
    </div>
  );
}
