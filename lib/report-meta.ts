import type { ReportMetric, ReportRange } from "@/types/report";

export const REPORT_METRICS: Array<{ value: ReportMetric; label: string; currency: boolean }> = [
  { value: "revenue", label: "Recognised revenue", currency: true },
  { value: "mrr", label: "MRR", currency: true },
  { value: "newMrr", label: "New MRR", currency: true },
  { value: "churnedMrr", label: "Churned MRR", currency: true },
  { value: "newCustomers", label: "New customers", currency: false },
  { value: "activeSubscriptions", label: "Active subscriptions", currency: false },
];
export const REPORT_RANGES: Array<{ value: ReportRange; label: string; days: number }> = [
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "180d", label: "Last 180 days", days: 180 },
  { value: "365d", label: "Last 12 months", days: 365 },
];

export const metricMeta = (m: ReportMetric) => REPORT_METRICS.find((x) => x.value === m)!;
