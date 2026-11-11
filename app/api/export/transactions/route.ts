import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { resolveRange } from "@/lib/date-range";
import { parseTransactionQuery } from "@/lib/filters";
import { getTransactionsForExport } from "@/lib/repositories/analytics";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const range = resolveRange(params);
  const q = parseTransactionQuery(params);
  const rows = await getTransactionsForExport(range, q);
  if (rows.length === 0) return NextResponse.json({ ok: false, error: "No transactions match the current filters." }, { status: 422 });
  const csv = toCsv(
    ["Transaction ID", "Customer ID", "Customer", "Email", "Date", "Plan", "Amount (USD)", "Status"],
    rows.map((t) => [t.id, t.customerId, t.customerName, t.customerEmail, t.date, t.plan, t.amount.toFixed(2), t.status]),
  );
  return new NextResponse("﻿" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="transactions.csv"', "Cache-Control": "no-store" },
  });
}
