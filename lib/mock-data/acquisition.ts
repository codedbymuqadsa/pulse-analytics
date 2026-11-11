import type { AcquisitionChannel, AcquisitionChannelName, DateRange } from "@/types/analytics";
import { DATA_DAYS, dateAtIndex, dayIndex } from "@/lib/date-range";
import { ratioPercent, safeDivide } from "@/lib/calculations";
import { CAMPAIGNS, FUNNEL_RATES } from "./constants";
import { allCustomers } from "./customers";
import { hashString, mulberry32 } from "./random";

/**
 * One row per (day, campaign).
 *  - `customers` are the real paid customers from the customer records.
 *  - Upstream funnel counts are derived from a trailing 7-day average of paid
 *    customers divided by the channel's funnel ratios, with small deterministic noise.
 *  - `spend` is the campaign's fixed daily budget.
 * Attribution is last-touch: each customer belongs to exactly one campaign.
 */
export interface AcquisitionRow {
  date: string;
  campaign: string;
  channel: AcquisitionChannelName;
  visitors: number;
  signups: number;
  activated: number;
  customers: number;
  spend: number;
}

let cache: AcquisitionRow[] | null = null;

function build(): AcquisitionRow[] {
  const paid = new Map<string, number[]>();
  for (const c of CAMPAIGNS) paid.set(c.name, new Array(DATA_DAYS).fill(0));
  for (const cu of allCustomers()) {
    const i = dayIndex(cu.createdAt);
    const arr = paid.get(cu.campaign);
    if (arr && i >= 0 && i < DATA_DAYS) arr[i] += 1;
  }
  const rows: AcquisitionRow[] = [];
  for (const camp of CAMPAIGNS) {
    const arr = paid.get(camp.name)!;
    const [sig, act, pay] = FUNNEL_RATES[camp.channel];
    const rng = mulberry32(hashString(camp.name));
    for (let i = 0; i < DATA_DAYS; i++) {
      let s = 0, n = 0;
      for (let k = Math.max(0, i - 6); k <= i; k++) { s += arr[k]; n++; }
      const avgPaid = Math.max(s / n, 0.05);
      const visitors = Math.round((avgPaid / (sig * act * pay)) * (0.85 + rng() * 0.3));
      const signups = Math.round(visitors * sig * (0.9 + rng() * 0.2));
      const activated = Math.min(signups, Math.round(signups * act * (0.9 + rng() * 0.2)));
      rows.push({
        date: dateAtIndex(i), campaign: camp.name, channel: camp.channel,
        visitors, signups, activated: Math.max(activated, arr[i]), customers: arr[i], spend: camp.dailyBudget,
      });
    }
  }
  return rows;
}

export function acquisitionRows(): AcquisitionRow[] {
  return (cache ??= build());
}

export interface AcquisitionFilters {
  range: DateRange;
  channel?: AcquisitionChannelName | null;
  campaign?: string | null;
}

export function filterAcquisition(f: AcquisitionFilters): AcquisitionRow[] {
  return acquisitionRows().filter(
    (r) => r.date >= f.range.from && r.date <= f.range.to
      && (!f.channel || r.channel === f.channel)
      && (!f.campaign || r.campaign === f.campaign),
  );
}

export interface Funnel { visitors: number; signups: number; activated: number; customers: number; spend: number }

export function totalFunnel(rows: AcquisitionRow[]): Funnel {
  const t: Funnel = { visitors: 0, signups: 0, activated: 0, customers: 0, spend: 0 };
  for (const r of rows) {
    t.visitors += r.visitors; t.signups += r.signups; t.activated += r.activated; t.customers += r.customers; t.spend += r.spend;
  }
  return t;
}

/** CAC = total spend ÷ paid customers acquired (null when none were acquired). */
export const cacOf = (spend: number, customers: number) => safeDivide(spend, customers);
export const conversionOf = (f: Pick<Funnel, "visitors" | "signups">) => ratioPercent(f.signups, f.visitors);

export function groupByChannel(rows: AcquisitionRow[]): AcquisitionChannel[] {
  const map = new Map<AcquisitionChannelName, Funnel>();
  for (const r of rows) {
    const t = map.get(r.channel) ?? { visitors: 0, signups: 0, activated: 0, customers: 0, spend: 0 };
    t.visitors += r.visitors; t.signups += r.signups; t.activated += r.activated; t.customers += r.customers; t.spend += r.spend;
    map.set(r.channel, t);
  }
  return [...map.entries()].map(([channel, t]) => ({
    channel, ...t, conversionRate: conversionOf(t), cac: cacOf(t.spend, t.customers),
  }));
}
