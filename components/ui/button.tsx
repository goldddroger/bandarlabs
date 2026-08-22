import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-red-600 text-white hover:bg-red-700 border-red-600",
  secondary: "bg-red-50 text-red-700 hover:bg-red-100 border-red-100",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100 border-transparent",
  outline: "bg-white text-red-700 hover:bg-red-50 border-red-200",
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition duration-150 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
