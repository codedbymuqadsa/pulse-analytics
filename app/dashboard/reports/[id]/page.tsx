import type { Metadata } from "next";
import { ReportDetail } from "@/components/reports/report-detail";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportDetail id={decodeURIComponent(id)} />;
}
