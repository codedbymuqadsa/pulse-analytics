"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Read and update URL query parameters. Updates push history entries so the
 * back / forward buttons restore the previous filter state.
 * A value of `null`, `undefined` or `""` removes the parameter.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (changes: Record<string, string | null | undefined>, opts: { replace?: boolean; resetPage?: string[] } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      for (const k of opts.resetPage ?? []) next.delete(k);
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        if (opts.replace) router.replace(url, { scroll: false });
        else router.push(url, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  return { params, pathname, update, pending };
}
