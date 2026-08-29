import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CustomerForm } from "@/components/admin/customer-form";
import { updateCustomerAction } from "@/lib/actions/crm";
import { getCustomer } from "@/lib/repo/customers";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = getCustomer(Number(id));
  if (!customer) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/customers/${customer.id}`} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Back to {customer.name}
      </Link>
      <CustomerForm action={updateCustomerAction.bind(null, customer.id)} customer={customer} />
    </div>
  );
}
