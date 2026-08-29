import Link from "next/link";
import { Phone, Sparkles } from "lucide-react";
import { getSettings } from "@/lib/repo/settings";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = getSettings();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-[9px] bg-gradient-to-br from-brand to-brand-strong">
              <Sparkles className="size-4.5 text-white" strokeWidth={2.2} />
            </span>
            <span className="text-[17px] font-semibold tracking-tight">{settings.business_name}</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-6 text-[13px] text-muted md:flex">
            <Link href="/#services" className="transition hover:text-fg">
              Services
            </Link>
            <Link href="/#how" className="transition hover:text-fg">
              How it works
            </Link>
            <Link href="/#contact" className="transition hover:text-fg">
              Contact
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <a href={`tel:${settings.phone}`} className="hidden items-center gap-1.5 text-[13px] text-muted transition hover:text-fg sm:flex">
              <Phone className="size-4" /> {settings.phone}
            </a>
            <Link
              href="/book"
              className="rounded-[10px] bg-brand-strong px-4 py-2 text-[13px] font-medium text-white transition hover:bg-brand"
            >
              Book now
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer id="contact" className="border-t border-line bg-rail">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-[9px] bg-gradient-to-br from-brand to-brand-strong">
                <Sparkles className="size-4.5 text-white" strokeWidth={2.2} />
              </span>
              <span className="text-[16px] font-semibold tracking-tight">{settings.business_name}</span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] text-muted">{settings.tagline}</p>
          </div>

          <div className="text-[13px]">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Visit us</h3>
            <p className="text-muted">
              {settings.address}
              <br />
              {settings.postal_code} {settings.city}
            </p>
          </div>

          <div className="text-[13px]">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">Get in touch</h3>
            <p className="space-y-1 text-muted">
              <a href={`mailto:${settings.email}`} className="block transition hover:text-fg">
                {settings.email}
              </a>
              <a href={`tel:${settings.phone}`} className="block transition hover:text-fg">
                {settings.phone}
              </a>
              <Link href="/login" className="mt-2 block text-faint transition hover:text-fg">
                Staff login →
              </Link>
            </p>
          </div>
        </div>
        <div className="border-t border-line px-5 py-4">
          <p className="mx-auto w-full max-w-6xl text-[12px] text-faint">
            © {new Date().getFullYear()} {settings.business_name} · Org. nr {settings.org_number}
          </p>
        </div>
      </footer>
    </div>
  );
}
