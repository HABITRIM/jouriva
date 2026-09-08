#!/usr/bin/env python3
"""Phase 2 acceptance driver — exercises the REAL server actions over HTTP.

Flow: login (admin) → create article → save full content → submit for review →
fact-check → SEO review → approve → publish → public checks (page, sitemap,
RSS, hreflang) → slug change on live article → 301 redirect check →
unpublish → removal checks. No-JS form posts (progressive enhancement path).
"""
import json
import re
import subprocess
import sys
import urllib.request
import time

SLUGX = f"rabat-weekend-{int(time.time())}"

B = "http://localhost:3000"
JAR = "/tmp/jv-e2e.txt"
DB = "postgresql://postgres@127.0.0.1:5432/jouriva"

def curl(*args):
    cmd = ["curl", "-s", "-L", "--max-redirs", "0", *args]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.stdout

def post_form(path, fields, jar=JAR):
    cmd = ["curl", "-s", "-i", "-b", jar, "-c", jar, "-X", "POST", f"{B}{path}"]
    for k, v in fields.items():
        cmd += ["-F", f"{k}={v}"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    out = r.stdout
    m = re.search(r"HTTP/[\d.]+ (\d+)", out)
    status = int(m.group(1)) if m else 0
    loc = re.search(r"(?im)^location: (.+)$", out)
    parts = re.split(r"\r?\n\r?\n", out, maxsplit=1)
    body = parts[1] if len(parts) > 1 else ""
    return status, (loc.group(1).strip() if loc else ""), body

def get_forms(path):
    html = curl("-b", JAR, f"{B}{path}")
    return html, re.findall(r"<form.*?</form>", html, re.S)

def form_fields(form, extra=None):
    fields = {}
    for m in re.finditer(r'<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/>', form):
        fields[m.group(1)] = (m.group(2) or "").replace("&quot;", '"').replace("&#x2F;", "/").replace("&amp;", "&")
    if extra:
        fields.update(extra)
    return fields

def sql(q):
    r = subprocess.run(["psql", DB, "-tAc", q], capture_output=True, text=True)
    return r.stdout.strip()

ok = lambda label, cond: print(("✓" if cond else "✗ FAIL") + " " + label) or (sys.exit(1) if not cond else None)

# 0) fresh admin session
subprocess.run(["rm", "-f", JAR])
html = curl("-c", JAR, f"{B}/admin/en/login/")
form = re.search(r"<form.*?</form>", html, re.S).group(0)
status, loc, _ = post_form("/admin/en/login/", form_fields(form, {"next": "", "email": "admin@jouriva.test", "password": "jouriva-dev-2026"}), jar=JAR)
ok(f"login → {status} {loc}", status in (303, 307) and "/admin/en" in loc)

# 1) create article
html, forms = get_forms("/admin/en/articles/new/")
author_id = sql("SELECT id FROM \"Author\" WHERE slug='salma-benali'")
cat_id = sql("SELECT id FROM \"Category\" WHERE key='guides.general'")
create_form = next(f for f in forms if 'name="title"' in f)
status, loc, body = post_form("/admin/en/articles/new/", form_fields(create_form, {
    "locale": "en", "title": "Rabat weekend: the calm capital guide",
    "slug": SLUGX, "excerpt": "A slow weekend in Rabat: kasbah, gardens, ceramics and the ocean tram — checked on the ground.",
    "authorId": author_id, "categoryId": cat_id,
}))
m = re.search(r"/articles/([a-z0-9]+)/en", loc)
ok(f"create → {status} {loc}", bool(m))
article_id = m.group(1)
translation_id = sql(f"SELECT id FROM \"ArticleTranslation\" WHERE \"articleId\"='{article_id}' AND locale='en'")

# 2) save real content (editor form)
blocks = [
    {"type": "paragraph", "text": "Rabat rewards a slow pace. This weekend plan pairs the **Kasbah of the Udayas** with the [Andalusian Gardens](/en/morocco/rabat/) and long lunches — every opening hour below was verified on the date shown."},
    {"type": "heading", "level": 2, "text": "How to structure the weekend"},
    {"type": "list", "ordered": False, "items": ["Saturday morning: kasbah and ocean viewpoint before the heat.", "Saturday afternoon: ceramics quarter and the archaeological garden.", "Sunday: beach tram to Sale and a sunset return via the Hassan Tower."]},
]
faq = [{"question": "Is Rabat walkable for a weekend visit?", "answer": "Yes — the core sights sit along the tram line and the riverfront, and most walks stay under 25 minutes."}]
editor_html, editor_forms = get_forms(f"/admin/en/articles/{article_id}/en/")
save_form = next(f for f in editor_forms if 'name="blocks"' in f)
save_fields = form_fields(save_form, {
    "title": "Rabat weekend: the calm capital guide", "slug": SLUGX,
    "h1": "Rabat weekend: 48 calm hours in Morocco's capital",
    "excerpt": "A slow weekend in Rabat: kasbah, gardens, ceramics and the ocean tram — checked on the ground.",
    "blocks": json.dumps(blocks), "faq": json.dumps(faq), "links": "[]",
    "seoTitle": "Rabat Weekend Guide: 48 Calm Hours (2026)", "metaDescription": "A verified weekend itinerary for Rabat: the Kasbah of the Udayas, Andalusian Gardens, the ceramics quarter and the ocean tram — paced for real visitors.",
    "verificationStatus": "VERIFIED", "lastVerifiedAt": "2026-09-04", "verificationNotes": "Opening hours checked with on-site sources.", "warningEnabled": "on",
    "categoryId": cat_id, "authorId": author_id,
})
status, loc, body = post_form(f"/admin/en/articles/{article_id}/en/", save_fields)
open("/tmp/driver-save.html", "w").write(body)
alert = re.search(r'role="alert"[^>]*>([^<]*)', body)
ok(f"save content → {status} (alert: {alert.group(1) if alert else None})",
   status == 200 and "Saved" in body and not alert)

# 3) workflow: submit_review → pass_fact_check → pass_seo_review → publish
def find_transition_form(html, button_text):
    for f in re.findall(r"<form.*?</form>", html, re.S):
        if button_text in f and 'name="action"' in f:
            return f
    return None

for label, notes, button in [
    ("submit for review", "Ready for editorial review", "Submit for review"),
    ("start fact-check", "Fact-checking against official sources", "Start fact-check"),
    ("fact-check pass", "All facts verified against official sources", "Pass fact-check"),
    ("SEO pass", "SEO checks pass", "Approve (human approval)"),
    ("publish", "Direct publish", "Publish"),
]:
    editor_html, _ = get_forms(f"/admin/en/articles/{article_id}/en/")
    tf = None
    for f in re.findall(r"<form.*?</form>", editor_html, re.S):
        if 'name="action"' in f and button in f:
            tf = f
            break
    if tf is None:
        print(f"- skip: '{button}' form not present at this state")
        continue
    fields = form_fields(tf)
    action = fields.get("action", "")
    fields.update({"notes": notes})
    fields.pop("scheduledAt", None)
    status, loc, body = post_form(f"/admin/en/articles/{article_id}/en/", fields)
    ok(f"{label} → Done message", status == 200 and "Done" in body)

db_status = sql(f"SELECT \"workflowStatus\" FROM \"ArticleTranslation\" WHERE id='{translation_id}'")
ok(f"DB status PUBLISHED (got {db_status})", db_status == "PUBLISHED")

# 4) public checks — immediately (actions revalidate)
page = curl(f"{B}/en/guides/{SLUGX}/")
ok("public page 200 with content", "Rabat weekend" in page and 'application/ld+json' in page)
ok("canonical", f'rel="canonical" href="http://localhost:3000/en/guides/{SLUGX}/"' in page)
ok("byline (real author)", "Salma Benali" in page)
ok("verification warning", "verify" in page.lower())
sm = curl(f"{B}/sitemap.xml")
ok("in sitemap", SLUGX in sm)
rss = curl(f"{B}/en/rss.xml")
ok("in RSS", SLUGX in rss)
home = curl(f"{B}/en/")
ok("on home listing", SLUGX in home)

# 5) slug change on LIVE article → 301
editor_html, editor_forms = get_forms(f"/admin/en/articles/{article_id}/en/")
save_form = next(f for f in editor_forms if 'name="blocks"' in f)
status, loc, body = post_form(f"/admin/en/articles/{article_id}/en/", form_fields(save_form, {
    "title": "Rabat weekend: the calm capital guide", "slug": f"{SLUGX}-guide",
    "h1": "Rabat weekend: 48 calm hours in Morocco's capital",
    "excerpt": "A slow weekend in Rabat: kasbah, gardens, ceramics and the ocean tram — checked on the ground.",
    "blocks": json.dumps(blocks), "faq": json.dumps(faq), "links": "[]",
    "seoTitle": "Rabat Weekend Guide: 48 Calm Hours (2026)", "metaDescription": "A verified weekend itinerary for Rabat.",
    "verificationStatus": "VERIFIED", "lastVerifiedAt": "2026-09-04", "verificationNotes": "", "warningEnabled": "on",
    "categoryId": cat_id, "authorId": author_id,
}))
ok(f"slug-change save reports 301 ({'301 redirect' in body})", "301 redirect" in body)
redir = ""
for _ in range(35):
    redir = curl("-o", "/dev/null", "-w", "%{http_code} %{redirect_url}", f"{B}/en/guides/{SLUGX}/")
    if redir.startswith("301") or redir.startswith("308"):
        break
    time.sleep(2)  # bounded retry: sub-second automation can race the ISR regen; middleware TTL is 60s
ok(f"old URL 301/308 → new ({redir})", (redir.startswith("301") or redir.startswith("308")) and f"{SLUGX}-guide" in redir)
page = curl(f"{B}/en/guides/{SLUGX}-guide/")
ok("new URL live", "Rabat weekend" in page)

# 6) unpublish → gone from everywhere
editor_html, _ = get_forms(f"/admin/en/articles/{article_id}/en/")
tf = None
for f in re.findall(r"<form.*?</form>", editor_html, re.S):
    if 'name="action"' in f and "Unpublish" in f:
        tf = f
        break
fields = form_fields(tf)
fields.update({"action": "unpublish", "notes": "Acceptance: unpublish"})
status, loc, body = post_form(f"/admin/en/articles/{article_id}/en/", fields)
ok(f"unpublish → Done ({status})", status == 200 and "Done" in body)
code = curl("-o", "/dev/null", "-w", "%{http_code}", f"{B}/en/guides/{SLUGX}-guide/")
ok(f"page 404 after unpublish (got {code})", code == "404")
sm = curl(f"{B}/sitemap.xml")
ok("out of sitemap", SLUGX not in sm)
rss = curl(f"{B}/en/rss.xml")
ok("out of RSS", SLUGX not in rss)
home = curl(f"{B}/en/")
ok("out of home listing", SLUGX not in home)

print("\nALL E2E CHECKS PASSED")
