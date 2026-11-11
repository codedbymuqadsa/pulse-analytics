"use client";

import type { Aggregation } from "@/types/analytics";
import { Segmented } from "@/components/ui/controls";
import { useUrlState } from "@/hooks/use-url-state";

const OPTIONS: Array<{ value: Aggregation; label: string }> = [
  { value: "day", label: "Daily" }, { value: "week", label: "Weekly" }, { value: "month", label: "Monthly" },
];

/** Chart aggregation switcher; writes `agg` to the URL. */
export function AggControl({ value }: { value: Aggregation }) {
  const { update } = useUrlState();
  return <Segmented label="Aggregation" value={value} options={OPTIONS} onChange={(v) => update({ agg: v })} />;
}
