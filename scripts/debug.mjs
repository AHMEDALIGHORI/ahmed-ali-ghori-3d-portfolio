/** One-off inspector: opens the page, jumps to a progress, reports card state. */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PORT = 9344;
const URL = process.argv[2] || 'http://127.0.0.1:5180/';
const PROGRESS = Number(process.argv[3] || 0.53);
const PROFILE = path.resolve('.edge-debug');
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

async function waitPort() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return;
    } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error('no devtools');
}

await waitPort();
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' })).json();
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

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL });
await sleep(3000);
for (let i = 0; i < 60; i += 1) {
  const r = await send('Runtime.evaluate', { expression: "document.body.dataset.ready === 'true'", returnByValue: true });
  if (r.result.value) break;
  await sleep(500);
}
await sleep(1200);

const expr = `(() => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, ${PROGRESS} * max);
  window.__portfolio.jump(${PROGRESS});
  return 'ok';
})()`;
await send('Runtime.evaluate', { expression: expr, returnByValue: true });
await sleep(1800);

const probe = await send('Runtime.evaluate', {
  expression: `(() => {
    const p = window.__portfolio;
    const cam = p.world.camera;
    const out = { progress: p.snap().progress, chapter: p.snap().chapter, camera: cam.position.toArray().map(n => +n.toFixed(2)) };
    out.cards = p.story.cards.map(c => {
      const a = p.story.nodes.get(c.anchorName);
      const el = c.el;
      return {
        chapter: c.chapter,
        anchorFound: !!a,
        visible: el.dataset.visible,
        inlineTransform: el.style.transform,
        opacity: getComputedStyle(el).opacity,
        size: [el.offsetWidth, el.offsetHeight],
        anchorWorld: a ? a.getWorldPosition(new cam.position.constructor()).toArray().map(n => +n.toFixed(2)) : null,
        cssVars: el.getBoundingClientRect().toJSON(),
      };
    });
    return JSON.stringify(out);
  })()`,
  returnByValue: true,
});
console.log(probe.result.value);
child.kill();
process.exit(0);
