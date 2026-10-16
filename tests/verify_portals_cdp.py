import subprocess
import time
import json
import urllib.request
import os
import base64
import sys

from websockets.sync.client import connect

CHROME_BIN = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\24101A0072\.gemini\antigravity-ide\brain\c8320fd9-1ba8-431c-a40f-d26e7058194e"
PORT = 9230
USER_DATA = os.path.join(os.environ.get("TEMP", r"C:\Temp"), f"cdp_run_{int(time.time())}")

print(f"Launching Chrome Headless on CDP port {PORT}...")
proc = subprocess.Popen([
    CHROME_BIN,
    "--headless=new",
    "--disable-gpu",
    f"--remote-debugging-port={PORT}",
    f"--user-data-dir={USER_DATA}",
    "--window-size=1440,900",
    "about:blank"
])

try:
    time.sleep(2)
    # Get page ws url
    version_res = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list").read()
    targets = json.loads(version_res.decode("utf-8"))
    ws_url = targets[0]["webSocketDebuggerUrl"]
    print(f"Connected to Chrome CDP: {ws_url}")

    with connect(ws_url) as ws:
        msg_counter = [1]

        def send_cmd(method, params=None):
            curr_id = msg_counter[0]
            msg_counter[0] += 1
            payload = {"id": curr_id, "method": method, "params": params or {}}
            ws.send(json.dumps(payload))
            while True:
                resp = json.loads(ws.recv())
                if resp.get("id") == curr_id:
                    return resp.get("result", {})

        def save_screenshot(filename):
            res = send_cmd("Page.captureScreenshot", {"format": "png"})
            b64_data = res.get("data", "")
            out_path = os.path.join(ARTIFACT_DIR, filename)
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(b64_data))
            size = os.path.getsize(out_path)
            print(f"  [+] Saved screenshot: {filename} ({size} bytes)")
            return out_path

        send_cmd("Page.enable")
        send_cmd("Runtime.enable")

        # 1. Landing Page
        print("[1/4] Navigating to Landing Page (http://127.0.0.1:5173/)...")
        send_cmd("Page.navigate", {"url": "http://127.0.0.1:5173/"})
        time.sleep(2)
        save_screenshot("landing_page_final.png")

        # 2. Provider Portal - Step 4 File Staging
        print("[2/4] Navigating to Hospital Provider Portal Wizard...")
        send_cmd("Runtime.evaluate", {
            "expression": """
                (() => {
                    sessionStorage.setItem('anvesh_design_preview_role', 'provider');
                    window.location.href = 'http://127.0.0.1:5173/portal/provider/new-request';
                })()
            """
        })
        time.sleep(2)
        # Advance to step 4
        send_cmd("Runtime.evaluate", {
            "expression": """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const demo1 = btns.find(b => b.textContent && b.textContent.includes('DEMO-CXR-001'));
                    if (demo1) demo1.click();
                })()
            """
        })
        time.sleep(1)
        for _ in range(3):
            send_cmd("Runtime.evaluate", {
                "expression": """
                    (() => {
                        const btns = Array.from(document.querySelectorAll('button'));
                        const nxt = btns.find(b => b.textContent && b.textContent.includes('Next'));
                        if (nxt) nxt.click();
                    })()
                """
            })
            time.sleep(0.5)
        save_screenshot("provider_wizard_step4.png")

        # 3. Insurance Workspace (DEMO-CXR-001)
        print("[3/4] Navigating to Insurance Reviewer Workspace (DEMO-CXR-001)...")
        send_cmd("Runtime.evaluate", {
            "expression": """
                (() => {
                    sessionStorage.setItem('anvesh_design_preview_role', 'insurance');
                    window.location.href = 'http://127.0.0.1:5173/portal/insurance/workspace/DEMO-CXR-001';
                })()
            """
        })
        time.sleep(2.5)
        save_screenshot("insurance_workspace_final.png")

        # 4. Patient Portal Claims & Timeline (DEMO-CXR-001)
        print("[4/4] Navigating to Patient Portal Claim Detail...")
        send_cmd("Runtime.evaluate", {
            "expression": """
                (() => {
                    sessionStorage.setItem('anvesh_design_preview_role', 'patient');
                    window.location.href = 'http://127.0.0.1:5173/portal/patient/claims';
                })()
            """
        })
        time.sleep(2)
        save_screenshot("patient_claims_final.png")

        print("Visual verification completed successfully.")
finally:
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except Exception:
        proc.kill()
