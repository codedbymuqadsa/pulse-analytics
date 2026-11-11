import type { BillingInterval, DashboardMetric, DateRange, PlanTier, ResolvedRange, RevenueDataPoint } from "@/types/analytics";
import type { Customer, CustomerStatus } from "@/types/customer";
import { dayIndex } from "@/lib/date-range";
import { percentChange, ratioPercent, safeDivide, sum } from "@/lib/calculations";
import { PLAN_TIERS } from "@/lib/mock-data/constants";
import { mrrOnDate, planOnDate } from "@/lib/mock-data/customers";

function downsample(xs: number[], max = 40): number[] {
  if (xs.length <= max) return xs;
  const step = xs.length / max;
  return Array.from({ length: max }, (_, i) => xs[Math.min(xs.length - 1, Math.floor(i * step))]);
}

/** Row on the last day of `range`, or null when outside the dataset. */
function endRow(daily: RevenueDataPoint[], range: DateRange): RevenueDataPoint | null {
  return daily[dayIndex(range.to)] ?? null;
}

/**
 * Churn rate = customers who cancelled during the period ÷ active subscriptions
 * the day before the period, normalised to a 30-day month.
 */
export function churnRate(daily: RevenueDataPoint[], range: DateRange): number | null {
  const a = dayIndex(range.from);
  const b = dayIndex(range.to);
  if (a < 1 || b >= daily.length || b < a) return null;
  const churned = sum(daily.slice(a, b + 1).map((r) => r.churnedCustomers));
  const base = daily[a - 1].activeSubscriptions;
  if (base === 0) return null;
  return ratioPercent(churned, base) * (30 / (b - a + 1));
}

export function computeMetrics(daily: RevenueDataPoint[], range: ResolvedRange, compare: boolean): DashboardMetric[] {
  const cur = endRow(daily, range);
  const prev = compare ? endRow(daily, range.previous) : null;
  const slice = daily.slice(Math.max(0, dayIndex(range.from)), dayIndex(range.to) + 1);
  const arpa = (r: RevenueDataPoint | null) => (r ? safeDivide(r.mrr, r.activeSubscriptions) : null);
  const prevChurn = compare ? churnRate(daily, range.previous) : null;
  const curChurn = churnRate(daily, range) ?? 0;

  const mk = (m: Omit<DashboardMetric, "change">): DashboardMetric => ({ ...m, change: m.previousValue === null ? null : percentChange(m.value, m.previousValue) });

  return [
    mk({ id: "mrr", label: "Monthly Recurring Revenue", description: "Normalised monthly value of all active paid subscriptions at the end of the period.", value: cur?.mrr ?? 0, previousValue: prev?.mrr ?? null, polarity: "up-good", format: "currency", spark: downsample(slice.map((r) => r.mrr)) }),
    mk({ id: "arr", label: "Annual Recurring Revenue", description: "MRR × 12. A run-rate projection, not recognised revenue.", value: (cur?.mrr ?? 0) * 12, previousValue: prev ? prev.mrr * 12 : null, polarity: "up-good", format: "currency", spark: downsample(slice.map((r) => r.mrr * 12)) }),
    mk({ id: "customers", label: "Total Customers", description: "Every customer record created up to the end of the period, including cancelled accounts.", value: cur?.totalCustomers ?? 0, previousValue: prev?.totalCustomers ?? null, polarity: "up-good", format: "number", spark: downsample(slice.map((r) => r.totalCustomers)) }),
    mk({ id: "subscriptions", label: "Active Subscriptions", description: "Paying subscriptions (one per customer) active at the end of the period. Trials are excluded.", value: cur?.activeSubscriptions ?? 0, previousValue: prev?.activeSubscriptions ?? null, polarity: "up-good", format: "number", spark: downsample(slice.map((r) => r.activeSubscriptions)) }),
    mk({ id: "arpa", label: "Avg Revenue Per Account", description: "MRR ÷ active subscriptions at the end of the period.", value: arpa(cur) ?? 0, previousValue: arpa(prev), polarity: "up-good", format: "currency-precise", spark: downsample(slice.map((r) => safeDivide(r.mrr, r.activeSubscriptions) ?? 0)) }),
    mk({ id: "churn", label: "Churn Rate", description: "Customers cancelled in the period ÷ active subscriptions at its start, normalised to 30 days. Lower is better.", value: curChurn, previousValue: prevChurn, polarity: "down-good", format: "percent", spark: [] }),
  ];
}

export interface PlanRevenueRow {
  plan: PlanTier;
  subscribers: number;
  mrr: number;
  share: number;
  previousMrr: number;
  change: number | null;
}

export function revenueByPlan(customers: Customer[], range: DateRange, prevRange: DateRange): PlanRevenueRow[] {
  const cur = new Map<PlanTier, { n: number; mrr: number }>();
  const prev = new Map<PlanTier, number>();
  for (const t of PLAN_TIERS) cur.set(t, { n: 0, mrr: 0 });
  for (const c of customers) {
    const m = mrrOnDate(c, range.to);
    if (m > 0) {
      const e = cur.get(planOnDate(c, range.to))!;
      e.n += 1;
      e.mrr += m;
    }
    const pm = mrrOnDate(c, prevRange.to);
    if (pm > 0) prev.set(planOnDate(c, prevRange.to), (prev.get(planOnDate(c, prevRange.to)) ?? 0) + pm);
  }
  const total = sum([...cur.values()].map((v) => v.mrr));
  return PLAN_TIERS.map((plan) => {
    const e = cur.get(plan)!;
    const pm = prev.get(plan) ?? 0;
    return { plan, subscribers: e.n, mrr: Math.round(e.mrr * 100) / 100, share: ratioPercent(e.mrr, total), previousMrr: pm, change: percentChange(e.mrr, pm) };
  });
}

export interface MrrMovement {
  newMrr: number;
  upgrades: number;
  downgrades: number;
  cancellations: number;
  /** newMrr + upgrades − downgrades − cancellations */
  net: number;
}

export function mrrMovement(rows: RevenueDataPoint[]): MrrMovement {
  const newMrr = sum(rows.map((r) => r.newMrr));
  const upgrades = sum(rows.map((r) => r.expansionMrr));
  const downgrades = sum(rows.map((r) => r.contractionMrr));
  const cancellations = sum(rows.map((r) => r.churnedMrr));
  const r = (x: number) => Math.round(x * 100) / 100;
  return { newMrr: r(newMrr), upgrades: r(upgrades), downgrades: r(downgrades), cancellations: r(cancellations), net: r(newMrr + upgrades - downgrades - cancellations) };
}

export interface RevenueFilters {
  plan?: PlanTier;
  billing?: BillingInterval;
  status?: CustomerStatus;
}

export function filterForRevenue(list: Customer[], f: RevenueFilters): Customer[] {
  return list.filter((c) => (!f.plan || c.plan === f.plan) && (!f.billing || c.billing === f.billing) && (!f.status || c.status === f.status));
}
