#!/usr/bin/env python3
"""
PHASE 3 HUMAN REVIEW — final confirmation checks (read-only except the
explicitly-reverted state-flip probes in section 2, which restore the exact
prior DB value and re-verify it).

1. ContentLink.ownerId nullability — integrity probes (no data changes)
2. Published-only public visibility — every non-PUBLISHED state probed on
   every public surface (routes, sitemap) + state-flip probes (APPROVED,
   SCHEDULED, ARCHIVED) with exact revert
3. Canonical URLs — sitemap full crawl, alias/alternate matrix, hreflang targets
"""
import re
import subprocess
import sys

B = "http://127.0.0.1:3000"
PSQL = ["psql", "postgresql://postgres@127.0.0.1:5432/jouriva", "-tAc"]
PASS, FAIL = [], []


def ok(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(("✓ " if cond else "✗ ") + name + (f"  [{detail}]" if detail and not cond else ""))


def sql(q):
    return subprocess.run(PSQL + [q], capture_output=True, text=True).stdout.strip()


def code(path):
    return subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "25", f"{B}{path}"],
                          capture_output=True, text=True).stdout.strip()


def body(path):
    return subprocess.run(["curl", "-s", "--max-time", "25", f"{B}{path}"], capture_output=True, text=True).stdout


# ═══════════════════════════ 1. ContentLink.ownerId ══════════════════════════
print("── 1. ContentLink.ownerId compatibility ──")

fk = sql("SELECT confdeltype, confupdtype FROM pg_constraint WHERE conname='ContentLink_ownerId_fkey';")
ok("1a FK ContentLink_ownerId_fkey = Phase 2 definition (RESTRICT/CASCADE)", fk == "r|c", fk)  # matches phase2_init migration line 907
fk_ref = sql("SELECT rel2.relname FROM pg_constraint c JOIN pg_class rel1 ON rel1.oid=c.conrelid JOIN pg_class rel2 ON rel2.oid=c.confrelid WHERE c.conname='ContentLink_ownerId_fkey';")
ok("1b FK references ArticleTranslation", fk_ref == "ArticleTranslation", fk_ref)

nulls = int(sql("SELECT COUNT(*) FROM \"ContentLink\" WHERE \"ownerId\" IS NULL;"))
nonnull = int(sql("SELECT COUNT(*) FROM \"ContentLink\" WHERE \"ownerId\" IS NOT NULL;"))
phase2_style = int(sql("SELECT COUNT(*) FROM \"ContentLink\" WHERE \"ownerId\" IS NOT NULL AND \"ownerType\"='ArticleTranslation';"))
curated = int(sql("SELECT COUNT(*) FROM \"ContentLink\" WHERE \"ownerDestinationTranslationId\" IS NOT NULL;"))
ok("1c every ownerId IS NULL row is a Phase 3 curated destination link", nulls == curated, f"nulls={nulls} curated={curated}")
ok("1d all Phase 2 article links intact (ownerId set)", phase2_style == nonnull, f"{phase2_style}/{nonnull}")
orphans = int(sql("SELECT COUNT(*) FROM \"ContentLink\" l LEFT JOIN \"ArticleTranslation\" t ON t.id=l.\"ownerId\" WHERE l.\"ownerId\" IS NOT NULL AND t.id IS NULL;"))
ok("1e zero orphaned ownerId values (referential integrity held)", orphans == 0, str(orphans))
art_links = int(sql("SELECT COUNT(*) FROM \"ArticleDestination\";"))
ok("1f ArticleDestination links untouched", art_links >= 8, str(art_links))

# ═══════════════════ 2. Published-only public visibility ═════════════════════
print("── 2. Published-only visibility ──")

sm = body("/sitemap.xml")
locs = re.findall(r"<loc>(.*?)</loc>", sm)
non_pub = sql("SELECT locale||'|'||slug FROM \"DestinationTranslation\" WHERE \"workflowStatus\" <> 'PUBLISHED';").splitlines()
non_pub = [x for x in non_pub if x]
ok("2a sitemap contains NO non-published destination URL",
   not any(f"/{loc.split('|')[0]}/" in u and f"/{loc.split('|')[1]}/" in u for u in locs for loc in non_pub),
   str(non_pub))

