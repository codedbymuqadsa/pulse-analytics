"use client";

import { Area, AreaChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import type { Aggregation } from "@/types/analytics";
import type { ComparisonPoint } from "@/types/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AggControl } from "@/components/dashboard/agg-control";
import { TrendBadge } from "@/components/dashboard/metric-card";
import { ResponsiveContainer, AXIS_PROPS, bucketLabel, ChartTooltipCard, DataTableDisclosure, GRID_COLOR, Legend, PREVIOUS_COLOR, SERIES } from "@/components/charts/chart-utils";
import { EmptyState } from "@/components/shared/empty-state";
import { useFormatters } from "@/hooks/use-formatters";
import { usePreferences } from "@/lib/stores";
import { BarChart3 } from "lucide-react";

interface Props {
  points: ComparisonPoint[];
  agg: Aggregation;
  compare: boolean;
  total: number;
  change: number | null;
  rangeLabel: string;
  title?: string;
  description?: string;
  className?: string;
}

export function RevenueChart({ points, agg, compare, total, change, rangeLabel, title = "Revenue performance", description, className }: Props) {
  const f = useFormatters();
  const { chartStyle } = usePreferences();
  const hasPrev = compare && points.some((p) => p.previous !== null);
  const summary = `${title}, ${rangeLabel}: total ${f.currency(total)}${change !== null && compare ? `, ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}% from the previous period` : ""}.`;

  const common = { data: points, margin: { top: 8, right: 8, bottom: 0, left: 0 } };
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="3 3" />
      <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={24} tickFormatter={(d: string) => bucketLabel(d, agg)} />
      <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v: number) => f.axisCurrency(v)} domain={[(min: number) => Math.max(0, Math.floor(min * 0.9)), "auto"]} />
      <Tooltip
        cursor={{ stroke: "rgb(var(--muted))", strokeDasharray: "3 3" }}
        content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const p = payload[0].payload as ComparisonPoint;
          return (
            <ChartTooltipCard
              title={bucketLabel(p.date, agg, true)}
              rows={[
                { name: "Revenue", value: f.currency(p.value, true), color: SERIES[0] },
                ...(hasPrev && p.previous !== null ? [{ name: p.previousDate ? bucketLabel(p.previousDate, agg) : "Previous", value: f.currency(p.previous, true), color: PREVIOUS_COLOR, dashed: true }] : []),
              ]}
            />
          );
        }}
      />
    </>
  );
  const prevLine = hasPrev && <Line type="monotone" dataKey="previous" stroke={PREVIOUS_COLOR} strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />;

  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description ?? `Recognised daily revenue · ${rangeLabel}`}</CardDescription>
        </div>
        <AggControl value={agg} />
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-2xl font-semibold tabular" data-testid="revenue-total">{f.currency(total)}</p>
          {compare && <TrendBadge change={change} polarity="up-good" />}
          <div className="ml-auto"><Legend items={[{ label: "Current period", color: SERIES[0] }, ...(hasPrev ? [{ label: "Previous period", color: PREVIOUS_COLOR, dashed: true }] : [])]} /></div>
        </div>
        {points.length === 0 ? (
          <EmptyState icon={BarChart3} title="No revenue data" description="There is no data for the selected range." />
        ) : (
          <>
            <div role="img" aria-label={summary} className="h-[260px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}>
                {chartStyle === "line" ? (
                  <LineChart {...common}>
                    {axes}
                    <Line type="monotone" dataKey="value" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--surface))" }} isAnimationActive={false} />
                    {prevLine}
                  </LineChart>
                ) : (
                  <AreaChart {...common}>
                    <defs>
                      <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    {axes}
                    <Area type="monotone" dataKey="value" stroke={SERIES[0]} strokeWidth={2} fill="url(#rev-fill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--surface))" }} isAnimationActive={false} />
                    {hasPrev && <Line type="monotone" dataKey="previous" stroke={PREVIOUS_COLOR} strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
            <DataTableDisclosure
              caption={`${title} data`}
              headers={["Period", "Revenue", ...(hasPrev ? ["Previous period"] : [])]}
              rows={points.map((p) => [bucketLabel(p.date, agg, true), f.currency(p.value, true), ...(hasPrev ? [p.previous === null ? "—" : f.currency(p.previous, true)] : [])])}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
