import type { PlanTier } from "./analytics";

export type TransactionStatus = "paid" | "pending" | "failed";

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  date: string;
  plan: PlanTier;
  amount: number;
  status: TransactionStatus;
}
