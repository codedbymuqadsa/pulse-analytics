"use client";

import { z } from "zod";
import type { DashboardPreferences, ProductPlan, WidgetId } from "@/types/product";
import type { SavedReport } from "@/types/report";
import { SEED_REPORTS } from "@/lib/mock-data/reports";
import { createLocalStore, useLocalStore } from "@/lib/store";

export const WIDGETS: Array<{ id: WidgetId; label: string; description: string }> = [
  { id: "revenueChart", label: "Revenue performance", description: "Revenue over time with period comparison." },
  { id: "breakdown", label: "Revenue breakdown", description: "MRR distribution by plan." },
  { id: "customerGrowth", label: "Customer growth", description: "New vs churned customers and active subscriptions." },
  { id: "transactions", label: "Recent transactions", description: "Searchable invoice table." },
  { id: "topCustomers", label: "Top customers", description: "Highest paying customers in the period." },
];

export const DEFAULT_PREFERENCES: DashboardPreferences = {
  workspaceName: "My Workspace",
  defaultRange: "30d",
  defaultCompare: true,
  timeZone: "UTC",
  locale: "en-US",
  compactNumbers: false,
  chartStyle: "area",
  sidebarCollapsed: false,
  widgets: { revenueChart: true, breakdown: true, customerGrowth: true, transactions: true, topCustomers: true },
  profile: { displayName: "Account", email: "", role: "Owner" },
};

const prefsSchema = z.object({
  workspaceName: z.string().min(1).max(40),
  defaultRange: z.enum(["7d", "30d", "90d", "mtd", "lm"]),
  defaultCompare: z.boolean(),
  timeZone: z.string(),
  locale: z.enum(["en-US", "en-GB", "de-DE"]),
  compactNumbers: z.boolean(),
  chartStyle: z.enum(["area", "line"]),
  sidebarCollapsed: z.boolean(),
  widgets: z.object({ revenueChart: z.boolean(), breakdown: z.boolean(), customerGrowth: z.boolean(), transactions: z.boolean(), topCustomers: z.boolean() }),
  profile: z.object({ displayName: z.string().min(1), email: z.string(), role: z.string() }),
});

/** Merge a stored (possibly partial / malformed) value over the defaults. */
export function parsePreferences(raw: unknown): DashboardPreferences | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<DashboardPreferences>;
  const merged = {
    ...DEFAULT_PREFERENCES, ...r,
    widgets: { ...DEFAULT_PREFERENCES.widgets, ...(r.widgets ?? {}) },
    profile: { ...DEFAULT_PREFERENCES.profile, ...(r.profile ?? {}) },
  };
  const res = prefsSchema.safeParse(merged);
  return res.success ? (res.data as DashboardPreferences) : null;
}

export const preferencesStore = createLocalStore<DashboardPreferences>("pulse.preferences.v1", DEFAULT_PREFERENCES, parsePreferences);
export const usePreferences = () => useLocalStore(preferencesStore);

const reportSchemaStored = z.array(z.object({
  id: z.string(), name: z.string(), description: z.string(),
  category: z.enum(["Revenue", "Customers", "Acquisition", "Subscriptions"]), owner: z.string(), updatedAt: z.string(),
  config: z.object({
    metric: z.enum(["revenue", "mrr", "newMrr", "churnedMrr", "newCustomers", "activeSubscriptions"]),
    chartType: z.enum(["line", "area", "bar"]), range: z.enum(["30d", "90d", "180d", "365d"]), groupBy: z.enum(["none", "plan", "billing", "channel"]),
  }),
}));
export const reportsStore = createLocalStore<SavedReport[]>("pulse.reports.v1", SEED_REPORTS, (raw) => {
  const r = reportSchemaStored.safeParse(raw);
  return r.success ? (r.data as SavedReport[]) : null;
});
export const useReports = () => useLocalStore(reportsStore);

const planSchemaStored = z.array(z.object({
  id: z.string(), name: z.string(), tier: z.enum(["Starter", "Professional", "Business", "Enterprise"]), interval: z.enum(["monthly", "annual"]),
  price: z.number(), status: z.enum(["active", "draft", "archived"]), description: z.string(), createdAt: z.string(),
  changes: z.array(z.object({ date: z.string(), note: z.string() })), custom: z.boolean().optional(),
}));
/** Plans the user has added or edited in this browser, keyed by id (overrides seed plans). */
export const plansStore = createLocalStore<ProductPlan[]>("pulse.plans.v1", [], (raw) => {
  const r = planSchemaStored.safeParse(raw);
  return r.success ? (r.data as ProductPlan[]) : null;
});
export const usePlanOverrides = () => useLocalStore(plansStore);
/** Ids of seed plans the user deleted. */
export const deletedPlansStore = createLocalStore<string[]>("pulse.plans-deleted.v1", [], (raw) => (Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : null));
export const useDeletedPlans = () => useLocalStore(deletedPlansStore);

export type CustomerLabels = Record<string, string[]>;
export const labelsStore = createLocalStore<CustomerLabels>("pulse.customer-labels.v1", {}, (raw) => {
  const r = z.record(z.string(), z.array(z.string())).safeParse(raw);
  return r.success ? r.data : null;
});
export const useCustomerLabels = () => useLocalStore(labelsStore);

const notifSchema = z.array(z.string());
export const readNotificationsStore = createLocalStore<string[]>("pulse.notifications-read.v1", [], (raw) => {
  const r = notifSchema.safeParse(raw);
  return r.success ? r.data : null;
});
export const useReadNotifications = () => useLocalStore(readNotificationsStore);

