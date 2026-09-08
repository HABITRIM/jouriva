import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ActionForm } from "@/components/admin/ActionForm";
import { loginAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

/** CMS login (outside the guarded route group). Real credentials → real session. */
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  const safeLocale = ["en", "es", "ar"].includes(locale) ? locale : "en";
  const user = await getSessionUser();
  if (user) redirect(next?.startsWith("/admin/") ? next : `/admin/${safeLocale}`);

  return (
    <html lang={safeLocale} dir={safeLocale === "ar" ? "rtl" : "ltr"}>
      <body className="flex min-h-screen items-center justify-center bg-navy p-6" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
          <p className="font-display text-center text-lg font-bold tracking-[0.18em] text-navy">JOURIVA</p>
          <p className="mt-1 text-center text-xs uppercase tracking-widest text-terracotta-ink">Editorial CMS</p>
          <h1 className="mt-6 text-lg font-bold text-charcoal">Sign in</h1>
          <ActionForm action={loginAction} submitLabel="Sign in" className="mt-4">
            <input type="hidden" name="next" value={next ?? ""} />
            <label htmlFor="email" className="block text-sm font-semibold text-charcoal">Email</label>
            <input
              id="email" name="email" type="email" required autoComplete="username"
              className="mt-1 w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-terracotta-ink"
            />
            <label htmlFor="password" className="mt-4 block text-sm font-semibold text-charcoal">Password</label>
            <input
              id="password" name="password" type="password" required autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-terracotta-ink"
            />
          </ActionForm>
        </div>
      </body>
    </html>
  );
}
