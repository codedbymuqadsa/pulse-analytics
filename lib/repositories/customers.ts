import "server-only";
import { addDays, format, parseISO, subMonths } from "date-fns";
import type { Customer, CustomerActivity } from "@/types/customer";
import type { Transaction } from "@/types/transaction";
import { DEMO_END } from "@/lib/date-range";
import { filterCustomers, paginate, sortCustomers, type CustomerQuery } from "@/lib/filters";
import { allCustomers } from "@/lib/mock-data/customers";
import { allTransactions } from "@/lib/mock-data/transactions";
import { hashString } from "@/lib/mock-data/random";

export async function getCustomers(q: CustomerQuery) {
  return paginate(sortCustomers(filterCustomers(allCustomers(), q, DEMO_END), q.sort, q.dir), q.page, q.pageSize);
}

export async function getCustomersForExport(q: Pick<CustomerQuery, "q" | "plan" | "status" | "since" | "sort" | "dir">) {
  return sortCustomers(filterCustomers(allCustomers(), q, DEMO_END), q.sort, q.dir);
}

export interface CustomerDetail {
  customer: Customer;
  transactions: Transaction[];
  revenueHistory: Array<{ month: string; amount: number }>;
  activity: CustomerActivity[];
  lifetimeRevenue: number;
}

export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const customer = allCustomers().find((c) => c.id === id);
  if (!customer) return null;
  const txs = allTransactions().filter((t) => t.customerId === id);
  const paid = txs.filter((t) => t.status === "paid");
  const revenueHistory = Array.from({ length: 6 }, (_, k) => {
    const d = subMonths(parseISO(DEMO_END), 5 - k);
    const key = format(d, "yyyy-MM");
    return { month: format(d, "MMM yyyy"), amount: Math.round(paid.filter((t) => t.date.startsWith(key)).reduce((a, t) => a + t.amount, 0) * 100) / 100 };
  });

  const activity: CustomerActivity[] = [];
  const h = hashString(id);
  const last = parseISO(customer.lastActivityAt);
  const verbs: Array<[CustomerActivity["type"], string]> = [
    ["login", "Signed in to the workspace"], ["export", "Exported a dashboard report"], ["support", "Opened a support conversation"], ["login", "Invited a teammate"],
  ];
  for (let i = 0; i < 4; i++) {
    const [type, description] = verbs[(h + i) % verbs.length];
    activity.push({ id: `${id}-a${i}`, date: format(addDays(last, -i * (1 + ((h >> i) % 4))), "yyyy-MM-dd"), type, description });
  }
  for (const t of txs.slice(-2)) activity.push({ id: `${id}-${t.id}`, date: t.date, type: "invoice", description: `Invoice ${t.id} ${t.status}` });
  for (const ch of customer.planChanges) activity.push({ id: `${id}-pc-${ch.date}`, date: ch.date, type: "plan_change", description: `Plan changed from ${ch.from} to ${ch.to}` });
  activity.sort((a, b) => b.date.localeCompare(a.date));

  return {
    customer,
    transactions: txs.slice(-8).reverse(),
    revenueHistory,
    activity: activity.slice(0, 8),
    lifetimeRevenue: Math.round(paid.reduce((a, t) => a + t.amount, 0) * 100) / 100,
  };
}
