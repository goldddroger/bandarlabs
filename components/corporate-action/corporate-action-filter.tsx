"use client";

import { RefreshCw } from "lucide-react";
import { months, years } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function CorporateActionFilter() {
  return (
    <form className="mb-5 grid gap-4 md:flex md:items-end" onSubmit={(event) => event.preventDefault()}>
      <Select label="Bulan" defaultValue="Agustus" className="md:w-56">
        {months.map((month) => (
          <option key={month}>{month}</option>
        ))}
      </Select>
      <Select label="Tahun" defaultValue="2026" className="md:w-44">
        {years.map((year) => (
          <option key={year}>{year}</option>
        ))}
      </Select>
      <Button type="submit" className="md:mb-0">
        <RefreshCw className="size-4" />
        Perbarui
      </Button>
    </form>
  );
}
