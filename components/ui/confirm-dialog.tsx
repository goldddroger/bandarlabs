"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ConfirmDialogOptions = {
  title: string;
  description: string;
  subject?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

function ConfirmDialog({
  options,
  onCancel,
  onConfirm,
}: {
  options: ConfirmDialogOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => cancelButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-gray-950/50 sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md rounded-t-lg bg-white shadow-2xl sm:rounded-lg"
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 id="confirm-dialog-title" className="text-base font-semibold text-gray-950">{options.title}</h2>
              <p id="confirm-dialog-description" className="mt-1 text-sm leading-6 text-gray-600">{options.description}</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label="Tutup konfirmasi">
            <X className="size-5" />
          </button>
        </header>

        {options.subject ? (
          <div className="mx-4 mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-900 sm:mx-5">
            {options.subject}
          </div>
        ) : null}

        <footer className="flex flex-col-reverse gap-2 px-4 py-4 sm:flex-row sm:justify-end sm:px-5 sm:py-5">
          <button ref={cancelButtonRef} type="button" className="inline-flex h-10 w-full items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 sm:w-auto" onClick={onCancel}>
            {options.cancelLabel ?? "Batal"}
          </button>
          <Button type="button" className="w-full sm:w-auto" onClick={onConfirm}>
            <Trash2 className="size-4" />
            {options.confirmLabel ?? "Hapus"}
          </Button>
        </footer>
      </section>
    </div>
  );
}

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((nextOptions: ConfirmDialogOptions) => new Promise<boolean>((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    setOptions(nextOptions);
  }), []);
  const handleCancel = useCallback(() => settle(false), [settle]);
  const handleConfirm = useCallback(() => settle(true), [settle]);

  useEffect(() => () => resolverRef.current?.(false), []);

  return {
    confirm,
    confirmationDialog: options ? (
      <ConfirmDialog options={options} onCancel={handleCancel} onConfirm={handleConfirm} />
    ) : null,
  };
}
