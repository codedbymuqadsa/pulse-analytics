import type { BillingInterval, PlanTier } from "./analytics";

export type PlanStatus = "active" | "draft" | "archived";

export interface ProductPlan {
  id: string;
  name: string;
  tier: PlanTier;
  interval: BillingInterval;
  /** Price charged per billing interval, USD. */
  price: number;
  status: PlanStatus;
  description: string;
  createdAt: string;
  changes: Array<{ date: string; note: string }>;
  /** True for plans created in the browser (no subscribers). */
  custom?: boolean;
}

export type WidgetId =
  | "revenueChart" | "breakdown" | "customerGrowth" | "transactions" | "topCustomers";

export interface DashboardPreferences {
  workspaceName: string;
  defaultRange: "7d" | "30d" | "90d" | "mtd" | "lm";
  defaultCompare: boolean;
  timeZone: string;
  locale: "en-US" | "en-GB" | "de-DE";
  compactNumbers: boolean;
  chartStyle: "area" | "line";
  sidebarCollapsed: boolean;
  widgets: Record<WidgetId, boolean>;
  profile: { displayName: string; email: string; role: string };
}
