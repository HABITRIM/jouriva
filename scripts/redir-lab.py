#!/usr/bin/env python3
"""Redirect propagation lab: publish → visit old URL → change slug →
observe how fast the 301 becomes effective (middleware TTL + page fallback)."""
import re, json, subprocess, time

B = "http://localhost:3000"
JAR = "/tmp/jv-e2e.txt"
DB = "postgresql://postgres@127.0.0.1:5432/jouriva"

def curl(*a): return subprocess.run(["curl", "-s", "-L", "--max-redirs", "0", *a], capture_output=True, text=True).stdout
def sql(q): return subprocess.run(["psql", DB, "-tAc", q], capture_output=True, text=True).stdout.strip()

TS = int(time.time())
slug1, slug2 = f"redir-lab-{TS}", f"redir-lab-{TS}-v2"

def post(path, fields):
    cmd = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code} %{redirect_url}", "-b", JAR, "-c", JAR, "-X", "POST", f"{B}{path}"]
    for k, v in fields.items():
        cmd += ["-F", f"{k}={v}"]
    return subprocess.run(cmd, capture_output=True, text=True).stdout

def hidden(form):
    fields = {}
    for m in re.finditer(r'<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/>', form):
        fields[m.group(1)] = (m.group(2) or "").replace("&quot;", '"')
    return fields

aid = sql("SELECT id FROM \"Author\" WHERE slug='salma-benali'")
cid = sql("SELECT id FROM \"Category\" WHERE key='guides.general'")

# create
html = curl("-b", JAR, f"{B}/admin/en/articles/new/")
cf = next(f for f in re.findall(r"<form.*?</form>", html, re.S) if 'name="title"' in f)
f = hidden(cf); f.update({"locale": "en", "title": "Redirect lab", "slug": slug1, "excerpt": "lab", "authorId": aid, "categoryId": cid})
print("create:", post("/admin/en/articles/new/", f))

article_id = sql(f"SELECT \"articleId\" FROM \"ArticleTranslation\" WHERE slug='{slug1}'")
editor = f"/admin/en/articles/{article_id}/en/"

# save
html = curl("-b", JAR, f"{B}{editor}")
sf = next(x for x in re.findall(r"<form.*?</form>", html, re.S) if 'name="blocks"' in x)
f = hidden(sf); f.update({"title": "Redirect lab", "slug": slug1, "blocks": json.dumps([{"type": "paragraph", "text": "lab"}]), "faq": "[]", "links": "[]", "verificationStatus": "", "seoTitle": "RL", "metaDescription": "RL"})
print("save:", post(editor, f))

# publish chain
def press(button, notes):
    html = curl("-b", JAR, f"{B}{editor}")
    for x in re.findall(r"<form.*?</form>", html, re.S):
        if 'name="action"' in x and button in x:
            ff = hidden(x); ff["notes"] = notes; ff.pop("scheduledAt", None)
            return post(editor, ff)
    return "FORM-MISSING"

for b in ["Submit for review", "Start fact-check", "Pass fact-check", "Approve (human approval)", "Publish"]:
    print(b, "→", press(b, "lab"))

print("pre-change old URL:", curl("-o", "/dev/null", "-w", "%{http_code}", f"{B}/en/guides/{slug1}/"))

# slug change on live article
html = curl("-b", JAR, f"{B}{editor}")
sf = next(x for x in re.findall(r"<form.*?</form>", html, re.S) if 'name="blocks"' in x)
f = hidden(sf); f.update({"title": "Redirect lab", "slug": slug2, "blocks": json.dumps([{"type": "paragraph", "text": "lab"}]), "faq": "[]", "links": "[]", "verificationStatus": "", "seoTitle": "RL", "metaDescription": "RL"})
print("slug-change save:", post(editor, f))

for i in range(8):
    code = curl("-o", "/dev/null", "-w", "%{http_code} %{redirect_url}", f"{B}/en/guides/{slug1}/")
    print(f"t+{i*2}s old URL:", code)
    if "301" in code or "308" in code:
        break
    time.sleep(2)
print("new URL:", curl("-o", "/dev/null", "-w", "%{http_code}", f"{B}/en/guides/{slug2}/"))
