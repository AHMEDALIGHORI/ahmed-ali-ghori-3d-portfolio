/**
 * Capture a real screenshot of each live project, to use as panel imagery.
 *
 *   node scripts/capture-sites.mjs
 *
 * Writes public/work/<id>.jpg (1200x750 JPEG). Sites that fail to load are
 * skipped — the site falls back to a generated gradient card.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PORT = 9355;
const OUT = path.resolve('public/work');
const PROFILE = path.resolve('.edge-capture');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SITES = [
  { id: 'logoff', url: 'https://logooff-01-touch-grass.vercel.app' },
  { id: 'neon', url: 'https://neon-the-next-interface.vercel.app' },
  { id: 'mithaas', url: 'https://ahmedalighori.github.io/mithaas-co/' },
  { id: 'mudra', url: 'https://mudra-house-of-thali.vercel.app' },
  { id: 'ghori-city', url: 'https://ghori-city.vercel.app' },
];

const exe = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync);

if (!exe) {
  console.error('no browser found');
  process.exit(1);
}

await mkdir(OUT, { recursive: true });

const child = spawn(exe, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--window-size=1200,750',
  '--hide-scrollbars',
  '--no-first-run',
  '--use-angle=d3d11',
  '--enable-gpu',
  'about:blank',
], { stdio: 'ignore' });

async function waitPort() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return;
    } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error('devtools never came up');
}

await waitPort();

let id = 0;
async function newSession() {
  const target = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
  ).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1200, height: 750, deviceScaleFactor: 1, mobile: false,
  });
  return { send, ws };
}

for (const site of SITES) {
  try {
    const { send, ws } = await newSession();
    await send('Page.navigate', { url: site.url });
    await sleep(9000);
    // a little scrolling wakes up lazy sections
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0.35 * innerHeight)' });
    await sleep(1500);
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82, fromSurface: true });
    const file = path.join(OUT, `${site.id}.jpg`);
    await writeFile(file, Buffer.from(shot.data, 'base64'));
    console.log('captured', site.id, `${Math.round(Buffer.from(shot.data, 'base64').length / 1024)} KB`);
    ws.close();
  } catch (error) {
    console.log('skipped', site.id, '-', error.message);
  }
}

child.kill();
process.exit(0);
