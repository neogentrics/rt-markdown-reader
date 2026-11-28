// The shared theme (recon-theme): the copies under src/renderer/shared are exactly what theme.lock says, and they are what
// the app really loads. Nothing here reaches for the other repository: it's private, and CI has no access.
// The copy-and-check logic itself is tested in core.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { THEME, sync, verify } from '../scripts/theme-sync.mjs';

const root = path.join(import.meta.dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, THEME.lock), 'utf8'));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('theme: the shared files here are exactly what theme.lock says, taken in at a tag', () => {
  assert.deepEqual(verify(root), []);
  assert.equal(lock.source, 'neogentrics/recon-theme');
  assert.match(lock.tag, /^v\d+\.\d+\.\d+$/);
  assert.match(lock.commit, /^[0-9a-f]{40}$/);
  assert.deepEqual(Object.keys(lock.pieces.theme.files), ['brand.js', 'glass.css', 'metallic.css', 'theme.css']);
});

test('theme: an edited, missing or added file is caught', () => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-drift-'));
  fs.cpSync(path.join(root, THEME.into), path.join(copy, THEME.into), { recursive: true });
  for (const f of [THEME.lock, 'package.json']) fs.cpSync(path.join(root, f), path.join(copy, f));
  assert.deepEqual(verify(copy), [], 'the copy starts clean');
  const file = path.join(copy, THEME.into, 'theme', 'metallic.css');
  const original = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, original.replace('.14', '.15'));                       // one shade a little stronger
  assert.ok(verify(copy).some((p) => /metallic\.css was changed here: change it in neogentrics\/recon-theme/.test(p)));
  fs.rmSync(file);
  assert.ok(verify(copy).some((p) => /metallic\.css is missing/.test(p)));
  fs.writeFileSync(file, original);
  fs.writeFileSync(path.join(copy, THEME.into, 'theme', 'mine.css'), '.toolbar {}');
  assert.ok(verify(copy).some((p) => p.includes(`theme/mine.css isn’t in ${THEME.lock}`)));
});

test('theme: the app loads the shared copy, in order, and has no other copy beside it', () => {
  const app = [...read('src/renderer/styles/app.css').matchAll(/@import '([^']+)';/g)].map((m) => m[1]);
  const at = (name) => app.indexOf(`../shared/theme/${name}.css`);
  assert.ok(at('theme') >= 0 && at('theme') < at('glass') && at('glass') < at('metallic'), 'theme, then glass, then metallic');
  assert.ok(app.indexOf('./ui.css') > at('theme') && app.indexOf('./ui.css') < at('glass'), 'the app’s own base styles sit between the themes and the looks');
  assert.match(read('src/renderer/styles/export.css'), /@import '\.\.\/shared\/theme\/theme\.css';/);
  assert.match(read('src/renderer/theme-ui.js'), /from '\.\/shared\/theme\/brand\.js';/);
  // A new file under an old name would be loaded by nobody the lock checks.
  const strays = fs.readdirSync(path.join(root, 'src'), { recursive: true }).map((f) => `src/${String(f).split(path.sep).join('/')}`)
    .filter((f) => /\/(theme\.css|glass\.css|metallic\.css|brand\.js)$/.test(f) && !f.startsWith(`${THEME.into}/`));
  assert.deepEqual(strays, []);
});

test('theme: theme-sync copies a tag into its own folder and writes theme.lock, leaving the shared code alone', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-script-'));
  const repo = path.join(dir, 'recon-theme');
  const app = path.join(dir, 'app');
  const git = (...args) => execFileSync('git', ['-C', repo, '-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], { stdio: 'pipe' });
  fs.mkdirSync(path.join(repo, 'theme'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'modules.json'), JSON.stringify({ theme: { files: ['theme.css'] } }));
  fs.writeFileSync(path.join(repo, 'theme', 'theme.css'), ':root {}\n');
  git('init', '-q', '-b', 'main');
  git('add', '-A');
  git('commit', '-q', '-m', 'first');
  git('tag', 'v1.0.0');
  fs.mkdirSync(path.join(app, 'src/main/core'), { recursive: true });
  fs.writeFileSync(path.join(app, 'src/main/core', 'keep.js'), 'x');
  fs.writeFileSync(path.join(app, 'package.json'), '{}');

  assert.deepEqual(sync({ root: app, tag: 'v1.0.0', source: repo }).problems, []);
  assert.equal(fs.readFileSync(path.join(app, 'src/renderer/shared/theme/theme.css'), 'utf8'), ':root {}\n');
  assert.equal(JSON.parse(fs.readFileSync(path.join(app, 'theme.lock'), 'utf8')).source, 'neogentrics/recon-theme');
  assert.equal(fs.existsSync(path.join(app, 'core.lock')), false);
  assert.equal(fs.readFileSync(path.join(app, 'src/main/core', 'keep.js'), 'utf8'), 'x');
});
