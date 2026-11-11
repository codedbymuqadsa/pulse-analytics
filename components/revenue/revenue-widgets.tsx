"use client";

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import type { Aggregation } from "@/types/analytics";
import type { MrrMovement, PlanRevenueRow } from "@/lib/metrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AXIS_PROPS, bucketLabel, ChartTooltipCard, DataTableDisclosure, GRID_COLOR, Legend, SERIES } from "@/components/charts/chart-utils";
import { AggControl } from "@/components/dashboard/agg-control";
import { TrendBadge } from "@/components/dashboard/metric-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportButton } from "@/components/shared/export-button";
import { useFormatters } from "@/hooks/use-formatters";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

export function NewVsRecurringChart({ data, agg }: { data: Array<{ date: string; newRevenue: number; recurringRevenue: number }>; agg: Aggregation }) {
  const f = useFormatters();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>New vs recurring revenue</CardTitle>
          <CardDescription>New = revenue from MRR added in the trailing 30 days</CardDescription>
        </div>
        <AggControl value={agg} />
      </CardHeader>
      <CardContent>
        <div className="mb-3"><Legend items={[{ label: "Recurring", color: SERIES[0] }, { label: "New", color: SERIES[2] }]} /></div>
        {data.length === 0 ? <EmptyState title="No revenue data" description="Nothing matches the current filters." /> : (
          <>
            <div role="img" aria-label="Stacked area chart of new and recurring revenue over the selected period" className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 260 }}>
                <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="3 3" />
                  <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={24} tickFormatter={(d: string) => bucketLabel(d, agg)} />
                  <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v: number) => f.axisCurrency(v)} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as (typeof data)[number];
                    return <ChartTooltipCard title={bucketLabel(p.date, agg, true)} rows={[
                      { name: "Recurring", value: f.currency(p.recurringRevenue, true), color: SERIES[0] },
                      { name: "New", value: f.currency(p.newRevenue, true), color: SERIES[2] },
                      { name: "Total", value: f.currency(p.recurringRevenue + p.newRevenue, true) },
                    ]} />;
                  }} />
                  <Area type="monotone" stackId="1" dataKey="recurringRevenue" stroke={SERIES[0]} strokeWidth={1.5} fill={SERIES[0]} fillOpacity={0.14} isAnimationActive={false} />
                  <Area type="monotone" stackId="1" dataKey="newRevenue" stroke={SERIES[2]} strokeWidth={1.5} fill={SERIES[2]} fillOpacity={0.25} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <DataTableDisclosure caption="New versus recurring revenue" headers={["Period", "Recurring", "New"]} rows={data.map((d) => [bucketLabel(d.date, agg, true), f.currency(d.recurringRevenue, true), f.currency(d.newRevenue, true)])} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MrrMovementCard({ movement }: { movement: MrrMovement }) {
  const f = useFormatters();
  const items = [
    { label: "New subscriptions", value: movement.newMrr, sign: 1 },
    { label: "Upgrades", value: movement.upgrades, sign: 1 },
    { label: "Downgrades", value: movement.downgrades, sign: -1 },
    { label: "Cancellations", value: movement.cancellations, sign: -1 },
  ];
  const gross = items.reduce((a, i) => a + i.value, 0);
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>MRR movement</CardTitle>
          <CardDescription>Net MRR = new + upgrades − downgrades − cancellations</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {items.map((i) => (
            <li key={i.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  {i.sign > 0 ? <ArrowUpRight className="size-4 text-success" aria-hidden /> : <ArrowDownRight className="size-4 text-danger" aria-hidden />}
                  {i.label}
                </span>
                <span className="tabular">
                  <span className="font-semibold">{i.sign > 0 ? "+" : "−"}{f.currency(i.value)}</span>
                  <span className="ml-2 text-xs text-muted">{gross > 0 ? f.percent((i.value / gross) * 100, 0) : "0%"} of movement</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-muted" aria-hidden>
                <div className={cn("h-2 rounded-full", i.sign > 0 ? "bg-success" : "bg-danger")} style={{ width: `${(i.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center justify-between border-t pt-4">
          <span className="flex items-center gap-1.5 text-sm font-semibold"><Equal className="size-4" aria-hidden /> Net MRR movement</span>
          <span className={cn("text-lg font-semibold tabular", movement.net >= 0 ? "text-success" : "text-danger")}>{movement.net >= 0 ? "+" : "−"}{f.currency(Math.abs(movement.net))}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlanRevenueTable({ rows, compare }: { rows: PlanRevenueRow[]; compare: boolean }) {
  const f = useFormatters();
  const columns: Column<PlanRevenueRow>[] = [
    { id: "plan", header: "Plan", sortValue: (r) => r.plan, cell: (r) => <span className="font-medium">{r.plan}</span> },
    { id: "subscribers", header: "Subscribers", align: "right", sortValue: (r) => r.subscribers, cell: (r) => <span className="tabular">{f.number(r.subscribers)}</span> },
    { id: "mrr", header: "MRR", align: "right", sortValue: (r) => r.mrr, cell: (r) => <span className="font-medium tabular">{f.currency(r.mrr)}</span> },
    { id: "share", header: "Revenue share", align: "right", sortValue: (r) => r.share, cell: (r) => <span className="tabular">{f.percent(r.share)}</span> },
    ...(compare ? [{ id: "change", header: "Change", align: "right" as const, sortValue: (r: PlanRevenueRow) => r.change ?? -Infinity, cell: (r: PlanRevenueRow) => <TrendBadge change={r.change} polarity="up-good" /> }] : []),
  ];
  function exportCsv() {
    return downloadCsv("revenue-by-plan.csv", ["Plan", "Subscribers", "MRR (USD)", "Revenue share %", "Previous period MRR (USD)", "Change %"],
      rows.map((r) => [r.plan, r.subscribers, r.mrr.toFixed(2), r.share.toFixed(2), r.previousMrr.toFixed(2), r.change === null ? "" : r.change.toFixed(2)]));
  }
  return (
    <Card>
      <CardHeader className="pb-4">
        <div>
          <CardTitle>Revenue by plan</CardTitle>
          <CardDescription>MRR at the end of the period · change compares with the previous period end</CardDescription>
        </div>
        <ExportButton size="sm" onExport={exportCsv} />
      </CardHeader>
      <DataTable caption="Revenue by plan" data={rows} columns={columns} getRowId={(r) => r.plan}
        empty={<EmptyState title="No plans match" description="Adjust the filters to see plan revenue." />} />
    </Card>
  );
}

