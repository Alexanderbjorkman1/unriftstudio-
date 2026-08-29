import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CustomerForm } from "@/components/admin/customer-form";
import { createCustomerAction } from "@/lib/actions/crm";

export const metadata = { title: "New customer" };

export default function NewCustomerPage() {
  return (
    <div className="space-y-4">
      <Link href="/customers" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Back to customers
      </Link>
      <CustomerForm action={createCustomerAction} />
    </div>
  );
}
