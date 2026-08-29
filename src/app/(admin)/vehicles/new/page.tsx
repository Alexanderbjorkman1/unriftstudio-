import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { createVehicleAction } from "@/lib/actions/crm";
import { listCustomers } from "@/lib/repo/customers";

export const dynamic = "force-dynamic";
export const metadata = { title: "New vehicle" };

export default async function NewVehiclePage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer } = await searchParams;
  return (
    <div className="space-y-4">
      <Link href="/vehicles" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Back to vehicles
      </Link>
      <VehicleForm action={createVehicleAction} customers={listCustomers()} defaultCustomerId={customer} />
    </div>
  );
}
