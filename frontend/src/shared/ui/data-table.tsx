import { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

import { Button } from "./button";

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

/** A real <table>: at phone width each row becomes a labelled card, with no horizontal scrolling. */
export function DataTable<T>({ columns, rows, rowKey, caption }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string | number; caption: string }) {
  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <table className="w-full text-sm max-md:block">
        <caption className="sr-only">{caption}</caption>
        <thead className="max-md:sr-only">
          <tr className="border-b">
            {columns.map((column) => (
              <th key={column.header} scope="col" className={cn("text-muted-foreground px-4 py-3 text-left font-medium", column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-md:block">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b last:border-0 max-md:block max-md:p-3">
              {columns.map((column) => (
                <td
                  key={column.header}
                  data-label={column.header}
                  className={cn(
                    "px-4 py-3 align-top max-md:flex max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1.5 max-md:text-right max-md:before:text-muted-foreground max-md:before:shrink-0 max-md:before:text-left max-md:before:content-[attr(data-label)]",
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PaginationControls({ page, pageCount, total, onPageChange }: { page: number; pageCount: number; total: number; onPageChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground" aria-live="polite">
        Page {page} of {pageCount} · {total} results
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
