/**
 * Refresh the baked GitHub numbers in src/content.js.
 *
 *   node scripts/update-stats.mjs
 *
 * The site also fetches these live in the browser (with a 30 minute cache), so
 * this is only needed when you want the source values to match reality too.
 */
import { readFile, writeFile } from 'node:fs/promises';

const USER = 'AHMEDALIGHORI';
const FILE = new URL('../src/content.js', import.meta.url);

const [user, repos] = await Promise.all([
  fetch(`https://api.github.com/users/${USER}`).then((r) => r.json()),
  fetch(`https://api.github.com/users/${USER}/repos?per_page=100`).then((r) => r.json()),
]);

if (!user || user.message) {
  console.error('GitHub API said:', user?.message || 'no data');
  process.exit(1);
}

const live = repos.filter((r) => r.homepage).length;
const text = await readFile(FILE, 'utf8');

const next = text
  .replace(/(key: 'repos', value: ')[^']*(')/, `$1${user.public_repos}$2`)
  .replace(/(key: 'live', value: ')[^']*(')/, `$1${live}+$2`);

await writeFile(FILE, next);
console.log(`stats updated — repos ${user.public_repos}, live deployments ${live}`);
