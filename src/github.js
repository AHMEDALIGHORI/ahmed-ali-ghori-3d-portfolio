/**
 * Live GitHub numbers with a 30-minute cache, so the portfolio's stats never go
 * stale. Returns null on rate limiting or offline — the baked values stay.
 */
const USER = 'AHMEDALIGHORI';
const CACHE_KEY = 'aag:github:v1';
const TTL = 1000 * 60 * 30;

export async function fetchStats() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.at < TTL) {
      return { ...cached.data, cached: true };
    }
  } catch {
    /* ignore malformed cache */
  }

  try {
    const [user, repos] = await Promise.all([
      fetch(`https://api.github.com/users/${USER}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`).then((r) =>
        r.ok ? r.json() : [],
      ),
    ]);
    if (!user) return null;

    const live = Array.isArray(repos) ? repos.filter((repo) => repo.homepage).length : 0;
    const data = {
      repos: user.public_repos,
      live,
      followers: user.followers,
      updated: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
    return { ...data, cached: false };
  } catch {
    return null;
  }
}
