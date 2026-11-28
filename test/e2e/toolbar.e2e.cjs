// The toolbar you control (3.14), in the real app: Read Aloud on the bar; hiding, reordering, small buttons and names;
// what's hidden stays in the menus and in Ctrl+K; buttons that don't fit move to "More"; the tutorial can show a hidden
// button; and it all works in Spanish.
const { _electron: electron } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nmr-toolbar-'));
const doc = path.join(tmp, 'story.md');
fs.writeFileSync(doc, '# The lighthouse\n\nThe lamp still turned every night.\n');

let passed = 0;
const step = async (name, fn) => { await fn(); passed++; console.log(`ok - ${name}`); };
const DEFAULT = ['btn-save', 'btn-edit', 'btn-bookmark', 'btn-quick', 'btn-split', 'btn-find', 'btn-read', 'btn-smaller', 'btn-larger', 'btn-theme', 'btn-present', 'btn-pdf', 'btn-print', 'btn-prefs', 'btn-help', 'btn-more', 'btn-apps'];

(async () => {
  const app = await electron.launch({
    executablePath: require(path.join(root, 'node_modules/electron')),
    args: [root, doc, ...(process.platform === 'linux' ? ['--no-sandbox'] : [])],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1', NMR_USER_DATA: path.join(tmp, 'profile'), NMR_LINK_DIR: path.join(tmp, 'link'), NMR_DISABLE_UPDATES: '1', NMR_NO_TOUR: '1', NMR_NO_REVEAL: '1' },
  });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  await win.waitForSelector('.page:not([hidden]) h1');
  const width = async (w) => { await app.evaluate(({ BrowserWindow }, v) => BrowserWindow.getAllWindows()[0].setSize(v, 760), w); await win.setViewportSize({ width: w, height: 760 }); await win.waitForTimeout(250); };
  await width(1280);
  await win.evaluate(() => { window.__nmrSpeech = { speak() {}, cancel() {}, getVoices: () => [] }; });
  const menu = (id) => app.evaluate(({ Menu }, i) => Menu.getApplicationMenu().getMenuItemById(i).click(), id);
  const saved = () => win.evaluate(() => window.reader.init().then((r) => r.settings.toolbar));
  /** The buttons in the order they sit in the bar, and the ones that can be seen. */
  const inOrder = () => win.$$eval('.tb-right > .tb-btn, .tb-right > div > .tb-btn', (b) => b.map((x) => x.id));
  const seen = () => win.$$eval('.tb-right > .tb-btn, .tb-right > div > .tb-btn', (b) => b.filter((x) => x.getClientRects().length).map((x) => x.id));
  const settle = () => win.waitForTimeout(250);
  /** Everything on the bar is inside the window. */
  const allInside = () => win.evaluate(() => [...document.querySelectorAll('.tb-right .tb-btn')].filter((b) => b.getClientRects().length).every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
  const box = (id) => `#toolbar-list li[data-tool="${id}"] input`;
  const shut = async () => { await win.click('#toolbar-done'); await win.waitForSelector('#toolbar-dlg', { state: 'hidden' }); await settle(); };

  await step('Read Aloud is on the toolbar, in its default place, and reads', async () => {
    await settle();
    assert.deepEqual(await inOrder(), DEFAULT);
    assert.ok((await seen()).includes('btn-read'));
    assert.ok(!(await seen()).includes('btn-more'), 'everything fits at this width');
    await win.click('#btn-read');
    await win.waitForSelector('#speak-bar:not([hidden])');
    await win.click('#speak-stop');
  });

  await step('using a button from the keyboard leaves the keyboard on it, even though it changes a setting', async () => {
    await win.focus('#btn-larger');
    const before = await win.evaluate(() => document.documentElement.style.getPropertyValue('--font-scale'));
    await win.keyboard.press('Enter');
    await win.waitForFunction((v) => document.documentElement.style.getPropertyValue('--font-scale') !== v, before);
    await settle();
    assert.equal(await win.evaluate(() => document.activeElement.id), 'btn-larger');
    await win.focus('#btn-smaller');
    await win.keyboard.press('Enter');
    await settle();
    assert.equal(await win.evaluate(() => document.activeElement.id), 'btn-smaller');
  });

  await step('View → Customize Toolbar hides a button at once; it stays in the menus and in Ctrl+K', async () => {
    await menu('customize-toolbar');
    await win.waitForSelector('#toolbar-dlg[open] li[data-tool="print"]');
    assert.equal(await win.$$eval('#toolbar-list li', (l) => l.length), 15);
    await win.click(box('print'));
    await settle();
    assert.ok(!(await seen()).includes('btn-print'));
    assert.deepEqual((await saved()).hidden, ['print']);
    await shut();
    assert.ok(await app.evaluate(({ Menu }) => !!Menu.getApplicationMenu().getMenuItemById('print')));
    await menu('command-palette');
    await win.waitForSelector('#palette:not([hidden])');
    await win.keyboard.type('print');
    await win.waitForFunction(() => /Print/.test(document.getElementById('palette').textContent));
    await win.keyboard.press('Escape');
  });

  await step('Move up and Down reorder the bar, from the keyboard too, and the keyboard stays on the row', async () => {
    await menu('customize-toolbar');
    const up = '#toolbar-list li[data-tool="find"] button[aria-label="Move up"]';
    await win.focus(up);
    await win.keyboard.press('Enter');
    await win.keyboard.press('Enter');
    await settle();
    const order = await inOrder();
    assert.ok(order.indexOf('btn-find') < order.indexOf('btn-quick'), order.join(' '));
    assert.equal(await win.evaluate(() => document.activeElement.closest('li')?.dataset.tool), 'find');
    assert.equal((await saved()).order[1], 'find');
    assert.equal(await win.getAttribute(up, 'aria-describedby'), 'toolbar-name-find', 'a screen reader says which button');
    assert.equal(await win.isDisabled('#toolbar-list li[data-tool="bookmark"] button[aria-label="Move up"]'), true);
    assert.equal(await win.$$eval('#toolbar-list li[data-tool="edit"] button, #toolbar-list li[data-tool="apps"] button', (b) => b.length), 0, 'Edit and the apps button keep their places');
    await shut();
  });

  await step('Small buttons and names beside icons', async () => {
    await menu('customize-toolbar');
    await win.click('#toolbar-small');
    await settle();
    assert.equal(await win.$eval('#btn-split', (b) => b.getBoundingClientRect().height), 28);
    await win.click('#toolbar-labels');
    await shut();
    assert.equal(await win.textContent('#btn-split .tb-name'), 'Split view');
    assert.deepEqual([(await saved()).small, (await saved()).labels], [true, true]);
    // The apps dot stays on its icon, clear of the name.
    assert.ok(await win.$eval('#btn-apps', (b) => { const d = b.querySelector('.apps-dot').getBoundingClientRect(), n = b.querySelector('.tb-name').getBoundingClientRect(), i = b.querySelector('.apps-icon').getBoundingClientRect(); return d.right <= n.left && d.left >= i.left; }));
  });

  await step('with names there isn’t room for them all: the rest are in “More”, in your order, and they work', async () => {
    await width(900);
    assert.ok((await seen()).includes('btn-more'));
    assert.ok((await seen()).includes('btn-apps') && (await seen()).includes('btn-edit'), 'Edit and the apps button stay');
    assert.ok(await allInside(), 'nothing is off the edge');
    await win.click('#btn-more');
    const listed = await win.$$eval('#more-menu .more-item', (r) => r.map((x) => x.dataset.tool));
    assert.ok(listed.includes('help') && !listed.includes('print'), 'what doesn’t fit, and not what you hid');
    const onBar = await seen();
    const ids = await win.evaluate(() => Object.fromEntries([...document.querySelectorAll('#more-menu .more-item')].map((x) => [x.dataset.tool, x.textContent])));
    assert.equal(ids.help, 'Help');
    assert.ok(!onBar.includes('btn-help'));
    assert.equal(await win.evaluate(() => document.activeElement.classList.contains('more-item')), true, 'the menu takes the keyboard');
    await win.keyboard.press('Escape');
    assert.equal(await win.isHidden('#more-menu'), true);
    assert.equal(await win.evaluate(() => document.activeElement.id), 'btn-more');
    await win.click('#btn-more');
    await win.click('#more-menu .more-item[data-tool="help"]');
    await win.waitForSelector('#help-dlg[open]');
    await win.keyboard.press('Escape');
    await win.waitForSelector('#help-dlg', { state: 'hidden' });
    if (listed.includes('theme')) {
      await win.click('#btn-more');
      await win.click('#more-menu .more-item[data-tool="theme"]');
      await win.waitForSelector('#prefs-dlg[open] .prefs-pane[data-pane="appearance"]:not([hidden])');
      await win.click('#prefs-done');
    }
  });

  await step('in the narrowest window everything is still reachable', async () => {
    await menu('customize-toolbar');
    await win.click('#toolbar-reset');
    await shut();
    assert.deepEqual(await saved(), { order: [], hidden: [], small: false, labels: false });
    await width(560);
    assert.ok(await allInside(), 'nothing is off the edge');
    const bar = await seen();
    assert.ok(bar.includes('btn-apps') && bar.includes('btn-more'));
    await win.click('#btn-more');
    const inMore = await win.$$eval('#more-menu .more-item', (r) => r.map((x) => x.dataset.tool));
    await win.keyboard.press('Escape');
    const tools = await win.evaluate(() => [...document.querySelectorAll('.tb-right .tb-btn[data-overflow], .tb-right [data-overflow]')].length);
    assert.equal(inMore.length, tools);
    await width(1280);
    assert.ok(!(await seen()).includes('btn-more'), 'and they come back when there’s room');
    assert.deepEqual(await inOrder(), DEFAULT, 'Reset put the order back');
  });

  await step('right-clicking the buttons opens Customize Toolbar, and so does Preferences', async () => {
    await win.click('#btn-split', { button: 'right' });
    await win.waitForSelector('#toolbar-dlg[open]');
    await shut();
    await menu('preferences');
    await win.click('.prefs-nav [data-pane="appearance"]');
    await win.click('#prefs-dlg [data-run="customize-toolbar"]');
    await win.waitForSelector('#toolbar-dlg[open]');
    await shut();
    await win.click('#prefs-done');
  });

  await step('the tutorial shows a button you’ve hidden while its step needs it, then hides it again', async () => {
    await win.evaluate(() => window.reader.setSettings({ toolbar: { hidden: ['larger'] } }));
    await win.waitForFunction(() => document.getElementById('btn-larger').hasAttribute('data-off'));
    await settle();
    assert.ok(!(await seen()).includes('btn-larger'));
    await menu('tutorial');
    await win.waitForSelector('#tour-card:not([hidden])');
    for (let i = 0; i < 8 && (await win.textContent('#tour-title')) !== 'Text size'; i++) await win.click('#tour-next');
    assert.equal(await win.textContent('#tour-title'), 'Text size');
    await settle();
    assert.ok((await seen()).includes('btn-larger'), 'shown for its step');
    assert.equal(await win.isVisible('#tour-ring'), true);
    await win.click('#tour-next');
    await settle();
    assert.ok(!(await seen()).includes('btn-larger'), 'hidden again');
    await win.click('#tour-later');
  });

  await step('in Spanish the bar, the names and Customize Toolbar speak Spanish', async () => {
    await win.evaluate(() => window.reader.setSettings({ language: 'es', toolbar: { labels: true } }));
    await win.waitForFunction(() => document.querySelector('#btn-split .tb-name')?.textContent === 'Vista dividida');
    await menu('customize-toolbar');
    await win.waitForFunction(() => /Personalizar la barra de herramientas/.test(document.getElementById('toolbar-h').textContent));
    await win.waitForFunction(() => document.querySelector('#toolbar-list li[data-tool="help"] span').textContent === 'Ayuda');
    await win.waitForFunction(() => document.querySelector('#toolbar-list li[data-tool="help"] button').textContent === 'Subir');
    await shut();
  });

  assert.deepEqual(errors, [], `errors in the page: ${errors.join(' | ')}`);
  await app.close();
  console.log(`toolbar e2e: all passed (${passed})`);
})().catch((e) => { console.error('toolbar e2e FAILED:', e); process.exit(1); });
