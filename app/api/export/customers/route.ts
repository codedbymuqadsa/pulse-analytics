import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { parseCustomerQuery } from "@/lib/filters";
import { getCustomersForExport } from "@/lib/repositories/customers";

export async function GET(req: NextRequest) {
  const q = parseCustomerQuery(Object.fromEntries(req.nextUrl.searchParams));
  const rows = await getCustomersForExport(q);
  if (rows.length === 0) return NextResponse.json({ ok: false, error: "No customers match the current filters." }, { status: 422 });
  const csv = toCsv(
    ["Customer ID", "Name", "Email", "Company", "Plan", "Billing", "Monthly spend (USD)", "Created", "Last activity", "Status"],
    rows.map((c) => [c.id, c.name, c.email, c.company, c.plan, c.billing, c.mrr.toFixed(2), c.createdAt, c.lastActivityAt, c.status]),
  );
  return new NextResponse("﻿" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="customers.csv"', "Cache-Control": "no-store" },
  });
}
