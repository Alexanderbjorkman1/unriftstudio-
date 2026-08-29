import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { currentUser, login } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await currentUser();
  if (user) redirect(user.role === "owner" ? "/dashboard" : "/app");

  async function signIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const target = String(formData.get("next") ?? "");
    const account = await login(email, password);
    if (!account) {
      redirect(`/login?error=1${target ? `&next=${encodeURIComponent(target)}` : ""}`);
    }
    redirect(target || (account.role === "owner" ? "/dashboard" : "/app"));
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-[10px] bg-gradient-to-br from-brand to-brand-strong">
              <Sparkles className="size-5 text-white" strokeWidth={2.2} />
            </span>
            <span className="text-lg font-semibold tracking-tight">DetailFlow</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-[13px] text-muted">Manage your bookings, jobs and invoices.</p>

          {error && (
            <p className="mt-5 rounded-[10px] border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              Wrong email or password. Try again.
            </p>
          )}

          <form action={signIn} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next ?? ""} />
            <Field label="Email">
              <Input name="email" type="email" required autoComplete="email" defaultValue="alex@detailflow.se" placeholder="you@shop.se" />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" required autoComplete="current-password" defaultValue="demo1234" placeholder="••••••••" />
            </Field>
            <Button type="submit" size="lg" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-[12px] border border-line bg-panel p-4 text-[12px] text-muted">
            <p className="mb-1.5 font-medium text-fg">Demo accounts</p>
            <p>Owner — alex@detailflow.se / demo1234</p>
            <p>Technician — johan@detailflow.se / demo1234</p>
          </div>

          <p className="mt-6 text-center text-[13px] text-muted">
            Looking to book a detail?{" "}
            <Link href="/book" className="font-medium text-brand hover:text-fg">
              Go to the booking page
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-line bg-gradient-to-br from-[#0d1420] via-[#0a0e16] to-[#0b1524] lg:block">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute right-10 bottom-10 left-10">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">DetailFlow</p>
          <p className="mt-3 text-3xl leading-tight font-semibold tracking-tight">
            Bookings, jobs and payments
            <br />
            in one dark, fast workspace.
          </p>
          <p className="mt-3 max-w-md text-sm text-muted">
            Customers book online, your technicians work through checklists on their phone, and every completed job turns
            into an invoice.
          </p>
        </div>
      </div>
    </div>
  );
}
