import type { Metadata } from "next";
import { CustomersView } from "@/components/customers/customers-view";
import { PageHeader } from "@/components/shared/page-header";
import { parseCustomerQuery } from "@/lib/filters";
import { getCustomers } from "@/lib/repositories/customers";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseCustomerQuery(await searchParams);
  const page = await getCustomers(query);
  return (
    <>
      <PageHeader title="Customers" description="Search, segment and review every customer account." />
      <CustomersView page={page} query={query} />
    </>
  );
}
