"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { CornerDownLeft, Moon, Search, Sun, UserSearch } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ALL_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface Command { id: string; label: string; hint: string; icon: React.ComponentType<{ className?: string }>; run: () => void }

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { if (open) { setQuery(""); setActive(0); } }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => { onOpenChange(false); router.push(href); };
    const list: Command[] = ALL_NAV.map((n) => ({ id: n.href, label: `Go to ${n.label}`, hint: "Page", icon: n.icon, run: go(n.href) }));
    list.push({
      id: "theme", label: resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme", hint: "Action",
      icon: resolvedTheme === "dark" ? Sun : Moon, run: () => { setTheme(resolvedTheme === "dark" ? "light" : "dark"); onOpenChange(false); },
    });
    const q = query.trim();
    const filtered = q ? list.filter((c) => c.label.toLowerCase().includes(q.toLowerCase())) : list;
    if (q) filtered.unshift({ id: "search-customers", label: `Search customers for "${q}"`, hint: "Customers", icon: UserSearch, run: go(`/dashboard/customers?q=${encodeURIComponent(q)}`) });
    return filtered;
  }, [query, resolvedTheme, router, setTheme, onOpenChange]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { listRef.current?.children[active]?.scrollIntoView({ block: "nearest" }); }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(commands.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); commands[active]?.run(); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="top-[20%] max-w-xl translate-y-0 overflow-hidden" aria-describedby="palette-desc">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription id="palette-desc" className="sr-only">Search pages and actions. Use arrow keys to move and Enter to run.</DialogDescription>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 text-muted" aria-hidden />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={commands[active] ? `cmd-${commands[active].id}` : undefined}
            aria-label="Search pages, actions and customers"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, actions, customers…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
        <ul id="palette-list" role="listbox" ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {commands.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted">No results</li>}
          {commands.map((c, i) => {
            const Icon = c.icon;
            return (
              <li key={c.id} id={`cmd-${c.id}`} role="option" aria-selected={i === active}>
                <Button
                  variant="ghost"
                  tabIndex={-1}
                  onMouseMove={() => setActive(i)}
                  onClick={c.run}
                  className={cn("h-10 w-full justify-start gap-3 px-3 font-medium", i === active && "bg-surface-muted")}
                >
                  <Icon className="size-4 text-muted" />
                  <span className="flex-1 truncate text-left">{c.label}</span>
                  <span className="text-xs font-normal text-muted">{c.hint}</span>
                  {i === active && <CornerDownLeft className="size-3.5 text-muted" />}
                </Button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
