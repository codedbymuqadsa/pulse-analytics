import { NextResponse } from "next/server";
import { getCustomerDetail } from "@/lib/repositories/customers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCustomerDetail(id);
  if (!detail) return NextResponse.json({ ok: false, error: "Customer not found." }, { status: 404 });
  return NextResponse.json({ ok: true, data: detail });
}
