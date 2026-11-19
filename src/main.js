import './styles.css';
import {
  profile,
  skills,
  experience,
  education,
  certifications,
  contact,
  featured,
  more,
  stackFilters,
  chapters,
} from './content.js';
import { createWorld } from './world.js';
import { createStory } from './story.js';
import { createStudio } from './studio.js';
import { createCaseStudy } from './case.js';
import { createAmbience } from './audio.js';
import { fetchStats } from './github.js';

const canvas = document.getElementById('scene');
const loader = document.getElementById('loader');
const loaderFill = document.getElementById('loader-fill');
const loaderPct = document.getElementById('loader-pct');
const rail = document.getElementById('rail');
const toastEl = document.getElementById('toast');

const state = {
  target: 0,
  current: 0,
  activeChapter: null,
  webgl: true,
};

let world = null;
let story = null;
let studio = null;
let caseStudy = null;
const pointerNdc = { x: 0, y: 0 };
const ambience = createAmbience();

/* ------------------------------------------------------------- studio mode */

const studioMode = { active: false, angle: 0, target: 0, centre: null };
const studioBtn = document.getElementById('studio-btn');

function enterStudio() {
  if (!world || !studio) return;
  studioMode.active = true;
  studioMode.angle = 0;
  stopTour(true);
  document.body.dataset.studio = 'open';
  studioBtn.setAttribute('aria-pressed', 'true');
  toast('Step inside — pointer to look, Esc to leave');
}

function exitStudio() {
  if (!studioMode.active) return;
  studioMode.active = false;
  delete document.body.dataset.studio;
  studioBtn.setAttribute('aria-pressed', 'false');
  toast('Back on the roof');
}

studioBtn.addEventListener('click', () => {
  if (studioMode.active) exitStudio();
  else enterStudio();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && studioMode.active) exitStudio();
});

/* ------------------------------------------------------------------ toast */

let toastTimer = 0;
function toast(message, ms = 2600) {
  toastEl.textContent = message;
  toastEl.dataset.show = 'true';
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.dataset.show = 'false';
  }, ms);
}

/* ------------------------------------------------------------ static DOM */

function populate() {
  document.getElementById('skills').innerHTML = skills
    .map((skill) => `<li>${skill}</li>`)
    .join('');

  // avatar: real GitHub photo, hidden when missing
  const avatar = document.getElementById('avatar');
  avatar.dataset.missing = 'false';
  avatar.addEventListener('error', () => {
    avatar.dataset.missing = 'true';
  });
  avatar.src = profile.avatar;

  // Experience / education timelines — render only real content
  const timeline = (title, items) => `
    <h3>${title}</h3>
    ${items
      .map(
        (item) => `
      <div class="exp-item">
        ${item.period ? `<span class="exp-period">${item.period}</span>` : '<span class="exp-period"></span>'}
        <span class="exp-role">${item.role}</span>
        <span class="exp-org">${item.org}</span>
        ${item.note ? `<span class="exp-note">${item.note}</span>` : ''}
      </div>`,
      )
      .join('')}`;

  const exp = document.getElementById('experience');
  if (experience.length) {
    exp.hidden = false;
    exp.innerHTML = timeline('Experience', experience);
  }

  const edu = document.getElementById('education');
  if (education.length) {
    edu.hidden = false;
    edu.innerHTML = timeline('Education', education);
  }

  const certs = document.getElementById('certs');
  if (certifications.length) {
    certs.hidden = false;
    certs.innerHTML = `
      <h3>Certifications</h3>
      <p>${certifications.join(' · ')}</p>`;
  }

  // direct email line under the form
  const direct = document.getElementById('contact-direct');
  if (direct && profile.email) {
    direct.innerHTML = `Or email <a href="mailto:${profile.email}">${profile.email}</a> directly.`;
  }

  const stats = document.getElementById('stats');
  stats.innerHTML = profile.stats
    .map((s) => `<div data-stat="${s.key}"><dt>${s.value}</dt><dd>${s.label}</dd></div>`)
    .join('');

  document.getElementById('stat-source').textContent =
    'Counts from the GitHub profile — refreshing in the background.';

  const list = document.getElementById('project-list');
  list.innerHTML = more
    .map(
      (p) => `
      <li data-tags="${(p.tags || []).join(',')}">
        <a href="${p.live || p.code}" target="_blank" rel="noopener noreferrer">
          <span class="t">${p.title}</span>
          <span class="arrow">↗</span>
          <span class="n">${p.note}</span>
        </a>
      </li>`,
    )
    .join('');

  const filters = document.getElementById('filters');
  filters.innerHTML = stackFilters
    .map(
      (tag, i) =>
        `<li><button type="button" data-filter="${tag}" aria-pressed="${i === 0}">${tag}</button></li>`,
    )
    .join('');
}