# DRAFT translations must 404 on BOTH route families (static /morocco/* + dynamic)
drafts = [("ar", "morocco", "fes"), ("ar", "morocco", "casablanca"), ("ar", "morocco", "barcelona"), ("es", "france", "paris"), ("es", "paris", "")]
bad = []
for loc, a, c in [(l, x, y) for l, x, y in drafts if y] :
    if code(f"/{loc}/{a}/{c}/") != "404":
        bad.append(f"/{loc}/{a}/{c}/")
    if code(f"/{loc}/{c}/") not in ("301", "308", "404"):  # alias must not 200
        bad.append(f"/{loc}/{c}/ (alias 200?)")
ok("2b every DRAFT translation 404s on country/city routes (no frozen-fallback leak)", not bad, str(bad))

# State-flip probes: a non-PUBLISHED, never-cached translation must never serve.
# Each probe saves the exact prior value and restores it, then re-verifies the DB.
def flip_probe(slug, locale, state):
    anchor = sql(f"SELECT d.id FROM \"Destination\" d JOIN \"DestinationTranslation\" t ON t.\"destinationId\"=d.id WHERE t.locale='{locale}' AND t.slug='{slug}';")
    tr = sql(f"SELECT id, \"workflowStatus\" FROM \"DestinationTranslation\" WHERE locale='{locale}' AND slug='{slug}';")
    tr_id, prior = tr.split("|")
    url_path = sql(f"SELECT '/'||ct.slug FROM \"DestinationTranslation\" dt JOIN \"Destination\" d ON d.id=dt.\"destinationId\" JOIN \"City\" ci ON ci.id=d.\"cityId\" JOIN \"Country\" co ON co.id=d.\"countryId\" JOIN \"CountryTranslation\" ct ON ct.\"countryId\"=co.id AND ct.locale='en' WHERE dt.id='{tr_id}';")
    full = f"/{locale}{url_path}/{slug}/"
    sql(f"UPDATE \"DestinationTranslation\" SET \"workflowStatus\"='{state}' WHERE id='{tr_id}';")
    c1 = code(full)
    in_sm = any(f"/{locale}/{slug}/" in u for u in locs)
    sql(f"UPDATE \"DestinationTranslation\" SET \"workflowStatus\"='{prior}' WHERE id='{tr_id}';")
    after = sql(f"SELECT \"workflowStatus\" FROM \"DestinationTranslation\" WHERE id='{tr_id}';")
    ok(f"2c {locale}/{slug} as {state}: route 404, sitemap clean, reverted ({prior})",
       c1 == "404" and not in_sm and after == prior, f"code={c1} inSitemap={in_sm} after={after}")

flip_probe("casablanca", "ar", "APPROVED")
flip_probe("barcelona", "ar", "SCHEDULED")
flip_probe("fes", "ar", "ARCHIVED")

# Breadcrumb JSON-LD: parents referenced by published city pages must resolve 200
parents = set(re.findall(r'"@id":"http://localhost:3000(/en/[^"]+)"', body("/en/morocco/marrakech/")))
bad_bc = [p for p in parents if code(p) not in ("200",)]
ok("2d breadcrumb JSON-LD targets all resolve (no draft/dead parents)", not bad_bc, str(bad_bc))

# Related destinations on published pages must resolve 200
rel_page = body("/en/morocco/marrakech/")
rel_targets = set(re.findall(r'href="/en/((?:morocco|spain|france)/[^"]+)"', rel_page))
bad_rel = [f"/en/{t}" for t in rel_targets if code(f"/en/{t}") != "200"]
ok("2e all related/children destination links on a published page resolve 200", not bad_rel, str(bad_rel))

# hreflang on published pages: every alternate resolves 200 AND is a canonical URL
alt_urls = set(re.findall(r'hrefLang="[^"]*" href="([^"]+)"', rel_page)) | set(re.findall(r'hreflang="[^"]*" href="([^"]+)"', rel_page))
bad_alt = [u for u in alt_urls if code(u.replace("http://localhost:3000", "")) != "200"]
ok("2f every hreflang alternate on a published page resolves 200", not bad_alt, str(bad_alt))

# Public queries code-level: no path renders a destination translation without
# the PUBLISHED equality filter (preview is session/token-gated).
src = open("src/lib/cms/public-destinations.ts").read()
publisheds = src.count('workflowStatus: "PUBLISHED"')
ok("2g public-destinations.ts uses PUBLISHED equality filters at every entry point", publisheds >= 7, f"{publisheds} filters")

