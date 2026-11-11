"use client";

import { useMemo } from "react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import { usePreferences } from "@/lib/stores";

/** Formatters bound to the user's locale / compact-number preferences. */
export function useFormatters() {
  const { locale, compactNumbers } = usePreferences();
  return useMemo(() => {
    const o = { locale, compact: compactNumbers };
    return {
      locale,
      currency: (v: number, precise = false) => formatCurrency(v, o, precise),
      /** Always-compact currency for chart axes */
      axisCurrency: (v: number) => formatCurrency(v, { locale, compact: true }),
      number: (v: number) => formatNumber(v, o),
      percent: (v: number | null | undefined, digits = 1) => formatPercent(v, o, digits),
    };
  }, [locale, compactNumbers]);
}
