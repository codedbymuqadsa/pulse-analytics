import { format, parseISO } from "date-fns";

export interface FormatOptions {
  locale?: string;
  compact?: boolean;
}

const cache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, opts: Intl.NumberFormatOptions) {
  const key = locale + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, opts);
    cache.set(key, f);
  }
  return f;
}

export function formatCurrency(value: number, { locale = "en-US", compact = false }: FormatOptions = {}, precise = false): string {
  if (!Number.isFinite(value)) return "—";
  if (compact && Math.abs(value) >= 10_000) {
    return nf(locale, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  return nf(locale, {
    style: "currency", currency: "USD",
    minimumFractionDigits: precise ? 2 : 0, maximumFractionDigits: precise ? 2 : 0,
  }).format(value);
}

export function formatNumber(value: number, { locale = "en-US", compact = false }: FormatOptions = {}): string {
  if (!Number.isFinite(value)) return "—";
  if (compact && Math.abs(value) >= 10_000) {
    return nf(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  return nf(locale, { maximumFractionDigits: 0 }).format(value);
}

/** `value` is already a percentage (2.4 → "2.4%"). */
export function formatPercent(value: number | null | undefined, { locale = "en-US" }: FormatOptions = {}, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return nf(locale, { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value / 100);
}

export function formatSignedPercent(value: number | null, opts: FormatOptions = {}): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const s = formatPercent(Math.abs(value), opts);
  return value > 0 ? `+${s}` : value < 0 ? `−${s}` : s;
}

export function formatDate(iso: string | null | undefined, pattern = "MMM d, yyyy"): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return "—";
  }
}
