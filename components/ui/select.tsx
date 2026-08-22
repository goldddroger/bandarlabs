import { type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function Select({ className, label, id, children, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid gap-2 text-sm text-gray-600" htmlFor={selectId}>
      {label ? <span>{label}</span> : null}
      <span className="relative">
        <select
          id={selectId}
          className={cn(
            "h-10 w-full appearance-none rounded-md border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-900 transition duration-150 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-100",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
      </span>
    </label>
  );
}
