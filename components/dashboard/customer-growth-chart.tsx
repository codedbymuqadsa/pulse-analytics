"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Users } from "lucide-react";
import type { Aggregation } from "@/types/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/controls";
import { AggControl } from "@/components/dashboard/agg-control";
import { ResponsiveContainer, AXIS_PROPS, bucketLabel, ChartTooltipCard, DataTableDisclosure, GRID_COLOR, Legend, SERIES } from "@/components/charts/chart-utils";
import { EmptyState } from "@/components/shared/empty-state";
import { useFormatters } from "@/hooks/use-formatters";

export interface GrowthPoint { date: string; newCustomers: number; churnedCustomers: number; activeSubscriptions: number }

export function CustomerGrowthChart({ data, agg, rangeLabel, className }: { data: GrowthPoint[]; agg: Aggregation; rangeLabel: string; className?: string }) {
  const f = useFormatters();
  const [view, setView] = useState<"flow" | "active">("flow");
  const totalNew = data.reduce((a, d) => a + d.newCustomers, 0);
  const totalChurn = data.reduce((a, d) => a + d.churnedCustomers, 0);

  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="3 3" />
      <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={24} tickFormatter={(d: string) => bucketLabel(d, agg)} />
      <YAxis {...AXIS_PROPS} width={44} allowDecimals={false} domain={view === "active" ? ["dataMin - 20", "dataMax + 20"] : [0, "auto"]} />
      <Tooltip
        cursor={{ fill: "rgb(var(--surface-muted) / 0.6)" }}
        content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const p = payload[0].payload as GrowthPoint;
          return (
            <ChartTooltipCard
              title={bucketLabel(p.date, agg, true)}
              rows={view === "flow"
                ? [{ name: "New customers", value: f.number(p.newCustomers), color: SERIES[0] }, { name: "Churned", value: f.number(p.churnedCustomers), color: SERIES[1] }]
                : [{ name: "Active subscriptions", value: f.number(p.activeSubscriptions), color: SERIES[0] }]}
            />
          );
        }}
      />
    </>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>Customer growth</CardTitle>
          <CardDescription>{rangeLabel} · {f.number(totalNew)} new, {f.number(totalChurn)} churned</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Customer metric" value={view} onChange={setView} options={[{ value: "flow", label: "New vs churned" }, { value: "active", label: "Active" }]} />
          <AggControl value={agg} />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={Users} title="No customer data" description="There is no data for the selected range." />
        ) : (
          <>
            <div className="mb-3">
              <Legend items={view === "flow" ? [{ label: "New customers", color: SERIES[0] }, { label: "Churned customers", color: SERIES[1] }] : [{ label: "Active subscriptions", color: SERIES[0] }]} />
            </div>
            <div role="img" aria-label={`Customer growth, ${rangeLabel}: ${totalNew} new and ${totalChurn} churned customers.`} className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 240 }}>
                {view === "flow" ? (
                  <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
                    {axes}
                    <Bar dataKey="newCustomers" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                    <Bar dataKey="churnedCustomers" fill={SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                  </BarChart>
                ) : (
                  <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    {axes}
                    <Area type="monotone" dataKey="activeSubscriptions" stroke={SERIES[0]} strokeWidth={2} fill={SERIES[0]} fillOpacity={0.1} dot={false} isAnimationActive={false} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
            <DataTableDisclosure
              caption="Customer growth data"
              headers={["Period", "New", "Churned", "Active subscriptions"]}
              rows={data.map((d) => [bucketLabel(d.date, agg, true), f.number(d.newCustomers), f.number(d.churnedCustomers), f.number(d.activeSubscriptions)])}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
