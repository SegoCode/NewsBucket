import time

BASE = "http://127.0.0.1:8765/test/index.html"

cdp("Network.setCacheDisabled", cacheDisabled=True)
goto_url(BASE)
time.sleep(0.2)
scenes = js("return [...document.querySelectorAll('#harness a')].map(a => new URL(a.href).searchParams.get('s'))")

def checks():
    return js("return document.getElementById('checks')?.textContent || ''") or ""

fails = []
for s in scenes:
    goto_url(f"{BASE}?s={s}")
    text = ""
    for _ in range(140):
        here = js("return new URLSearchParams(location.search).get('s')")
        text = checks()
        if here == s and text.strip() and "FAIL unknown" not in text:
            break
        time.sleep(0.05)
    if s == "geo-wins":
        time.sleep(0.25)
    text = checks()
    bad = [ln for ln in text.splitlines() if ln.startswith("FAIL")]
    ok = not bad and bool(text.strip())
    print(f"{'ok' if ok else 'FAIL':4} {s}")
    if not ok:
        fails.append((s, text))

print(f"\n{len(scenes) - len(fails)}/{len(scenes)} pass")
for s, text in fails:
    print(f"\n[{s}]\n{text}")
