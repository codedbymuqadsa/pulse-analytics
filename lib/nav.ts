import { BarChart3, CircleDollarSign, LayoutDashboard, Megaphone, Package, Settings, Users, Bookmark, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Preserve the global date range when navigating here */
  usesRange?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, usesRange: true },
  { href: "/dashboard/revenue", label: "Revenue", icon: CircleDollarSign, usesRange: true },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/acquisition", label: "Acquisition", icon: Megaphone, usesRange: true },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/dashboard/reports?view=saved", label: "Saved Reports", icon: Bookmark },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];
export const RANGE_ROUTES = ["/dashboard", "/dashboard/revenue", "/dashboard/acquisition"];

export function pageTitle(pathname: string): { title: string; parent?: { label: string; href: string } } {
  if (pathname.startsWith("/dashboard/reports/")) return { title: "Report", parent: { label: "Reports", href: "/dashboard/reports" } };
  const match = [...PRIMARY_NAV, ...SECONDARY_NAV].find((n) => n.href.split("?")[0] === pathname);
  return { title: match?.label ?? "Dashboard" };
}

export function isActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0];
  if (path === "/dashboard") return pathname === "/dashboard";
  return pathname === path || pathname.startsWith(path + "/");
}