const railLabels = [
  { id: 'hero', label: 'Intro' },
  { id: 'about', label: 'About' },
  { id: 'studio', label: 'Studio' },
  { id: 'project-0', label: 'Work' },
  { id: 'more', label: 'More' },
  { id: 'contact', label: 'Contact' },
];

function buildRail() {
  rail.innerHTML = railLabels
    .map(({ id, label }) => {
      const chapter = chapters.find((c) => c.id === id);
      return `<a href="#" data-rail="${id}" data-start="${chapter ? chapter.start : 0}">
        <span>${label}</span><i></i>
      </a>`;
    })
    .join('');

  rail.addEventListener('click', (event) => {
    const link = event.target.closest('[data-rail]');
    if (!link) return;
    event.preventDefault();
    scrollToProgress(Number(link.dataset.start) + 0.004);
  });
}

function scrollToProgress(progress) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: Math.max(0, Math.min(max, progress * max)), behavior: 'smooth' });
}

document.querySelectorAll('[data-goto]').forEach((el) => {
  el.addEventListener('click', (event) => {
    event.preventDefault();
    scrollToProgress(Number(el.dataset.goto));
  });
});

document.querySelectorAll('a[href^="#"]').forEach((el) => {
  if (el.dataset.goto || el.dataset.rail || el.dataset.caseLink) return;
  el.addEventListener('click', (event) => {
    event.preventDefault();
    scrollToProgress(el.getAttribute('href') === '#top' ? 0 : 0.97);
  });
});

/* ------------------------------------------------------------------ tour */

const tour = { active: false, from: 0, started: 0, duration: 52000 };
const tourBtn = document.getElementById('tour-btn');

function startTour() {
  tour.active = true;
  tour.from = state.current;
  tour.started = performance.now();
  tourBtn.setAttribute('aria-pressed', 'true');
  tourBtn.querySelector('.tool-label').textContent = 'Pause';
  tourBtn.querySelector('.tool-icon').textContent = '❚❚';
  toast('Guided tour — scroll or press Esc to take over');
}

function stopTour(silent = false) {
  if (!tour.active) return;
  tour.active = false;
  tourBtn.setAttribute('aria-pressed', 'false');
  tourBtn.querySelector('.tool-label').textContent = 'Tour';
  tourBtn.querySelector('.tool-icon').textContent = '▶';
  if (!silent) toast('Tour paused — the roof is yours');
}

tourBtn.addEventListener('click', () => {
  if (tour.active) stopTour();
  else startTour();
});

['wheel', 'touchstart', 'keydown'].forEach((eventName) => {
  window.addEventListener(
    eventName,
    (event) => {
      if (!tour.active) return;
      if (event.type === 'keydown' && event.key === 'Escape') stopTour();
      else if (event.type !== 'keydown' || ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(event.key)) {
        stopTour(true);
      }
    },
    { passive: true },
  );
});

/* ------------------------------------------------------------------ sound */

const soundBtn = document.getElementById('sound-btn');
soundBtn.addEventListener('click', async () => {
  if (!ambience.supported) {
    toast('This browser has no Web Audio support');
    return;
  }
  const on = soundBtn.getAttribute('aria-pressed') === 'true';
  if (on) {
    ambience.disable();
    soundBtn.setAttribute('aria-pressed', 'false');
    soundBtn.querySelector('.tool-icon').textContent = '◌';
  } else {
    await ambience.enable();
    soundBtn.setAttribute('aria-pressed', 'true');
    soundBtn.querySelector('.tool-icon').textContent = '◉';
    toast('Rooftop ambience on');
  }
});

/* ----------------------------------------------------------------- lights */

