import { addMonths, addYears, format, parseISO } from "date-fns";
import type { Transaction, TransactionStatus } from "@/types/transaction";
import { DEMO_END } from "@/lib/date-range";
import { allCustomers, mrrOnDate, planOnDate } from "./customers";
import { hashString } from "./random";

let cache: Transaction[] | null = null;

/**
 * Invoices are generated from customer billing cycles:
 *  - monthly customers are billed every month on their signup day
 *  - annual customers are billed 12 × MRR on each anniversary
 * Billing amounts are cash invoiced, which differs from recognised revenue.
 */
function build(): Transaction[] {
  const list: Omit<Transaction, "id">[] = [];
  for (const c of allCustomers()) {
    if (c.status === "trialing") continue;
    const end = c.canceledAt && c.canceledAt < DEMO_END ? c.canceledAt : DEMO_END;
    const start = parseISO(c.createdAt);
    for (let k = 0; ; k++) {
      const d = c.billing === "annual" ? addYears(start, k) : addMonths(start, k);
      const iso = format(d, "yyyy-MM-dd");
      if (iso > end || (c.canceledAt && iso >= c.canceledAt)) break;
      const mrr = mrrOnDate(c, iso);
      if (mrr <= 0) continue;
      const amount = Math.round(mrr * (c.billing === "annual" ? 12 : 1) * 100) / 100;
      const h = hashString(c.id + iso) % 100;
      let status: TransactionStatus = h < 3 ? "failed" : "paid";
      if (iso >= "2026-10-17" && h >= 3) status = h < 60 ? "pending" : "paid";
      if (c.status === "past_due" && iso > format(addMonths(parseISO(DEMO_END), -2), "yyyy-MM-dd")) status = "failed";
      list.push({
        customerId: c.id, customerName: c.name, customerEmail: c.email,
        date: iso, plan: planOnDate(c, iso), amount, status,
      });
    }
  }
  list.sort((a, b) => a.date.localeCompare(b.date) || a.customerId.localeCompare(b.customerId));
  return list.map((t, i) => ({ ...t, id: `TX-${String(100001 + i)}` }));
}

export function allTransactions(): Transaction[] {
  return (cache ??= build());
}
