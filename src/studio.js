import * as THREE from 'three';

/**
 * The studio set, brought to life: painted screens and boards (canvas
 * textures), the clock on real time, the printer, the turntable, the chair,
 * the plant, the server LEDs, dust and steam.
 *
 * Everything here works on nodes exported from Blender by name; if a node is
 * missing the corresponding feature is skipped instead of throwing.
 */
export function createStudio({ scene, nodes, featured, more }) {
  const THREE_ANY = THREE;
  const painted = [];
  const clock = { canvas: null, ctx: null, tex: null };
  const steam = { points: null, material: null, data: [] };
  const dust = { points: null, data: [] };
  const state = {
    drawerOpen: 0,
    typingPhase: 0,
    lastSecond: -1,
  };

  const node = (name) => nodes.get(name);
  const mesh = (name) => {
    const n = node(name);
    return n && n.isMesh ? n : null;
  };

  /* ------------------------------------------------------------- painting */

  function paint(name, width, height, draw, { live = false } = {}) {
    const target = mesh(name);
    if (!target) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    draw(ctx, width, height);

    const tex = new THREE_ANY.CanvasTexture(canvas);
    tex.colorSpace = THREE_ANY.SRGBColorSpace;
    tex.anisotropy = 4;

    const mat = target.material;
    mat.map = tex;
    mat.emissiveMap = tex;
    mat.emissive = new THREE_ANY.Color(0xffffff);
    mat.emissiveIntensity = 0.28;
    mat.color = new THREE_ANY.Color(0xffffff);
    mat.needsUpdate = true;

    const record = { name, canvas, ctx, tex, draw, width, height };
    painted.push(record);
    if (!live) record.tex.needsUpdate = true;
    return record;
  }

  const fill = (ctx, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  };

  const text = (ctx, str, x, y, { size = 20, color = '#e9f4ff', font = 'Space Grotesk, sans-serif', weight = '500', align = 'left' } = {}) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
  };

  /* ------------------------------------------------------------- screens */

  const screenBase = (ctx, w, h, title) => {
    fill(ctx, w, h, '#070d16');
    ctx.fillStyle = '#0d1624';
    ctx.fillRect(0, 0, w, 34);
    text(ctx, title, 16, 23, { size: 13, color: '#7fb6d6' });
    ctx.fillStyle = '#1d2b3d';
    ctx.fillRect(0, 34, w, 1);
  };

  const screenUi = paint('StdScreen_1', 512, 288, (ctx, w, h) => {
    screenBase(ctx, w, h, 'ahmed-ali-ghori · portfolio');
    text(ctx, 'Frontend Developer', 18, 78, { size: 26, color: '#f4ede4' });
    text(ctx, '& Data Analyst', 18, 110, { size: 26, color: '#8fe9ff' });
    ['LOGOFF-01', 'Neon', 'Mithaas', 'MUDRA'].forEach((label, i) => {
      ctx.fillStyle = i === 0 ? '#12243a' : '#0b1522';
      ctx.fillRect(18, 134 + i * 34, w - 36, 26);
      text(ctx, label, 28, 152 + i * 34, { size: 13, color: i === 0 ? '#8fe9ff' : '#9fb3c8' });
    });
  });

  let terminalDraw = null;
  const screenTerminal = paint('StdScreen_2', 512, 288, (ctx, w, h) => {
    const lines = [
      '$ npm run dev',
      '  vite v8 ready in 668 ms',
      '  ➜ localhost:5180',
      '$ pnpm build',
      '  dist/ 1.06 MB glb · 0 errors',
      '✓ rooftop loaded (9,043 faces)',
    ];
    const draw = (step) => {
      screenBase(ctx, w, h, 'terminal — build');
      lines.slice(0, step).forEach((line, i) => {
        text(ctx, line, 18, 70 + i * 30, {
          size: 14,
          color: line.startsWith('$') ? '#8fe9ff' : '#9fd6b0',
        });
      });
      ctx.fillStyle = '#8fe9ff';
      ctx.fillRect(18, 70 + Math.min(step, lines.length) * 30 - 12, 8, 14);
    };
    draw(lines.length);
    terminalDraw = draw;
  });
  if (screenTerminal && terminalDraw) screenTerminal.draw = terminalDraw;

  const screenChart = paint('StdScreen_3', 512, 288, (ctx, w, h) => {
    screenBase(ctx, w, h, 'analytics — last 12 weeks');
    const values = [0.35, 0.42, 0.38, 0.55, 0.61, 0.58, 0.7, 0.66, 0.78, 0.84, 0.8, 0.92];
    values.forEach((v, i) => {
      const barH = v * 170;
      ctx.fillStyle = i === values.length - 1 ? '#8fe9ff' : '#1f4a63';
      ctx.fillRect(30 + i * 38, 240 - barH, 24, barH);
    });
    text(ctx, '+38%', w - 24, 70, { size: 20, color: '#ffb37a', align: 'right' });
  });

  /* ------------------------------------------------------------- boards */

  paint('StdWhiteboard', 640, 320, (ctx, w, h) => {
    fill(ctx, w, h, '#f2f0ea');
    text(ctx, 'how this world is built', 28, 44, { size: 20, color: '#2a3340' });
    const boxes = [
      ['Blender', 40, 90],
      ['glTF', 250, 90],
      ['Three.js', 460, 90],
      ['scroll', 250, 200],
    ];
    ctx.strokeStyle = '#2a3340';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#e2ddd2';
    boxes.forEach(([label, x, y]) => {
      ctx.fillRect(x, y, 140, 52);
      ctx.strokeRect(x, y, 140, 52);
      text(ctx, label, x + 18, y + 33, { size: 16, color: '#2a3340' });
    });
    const arrow = (x1, y1, x2, y2) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    arrow(180, 116, 248, 116);
    arrow(390, 116, 458, 116);
    arrow(320, 142, 320, 198);
    arrow(390, 226, 300, 150);
    text(ctx, 'cards → DOM', 470, 250, { size: 14, color: '#7a6a52' });
    text(ctx, '154 buildings · 5.5k faces', 40, 268, { size: 13, color: '#7a6a52' });
  });

  paint('StdCork', 520, 340, (ctx, w, h) => {
    fill(ctx, w, h, '#4a3220');
    for (let i = 0; i < 900; i += 1) {
      ctx.fillStyle = `rgba(${90 + Math.random() * 60}, ${60 + Math.random() * 40}, ${30 + Math.random() * 25}, 0.35)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    text(ctx, 'shipped', 22, 34, { size: 18, color: '#f0e2cd' });
    const shots = ['logoff', 'neon', 'mithaas', 'mudra'];
    shots.forEach((id, i) => {
      const x = 26 + (i % 2) * 240;
      const y = 58 + Math.floor(i / 2) * 140;
      ctx.fillStyle = '#1b1410';
      ctx.fillRect(x, y, 200, 116);
      text(ctx, id, x + 12, y + 102, { size: 12, color: '#c9b79b' });
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, x + 6, y + 6, 188, 92);
        painted.find((p) => p.name === 'StdCork')?.tex && (painted.find((p) => p.name === 'StdCork').tex.needsUpdate = true);
      };
      img.src = `./work/${id}.jpg`;
    });
  });

  paint('StdPlaque', 520, 340, (ctx, w, h) => {
    fill(ctx, w, h, '#0a0f18');
    text(ctx, 'SHIPPED', 22, 40, { size: 18, color: '#8fe9ff' });
    text(ctx, `${more.length + featured.length} deployments`, 22, 62, { size: 13, color: '#6f8399' });
    const names = [...featured.map((p) => p.title), ...more.map((p) => p.title)];
    names.slice(0, 12).forEach((label, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      text(ctx, '· ' + label, 22 + col * 240, 96 + row * 34, {
        size: 12,
        color: i < 4 ? '#f4ede4' : '#8ea3b8',
      });
    });
  });

  paint('StdPegboard', 448, 320, (ctx, w, h) => {
    fill(ctx, w, h, '#141a22');
    ctx.fillStyle = '#0e131a';
    for (let y = 12; y < h; y += 22) {
      for (let x = 12; x < w; x += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = '#38495c';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 120, 120, 90);
    text(ctx, 'tablet', 52, 232, { size: 12, color: '#6f8399' });
    ctx.strokeStyle = '#38495c';
    ctx.strokeRect(250, 150, 60, 70);
    text(ctx, 'pens', 250, 240, { size: 12, color: '#6f8399' });
  });

  for (let i = 1; i <= 4; i += 1) {
    paint(`StdCert_${i}`, 240, 170, (ctx, w, h) => {
      fill(ctx, w, h, '#d9d2c2');
      ctx.strokeStyle = '#b9a888';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      text(ctx, 'CERTIFICATE', w / 2, 46, { size: 13, color: '#8a7a5e', align: 'center' });
      const names = [
        ['AWS', 'Generative AI'],
        ['Snowflake', 'Generative AI'],
        ['Snowflake', 'Data Engineering'],
        ['Microsoft', 'SQL Server'],
      ][i - 1];
      text(ctx, names[0], w / 2, 92, { size: 22, color: '#2a3340', align: 'center' });
      text(ctx, names[1], w / 2, 118, { size: 15, color: '#4c5a6a', align: 'center' });
      text(ctx, 'Ahmed Ali Ghori', w / 2, 146, { size: 11, color: '#7a6a52', align: 'center' });
    });
  }

  let keysDraw = null;
  const keyboard = paint('StdKeyboard', 512, 130, (ctx, w, h) => {
    const draw = (t) => {
      fill(ctx, w, h, '#0a0f16');
      const cols = 22;
      const rows = 5;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const lit = Math.random() < 0.06 + (Math.sin(t * 2 + c * 0.6 + r) + 1) * 0.02;
          ctx.fillStyle = lit ? '#8fe9ff' : '#1b2634';
          ctx.fillRect(6 + c * 23, 8 + r * 23, 20, 20);
        }
      }
    };
    draw(0);
    keysDraw = draw;
  });
  if (keyboard && keysDraw) keyboard.draw = keysDraw;

  /* --------------------------------------------------------------- clock */

  const clockFace = new THREE_ANY.Mesh(
    new THREE_ANY.CircleGeometry(0.19, 40),
    new THREE_ANY.MeshBasicMaterial({ transparent: true }),
  );
  const clockCanvas = document.createElement('canvas');
  clockCanvas.width = clockCanvas.height = 256;
  clock.ctx = clockCanvas.getContext('2d');
  clock.tex = new THREE_ANY.CanvasTexture(clockCanvas);
  clock.tex.colorSpace = THREE_ANY.SRGBColorSpace;
  clockFace.material.map = clock.tex;
  clockFace.position.set(12.4, 3.02, -10.34);
  clockFace.rotation.y = Math.PI;
  clockFace.renderOrder = 1;
  scene.add(clockFace);

  function drawClock() {
    const ctx = clock.ctx;
    const w = 256;
    ctx.clearRect(0, 0, w, w);
    ctx.fillStyle = '#0b1119';
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2c3a4c';
    ctx.lineWidth = 4;
    ctx.stroke();
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      ctx.strokeStyle = i % 3 === 0 ? '#8fe9ff' : '#3d4c5f';
      ctx.lineWidth = i % 3 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.sin(a) * (w / 2 - 18), w / 2 - Math.cos(a) * (w / 2 - 18));
      ctx.lineTo(w / 2 + Math.sin(a) * (w / 2 - 30), w / 2 - Math.cos(a) * (w / 2 - 30));
      ctx.stroke();
    }
    const now = new Date();
    const hand = (angle, length, width, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(w / 2, w / 2);
      ctx.lineTo(w / 2 + Math.sin(angle) * length, w / 2 - Math.cos(angle) * length);
      ctx.stroke();
    };
    const sec = now.getSeconds();
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;
    hand((hr / 12) * Math.PI * 2, 56, 7, '#f4ede4');
    hand((min / 60) * Math.PI * 2, 82, 5, '#f4ede4');
    hand((sec / 60) * Math.PI * 2, 92, 2, '#8fe9ff');
    clock.tex.needsUpdate = true;
  }
  drawClock();

  /* ----------------------------------------------------------- particles */

  function makeSteam() {
    const cup = node('StdCup');
    if (!cup) return;
    const origin = new THREE_ANY.Vector3();
    cup.getWorldPosition(origin);

    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      steam.data.push({
        x: (Math.random() - 0.5) * 0.1,
        y: Math.random() * 0.9,
        z: (Math.random() - 0.5) * 0.1,
        speed: 0.12 + Math.random() * 0.18,
        drift: (Math.random() - 0.5) * 0.12,
      });
    }
    const geo = new THREE_ANY.BufferGeometry();
    geo.setAttribute('position', new THREE_ANY.BufferAttribute(positions, 3));
    const mat = new THREE_ANY.PointsMaterial({
      color: 0xdfeaf5,
      size: 0.022,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE_ANY.AdditiveBlending,
    });
    const points = new THREE_ANY.Points(geo, mat);
    points.position.copy(origin).add(new THREE_ANY.Vector3(0, 0.1, 0));
    points.frustumCulled = false;
    cup.parent?.add(points) ?? null;
    steam.points = points;
    steam.material = mat;
    steam.origin = origin;
  }

  function makeDust() {
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = 5 + Math.random() * 8;
      positions[i * 3 + 1] = 0.15 + Math.random() * 2.9;
      positions[i * 3 + 2] = -10.2 + Math.random() * 6.4;
    }
    const geo = new THREE_ANY.BufferGeometry();
    geo.setAttribute('position', new THREE_ANY.BufferAttribute(positions, 3));
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const sctx = sprite.getContext('2d');
    const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 32, 32);
    const spriteTex = new THREE_ANY.CanvasTexture(sprite);

    const mat = new THREE_ANY.PointsMaterial({
      color: 0x9fc4dd,
      size: 0.02,
      map: spriteTex,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE_ANY.AdditiveBlending,
    });
    const points = new THREE_ANY.Points(geo, mat);
    points.frustumCulled = false;
    for (let i = 0; i < count; i += 1) {
      dust.data.push({ phase: Math.random() * Math.PI * 2, speed: 0.02 + Math.random() * 0.05 });
    }
    scene.add(points);
    dust.points = points;
  }

  makeSteam();
  makeDust();

  /* ------------------------------------------------------------ animation */

  const vinyl = node('StdVinyl');
  const chair = node('StdChairPivot');
  const plant = node('StdPlantPivot');
  const nozzle = node('StdNozzle');
  const part = node('StdPrintPart');
  const drawer = node('StdDrawer');
  const drawerPull = node('StdDrawerPull');
  const leds = ['StdLED_1', 'StdLED_2', 'StdLED_3'].map((n) => mesh(n)).filter(Boolean);
  const lampGlow = mesh('StdLampGlow');

  const partBase = part ? part.position.y : 0;
  const drawerBase = drawer ? drawer.position.z : 0;
  const pullBase = drawerPull ? drawerPull.position.z : 0;

  function update(t, dt, camera) {
    // clock, once a second
    const sec = new Date().getSeconds();
    if (sec !== state.lastSecond) {
      state.lastSecond = sec;
      drawClock();
    }

    // keyboard typing pattern
    if (keyboard && keyboard.draw) keyboard.draw(t);

    // terminal lines cycle
    if (screenTerminal.draw) {
      const step = Math.floor(t / 1.6) % 7;
      screenTerminal.draw(step);
      screenTerminal.tex.needsUpdate = true;
    }

    if (vinyl) vinyl.rotation.y = t * 1.8;
    if (plant) plant.rotation.z = Math.sin(t * 0.7) * 0.035;
    if (chair && camera) {
      const target = Math.atan2(camera.position.x - chair.position.x, camera.position.z - chair.position.z);
      chair.rotation.y += (target - chair.rotation.y) * Math.min(1, dt * 1.2);
    }

    // printer: nozzle traces a small square, the part grows and resets
    if (nozzle) {
      const cycle = (t * 0.5) % 1;
      nozzle.position.x = 5.3 + Math.sin(cycle * Math.PI * 4) * 0.16;
      nozzle.position.z = 4.6 + Math.cos(cycle * Math.PI * 4) * 0.16;
    }
    if (part) {
      const grow = 0.02 + ((t * 0.05) % 1) * 0.18;
      part.scale.y = 1;
      part.position.y = partBase + grow / 2;
      part.scale.x = 1;
      part.scale.z = 1;
    }

    // drawer slides out when the camera is close
    if (drawer && camera) {
      const near = camera.position.distanceTo(new THREE_ANY.Vector3(9, 1, -8)) < 4.2;
      state.drawerOpen += ((near ? 1 : 0) - state.drawerOpen) * Math.min(1, dt * 3);
      drawer.position.z = drawerBase + state.drawerOpen * 0.22;
      if (drawerPull) drawerPull.position.z = pullBase + state.drawerOpen * 0.22;
    }

    // server LEDs blink out of phase
    leds.forEach((led, i) => {
      const on = 0.35 + (Math.sin(t * (2.2 + i * 0.7) + i) > 0 ? 1.6 : 0.2);
      led.material.emissiveIntensity = on;
    });

    // lamp breathes very slightly
    if (lampGlow) lampGlow.material.emissiveIntensity = 1.6 + Math.sin(t * 1.3) * 0.12;

    // steam
    if (steam.points) {
      const pos = steam.points.geometry.attributes.position;
      for (let i = 0; i < steam.data.length; i += 1) {
        const p = steam.data[i];
        p.y += p.speed * dt;
        if (p.y > 1.1) {
          p.y = 0;
          p.x = (Math.random() - 0.5) * 0.1;
          p.z = (Math.random() - 0.5) * 0.1;
        }
        pos.setXYZ(i, p.x + Math.sin(t * 0.8 + i) * p.drift, p.y, p.z + Math.cos(t * 0.6 + i) * p.drift);
      }
      pos.needsUpdate = true;
    }

    // dust
    if (dust.points) {
      const pos = dust.points.geometry.attributes.position;
      for (let i = 0; i < dust.data.length; i += 1) {
        const d = dust.data[i];
        let y = pos.getY(i) + d.speed * dt * 0.4;
        if (y > 3.05) y = 0.12;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(t * 0.25 + d.phase) * dt * 0.02);
      }
      pos.needsUpdate = true;
    }
  }

  function refreshScreens() {
    painted.forEach((p) => {
      if (p.name.startsWith('StdScreen') || p.name === 'StdKeyboard') p.tex.needsUpdate = true;
    });
  }

  return {
    update,
    refreshScreens,
    paintedCount: painted.length,
    has: (name) => Boolean(node(name)),
    clockFace,
  };
}
