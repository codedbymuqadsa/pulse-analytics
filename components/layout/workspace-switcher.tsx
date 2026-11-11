"use client";

import Link from "next/link";
import { Building2, Check, ChevronsUpDown, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { usePreferences } from "@/lib/stores";
import { cn } from "@/lib/utils";

/** Shows the current workspace; this build supports one workspace per account. */
export function WorkspaceSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { workspaceName } = usePreferences();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Workspace: ${workspaceName}. Open workspace menu`}
          className={cn("flex w-full items-center gap-2.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 text-left hover:bg-white/[0.07]", collapsed && "justify-center px-0")}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-sidebar-fg"><Building2 className="size-4" aria-hidden /></span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-sidebar-fg">{workspaceName}</span>
                <span className="block text-[11px] text-sidebar-muted">Workspace</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-sidebar-muted" aria-hidden />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuItem disabled>
          <span className="flex-1 truncate">{workspaceName}</span>
          <Check className="!text-primary" aria-label="Current workspace" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings"><Settings /> Workspace settings</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
