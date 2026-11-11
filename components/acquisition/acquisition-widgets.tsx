"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import type { AcquisitionChannel, Aggregation } from "@/types/analytics";
import type { Funnel } from "@/lib/mock-data/acquisition";
import { ratioPercent } from "@/lib/calculations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/controls";
import { ResponsiveContainer, AXIS_PROPS, bucketLabel, ChartTooltipCard, DataTableDisclosure, GRID_COLOR, SERIES } from "@/components/charts/chart-utils";
import { AggControl } from "@/components/dashboard/agg-control";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportButton } from "@/components/shared/export-button";
import { useFormatters } from "@/hooks/use-formatters";
import { downloadCsv } from "@/lib/csv";

export function FunnelCard({ funnel }: { funnel: Funnel }) {
  const f = useFormatters();
  const stages = [
    { label: "Visitors", value: funnel.visitors },
    { label: "Signups", value: funnel.signups },
    { label: "Activated users", value: funnel.activated },
    { label: "Paid customers", value: funnel.customers },
  ];
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Acquisition funnel</CardTitle>
          <CardDescription>Step conversion = stage ÷ previous stage · drop-off = 100% − conversion</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {stages.map((s, i) => {
            const prev = i > 0 ? stages[i - 1].value : null;
            const conv = prev === null ? null : ratioPercent(s.value, prev);
            return (
              <li key={s.label}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="tabular">
                    <span className="font-semibold">{f.number(s.value)}</span>
                    {conv !== null && <span className="ml-2 text-xs text-muted">{f.percent(conv)} converted · {f.percent(100 - conv)} drop-off</span>}
                  </span>
                </div>
                <div className="h-7 rounded-md bg-surface-muted" aria-hidden>
                  <div className="h-7 rounded-md" style={{ width: `${Math.max(1.5, ratioPercent(s.value, stages[0].value))}%`, background: SERIES[0], opacity: 1 - i * 0.18 }} />
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-[13px] text-muted">Overall visitor-to-customer rate: <span className="font-semibold text-foreground tabular">{f.percent(ratioPercent(funnel.customers, funnel.visitors), 2)}</span></p>
      </CardContent>
    </Card>
  );
}

type ChannelMetric = "visitors" | "signups" | "customers" | "cac";

export function ChannelChart({ rows }: { rows: AcquisitionChannel[] }) {
  const f = useFormatters();
  const [metric, setMetric] = useState<ChannelMetric>("customers");
  const data = rows.map((r) => ({ channel: r.channel, value: metric === "cac" ? r.cac ?? 0 : r[metric] })).sort((a, b) => b.value - a.value);
  const fmt = (v: number) => (metric === "cac" ? f.currency(v, true) : f.number(v));
  const label = { visitors: "Visitors", signups: "Signups", customers: "Acquired customers", cac: "CAC" }[metric];
  return (
    <Card>
      <CardHeader>
        <div><CardTitle>Channel performance</CardTitle><CardDescription>{label} by channel</CardDescription></div>
        <Segmented label="Channel metric" value={metric} onChange={setMetric} options={[{ value: "customers", label: "Customers" }, { value: "signups", label: "Signups" }, { value: "visitors", label: "Visitors" }, { value: "cac", label: "CAC" }]} />
      </CardHeader>
      <CardContent>
        <div role="img" aria-label={`${label} by channel: ${data.map((d) => `${d.channel} ${fmt(d.value)}`).join(", ")}`} className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height: 260 }}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} strokeDasharray="3 3" />
              <XAxis type="number" {...AXIS_PROPS} tickFormatter={(v: number) => (metric === "cac" ? f.axisCurrency(v) : f.number(v))} />
              <YAxis type="category" dataKey="channel" {...AXIS_PROPS} width={104} />
              <Tooltip cursor={{ fill: "rgb(var(--surface-muted) / 0.6)" }} content={({ active, payload }) => active && payload?.length ? <ChartTooltipCard title={String(payload[0].payload.channel)} rows={[{ name: label, value: fmt(Number(payload[0].payload.value)), color: SERIES[0] }]} /> : null} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                {data.map((d) => <Cell key={d.channel} fill={SERIES[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChannelTable({ rows }: { rows: AcquisitionChannel[] }) {
  const f = useFormatters();
  const columns: Column<AcquisitionChannel>[] = [
    { id: "channel", header: "Channel", sortValue: (r) => r.channel, cell: (r) => <span className="font-medium">{r.channel}</span> },
    { id: "visitors", header: "Visitors", align: "right", sortValue: (r) => r.visitors, cell: (r) => <span className="tabular">{f.number(r.visitors)}</span> },
    { id: "signups", header: "Signups", align: "right", sortValue: (r) => r.signups, cell: (r) => <span className="tabular">{f.number(r.signups)}</span> },
    { id: "conversion", header: "Conversion", align: "right", sortValue: (r) => r.conversionRate, cell: (r) => <span className="tabular">{f.percent(r.conversionRate)}</span> },
    { id: "spend", header: "Spend", align: "right", sortValue: (r) => r.spend, cell: (r) => <span className="tabular">{f.currency(r.spend)}</span> },
    { id: "customers", header: "Customers", align: "right", sortValue: (r) => r.customers, cell: (r) => <span className="tabular">{f.number(r.customers)}</span> },
    { id: "cac", header: "CAC", align: "right", sortValue: (r) => r.cac ?? Infinity, cell: (r) => <span className="font-medium tabular">{r.cac === null ? "—" : f.currency(r.cac, true)}</span> },
  ];
  function exportCsv() {
    return downloadCsv("acquisition-channels.csv", ["Channel", "Visitors", "Signups", "Conversion rate %", "Spend (USD)", "Acquired customers", "CAC (USD)"],
      rows.map((r) => [r.channel, r.visitors, r.signups, r.conversionRate.toFixed(2), r.spend.toFixed(2), r.customers, r.cac === null ? "" : r.cac.toFixed(2)]));
  }
  return (
    <Card>
      <CardHeader className="pb-4">
        <div><CardTitle>Channels</CardTitle><CardDescription>CAC = spend ÷ acquired customers · conversion = signups ÷ visitors</CardDescription></div>
        <ExportButton size="sm" onExport={exportCsv} />
      </CardHeader>
      <DataTable caption="Acquisition by channel" data={rows} columns={columns} getRowId={(r) => r.channel} empty={<EmptyState title="No channels" />} />
    </Card>
  );
}

export function SignupsTrend({ data, agg }: { data: Array<{ date: string; visitors: number; signups: number; customers: number }>; agg: Aggregation }) {
  const f = useFormatters();
  return (
    <Card>
      <CardHeader>
        <div><CardTitle>Signups over time</CardTitle><CardDescription>Signups per period for the selected filters</CardDescription></div>
        <AggControl value={agg} />
      </CardHeader>
      <CardContent>
        <div role="img" aria-label="Area chart of signups over the selected period" className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 220 }}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="3 3" />
              <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={24} tickFormatter={(d: string) => bucketLabel(d, agg)} />
              <YAxis {...AXIS_PROPS} width={44} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof data)[number];
                return <ChartTooltipCard title={bucketLabel(p.date, agg, true)} rows={[{ name: "Signups", value: f.number(p.signups), color: SERIES[0] }, { name: "Visitors", value: f.number(p.visitors) }, { name: "Paid customers", value: f.number(p.customers) }]} />;
              }} />
              <Area type="monotone" dataKey="signups" stroke={SERIES[0]} strokeWidth={2} fill={SERIES[0]} fillOpacity={0.1} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <DataTableDisclosure caption="Signups over time" headers={["Period", "Visitors", "Signups", "Paid customers"]} rows={data.map((d) => [bucketLabel(d.date, agg, true), f.number(d.visitors), f.number(d.signups), f.number(d.customers)])} />
      </CardContent>
    </Card>
  );
}
