"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import type { PlanRevenueRow } from "@/lib/metrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, ChartTooltipCard, SERIES } from "@/components/charts/chart-utils";
import { EmptyState } from "@/components/shared/empty-state";
import { useFormatters } from "@/hooks/use-formatters";
import { PLAN_TIERS } from "@/lib/mock-data/constants";

export function RevenueBreakdownChart({ rows, className }: { rows: PlanRevenueRow[]; className?: string }) {
  const f = useFormatters();
  const total = rows.reduce((a, r) => a + r.mrr, 0);
  const colorOf = (plan: string) => SERIES[PLAN_TIERS.indexOf(plan as (typeof PLAN_TIERS)[number]) % SERIES.length];
  const data = rows.filter((r) => r.mrr > 0);

  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>Revenue breakdown</CardTitle>
          <CardDescription>MRR by plan at the end of the period</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {total <= 0 ? (
          <EmptyState icon={PieIcon} title="No recurring revenue" description="No active subscriptions at the end of this period." />
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div
              role="img"
              aria-label={`MRR by plan: ${rows.map((r) => `${r.plan} ${r.share.toFixed(1)} percent`).join(", ")}. Total ${f.currency(total)}.`}
              className="relative size-44 shrink-0"
            >
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 176, height: 176 }}>
                <PieChart>
                  <Pie data={data} dataKey="mrr" nameKey="plan" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="rgb(var(--surface))" strokeWidth={2} isAnimationActive={false}>
                    {data.map((r) => <Cell key={r.plan} fill={colorOf(r.plan)} />)}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const r = payload[0].payload as PlanRevenueRow;
                      return <ChartTooltipCard title={r.plan} rows={[{ name: "MRR", value: f.currency(r.mrr, true), color: colorOf(r.plan) }, { name: "Share", value: f.percent(r.share) }, { name: "Subscribers", value: f.number(r.subscribers) }]} />;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted">Total MRR</span>
                <span className="text-lg font-semibold tabular">{f.currency(total)}</span>
              </div>
            </div>
            <table className="w-full text-sm">
              <caption className="sr-only">MRR by plan</caption>
              <thead className="sr-only"><tr><th scope="col">Plan</th><th scope="col">MRR</th><th scope="col">Share</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.plan}>
                    <td className="py-1.5 pr-2"><span className="flex items-center gap-2"><span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: colorOf(r.plan) }} />{r.plan}</span></td>
                    <td className="py-1.5 text-right font-medium tabular">{f.currency(r.mrr)}</td>
                    <td className="w-14 py-1.5 pl-2 text-right text-muted tabular">{f.percent(r.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
