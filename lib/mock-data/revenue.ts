import { DATA_DAYS, dateAtIndex, dayIndex } from "@/lib/date-range";
import { format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import type { Aggregation, DateRange, RevenueDataPoint } from "@/types/analytics";
import type { Customer } from "@/types/customer";
import { allCustomers } from "./customers";

/**
 * Event-sourced daily series.
 *
 * Definitions (see README "Metric assumptions"):
 *  - MRR[t]      = Σ MRR of paying customers on day t (trialing customers excluded)
 *  - Net MRR Δ   = New + Expansion − Contraction − Churned
 *  - Revenue[t]  = MRR[t] / 30   (recognised daily revenue)
 *  - New revenue = revenue attributable to MRR added in the trailing 30 days
 */
export function buildDaily(customers: Customer[]): RevenueDataPoint[] {
  const n = DATA_DAYS;
  const z = () => new Array<number>(n).fill(0);
  const newMrr = z(), exp = z(), con = z(), churn = z(), newC = z(), churnC = z(), subsD = z(), totalD = z();

  for (const c of customers) {
    const ci = dayIndex(c.createdAt);
    if (ci < 0 || ci >= n) continue;
    totalD[ci] += 1;
    newC[ci] += 1;
    if (c.status === "trialing") continue;
    newMrr[ci] += c.initialMrr;
    subsD[ci] += 1;
    let mrr = c.initialMrr;
    for (const ch of c.planChanges) {
      const i = dayIndex(ch.date);
      if (i < 0 || i >= n) continue;
      if (ch.deltaMrr >= 0) exp[i] += ch.deltaMrr; else con[i] += -ch.deltaMrr;
      mrr += ch.deltaMrr;
    }
    if (c.canceledAt) {
      const i = dayIndex(c.canceledAt);
      if (i >= 0 && i < n) {
        churn[i] += mrr;
        churnC[i] += 1;
        subsD[i] -= 1;
      }
    }
  }

  const rows: RevenueDataPoint[] = [];
  let mrr = 0, subs = 0, total = 0, trailingNew = 0;
  for (let i = 0; i < n; i++) {
    mrr += newMrr[i] + exp[i] - con[i] - churn[i];
    subs += subsD[i];
    total += totalD[i];
    trailingNew += newMrr[i] - (i >= 30 ? newMrr[i - 30] : 0);
    const revenue = mrr / 30;
    const newRevenue = Math.min(revenue, trailingNew / 30);
    rows.push({
      date: dateAtIndex(i),
      revenue: r2(revenue),
      newRevenue: r2(newRevenue),
      recurringRevenue: r2(revenue - newRevenue),
      mrr: r2(mrr),
      newMrr: r2(newMrr[i]),
      expansionMrr: r2(exp[i]),
      contractionMrr: r2(con[i]),
      churnedMrr: r2(churn[i]),
      newCustomers: newC[i],
      churnedCustomers: churnC[i],
      activeSubscriptions: subs,
      totalCustomers: total,
    });
  }
  return rows;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

let fullCache: RevenueDataPoint[] | null = null;
export function fullDaily(): RevenueDataPoint[] {
  return (fullCache ??= buildDaily(allCustomers()));
}

export function sliceDaily(daily: RevenueDataPoint[], range: DateRange): RevenueDataPoint[] {
  const a = Math.max(0, dayIndex(range.from));
  const b = Math.min(daily.length - 1, dayIndex(range.to));
  return a > b ? [] : daily.slice(a, b + 1);
}

const FLOWS = ["revenue", "newRevenue", "recurringRevenue", "newMrr", "expansionMrr", "contractionMrr", "churnedMrr", "newCustomers", "churnedCustomers"] as const;
const STOCKS = ["mrr", "activeSubscriptions", "totalCustomers"] as const;

function bucketKey(iso: string, agg: Aggregation): string {
  if (agg === "day") return iso;
  const d = parseISO(iso);
  return format(agg === "week" ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d), "yyyy-MM-dd");
}

/** Group daily rows into buckets. Flows are summed; stocks take the last value in the bucket. */
export function aggregateSeries(rows: RevenueDataPoint[], agg: Aggregation): RevenueDataPoint[] {
  if (agg === "day") return rows;
  const out: RevenueDataPoint[] = [];
  let current: RevenueDataPoint | null = null;
  let currentKey = "";
  for (const row of rows) {
    const key = bucketKey(row.date, agg);
    if (!current || key !== currentKey) {
      current = { ...row, date: key };
      currentKey = key;
      out.push(current);
      continue;
    }
    for (const f of FLOWS) current[f] = r2(current[f] + row[f]);
    for (const s of STOCKS) current[s] = row[s];
  }
  return out;
}

export function defaultAggregation(days: number): Aggregation {
  return days <= 45 ? "day" : days <= 200 ? "week" : "month";
}

export function sumFlows(rows: RevenueDataPoint[]) {
  const t = { revenue: 0, newRevenue: 0, recurringRevenue: 0, newMrr: 0, expansionMrr: 0, contractionMrr: 0, churnedMrr: 0, newCustomers: 0, churnedCustomers: 0 };
  for (const r of rows) for (const f of FLOWS) t[f] += r[f];
  for (const k of Object.keys(t) as Array<keyof typeof t>) t[k] = r2(t[k]);
  return t;
}

