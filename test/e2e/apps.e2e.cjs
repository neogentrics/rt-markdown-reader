// Your apps at a glance (3.14), in the real app: the installed list, the Apps panel from the toolbar and from Preferences,
// the dot, linking, status both ways, Open and Get it, and the versions file, which must not be asked for until someone
// opens the panel. The other apps are stand-ins that follow docs/app-link.md.
const { _electron: electron } = require('playwright-core');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nmr-apps-'));
const shared = path.join(tmp, 'shared');
const story = path.join(tmp, 'story.md');
const opened = path.join(tmp, 'desk-opened.txt');
const posix = process.platform !== 'win32';
fs.mkdirSync(path.join(shared, 'installed'), { recursive: true });
fs.writeFileSync(story, '# The lighthouse\n\nThe lamp still turned.\n');

// Reader's own program, as an installed copy would name it, and an installed app that isn't running.
const reader = path.join(tmp, posix ? 'reader' : 'reader.exe');
const desk = path.join(tmp, posix ? 'desk' : 'desk.exe');
fs.writeFileSync(reader, 'x', { mode: 0o755 });
fs.writeFileSync(desk, posix ? `#!/bin/sh\necho "args:$#" > "${opened}"\n` : 'x', { mode: 0o755 });
fs.writeFileSync(path.join(shared, 'installed', 'rt-author-desk.json'), JSON.stringify({ id: 'rt-author-desk', name: 'RT Author Desk', version: '1.2.0', launch: desk, protocol: 1 }));

const asked = [];
let passed = 0;
const step = async (name, fn) => { await fn(); passed++; console.log(`ok - ${name}`); };

/** One request to Reader, as another app would send it. */
function ask(endpoint, method, params = {}) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(endpoint);
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('error', reject);
    sock.on('connect', () => sock.write(`${JSON.stringify({ id: 7, method, params })}\n`));
    sock.on('data', (chunk) => { buf += chunk; if (buf.includes('\n')) { sock.destroy(); resolve(JSON.parse(buf.slice(0, buf.indexOf('\n')))); } });
  });
}

/** A running Recon Towers app: it answers hello, pair, status and unlink. */
function standIn(id, name) {
  const endpoint = posix ? path.join(tmp, `${id}.sock`) : `\\\\.\\pipe\\rt-apps-test-${crypto.randomBytes(6).toString('hex')}`;
  const state = { key: crypto.randomBytes(32).toString('hex'), paired: null, statusKeys: [], unlinked: false };
  const server = net.createServer((sock) => {
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('error', () => {});
    sock.on('data', (chunk) => {
      buf += chunk;
      if (!buf.includes('\n')) return;
      const req = JSON.parse(buf.slice(0, buf.indexOf('\n')));
      buf = '';
      let result = {};
      if (req.method === 'hello') result = { protocol: 1, minProtocol: 1, app: id, name, version: '1.0.0', accepts: ['markdown'] };
      if (req.method === 'pair') { state.paired = req.params; result = { key: state.key, app: id, name }; }
      if (req.method === 'status') { state.statusKeys.push(req.params.key); result = { state: 'busy', line: 'Setting <b>a book</b>' }; }
      if (req.method === 'unlink') { state.unlinked = req.params.key === state.key; result = { unlinked: true }; }
      sock.write(`${JSON.stringify({ id: req.id, result })}\n`);
    });
  });
  return new Promise((resolve) => server.listen(endpoint, () => {
    fs.writeFileSync(path.join(shared, `${id}.json`), JSON.stringify({ protocol: 1, id, name, version: '1.0.0', endpoint }));
    resolve({ state, server });
  }));
}

