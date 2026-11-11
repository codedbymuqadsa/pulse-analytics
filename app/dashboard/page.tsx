import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { CustomerGrowthChart } from "@/components/dashboard/customer-growth-chart";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { OverviewActions } from "@/components/dashboard/overview-actions";
import { RevenueBreakdownChart } from "@/components/dashboard/revenue-breakdown-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TopCustomers } from "@/components/dashboard/top-customers";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { AllWidgetsHidden, WidgetGate } from "@/components/dashboard/widget-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { parseCompare, resolveRange } from "@/lib/date-range";
import { parseAggregation, parseTransactionQuery } from "@/lib/filters";
import { getDashboardMetrics, getGrowthData, getPlanBreakdown, getRevenueData, getTopCustomers, getTransactionsPage } from "@/lib/repositories/analytics";
import { LayoutDashboard } from "lucide-react";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const compare = parseCompare(sp);
  const agg = parseAggregation(sp, range.days);
  const tq = parseTransactionQuery(sp);

  const [metrics, revenue, growth, plans, txs, top] = await Promise.all([
    getDashboardMetrics(range, compare),
    getRevenueData(range, agg, compare),
    getGrowthData(range, agg),
    getPlanBreakdown(range),
    getTransactionsPage(range, tq),
    getTopCustomers(range),
  ]);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Track your business performance at a glance."
        actions={<OverviewActions metrics={metrics} points={revenue.points} rangeLabel={range.label} />}
      />
      {range.error && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] font-medium text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {range.error} Showing the last 30 days instead.
        </p>
      )}
      <div className="space-y-6">
        <KpiGrid metrics={metrics} compare={compare} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <WidgetGate id="revenueChart">
            <RevenueChart className="lg:col-span-8" points={revenue.points} agg={agg} compare={compare} total={revenue.total} change={revenue.change} rangeLabel={range.label} />
          </WidgetGate>
          <WidgetGate id="breakdown"><RevenueBreakdownChart className="lg:col-span-4" rows={plans} /></WidgetGate>
        </div>
        <WidgetGate id="customerGrowth"><CustomerGrowthChart data={growth} agg={agg} rangeLabel={range.label} /></WidgetGate>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <WidgetGate id="transactions"><div className="min-w-0 xl:col-span-8"><TransactionsTable page={txs} query={tq} /></div></WidgetGate>
          <WidgetGate id="topCustomers"><TopCustomers className="xl:col-span-4 xl:self-start" rows={top} /></WidgetGate>
        </div>
        <AllWidgetsHidden>
          <EmptyState icon={LayoutDashboard} title="All widgets are hidden" description="Use Customize to choose which widgets appear on your overview." />
        </AllWidgetsHidden>
      </div>
    </>
  );
}
