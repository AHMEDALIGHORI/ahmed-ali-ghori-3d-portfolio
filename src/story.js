import * as THREE from 'three';

const PANEL_COUNT = 4;

/**
 * The scroll narrative: a camera walk authored as empties inside Blender
 * (Path_01..Path_10 and Look_01..Look_10), the HTML cards that sit inside the
 * four floating panels, and the pointer interaction on those panels.
 */
export function createStory({
  camera,
  nodes,
  featured,
  chapters,
  panels = [],
  panelMeshes = [],
  reduced = false,
  onOpenProject = () => {},
}) {
  // ------------------------------------------------------------ path setup
  const vec = new THREE.Vector3();
  const pathPoints = [];
  const lookPoints = [];

  for (let i = 1; i <= 10; i += 1) {
    const p = nodes.get(`Path_${String(i).padStart(2, '0')}`);
    const l = nodes.get(`Look_${String(i).padStart(2, '0')}`);
    if (p) pathPoints.push(p.getWorldPosition(new THREE.Vector3()));
    if (l) lookPoints.push(l.getWorldPosition(new THREE.Vector3()));
  }

  if (pathPoints.length < 4) {
    pathPoints.length = 0;
    pathPoints.push(
      new THREE.Vector3(58, 44, 92),
      new THREE.Vector3(20, 12, 30),
      new THREE.Vector3(0, 6, 4),
      new THREE.Vector3(-4, 6, -16),
      new THREE.Vector3(24, 26, -34),
    );
  }
  if (lookPoints.length !== pathPoints.length) {
    lookPoints.length = 0;
    for (const p of pathPoints) lookPoints.push(p.clone().multiplyScalar(0.1).setY(5));
  }

  const pathCurve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.28);
  const lookCurve = new THREE.CatmullRomCurve3(lookPoints, false, 'catmullrom', 0.3);

  /** Scroll progress -> path point index (the approach is quick, panels slow). */
  const KEYFRAMES = [
    [0.0, 0.0],
    [0.11, 1.2],
    [0.23, 3.0],
    [0.34, 5.0],
    [0.47, 6.0],
    [0.6, 7.0],
    [0.72, 8.0],
    [0.84, 9.0],
    [0.93, 9.0],
    [1.0, 9.0],
  ];

  const smoothstep = (t) => t * t * (3 - 2 * t);

  function indexAt(progress) {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    for (let i = 1; i < KEYFRAMES.length; i += 1) {
      const [p0, i0] = KEYFRAMES[i - 1];
      const [p1, i1] = KEYFRAMES[i];
      if (p <= p1) {
        const span = Math.max(1e-6, p1 - p0);
        const f = smoothstep((p - p0) / span);
        return i0 + (i1 - i0) * f;
      }
    }
    return KEYFRAMES[KEYFRAMES.length - 1][1];
  }

  // ---------------------------------------------------------------- cards
  const cardsLayer = document.getElementById('cards');
  const cards = [];

  featured.slice(0, PANEL_COUNT).forEach((project, index) => {
    const el = document.createElement('article');
    el.className = 'panel-card';
    el.dataset.chapter = `project-${index}`;
    el.dataset.projectId = project.id;
    el.innerHTML = `
      <div class="thumb"><img src="${project.image}" alt="" loading="lazy" /></div>
      <header>
        <span class="num">${project.index} / 04</span>
        <span class="year">${project.year}</span>
      </header>
      <h3>${project.title}</h3>
      <p class="tagline">${project.tagline}</p>
      <p class="body">${project.body}</p>
      <ul class="stack">${project.stack.map((s) => `<li>${s}</li>`).join('')}</ul>
      <div class="links">
        <a href="#/work/${project.id}" data-case-link="${project.id}">Case study ↗</a>
        ${project.live ? `<a href="${project.live}" target="_blank" rel="noopener noreferrer">Live site ↗</a>` : ''}
        <a href="${project.code}" target="_blank" rel="noopener noreferrer">Code ↗</a>
      </div>`;
    cardsLayer.appendChild(el);

    const img = el.querySelector('.thumb img');
    img.addEventListener('error', () => {
      img.dataset.missing = 'true';
    });

    cards.push({
      el,
      project,
      chapter: `project-${index}`,
      anchorName: `Anchor_${String(index + 1).padStart(2, '0')}`,
    });
  });

  // ------------------------------------------------------------ animation
  const cameraPos = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const smoothedPointer = new THREE.Vector2();
  let time = 0;
  let hovered = null;
  const dimmed = new Set();

  const panelTargets = [1, 2, 3, 4].map((i) => {
    const node = nodes.get(`Anchor_0${i}`);
    return node ? node.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 5, 0);
  });

  const targets = {
    hero: new THREE.Vector3(0, 8, 0),
    about: new THREE.Vector3(0, 5, -6),
    studio: new THREE.Vector3(9, 3.1, -7),
    'project-0': panelTargets[0],
    'project-1': panelTargets[1],
    'project-2': panelTargets[2],
    'project-3': panelTargets[3],
    more: new THREE.Vector3(0, 13, -30),
    contact: new THREE.Vector3(0, 12, -50),
  };

  desired.copy(targets.hero);
  lookTarget.copy(targets.hero);

  function setPointer(x, y) {
    pointer.set(x, y);
  }

  function sample(progress, chapterId) {
    const index = indexAt(progress);
    const lastPoint = pathCurve.points.length - 1;
    const u = THREE.MathUtils.clamp(index / Math.max(1, lastPoint), 0, 1);

    pathCurve.getPoint(u, cameraPos);
    const goal = targets[chapterId];
    if (goal) desired.copy(goal);
    else lookCurve.getPoint(u, desired);

    const drift = 0.06;
    cameraPos.x += Math.sin(time * 0.55) * drift;
    cameraPos.y += Math.cos(time * 0.42) * drift * 0.7;
    cameraPos.z += Math.sin(time * 0.37 + 1.2) * drift * 0.6;

    lookTarget.lerp(desired, reduced ? 1 : 0.055);

    smoothedPointer.lerp(pointer, 0.045);
    camera.position.copy(cameraPos);
    camera.lookAt(
      lookTarget.x + smoothedPointer.x * 0.4,
      lookTarget.y + smoothedPointer.y * 0.25,
      lookTarget.z,
    );
  }

  // ------------------------------------------------------------- hover/click
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(0, 0);
  let hoverDirty = true;
  let frame = 0;

  function applyPanelState() {
    for (let i = 0; i < panels.length; i += 1) {
      const mats = panels[i] || [];
      const isDim = dimmed.has(i);
      const isHover = hovered === i;
      const factor = isDim ? 0.22 : isHover ? 1.55 : 1;
      for (const mat of mats) {
        const base = mat.userData.baseEmissive ?? 1;
        mat.emissiveIntensity = base * factor;
      }
    }
  }

  function pick() {
    if (!panelMeshes.length || !camera) return null;
    raycaster.setFromCamera(ndc, camera);
    raycaster.far = 40;
    const hits = raycaster.intersectObjects(panelMeshes, false);
    if (!hits.length) return null;
    const match = /^Panel(\d)_/.exec(hits[0].object.name);
    return match ? Number(match[1]) - 1 : null;
  }

  function updateHover() {
    const next = pick();
    if (next !== hovered) {
      hovered = next;
      applyPanelState();
      document.body.dataset.panelHover = hovered === null ? 'none' : String(hovered + 1);
      document.body.style.cursor = hovered === null ? '' : 'pointer';
    }
  }

  window.addEventListener('pointermove', (event) => {
    ndc.x = (event.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -((event.clientY / window.innerHeight) * 2 - 1);
    hoverDirty = true;
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    hovered = null;
    applyPanelState();
    document.body.style.cursor = '';
    document.body.dataset.panelHover = 'none';
  });

  window.addEventListener('click', (event) => {
    // only a click on the WebGL canvas counts as "clicking the world" —
    // otherwise closing the case sheet re-triggers the panel underneath
    if (document.body.dataset.case === 'open') return;
    if (!event.target || event.target.id !== 'scene') return;
    if (hovered !== null) onOpenProject(hovered, 'panel');
  });

  function setDim(activeTags = []) {
    dimmed.clear();
    if (activeTags.length === 0 || activeTags.includes('All')) {
      applyPanelState();
      return;
    }
    for (let i = 0; i < featured.length; i += 1) {
      const tags = featured[i].tags || [];
      if (!tags.some((t) => activeTags.includes(t))) dimmed.add(i);
    }
    applyPanelState();
  }

  // ------------------------------------------------------------------ cards
  function measure() {
    for (const card of cards) {
      card.w = card.el.offsetWidth;
      card.h = card.el.offsetHeight;
    }
  }

  function placeCards(activeChapter, width, height) {
    const halfW = width / 2;
    const halfH = height / 2;
    for (const card of cards) {
      const anchor = nodes.get(card.anchorName);
      const isActive = activeChapter === card.chapter;
      if (!anchor || !isActive) {
        card.el.dataset.visible = 'false';
        continue;
      }
      anchor.getWorldPosition(vec);
      vec.project(camera);
      const onScreen = vec.z > -1 && vec.z < 1 && Math.abs(vec.x) < 1.6 && Math.abs(vec.y) < 1.6;
      if (!onScreen) {
        card.el.dataset.visible = 'false';
        continue;
      }
      const margin = 20;
      const w = card.w || 380;
      const h = card.h || 320;
      const x = THREE.MathUtils.clamp(vec.x * halfW + halfW, margin + w / 2, width - margin - w / 2);
      const y = THREE.MathUtils.clamp(-vec.y * halfH + halfH, margin + h / 2, height - margin - h / 2);
      card.el.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0)`;
      card.el.dataset.visible = 'true';
    }
  }

  function update(progress, dt, chapterId) {
    time += dt;
    sample(progress, chapterId);
    frame += 1;
    if (hoverDirty && frame % 2 === 0) {
      hoverDirty = false;
      updateHover();
    }
  }

  function activeChapterAt(progress) {
    for (const chapter of chapters) {
      if (progress >= chapter.start && progress < chapter.end) return chapter;
    }
    return chapters[chapters.length - 1];
  }

  return {
    update,
    placeCards,
    measure,
    setPointer,
    setDim,
    activeChapterAt,
    cards,
    nodes,
    pathCurve,
    lookCurve,
    hovered: () => hovered,
  };
}