(async () => {
  const site = http.createServer((req, res) => {
    asked.push({ url: req.url, headers: req.headers });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ apps: { 'rt-author-desk': { version: '1.3.0', url: 'https://recontowers.com/apps/rt-author-desk/' } } }));
  });
  await new Promise((resolve) => site.listen(0, '127.0.0.1', resolve));
  const app = await electron.launch({
    executablePath: require(path.join(root, 'node_modules/electron')),
    args: [root, story, ...(process.platform === 'linux' ? ['--no-sandbox'] : [])],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1', NMR_USER_DATA: path.join(tmp, 'profile'), NMR_LINK_DIR: shared, NMR_LAUNCH_PATH: reader, NMR_VERSIONS_URL: `http://127.0.0.1:${site.address().port}/apps/versions.json`, NMR_DISABLE_UPDATES: '1', NMR_NO_TOUR: '1', NMR_NO_REVEAL: '1' },
  });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  await win.waitForSelector('.page:not([hidden]) h1');
  await app.evaluate(({ shell, dialog }) => {
    global.__urls = [];
    shell.openExternal = async (url) => { global.__urls.push(url); };
    dialog.showMessageBox = async (...args) => ({ response: args.at(-1).cancelId });
  });
  const urls = () => app.evaluate(() => global.__urls);
  const menu = (id) => app.evaluate(({ Menu }, i) => Menu.getApplicationMenu().getMenuItemById(i).click(), id);
  const dot = () => win.$eval('#btn-apps .apps-dot', (e) => e.dataset.dot);
  const waitDot = (want) => win.waitForFunction((d) => document.querySelector('#btn-apps .apps-dot').dataset.dot === d, want);
  const row = (id, list = '#apps-list') => `${list} .app-row[data-app="${id}"]`;
  const rowText = async (id, list) => (await win.textContent(row(id, list))).replace(/\s+/g, ' ');
  const buttons = (id, list) => win.$$eval(`${row(id, list)} button`, (b) => b.map((x) => x.textContent));
  const waitState = (id, state, list = '#apps-list') => win.waitForSelector(`${list} .app-row[data-app="${id}"][data-state="${state}"]`);

  await step('an installed copy says it’s installed, with no secrets, even while App Link is off', async () => {
    const mine = JSON.parse(fs.readFileSync(path.join(shared, 'installed', 'rt-markdown-reader.json'), 'utf8'));
    assert.deepEqual([mine.id, mine.name, mine.launch, mine.protocol], ['rt-markdown-reader', 'RT Markdown Reader', reader, 1]);
    assert.match(mine.version, /^\d+\.\d+\.\d+$/);
    assert.deepEqual(Object.keys(mine), ['id', 'name', 'version', 'launch', 'protocol']);
    assert.equal(fs.existsSync(path.join(shared, 'rt-markdown-reader.json')), false, 'nothing is listening');
  });

  await step('the toolbar button is at the right end and says App Link is off; nothing has been asked of any server', async () => {
    assert.equal(await win.$eval('.tb-right', (g) => g.lastElementChild.id), 'btn-apps');
    await waitDot('off');
    assert.equal(await win.getAttribute('#btn-apps', 'aria-label'), 'Recon Towers apps: App Link is off');
    assert.equal(asked.length, 0, 'opening the app asks no server for versions');
  });

  await step('the panel lists the whole suite with the shared words, and only now asks for versions, sending nothing', async () => {
    await win.click('#btn-apps');
    await waitState('rt-author-desk', 'installed');
    assert.deepEqual(await win.$$eval('#apps-list .app-row', (rows) => rows.map((r) => r.dataset.app)), ['rt-story-tracker', 'rt-author-desk', 'rt-press', 'rt-audio-studio', 'recon-browser'], 'without itself');
    assert.equal(await win.isVisible('#apps-off'), true);
    await win.waitForFunction(() => /Update available/.test(document.getElementById('apps-list').textContent));
    assert.match(await rowText('rt-author-desk'), /RT Author Desk 1\.2\.0.*Installed, not running.*Catalog, accounts, launches and royalties.*Update available: you have 1\.2\.0, the latest is 1\.3\.0/);
    assert.match(await rowText('rt-audio-studio'), /Not installed/);
    assert.deepEqual(await buttons('rt-audio-studio'), ['Get it']);
    assert.deepEqual(await buttons('rt-author-desk'), ['Open', 'Download']);
    assert.equal(asked.length, 1);
    assert.equal(asked[0].url, '/apps/versions.json', 'no query');
    assert.equal(asked[0].headers.cookie, undefined);
    assert.equal(asked[0].headers.referer, undefined);
  });

  await step('Get it opens the app’s page from the shared list, and Download the one the site gives', async () => {
    await win.click(`${row('rt-audio-studio')} button`);
    await win.click(`${row('rt-author-desk')} button[aria-label="Download RT Author Desk"]`);
    await win.waitForTimeout(200);
    assert.deepEqual(await urls(), ['https://recontowers.com/projects/', 'https://recontowers.com/apps/rt-author-desk/']);
  });

  if (posix) {
    await step('Open starts an installed app, with nothing passed to it', async () => {
      await win.click(`${row('rt-author-desk')} button[aria-label="Open RT Author Desk"]`);
      for (let i = 0; i < 100 && !fs.existsSync(opened); i++) await new Promise((r) => setTimeout(r, 100));
      assert.equal(fs.readFileSync(opened, 'utf8').trim(), 'args:0');
      assert.match(await win.textContent('#apps-note'), /Starting RT Author Desk/);
    });
  }

  let press;
  await step('Turn on: App Link starts, the dot turns amber, and a running app is found, never linked by itself', async () => {
    await win.click('#apps-turn-on');
    await waitDot('amber');
    assert.equal(await win.isVisible('#apps-off'), false);
    press = await standIn('rt-press', 'RT Press');
    await win.click('#apps-refresh');
    await waitState('rt-press', 'found');
    assert.match(await rowText('rt-press'), /Found, not linked/);
    assert.deepEqual(await buttons('rt-press'), ['Link']);
    assert.equal(press.state.paired, null, 'finding it didn’t ask to link');
    assert.equal(asked.length, 2, 'Refresh asks for versions again');
  });

  await step('Link asks the other app; then it says Linked, the dot is green, and its status line shows as plain text', async () => {
    await win.focus(`${row('rt-press')} button`);
    await win.keyboard.press('Enter');
    await waitState('rt-press', 'linked');
    await waitDot('green');
    assert.equal(press.state.paired.app, 'rt-markdown-reader');
    assert.deepEqual([press.state.paired.protocol, press.state.paired.minProtocol, press.state.paired.accepts], [1, 1, ['markdown', 'text']]);
    await win.waitForSelector(`${row('rt-press')} .app-line`);
    assert.equal(await win.textContent(`${row('rt-press')} .app-line`), 'Setting <b>a book</b>', 'what another app says is only ever text');
    assert.ok(press.state.statusKeys.every((k) => k === press.state.key), 'status is asked with the link’s key');
    assert.equal(await win.evaluate(() => document.activeElement.closest('.app-row')?.dataset.app), 'rt-press', 'the keyboard stays on its row');
    assert.equal(await win.getAttribute('#btn-apps', 'aria-label'), 'Recon Towers apps: An app is linked');
  });

  await step('a linked app can ask what Reader is doing: the open file’s name, and nothing of what’s in it', async () => {
    // Link the other way round too: the stand-in asks Reader, Reader asks the person.
    const endpoint = JSON.parse(fs.readFileSync(path.join(shared, 'rt-markdown-reader.json'), 'utf8')).endpoint;
    await app.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 0 }); });
    const { result: made } = await ask(endpoint, 'pair', { app: 'rt-story-tracker', name: 'RT Story Tracker' });
    await waitState('rt-story-tracker', 'linked');                       // the panel notices by itself
    const status = async () => (await ask(endpoint, 'status', { app: 'rt-story-tracker', key: made.key })).result;
    assert.deepEqual(await status(), { state: 'open', line: 'Open: “story.md”' });
    assert.ok(!JSON.stringify(await status()).includes('lamp'));
    assert.equal((await ask(endpoint, 'status', { app: 'rt-story-tracker', key: 'wrong' })).error.code, 'not_linked');
    await win.click('#apps-done');
    await menu('new-doc');
    await win.waitForFunction(() => document.querySelectorAll('.tab').length === 2);
    await win.waitForTimeout(900);
    assert.deepEqual(await status(), { state: 'idle' }, 'an unsaved document in front has no name worth telling');
  });

  await step('View → Recon Towers Apps and Preferences → Linked Apps show the same panel', async () => {
    await menu('apps');
    await win.waitForSelector('#apps-dlg[open]');
    await waitState('rt-press', 'linked');
    await win.click('#apps-prefs');
    await win.waitForSelector('#prefs-dlg[open]');
    await waitState('rt-press', 'linked', '#pref-link-list');
    assert.equal(await win.isChecked('#pref-link'), true);
    assert.deepEqual(await win.$$eval('#pref-link-list .app-row', (r) => r.map((x) => x.dataset.app)), ['rt-story-tracker', 'rt-author-desk', 'rt-press', 'rt-audio-studio', 'recon-browser']);
  });

  await step('Remove unlinks and tells the other app', async () => {
    await win.click(`${row('rt-press', '#pref-link-list')} button[aria-label="Remove the link to RT Press"]`);
    await waitState('rt-press', 'found', '#pref-link-list');
    assert.equal(press.state.unlinked, true);
  });

  await step('turned off again: the dot is off and says so', async () => {
    await win.click('#pref-link');
    await waitDot('off');
    assert.equal(await dot(), 'off');
    await win.click('#prefs-done');
  });

  await step('in Spanish, the panel and the button speak Spanish, and app names stay as they are', async () => {
    await win.evaluate(() => window.reader.setSettings({ language: 'es' }));
    await win.waitForFunction(() => /Aplicaciones de Recon Towers/.test(document.getElementById('btn-apps').getAttribute('aria-label')));
    await win.click('#btn-apps');
    await waitState('rt-author-desk', 'installed');
    await win.waitForFunction(() => /Instalada, sin abrir/.test(document.getElementById('apps-list').textContent));
    await win.waitForFunction(() => /Actualización disponible: usted tiene la 1\.2\.0, la más reciente es la 1\.3\.0/.test(document.getElementById('apps-list').textContent));
    assert.match(await rowText('rt-author-desk'), /RT Author Desk/);
    assert.match(await win.textContent('#apps-off'), /App Link está desactivado/);
    await win.click('#apps-done');
  });

  assert.deepEqual(errors, [], `errors in the page: ${errors.join(' | ')}`);
  press.server.close();
  site.close();
  await app.close();
  console.log(`apps e2e: all passed (${passed})`);
})().catch((e) => { console.error('apps e2e FAILED:', e); process.exit(1); });
