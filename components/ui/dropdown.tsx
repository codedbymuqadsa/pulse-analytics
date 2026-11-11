"use client";

import * as React from "react";
import * as M from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuSeparator = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof M.Separator>) => (
  <M.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...p} />
);
export const DropdownMenuLabel = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof M.Label>) => (
  <M.Label className={cn("px-2 py-1.5 text-xs font-semibold text-muted", className)} {...p} />
);

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof M.Content>>(
  ({ className, sideOffset = 6, align = "end", ...props }, ref) => (
    <M.Portal>
      <M.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align}
        className={cn("z-50 min-w-48 max-w-[calc(100vw-1rem)] rounded-md border bg-surface p-1 text-foreground shadow-lg animate-fade-in", className)}
        {...props}
      />
    </M.Portal>
  ),
);
DropdownMenuContent.displayName = "DropdownMenuContent";

const itemClass = "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-muted [&_svg]:size-4 [&_svg]:text-muted";

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof M.Item> & { destructive?: boolean }>(
  ({ className, destructive, ...props }, ref) => (
    <M.Item ref={ref} className={cn(itemClass, destructive && "text-danger [&_svg]:text-danger", className)} {...props} />
  ),
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuRadioGroup = M.RadioGroup;
export const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof M.RadioItem>>(
  ({ className, children, ...props }, ref) => (
    <M.RadioItem ref={ref} className={cn(itemClass, "pl-8", className)} {...props}>
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <M.ItemIndicator><Check className="!text-primary" /></M.ItemIndicator>
      </span>
      {children}
    </M.RadioItem>
  ),
);
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";
