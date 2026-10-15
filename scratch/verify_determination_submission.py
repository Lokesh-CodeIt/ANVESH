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
PORT = 9280
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
        print("Login status:", login_res.get('message'), flush=True)

        print("Navigating to CASE_000001 workspace...", flush=True)
        send_cmd("Page.navigate", {"url": "http://localhost:5173/portal/insurance/workspace/CASE_000001"})
        time.sleep(4)

        print("Clicking Authorize button...", flush=True)
        eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const authBtn = btns.find(b => b.textContent && b.textContent.includes('Authorize'));
                if (authBtn) authBtn.click();
            })()
        """)
        time.sleep(0.5)

        print("Clicking Quick Rationale Template: Clear TB Screening...", flush=True)
        eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const tplBtn = btns.find(b => b.textContent && b.textContent.includes('Clear TB Screening'));
                if (tplBtn) tplBtn.click();
            })()
        """)
        time.sleep(0.5)

        print("Clicking Persist Official Determination...", flush=True)
        eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const saveBtn = btns.find(b => b.textContent && b.textContent.includes('Persist Official Determination'));
                if (saveBtn) saveBtn.click();
            })()
        """)
        time.sleep(1)

        print("Confirming in Modal...", flush=True)
        eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const confirmBtn = btns.find(b => b.textContent && (b.textContent.includes('Confirm') || b.textContent.includes('Save Determination')));
                if (confirmBtn) confirmBtn.click();
            })()
        """)
        time.sleep(3)

        result_report = eval_js("""
            (() => {
                const text = document.body.innerText;
                const hasSuccess = text.includes('Determination Successfully Recorded');
                const hasError = text.includes('Failed to persist determination');
                const errorBanner = document.querySelector('.bg-red-50');
                const errorMessage = errorBanner ? errorBanner.innerText : null;

                return {
                    hasSuccess,
                    hasError,
                    errorMessage
                };
            })()
        """)
        print("Adjudication Persistence Result:", json.dumps(result_report, indent=2), flush=True)

        res = send_cmd("Page.captureScreenshot", {"format": "png"})
        b64_data = res.get("data", "")
        out_path = os.path.join(ARTIFACT_DIR, "determination_persisted_success.png")
        with open(out_path, "wb") as f:
            f.write(base64.b64decode(b64_data))
        print(f"Saved screenshot: {out_path} ({os.path.getsize(out_path)} bytes)", flush=True)

finally:
    try:
        proc.terminate()
    except Exception:
        pass
