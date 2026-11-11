import { NextResponse, type NextRequest } from "next/server";
import { reportSchema } from "@/lib/validations";
import { computeReportSeries } from "@/lib/report-data";

const configSchema = reportSchema.pick({ metric: true, chartType: true, range: true, groupBy: true });

export async function GET(req: NextRequest) {
  const parsed = configSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid report configuration." }, { status: 400 });
  return NextResponse.json({ ok: true, data: computeReportSeries(parsed.data) });
}
