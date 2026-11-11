"use client";

import { format, parseISO } from "date-fns";
import { ResponsiveContainer as RechartsResponsiveContainer } from "recharts";
import { useMounted } from "@/hooks/use-mounted";
import type { Aggregation } from "@/types/analytics";
import { cn } from "@/lib/utils";

/** Categorical series colours resolve from CSS variables so they follow the light / dark theme. */
export const SERIES = ["rgb(var(--chart-1))", "rgb(var(--chart-2))", "rgb(var(--chart-3))", "rgb(var(--chart-4))", "rgb(var(--chart-5))", "rgb(var(--chart-6))"] as const;
export const PREVIOUS_COLOR = "rgb(var(--chart-prev))";
export const GRID_COLOR = "rgb(var(--chart-grid))";
export const AXIS_PROPS = { tickLine: false, axisLine: false, tick: { fontSize: 12 }, tickMargin: 8 } as const;

export function bucketLabel(iso: string, agg: Aggregation, long = false): string {
  try {
    const d = parseISO(iso);
    if (agg === "month") return format(d, long ? "MMMM yyyy" : "MMM yy");
    if (agg === "week") return long ? `Week of ${format(d, "MMM d, yyyy")}` : format(d, "MMM d");
    return format(d, long ? "EEE, MMM d, yyyy" : "MMM d");
  } catch {
    return iso;
  }
}

export interface TooltipRow { name: string; value: string; color?: string; dashed?: boolean }

export function ChartTooltipCard({ title, rows, className }: { title: string; rows: TooltipRow[]; className?: string }) {
  return (
    <div className={cn("min-w-40 rounded-md border bg-surface px-3 py-2 text-xs shadow-lg", className)}>
      <p className="mb-1.5 font-semibold text-foreground">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              {r.color && <span aria-hidden className={cn("inline-block h-0.5 w-3 rounded", r.dashed && "opacity-60")} style={{ background: r.color, height: r.dashed ? 2 : 8, width: 8, borderRadius: r.dashed ? 0 : 2 }} />}
              {r.name}
            </span>
            <span className="font-semibold tabular text-foreground">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" aria-label="Chart legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-4 border-t-2" style={{ borderColor: i.color, borderStyle: i.dashed ? "dashed" : "solid" }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Accessible text alternative for a chart: native disclosure with the underlying data. */
export function DataTableDisclosure({ caption, headers, rows }: { caption: string; headers: string[]; rows: string[][] }) {
  return (
    <details className="group mt-3 text-[13px]">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="underline underline-offset-2">View data table</span>
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-md border">
        <table className="w-full min-w-max text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface-muted">
            <tr>{headers.map((h, i) => <th key={h} scope="col" className={cn("px-3 py-1.5 text-xs font-semibold text-muted", i > 0 && "text-right")}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j} className={cn("px-3 py-1.5 tabular", j > 0 && "text-right")}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * Recharts generates ids from a module-level counter, which differs between server and client renders
 * and causes hydration warnings. Rendering charts after mount avoids that; the parent keeps its height so layout does not shift.
 */
export function ResponsiveContainer(props: React.ComponentProps<typeof RechartsResponsiveContainer>) {
  const mounted = useMounted();
  return mounted ? <RechartsResponsiveContainer {...props} /> : null;
}
