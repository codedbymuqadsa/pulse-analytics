"use client";

import * as React from "react";
import {
  flexRender, getCoreRowModel, getSortedRowModel, useReactTable,
  type ColumnDef, type RowSelectionState, type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkmark } from "@/components/ui/controls";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Enables sorting. For client-side sorting this also provides the sort value. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  className?: string;
}

export interface SortState { id: string; desc: boolean }

export interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize?: (size: number) => void;
  pageSizes?: readonly number[];
}

interface DataTableProps<T> {
  caption: string;
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  /** Provide for server/URL-driven sorting; omit for client-side sorting. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;
  pagination?: PaginationProps;
  selection?: { selected: Set<string>; onChange: (next: Set<string>) => void };
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  empty?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function DataTable<T>({
  caption, data, columns, getRowId, sort, onSortChange, pagination, selection, onRowClick, rowLabel, empty, loading, className,
}: DataTableProps<T>) {
  const manual = Boolean(onSortChange);
  const [clientSort, setClientSort] = React.useState<SortingState>([]);
  const sorting: SortingState = manual ? (sort ? [{ id: sort.id, desc: sort.desc }] : []) : clientSort;

  const defs = React.useMemo<ColumnDef<T>[]>(
    () => columns.map((c) => ({
      id: c.id,
      header: c.header,
      accessorFn: c.sortValue ? (row: T) => c.sortValue!(row) : () => null,
      enableSorting: Boolean(c.sortValue),
      cell: ({ row }) => c.cell(row.original),
      sortUndefined: "last",
    })),
    [columns],
  );

  const rowSelection: RowSelectionState = React.useMemo(
    () => Object.fromEntries([...(selection?.selected ?? [])].map((id) => [id, true])),
    [selection?.selected],
  );

  const table = useReactTable({
    data,
    columns: defs,
    state: { sorting, rowSelection },
    getRowId,
    manualSorting: manual,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manual ? undefined : getSortedRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (manual) {
        if (next[0]) onSortChange!({ id: next[0].id, desc: next[0].desc });
      } else setClientSort(next);
    },
    enableRowSelection: Boolean(selection),
  });

  const rows = table.getRowModel().rows;
  const pageIds = rows.map((r) => r.id);
  const selectedOnPage = pageIds.filter((id) => selection?.selected.has(id)).length;
  const allChecked: boolean | "indeterminate" = pageIds.length > 0 && selectedOnPage === pageIds.length ? true : selectedOnPage > 0 ? "indeterminate" : false;

  function toggleAll(checked: boolean) {
    if (!selection) return;
    const next = new Set(selection.selected);
    for (const id of pageIds) { if (checked) next.add(id); else next.delete(id); }
    selection.onChange(next);
  }
  function toggleRow(id: string, checked: boolean) {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (checked) next.add(id); else next.delete(id);
    selection.onChange(next);
  }

  const colSpan = columns.length + (selection ? 1 : 0);

  return (
    <div className={className}>
      <div className="relative max-w-full overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-left text-sm" aria-busy={loading || undefined}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b bg-surface-muted/60">
              {selection && (
                <th scope="col" className="w-10 px-4 py-2.5">
                  <Checkmark aria-label="Select all rows on this page" checked={allChecked} onCheckedChange={(v) => toggleAll(v === true)} />
                </th>
              )}
              {table.getHeaderGroups()[0].headers.map((h) => {
                const col = columns.find((c) => c.id === h.id)!;
                const dir = h.column.getIsSorted();
                return (
                  <th
                    key={h.id}
                    scope="col"
                    aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : col.sortValue ? "none" : undefined}
                    className={cn("whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted", col.align === "right" && "text-right")}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (manual) onSortChange!({ id: col.id, desc: dir === "asc" });
                          else h.column.toggleSorting(dir === "asc");
                        }}
                        className={cn("-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 uppercase hover:text-foreground", dir && "text-foreground", col.align === "right" && "flex-row-reverse")}
                      >
                        {col.header}
                        {dir === "asc" ? <ArrowUp className="size-3.5" aria-hidden /> : dir === "desc" ? <ArrowDown className="size-3.5" aria-hidden /> : <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />}
                      </button>
                    ) : col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>{Array.from({ length: colSpan }, (_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}</tr>
              ))
              : rows.map((row) => {
                const original = row.original;
                const selected = selection?.selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    data-state={selected ? "selected" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    aria-label={onRowClick && rowLabel ? `Open details for ${rowLabel(original)}` : undefined}
                    onClick={onRowClick ? () => onRowClick(original) : undefined}
                    onKeyDown={onRowClick ? (e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onRowClick(original); } } : undefined}
                    className={cn("transition-colors hover:bg-surface-muted/50 data-[state=selected]:bg-primary-soft/60", onRowClick && "cursor-pointer")}
                  >
                    {selection && (
                      <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkmark aria-label={`Select ${rowLabel ? rowLabel(original) : row.id}`} checked={Boolean(selected)} onCheckedChange={(v) => toggleRow(row.id, v === true)} />
                      </td>
                    )}
                    {row.getVisibleCells().map((cell) => {
                      const col = columns.find((c) => c.id === cell.column.id)!;
                      return (
                        <td key={cell.id} className={cn("px-4 py-3 align-middle", col.align === "right" && "text-right", col.className)}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && empty}
      {pagination && pagination.total > 0 && <TablePagination {...pagination} />}
    </div>
  );
}

export function TablePagination({ page, pageCount, total, pageSize, onPage, onPageSize, pageSizes }: PaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[13px] text-muted">
      <p aria-live="polite">Showing <span className="font-medium text-foreground tabular">{start}–{end}</span> of <span className="font-medium text-foreground tabular">{total.toLocaleString("en-US")}</span></p>
      <div className="flex items-center gap-2">
        {onPageSize && pageSizes && (
          <Select aria-label="Rows per page" className="h-8 w-[5.5rem]" value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))} options={pageSizes.map((s) => ({ value: String(s), label: `${s} / page` }))} />
        )}
        <Button size="sm" variant="secondary" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft /></Button>
        <span className="min-w-16 text-center tabular">Page {page} of {pageCount}</span>
        <Button size="sm" variant="secondary" onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Next page"><ChevronRight /></Button>
      </div>
    </div>
  );
}