const lightBtn = document.getElementById('light-btn');
lightBtn.addEventListener('click', () => {
  if (!world) return;
  const next = world.getMode() === 'night' ? 'dusk' : 'night';
  world.setMode(next);
  lightBtn.querySelector('.tool-label').textContent = next === 'night' ? 'Night' : 'Dusk';
  lightBtn.querySelector('.tool-icon').textContent = next === 'night' ? '☾' : '☀';
  lightBtn.setAttribute('aria-pressed', String(next === 'dusk'));
  toast(next === 'night' ? 'Night falls on the roof' : 'Dusk — the city warms up');
});

/* ---------------------------------------------------------------- filters */

document.getElementById('filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  const tag = button.dataset.filter;
  document
    .querySelectorAll('#filters button')
    .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));

  const active = tag === 'All' ? [] : [tag];
  document.querySelectorAll('#project-list li').forEach((li) => {
    const tags = (li.dataset.tags || '').split(',');
    li.dataset.hidden = String(active.length > 0 && !tags.some((t) => active.includes(t)));
  });
  story?.setDim(active);
});

/* ----------------------------------------------------------------- contact */

const form = document.getElementById('contact-form');
const formNote = document.getElementById('form-note');
formNote.textContent = contact.endpoint
  ? 'Messages go straight to my inbox.'
  : contact.note;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const payload = {
    name: String(data.get('name') || '').trim(),
    email: String(data.get('email') || '').trim(),
    message: String(data.get('message') || '').trim(),
  };

  if (!payload.name || !payload.email || !payload.message) {
    formNote.dataset.state = 'error';
    formNote.textContent = 'Please fill in all three fields.';
    return;
  }

  if (!contact.endpoint) {
    if (!contact.email) {
      formNote.dataset.state = 'error';
      formNote.textContent = 'No form endpoint is configured yet. Reach me on LinkedIn instead.';
      return;
    }
    // no backend: hand the message to the visitor's mail client
    const subject = encodeURIComponent(`Portfolio enquiry from ${payload.name}`);
    const body = encodeURIComponent(`${payload.message}\n\n— ${payload.name} (${payload.email})`);
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
    formNote.dataset.state = 'ok';
    formNote.textContent = 'Opening your mail app with the message ready to send.';
    return;
  }

  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  formNote.dataset.state = '';
  formNote.textContent = 'Sending…';

  try {
    const res = await fetch(contact.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    form.reset();
    formNote.dataset.state = 'ok';
    formNote.textContent = 'Sent — thank you. I usually reply within a day.';
    toast('Message sent');
  } catch (error) {
    formNote.dataset.state = 'error';
    formNote.textContent = `Could not send (${error.message}). Try LinkedIn instead.`;
  } finally {
    submit.disabled = false;
  }
});

/* ------------------------------------------------------------- rendering */

let last = performance.now();
let cardSizesDirty = true;

function chapterAt(progress) {
  for (const chapter of chapters) {
    if (progress >= chapter.start && progress < chapter.end) return chapter;
  }
  return chapters[chapters.length - 1];
}

const sectionEls = [...document.querySelectorAll('#overlay [data-chapter]')];
const railEls = [...rail.querySelectorAll('[data-rail]')];

function applyChapter(chapter) {
  if (state.activeChapter === chapter.id) return;
  state.activeChapter = chapter.id;
  for (const el of sectionEls) {
    el.dataset.active = String(el.dataset.chapter === chapter.id);
  }
  for (const el of railEls) {
    el.dataset.active = String(el.dataset.rail === chapter.id);
  }
}

