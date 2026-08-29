import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { updateVehicleAction } from "@/lib/actions/crm";
import { getVehicle } from "@/lib/repo/vehicles";
import { listCustomers } from "@/lib/repo/customers";

export const dynamic = "force-dynamic";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = getVehicle(Number(id));
  if (!vehicle) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/vehicles/${vehicle.id}`} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Back to vehicle
      </Link>
      <VehicleForm action={updateVehicleAction.bind(null, vehicle.id)} vehicle={vehicle} customers={listCustomers()} />
    </div>
  );
}
