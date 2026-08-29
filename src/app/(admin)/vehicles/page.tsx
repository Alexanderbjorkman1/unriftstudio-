import Link from "next/link";
import { Car, Plus } from "lucide-react";
import { Card, EmptyState, LinkButton, Table, Td, Th } from "@/components/ui";
import { SearchInput } from "@/components/admin/filters";
import { VehicleThumb } from "@/components/car-art";
import { listVehicles } from "@/lib/repo/vehicles";
import { money } from "@/lib/format";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vehicles" };

const SIZE_LABEL: Record<string, string> = { small: "Small", medium: "Medium", large: "Large", xl: "XL / SUV" };

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const vehicles = listVehicles(q);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Search by make, model, plate or owner…" />
        <div className="ml-auto">
          <LinkButton href="/vehicles/new">
            <Plus className="size-4" /> New vehicle
          </LinkButton>
        </div>
      </div>

      <Card className="overflow-hidden">
        {vehicles.length === 0 ? (
          <EmptyState
            icon={<Car className="size-5" />}
            title="No vehicles yet"
            description="Vehicles are added automatically with every online booking."
            action={
              <Link href="/vehicles/new" className="text-[13px] font-medium text-brand hover:text-fg">
                Add one manually
              </Link>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Vehicle</Th>
                <Th>Plate</Th>
                <Th>Owner</Th>
                <Th>Size</Th>
                <Th className="text-right">Mileage</Th>
                <Th className="text-right">Jobs</Th>
                <Th className="text-right">Revenue</Th>
                <Th>Last service</Th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="group transition hover:bg-raised/60">
                  <Td>
                    <Link href={`/vehicles/${vehicle.id}`} className="flex items-center gap-3">
                      <VehicleThumb make={vehicle.make} model={vehicle.model} className="h-10 w-15" />
                      <span>
                        <span className="block font-medium group-hover:text-brand">
                          {vehicle.make} {vehicle.model}
                        </span>
                        <span className="block text-[11px] text-faint">
                          {vehicle.year ?? "—"} · {vehicle.color || "—"}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[11px] tracking-wider">
                      {vehicle.plate || "—"}
                    </span>
                  </Td>
                  <Td className="text-muted">
                    {vehicle.customer_id ? (
                      <Link href={`/customers/${vehicle.customer_id}`} className="hover:text-brand">
                        {vehicle.customer_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="text-muted">{SIZE_LABEL[vehicle.size] ?? vehicle.size}</Td>
                  <Td className="text-right text-muted tabular-nums">
                    {vehicle.mileage ? `${new Intl.NumberFormat("sv-SE").format(vehicle.mileage)} km` : "—"}
                  </Td>
                  <Td className="text-right tabular-nums">{vehicle.job_count}</Td>
                  <Td className="text-right font-medium tabular-nums">{money(vehicle.total_spend)}</Td>
                  <Td className="whitespace-nowrap text-muted">
                    {vehicle.last_service ? formatDate(vehicle.last_service) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
