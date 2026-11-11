"use client";

import { Select, type SelectOption } from "@/components/ui/select";
import { ActiveFilters } from "@/components/shared/active-filters";
import { useUrlState } from "@/hooks/use-url-state";

export interface UrlFilterDef {
  param: string;
  label: string;
  value: string | undefined;
  options: SelectOption[];
  /** Label for the "no filter" option */
  allLabel: string;
}

/** Row of select filters bound to URL params, with removable chips and a Clear filters action. */
export function UrlFilters({ filters, resetParams = [], extraChips = [], trailing }: {
  filters: UrlFilterDef[];
  /** Params removed alongside filters when paging should restart */
  resetParams?: string[];
  extraChips?: Array<{ key: string; label: string; clear: string[] }>;
  trailing?: React.ReactNode;
}) {
  const { update } = useUrlState();
  const clearAll = Object.fromEntries([...filters.map((f) => f.param), ...extraChips.flatMap((c) => c.clear), ...resetParams].map((p) => [p, null]));
  const reset = Object.fromEntries(resetParams.map((p) => [p, null]));
  const chips = [
    ...filters.filter((f) => f.value).map((f) => ({
      key: f.param,
      label: `${f.label}: ${f.options.find((o) => o.value === f.value)?.label ?? f.value}`,
      onRemove: () => update({ [f.param]: null, ...reset }),
    })),
    ...extraChips.map((c) => ({ key: c.key, label: c.label, onRemove: () => update(Object.fromEntries([...c.clear, ...resetParams].map((p) => [p, null]))) })),
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Select
            key={f.param}
            aria-label={`Filter by ${f.label.toLowerCase()}`}
            className="w-full min-[480px]:w-44"
            value={f.value ?? "all"}
            onValueChange={(v) => update({ [f.param]: v === "all" ? null : v, ...reset })}
            options={[{ value: "all", label: f.allLabel }, ...f.options]}
          />
        ))}
        {trailing}
      </div>
      <ActiveFilters chips={chips} onClear={() => update(clearAll)} />
    </div>
  );
}
