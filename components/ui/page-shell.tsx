import { ReactNode } from "react";

export function PlaceholderPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <p className="mb-2 text-sm text-gray-500">BandarLab</p>
        <h1 className="text-2xl font-semibold tracking-normal text-gray-950">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{description}</p>
      </div>
      {children ?? (
        <div className="rounded-lg border border-gray-200 bg-white p-8">
          <div className="h-3 w-40 rounded bg-gray-100" />
          <div className="mt-4 grid gap-3">
            <div className="h-10 rounded bg-gray-50" />
            <div className="h-10 rounded bg-gray-50" />
            <div className="h-10 rounded bg-gray-50" />
          </div>
        </div>
      )}
    </section>
  );
}
