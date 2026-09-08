import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listCountryRecords, listCityRecords } from "@/lib/cms/admin-queries";
import { ActionForm } from "@/components/admin/ActionForm";
import { createDestinationAction } from "@/app/actions/destinations";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm";
const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";

/** Create a destination (EDITOR/ADMIN). Anchored to existing Country/City
 * records — the structural hierarchy makes parent cycles impossible. */
export default async function NewDestinationPage() {
  await requireRole("EDITOR").catch(() => notFound()); // server-side authz (spec §17)
  const [countries, cities] = await Promise.all([listCountryRecords(), listCityRecords()]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black text-navy">New destination</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Anchor every destination to its structured record (country / city) — breadcrumbs and hierarchy derive from
        these relationships, so cycles are impossible by construction.
      </p>

      <div className="mt-6 rounded-xl border border-navy-100 bg-white p-5">
        <ActionForm action={createDestinationAction} submitLabel="Create destination">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>Type
              <select name="type" defaultValue="COUNTRY" className={input}>
                <option value="COUNTRY">Country</option>
                <option value="CITY">City</option>
                <option value="REGION">Region</option>
                <option value="ATTRACTION">Attraction</option>
                <option value="VENUE">Venue</option>
              </select>
            </label>
            <label className={label}>Country record
              <select name="countryId" className={input}>
                <option value="">— none —</option>
                {countries.map((c) => {
                  const name = c.translations.find((t) => t.locale === "en")?.name ?? c.iso2;
                  return <option key={c.id} value={c.id}>{name} ({c.iso2})</option>;
                })}
              </select>
            </label>
            <label className={label}>City record (city destinations)
              <select name="cityId" className={input}>
                <option value="">— none —</option>
                {cities.map((c) => {
                  const name = c.translations.find((t) => t.locale === "en")?.name ?? c.id;
                  const country = c.country.translations.find((t) => t.locale === "en")?.name ?? "";
                  return <option key={c.id} value={c.id}>{name}{country ? ` — ${country}` : ""}</option>;
                })}
              </select>
            </label>
            <label className={label}>Hero media ID (from the media library)
              <input name="heroAssetId" className={input} placeholder="MediaAsset id…" />
            </label>
          </div>

          <fieldset className="mt-4 rounded-xl border border-navy-100 p-4">
            <legend className="px-1 text-xs font-bold uppercase text-terracotta-ink">First locale version (independent DRAFT)</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className={label}>Locale
                <select name="locale" defaultValue="en" className={input}>
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                  <option value="ar">AR</option>
                </select>
              </label>
              <label className={label}>Name
                <input name="name" required minLength={2} className={input} dir="auto" />
              </label>
              <label className={label}>Slug (Latin per project rule)
                <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} placeholder="marrakech" />
              </label>
            </div>
            <label className={`${label} mt-3`}>Tagline
              <input name="tagline" className={input} dir="auto" />
            </label>
            <label className={`${label} mt-3`}>Editorial introduction (standfirst)
              <textarea name="intro" rows={3} className={input} dir="auto" />
            </label>
            <label className={`${label} mt-3`}>Meta description
              <textarea name="metaDescription" rows={2} maxLength={400} className={input} dir="auto" />
            </label>
            <input type="hidden" name="blocks" value='[{"type":"paragraph","text":"Draft — open the editor to write the destination overview."}]' />
            <input type="hidden" name="faq" value="[]" />
          </fieldset>
        </ActionForm>
      </div>
    </div>
  );
}
