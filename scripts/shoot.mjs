/**
 * Screenshot driver for the portfolio, over the Chrome DevTools Protocol.
 *
 *   node scripts/shoot.mjs [--url http://127.0.0.1:5180/] [--out shots]
 *
 * Launches headless Edge/Chrome with GPU (ANGLE D3D11), waits for the 3D world
 * to finish loading, then captures one frame per scroll chapter and prints any
 * console errors it saw.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const URL = getArg('url', 'http://127.0.0.1:5180/');
const OUT = path.resolve(getArg('out', 'shots'));
const PORT = Number(getArg('port', 9333));
const WIDTH = Number(getArg('width', 1600));
const HEIGHT = Number(getArg('height', 900));
const PROFILE = path.resolve(getArg('profile', '.edge-profile'));

const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pickBrowser() {
  const { existsSync } = await import('node:fs');
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error('No Edge or Chrome installation found');
  return found;
}

async function launch() {
  const exe = await pickBrowser();
  const child = spawn(
    exe,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      `--window-size=${WIDTH},${HEIGHT}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=CalculateNativeWinOcclusion',
      '--use-angle=d3d11',
      '--enable-gpu',
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  );
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return { child, info: await res.json() };
    } catch {
      /* keep polling */
    }
    await sleep(250);
  }
  throw new Error('browser did not expose the debugging port');
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners.get(msg.method) || []) fn(msg.params);
      }
    });
  }

  send(method, params = {}) {
    const id = (this.id += 1);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }
}

async function connect() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  return new CDP(ws);
}

const SHOTS = [
  { name: '01-hero', progress: 0.02 },
  { name: '02-about', progress: 0.16 },
  { name: '03-studio', progress: 0.27 },
  { name: '04-project-1', progress: 0.4 },
  { name: '05-project-2', progress: 0.53 },
  { name: '06-project-3', progress: 0.66 },
  { name: '07-project-4', progress: 0.78 },
  { name: '08-more', progress: 0.88 },
  { name: '09-contact', progress: 0.97 },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const { child } = await launch();
  const cdp = await connect();

  const problems = [];
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error' || p.type === 'warning') {
      problems.push(`[console.${p.type}] ${p.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
    }
  });
  cdp.on('Runtime.exceptionThrown', (p) => {
    problems.push(`[exception] ${p.exceptionDetails?.text} ${p.exceptionDetails?.exception?.description ?? ''}`);
  });
  cdp.on('Log.entryAdded', (p) => {
    if (p.entry.level === 'error') problems.push(`[log] ${p.entry.text}`);
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await cdp.send('Page.navigate', { url: URL });
  await sleep(1200);

  // wait until the loader reports the world is ready (max 40s)
  let ready = false;
  for (let i = 0; i < 80; i += 1) {
    const res = await cdp.send('Runtime.evaluate', {
      expression: "document.body.dataset.ready === 'true' || document.body.dataset.webgl === 'false'",
      returnByValue: true,
    });
    if (res.result.value) {
      ready = true;
      break;
    }
    await sleep(500);
  }
  console.log(ready ? 'world ready' : 'WARNING: world never reported ready');
  await sleep(1500);

  for (const shot of SHOTS) {
    const info = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, ${shot.progress} * max);
        if (window.__portfolio) window.__portfolio.jump(${shot.progress});
        return JSON.stringify(window.__portfolio ? window.__portfolio.snap() : {});
      })()`,
      returnByValue: true,
    });
    await sleep(1600);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const file = path.join(OUT, `${shot.name}.png`);
    await writeFile(file, Buffer.from(data, 'base64'));
    console.log('shot', path.basename(file), info.result.value);
  }

  // interaction states: case-study sheet, dusk lighting, filtered panels
  const extras = [
    {
      name: '11-case-study',
      setup: `(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, 0.53 * max);
        window.__portfolio.jump(0.53);
        window.__portfolio.openCase('neon');
        return 'case open';
      })()`,
      wait: 1600,
    },
    {
      name: '12-dusk',
      setup: `(() => {
        document.querySelector('[data-case-close]').click();
        document.getElementById('light-btn').click();
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, 0.27 * max);
        window.__portfolio.jump(0.27);
        return 'dusk';
      })()`,
      wait: 1800,
    },
    {
      name: '13-filter',
      setup: `(() => {
        document.getElementById('light-btn').click();
        document.querySelector('[data-filter="TypeScript"]').click();
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, 0.88 * max);
        window.__portfolio.jump(0.88);
        return 'filtered';
      })()`,
      wait: 1600,
    },
  ];

  for (const extra of extras) {
    await cdp.send('Runtime.evaluate', { expression: extra.setup, returnByValue: true });
    await sleep(extra.wait);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    await writeFile(path.join(OUT, `${extra.name}.png`), Buffer.from(data, 'base64'));
    console.log('shot', `${extra.name}.png`);
  }

  // a mobile pass for layout checks
  await cdp.send('Runtime.evaluate', { expression: 'document.querySelector("[data-case-close]").click(); window.scrollTo(0,0)' });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await cdp.send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' });
  await sleep(2500);
  const mobile = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(path.join(OUT, '10-mobile-hero.png'), Buffer.from(mobile.data, 'base64'));
  console.log('shot', path.join(OUT, '10-mobile-hero.png'));

  const info = await cdp.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      ready: document.body.dataset.ready,
      webgl: document.body.dataset.webgl || 'on',
      scrollHeight: document.documentElement.scrollHeight,
      fpsHint: !!window.__fps
    })`,
    returnByValue: true,
  });
  console.log('page state', info.result.value);

  if (problems.length) {
    console.log('--- console problems ---');
    for (const p of [...new Set(problems)]) console.log(p);
  } else {
    console.log('no console errors');
  }

  child.kill();
  process.exit(0);
}

main().catch((error) => {
  console.error('shoot failed:', error);
  process.exit(1);
});
