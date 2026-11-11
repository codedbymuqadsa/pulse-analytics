import type { Metadata } from "next";
import { ProductsView } from "@/components/products/products-view";
import { PageHeader } from "@/components/shared/page-header";
import { getProductsData } from "@/lib/repositories/products";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const data = await getProductsData();
  return (
    <>
      <PageHeader title="Products" description="Subscription plans, pricing and how each one performs." />
      <ProductsView data={data} />
    </>
  );
}
