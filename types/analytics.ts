export type RangePreset = "7d" | "30d" | "90d" | "mtd" | "lm" | "custom";
export type Aggregation = "day" | "week" | "month";

/** Inclusive range of ISO dates (yyyy-MM-dd). */
export interface DateRange {
  from: string;
  to: string;
}

export interface ResolvedRange extends DateRange {
  preset: RangePreset;
  label: string;
  days: number;
  /** Equal-length period immediately before `from`. */
  previous: DateRange;
}

export type PlanTier = "Starter" | "Professional" | "Business" | "Enterprise";
export type BillingInterval = "monthly" | "annual";
export type AcquisitionChannelName =
  | "Organic Search" | "Paid Search" | "Social" | "Referral" | "Direct" | "Email";

export interface RevenueDataPoint {
  /** ISO date of the bucket start */
  date: string;
  revenue: number;
  newRevenue: number;
  recurringRevenue: number;
  mrr: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  newCustomers: number;
  churnedCustomers: number;
  activeSubscriptions: number;
  totalCustomers: number;
}

export type MetricId = "mrr" | "arr" | "customers" | "subscriptions" | "arpa" | "churn";
export type TrendPolarity = "up-good" | "down-good";
export type MetricFormat = "currency" | "currency-precise" | "number" | "percent";

export interface DashboardMetric {
  id: MetricId;
  label: string;
  description: string;
  value: number;
  previousValue: number | null;
  /** Percentage change vs the comparison period; null when it cannot be computed. */
  change: number | null;
  polarity: TrendPolarity;
  format: MetricFormat;
  spark: number[];
}

export interface AcquisitionChannel {
  channel: AcquisitionChannelName;
  visitors: number;
  signups: number;
  activated: number;
  customers: number;
  spend: number;
  conversionRate: number;
  cac: number | null;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ComparisonPoint {
  date: string;
  value: number;
  /** Same-position bucket in the previous period */
  previous: number | null;
  previousDate: string | null;
}
