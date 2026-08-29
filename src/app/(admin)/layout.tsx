import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("owner");
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={user.name} />
        <main className="flex-1 px-5 pt-5 pb-10 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