function progressNow() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, window.scrollY / max));
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (world && story) {
    if (tour.active) {
      const elapsed = (now - tour.started) / tour.duration;
      const p = Math.min(1, tour.from + (1 - tour.from) * elapsed);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // "instant" matters: the stylesheet sets smooth scrolling, and a smooth
      // scroll restarted every frame never actually moves
      window.scrollTo({ top: p * max, behavior: 'instant' });
      if (p >= 1) {
        stopTour(true);
        toast('End of the tour — say hello below');
      }
    }

    state.target = progressNow();
    const damping = world.prefersReduced || tour.active ? 1 : 0.085;
    state.current += (state.target - state.current) * damping;

    const chapter = chapterAt(state.current);

    if (studioMode.active) {
      // slow orbit inside the pavilion, nudged by the pointer
      studioMode.angle += dt * 0.16;
      const angle = studioMode.angle + pointerNdc.x * 0.55;
      const radius = 3.0 + pointerNdc.y * 0.45;
      world.camera.position.set(
        9 + Math.sin(angle) * radius,
        1.72 + pointerNdc.y * 0.3,
        -7 + Math.cos(angle) * radius,
      );
      world.camera.lookAt(9, 1.7, -7);
    } else {
      story.update(state.current, dt, chapter.id);
      applyChapter(chapter);

      if (cardSizesDirty) {
        story.measure();
        cardSizesDirty = false;
      }
      story.placeCards(chapter.id, window.innerWidth, window.innerHeight);
    }

    studio?.update(now / 1000, dt, world.camera);

    world.tickQuality(now);
    world.animateAgent(now / 1000);
    world.render();
  }

  requestAnimationFrame(loop);
}

/* ----------------------------------------------------------------- input */

window.addEventListener(
  'pointermove',
  (event) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -((event.clientY / window.innerHeight) * 2 - 1);
    pointerNdc.x = x;
    pointerNdc.y = y;
    story?.setPointer(x, y);
    world?.setCursor(x, y);
  },
  { passive: true },
);

window.addEventListener('resize', () => {
  cardSizesDirty = true;
  world?.resize();
});

window.addEventListener('world:lost', () => {
  toast('Graphics context lost — reload to re-enter the roof', 6000);
});

/* ------------------------------------------------------------------ boot */

function setLoader(value) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  loaderFill.style.width = `${pct}%`;
  loaderPct.textContent = String(pct);
}

async function refreshStats() {
  const data = await fetchStats();
  if (!data) {
    document.getElementById('stat-source').textContent =
      'Counts from the public GitHub profile.';
    return;
  }
  const reposEl = document.querySelector('[data-stat="repos"] dt');
  const liveEl = document.querySelector('[data-stat="live"] dt');
  if (reposEl && data.repos) reposEl.textContent = String(data.repos);
  if (liveEl && data.live) liveEl.textContent = `${data.live}+`;
  document.getElementById('stat-source').textContent = data.cached
    ? 'Live from GitHub (cached copy).'
    : 'Live from GitHub, refreshed just now.';
}

async function boot() {
  populate();
  buildRail();
  setLoader(0.05);

  caseStudy = createCaseStudy({
    onOpen: () => stopTour(true),
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-case-link]');
    if (!link) return;
    event.preventDefault();
    caseStudy.open(link.dataset.caseLink);
  });

  try {
    world = createWorld(canvas, {
      onProgress: (p) => setLoader(0.05 + p * 0.85),
    });
    await world.ready;
    setLoader(1);

    story = createStory({
      camera: world.camera,
      nodes: world.nodes,
      featured,
      chapters,
      panels: world.panels,
      panelMeshes: world.panelMeshes,
      reduced: world.prefersReduced,
      onOpenProject: (index) => {
        const project = featured[index];
        if (project) caseStudy.open(project.id);
      },
    });

    story.measure();
    cardSizesDirty = false;
    story.setPointer(0, 0);

    studio = createStudio({
      scene: world.scene,
      nodes: world.nodes,
      featured,
      more,
    });

    window.__portfolio = {
      jump(progress) {
        state.target = progress;
        state.current = progress;
      },
      snap() {
        return {
          progress: state.current,
          chapter: state.activeChapter,
          camera: world.camera.position.toArray().map((n) => Number(n.toFixed(2))),
          mode: world.getMode(),
        };
      },
      openCase: (id) => caseStudy.open(id),
      world,
      story,
    };

    document.body.dataset.ready = 'true';
    setTimeout(() => {
      loader.dataset.done = 'true';
    }, 350);

    refreshStats();
  } catch (error) {
    console.error('[portfolio] WebGL boot failed:', error);
    document.body.dataset.webgl = 'false';
    state.webgl = false;
    loader.dataset.done = 'true';
    sectionEls.forEach((el) => {
      el.dataset.active = 'true';
    });
  }

  last = performance.now();
  requestAnimationFrame(loop);
}

boot();
