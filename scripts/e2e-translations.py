#!/usr/bin/env python3
"""Translation-independence acceptance: EN published + ES draft + AR missing →
only EN is public; hreflang lists only published versions."""
import re, json, subprocess, time

B = "http://localhost:3000"
JAR = "/tmp/jv-e2e.txt"
DB = "postgresql://postgres@127.0.0.1:5432/jouriva"

def curl(*a): return subprocess.run(["curl", "-s", "-L", "--max-redirs", "0", *a], capture_output=True, text=True).stdout
def sql(q): return subprocess.run(["psql", DB, "-tAc", q], capture_output=True, text=True).stdout.strip()
def post(path, fields):
    cmd = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code} %{redirect_url}", "-b", JAR, "-c", JAR, "-X", "POST", f"{B}{path}"]
    for k, v in fields.items(): cmd += ["-F", f"{k}={v}"]
    return subprocess.run(cmd, capture_output=True, text=True).stdout
def hidden(form):
    fields = {}
    for m in re.finditer(r'<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/>', form):
        fields[m.group(1)] = (m.group(2) or "").replace("&quot;", '"')
    return fields

ok = lambda label, cond: print(("✓" if cond else "✗ FAIL") + " " + label) or (__import__("sys").exit(1) if not cond else None)

TS = int(time.time())
slug_en, slug_es = f"i18n-lab-{TS}", f"laboratorio-{TS}"
aid = sql("SELECT id FROM \"Author\" WHERE slug='salma-benali'")
cid = sql("SELECT id FROM \"Category\" WHERE key='guides.general'")

# EN create + publish (compact chain)
html = curl("-b", JAR, f"{B}/admin/en/articles/new/")
cf = next(f for f in re.findall(r"<form.*?</form>", html, re.S) if 'name="title"' in f)
f = hidden(cf); f.update({"locale": "en", "title": "i18n lab", "slug": slug_en, "excerpt": "lab", "authorId": aid, "categoryId": cid})
post("/admin/en/articles/new/", f)
article_id = sql(f"SELECT \"articleId\" FROM \"ArticleTranslation\" WHERE slug='{slug_en}'")
editor = f"/admin/en/articles/{article_id}/en/"
html = curl("-b", JAR, f"{B}{editor}")
sf = next(x for x in re.findall(r"<form.*?</form>", html, re.S) if 'name="blocks"' in x)
f = hidden(sf); f.update({"title": "i18n lab", "slug": slug_en, "blocks": json.dumps([{"type": "paragraph", "text": "EN body."}]), "faq": "[]", "links": "[]", "verificationStatus": "", "seoTitle": "i18n lab", "metaDescription": "lab"})
post(editor, f)
def press(button):
    html = curl("-b", JAR, f"{B}{editor}")
    for x in re.findall(r"<form.*?</form>", html, re.S):
        if 'name="action"' in x and button in x:
            ff = hidden(x); ff.pop("scheduledAt", None)
            return post(editor, ff)
    return "MISSING"
for b in ["Submit for review", "Start fact-check", "Pass fact-check", "Approve (human approval)", "Publish"]:
    press(b)
ok("EN PUBLISHED", sql(f"SELECT \"workflowStatus\" FROM \"ArticleTranslation\" WHERE slug='{slug_en}'") == "PUBLISHED")

# ES translation (DRAFT)
html = curl("-b", JAR, f"{B}{editor}")
tf = next(x for x in re.findall(r"<form.*?</form>", html, re.S) if "Create version" in x)
f = hidden(tf); f.update({"locale": "es", "title": "Laboratorio i18n", "slug": slug_es})
post(editor, f)
print("alert:", (re.search(r'role="alert"[^>]*>([^<]*)', curl("-b", JAR, f"{B}{editor}")) or [None]) and re.search(r'role="alert"[^>]*>([^<]*)', curl("-b", JAR, f"{B}{editor}")).group(1) if 'role="alert"' in curl("-b", JAR, f"{B}{editor}") else None)
es_status = sql(f"SELECT \"workflowStatus\" FROM \"ArticleTranslation\" WHERE slug='{slug_es}'")
ok(f"ES DRAFT (got {es_status})", es_status == "DRAFT")

# public checks
en_code = curl("-o", "/dev/null", "-w", "%{http_code}", f"{B}/en/guides/{slug_en}/")
es_code = curl("-o", "/dev/null", "-w", "%{http_code}", f"{B}/es/guides/{slug_es}/")
ok(f"EN public 200 (got {en_code})", en_code == "200")
ok(f"ES draft NOT public 404 (got {es_code})", es_code == "404")
en_html = curl(f"{B}/en/guides/{slug_en}/")
ok("hreflang lists EN only for this group", slug_es not in en_html and f"/en/guides/{slug_en}/" in en_html)
sm = curl(f"{B}/sitemap.xml")
ok("sitemap has EN, not ES", slug_en in sm and slug_es not in sm)

# cleanup lab article
sql(f"DELETE FROM \"Article\" WHERE id='{article_id}'")
print("\nTRANSLATION-INDEPENDENCE PASSED")
