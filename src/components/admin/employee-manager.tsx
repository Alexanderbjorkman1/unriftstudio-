"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X } from "lucide-react";
import { Avatar, Badge, Button, Card, Field, Input, Select, cn } from "@/components/ui";
import { HBarChart } from "@/components/charts/bar-chart";
import { deactivateEmployeeAction, saveEmployeeAction } from "@/lib/actions/crm";
import { duration, money } from "@/lib/format";
import type { User } from "@/lib/types";

const COLORS = ["#3B82F6", "#22C55E", "#A855F7", "#F59E0B", "#06B6D4", "#EC4899"];

export function EmployeeManager({
  employees,
  stats,
}: {
  employees: User[];
  stats: Array<{ id: number; name: string; color: string; jobs: number; minutes: number; revenue: number }>;
}) {
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const statFor = (id: number) => stats.find((s) => s.id === id);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Add employee
            </Button>
          </div>

          {editing && (
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">{editing === "new" ? "New employee" : `Edit ${editing.name}`}</h2>
                <button onClick={() => setEditing(null)} aria-label="Close" className="text-faint hover:text-fg">
                  <X className="size-4" />
                </button>
              </div>
              <form action={saveEmployeeAction.bind(null, editing === "new" ? null : editing.id)} className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                  <Input name="name" required defaultValue={editing === "new" ? "" : editing.name} />
                </Field>
                <Field label="Email">
                  <Input name="email" type="email" required defaultValue={editing === "new" ? "" : editing.email} />
                </Field>
                <Field label="Phone">
                  <Input name="phone" defaultValue={editing === "new" ? "" : editing.phone} />
                </Field>
                <Field label="Role">
                  <Select name="role" defaultValue={editing === "new" ? "technician" : editing.role}>
                    <option value="technician">Technician</option>
                    <option value="owner">Owner / admin</option>
                  </Select>
                </Field>
                <Field label="Hourly rate">
                  <Input name="hourly_rate" type="number" min={0} defaultValue={editing === "new" ? 450 : editing.hourly_rate} />
                </Field>
                <Field label="Password" hint={editing === "new" ? "Defaults to demo1234" : "Leave blank to keep the current one"}>
                  <Input name="password" type="text" placeholder="••••••••" />
                </Field>
                <Field label="Calendar colour">
                  <div className="flex gap-2">
                    {COLORS.map((color) => (
                      <label key={color} className="cursor-pointer">
                        <input
                          type="radio"
                          name="color"
                          value={color}
                          defaultChecked={editing === "new" ? color === COLORS[0] : editing.color === color}
                          className="peer sr-only"
                        />
                        <span
                          className="block size-7 rounded-full ring-offset-2 ring-offset-panel peer-checked:ring-2"
                          style={{ background: color, boxShadow: "0 0 0 0 transparent" }}
                        />
                      </label>
                    ))}
                  </div>
                </Field>
                <label className="flex items-center gap-2 self-end pb-2 text-[13px]">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={editing === "new" ? true : editing.active === 1}
                    className="size-4 accent-[#2563eb]"
                  />
                  Active
                </label>
                <div className="sm:col-span-2">
                  <Button type="submit">Save employee</Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {employees.map((employee) => {
              const stat = statFor(employee.id);
              return (
                <Card key={employee.id} className={cn("p-4", !employee.active && "opacity-50")}>
                  <div className="flex items-start gap-3">
                    <Avatar name={employee.name} color={employee.color} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{employee.name}</p>
                      <p className="text-[12px] text-muted">{employee.email}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone={employee.role === "owner" ? "violet" : "blue"}>{employee.role}</Badge>
                        {!employee.active && <Badge tone="slate">inactive</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditing(employee)}
                        className="grid size-7 place-items-center rounded-lg text-faint hover:bg-raised hover:text-fg"
                        aria-label={`Edit ${employee.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      {employee.active === 1 && (
                        <button
                          onClick={() =>
                            startTransition(async () => {
                              await deactivateEmployeeAction(employee.id);
                              router.refresh();
                            })
                          }
                          className="grid size-7 place-items-center rounded-lg text-faint hover:bg-raised hover:text-danger"
                          aria-label={`Deactivate ${employee.name}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                    <div>
                      <dt className="text-[10.5px] tracking-wide text-faint uppercase">Jobs</dt>
                      <dd className="text-[15px] font-semibold tabular-nums">{stat?.jobs ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-[10.5px] tracking-wide text-faint uppercase">Hours</dt>
                      <dd className="text-[15px] font-semibold tabular-nums">{duration(stat?.minutes ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10.5px] tracking-wide text-faint uppercase">Revenue</dt>
                      <dd className="text-[15px] font-semibold tabular-nums">{money(stat?.revenue ?? 0)}</dd>
                    </div>
                  </dl>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="h-fit p-5">
          <h2 className="text-[15px] font-semibold">Revenue by technician</h2>
          <p className="mt-0.5 mb-4 text-[12px] text-muted">Completed jobs, last 30 days.</p>
          <HBarChart
            data={stats.map((s) => ({ label: s.name, value: s.revenue, display: money(s.revenue), color: s.color }))}
          />
        </Card>
      </div>
    </div>
  );
}
