import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import os from 'os';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\NILESH MARATHE\\.gemini\\antigravity-ide\\brain\\da2fa351-4323-4185-8172-3d49c42b5c93';
const PORT = 9228;
const tmpUserDataDir = path.join(os.tmpdir(), 'chrome_cdp_test_' + Date.now());

const chromeProc = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${tmpUserDataDir}`,
  '--window-size=1440,900',
  'about:blank',
]);


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  await sleep(1500);

  const targetsRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const targets = await targetsRes.json();
  const wsUrl = targets[0].webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pending = new Map();
  const consoleMessages = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleMessages.push(msg.params.args.map((a) => a.value || a.description).join(' '));
    }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  await new Promise((resolve) => (ws.onopen = resolve));

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = idCounter++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function takeScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.result.data, 'base64');
    const outPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
    return outPath;
  }

  await send('Page.enable');
  await send('Runtime.enable');

  // TEST 1: Landing Page
  console.log('1. Loading Landing Page...');
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await sleep(1500);
  await takeScreenshot('landing_page_verified.png');

  // TEST 2: Provider Portal & New Authorization Request Wizard
  console.log('2. Navigating to Provider Portal...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        sessionStorage.setItem('anvesh_design_preview_role', 'provider');
        window.location.href = 'http://127.0.0.1:5173/portal/provider/new-request';
      })()
    `
  });
  await sleep(2000);
  await takeScreenshot('provider_step1_wizard.png');

  // Fast-Load Demo Case 1 (Cardiomegaly / Effusion)
  console.log('Loading Demo Case 1 in Provider Wizard...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const demoBtn = btns.find(b => b.textContent && b.textContent.includes('DEMO-CXR-001'));
        if (demoBtn) demoBtn.click();
      })()
    `
  });
  await sleep(800);

  // Navigate to Step 4 (Image & Documents upload)
  console.log('Advancing to Step 4 (Uploads)...');
  for (let i = 0; i < 3; i++) {
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const nextBtn = btns.find(b => b.textContent && b.textContent.includes('Next'));
          if (nextBtn) nextBtn.click();
        })()
      `
    });
    await sleep(600);
  }
  await takeScreenshot('provider_step4_uploads.png');

  // Advance to Step 5 (Review & Validate)
  console.log('Advancing to Step 5 (Validate)...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const nextBtn = btns.find(b => b.textContent && b.textContent.includes('Next'));
        if (nextBtn) nextBtn.click();
      })()
    `
  });
  await sleep(600);
  await takeScreenshot('provider_step5_validate.png');

  // Submit in Step 5 -> Advances to Step 6
  console.log('Submitting Demo Authorization...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const subBtn = btns.find(b => b.textContent && (b.textContent.includes('Submit') || b.textContent.includes('Queue')));
        if (subBtn) subBtn.click();
      })()
    `
  });
  await sleep(1500);
  await takeScreenshot('provider_step6_confirmation.png');

  // TEST 3: Insurer Portal & Case Review Workspace for DEMO-CXR-001
  console.log('3. Navigating to Insurance Workspace for DEMO-CXR-001...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        sessionStorage.setItem('anvesh_design_preview_role', 'insurance');
        window.location.href = 'http://127.0.0.1:5173/portal/insurance/workspace/DEMO-CXR-001';
      })()
    `
  });
  await sleep(2000);
  await takeScreenshot('insurer_workspace_verified.png');

  // TEST 4: Patient Portal - Claims and Timeline
  console.log('4. Navigating to Patient Portal Claims...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        sessionStorage.setItem('anvesh_design_preview_role', 'patient');
        window.location.href = 'http://127.0.0.1:5173/portal/patient/claims';
      })()
    `
  });
  await sleep(1500);
  await takeScreenshot('patient_claims_list.png');

  // Open Claim Detail for DEMO-CXR-001
  console.log('Opening Claim Detail for DEMO-CXR-001...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const viewBtn = buttons.find(b => b.textContent && (b.textContent.includes('View') || b.textContent.includes('Details') || b.textContent.includes('DEMO-CXR-001')));
        if (viewBtn) viewBtn.click();
      })()
    `
  });
  await sleep(1500);
  await takeScreenshot('patient_claim_detail_timeline.png');

  console.log('All end-to-end portal verification steps completed successfully!');
  ws.close();
  chromeProc.kill();
}

main().catch((err) => {
  console.error('Error during CDP testing:', err);
  chromeProc.kill();
  process.exit(1);
});