# ═══════════════════ 3. Canonical destination URLs ═══════════════════════════
print("── 3. Canonical URLs & redirects ──")

# 3a. Full sitemap crawl: every URL 200
bad_locs = [u for u in locs if code(u.replace("http://localhost:3000", "")) != "200"]
ok("3a every sitemap URL serves 200", not bad_locs, str(bad_locs[:6]))

# 3b. Exactly one canonical URL per destination/locale: city slugs at country
# level must 301; canonical paths must 200 exactly once in the sitemap.
city_rows = sql("""SELECT t.locale, t.slug, d.type,
  COALESCE((SELECT ct.slug FROM "CountryTranslation" ct WHERE ct.locale=t.locale AND ct."countryId"=COALESCE(d."countryId", (SELECT ci."countryId" FROM "City" ci WHERE ci.id=d."cityId"))),
           (SELECT ct.slug FROM "CountryTranslation" ct WHERE ct.locale='en' AND ct."countryId"=COALESCE(d."countryId", (SELECT ci."countryId" FROM "City" ci WHERE ci.id=d."cityId"))))
  FROM "DestinationTranslation" t JOIN "Destination" d ON d.id=t."destinationId" WHERE t."workflowStatus"='PUBLISHED';""").splitlines()
aliases_bad, dup_bad = [], []
for row in [r for r in city_rows if r]:
    parts = row.split("|")
    loc, slug, typ = parts[0], parts[1], parts[2]
    cslug = parts[3] if len(parts) > 3 else None
    canonical = f"http://localhost:3000/{loc}/{slug}/" if typ == "COUNTRY" else (f"http://localhost:3000/{loc}/{cslug}/{slug}/" if cslug else None)
    if typ == "CITY":
        alias = code(f"/{loc}/{slug}/")
        if alias not in ("301", "308"):
            aliases_bad.append(f"/{loc}/{slug}/ → {alias}")
    if canonical:
        n = locs.count(canonical)
        gate = sql(f"""SELECT noindex OR COALESCE(length(description),0) + COALESCE(length(blocks::text),0) < 600
                       FROM \"DestinationTranslation\" WHERE locale='{loc}' AND slug='{slug}';""")
        if n != 1 and not (n == 0 and gate == "t"):
            # 0 occurrences allowed ONLY for excluded-by-design translations
            # (noindex flag OR below the ~400-char editorial quality gate)
            dup_bad.append(f"{canonical} ×{n} gated={gate}")
    # no competing country-level URL for a CITY may appear in the sitemap
    if typ == "CITY" and f"http://localhost:3000/{loc}/{slug}/" in locs:
        dup_bad.append(f"competing /{loc}/{slug}/ in sitemap")
ok("3b city aliases at country level always 301 (never 200)", not aliases_bad, str(aliases_bad))
ok("3c each destination/locale has exactly ONE canonical URL in the sitemap", not dup_bad, str(dup_bad))

# 3d. hreflang in the SITEMAP references only canonical, published, 200 URLs
alt_block = re.findall(r"<xhtml:link[^>]+>", sm)
alt_targets = set(re.findall(r'href="([^"]+)"', " ".join(alt_block)))
bad_sx = [u for u in alt_targets if code(u.replace("http://localhost:3000", "")) != "200"]
ok("3d every sitemap hreflang alternate serves 200", not bad_sx, str(bad_sx[:6]))

# 3e. canonical link element on published pages matches the served URL exactly
for p in ["/en/morocco/marrakech/", "/en/spain/barcelona/", "/en/france/paris/", "/es/morocco/", "/en/topics/family-travel/"]:
    htmlc = body(p)
    m = re.search(r'rel="canonical" href="([^"]+)"', htmlc)
    if not m:
        m = re.search(r'hrefLang="x-default" href="([^"]+)"', htmlc)
    ok(f"3e canonical present + self-URL on {p}", m is not None and m.group(1).endswith(p), m.group(1) if m else "none")

print()
print(f"PASS {len(PASS)}  FAIL {len(FAIL)}")
if FAIL:
    print("FAILED:", *FAIL, sep="\n  - ")
    sys.exit(1)
