// Your apps at a glance (3.14): the shared list and words, the installed list, the latest versions, the panel's rows, and
// App Link's status and compatibility.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const suite = require('../src/main/suite-apps.js');
const installed = require('../src/main/installed.js');
const { Versions, DAY_MS, FAILED_MS, VERSIONS_URL } = require('../src/main/suite-versions.js');
const { appRows } = require('../src/main/apps-list.js');
const link = require('../src/main/app-link.js');

const temp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `nmr-${name}-`));
const posix = process.platform !== 'win32';

test('apps: the suite list and the states are as docs/app-suite.md says', () => {
  const doc = fs.readFileSync(new URL('../docs/app-suite.md', import.meta.url), 'utf8');
  for (const app of suite.SUITE_APPS) {
    assert.ok(doc.includes(`| \`${app.id}\` | ${app.name} | ${app.about} |`), `${app.name} is in the shared list in the docs`);
    assert.match(app.page, /^https:\/\/recontowers\.com\//);
  }
  assert.deepEqual(Object.values(suite.STATES).map((s) => [s.words, s.button]), [['Linked', 'Open'], ['Found, not linked', 'Link'], ['Installed, not running', 'Open'], ['Not installed', 'Get it']]);
  assert.equal(suite.stateOf({ linked: true }), 'linked', 'a linked app is Linked, open or not');
  assert.equal(suite.stateOf({ running: true, installed: true }), 'found');
  assert.equal(suite.stateOf({ installed: true }), 'installed');
  assert.equal(suite.stateOf({}), 'missing');
});

test('apps: the dot is off, green, amber or grey', () => {
  assert.equal(suite.dotOf({ on: false, apps: [{ linked: true }] }), 'off');
  assert.equal(suite.dotOf({ on: true, apps: [{ installed: true }, { linked: true }] }), 'green');
  assert.equal(suite.dotOf({ on: true, apps: [{ running: true }] }), 'amber');
  assert.equal(suite.dotOf({ on: true, apps: [{ installed: true }] }), 'amber');
  assert.equal(suite.dotOf({ on: true, apps: [{}] }), 'grey');
});

test('apps: only the App Link version and the formats decide whether two apps can link, never their own versions', () => {
  const mine = { protocol: 1, minProtocol: 1, accepts: ['markdown', 'text'] };
  assert.deepEqual(suite.linkability({ mine, theirs: { protocol: 1, accepts: ['markdown'], version: '0.0.1' } }), { ok: true });
  assert.deepEqual(suite.linkability({ mine, theirs: { protocol: 2, minProtocol: 2 } }), { ok: false, who: 'us' });
  assert.deepEqual(suite.linkability({ mine: { ...mine, protocol: 3, minProtocol: 2 }, theirs: { protocol: 1 } }), { ok: false, who: 'them' });
  assert.deepEqual(suite.linkability({ mine, theirs: { protocol: 1, accepts: ['audio'] } }), { ok: false, who: 'them' });
  assert.deepEqual(suite.linkability({ mine, theirs: { protocol: 1, accepts: [] } }), { ok: true });
  assert.equal(suite.isNewer('3.10.0', '3.9.9'), true);
  assert.equal(suite.isNewer('3.9.0', '3.9.0'), false);
  assert.equal(suite.isNewer('99.0.0-beta', '1.0.0'), false, 'only a plain version number is ever newer');
  assert.equal(suite.updateButton({ platform: 'win32', installer: true }), 'open');
  assert.equal(suite.updateButton({ platform: 'win32', installer: true, running: true }), '');
  assert.equal(suite.updateButton({ platform: 'win32' }), 'download', 'a portable copy');
  assert.equal(suite.updateButton({ platform: 'linux', launch: '/apps/X.AppImage' }), 'open');
  assert.equal(suite.updateButton({ platform: 'linux', launch: '/opt/X/x' }), 'download');
  assert.equal(suite.updateButton({ platform: 'darwin' }), 'download');
});

test('apps: every word the panel and the toolbar can show is translated into Spanish, French and German', () => {
  const fromList = [...Object.values(suite.STATES).flatMap((s) => [s.words, s.button]), ...suite.SUITE_APPS.map((a) => a.about),
    suite.UPDATE.open, suite.UPDATE.download, `${suite.UPDATE.unreachable}.`, `${suite.UPDATE.needs}: this app.`, `${suite.UPDATE.needs}: {0}.`, `${suite.UPDATE.available}: you have {0}, the latest is {1}`,
    ...Object.values(suite.DOTS).map((words) => `${suite.TITLE}: ${words}`), suite.TITLE];
  const ours = ['Open {0}', 'Link {0}', 'Get it: {0}', 'Download {0}', 'Open to update: {0}', 'Remove the link to {0}', 'Remove', 'Refresh', 'Turn on', 'App Link Settings…', 'Recon Towers Apps…',
    'Answer in {0}', 'Starting {0}…', 'This computer has no safe place to keep links, so they last until the app closes.',
    'App Link is off, so no other app can find this one and none can be linked.',
    'That app isn’t where it was installed any more.', 'That app wouldn’t start.', 'This app only starts the Recon Towers apps.', 'That app isn’t known.'];
  // The paragraph under the dialog's title, read from the page itself so it can't drift from its translations.
  const html = fs.readFileSync(new URL('../src/renderer/index.html', import.meta.url), 'utf8');
  const intro = /id="apps-h"[\s\S]*?<p class="hint-text">([^<]+)<\/p>/.exec(html)[1];
  for (const code of ['es', 'fr', 'de']) {
    const dict = require(`../src/locales/${code}.json`);
    // An exact entry: a looser pattern elsewhere in the dictionary must not count as a translation.
    const missing = [...fromList, ...ours, intro].filter((s) => !Object.hasOwn(dict, s));
    assert.deepEqual(missing, [], `${code} is missing some`);
  }
});

test('installed: an app writes its file, and others read it while its program is still there', () => {
  const dir = temp('installed');
  const program = path.join(dir, posix ? 'reader' : 'reader.exe');
  fs.writeFileSync(program, 'x', { mode: 0o755 });
  assert.equal(installed.writeInstalled(dir, { id: 'rt-press', name: 'RT Press', version: '1.0.0', launch: program }), true);
  const file = path.join(dir, 'installed', 'rt-press.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { id: 'rt-press', name: 'RT Press', version: '1.0.0', launch: program, protocol: 1 });
  const [entry] = installed.readInstalled(dir);
  assert.equal(entry.known, true);
  assert.equal(entry.minProtocol, 1);
  assert.equal(installed.writeInstalled(dir, { id: 'rt-press', name: 'RT Press', version: '1.0.0', launch: 'reader' }), false, 'only a full path');
  assert.equal(installed.writeInstalled(dir, { id: '../x', name: 'X', version: '1', launch: program }), false);
  fs.rmSync(program);
  assert.deepEqual(installed.readInstalled(dir), [], 'a file left behind by an uninstall is ignored');
  assert.ok(fs.existsSync(file), 'and left where it is: it belongs to the other app');
});

test('installed: files that lie, are broken or point at another computer are ignored', () => {
  const dir = temp('installed-bad');
  fs.mkdirSync(path.join(dir, 'installed'));
  const put = (name, value) => fs.writeFileSync(path.join(dir, 'installed', name), typeof value === 'string' ? value : JSON.stringify(value));
  const program = process.execPath;
  put('rt-press.json', { id: 'rt-author-desk', name: 'Someone else', launch: program, protocol: 1 });
  put('broken.json', '{ not json');
  put('relative.json', { id: 'relative', launch: 'bin/app', protocol: 1 });
  put('no-protocol.json', { id: 'no-protocol', launch: program });
  put('huge.json', `{"id":"huge","launch":${JSON.stringify(program)},"protocol":1,"x":"${'a'.repeat(20000)}"}`);
  put('stranger.json', { id: 'stranger', name: 'Stra\u202enger\u0007', launch: program, protocol: 7, version: '1.0.0' });
  const found = installed.readInstalled(dir);
  assert.deepEqual(found.map((a) => [a.id, a.name, a.known, a.protocol]), [['stranger', 'Stranger', false, 7]]);
  let looked = 0;
  for (const away of ['\\\\server\\share\\app.exe', '//server/share/app.exe']) {
    put('rt-press.json', { id: 'rt-press', launch: away, protocol: 1 });
    for (const platform of ['win32', 'linux', 'darwin']) {
      assert.equal(installed.readInstalled(dir, { platform, exists: (p) => { if (p === away) looked++; return true; } }).some((a) => a.id === 'rt-press'), false);
    }
  }
  assert.equal(looked, 0, 'a path to another computer is never even looked at');
});

test('installed: only a real program of the suite’s own is started, with no arguments and no shell', async () => {
  const dir = temp('launch');
  const program = path.join(dir, posix ? 'press' : 'press.exe');
  fs.writeFileSync(program, 'x', { mode: 0o755 });
  const calls = [];
  const start = (command, args, options) => { calls.push({ command, args, options }); const child = new EventEmitter(); child.unref = () => {}; queueMicrotask(() => child.emit('spawn')); return child; };
  await installed.launchInstalled({ id: 'rt-press', launch: program, known: true }, { start });
  assert.deepEqual(calls[0], { command: program, args: [], options: { detached: true, stdio: 'ignore', shell: false } });
  await assert.rejects(installed.launchInstalled({ id: 'stranger', launch: program, known: false }, { start }), /only starts the Recon Towers apps/);
  await assert.rejects(installed.launchInstalled({ id: 'rt-press', launch: path.join(dir, 'gone'), known: true }, { start }), /isn’t where it was installed/);
  await assert.rejects(installed.launchInstalled({ id: 'rt-press', launch: dir, known: true }, { start }), /isn’t where it was installed/, 'a folder is not a program');
  if (posix) {
    const text = path.join(dir, 'notes');
    fs.writeFileSync(text, 'x', { mode: 0o644 });
    await assert.rejects(installed.launchInstalled({ id: 'rt-press', launch: text, known: true }, { start }), /isn’t where it was installed/, 'a file that can’t be run');
    const bundle = path.join(dir, 'RT Press.app');
    fs.mkdirSync(bundle);
    await installed.launchInstalled({ id: 'rt-press', launch: bundle, known: true }, { platform: 'darwin', start });
    assert.deepEqual([calls.at(-1).command, calls.at(-1).args], ['open', ['-a', bundle]]);
  }
  assert.equal(calls.length, posix ? 2 : 1);
  await assert.rejects(installed.launchInstalled({ id: 'rt-press', launch: program, known: true }, { start: () => { throw new Error('no'); } }), /wouldn’t start/);
});

test('installed: the path that starts this app is the one the person runs', () => {
  assert.equal(installed.launchPathFor({ platform: 'linux', execPath: '/tmp/.mount_x/reader', env: { APPIMAGE: '/home/a/Reader.AppImage' } }), '/home/a/Reader.AppImage');
  assert.equal(installed.launchPathFor({ platform: 'win32', execPath: 'C:\\Temp\\unpacked\\Reader.exe', env: { PORTABLE_EXECUTABLE_FILE: 'D:\\Reader-Portable.exe' } }), 'D:\\Reader-Portable.exe');
  assert.equal(installed.launchPathFor({ platform: 'darwin', execPath: '/Applications/RT Markdown Reader.app/Contents/MacOS/RT Markdown Reader', env: {} }), '/Applications/RT Markdown Reader.app');
  assert.equal(installed.launchPathFor({ platform: 'win32', execPath: 'C:\\Programs\\Reader\\Reader.exe', env: {} }), 'C:\\Programs\\Reader\\Reader.exe');
  assert.equal(installed.fromInstaller('C:/x/Reader.exe', () => ['Reader.exe', 'Uninstall RT Markdown Reader.exe']), true);
  assert.equal(installed.fromInstaller('C:/x/Reader.exe', () => ['Reader.exe']), false);
});

/** A stand-in for the versions file: counts what's asked, and how. */
function site(answers) {
  const asked = [];
  const fetch = async (url, options) => {
    asked.push({ url, options });
    const next = answers.length > 1 ? answers.shift() : answers[0];
    if (next === 'offline') throw new Error('offline');
    return { ok: next.status === 200, status: next.status, text: async () => next.body || '' };
  };
  return { asked, fetch };
}
const good = { status: 200, body: JSON.stringify({ apps: {
  'rt-press': { version: '1.2.0', url: 'https://recontowers.com/apps/rt-press/' },
  'rt-author-desk': { version: '1.3.0', url: 'https://evil.example/recontowers.com' },
  'rt-story-tracker': { version: 'latest' }, '../x': { version: '1.0.0' },
} }) };

test('versions: a plain request with nothing added, and only version numbers and pages on our own site are kept', async () => {
  const s = site([good]);
  const v = new Versions({ fetch: s.fetch });
  const answer = await v.check();
  assert.equal(answer.state, 'ok');
  assert.deepEqual(answer.apps, { 'rt-press': { version: '1.2.0', url: 'https://recontowers.com/apps/rt-press/' }, 'rt-author-desk': { version: '1.3.0' } });
  assert.equal(s.asked[0].url, VERSIONS_URL);
  assert.equal(new URL(VERSIONS_URL).search, '');
  const { signal, ...options } = s.asked[0].options;
  assert.deepEqual(options, { method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' }, 'no body, no headers of ours');
  assert.ok(signal);
});

test('versions: kept for a day (an hour after a failure), Refresh asks again, and remembering survives a restart', async () => {
  let time = 1_000_000;
  const file = path.join(temp('versions'), 'v.json');
  const s = site([good]);
  const v = new Versions({ fetch: s.fetch, file, now: () => time });
  await v.check();
  await v.check();
  assert.equal(s.asked.length, 1, 'kept');
  time += DAY_MS - 1;
  await v.check();
  assert.equal(s.asked.length, 1);
  await new Versions({ fetch: s.fetch, file, now: () => time }).check();
  assert.equal(s.asked.length, 1, 'remembered after the app closed');
  time += 2;
  await v.check();
  assert.equal(s.asked.length, 2, 'asked again after a day');
  await v.check({ force: true });
  assert.equal(s.asked.length, 3, 'Refresh');

  const down = site(['offline']);
  const off = new Versions({ fetch: down.fetch, now: () => time });
  assert.equal((await off.check()).state, 'unreachable');
  time += FAILED_MS - 1;
  await off.check();
  assert.equal(down.asked.length, 1);
  time += 2;
  await off.check();
  assert.equal(down.asked.length, 2);
});

test('versions: a file that isn’t published, is too big or isn’t JSON is just unavailable; a server error is unreachable', async () => {
  for (const [answer, state] of [[{ status: 404 }, 'unavailable'], [{ status: 410 }, 'unavailable'], [{ status: 200, body: 'x'.repeat(70_000) }, 'unavailable'], [{ status: 200, body: '<html>' }, 'unavailable'], [{ status: 500 }, 'unreachable']]) {
    const got = await new Versions({ fetch: site([answer]).fetch }).check();
    assert.deepEqual([got.state, got.apps], [state, {}], JSON.stringify(answer).slice(0, 40));
  }
});

test('rows: the whole suite is listed, with the one button that fits each, and an update is only a nudge', () => {
  const mine = { protocol: 1, minProtocol: 1, accepts: ['markdown', 'text'] };
  const rows = appRows({
    self: 'rt-markdown-reader', mine, platform: 'linux',
    installed: [{ id: 'rt-author-desk', name: 'RT Author Desk', version: '1.2.0', launch: '/apps/Desk.AppImage', protocol: 1, minProtocol: 1 },
      { id: 'rt-markdown-reader', name: 'me', version: '3.14.0', launch: '/x', protocol: 1 }],
    running: [{ id: 'rt-press', name: 'RT Press', version: '1.0.0', protocol: 2, minProtocol: 2, accepts: ['markdown'] },
      { id: 'stranger', name: 'Stranger', version: '1.0.0', protocol: 1, minProtocol: 1, accepts: ['markdown'] }],
    links: { 'rt-story-tracker': { name: 'RT Story Tracker', key: 'secret' } },
    latest: { 'rt-author-desk': { version: '1.3.0' }, 'rt-story-tracker': { version: '9.0.0' } },
  });
  assert.deepEqual(rows.map((r) => r.id), ['rt-story-tracker', 'rt-author-desk', 'rt-press', 'rt-audio-studio', 'recon-browser', 'stranger'], 'in the suite’s order, without itself, strangers last');
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.deepEqual([by['rt-story-tracker'].state, by['rt-story-tracker'].canOpen, by['rt-story-tracker'].canGet, by['rt-story-tracker'].update], ['linked', false, false, null], 'no version known, so no nudge');
  assert.deepEqual([by['rt-author-desk'].state, by['rt-author-desk'].canOpen, by['rt-author-desk'].update], ['installed', true, { have: '1.2.0', latest: '1.3.0', action: 'open' }]);
  assert.deepEqual([by['rt-press'].state, by['rt-press'].canLink, by['rt-press'].needsUpdate], ['found', false, 'us']);
  assert.deepEqual([by['rt-audio-studio'].state, by['rt-audio-studio'].canGet], ['missing', true]);
  assert.deepEqual([by.stranger.state, by.stranger.canLink, by.stranger.canOpen, by.stranger.canGet], ['found', true, false, false], 'an app outside the suite is never started or fetched');
  assert.ok(!JSON.stringify(rows).includes('secret') && !JSON.stringify(rows).includes('/apps/'), 'no keys and no paths go to the page');
});

test('App Link: status is only for a linked app, says nothing when idle, and never more than a short clean line', async () => {
  const dir = temp('status');
  let answer = { state: 'open', line: 'Open: “story.md”' };
  let links = { 'rt-press': { name: 'RT Press', key: 'k'.repeat(64) } };
  const server = new link.AppLink({ folder: path.join(dir, 'shared'), dataDir: dir, version: '3.14.0', load: () => links, save: (l) => { links = l; }, ask: async () => false, open: async () => {}, status: () => answer });
  const ask = (params) => server.handle('status', params);
  assert.throws(() => ask({ app: 'rt-press', key: 'wrong' }), (e) => e.code === 'not_linked');
  assert.throws(() => ask({ app: 'rt-audio-studio', key: 'k'.repeat(64) }), (e) => e.code === 'not_linked');
  const me = { app: 'rt-press', key: 'k'.repeat(64) };
  assert.deepEqual(ask(me), { state: 'open', line: 'Open: “story.md”' });
  answer = { state: 'busy', line: `  Exporting\u202e audio\u0007 ${'x'.repeat(200)}` };
  assert.equal(ask(me).line.length, 80);
  assert.ok(!/[\u202e\u0007]/.test(ask(me).line));
  answer = { state: 'idle', line: 'must not be said' };
  assert.deepEqual(ask(me), { state: 'idle' }, 'a locked document answers idle, and nothing more');
  answer = { state: 'something else', line: 'x' };
  assert.deepEqual(ask(me), { state: 'idle' });
  assert.deepEqual(server.handle('hello', {}), { protocol: 1, minProtocol: 1, app: 'rt-markdown-reader', name: 'RT Markdown Reader', version: '3.14.0', accepts: ['markdown', 'text'] });
});

test('App Link: two apps ask each other what they’re doing; an app on a newer protocol is still seen', async () => {
  const dir = temp('two');
  const shared = path.join(dir, 'shared');
  const links = { a: {} };
  const reader = new link.AppLink({ folder: shared, dataDir: path.join(dir, 'a'), version: '3.14.0', load: () => links.a, save: (l) => { links.a = l; }, ask: async () => true, open: async () => {}, status: () => ({ state: 'open', line: 'Open: “a.md”' }) });
  fs.mkdirSync(path.join(dir, 'a'));
  fs.mkdirSync(path.join(dir, 'b'));
  // Another app: the same protocol code under another name, answering as a newer version would.
  const net = require('node:net');
  const endpoint = link.endpointFor(path.join(dir, 'b'));
  const other = net.createServer((sock) => sock.on('data', (d) => {
    const req = JSON.parse(String(d).trim());
    const result = req.method === 'hello' ? { protocol: 2, minProtocol: 2, app: 'rt-press', name: 'RT Press', version: '9.0.0', accepts: ['markdown'] } : req.method === 'status' ? { state: 'busy', line: 'Setting a book' } : null;
    sock.write(`${JSON.stringify(result ? { id: req.id, result } : { id: req.id, error: { code: 'unknown_method', message: 'no' } })}\n`);
  }));
  await new Promise((resolve) => other.listen(endpoint, resolve));
  await reader.start();
  fs.writeFileSync(path.join(shared, 'rt-press.json'), JSON.stringify({ protocol: 2, id: 'rt-press', name: 'RT Press', version: '9.0.0', endpoint }));
  try {
    const [found] = await reader.found();
    assert.deepEqual([found.id, found.version, found.protocol, found.minProtocol, found.accepts], ['rt-press', '9.0.0', 2, 2, ['markdown']]);
    links.a = { 'rt-press': { name: 'RT Press', key: 'k'.repeat(64) } };
    assert.deepEqual(await reader.statusOf('rt-press'), { state: 'busy', line: 'Setting a book' });
    await assert.rejects(reader.statusOf('rt-audio-studio'), (e) => e.code === 'not_linked');
  } finally {
    await reader.stop();
    await new Promise((resolve) => other.close(resolve));
  }
});

test('apps: each button’s spoken name contains the words on it, in every language', () => {
  const pairs = [['Open', 'Open {0}'], ['Link', 'Link {0}'], ['Get it', 'Get it: {0}'], ['Download', 'Download {0}'], ['Open to update', 'Open to update: {0}'], ['Remove', 'Remove the link to {0}']];
  for (const code of ['es', 'fr', 'de']) {
    const dict = require(`../src/locales/${code}.json`);
    for (const [shown, spoken] of pairs) {
      const plain = (s) => s.toLocaleLowerCase(code);
      assert.ok(plain(dict[spoken]).includes(plain(dict[shown])), `${code}: “${dict[spoken]}” doesn’t contain “${dict[shown]}”`);
    }
  }
});
