"use client";

import { ResponsiveContainer } from "@/components/charts/chart-utils";
import { Area, AreaChart, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import type { MetricFormat, TrendPolarity } from "@/types/analytics";
import { Card } from "@/components/ui/card";
import { Hint } from "@/components/ui/controls";
import { useFormatters } from "@/hooks/use-formatters";
import { trendFor } from "@/lib/calculations";
import { formatSignedPercent } from "@/lib/formatters";
import { usePreferences } from "@/lib/stores";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  description: string;
  value: number;
  format: MetricFormat;
  change: number | null;
  polarity: TrendPolarity;
  /** When false, the comparison badge is hidden (compare toggle off). */
  showChange?: boolean;
  spark?: number[];
  icon?: React.ReactNode;
}

export function useMetricValue() {
  const f = useFormatters();
  return (value: number, format: MetricFormat) =>
    format === "currency" ? f.currency(value) : format === "currency-precise" ? f.currency(value, true) : format === "percent" ? f.percent(value) : f.number(value);
}

export function TrendBadge({ change, polarity }: { change: number | null; polarity: TrendPolarity }) {
  const { locale } = usePreferences();
  const trend = trendFor(change, polarity);
  const Icon = change === null || trend === "neutral" ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  const text = change === null ? "No prior data" : formatSignedPercent(change, { locale });
  const sr = change === null ? "No comparison available" : `${change > 0 ? "Up" : change < 0 ? "Down" : "No change"} ${formatSignedPercent(Math.abs(change), { locale }).replace(/^[+−]/, "")}, ${trend === "positive" ? "favorable" : trend === "negative" ? "unfavorable" : "neutral"}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
        trend === "positive" && "bg-success-soft text-success",
        trend === "negative" && "bg-danger-soft text-danger",
        trend === "neutral" && "bg-surface-muted text-muted",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span aria-hidden>{text}</span>
      <span className="sr-only">{sr}</span>
    </span>
  );
}

export function MetricCard({ label, description, value, format, change, polarity, showChange = true, spark, icon }: MetricCardProps) {
  const fmt = useMetricValue();
  const data = (spark ?? []).map((v, i) => ({ i, v }));
  const gid = `spark-${label.replace(/\W+/g, "")}`;
  return (
    <Card className="flex flex-col justify-between gap-3 p-5" data-testid="metric-card">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
          {icon}
          {label}
        </p>
        <Hint content={description}>
          <button type="button" aria-label={`About ${label}: ${description}`} className="rounded-full text-muted hover:text-foreground"><Info className="size-4" /></button>
        </Hint>
      </div>
      <p className="text-[28px] font-semibold leading-9 tracking-tight tabular xl:text-[30px]" data-testid="metric-value">{fmt(value, format)}</p>
      <div className="flex min-h-9 items-end justify-between gap-3">
        {showChange ? <div className="flex items-center gap-1.5 text-xs text-muted"><TrendBadge change={change} polarity={polarity} /><span>vs prev. period</span></div> : <span className="text-xs text-muted">Comparison off</span>}
        {data.length > 1 && (
          <div aria-hidden className="h-9 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 80, height: 36 }}>
              <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--chart-1))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="rgb(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Area type="monotone" dataKey="v" stroke="rgb(var(--chart-1))" strokeWidth={1.5} fill={`url(#${gid})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
