import { requireUser } from "@/lib/auth";
import { TechTabBar } from "@/components/tech/tab-bar";

export const dynamic = "force-dynamic";

export default async function TechLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/app");
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-line bg-canvas sm:border-x">
        <div className="flex-1 pb-24">{children}</div>
        <TechTabBar />
      </div>
    </div>
  );
}
