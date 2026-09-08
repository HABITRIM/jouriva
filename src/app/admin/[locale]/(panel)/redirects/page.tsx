import { listRedirects } from "@/lib/cms/admin-queries";
import { ActionForm } from "@/components/admin/ActionForm";
import { createRedirectAction, toggleRedirectAction, deleteRedirectAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm";
const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";

/** Redirect management (spec §19, ADMIN-only): per-locale 301s, loop-safe. */
export default async function RedirectsPage() {
  const redirects = await listRedirects();
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-black text-navy">Redirects (301)</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Per-locale SEO redirects, applied by middleware with a short cache. Loop-safe: chains are validated at creation and at serve time.
        Changing a <strong>published</strong> slug in the editor offers this automatically.
      </p>

      <section aria-labelledby="cr-h" className="mt-6 rounded-xl border border-navy-100 bg-white p-5">
        <h2 id="cr-h" className="kicker">New redirect</h2>
        <ActionForm action={createRedirectAction} submitLabel="Create 301" className="mt-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={label}>Locale
              <select name="locale" className={input} defaultValue="en">
                <option value="en">EN</option>
                <option value="es">ES</option>
                <option value="ar">AR</option>
              </select>
            </label>
            <label className={label}>Source path (old)
              <input name="sourcePath" required placeholder="/guides/old-slug/" className={input} />
            </label>
            <label className={label}>Destination path (new)
              <input name="destinationPath" required placeholder="/guides/new-slug/" className={input} />
            </label>
          </div>
        </ActionForm>
      </section>

      <table className="mt-6 w-full text-sm">
        <caption className="sr-only">Existing redirects</caption>
        <thead>
          <tr className="text-left text-xs uppercase text-ink-soft">
            <th scope="col" className="py-2">Locale</th><th scope="col">From → To</th><th scope="col">Status</th><th scope="col">By</th><th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {redirects.map((r) => (
            <tr key={r.id}>
              <td className="py-2 font-bold">{r.locale.toUpperCase()}</td>
              <td className="py-2">
                /{r.locale}{r.sourcePath} <span className="text-ink-soft">→</span> /{r.locale}{r.destinationPath}{" "}
                <span className="rounded border border-navy-100 px-1 text-xs font-bold">{r.statusCode}</span>
              </td>
              <td className="py-2">{r.active ? <span className="font-bold text-emerald-700">active</span> : <span className="text-stone-500">inactive</span>}</td>
              <td className="py-2 text-xs">{r.createdBy?.name ?? "—"}</td>
              <td className="py-2">
                <div className="flex gap-2">
                  <form action={toggleRedirectAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="active" value={r.active ? "false" : "true"} />
                    <button className="rounded border border-navy-100 px-2 py-0.5 text-xs font-bold">{r.active ? "Deactivate" : "Activate"}</button>
                  </form>
                  <form action={deleteRedirectAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">Delete</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {redirects.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-ink-soft">No redirects yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
