"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import type { Transaction, TransactionStatus } from "@/types/transaction";
import type { Page, TransactionQuery } from "@/lib/filters";
import { TRANSACTION_STATUSES } from "@/lib/filters";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActiveFilters } from "@/components/shared/active-filters";
import { Avatar } from "@/components/shared/avatar";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportButton, exportFromApi } from "@/components/shared/export-button";
import { SearchInput } from "@/components/shared/search-input";
import { STATUS_LABELS, StatusBadge } from "@/components/shared/status-badge";
import { useFormatters } from "@/hooks/use-formatters";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/formatters";
import { PLAN_TIERS } from "@/lib/mock-data/constants";

const TX_KEYS = ["tq", "tstatus", "tsort", "tdir", "tpage"];

export function TransactionsTable({ page, query }: { page: Page<Transaction>; query: TransactionQuery }) {
  const f = useFormatters();
  const { params, update, pending } = useUrlState();
  const [selected, setSelected] = useState<Transaction | null>(null);

  const columns: Column<Transaction>[] = [
    { id: "id", header: "Transaction", sortValue: (t) => t.id, cell: (t) => <span className="font-mono text-[13px]">{t.id}</span> },
    { id: "customerName", header: "Customer", sortValue: (t) => t.customerName, cell: (t) => <span className="flex min-w-0 items-center gap-2.5"><Avatar name={t.customerName} size="sm" /><span className="max-w-[12rem] truncate font-medium">{t.customerName}</span></span> },
    { id: "date", header: "Date", sortValue: (t) => t.date, cell: (t) => <span className="whitespace-nowrap">{formatDate(t.date)}</span> },
    { id: "plan", header: "Plan", sortValue: (t) => PLAN_TIERS.indexOf(t.plan), cell: (t) => t.plan },
    { id: "amount", header: "Amount", align: "right", sortValue: (t) => t.amount, cell: (t) => <span className="font-medium tabular">{f.currency(t.amount, true)}</span> },
    { id: "status", header: "Status", sortValue: (t) => t.status, cell: (t) => <StatusBadge status={t.status} /> },
  ];

  const clear = () => update({ tq: null, tstatus: null, tpage: null });
  const chips = [
    ...(query.q ? [{ key: "q", label: `Search: ${query.q}`, onRemove: () => update({ tq: null, tpage: null }) }] : []),
    ...(query.status ? [{ key: "s", label: `Status: ${STATUS_LABELS[query.status]}`, onRemove: () => update({ tstatus: null, tpage: null }) }] : []),
  ];

  function exportCsv() {
    const p = new URLSearchParams();
    for (const k of ["range", "from", "to"]) { const v = params.get(k); if (v) p.set(k, v); }
    for (const k of TX_KEYS) { const v = params.get(k); if (v) p.set(k, v); }
    return exportFromApi(`/api/export/transactions?${p.toString()}`, "transactions.csv");
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div>
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>Invoices issued in the selected period</CardDescription>
        </div>
        <ExportButton onExport={exportCsv} size="sm" />
      </CardHeader>
      <div className="space-y-3 px-5 pb-4 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput className="sm:w-72" label="Search transactions" placeholder="Search ID, customer or email" value={query.q} onSearch={(v) => update({ tq: v, tpage: null })} />
          <Select
            aria-label="Filter by status"
            className="sm:w-44"
            value={query.status ?? "all"}
            onValueChange={(v) => update({ tstatus: v === "all" ? null : v, tpage: null })}
            options={[{ value: "all", label: "All statuses" }, ...TRANSACTION_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
          />
        </div>
        <ActiveFilters chips={chips} onClear={clear} />
      </div>
      <div className={pending ? "opacity-60 transition-opacity" : "transition-opacity"} data-testid="transactions-table">
        <DataTable
          caption="Recent transactions"
          data={page.rows}
          columns={columns}
          getRowId={(t) => t.id}
          sort={{ id: query.sort, desc: query.dir === "desc" }}
          onSortChange={(s) => update({ tsort: s.id, tdir: s.desc ? "desc" : "asc", tpage: null })}
          pagination={{ page: page.page, pageCount: page.pageCount, total: page.total, pageSize: page.pageSize, onPage: (p) => update({ tpage: String(p) }) }}
          onRowClick={setSelected}
          rowLabel={(t) => t.id}
          empty={<EmptyState icon={Receipt} title="No transactions found" description="Try a different search or widen the date range." action={chips.length ? <Button size="sm" onClick={clear}>Clear filters</Button> : undefined} />}
        />
      </div>
      <TransactionDialog tx={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}

function TransactionDialog({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  const f = useFormatters();
  const rows: Array<[string, React.ReactNode]> = tx ? [
    ["Customer", tx.customerName], ["Email", <span key="e" className="break-all">{tx.customerEmail}</span>], ["Customer ID", tx.customerId],
    ["Date", formatDate(tx.date, "EEEE, MMM d, yyyy")], ["Plan", tx.plan], ["Amount", f.currency(tx.amount, true)],
    ["Status", <StatusBadge key="s" status={tx.status as TransactionStatus} />],
  ] : [];
  return (
    <Dialog open={Boolean(tx)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Transaction {tx?.id}</DialogTitle>
          <DialogDescription className="text-[13px] text-muted">Invoice details</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <dl className="divide-y">
            {rows.map(([k, v]) => <div key={k} className="flex items-center justify-between gap-4 py-2.5"><dt className="text-muted">{k}</dt><dd className="min-w-0 text-right font-medium">{v}</dd></div>)}
          </dl>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
