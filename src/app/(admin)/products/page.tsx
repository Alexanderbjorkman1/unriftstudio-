import { ProductManager } from "@/components/admin/product-manager";
import { listProducts } from "@/lib/repo/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

export default function ProductsPage() {
  return <ProductManager products={listProducts()} />;
}
