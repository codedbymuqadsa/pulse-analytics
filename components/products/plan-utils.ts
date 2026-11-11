/** Effective monthly price of an annual plan, formatted. */
export function annualPriceLabel(yearlyPrice: number, currency: (v: number, precise?: boolean) => string): string {
  return `${currency(yearlyPrice / 12, true)} / mo`;
}
