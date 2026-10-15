import subprocess
import time
import json
import urllib.request
import os
import base64
import sys

from websockets.sync.client import connect

CHROME_BIN = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\EIS\.gemini\antigravity-ide\brain\e4f796cd-f28c-4028-9afc-53bc02f2d485"
PORT = 9270
USER_DATA = os.path.join(os.environ.get("TEMP", r"C:\Temp"), f"cdp_run_{int(time.time())}")

print(f"Launching Chrome on port {PORT}...", flush=True)
proc = subprocess.Popen([
    CHROME_BIN,
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    f"--remote-debugging-port={PORT}",
    f"--user-data-dir={USER_DATA}",
    "--window-size=1600,1100",
    "http://localhost:5173"
])

try:
    time.sleep(2.5)
    version_res = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list").read()
    targets = json.loads(version_res.decode("utf-8"))
    page_targets = [t for t in targets if t.get("type") == "page"]
    ws_url = page_targets[0]["webSocketDebuggerUrl"]
    print(f"Connected to page CDP: {ws_url}", flush=True)

    with connect(ws_url) as ws:
        msg_id = [1]

        def send_cmd(method, params=None):
            curr_id = msg_id[0]
            msg_id[0] += 1
            payload = {"id": curr_id, "method": method, "params": params or {}}
            ws.send(json.dumps(payload))
            while True:
                resp = json.loads(ws.recv())
                if resp.get("id") == curr_id:
                    return resp.get("result", {})

        def eval_js(expr, await_promise=False):
            params = {"expression": expr, "returnByValue": True}
            if await_promise:
                params["awaitPromise"] = True
            res = send_cmd("Runtime.evaluate", params)
            return res.get("result", {}).get("value")

        send_cmd("Page.enable")
        send_cmd("Runtime.enable")

        print("Navigating to localhost:5173...", flush=True)
        send_cmd("Page.navigate", {"url": "http://localhost:5173/"})
        time.sleep(2)

        print("Logging in via credentials fetch...", flush=True)
        login_res = eval_js("""
            fetch('/api/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({ email: 'reviewer@insurance.com', password: 'ReviewerPass123!' })
            }).then(r => r.json())
        """, await_promise=True)
        print("Login result:", login_res, flush=True)

        print("Navigating to CASE_000001 workspace...", flush=True)
        send_cmd("Page.navigate", {"url": "http://localhost:5173/portal/insurance/workspace/CASE_000001"})
        time.sleep(4)

        report = eval_js("""
            (() => {
                const img = document.querySelector('img[alt*=\"Radiographic\"]');
                const naturalWidth = img ? img.naturalWidth : 0;
                const naturalHeight = img ? img.naturalHeight : 0;
                const src = img ? img.src : null;

                const text = document.body.innerText;
                return {
                    currentUrl: window.location.href,
                    imgFound: !!img,
                    src,
                    naturalWidth,
                    naturalHeight,
                    isImageVisible: naturalWidth > 0 && naturalHeight > 0,
                    hasIndication: text.includes('Positive TB test'),
                    hasFindings: text.includes('Cardiac silhouette'),
                    hasImpression: text.includes('NEGATIVE FOR ACTIVE TB') || text.includes('Normal chest x-ray'),
                    hasVLM: text.includes('Precomputed VLM Clinical Evidence Analysis'),
                    hasPolicyChecklist: text.includes('Health Plan Policy Compliance Checklist'),
                    hasQuickTemplates: text.includes('Quick Clinical Rationale Templates')
                };
            })()
        """)
        print("Verification Report:", json.dumps(report, indent=2), flush=True)

        res = send_cmd("Page.captureScreenshot", {"format": "png"})
        b64_data = res.get("data", "")
        out_path = os.path.join(ARTIFACT_DIR, "reviewer_workspace_verified.png")
        with open(out_path, "wb") as f:
            f.write(base64.b64decode(b64_data))
        print(f"Saved screenshot: {out_path} ({os.path.getsize(out_path)} bytes)", flush=True)

finally:
    try:
        proc.terminate()
    except Exception:
        pass
