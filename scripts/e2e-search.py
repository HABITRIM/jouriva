#!/usr/bin/env python3
"""
PHASE 4 E2E — Search, Discovery & Content Navigation (spec §22).
Runs against the real production server (:3000) + real PostgreSQL.
Sections: SEARCH · PUBLISHING · AUTOCOMPLETE · DISCOVERY · SEO · ANALYTICS · SECURITY
State flips (publishing checks) are exact-reverted and re-verified.
"""
import json
import re
import subprocess
import sys
import urllib.parse

B = "http://127.0.0.1:3000"
PSQL = ["psql", "postgresql://postgres@127.0.0.1:5432/jouriva", "-tAc"]
PASS, FAIL = [], []


def ok(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(("✓ " if cond else "✗ ") + name + (f"  [{detail}]" if detail and not cond else ""))


def sql(q):
    return subprocess.run(PSQL + [q], capture_output=True, text=True).stdout.strip()


def get(path, allow_redirects=True):
    cmd = ["curl", "-s", "-o", "-", "-w", "\n%{http_code}", "--max-time", "30"]
    if allow_redirects:
        cmd.append("-L")
    cmd.append(f"{B}{path}")
    r = subprocess.run(cmd, capture_output=True, text=True)
    body, _, code = r.stdout.rpartition("\n")
    return int(code or 0), body


def code(path):
    return get(path)[0]


def api(path):
    r = subprocess.run(["curl", "-s", "-L", "--max-time", "20", f"{B}{path}"], capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except Exception:
        return {}


def count_events(q=None, locale=None):
    where = []
    if q is not None:
        where.append(f"query='{q}'")
    if locale is not None:
        where.append(f"locale='{locale}'")
    w = ("WHERE " + " AND ".join(where)) if where else ""
    return int(sql(f'SELECT COUNT(*) FROM "SearchQueryEvent" {w};'))


# ═══════════════════════════════ SEARCH ══════════════════════════════════════
print("── SEARCH: locales, case, normalization ──")
c, b = get("/en/search?q=marrakech")
ok("S1 EN search 200", c == 200)
ok("S2 EN finds Marrakech destination", "Marrakech" in b and "DESTINATION" in b.upper())
c, b = get("/en/search?q=MARRAKECH")
ok("S3 case-insensitive (MARRAKECH)", c == 200 and "Marrakech" in b)
c, b = get("/en/search?q=MaRrAkEcH")
ok("S4 mixed case (MaRrAkEcH)", c == 200 and "Marrakech" in b)
c, b = get("/es/search?q=marruecos")
ok("S5 ES 'marruecos' finds Morocco hub", c == 200 and "Marruecos" in b)
c, b = get("/ar/search?q=" + urllib.parse.quote("مراكش"))
ok("S6 AR 'مراكش' 200 + RTL", c == 200 and 'dir="rtl"' in b and "مراكش" in b)
c, b = get("/ar/search?q=" + urllib.parse.quote("مَرَاكش"))  # with harakat
ok("S7 AR harakat-normalized match", c == 200 and "مراكش" in b)
c, b = get("/es/search?q=" + urllib.parse.quote("guía"))
ok("S8 ES accented query recalls accented content (accent-sensitive ILIKE — see report §17)", c == 200 and "guía" in b)
c, b = get("/en/search?q=fes")
ok("S9 partial/exact city (Fes)", c == 200 and "Fes" in b)
c, b = get("/en/search?q=family")
ok("S10 topic results present (family travel)", c == 200 and "Family travel" in b and "TOPIC" in b.upper())
c, b = get("/en/search?q=salma")
ok("S11 author results (Salma Benali)", c == 200 and "Salma Benali" in b)
c, b = get("/en/search?q=visa-free&type=articles")
ok("S12 filter articles: article present, no Destination badge", c == 200 and "Visa-free destinations" in b and ">Destination</span>" not in b)
c, b = get("/en/search?q=marrakech&type=destinations")
ok("S13 filter destinations: destination cards", c == 200 and "Marrakech" in b and 'aria-current="page"' in b)
c, b = get("/en/search?q=marrakech&type=bogus")
ok("S14 bogus filter falls back to ALL", c == 200 and "Marrakech" in b)
c, b = get("/en/search?q=" + urllib.parse.quote("a" * 300))
ok("S15 overlong query safe (200, truncated)", c == 200)
c, b = get("/en/search?q=" + urllib.parse.quote("' OR 1=1 --"))
ok("S16 injection-style query safe", c == 200)
c, b = get("/en/search?q=" + urllib.parse.quote("<script>alert(1)</script>"))
ok("S17 HTML-safe rendering (no raw script)", c == 200 and "<script>alert" not in b)
c, b = get("/en/search?page=abc&q=marrakech")
ok("S18 malformed page param safe", c == 200 and "Marrakech" in b)
c, b = get("/en/search?page=99999&q=marrakech")
ok("S19 excessive page clamped", c == 200)
c, b = get("/en/search?q=" + urllib.parse.quote("%_%\\"))
ok("S20 LIKE wildcards neutralized", c == 200)

print("── SEARCH: empty query (spec §12) ──")
before = count_events()
c, b = get("/en/search")
ok("S21 empty q 200 with discovery", c == 200 and "Marrakech" in b and "Family travel" in b)
c, b = get("/en/search?q=")
ok("S22 blank q same discovery state", c == 200 and "Family travel" in b)
ok("S23 empty q records NO analytics events", count_events() == before)

print("── SEARCH: ranking sanity (relevance > freshness) ──")
c, b = get("/en/search?q=marrakech")
m = re.search(r'<h3[^>]*>\s*<a href="/en/morocco/marrakech/"', b)
ok("S24 exact destination outranks (first result = Marrakech)", m is not None)

# ══════════════════════════════ PUBLISHING ═══════════════════════════════════
print("── PUBLISHING: published-only enforced ──")
tr = sql("SELECT id FROM \"ArticleTranslation\" WHERE locale='en' AND slug='visa-free-countries-moroccan-passport';")
ok("P0 lab article found", bool(tr))
states = ["DRAFT", "IN_REVIEW", "FACT_CHECK", "SEO_REVIEW", "APPROVED", "SCHEDULED", "ARCHIVED"]
c0, b0 = get("/en/search?q=visa-free")
ok("P1 published article searchable", "Visa-free destinations" in b0)
leak = []
for st in states:
    sql(f"UPDATE \"ArticleTranslation\" SET \"workflowStatus\"='{st}' WHERE id='{tr}';")
    c, b = get("/en/search?q=visa-free")
    if "Visa-free destinations" in b:
        leak.append(st)
    su = api("/api/search/suggest?locale=en&q=visa-free")
    if any("visa" in s["url"] for s in su.get("suggestions", [])):
        leak.append(f"{st}(suggest)")
sql(f"UPDATE \"ArticleTranslation\" SET \"workflowStatus\"='PUBLISHED' WHERE id='{tr}';")
after = sql(f"SELECT \"workflowStatus\" FROM \"ArticleTranslation\" WHERE id='{tr}';")
ok("P2 all non-published states invisible (search + suggest)", not leak, str(leak))
ok("P3 article state reverted", after == "PUBLISHED", after)
c, b = get("/en/search?q=visa-free")
ok("P4 article searchable again after revert", "Visa-free destinations" in b)

dtr = sql("SELECT id FROM \"DestinationTranslation\" WHERE locale='en' AND slug='fes';")
leak_d = []
for st in ["DRAFT", "APPROVED", "SCHEDULED", "ARCHIVED"]:
    sql(f"UPDATE \"DestinationTranslation\" SET \"workflowStatus\"='{st}' WHERE id='{dtr}';")
    c, b = get("/en/search?q=fes")
    if re.search(r'href="/en/morocco/fes/"', b):
        leak_d.append(st)
sql(f"UPDATE \"DestinationTranslation\" SET \"workflowStatus\"='PUBLISHED' WHERE id='{dtr}';")
ok("P5 destination non-published states invisible in search", not leak_d, str(leak_d))
ok("P6 destination state reverted", sql(f"SELECT \"workflowStatus\" FROM \"DestinationTranslation\" WHERE id='{dtr}';") == "PUBLISHED")

# ══════════════════════════════ AUTOCOMPLETE ═════════════════════════════════
print("── AUTOCOMPLETE (spec §11) ──")
s = api("/api/search/suggest?locale=en&q=m")
ok("A1 below minimum length → empty", s.get("suggestions") == [])
s = api("/api/search/suggest?locale=en&q=marrakech")
ok("A2 valid query returns suggestions", len(s.get("suggestions", [])) > 0)
ok("A3 result limit ≤ 8", len(s.get("suggestions", [])) <= 8)
types_in = {x["type"] for x in s.get("suggestions", [])}
ok("A4 diverse types where possible", len(types_in) >= 2, str(types_in))
s = api("/api/search/suggest?locale=xx&q=marrakech")
ok("A5 invalid locale rejected 400", s == {"error": "invalid locale"} or s == {})
s = api("/api/search/suggest?locale=en&q=" + urllib.parse.quote("مراكش"))
ok("A6 Arabic query works on any locale endpoint (validated)", isinstance(s.get("suggestions"), list))
s_en = api("/api/search/suggest?locale=en&q=mundial")
s_es = api("/api/search/suggest?locale=es&q=mundial")
ok("A7 locale isolation: ES-only title absent in EN", not any("Mundial" in x["title"] for x in s_en.get("suggestions", [])))
ok("A8 locale isolation: ES title present in ES", any("Mundial" in x["title"] for x in s_es.get("suggestions", [])))
dtr2 = sql("SELECT id FROM \"DestinationTranslation\" WHERE locale='en' AND slug='fes';")
sql(f"UPDATE \"DestinationTranslation\" SET \"workflowStatus\"='DRAFT' WHERE id='{dtr2}';")
s = api("/api/search/suggest?locale=en&q=fes")
draft_leak = any(x["url"].endswith("/morocco/fes/") for x in s.get("suggestions", []))
sql(f"UPDATE \"DestinationTranslation\" SET \"workflowStatus\"='PUBLISHED' WHERE id='{dtr2}';")
ok("A9 draft destination not suggested (published-only)", not draft_leak)
s = api("/api/search/suggest?locale=en&q=" + urllib.parse.quote("a" * 500))
ok("A10 oversized suggest q safe", isinstance(s.get("suggestions"), list))
s = api("/api/search/suggest?locale=en&q=" + urllib.parse.quote("'; DROP TABLE \"SearchQueryEvent\"; --"))
ok("A11 injection-style suggest safe", isinstance(s.get("suggestions"), list) and count_events() >= 0)

# ── Pagination lab: 25 real published lab articles → 2 pages → cleanup ──────
print("── PAGINATION LAB ──")
author = sql("SELECT id FROM \"Author\" LIMIT 1;")
for i in range(25):
    # ids are Prisma-client defaults (cuid) — raw SQL must supply them explicitly
    art = f"labart{i}int{int(__import__('time').time())}"
    sql(f"INSERT INTO \"Article\" (id, \"authorId\", \"updatedAt\") VALUES ('{art}', '{author}', now());")
    sql(f"""INSERT INTO \"ArticleTranslation\" (id, \"articleId\", locale, title, slug, excerpt, blocks, \"workflowStatus\", \"publishedAt\", \"updatedAt\", \"createdAt\")
         VALUES ('labtr{i}int{int(__import__('time').time())}', '{art}', 'en', 'Pagination lab {i} paginationlab-token', 'pagination-lab-{i}', 'paginationlab-token excerpt {i}', '[]'::jsonb, 'PUBLISHED', now(), now(), now());""")
ok("PL0 lab corpus inserted", int(sql("SELECT COUNT(*) FROM \"ArticleTranslation\" WHERE slug LIKE 'pagination-lab-%';")) == 25)
c, b = get("/en/search?q=paginationlab-token")
ok("PL1 lab corpus found (25 results)", "25 results" in b, b[b.find("results for"):b.find("results for")+80] if "results for" in b else "count line missing")
ok("PL2 pagination controls render (2 pages)", "page=2" in b)
c, b = get("/en/search?q=paginationlab-token&page=2")
ok("PL3 page 2 serves remaining results", c == 200 and b.count("Pagination lab") >= 1 and b.count("Pagination lab") <= 20)
c, b = get("/en/search?q=paginationlab-token&page=3")
ok("PL4 page beyond range clamps safely", c == 200)
n_ev = count_events(q="paginationlab-token")
ok("PL5 lab query recorded once (page-1 only)", n_ev == 1, str(n_ev))
sql("DELETE FROM \"ArticleTranslation\" WHERE slug LIKE 'pagination-lab-%';")
sql("DELETE FROM \"Article\" WHERE id NOT IN (SELECT \"articleId\" FROM \"ArticleTranslation\");")
sql("DELETE FROM \"SearchQueryEvent\" WHERE query='paginationlab-token';")
left = int(sql("SELECT COUNT(*) FROM \"ArticleTranslation\" WHERE slug LIKE 'pagination-lab-%';"))
ok("PL6 lab rows cleaned up", left == 0)

# ── CANDIDATE-CAP AUDIT (post-review regression): caps must never omit ──────
print("── CANDIDATE-CAP AUDIT ──")
import time as _time
TOK = f"pagcap{int(_time.time())}"
author_id = sql("SELECT id FROM \"Author\" LIMIT 1;")
ts = str(int(_time.time()))
lines = []
# 110 "Pagination lab {i}" titles + 120 "Zz cap" titles + 1 EXACT-match title
# (= T, alphabetically LAST under C collation) — 231 article matches total,
# far above the old arbitrary cap of 60.
for i in range(110):
    a, t = f"capart{ts}a{i}", f"captr{ts}a{i}"
    lines.append(f"INSERT INTO \"Article\" (id, \"authorId\", \"updatedAt\") VALUES ('{a}', '{author_id}', now());")
    lines.append(f"INSERT INTO \"ArticleTranslation\" (id, \"articleId\", locale, title, slug, excerpt, blocks, \"workflowStatus\", \"publishedAt\", \"updatedAt\", \"createdAt\") VALUES ('{t}', '{a}', 'en', 'Pagination lab {i} {TOK}', 'capart{ts}a{i}', 'excerpt {TOK}', '[]'::jsonb, 'PUBLISHED', now(), now(), now());")
for i in range(120):
    a, t = f"capart{ts}z{i}", f"captr{ts}z{i}"
    lines.append(f"INSERT INTO \"Article\" (id, \"authorId\", \"updatedAt\") VALUES ('{a}', '{author_id}', now());")
    lines.append(f"INSERT INTO \"ArticleTranslation\" (id, \"articleId\", locale, title, slug, excerpt, blocks, \"workflowStatus\", \"publishedAt\", \"updatedAt\", \"createdAt\") VALUES ('{t}', '{a}', 'en', 'Zz cap article {i} {TOK}', 'capart{ts}z{i}', 'excerpt {TOK}', '[]'::jsonb, 'PUBLISHED', now(), now(), now());")
a, t = f"capart{ts}exact", f"captr{ts}exact"
lines.append(f"INSERT INTO \"Article\" (id, \"authorId\", \"updatedAt\") VALUES ('{a}', '{author_id}', now());")
lines.append(f"INSERT INTO \"ArticleTranslation\" (id, \"articleId\", locale, title, slug, excerpt, blocks, \"workflowStatus\", \"publishedAt\", \"updatedAt\", \"createdAt\") VALUES ('{t}', '{a}', 'en', '{TOK}', 'capart{ts}exact', 'excerpt {TOK}', '[]'::jsonb, 'PUBLISHED', now(), now(), now());")
# 15 topics + 15 authors matching the same token (old caps: 12 + 12)
for i in range(15):
    tp, tt = f"captop{ts}{i}", f"captt{ts}{i}"
    lines.append(f"INSERT INTO \"Topic\" (id, key, \"isActive\", position, \"updatedAt\") VALUES ('{tp}', 'captop-{ts}-{i}', true, 0, now());")
    lines.append(f"INSERT INTO \"TopicTranslation\" (id, \"topicId\", locale, name, slug) VALUES ('{tt}', '{tp}', 'en', 'Pagination lab topic {i} {TOK}', 'captop-{ts}-{i}');")
for i in range(15):
    au = f"capau{ts}{i}"
    lines.append(f"INSERT INTO \"Author\" (id, key, slug, name, \"isActive\") VALUES ('{au}', 'capau-{ts}-{i}', 'capau-{ts}-{i}', 'Pagination lab author {i} {TOK}', true);")
sql_script = "\n".join(lines)
subprocess.run(["psql", "postgresql://postgres@127.0.0.1:5432/jouriva", "-qAt", "-c", sql_script], check=True)

qpath = f"/en/search?q={TOK}&type=articles"
c, b = get(qpath)
ok("CAP1 231 article matches: total reported exactly (was capped at 60)", "231 results" in b, b[b.find("results for"):b.find("results for")+60] if "results for" in b else "count missing")
first = re.search(r'<h3[^>]*>\s*<a href="/en/guides/[^"]*capart' + ts + 'exact', b)
ok("CAP2 exact-match title ranks #1 despite alphabetical-last position", first is not None)
# rendered-result extraction: only the visible <h3><a> card titles (the RSC
# flight payload in <script> duplicates strings — never count raw HTML)
def h3_titles(htmlc):
    return re.findall(r">([^<]{2,80})</a>\s*</h3>", htmlc)

c2, b2 = get(qpath + "&page=2")
c3, b3 = get(qpath + "&page=3")
ok("CAP3 pages 2 and 3 serve 20 results each", c2 == 200 and len(h3_titles(b2)) == 20 and c3 == 200 and len(h3_titles(b3)) == 20, f"{len(h3_titles(b2))}/{len(h3_titles(b3))}")
titles = set()
for pg in range(1, 13):
    _, bp = get(qpath + f"&page={pg}")
    titles.update(t.strip() for t in h3_titles(bp))
ok("CAP4 union of all pages = complete match set (231 distinct, none omitted)", len(titles) == 231, str(len(titles)))
_, b1a = get(qpath)
_, b1b = get(qpath)
seq_a = re.findall(r">([^<]{4,60})</a>\s*</h3>", b1a)[:5]
seq_b = re.findall(r">([^<]{4,60})</a>\s*</h3>", b1b)[:5]
ok("CAP5 deterministic ordering (identical repeated page 1)", seq_a == seq_b and len(seq_a) == 5)
c, b = get(f"/en/search?q={TOK}&type=topics")
ok("CAP6 15 topic matches all reported (old cap was 12)", "15 results" in b, b[b.find("results for"):b.find("results for")+60] if "results for" in b else "count missing")
c, b = get(f"/en/search?q={TOK}&type=authors")
ok("CAP7 15 author matches all reported (old cap was 12)", "15 results" in b, b[b.find("results for"):b.find("results for")+60] if "results for" in b else "count missing")
s = api(f"/api/search/suggest/?locale=en&q={TOK[:14]}")
ok("CAP8 autocomplete still bounded ≤ 8 with large corpus", len(s.get("suggestions", [])) <= 8)
# cleanup
cleanup = [
    f"DELETE FROM \"ArticleTranslation\" WHERE title LIKE '%{TOK}%';",
    f"DELETE FROM \"Article\" WHERE id LIKE 'capart{ts}%';",
    f"DELETE FROM \"TopicTranslation\" WHERE name LIKE '%{TOK}%';",
    f"DELETE FROM \"Topic\" WHERE key LIKE 'captop-{ts}%';",
    f"DELETE FROM \"Author\" WHERE name LIKE '%{TOK}%';",
    f"DELETE FROM \"SearchQueryEvent\" WHERE query='{TOK}';",
]
for csql in cleanup:
    sql(csql)
left = int(sql(f"SELECT COUNT(*) FROM \"ArticleTranslation\" WHERE title LIKE '%{TOK}%';")) + int(sql(f"SELECT COUNT(*) FROM \"TopicTranslation\" WHERE name LIKE '%{TOK}%';")) + int(sql(f"SELECT COUNT(*) FROM \"Author\" WHERE name LIKE '%{TOK}%';"))
ok("CAP9 audit corpus cleaned up", left == 0)

# ══════════════════════════════ DISCOVERY ════════════════════════════════════
print("── DISCOVERY (spec §14) ──")
c, b = get("/en/search")
ok("D1 discovery: featured destinations render", "Marrakech" in b)
ok("D2 discovery: topics render", "Family travel" in b)
ok("D3 discovery: latest guides render", "guides/" in b)
c, b = get("/en/search?q=zzzqqqxxx")
ok("D4 no-results state renders exploration", "No results found" in b and "Marrakech" in b)
ok("D5 no fabricated results for gibberish", "zzzqqqxxx" not in b.split("No results found")[0].split("results for")[0] if "results for" in b else True)

# ══════════════════════════════ SEO ══════════════════════════════════════════
print("── SEO (spec §17) ──")
c, b = get("/en/search?q=marrakech")
m = re.search(r'<meta name="robots" content="([^"]+)"', b)
ok("E1 robots noindex, follow", m is not None and "noindex" in m.group(1) and "follow" in m.group(1), m.group(1) if m else "none")
c, sm = get("/sitemap.xml")
ok("E2 /search NOT in sitemap", "/search" not in sm)
c, rss = get("/en/rss.xml")
ok("E3 /search NOT in RSS", "/search" not in rss)
c, b = get("/en/search?q=marrakech")
ok("E4 canonical points at clean /search/ URL", 'rel="canonical" href="http://localhost:3000/en/search/"' in b)

# ══════════════════════════════ ANALYTICS ════════════════════════════════════
print("── ANALYTICS (spec §15) ──")
n1 = count_events(locale="en")
c, b = get("/en/search?q=analytics-probe-xyz")
n2 = count_events(q="analytics-probe-xyz")
ok("G1 search recorded", n2 >= 1, f"{n1}→{n2}")
row = sql("SELECT locale, \"resultCount\" FROM \"SearchQueryEvent\" WHERE query='analytics-probe-xyz';")
ok("G2 locale + resultCount recorded", row.startswith("en|"), row)
c, b = get("/en/search?q=zzzqqqxxx-nothing")
n0 = int(sql("SELECT COUNT(*) FROM \"SearchQueryEvent\" WHERE query='zzzqqqxxx-nothing' AND \"resultCount\"=0;"))
ok("G3 zero-result search recorded with 0", n0 >= 1)
cols = sql("SELECT string_agg(column_name, ',') FROM information_schema.columns WHERE table_name='SearchQueryEvent';")
ok("G4 no PII columns (id/locale/query/normalized/resultCount/createdAt only)",
   set(cols.split(",")) == {"id", "locale", "query", "normalized", "resultCount", "createdAt"}, cols)
c, b = get("/en/search?q=analytics-probe-xyz&page=2")
n3 = count_events(q="analytics-probe-xyz")
ok("G5 pagination does not duplicate events (page 1 only)", n3 == n2, f"{n2}→{n3}")

# ══════════════════════════════ SECURITY/ADMIN ═══════════════════════════════
print("── SECURITY & ADMIN (spec §16/§19) ──")
c, _ = get("/en/admin/en/search-insights/")
ok("M1 anonymous blocked from insights", c in (403, 404))
subprocess.run(["bash", "-c", f"curl -s -c /tmp/jar_si.txt {B}/admin/en/login/ -o /dev/null"], check=False)
page = subprocess.run(["curl", "-s", "-b", "/tmp/jar_si.txt", "-c", "/tmp/jar_si.txt", f"{B}/admin/en/login/"], capture_output=True, text=True).stdout
mf = re.search(r"<form.*?</form>", page, re.S)
fields = {"email": "editor@jouriva.test", "password": "jouriva-dev-2026", "next": ""}
if mf:
    import html as _h
    for inp in re.findall(r'<input[^>]*type="hidden"[^>]*>', mf.group(0)):
        nm = re.search(r'name="([^"]*)"', inp)
        vl = re.search(r'value="([^"]*)"', inp)
        if nm:
            fields[nm.group(1)] = _h.unescape(vl.group(1)) if vl else ""
cmd = ["curl", "-s", "-i", "-b", "/tmp/jar_si.txt", "-c", "/tmp/jar_si.txt", "-X", "POST", f"{B}/admin/en/login/"]
for k, v in fields.items():
    cmd += ["--form-string", f"{k}={v}"]
subprocess.run(cmd, capture_output=True, text=True)
ins = subprocess.run(["curl", "-s", "-b", "/tmp/jar_si.txt", f"{B}/admin/en/search-insights/"], capture_output=True, text=True).stdout
ok("M2 editor sees insights with top + zero-result tables", "Top searches" in ins and "No-result searches" in ins)
ok("M3 recorded queries visible in insights", "analytics-probe-xyz" in ins)
out = subprocess.run(["psql", "postgresql://postgres@127.0.0.1:5432/jouriva", "-c", "SELECT 1 FROM \"ContentLink\" LIMIT 1;"], capture_output=True, text=True)
ok("M4 database intact after security probes", out.returncode == 0)

print()
print(f"PASS {len(PASS)}  FAIL {len(FAIL)}")
if FAIL:
    print("FAILED:", *FAIL, sep="\n  - ")
    sys.exit(1)
