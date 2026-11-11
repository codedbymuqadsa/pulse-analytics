"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag, Users, X } from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@/types/customer";
import type { CustomerQuery, Page } from "@/lib/filters";
import { CUSTOMER_STATUSES, PAGE_SIZES, SINCE_OPTIONS } from "@/lib/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Select } from "@/components/ui/select";
import { ActiveFilters } from "@/components/shared/active-filters";
import { Avatar } from "@/components/shared/avatar";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportButton, exportFromApi } from "@/components/shared/export-button";
import { SearchInput } from "@/components/shared/search-input";
import { STATUS_LABELS, StatusBadge } from "@/components/shared/status-badge";
import { CustomerDrawer } from "@/components/customers/customer-drawer";
import { useFormatters } from "@/hooks/use-formatters";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/formatters";
import { PLAN_TIERS } from "@/lib/mock-data/constants";
import { labelsStore, useCustomerLabels } from "@/lib/stores";
import { SEGMENT_LABELS } from "@/lib/validations";

const SINCE_LABELS: Record<(typeof SINCE_OPTIONS)[number], string> = { "30d": "Last 30 days", "90d": "Last 90 days", "365d": "Last 12 months" };
const FILTER_KEYS = ["q", "plan", "status", "since"];

export function CustomersView({ page, query }: { page: Page<Customer>; query: CustomerQuery }) {
  const f = useFormatters();
  const { params, update, pending } = useUrlState();
  const labels = useCustomerLabels();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Customer | null>(null);

  // Selection belongs to a filter set: changing search/filters clears it.
  const filterKey = [query.q, query.plan, query.status, query.since].join("|");
  useEffect(() => { setSelected(new Set()); }, [filterKey]);

  const columns = useMemo<Column<Customer>[]>(() => [
    {
      id: "name", header: "Customer", sortValue: (c) => c.name,
      cell: (c) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={c.name} size="sm" />
          <span className="min-w-0">
            <span className="block max-w-[14rem] truncate font-medium">{c.name}</span>
            {(labels[c.id]?.length ?? 0) > 0 && <span className="mt-0.5 flex flex-wrap gap-1">{labels[c.id].map((l) => <Badge key={l} tone="primary">{l}</Badge>)}</span>}
          </span>
        </span>
      ),
    },
    { id: "email", header: "Email", sortValue: (c) => c.email, cell: (c) => <span className="block max-w-[16rem] truncate text-muted">{c.email}</span> },
    { id: "company", header: "Company", sortValue: (c) => c.company, cell: (c) => <span className="block max-w-[12rem] truncate">{c.company}</span> },
    { id: "plan", header: "Plan", sortValue: (c) => PLAN_TIERS.indexOf(c.plan), cell: (c) => <span>{c.plan}<span className="ml-1 text-xs text-muted">· {c.billing === "annual" ? "Annual" : "Monthly"}</span></span> },
    { id: "mrr", header: "Monthly spend", align: "right", sortValue: (c) => c.mrr, cell: (c) => <span className="tabular">{c.mrr > 0 ? f.currency(c.mrr, true) : "—"}</span> },
    { id: "createdAt", header: "Created", sortValue: (c) => c.createdAt, cell: (c) => <span className="whitespace-nowrap">{formatDate(c.createdAt)}</span> },
    { id: "lastActivityAt", header: "Last activity", sortValue: (c) => c.lastActivityAt, cell: (c) => <span className="whitespace-nowrap">{formatDate(c.lastActivityAt)}</span> },
    { id: "status", header: "Status", sortValue: (c) => c.status, cell: (c) => <StatusBadge status={c.status} /> },
  ], [f, labels]);

  const chips = [
    ...(query.q ? [{ key: "q", label: `Search: ${query.q}`, onRemove: () => update({ q: null, page: null }) }] : []),
    ...(query.plan ? [{ key: "plan", label: `Plan: ${query.plan}`, onRemove: () => update({ plan: null, page: null }) }] : []),
    ...(query.status ? [{ key: "status", label: `Status: ${STATUS_LABELS[query.status]}`, onRemove: () => update({ status: null, page: null }) }] : []),
    ...(query.since ? [{ key: "since", label: `Created: ${SINCE_LABELS[query.since]}`, onRemove: () => update({ since: null, page: null }) }] : []),
  ];
  const clear = () => update({ q: null, plan: null, status: null, since: null, page: null });

  function exportCsv() {
    const p = new URLSearchParams();
    for (const k of [...FILTER_KEYS, "sort", "dir"]) { const v = params.get(k); if (v) p.set(k, v); }
    return exportFromApi(`/api/export/customers?${p.toString()}`, "customers.csv");
  }

  function applyLabel(label: string) {
    const ids = [...selected];
    const ok = labelsStore.set((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = Array.from(new Set([...(next[id] ?? []), label]));
      return next;
    });
    if (ok) toast.success(`Added “${label}” to ${ids.length} customer${ids.length === 1 ? "" : "s"}`);
    else toast.warning(`Added “${label}” for this session only. Browser storage is unavailable, so it won't persist.`);
  }

  function removeLabels() {
    const ids = [...selected];
    const ok = labelsStore.set((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    if (ok) toast.success(`Cleared labels on ${ids.length} customer${ids.length === 1 ? "" : "s"}`);
    else toast.warning("Labels cleared for this session only.");
  }

  return (
    <Card>
      <div className="space-y-3 p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <SearchInput className="lg:w-80" label="Search customers" placeholder="Search name, email or company" value={query.q} onSearch={(v) => update({ q: v, page: null })} />
          <Select aria-label="Filter by plan" className="lg:w-40" value={query.plan ?? "all"} onValueChange={(v) => update({ plan: v === "all" ? null : v, page: null })} options={[{ value: "all", label: "All plans" }, ...PLAN_TIERS.map((p) => ({ value: p, label: p }))]} />
          <Select aria-label="Filter by status" className="lg:w-40" value={query.status ?? "all"} onValueChange={(v) => update({ status: v === "all" ? null : v, page: null })} options={[{ value: "all", label: "All statuses" }, ...CUSTOMER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]} />
          <Select aria-label="Filter by creation date" className="lg:w-44" value={query.since ?? "all"} onValueChange={(v) => update({ since: v === "all" ? null : v, page: null })} options={[{ value: "all", label: "Created any time" }, ...SINCE_OPTIONS.map((s) => ({ value: s, label: SINCE_LABELS[s] }))]} />
          <div className="lg:ml-auto"><ExportButton onExport={exportCsv} label="Export filtered CSV" /></div>
        </div>
        <ActiveFilters chips={chips} onClear={clear} />
        {selected.size > 0 && (
          <div role="region" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-3 py-2 text-sm">
            <span className="font-semibold text-primary" aria-live="polite">{selected.size} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm"><Tag /> Add label</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {SEGMENT_LABELS.map((l) => <DropdownMenuItem key={l} onSelect={() => applyLabel(l)}>{l}</DropdownMenuItem>)}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={removeLabels}>Clear labels</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X /> Clear selection</Button>
          </div>
        )}
      </div>
      <div className={pending ? "opacity-60 transition-opacity" : "transition-opacity"} data-testid="customers-table">
        <DataTable
          caption="Customers"
          data={page.rows}
          columns={columns}
          getRowId={(c) => c.id}
          sort={{ id: query.sort, desc: query.dir === "desc" }}
          onSortChange={(s) => update({ sort: s.id, dir: s.desc ? "desc" : "asc", page: null })}
          pagination={{ page: page.page, pageCount: page.pageCount, total: page.total, pageSize: page.pageSize, onPage: (p) => update({ page: String(p) }), onPageSize: (n) => update({ size: String(n), page: null }), pageSizes: PAGE_SIZES }}
          selection={{ selected, onChange: setSelected }}
          onRowClick={setOpen}
          rowLabel={(c) => c.name}
          empty={<EmptyState icon={Users} title="No customers match" description="Try a different search or remove some filters." action={chips.length ? <Button size="sm" onClick={clear}>Clear filters</Button> : undefined} />}
        />
      </div>
      <CustomerDrawer customer={open} onClose={() => setOpen(null)} />
    </Card>
  );
}
