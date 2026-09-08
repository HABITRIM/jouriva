import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { logoutAction } from "@/app/actions/auth";

/**
 * Admin shell — separate from the public site (own document shell, no public
 * header/footer, no public bundles). Auth is enforced HERE server-side (DB
 * session) for every page in this segment; middleware's cookie check is only
 * a fast pre-filter. RTL is honored for /admin/ar.
 */

const NAV = [
  { href: "", label: "Dashboard" },
  { href: "/articles", label: "Articles" },
  { href: "/destinations", label: "Destinations" },
  { href: "/taxonomy", label: "Taxonomy" },
  { href: "/search-insights", label: "Search insights" },
  { href: "/media", label: "Media" },
  { href: "/authors", label: "Authors" },
  { href: "/redirects", label: "Redirects" },
  { href: "/users", label: "Users" },
];

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = ["en", "es", "ar"].includes(locale) ? locale : "en";
  const user = await getSessionUser();
  if (!user) redirect(`/admin/${safeLocale}/login`);
  const dir = safeLocale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={safeLocale} dir={dir}>
      <body className="min-h-screen bg-[#F4F5F7] text-charcoal" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 bg-navy text-sand" aria-label="CMS navigation">
            <div className="border-b border-white/10 p-4">
              <span className="font-display text-sm font-bold tracking-[0.18em] text-white">JOURIVA</span>
              <p className="mt-0.5 text-[0.65rem] uppercase tracking-widest text-terracotta-bright">CMS · Phase 2</p>
            </div>
            <nav className="p-2">
              <ul className="space-y-0.5">
                {NAV.map((item) => (
                  <li key={item.label}>
                    <a
                      href={`/admin/${safeLocale}${item.href}`}
                      className="block rounded-lg px-3 py-2 text-sm font-semibold text-sand/85 transition hover:bg-white/10 hover:text-white"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-auto border-t border-white/10 p-4 text-xs text-sand/60">
              <p className="font-semibold text-sand/90">{user.name}</p>
              <p>{user.email}</p>
              <p className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 font-bold text-white">{user.role}</p>
              <form action={logoutAction} className="mt-3">
                <button type="submit" className="rounded-lg border border-white/25 px-3 py-1.5 font-semibold text-sand hover:bg-white/10">
                  Sign out
                </button>
              </form>
              <p className="mt-4 flex items-center gap-2">
                <Logo inverted className="scale-90 origin-left" />
              </p>
            </div>
          </aside>
          <main id="main-content" className="flex-1 p-6 lg:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
