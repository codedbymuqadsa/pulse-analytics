import type { PlanTier } from "@/types/analytics";
import { ANNUAL_DISCOUNT, TIER_PRICE } from "./constants";

/** Price charged once per year for an annual plan (12 months, discounted). */
export function annualPrice(tier: PlanTier): number {
  return Math.round(TIER_PRICE[tier] * 12 * (1 - ANNUAL_DISCOUNT));
}

export { TIER_PRICE };
