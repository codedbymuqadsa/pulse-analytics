import "server-only";
import { format, parseISO, subMonths } from "date-fns";
import type { BillingInterval, PlanTier } from "@/types/analytics";
import { DEMO_END } from "@/lib/date-range";
import { allCustomers, mrrOnDate, planOnDate } from "@/lib/mock-data/customers";
import { PLAN_TIERS } from "@/lib/mock-data/constants";
import { SEED_PLANS } from "@/lib/mock-data/products";

export interface PlanStats {
  /** Keyed by `${tier}:${interval}` */
  subscribers: number;
  mrr: number;
  previousMrr: number;
  trend: Array<{ month: string; mrr: number; subscribers: number }>;
  byChannel: Array<{ channel: string; customers: number }>;
}

export interface ProductsData {
  seedPlans: typeof SEED_PLANS;
  stats: Record<string, PlanStats>;
  /** Monthly MRR per tier for the overview chart */
  tierTrend: Array<Record<string, number | string>>;
}

const key = (tier: PlanTier, interval: BillingInterval) => `${tier}:${interval}`;

export async function getProductsData(): Promise<ProductsData> {
  const end = parseISO(DEMO_END);
  const months = Array.from({ length: 12 }, (_, i) => subMonths(end, 11 - i)).map((d, i, arr) =>
    i === arr.length - 1 ? DEMO_END : format(new Date(d.getFullYear(), d.getMonth() + 1, 0), "yyyy-MM-dd"));
  const stats: Record<string, PlanStats> = {};
  for (const t of PLAN_TIERS) for (const i of ["monthly", "annual"] as const)
    stats[key(t, i)] = { subscribers: 0, mrr: 0, previousMrr: 0, trend: months.map((m) => ({ month: format(parseISO(m), "MMM yy"), mrr: 0, subscribers: 0 })), byChannel: [] };
  const channelMaps: Record<string, Map<string, number>> = {};

  for (const c of allCustomers()) {
    months.forEach((m, mi) => {
      const mrr = mrrOnDate(c, m);
      if (mrr <= 0) return;
      const s = stats[key(planOnDate(c, m), c.billing)];
      s.trend[mi].mrr += mrr;
      s.trend[mi].subscribers += 1;
    });
    if (mrrOnDate(c, DEMO_END) > 0) {
      const k = key(c.plan, c.billing);
      const cm = (channelMaps[k] ??= new Map());
      cm.set(c.channel, (cm.get(c.channel) ?? 0) + 1);
    }
  }
  for (const [k, s] of Object.entries(stats)) {
    s.trend.forEach((p) => { p.mrr = Math.round(p.mrr * 100) / 100; });
    const last = s.trend[s.trend.length - 1];
    s.subscribers = last.subscribers;
    s.mrr = last.mrr;
    s.previousMrr = s.trend[s.trend.length - 2]?.mrr ?? 0;
    s.byChannel = [...(channelMaps[k]?.entries() ?? [])].map(([channel, customers]) => ({ channel, customers })).sort((a, b) => b.customers - a.customers);
  }
  const tierTrend = months.map((m, mi) => {
    const row: Record<string, number | string> = { month: format(parseISO(m), "MMM yy") };
    for (const t of PLAN_TIERS) row[t] = Math.round((stats[key(t, "monthly")].trend[mi].mrr + stats[key(t, "annual")].trend[mi].mrr) * 100) / 100;
    return row;
  });
  return { seedPlans: SEED_PLANS, stats, tierTrend };
}
