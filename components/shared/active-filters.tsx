"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FilterChip { key: string; label: string; onRemove: () => void }

/** Removable chips for each active filter plus a "Clear filters" action. */
export function ActiveFilters({ chips, onClear }: { chips: FilterChip[]; onClear: () => void }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters" role="group">
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-2.5 pr-1 text-xs font-medium text-primary">
          {c.label}
          <button type="button" onClick={c.onRemove} aria-label={`Remove filter ${c.label}`} className="rounded-full p-0.5 hover:bg-primary/15"><X className="size-3" /></button>
        </span>
      ))}
      <Button size="sm" variant="ghost" onClick={onClear}>Clear filters</Button>
    </div>
  );
}
