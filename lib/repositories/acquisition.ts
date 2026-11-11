import "server-only";
import type { AcquisitionChannelName, Aggregation, ResolvedRange } from "@/types/analytics";
import { cacOf, conversionOf, filterAcquisition, groupByChannel, totalFunnel, type Funnel } from "@/lib/mock-data/acquisition";
import { CAMPAIGNS } from "@/lib/mock-data/constants";
import { percentChange } from "@/lib/calculations";
import { format, parseISO, startOfMonth, startOfWeek } from "date-fns";

export interface AcquisitionQuery {
  channel?: AcquisitionChannelName;
  campaign?: string;
}

export interface AcquisitionKpi {
  id: string;
  label: string;
  description: string;
  value: number;
  previous: number | null;
  change: number | null;
  format: "number" | "percent" | "currency-precise";
  polarity: "up-good" | "down-good";
}

export async function getAcquisitionData(range: ResolvedRange, q: AcquisitionQuery, compare: boolean, agg: Aggregation) {
  const rows = filterAcquisition({ range, ...q });
  const prevRows = compare ? filterAcquisition({ range: range.previous, ...q }) : [];
  const f = totalFunnel(rows);
  const p: Funnel | null = compare ? totalFunnel(prevRows) : null;

  const kpi = (id: string, label: string, description: string, value: number, previous: number | null, format: AcquisitionKpi["format"], polarity: AcquisitionKpi["polarity"] = "up-good"): AcquisitionKpi =>
    ({ id, label, description, value, previous, change: previous === null ? null : percentChange(value, previous), format, polarity });

  const cac = cacOf(f.spend, f.customers);
  const prevCac = p ? cacOf(p.spend, p.customers) : null;

  const buckets = new Map<string, { date: string; visitors: number; signups: number; customers: number }>();
  for (const r of rows) {
    const d = parseISO(r.date);
    const key = agg === "day" ? r.date : format(agg === "week" ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d), "yyyy-MM-dd");
    const b = buckets.get(key) ?? { date: key, visitors: 0, signups: 0, customers: 0 };
    b.visitors += r.visitors; b.signups += r.signups; b.customers += r.customers;
    buckets.set(key, b);
  }

  return {
    empty: rows.length === 0,
    funnel: f,
    kpis: [
      kpi("visitors", "Total visitors", "Unique visitors attributed to the selected channels and campaigns.", f.visitors, p?.visitors ?? null, "number"),
      kpi("signups", "Signups", "Visitors who created an account.", f.signups, p?.signups ?? null, "number"),
      kpi("conversion", "Conversion rate", "Signups ÷ visitors.", conversionOf(f), p ? conversionOf(p) : null, "percent"),
      kpi("cac", "CAC", "Customer acquisition cost = total spend ÷ paid customers acquired.", cac ?? 0, p ? prevCac : null, "currency-precise", "down-good"),
    ],
    channels: groupByChannel(rows),
    trend: [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export const campaignOptions = (channel?: AcquisitionChannelName) =>
  CAMPAIGNS.filter((c) => !channel || c.channel === channel).map((c) => c.name);
