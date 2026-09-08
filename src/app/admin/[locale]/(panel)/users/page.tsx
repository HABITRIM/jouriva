import { listUsers } from "@/lib/cms/admin-queries";
import { requireRole } from "@/lib/auth";
import { ActionForm } from "@/components/admin/ActionForm";
import { createUserAction, toggleUserActiveAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm";
const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";

/** User management (ADMIN-only, spec §21). */
export default async function UsersPage() {
  let denied = false;
  try {
    await requireRole("ADMIN");
  } catch {
    denied = true; // AuthorizationError → clean denial UI (not a 500)
  }
  if (denied) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-xl font-black text-red-800">Not authorized</h1>
        <p className="mt-2 text-sm text-red-900">Only ADMIN can manage users and roles. This action was blocked server-side.</p>
      </div>
    );
  }
  const users = await listUsers();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-black text-navy">Users & roles</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Roles: <strong>ADMIN</strong> (full access) · <strong>EDITOR</strong> (manage articles/media/publish) ·{" "}
        <strong>REVIEWER</strong> (fact-check/SEO/approve) · <strong>AUTHOR</strong> (own drafts → submit). Enforcement is server-side.
      </p>

      <table className="mt-6 w-full text-sm">
        <caption className="sr-only">CMS users</caption>
        <thead>
          <tr className="text-left text-xs uppercase text-ink-soft">
            <th scope="col" className="py-2">User</th><th scope="col">Role</th><th scope="col">Author profile</th><th scope="col">Status</th><th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100 bg-white">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="py-2"><span className="font-semibold text-navy">{u.name}</span><span className="block text-xs text-ink-soft">{u.email}</span></td>
              <td className="py-2"><span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy">{u.role}</span></td>
              <td className="py-2 text-xs">{u.authorProfile?.name ?? "—"}</td>
              <td className="py-2">{u.isActive ? <span className="font-bold text-emerald-700">active</span> : <span className="text-stone-500">disabled</span>}</td>
              <td className="py-2">
                <form action={toggleUserActiveAction}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="active" value={u.isActive ? "false" : "true"} />
                  <button className="rounded border border-navy-100 px-2 py-0.5 text-xs font-bold">{u.isActive ? "Disable (revoke sessions)" : "Enable"}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section aria-labelledby="nu-h" className="mt-8 rounded-xl border border-navy-100 bg-white p-5">
        <h2 id="nu-h" className="kicker">New user</h2>
        <ActionForm action={createUserAction} submitLabel="Create user" resetOnSuccess className="mt-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>Name
              <input name="name" required className={input} />
            </label>
            <label className={label}>Email
              <input name="email" type="email" required className={input} />
            </label>
            <label className={label}>Role
              <select name="role" defaultValue="AUTHOR" className={input}>
                <option value="AUTHOR">AUTHOR</option>
                <option value="REVIEWER">REVIEWER</option>
                <option value="EDITOR">EDITOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <label className={label}>Password (min 10 chars)
              <input name="password" type="password" required minLength={10} autoComplete="new-password" className={input} />
            </label>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
