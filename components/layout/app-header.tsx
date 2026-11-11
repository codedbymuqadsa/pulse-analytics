"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Bell, ChevronRight, LogOut, Menu, Moon, Search, Settings, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SheetContent } from "@/components/ui/dialog";
import { Avatar } from "@/components/shared/avatar";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { SidebarContent } from "@/components/layout/sidebar-content";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { pageTitle, RANGE_ROUTES } from "@/lib/nav";
import { usePreferences } from "@/lib/stores";
import { signOut as endSession } from "@/lib/auth";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(dark ? "light" : "dark")}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const prefs = usePreferences();
  const { title, parent } = pageTitle(pathname);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const showRange = RANGE_ROUTES.includes(pathname);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function signOut() {
    endSession();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="flex min-h-16 flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2 md:px-6">
        <Dialog open={navOpen} onOpenChange={setNavOpen}>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu" onClick={() => setNavOpen(true)}><Menu /></Button>
          <SheetContent side="left" aria-describedby="nav-desc">
            <DialogTitle className="sr-only">Navigation</DialogTitle>
            <DialogDescription id="nav-desc" className="sr-only">Primary navigation links</DialogDescription>
            <SidebarContent onNavigate={() => setNavOpen(false)} />
          </SheetContent>
        </Dialog>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex items-center gap-1.5 text-sm">
            {parent && (
              <>
                <li className="hidden sm:block"><Link href={parent.href} className="text-muted hover:text-foreground">{parent.label}</Link></li>
                <li aria-hidden className="hidden text-muted sm:block"><ChevronRight className="size-3.5" /></li>
              </>
            )}
            <li className="truncate font-semibold" aria-current="page">{title}</li>
          </ol>
        </nav>

        {showRange && <DateRangePicker className="order-last w-full sm:order-none sm:w-auto md:max-w-[15rem]" />}

        <Button variant="secondary" className="hidden w-52 justify-between text-muted md:inline-flex" onClick={() => setPaletteOpen(true)} aria-label="Open search and command palette">
          <span className="flex items-center gap-2"><Search /> Search…</span>
          <kbd className="rounded border bg-surface-muted px-1.5 text-[11px] font-medium">Ctrl K</kbd>
        </Button>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setPaletteOpen(true)} aria-label="Open search"><Search /></Button>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

        <NotificationsMenu trigger={<Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button>} />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Open profile menu" className="rounded-full"><Avatar name={prefs.profile.displayName} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>
              <span className="block text-sm font-semibold text-foreground">{prefs.profile.displayName}</span>
              <span className="block font-normal">{prefs.profile.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/dashboard/settings")}><Settings /> Settings</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <Sun /> : <Moon />} Toggle theme</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}><LogOut /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

