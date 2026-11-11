"use client";

import * as React from "react";
import * as S from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption { value: string; label: string }

interface SelectProps {
  value: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  className?: string;
  disabled?: boolean;
}

/** Single-select built on Radix Select. Radix forbids empty-string item values, so use a sentinel such as "all". */
export function Select({ value, onValueChange, options, placeholder, className, id, disabled, ...aria }: SelectProps) {
  return (
    <S.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <S.Trigger
        id={id}
        {...aria}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 text-sm transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted aria-[invalid=true]:border-danger",
          className,
        )}
      >
        <span className="truncate"><S.Value placeholder={placeholder} /></span>
        <S.Icon><ChevronDown className="size-4 text-muted" /></S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={4} className="z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border bg-surface shadow-lg animate-fade-in">
          <S.Viewport className="p-1">
            {options.map((o) => (
              <S.Item key={o.value} value={o.value} className="relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none data-[highlighted]:bg-surface-muted">
                <span className="absolute left-2 flex size-4 items-center justify-center"><S.ItemIndicator><Check className="size-4 text-primary" /></S.ItemIndicator></span>
                <S.ItemText>{o.label}</S.ItemText>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
