"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Search box with debounced `onSearch`, a clear button, and sync from the external `value` (URL state). */
export function SearchInput({ value, onSearch, placeholder = "Search…", label, className, debounce = 300 }: {
  value: string; onSearch: (v: string) => void; placeholder?: string; label: string; className?: string; debounce?: number;
}) {
  const [text, setText] = useState(value);
  const last = useRef(value);
  const onSearchRef = useRef(onSearch);
  useEffect(() => { onSearchRef.current = onSearch; });

  useEffect(() => {
    if (value !== last.current) { setText(value); last.current = value; }
  }, [value]);

  useEffect(() => {
    if (text === last.current) return;
    const t = setTimeout(() => { last.current = text; onSearchRef.current(text); }, debounce);
    return () => clearTimeout(t);
  }, [text, debounce]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        aria-label={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border bg-surface pl-9 pr-8 text-sm placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button type="button" aria-label="Clear search" onClick={() => { setText(""); last.current = ""; onSearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
