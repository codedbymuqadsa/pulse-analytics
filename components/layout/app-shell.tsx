"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FooterClock } from "@/components/layout/footer-clock";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarContent } from "@/components/layout/sidebar-content";
import { useUrlState } from "@/hooks/use-url-state";
import { getCurrentAccount, signOut } from "@/lib/auth";
import { RANGE_ROUTES } from "@/lib/nav";
import { usePreferences } from "@/lib/stores";
import { cn } from "@/lib/utils";

/** Applies the saved default range / compare preference once when a range page is opened without URL params. */
function ApplyDefaults() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const prefs = usePreferences();
  const { update } = useUrlState();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !RANGE_ROUTES.includes(pathname)) return;
    applied.current = true;
    const changes: Record<string, string> = {};
    if (!sp.get("range") && prefs.defaultRange !== "30d") changes.range = prefs.defaultRange;
    if (!sp.get("compare") && !prefs.defaultCompare) changes.compare = "false";
    if (Object.keys(changes).length) update(changes, { replace: true });
  }, [pathname, sp, prefs.defaultRange, prefs.defaultCompare, update]);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = usePreferences();
  const router = useRouter();

  // The session cookie can outlive the browser's stored account (e.g. site data was cleared): send the user back to sign in.
  useEffect(() => {
    if (!getCurrentAccount()) {
      signOut();
      router.replace("/login");
    }
  }, [router]);
  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[100] rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-fg">Skip to main content</a>
      <aside
        aria-label="Sidebar"
        className={cn("sticky top-0 hidden h-dvh shrink-0 border-r border-white/[0.06] transition-[width] duration-200 lg:block", sidebarCollapsed ? "w-[72px]" : "w-[250px]")}
      >
        <SidebarContent collapsed={sidebarCollapsed} showCollapse />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <ApplyDefaults />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 outline-none md:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t px-4 py-3 text-center text-xs text-muted md:px-6">
          © {new Date().getFullYear()} Pulse Analytics<FooterClock />
        </footer>
      </div>
    </div>
  );
}
