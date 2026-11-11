import type { TrendPolarity } from "@/types/analytics";

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Percentage change from `previous` to `current`; null when previous is 0/missing. */
export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || !Number.isFinite(previous) || previous === 0) return null;
  if (!Number.isFinite(current)) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Ratio expressed as a percentage (0 when the denominator is 0). */
export function ratioPercent(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

export type Trend = "positive" | "negative" | "neutral";

export function trendFor(change: number | null, polarity: TrendPolarity): Trend {
  if (change === null || Math.abs(change) < 0.05) return "neutral";
  const up = change > 0;
  return (polarity === "up-good" ? up : !up) ? "positive" : "negative";
}

export function safeDivide(a: number, b: number): number | null {
  return b === 0 ? null : a / b;
}

export function round(value: number, digits = 2): number {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}
