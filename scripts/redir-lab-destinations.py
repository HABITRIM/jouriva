#!/usr/bin/env python3
"""
Destination slug-change redirect lab (Phase 3, spec §23).
Changes the live EN slug of the Fes destination through the REAL admin UI
(server action), verifies the automatic per-locale 301, then restores.
Cleans up its own Redirect rows.
"""
import json
import re
import subprocess
import sys

B = "http://127.0.0.1:3000"
JAR = "/tmp/jar_dest_lab.txt"
PASS, FAIL = [], []


def ok(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(("✓ " if cond else "✗ ") + name + (f"  [{detail}]" if detail and not cond else ""))


def curl(*args):
    return subprocess.run(["curl", "-s", "-b", JAR, "-c", JAR, *args], capture_output=True, text=True).stdout


def post_form(path, fields):
    url = path if path.startswith("http") else f"{B}{path}"
    cmd = ["curl", "-s", "-i", "-b", JAR, "-c", JAR, "-X", "POST", url]
    for k, v in fields.items():
        cmd += ["--form-string", f"{k}={v}"]  # literal: curl -F would parse {..} as file globs
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.stdout


def sql(q):
    return subprocess.run(["psql", "postgresql://postgres@127.0.0.1:5432/jouriva", "-tAc", q],
                          capture_output=True, text=True).stdout.strip()


def status(path):
    return subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "20", f"{B}{path}"],
                          capture_output=True, text=True).stdout.strip()


def loc_of(path):
    out = subprocess.run(["curl", "-s", "-i", "--max-redirs", "0", f"{B}{path}"],
                         capture_output=True, text=True).stdout
    m = re.search(r"(?im)^location: (.+)$", out)
    code = re.search(r"HTTP/[\d.]+ (\d+)", out)
    return (code.group(1) if code else "?"), (m.group(1).strip() if m else "")


# editor session (server-action login: hidden action fields are required)
def html_unescape(s):
    import html as _h
    return _h.unescape(s)


def login(email, password):
    page = curl(f"{B}/admin/en/login/")
    m = re.search(r"<form.*?</form>", page, re.S)
    fields = {"email": email, "password": password, "next": ""}
    if m:
        for inp in re.findall(r"<input[^>]*type=\"hidden\"[^>]*>", m.group(0)):
            n = re.search(r'name="([^"]*)"', inp)
            v = re.search(r'value="([^"]*)"', inp)
            if n:
                fields[n.group(1)] = html_unescape(v.group(1)) if v else ""
    post_form("/admin/en/login/", fields)  # post_form already prepends the base URL


login("editor@jouriva.test", "jouriva-dev-2026")

dest_id = sql("SELECT d.id FROM \"Destination\" d JOIN \"DestinationTranslation\" t ON t.\"destinationId\"=d.id WHERE t.locale='en' AND t.slug='fes';")
tr_id = sql("SELECT id FROM \"DestinationTranslation\" WHERE locale='en' AND slug='fes';")
ok("lab target found (Fes EN)", bool(dest_id) and bool(tr_id), f"{dest_id} {tr_id}")

page = curl(f"{B}/admin/en/destinations/{dest_id}/en/")
forms = re.findall(r"<form.*?</form>", page, re.S)
candidates = [f for f in forms if 'name="slug"' in f and 'name="destinationId"' in f]
save_form = max(candidates, key=len) if candidates else None  # the big editorial save form, not the create-version form
ok("save form found", save_form is not None, f"{len(candidates)} candidates")
if not save_form:
    sys.exit(1)


def fields_of(form, extra):
    fields = {}
    for inp in re.findall(r"<input[^>]*>", form):
        n = re.search(r'name="([^"]*)"', inp)
        if not n:
            continue
        t = re.search(r'type="([^"]*)"', inp)
        v = re.search(r'value="([^"]*)"', inp)
        if t and t.group(1) in ("checkbox", "radio"):
            continue
        fields[n.group(1)] = html_unescape(v.group(1)) if v else ""
    for tam in re.finditer(r"<textarea([^>]*)>(.*?)</textarea>", form, re.S):
        attrs, content = tam.group(1), tam.group(2)
        n = re.search(r'name="([^"]*)"', attrs)
        if n:
            fields[n.group(1)] = html_unescape(content)
    fields.update(extra)
    return fields


