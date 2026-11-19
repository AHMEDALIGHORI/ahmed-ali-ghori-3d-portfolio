/**
 * Interaction smoke test over CDP: hovers a 3D panel, clicks it, and checks that
 * the case-study sheet opens. Also exercises the tour, sound and light switches.
 *
 *   node scripts/test-interaction.mjs [url]
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PORT = 9366;
const URL = process.argv[2] || 'http://127.0.0.1:4180/';
const PROFILE = path.resolve('.edge-interact');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const exe = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);

const child = spawn(exe, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--window-size=1600,900',
  '--hide-scrollbars',
  '--no-first-run',
  '--use-angle=d3d11',
  'about:blank',
], { stdio: 'ignore' });

for (let i = 0; i < 80; i += 1) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    if (r.ok) break;
  } catch { /* retry */ }
  await sleep(250);
}

const target = await (
  await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' })
).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const i = (id += 1);
  pending.set(i, { resolve, reject });
  ws.send(JSON.stringify({ id: i, method, params }));
});
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;

await send('Page.enable');
await send('Runtime.enable');
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') {
    console.log('PAGE EXCEPTION:', m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  }
});
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL });
await sleep(2500);
for (let i = 0; i < 60; i += 1) {
  if (await evaluate("document.body.dataset.ready === 'true'")) break;
  await sleep(500);
}
await sleep(800);

const results = [];

// --- move to the project chapter and look for a hoverable panel -------------
await evaluate(`(() => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, 0.53 * max);
  window.__portfolio.jump(0.53);
  return true;
})()`);
await sleep(1800);

let hoverState = 'none';
let clickPoint = null;
const candidates = [[420, 420], [1180, 430], [520, 300], [1060, 320], [800, 450]];
for (const [x, y] of candidates) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
  await sleep(320);
  hoverState = await evaluate("document.body.dataset.panelHover || 'none'");
  const under = await evaluate(`(() => { const el = document.elementFromPoint(${x}, ${y}); return el ? (el.id || el.tagName) : 'none'; })()`);
  if (hoverState !== 'none' && under === 'scene') {
    clickPoint = [x, y];
    break;
  }
}
results.push(['panel hover', `${hoverState} at ${clickPoint ? clickPoint.join(',') : 'no canvas point'}`]);

// --- click the hovered panel ------------------------------------------------
if (clickPoint) {
  const [x, y] = clickPoint;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(900);
}
const caseOpen = await evaluate("!document.getElementById('case').hidden");
const caseTitle = await evaluate("document.getElementById('case-title').textContent");
results.push(['case study opened by panel click', `${caseOpen} — ${caseTitle}`]);

// --- close, then exercise the switches --------------------------------------
const closeResult = await evaluate(`(() => {
  try {
    const btn = document.querySelector('[data-case-close]');
    if (!btn) return 'no close button';
    btn.click();
    return 'hidden=' + document.getElementById('case').hidden;
  } catch (error) {
    return 'ERR ' + error.message;
  }
})()`);
results.push(['case close attempt', closeResult]);
await sleep(400);
results.push(['case closes', String(await evaluate("document.getElementById('case').hidden"))]);

await evaluate("document.getElementById('light-btn').click()");
await sleep(400);
results.push(['light mode', await evaluate("window.__portfolio.world.getMode()")]);

const beforeScroll = await evaluate('window.scrollY');
await evaluate("document.getElementById('tour-btn').click()");
const tourPressed = await evaluate("document.getElementById('tour-btn').getAttribute('aria-pressed')");
await sleep(1200);
const midScroll = await evaluate('window.scrollY');
await sleep(1800);
const afterScroll = await evaluate('window.scrollY');
results.push(['tour starts', tourPressed]);
results.push(['tour moves camera', `${beforeScroll} -> ${midScroll} -> ${afterScroll}`]);
await evaluate("document.getElementById('tour-btn').click()");

await evaluate("window.scrollTo(0, 0); window.__portfolio.jump(0)");
await sleep(1200);
await evaluate("document.getElementById('sound-btn').click()");
await sleep(500);
results.push(['sound toggle', await evaluate("document.getElementById('sound-btn').getAttribute('aria-pressed')")]);
await evaluate("document.getElementById('sound-btn').click()");

for (const [name, value] of results) console.log(`${name}: ${value}`);
child.kill();
process.exit(0);
