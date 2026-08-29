import { EmployeeManager } from "@/components/admin/employee-manager";
import { listUsers, technicianStats } from "@/lib/repo/users";
import { addDays, dayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Employees" };

export default function EmployeesPage() {
  const today = new Date();
  const stats = technicianStats(`${dayKey(addDays(today, -30))}T00:00`, `${dayKey(today)}T23:59`);
  return <EmployeeManager employees={listUsers()} stats={stats} />;
}
