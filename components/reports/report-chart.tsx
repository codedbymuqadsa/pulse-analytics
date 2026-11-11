"use client";

import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import type { ReportConfig, ReportSeries } from "@/types/report";
import { ResponsiveContainer, AXIS_PROPS, ChartTooltipCard, DataTableDisclosure, GRID_COLOR, Legend, SERIES } from "@/components/charts/chart-utils";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/card";
import { useFormatters } from "@/hooks/use-formatters";
import { formatDate } from "@/lib/formatters";
import { metricMeta } from "@/lib/report-meta";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; series: ReportSeries };

/** Loads report data from the (mock) API route and renders the configured chart. */
export function useReportSeries(config: ReportConfig) {
  const [state, setState] = useState<State>({ status: "loading" });
  const { metric, chartType, range, groupBy } = config;

  const load = useCallback(async (signal?: AbortSignal) => {
    setState({ status: "loading" });
    try {
      const qs = new URLSearchParams({ metric, chartType, range, groupBy });
      const res = await fetch(`/api/report-data?${qs}`, { signal });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Request failed");
      setState({ status: "ready", series: json.data });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState({ status: "error", message: (e as Error).message || "Could not load report data." });
    }
  }, [metric, chartType, range, groupBy]);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  return { state, retry: () => load() };
}

export function ReportChart({ config, state, retry, height = 280 }: { config: ReportConfig; state: State; retry: () => void; height?: number }) {
  const f = useFormatters();
  const meta = metricMeta(config.metric);
  const fmt = (v: number, precise = false) => (meta.currency ? f.currency(v, precise) : f.number(v));

  if (state.status === "loading") return <div role="status" aria-label="Loading report data"><Skeleton style={{ height }} className="w-full" /></div>;
  if (state.status === "error") return <ErrorState title="Couldn't load report data" description={state.message} onRetry={retry} className="py-10" />;
  const { keys, rows } = state.series;
  if (rows.length === 0) return <EmptyState icon={BarChart3} title="No data" description="This configuration returned no data." />;

  const grouped = keys.length > 1;
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="3 3" />
      <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={28} tickFormatter={(d: string) => formatDate(d, "MMM d")} />
      <YAxis {...AXIS_PROPS} width={meta.currency ? 56 : 44} tickFormatter={(v: number) => (meta.currency ? f.axisCurrency(v) : f.number(v))} />
      <Tooltip
        cursor={config.chartType === "bar" ? { fill: "rgb(var(--surface-muted) / 0.6)" } : { stroke: "rgb(var(--muted))", strokeDasharray: "3 3" }}
        content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const row = payload[0].payload as Record<string, number | string>;
          return <ChartTooltipCard title={formatDate(String(row.date), "EEE, MMM d, yyyy")} rows={keys.map((k, i) => ({ name: k, value: fmt(Number(row[k]), true), color: SERIES[i % SERIES.length] }))} />;
        }}
      />
    </>
  );
  const margin = { top: 8, right: 8, bottom: 0, left: 0 };

  return (
    <div>
      {grouped && <div className="mb-3"><Legend items={keys.map((k, i) => ({ label: k, color: SERIES[i % SERIES.length] }))} /></div>}
      <div role="img" aria-label={`${meta.label} ${config.chartType} chart${grouped ? ` grouped by ${config.groupBy}` : ""}`} style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height }}>
          {config.chartType === "bar" ? (
            <BarChart data={rows} margin={margin}>
              {axes}
              {keys.map((k, i) => <Bar key={k} dataKey={k} stackId={grouped ? "s" : undefined} fill={SERIES[i % SERIES.length]} radius={grouped ? 0 : [4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />)}
            </BarChart>
          ) : config.chartType === "area" ? (
            <AreaChart data={rows} margin={margin}>
              {axes}
              {keys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stackId={grouped ? "s" : undefined} stroke={SERIES[i % SERIES.length]} strokeWidth={1.75} fill={SERIES[i % SERIES.length]} fillOpacity={0.16} dot={false} isAnimationActive={false} />)}
            </AreaChart>
          ) : (
            <LineChart data={rows} margin={margin}>
              {axes}
              {keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />)}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <DataTableDisclosure caption={`${meta.label} data`} headers={["Date", ...keys]} rows={rows.map((r) => [formatDate(String(r.date)), ...keys.map((k) => fmt(Number(r[k]), true))])} />
    </div>
  );
}
