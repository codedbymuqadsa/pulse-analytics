import type { AcquisitionChannelName, BillingInterval, PlanTier } from "./analytics";

export type CustomerStatus = "active" | "trialing" | "past_due" | "canceled";

export interface PlanChange {
  date: string;
  from: PlanTier;
  to: PlanTier;
  /** Signed MRR delta in USD */
  deltaMrr: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  plan: PlanTier;
  billing: BillingInterval;
  /** Current MRR (0 for trialing / canceled). */
  mrr: number;
  createdAt: string;
  lastActivityAt: string;
  canceledAt: string | null;
  status: CustomerStatus;
  channel: AcquisitionChannelName;
  campaign: string;
  /** MRR contributed at signup, before any plan changes. */
  initialMrr: number;
  initialPlan: PlanTier;
  planChanges: PlanChange[];
}

export interface CustomerActivity {
  id: string;
  date: string;
  type: "login" | "invoice" | "plan_change" | "support" | "export";
  description: string;
}
