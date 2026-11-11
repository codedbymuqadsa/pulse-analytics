"use client";

import Link from "next/link";
import type { Customer } from "@/types/customer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/shared/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useFormatters } from "@/hooks/use-formatters";
import { Trophy } from "lucide-react";

export function TopCustomers({ rows, className }: { rows: Array<{ customer: Customer; revenue: number }>; className?: string }) {
  const f = useFormatters();
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>Top customers</CardTitle>
          <CardDescription>Ranked by paid invoices in the period</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {rows.length === 0 ? (
          <EmptyState icon={Trophy} title="No paid invoices" description="No customers paid an invoice in this period." />
        ) : (
          <ol className="divide-y">
            {rows.map(({ customer: c, revenue }, i) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <span className="w-4 text-xs font-semibold text-muted tabular">{i + 1}</span>
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/customers?q=${encodeURIComponent(c.email)}`} className="block truncate text-sm font-medium hover:text-primary">{c.name}</Link>
                  <p className="truncate text-xs text-muted">{c.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular">{f.currency(revenue)}</p>
                  <p className="mb-1 text-xs text-muted">{c.plan}</p>
                  <StatusBadge status={c.status} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
