import type { Aggregation } from "@/types/analytics";
import { defaultAggregation } from "@/lib/mock-data/revenue";
import type { PlanTier } from "@/types/analytics";
import type { Customer, CustomerStatus } from "@/types/customer";
import type { Transaction, TransactionStatus } from "@/types/transaction";
import { PLAN_TIERS } from "@/lib/mock-data/constants";
import type { SearchParamsLike } from "@/lib/date-range";

export type SortDir = "asc" | "desc";
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined =>
  allowed.includes(v as T) ? (v as T) : undefined;

export const CUSTOMER_STATUSES: CustomerStatus[] = ["active", "trialing", "past_due", "canceled"];
export const TRANSACTION_STATUSES: TransactionStatus[] = ["paid", "pending", "failed"];
export const SINCE_OPTIONS = ["30d", "90d", "365d"] as const;
export type Since = (typeof SINCE_OPTIONS)[number];

export const CUSTOMER_SORT_KEYS = ["name", "email", "company", "plan", "mrr", "createdAt", "lastActivityAt", "status"] as const;
export type CustomerSortKey = (typeof CUSTOMER_SORT_KEYS)[number];
export const TRANSACTION_SORT_KEYS = ["id", "customerName", "date", "plan", "amount", "status"] as const;
export type TransactionSortKey = (typeof TRANSACTION_SORT_KEYS)[number];

export interface CustomerQuery {
  q: string;
  plan?: PlanTier;
  status?: CustomerStatus;
  since?: Since;
  sort: CustomerSortKey;
  dir: SortDir;
  page: number;
  pageSize: number;
}

export interface TransactionQuery {
  q: string;
  status?: TransactionStatus;
  sort: TransactionSortKey;
  dir: SortDir;
  page: number;
  pageSize: number;
}

export const PAGE_SIZES = [10, 25, 50] as const;

function parsePage(params: SearchParamsLike, key: string): number {
  const n = Number.parseInt(first(params[key]) ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function parseSize(v: string | undefined, fallback: number): number {
  const n = Number.parseInt(v ?? "", 10);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : fallback;
}

export function parseCustomerQuery(params: SearchParamsLike): CustomerQuery {
  return {
    q: (first(params.q) ?? "").trim().slice(0, 100),
    plan: oneOf(first(params.plan), PLAN_TIERS),
    status: oneOf(first(params.status), CUSTOMER_STATUSES),
    since: oneOf(first(params.since), SINCE_OPTIONS),
    sort: oneOf(first(params.sort), CUSTOMER_SORT_KEYS) ?? "createdAt",
    dir: oneOf(first(params.dir), ["asc", "desc"] as const) ?? "desc",
    page: parsePage(params, "page"),
    pageSize: parseSize(first(params.size), 10),
  };
}

export function parseTransactionQuery(params: SearchParamsLike): TransactionQuery {
  return {
    q: (first(params.tq) ?? "").trim().slice(0, 100),
    status: oneOf(first(params.tstatus), TRANSACTION_STATUSES),
    sort: oneOf(first(params.tsort), TRANSACTION_SORT_KEYS) ?? "date",
    dir: oneOf(first(params.tdir), ["asc", "desc"] as const) ?? "desc",
    page: parsePage(params, "tpage"),
    pageSize: 10,
  };
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase();

export function sinceCutoff(since: Since, end: string): string {
  const days = since === "30d" ? 30 : since === "90d" ? 90 : 365;
  const d = new Date(end + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

export function filterCustomers(list: Customer[], q: Pick<CustomerQuery, "q" | "plan" | "status" | "since">, end: string): Customer[] {
  const needle = norm(q.q);
  const cutoff = q.since ? sinceCutoff(q.since, end) : null;
  return list.filter((c) => {
    if (q.plan && c.plan !== q.plan) return false;
    if (q.status && c.status !== q.status) return false;
    if (cutoff && c.createdAt < cutoff) return false;
    if (!needle) return true;
    return norm(c.name).includes(needle) || norm(c.email).includes(needle) || norm(c.company).includes(needle) || norm(c.id).includes(needle);
  });
}

function compare<T>(a: T, b: T): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""), "en", { sensitivity: "base" });
}

export function sortBy<T>(list: T[], value: (item: T) => string | number, dir: SortDir): T[] {
  const m = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => m * compare(value(a), value(b)));
}

export function sortCustomers(list: Customer[], key: CustomerSortKey, dir: SortDir): Customer[] {
  return sortBy(list, (c) => (key === "plan" ? PLAN_TIERS.indexOf(c.plan) : c[key]), dir);
}

export function filterTransactions(list: Transaction[], q: Pick<TransactionQuery, "q" | "status">, range?: { from: string; to: string }): Transaction[] {
  const needle = norm(q.q);
  return list.filter((t) => {
    if (range && (t.date < range.from || t.date > range.to)) return false;
    if (q.status && t.status !== q.status) return false;
    if (!needle) return true;
    return norm(t.id).includes(needle) || norm(t.customerName).includes(needle) || norm(t.customerEmail).includes(needle);
  });
}

export function sortTransactions(list: Transaction[], key: TransactionSortKey, dir: SortDir): Transaction[] {
  return sortBy(list, (t) => (key === "plan" ? PLAN_TIERS.indexOf(t.plan) : t[key]), dir);
}

export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export function paginate<T>(list: T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const p = Math.min(Math.max(1, page), pageCount);
  return { rows: list.slice((p - 1) * pageSize, p * pageSize), total: list.length, page: p, pageCount, pageSize };
}

export function parseAggregation(params: SearchParamsLike, days: number): Aggregation {
  const v = oneOf(first(params.agg), ["day", "week", "month"] as const);
  return v ?? defaultAggregation(days);
}
