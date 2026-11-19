/**
 * Publish the built site to the `gh-pages` branch.
 *
 *   pnpm build && pnpm deploy
 *
 * This is the fallback for accounts where GitHub Actions is unavailable
 * (for example, a billing hold). It builds nothing itself — `pnpm build`
 * must have produced `dist/` first.
 */
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');

if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/ is missing — run `pnpm build` first.');
  process.exit(1);
}

const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).trim();
const git = (args, cwd) =>
  execFileSync('git', args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });

const work = await mkdtemp(path.join(tmpdir(), 'gh-pages-'));
try {
  await cp(dist, work, { recursive: true });
  await writeFile(path.join(work, '.nojekyll'), '');

  git(['init', '-q'], work);
  git(['checkout', '-q', '-b', 'gh-pages'], work);
  git(['add', '-A'], work);
  git(
    [
      '-c',
      'user.name=Ahmed Ali Ghori',
      '-c',
      'user.email=AHMEDALIGHORI@users.noreply.github.com',
      'commit',
      '-q',
      '-m',
      `Deploy ${new Date().toISOString()}`,
    ],
    work,
  );
  git(['remote', 'add', 'origin', remote], work);
  git(['push', '-f', 'origin', 'gh-pages'], work);

  const repo = remote.replace(/^.*github\.com[:/]/, '').replace(/\.git$/, '');
  const [owner, name] = repo.split('/');
  console.log(`\nDeployed → https://${owner}.github.io/${name}/`);
} finally {
  await rm(work, { recursive: true, force: true });
}
