"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Activity, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Hint } from "@/components/ui/controls";
import { Avatar } from "@/components/shared/avatar";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/lib/nav";
import { preferencesStore, usePreferences } from "@/lib/stores";
import { cn } from "@/lib/utils";

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-md px-1 py-1" aria-label="Pulse Analytics home">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-fg"><Activity className="size-[18px]" strokeWidth={2.5} aria-hidden /></span>
      {!collapsed && <span className="text-[17px] font-semibold tracking-tight text-sidebar-fg">Pulse Analytics</span>}
    </Link>
  );
}

function NavLink({ item, collapsed, active, search, onNavigate }: { item: NavItem; collapsed: boolean; active: boolean; search: string; onNavigate?: () => void }) {
  const Icon = item.icon;
  const href = item.usesRange && search ? `${item.href}?${search}` : item.href;
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active ? "bg-primary/15 text-white" : "text-sidebar-muted hover:bg-sidebar-hover/[0.06] hover:text-sidebar-fg",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active ? "text-[#a5b4fc]" : "")} aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
  return collapsed ? <Hint content={item.label} side="right">{link}</Hint> : link;
}

export function SidebarContent({ collapsed = false, onNavigate, showCollapse }: { collapsed?: boolean; onNavigate?: () => void; showCollapse?: boolean }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const prefs = usePreferences();
  const carry = new URLSearchParams();
  for (const k of ["range", "from", "to", "compare"]) { const v = sp.get(k); if (v) carry.set(k, v); }
  const search = carry.toString();
  const view = sp.get("view");

  const activeFor = (item: NavItem) => {
    const path = item.href.split("?")[0];
    if (path === "/dashboard") return pathname === "/dashboard";
    const onPath = pathname === path || pathname.startsWith(path + "/");
    if (!onPath) return false;
    if (path === "/dashboard/reports") return item.href.includes("view=saved") ? view === "saved" && pathname === path : view !== "saved";
    return true;
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-fg">
      <div className={cn("flex h-16 shrink-0 items-center border-b border-white/[0.08] px-4", collapsed && "justify-center px-2")}><Logo collapsed={collapsed} /></div>
      <div className={cn("px-3 pt-4", collapsed && "px-2")}><WorkspaceSwitcher collapsed={collapsed} /></div>
      <nav aria-label="Primary" className={cn("mt-5 flex-1 space-y-1 overflow-y-auto px-3", collapsed && "px-2")}>
        {!collapsed && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">Analytics</p>}
        {PRIMARY_NAV.map((item) => <NavLink key={item.href} item={item} collapsed={collapsed} active={activeFor(item)} search={search} onNavigate={onNavigate} />)}
        <div className="my-4 border-t border-white/[0.08]" />
        {!collapsed && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">Workspace</p>}
        {SECONDARY_NAV.map((item) => <NavLink key={item.href} item={item} collapsed={collapsed} active={activeFor(item)} search="" onNavigate={onNavigate} />)}
      </nav>
      <div className={cn("space-y-2 border-t border-white/[0.08] p-3", collapsed && "px-2")}>
        {showCollapse && (
          <button
            type="button"
            onClick={() => preferencesStore.set((p) => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }))}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-muted hover:bg-sidebar-hover/[0.06] hover:text-sidebar-fg", collapsed && "justify-center px-0")}
          >
            {collapsed ? <ChevronsRight className="size-[18px]" /> : <><ChevronsLeft className="size-[18px]" /><span>Collapse</span></>}
          </button>
        )}
        <div className={cn("flex items-center gap-3 rounded-md px-2 py-1.5", collapsed && "justify-center px-0")}>
          <Avatar name={prefs.profile.displayName} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{prefs.profile.displayName}</p>
              <p className="truncate text-xs text-sidebar-muted">{prefs.profile.role}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