base_fields = fields_of(save_form, {})
cur_blocks = base_fields.get("blocks", "[]")
cur_faq = base_fields.get("faq", "[]")
cur_name = base_fields.get("name", "Fes")

# 1) live slug change → automatic 301 (spec §23)
r1 = post_form(f"{B}/admin/en/destinations/{dest_id}/en/", fields_of(save_form, {
    "name": cur_name, "slug": "fes-lab", "blocks": cur_blocks, "faq": cur_faq,
    "verificationStatus": "NEEDS_REVIEW", "warningEnabled": "on",
    "galleryAssetIds": "", "relatedDestinationIds": "", "topicIds": "",
}))
import re as _re
msg = _re.findall(r"(Saved[^\"]{0,80}|error[^\"]{0,120})", r1)
print("DEBUG action response snippets:", msg[:4], "| len:", len(r1))
new_slug = sql("SELECT slug FROM \"DestinationTranslation\" WHERE id='" + tr_id + "';")
ok("slug-change save persisted (fes → fes-lab)", new_slug == "fes-lab", new_slug)

red = sql("SELECT \"destinationPath\", \"statusCode\", active FROM \"Redirect\" WHERE locale='en' AND \"sourcePath\" IN ('/morocco/fes','/morocco/fes/') ORDER BY \"createdAt\" DESC LIMIT 1;")
ok("redirect row created (fes → fes-lab)", "fes-lab" in red, red)

c, loc = loc_of("/en/morocco/fes/")
ok("old URL serves 301", c in ("301", "308"), f"{c} {loc}")
ok("301 target is new slug", "/en/morocco/fes-lab/" in loc, loc)
ok("new URL serves 200", status("/en/morocco/fes-lab/") == "200")

# 2) restore original slug
# re-scrape: each action POST consumes the page's action key, so POST 2 needs
# a fresh form (progressive-enhancement semantics).
page2 = curl(f"{B}/admin/en/destinations/{dest_id}/en/")
forms2 = re.findall(r"<form.*?</form>", page2, re.S)
cands2 = [f for f in forms2 if 'name="slug"' in f and 'name="destinationId"' in f]
save_form2 = max(cands2, key=len) if cands2 else save_form
post_form(f"{B}/admin/en/destinations/{dest_id}/en/", fields_of(save_form2, {
    "name": cur_name, "slug": "fes", "blocks": cur_blocks, "faq": cur_faq,
    "verificationStatus": "NEEDS_REVIEW", "warningEnabled": "on",
    "galleryAssetIds": "", "relatedDestinationIds": "", "topicIds": "",
}))
restored = sql("SELECT slug FROM \"DestinationTranslation\" WHERE id='" + tr_id + "';")
ok("slug restored (fes-lab → fes)", restored == "fes", restored)

# 3) cleanup lab redirects + verify live URL direct 200
sql("DELETE FROM \"Redirect\" WHERE \"sourcePath\" IN ('/morocco/fes','/morocco/fes/','/morocco/fes-lab','/morocco/fes-lab/') OR \"destinationPath\" IN ('/morocco/fes','/morocco/fes/','/morocco/fes-lab','/morocco/fes-lab/');")
# middleware keeps a 60s TTL cache of redirects — wait it out before the final checks
import time
time.sleep(61)
ok("live URL back to direct 200", status("/en/morocco/fes/") == "200")
ok("lab slug now 404s", status("/en/morocco/fes-lab/") == "404")

print()
print(f"PASS {len(PASS)}  FAIL {len(FAIL)}")
if FAIL:
    print("FAILED:", *FAIL, sep="\n  - ")
    sys.exit(1)
