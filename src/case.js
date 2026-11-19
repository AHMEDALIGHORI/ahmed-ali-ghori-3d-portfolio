import { featured } from './content.js';

/**
 * Case-study sheet: opened from a 3D panel, a card, or the URL hash
 * (#/work/<id>) so every project is directly shareable.
 */
export function createCaseStudy({ onOpen, onClose } = {}) {
  const root = document.getElementById('case');
  const el = {
    index: document.getElementById('case-index'),
    year: document.getElementById('case-year'),
    title: document.getElementById('case-title'),
    tagline: document.getElementById('case-tagline'),
    summary: document.getElementById('case-summary'),
    role: document.getElementById('case-role'),
    highlights: document.getElementById('case-highlights'),
    metrics: document.getElementById('case-metrics'),
    stack: document.getElementById('case-stack'),
    links: document.getElementById('case-links'),
    image: document.getElementById('case-image'),
    fallback: document.getElementById('case-fallback'),
  };

  let currentId = null;
  let lastFocused = null;

  const byId = (id) => featured.find((p) => p.id === id);

  function fill(project) {
    el.index.textContent = `${project.index} / 04 — case study`;
    el.year.textContent = project.year;
    el.title.textContent = project.title;
    el.tagline.textContent = project.tagline;
    el.summary.textContent = project.caseStudy?.summary || project.body;
    el.role.textContent = project.caseStudy?.role ? `Role — ${project.caseStudy.role}` : '';

    el.highlights.innerHTML = (project.caseStudy?.highlights || [])
      .map((item) => `<li>${item}</li>`)
      .join('');

    el.metrics.innerHTML = (project.caseStudy?.metrics || [])
      .map((m) => `<div><dt>${m.value}</dt><dd>${m.label}</dd></div>`)
      .join('');

    el.stack.innerHTML = (project.caseStudy?.stack || project.stack)
      .map((s) => `<li>${s}</li>`)
      .join('');

    el.links.innerHTML = [
      project.live
        ? `<a href="${project.live}" target="_blank" rel="noopener noreferrer">Visit live site ↗</a>`
        : '',
      `<a href="${project.code}" target="_blank" rel="noopener noreferrer">Read the code ↗</a>`,
    ]
      .filter(Boolean)
      .join('');

    el.fallback.textContent = project.title.slice(0, 2).toUpperCase();
    el.image.dataset.missing = 'false';
    el.image.alt = `${project.title} — live site preview`;
    el.image.onerror = () => {
      el.image.dataset.missing = 'true';
    };
    el.image.src = project.image || '';
  }

  function open(id, { push = true } = {}) {
    const project = byId(id);
    if (!project) return false;
    fill(project);
    lastFocused = document.activeElement;
    root.hidden = false;
    document.body.dataset.case = 'open';
    currentId = id;
    if (push) {
      const hash = `#/work/${id}`;
      if (location.hash !== hash) history.pushState({ case: id }, '', hash);
    }
    root.querySelector('.case-close')?.focus();
    onOpen?.(id);
    return true;
  }

  function close({ pop = true } = {}) {
    if (root.hidden) return;
    root.hidden = true;
    delete document.body.dataset.case;
    currentId = null;
    if (pop && location.hash.startsWith('#/work/')) {
      history.pushState({}, '', `${location.pathname}${location.search}`);
    }
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
    onClose?.();
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-case-close]')) close();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  window.addEventListener('popstate', () => {
    const match = location.hash.match(/^#\/work\/([\w-]+)$/);
    if (match) open(match[1], { push: false });
    else close({ pop: false });
  });

  window.addEventListener('hashchange', () => {
    const match = location.hash.match(/^#\/work\/([\w-]+)$/);
    if (match) open(match[1], { push: false });
  });

  const initial = location.hash.match(/^#\/work\/([\w-]+)$/);
  if (initial) setTimeout(() => open(initial[1], { push: false }), 600);

  return { open, close, isOpen: () => currentId !== null, current: () => currentId };
}
