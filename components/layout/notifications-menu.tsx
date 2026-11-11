"use client";

import { AlertTriangle, CheckCheck, CreditCard, TrendingUp } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { readNotificationsStore, useReadNotifications } from "@/lib/stores";
import { cn } from "@/lib/utils";

const NOTIFICATIONS = [
  { id: "n1", icon: TrendingUp, title: "MRR passed a new milestone", body: "Monthly recurring revenue grew past $80,000.", time: "2h ago" },
  { id: "n2", icon: AlertTriangle, title: "Churn above target", body: "Business-plan churn rose week over week.", time: "Yesterday" },
  { id: "n3", icon: CreditCard, title: "3 failed payments", body: "Review failed invoices in the transactions table.", time: "2 days ago" },
];

export function NotificationsMenu({ trigger }: { trigger: React.ReactElement }) {
  const read = useReadNotifications();
  const unread = NOTIFICATIONS.filter((n) => !read.includes(n.id));

  return (
    <DropdownMenu>
      <div className="relative">
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        {unread.length > 0 && (
          <span aria-hidden className="pointer-events-none absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">{unread.length}</span>
        )}
        <span className="sr-only" aria-live="polite">{unread.length} unread notifications</span>
      </div>
      <DropdownMenuContent className="w-80">
        <div className="flex items-center justify-between pr-1">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <Button size="sm" variant="ghost" disabled={unread.length === 0} onClick={() => readNotificationsStore.set(NOTIFICATIONS.map((n) => n.id))}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <ul>
          {NOTIFICATIONS.map((n) => {
            const Icon = n.icon;
            const isRead = read.includes(n.id);
            return (
              <li key={n.id} className="flex gap-3 rounded-sm px-2 py-2.5">
                <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", isRead ? "bg-surface-muted text-muted" : "bg-primary-soft text-primary")}><Icon className="size-4" aria-hidden /></span>
                <div className="min-w-0">
                  <p className={cn("text-sm", isRead ? "font-medium" : "font-semibold")}>{n.title}{!isRead && <span className="sr-only"> (unread)</span>}</p>
                  <p className="text-[13px] text-muted">{n.body}</p>
                  <p className="mt-0.5 text-xs text-muted">{n.time}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
