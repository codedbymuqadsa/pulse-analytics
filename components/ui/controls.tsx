"use client";

import * as React from "react";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Switch from "@radix-ui/react-switch";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Tabs from "@radix-ui/react-tabs";
import * as Popover from "@radix-ui/react-popover";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkmark = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Checkbox.Root>>(
  ({ className, checked, ...props }, ref) => (
    <Checkbox.Root
      ref={ref}
      checked={checked}
      className={cn("flex size-[18px] shrink-0 items-center justify-center rounded border bg-surface data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary", className)}
      {...props}
    >
      <Checkbox.Indicator className="text-primary-fg">
        {checked === "indeterminate" ? <Minus className="size-3.5" strokeWidth={3} /> : <Check className="size-3.5" strokeWidth={3} />}
      </Checkbox.Indicator>
    </Checkbox.Root>
  ),
);
Checkmark.displayName = "Checkmark";

export const Toggle = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Switch.Root>>(
  ({ className, ...props }, ref) => (
    <Switch.Root
      ref={ref}
      className={cn("inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-border p-0.5 transition-colors data-[state=checked]:bg-primary", className)}
      {...props}
    >
      <Switch.Thumb className="size-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4" />
    </Switch.Root>
  ),
);
Toggle.displayName = "Toggle";

export const TooltipProvider = Tooltip.Provider;

export function Hint({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip.Root delayDuration={150}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} sideOffset={6} className="z-[70] max-w-64 rounded-md bg-foreground px-2.5 py-1.5 text-xs leading-snug text-background shadow-lg animate-fade-in">
          {content}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export const Tabs_ = Tabs.Root;
export const TabsList = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Tabs.List>>(({ className, ...p }, ref) => (
  <Tabs.List ref={ref} className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-md bg-surface-muted p-1", className)} {...p} />
));
TabsList.displayName = "TabsList";
export const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Tabs.Trigger>>(({ className, ...p }, ref) => (
  <Tabs.Trigger ref={ref} className={cn("whitespace-nowrap rounded-sm px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)} {...p} />
));
TabsTrigger.displayName = "TabsTrigger";
export const TabsContent = Tabs.Content;

export const Popover_ = Popover.Root;
export const PopoverTrigger = Popover.Trigger;
export const PopoverContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Popover.Content>>(({ className, align = "end", sideOffset = 6, ...p }, ref) => (
  <Popover.Portal>
    <Popover.Content ref={ref} align={align} sideOffset={sideOffset} collisionPadding={8} className={cn("z-50 w-80 max-w-[calc(100vw-1rem)] rounded-md border bg-surface p-4 shadow-lg animate-fade-in", className)} {...p} />
  </Popover.Portal>
));
PopoverContent.displayName = "PopoverContent";

/** Segmented, radio-style toggle group (e.g. Daily / Weekly / Monthly). */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md bg-surface-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded-sm px-2.5 py-1 text-xs font-medium transition-colors", value === o.value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
