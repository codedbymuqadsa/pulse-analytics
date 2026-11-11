import type { SavedReport } from "@/types/report";

export const SEED_REPORTS: SavedReport[] = [
  {
    id: "revenue-performance",
    name: "Revenue Performance",
    description: "Recognised daily revenue across the last 90 days, split by plan.",
    category: "Revenue",
    owner: "Maya Collins",
    updatedAt: "2026-10-16",
    config: { metric: "revenue", chartType: "area", range: "90d", groupBy: "plan" },
  },
  {
    id: "customer-growth",
    name: "Customer Growth",
    description: "New customers per day over the last 90 days.",
    category: "Customers",
    owner: "Jordan Reyes",
    updatedAt: "2026-10-14",
    config: { metric: "newCustomers", chartType: "bar", range: "90d", groupBy: "none" },
  },
  {
    id: "acquisition-overview",
    name: "Acquisition Overview",
    description: "New customers over six months, grouped by acquisition channel.",
    category: "Acquisition",
    owner: "Priya Nair",
    updatedAt: "2026-10-12",
    config: { metric: "newCustomers", chartType: "line", range: "180d", groupBy: "channel" },
  },
  {
    id: "subscription-health",
    name: "Subscription Health",
    description: "Active subscriptions by billing interval over the last year.",
    category: "Subscriptions",
    owner: "Maya Collins",
    updatedAt: "2026-10-09",
    config: { metric: "activeSubscriptions", chartType: "line", range: "365d", groupBy: "billing" },
  },
];
