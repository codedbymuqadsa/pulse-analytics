import type { ProductPlan } from "@/types/product";
import { annualPrice, TIER_PRICE } from "./pricing";

const DESC = {
  Starter: "For individuals and small teams getting started with analytics.",
  Professional: "Advanced reporting and collaboration for growing product teams.",
  Business: "Governance, SSO and priority support for scaling companies.",
  Enterprise: "Custom limits, dedicated success manager and SLA-backed uptime.",
} as const;

export const SEED_PLANS: ProductPlan[] = (["Starter", "Professional", "Business", "Enterprise"] as const).flatMap((tier, i) =>
  (["monthly", "annual"] as const).map((interval, j): ProductPlan => ({
    id: `plan-${tier.toLowerCase()}-${interval}`,
    name: `${tier} ${interval === "monthly" ? "Monthly" : "Annual"}`,
    tier,
    interval,
    price: interval === "monthly" ? TIER_PRICE[tier] : annualPrice(tier),
    status: "active",
    description: DESC[tier],
    createdAt: `2024-0${1 + i}-1${j + 0}`,
    changes: [
      { date: "2025-07-01", note: interval === "annual" ? "Annual discount set to 20%." : "Price confirmed at launch list price." },
      { date: "2026-02-12", note: "Feature limits updated." },
    ],
  })),
);
