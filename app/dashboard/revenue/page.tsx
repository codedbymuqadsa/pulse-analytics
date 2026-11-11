import type { Metadata } from "next";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { MrrMovementCard, NewVsRecurringChart, PlanRevenueTable } from "@/components/revenue/revenue-widgets";
import { PageHeader } from "@/components/shared/page-header";
import { UrlFilters } from "@/components/shared/url-filters";
import { CompareToggle } from "@/components/shared/date-range-picker";
import { parseCompare, resolveRange } from "@/lib/date-range";
import { parseAggregation } from "@/lib/filters";
import { PLAN_TIERS } from "@/lib/mock-data/constants";
import { getRevenuePage } from "@/lib/repositories/analytics";
import type { BillingInterval, PlanTier } from "@/types/analytics";
import type { CustomerStatus } from "@/types/customer";
import { CUSTOMER_STATUSES } from "@/lib/filters";
import { STATUS_LABELS } from "@/components/shared/status-badge";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Revenue" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function RevenuePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const compare = parseCompare(sp);
  const agg = parseAggregation(sp, range.days);
  const plan = PLAN_TIERS.find((p) => p === one(sp.plan)) as PlanTier | undefined;
  const billing = (["monthly", "annual"] as const).find((b) => b === one(sp.billing)) as BillingInterval | undefined;
  const status = CUSTOMER_STATUSES.find((s) => s === one(sp.status)) as CustomerStatus | undefined;

  const data = await getRevenuePage(range, agg, compare, { plan, billing, status });

  return (
    <>
      <PageHeader title="Revenue" description="Recurring revenue, MRR movement and plan performance." actions={<CompareToggle id="compare-revenue" />} />
      {range.error && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] font-medium text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {range.error} Showing the last 30 days instead.
        </p>
      )}
      <div className="space-y-6">
        <UrlFilters
          filters={[
            { param: "plan", label: "Plan", value: plan, allLabel: "All plans", options: PLAN_TIERS.map((p) => ({ value: p, label: p })) },
            { param: "billing", label: "Billing", value: billing, allLabel: "All intervals", options: [{ value: "monthly", label: "Monthly" }, { value: "annual", label: "Annual" }] },
            { param: "status", label: "Status", value: status, allLabel: "All statuses", options: CUSTOMER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })) },
          ]}
        />
        <section aria-label="Revenue metrics" className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {data.metrics.map((m) => (
            <MetricCard key={m.id} label={m.label} description={m.description} value={m.value} format="currency" change={m.change} polarity={m.polarity} showChange={compare} />
          ))}
        </section>
        <RevenueChart points={data.points} agg={agg} compare={compare} total={data.total} change={data.change} rangeLabel={range.label} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <NewVsRecurringChart data={data.stacked} agg={agg} />
          <MrrMovementCard movement={data.movement} />
        </div>
        <PlanRevenueTable rows={data.plans} compare={compare} />
      </div>
    </>
  );
}
