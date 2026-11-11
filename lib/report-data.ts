import type { RevenueDataPoint } from "@/types/analytics";
import type { Customer } from "@/types/customer";
import type { ReportConfig, ReportSeries } from "@/types/report";
import { REPORT_RANGES } from "@/lib/report-meta";
import { addIsoDays, DEMO_END } from "@/lib/date-range";
import { allCustomers } from "@/lib/mock-data/customers";
import { aggregateSeries, buildDaily, defaultAggregation, fullDaily, sliceDaily } from "@/lib/mock-data/revenue";


function groupKey(c: Customer, by: ReportConfig["groupBy"]): string {
  if (by === "plan") return c.plan;
  if (by === "billing") return c.billing === "annual" ? "Annual" : "Monthly";
  return c.channel;
}

export function computeReportSeries(config: ReportConfig): ReportSeries {
  const days = REPORT_RANGES.find((r) => r.value === config.range)?.days ?? 90;
  const range = { from: addIsoDays(DEMO_END, -(days - 1)), to: DEMO_END };
  const agg = defaultAggregation(days);
  const pick = (rows: RevenueDataPoint[]) => aggregateSeries(sliceDaily(rows, range), agg);

  if (config.groupBy === "none") {
    return { keys: ["Total"], rows: pick(fullDaily()).map((r) => ({ date: r.date, Total: r[config.metric] })) };
  }
  const groups = new Map<string, Customer[]>();
  for (const c of allCustomers()) {
    const k = groupKey(c, config.groupBy);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(c);
  }
  const keys = [...groups.keys()].sort();
  const series = keys.map((k) => pick(buildDaily(groups.get(k)!)));
  const dates = series[0]?.map((r) => r.date) ?? [];
  return {
    keys,
    rows: dates.map((date, i) => {
      const row: Record<string, number | string> = { date };
      keys.forEach((k, ki) => { row[k] = series[ki][i][config.metric]; });
      return row;
    }),
  };
}

