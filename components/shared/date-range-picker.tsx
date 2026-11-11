"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Popover_, PopoverContent, PopoverTrigger, Toggle } from "@/components/ui/controls";
import { useUrlState } from "@/hooks/use-url-state";
import { DATA_START, DEMO_END, parseCompare, RANGE_PRESETS, resolveRange, type SearchParamsLike } from "@/lib/date-range";
import { customRangeSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";

export function paramsToObject(params: URLSearchParams | { get(k: string): string | null }, keys: string[]): SearchParamsLike {
  const o: SearchParamsLike = {};
  for (const k of keys) {
    const v = params.get(k);
    if (v !== null) o[k] = v;
  }
  return o;
}

export function useRangeState() {
  const { params, update } = useUrlState();
  const obj = paramsToObject(params, ["range", "from", "to", "compare"]);
  const range = useMemo(() => resolveRange(obj), [obj.range, obj.from, obj.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const compare = parseCompare(obj, true);
  return { range, compare, update };
}

export function CompareToggle({ id = "compare-toggle" }: { id?: string }) {
  const { compare, update } = useRangeState();
  return (
    <div className="flex items-center gap-2">
      <Toggle id={id} checked={compare} onCheckedChange={(v) => update({ compare: String(v) }, { replace: true })} aria-label="Compare to previous period" />
      <Label htmlFor={id} className="cursor-pointer whitespace-nowrap">Compare to previous period</Label>
    </div>
  );
}

export function DateRangePicker({ className }: { className?: string }) {
  const { range, compare, update } = useRangeState();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});

  useEffect(() => { if (open) { setFrom(range.from); setTo(range.to); setErrors({}); } }, [open, range.from, range.to]);

  function choose(preset: string) {
    update({ range: preset, from: null, to: null }, {});
    setOpen(false);
  }

  function applyCustom() {
    const res = customRangeSchema.safeParse({ from, to });
    if (!res.success) {
      const e: { from?: string; to?: string } = {};
      for (const i of res.error.issues) e[i.path[0] as "from" | "to"] ??= i.message;
      setErrors(e);
      return;
    }
    update({ range: "custom", from, to });
    setOpen(false);
  }

  return (
    <Popover_ open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" className={cn("min-w-0 justify-between gap-2", className)} aria-label={`Date range: ${range.label}`}>
          <CalendarDays className="text-muted" />
          <span className="truncate">{range.label}</span>
          <ChevronDown className="text-muted" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[19rem]">
        <ul className="-mx-2 -mt-2 mb-3 space-y-0.5" aria-label="Preset ranges">
          {RANGE_PRESETS.map((p) => (
            <li key={p.value}>
              <button type="button" onClick={() => choose(p.value)} className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-surface-muted">
                {p.label}
                {range.preset === p.value && <Check className="size-4 text-primary" aria-label="Selected" />}
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); applyCustom(); }} className="space-y-3 border-t pt-3" noValidate>
          <p className="text-xs font-semibold text-muted">Custom range</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="range-from">From</Label>
              <Input id="range-from" type="date" min={DATA_START} max={DEMO_END} value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={Boolean(errors.from)} aria-describedby={errors.from ? "range-from-err" : undefined} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="range-to">To</Label>
              <Input id="range-to" type="date" min={DATA_START} max={DEMO_END} value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={Boolean(errors.to)} aria-describedby={errors.to ? "range-to-err" : undefined} />
            </div>
          </div>
          {errors.from && <p id="range-from-err" role="alert" className="text-xs font-medium text-danger">{errors.from}</p>}
          {errors.to && <p id="range-to-err" role="alert" className="text-xs font-medium text-danger">{errors.to}</p>}
          <Button type="submit" variant="primary" className="w-full">Apply custom range</Button>
        </form>
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <Label htmlFor="popover-compare" className="cursor-pointer">Compare to previous period</Label>
          <Toggle id="popover-compare" checked={compare} onCheckedChange={(v) => update({ compare: String(v) }, { replace: true })} />
        </div>
      </PopoverContent>
    </Popover_>
  );
}
