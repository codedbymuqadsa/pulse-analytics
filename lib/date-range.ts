import {
  addDays, differenceInCalendarDays, endOfMonth, format, isValid, parseISO, startOfMonth, subMonths,
} from "date-fns";
import type { DateRange, RangePreset, ResolvedRange } from "@/types/analytics";

/** Last day covered by the deterministic dataset. */
export const DEMO_END = "2026-10-18";
export const DATA_DAYS = 760;
export const MAX_CUSTOM_DAYS = 366;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const toIso = (d: Date) => format(d, "yyyy-MM-dd");
export const addIsoDays = (iso: string, n: number) => toIso(addDays(parseISO(iso), n));
export const DATA_START = addIsoDays(DEMO_END, -(DATA_DAYS - 1));

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO.test(value) && isValid(parseISO(value));
}

export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
}

/** Index of an ISO date within the dataset (may be out of bounds). */
export function dayIndex(iso: string): number {
  return differenceInCalendarDays(parseISO(iso), parseISO(DATA_START));
}

export const dateAtIndex = (i: number) => addIsoDays(DATA_START, i);

export const RANGE_PRESETS: Array<{ value: Exclude<RangePreset, "custom">; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "mtd", label: "This month" },
  { value: "lm", label: "Last month" },
];

export type SearchParamsLike = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function withPrevious(from: string, to: string, preset: RangePreset, label: string): ResolvedRange {
  const days = daysBetween(from, to);
  const prevTo = addIsoDays(from, -1);
  return { from, to, preset, label, days, previous: { from: addIsoDays(prevTo, -(days - 1)), to: prevTo } };
}

export function validateCustomRange(from: string, to: string): string | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return "Enter valid start and end dates.";
  if (from > to) return "The start date must be on or before the end date.";
  if (from < DATA_START || to > DEMO_END) return `Data is available from ${DATA_START} to ${DEMO_END}.`;
  if (daysBetween(from, to) > MAX_CUSTOM_DAYS) return `Choose a range of ${MAX_CUSTOM_DAYS} days or fewer.`;
  return null;
}

export function resolvePreset(preset: Exclude<RangePreset, "custom">): ResolvedRange {
  const end = parseISO(DEMO_END);
  switch (preset) {
    case "7d": return withPrevious(addIsoDays(DEMO_END, -6), DEMO_END, "7d", "Last 7 days");
    case "90d": return withPrevious(addIsoDays(DEMO_END, -89), DEMO_END, "90d", "Last 90 days");
    case "mtd": return withPrevious(toIso(startOfMonth(end)), DEMO_END, "mtd", "This month");
    case "lm": {
      const lm = subMonths(end, 1);
      return withPrevious(toIso(startOfMonth(lm)), toIso(endOfMonth(lm)), "lm", "Last month");
    }
    default: return withPrevious(addIsoDays(DEMO_END, -29), DEMO_END, "30d", "Last 30 days");
  }
}

/** Resolve URL params into a range. Invalid values fall back to the last 30 days. */
export function resolveRange(params: SearchParamsLike): ResolvedRange & { error?: string } {
  const range = first(params.range);
  if (range === "custom") {
    const from = first(params.from) ?? "";
    const to = first(params.to) ?? "";
    const error = validateCustomRange(from, to);
    if (error) return { ...resolvePreset("30d"), error };
    return withPrevious(from, to, "custom", `${format(parseISO(from), "MMM d")} – ${format(parseISO(to), "MMM d, yyyy")}`);
  }
  const preset = RANGE_PRESETS.find((p) => p.value === range)?.value ?? "30d";
  return resolvePreset(preset);
}

export function parseCompare(params: SearchParamsLike, fallback = true): boolean {
  const v = first(params.compare);
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

export function rangeToSearch(range: ResolvedRange, compare: boolean): string {
  const p = new URLSearchParams();
  p.set("range", range.preset);
  if (range.preset === "custom") {
    p.set("from", range.from);
    p.set("to", range.to);
  }
  p.set("compare", String(compare));
  return p.toString();
}

export type { DateRange };
