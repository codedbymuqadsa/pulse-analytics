export type ReportCategory = "Revenue" | "Customers" | "Acquisition" | "Subscriptions";
export type ReportMetric =
  | "revenue" | "mrr" | "newMrr" | "churnedMrr" | "newCustomers" | "activeSubscriptions";
export type ReportChartType = "line" | "area" | "bar";
export type ReportGroupBy = "none" | "plan" | "billing" | "channel";
export type ReportRange = "30d" | "90d" | "180d" | "365d";

export interface ReportConfig {
  metric: ReportMetric;
  chartType: ReportChartType;
  range: ReportRange;
  groupBy: ReportGroupBy;
}

export interface SavedReport {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  owner: string;
  updatedAt: string;
  config: ReportConfig;
}

export interface ReportSeries {
  keys: string[];
  rows: Array<Record<string, number | string>>;
}
