import "server-only";
import type { Aggregation, ComparisonPoint, DashboardMetric, PlanTier, ResolvedRange, RevenueDataPoint } from "@/types/analytics";
import { computeMetrics, filterForRevenue, mrrMovement, revenueByPlan, type RevenueFilters } from "@/lib/metrics";
import { allCustomers } from "@/lib/mock-data/customers";
import { aggregateSeries, buildDaily, fullDaily, sliceDaily, sumFlows } from "@/lib/mock-data/revenue";
import { allTransactions } from "@/lib/mock-data/transactions";
import { filterTransactions, paginate, sortTransactions, type TransactionQuery } from "@/lib/filters";
import { percentChange } from "@/lib/calculations";

/*
 * Repository layer. Everything is async and returns plain serialisable data so
 * the mock implementations can be swapped for real API calls without touching pages.
 */

export async function getDashboardMetrics(range: ResolvedRange, compare: boolean): Promise<DashboardMetric[]> {
  return computeMetrics(fullDaily(), range, compare);
}

export type SeriesField = keyof Pick<RevenueDataPoint, "revenue" | "mrr" | "newCustomers" | "churnedCustomers" | "activeSubscriptions">;

export async function getRevenueData(
  range: ResolvedRange, agg: Aggregation, compare: boolean, daily: RevenueDataPoint[] = fullDaily(),
): Promise<{ current: RevenueDataPoint[]; points: ComparisonPoint[]; total: number; previousTotal: number | null; change: number | null }> {
  const current = aggregateSeries(sliceDaily(daily, range), agg);
  const prevRows = compare ? aggregateSeries(sliceDaily(daily, range.previous), agg) : [];
  const points = current.map((r, i) => ({
    date: r.date, value: r.revenue,
    previous: compare && prevRows[i] ? prevRows[i].revenue : null,
    previousDate: compare && prevRows[i] ? prevRows[i].date : null,
  }));
  const total = sumFlows(sliceDaily(daily, range)).revenue;
  const previousTotal = compare ? sumFlows(sliceDaily(daily, range.previous)).revenue : null;
  return { current, points, total, previousTotal, change: previousTotal === null ? null : percentChange(total, previousTotal) };
}

export async function getGrowthData(range: ResolvedRange, agg: Aggregation) {
  return aggregateSeries(sliceDaily(fullDaily(), range), agg).map((r) => ({
    date: r.date, newCustomers: r.newCustomers, churnedCustomers: r.churnedCustomers, activeSubscriptions: r.activeSubscriptions,
  }));
}

export async function getPlanBreakdown(range: ResolvedRange) {
  return revenueByPlan(allCustomers(), range, range.previous);
}

export async function getTransactionsPage(range: ResolvedRange, q: TransactionQuery) {
  const rows = sortTransactions(filterTransactions(allTransactions(), q, range), q.sort, q.dir);
  return paginate(rows, q.page, q.pageSize);
}

export async function getTransactionsForExport(range: ResolvedRange, q: Pick<TransactionQuery, "q" | "status" | "sort" | "dir">) {
  return sortTransactions(filterTransactions(allTransactions(), q, range), q.sort, q.dir);
}

/** Top customers ranked by paid invoice total inside the selected range. */
export async function getTopCustomers(range: ResolvedRange, limit = 5) {
  const totals = new Map<string, number>();
  for (const t of allTransactions()) {
    if (t.status === "paid" && t.date >= range.from && t.date <= range.to) totals.set(t.customerId, (totals.get(t.customerId) ?? 0) + t.amount);
  }
  const byId = new Map(allCustomers().map((c) => [c.id, c]));
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id, revenue]) => ({ customer: byId.get(id)!, revenue: Math.round(revenue * 100) / 100 }));
}

export interface RevenuePageData {
  metrics: Array<{ id: string; label: string; description: string; value: number; previous: number | null; change: number | null; polarity: "up-good" | "down-good" }>;
  points: ComparisonPoint[];
  stacked: Array<{ date: string; newRevenue: number; recurringRevenue: number }>;
  movement: ReturnType<typeof mrrMovement>;
  plans: ReturnType<typeof revenueByPlan>;
  total: number;
  change: number | null;
}

export async function getRevenuePage(range: ResolvedRange, agg: Aggregation, compare: boolean, filters: RevenueFilters): Promise<RevenuePageData> {
  const customers = filterForRevenue(allCustomers(), filters);
  const daily = buildDaily(customers);
  const { current, points, total, change } = await getRevenueData(range, agg, compare, daily);
  const slice = sliceDaily(daily, range);
  const prevSlice = compare ? sliceDaily(daily, range.previous) : [];
  const cur = sumFlows(slice);
  const prev = compare ? sumFlows(prevSlice) : null;
  const endMrr = (rows: RevenueDataPoint[]) => (rows.length ? rows[rows.length - 1].mrr : 0);
  const mk = (id: string, label: string, description: string, value: number, previous: number | null, polarity: "up-good" | "down-good" = "up-good") =>
    ({ id, label, description, value, previous, change: previous === null ? null : percentChange(value, previous), polarity });
  return {
    metrics: [
      mk("mrr", "MRR", "Monthly recurring revenue at the end of the period.", endMrr(slice), compare ? endMrr(prevSlice) : null),
      mk("arr", "ARR", "MRR × 12.", endMrr(slice) * 12, compare ? endMrr(prevSlice) * 12 : null),
      mk("newMrr", "New MRR", "MRR added by new paying subscriptions.", cur.newMrr, prev?.newMrr ?? null),
      mk("expansion", "Expansion MRR", "MRR added by upgrades.", cur.expansionMrr, prev?.expansionMrr ?? null),
      mk("contraction", "Contraction MRR", "MRR lost to downgrades. Lower is better.", cur.contractionMrr, prev?.contractionMrr ?? null, "down-good"),
      mk("churned", "Churned MRR", "MRR lost to cancellations. Lower is better.", cur.churnedMrr, prev?.churnedMrr ?? null, "down-good"),
    ],
    points,
    stacked: current.map((r) => ({ date: r.date, newRevenue: r.newRevenue, recurringRevenue: r.recurringRevenue })),
    movement: mrrMovement(slice),
    plans: revenueByPlan(customers, range, range.previous),
    total,
    change,
  };
}

export type { PlanTier };
