import type { AcquisitionChannelName, BillingInterval, PlanTier } from "@/types/analytics";

export const PLAN_TIERS: PlanTier[] = ["Starter", "Professional", "Business", "Enterprise"];
export const BILLING_INTERVALS: BillingInterval[] = ["monthly", "annual"];

/** Monthly list price (USD) per tier. */
export const TIER_PRICE: Record<PlanTier, number> = {
  Starter: 29, Professional: 79, Business: 199, Enterprise: 499,
};
/** Annual billing is priced at 12 months with a 20% discount. */
export const ANNUAL_DISCOUNT = 0.2;

export function mrrFor(tier: PlanTier, interval: BillingInterval): number {
  const m = TIER_PRICE[tier];
  return interval === "annual" ? Math.round(m * (1 - ANNUAL_DISCOUNT) * 100) / 100 : m;
}

export const CHANNELS: AcquisitionChannelName[] = [
  "Organic Search", "Paid Search", "Social", "Referral", "Direct", "Email",
];

export interface CampaignDef {
  name: string;
  channel: AcquisitionChannelName;
  /** Assignment weight within its channel */
  weight: number;
  /** Fixed daily budget in USD. Spend = budget × days. */
  dailyBudget: number;
}

export const CAMPAIGNS: CampaignDef[] = [
  { name: "Blog & SEO", channel: "Organic Search", weight: 1, dailyBudget: 25 },
  { name: "Brand Search", channel: "Paid Search", weight: 4, dailyBudget: 60 },
  { name: "Competitor Keywords", channel: "Paid Search", weight: 3, dailyBudget: 85 },
  { name: "Autumn Launch", channel: "Paid Search", weight: 2, dailyBudget: 45 },
  { name: "LinkedIn Ads", channel: "Social", weight: 3, dailyBudget: 70 },
  { name: "Community Posts", channel: "Social", weight: 2, dailyBudget: 10 },
  { name: "Partner Program", channel: "Referral", weight: 2, dailyBudget: 30 },
  { name: "Customer Referrals", channel: "Referral", weight: 3, dailyBudget: 15 },
  { name: "Direct / Untracked", channel: "Direct", weight: 1, dailyBudget: 0 },
  { name: "Onboarding Drip", channel: "Email", weight: 3, dailyBudget: 8 },
  { name: "Product Newsletter", channel: "Email", weight: 2, dailyBudget: 12 },
];

/** Funnel ratios per channel (signup / visitor, activated / signup, paid / activated). */
export const FUNNEL_RATES: Record<AcquisitionChannelName, [number, number, number]> = {
  "Organic Search": [0.032, 0.46, 0.34],
  "Paid Search": [0.041, 0.42, 0.31],
  Social: [0.018, 0.38, 0.27],
  Referral: [0.075, 0.55, 0.42],
  Direct: [0.052, 0.58, 0.45],
  Email: [0.064, 0.5, 0.38],
};
