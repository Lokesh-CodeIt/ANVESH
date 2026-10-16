import asyncio
import base64
import json
import os
import subprocess
import time
import urllib.request
import aiohttp

CHROME_BIN = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\24101A0072\.gemini\antigravity-ide\brain\c8320fd9-1ba8-431c-a40f-d26e7058194e"
PORT = 9235
USER_DATA = os.path.join(os.environ.get("TEMP", r"C:\Temp"), f"cdp_capture_{int(time.time())}")

async def main():
    print(f"Starting Chrome Headless on CDP port {PORT}...")
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
        await asyncio.sleep(2)
        version_res = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list").read()
        targets = json.loads(version_res.decode("utf-8"))
        ws_url = targets[0]["webSocketDebuggerUrl"]
        print(f"Connected to Chrome CDP WebSocket: {ws_url}")

        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(ws_url) as ws:
                msg_id = 1

                async def send_cmd(method, params=None):
                    nonlocal msg_id
                    curr_id = msg_id
                    msg_id += 1
                    payload = {"id": curr_id, "method": method, "params": params or {}}
                    await ws.send_json(payload)
                    while True:
                        msg = await ws.receive_json()
                        if msg.get("id") == curr_id:
                            return msg.get("result", {})

                async def save_screenshot(filename):
                    res = await send_cmd("Page.captureScreenshot", {"format": "png"})
                    b64_data = res.get("data", "")
                    out_path = os.path.join(ARTIFACT_DIR, filename)
                    with open(out_path, "wb") as f:
                        f.write(base64.b64decode(b64_data))
                    size = os.path.getsize(out_path)
                    print(f"  [+] Saved artifact screenshot: {filename} ({size} bytes)")

                await send_cmd("Page.enable")
                await send_cmd("Runtime.enable")

                # 1. Landing Page
                print("[1/3] Navigating to Landing Page (http://127.0.0.1:5173)...")
                await send_cmd("Page.navigate", {"url": "http://127.0.0.1:5173/"})
                await asyncio.sleep(2)
                await save_screenshot("anvesh_landing_page.png")

                # 2. Reviewer Workspace Preview
                print("[2/3] Navigating to Insurance Reviewer Portal Workspace...")
                await send_cmd("Runtime.evaluate", {
                    "expression": """
                        (() => {
                            sessionStorage.setItem('anvesh_design_preview_role', 'insurance');
                            window.location.href = 'http://127.0.0.1:5173/portal/insurance/workspace/DEMO-CXR-001';
                        })()
                    """
                })
                await asyncio.sleep(2.5)
                await save_screenshot("anvesh_insurance_workspace.png")

                # 3. Provider Portal
                print("[3/3] Navigating to Provider Portal...")
                await send_cmd("Runtime.evaluate", {
                    "expression": """
                        (() => {
                            sessionStorage.setItem('anvesh_design_preview_role', 'provider');
                            window.location.href = 'http://127.0.0.1:5173/portal/provider/submissions';
                        })()
                    """
                })
                await asyncio.sleep(2)
                await save_screenshot("anvesh_provider_portal.png")

                print("Screenshots captured successfully!")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
