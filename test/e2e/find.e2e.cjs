// End-to-end test: Find in the open document (Ctrl+F). It must not search while you type, must never match the
// find box itself, and must scroll to each match.
const { _electron: electron } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nmr-find-'));
let md = '# Long document\n\nThe first needle is up here.\n\n';
for (let i = 0; i < 1500; i++) md += `Paragraph ${i} about the weather and the sea.\n\n`;
md += 'The second needle is far down at the very end.\n';
const doc = path.join(tmp, 'long.md');
fs.writeFileSync(doc, md);

const step = async (name, fn) => { await fn(); console.log('ok -', name); };

(async () => {
  const env = { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1', NMR_USER_DATA: path.join(tmp, 'profile'), NMR_DISABLE_UPDATES: '1', NMR_NO_TOUR: '1' };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    executablePath: require(path.join(root, 'node_modules/electron')),
    args: [root, doc, ...(process.platform === 'linux' ? ['--no-sandbox'] : [])],
    env,
  });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  await win.waitForSelector('.page:not([hidden]) h1');

  const top = () => win.$eval('#desk', (d) => d.scrollTop);
  const count = () => win.$eval('#find-count', (n) => n.textContent);
  const typed = () => win.$eval('#find-input', (n) => n.value);
  const focused = () => win.evaluate(() => document.activeElement?.id);
  const marks = () => win.evaluate(() => CSS.highlights.get('nmr-find-current')?.size || 0);
  const openFind = () => app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('find').click());

  await step('the find bar opens with the cursor in it', async () => {
    await openFind();
    await win.waitForSelector('#find-bar:not([hidden])');
    assert.equal(await focused(), 'find-input');
  });

  await step('typing searches nothing until you press Enter', async () => {
    await win.keyboard.type('needle', { delay: 30 });
    await win.waitForTimeout(600);
    assert.equal(await typed(), 'needle');
    assert.equal(await count(), '');
    assert.equal(await top(), 0);
    assert.equal(await marks(), 0);
    assert.equal(await focused(), 'find-input');
  });

  await step('Enter finds the first match and keeps the cursor in the box', async () => {
    await win.keyboard.press('Enter');
    assert.equal(await count(), '1 of 2');
    assert.equal(await marks(), 1);
    assert.equal(await focused(), 'find-input');
  });

  await step('Enter again scrolls down to the second match', async () => {
    await win.keyboard.press('Enter');
    assert.equal(await count(), '2 of 2');
    assert.ok(await top() > 10000, 'the page scrolled to the match');
    const visible = await win.evaluate(() => {
      const r = [...CSS.highlights.get('nmr-find-current')][0].getBoundingClientRect();
      const d = document.getElementById('desk').getBoundingClientRect();
      return r.top >= d.top && r.bottom <= d.bottom;
    });
    assert.ok(visible, 'the match is on screen');
  });

  await step('Shift+Enter goes back up, and Enter wraps round', async () => {
    await win.keyboard.press('Shift+Enter');
    assert.equal(await count(), '1 of 2');
    assert.ok(await top() < 500, 'scrolled back to the top');
    await win.keyboard.press('Enter');
    await win.keyboard.press('Enter');
    assert.equal(await count(), '1 of 2');
  });

  await step('a word that is not in the document says so (the box itself is never a match)', async () => {
    await win.fill('#find-input', 'zzqx');
    assert.equal(await count(), '');
    await win.keyboard.press('Enter');
    assert.equal(await count(), 'No results');
    assert.equal(await marks(), 0);
  });

  await step('changing the word clears the old results; Escape closes and clears', async () => {
    await win.fill('#find-input', 'weather');
    await win.keyboard.press('Enter');
    assert.equal(await count(), '1 of 1500');
    await win.keyboard.press('Escape');
    assert.equal(await win.$eval('#find-bar', (n) => n.hidden), true);
    assert.equal(await marks(), 0);
  });

  assert.deepEqual(errors, []);
  await app.close();
  console.log('find e2e passed');
})().catch((e) => { console.error(e); process.exit(1); });
