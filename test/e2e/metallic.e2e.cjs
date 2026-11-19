// End-to-end test for v3.13 "Metallic finish": the look can be chosen, it covers the toolbar, tabs, sidebar, dialogs and
// read-aloud bar, it stays flat for High Contrast, forced colours and a request for more contrast, and the text on it
// is still readable in every theme.
//
// Why a test of its own for readability: the accessibility checker (axe) can't judge text over a gradient. It reports
// "needs review" and the other test counts that as a pass, so a Metallic theme could pass while its text was unreadable.
// This test measures instead. It hides the text, takes a picture of the window, and for every control looks at every
// pixel behind where its text sits and tests the real text colour against the worst of them (4.5:1 for text, 3:1 for icons
// and large text). A control that fails here fails for a person too.
const { _electron: electron } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nmr-metallic-'));
const doc = path.join(tmp, 'story.md');
fs.writeFileSync(doc, '# The lighthouse\n\nThe keeper climbed the stairs every night. The lamp was old, but it still turned.\n\n## Morning\n\nShips passed the rocks safely.\n\n## Evening\n\nNobody thanked the lamp.\n');
const THEMES = ['light', 'sepia', 'mist', 'dark', 'forest', 'dusk', 'blue', 'red', 'yellow'];   // High Contrast is checked for being flat, below

const step = async (name, fn) => { await fn(); console.log('ok -', name); };

(async () => {
  const app = await electron.launch({
    executablePath: require(path.join(root, 'node_modules/electron')),
    args: [root, doc, ...(process.platform === 'linux' ? ['--no-sandbox'] : [])],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1', NMR_USER_DATA: path.join(tmp, 'profile'), NMR_DISABLE_UPDATES: '1', NMR_NO_TOUR: '1', NMR_NO_REVEAL: '1' },
  });
  const menu = (id) => app.evaluate(({ Menu }, i) => Menu.getApplicationMenu().getMenuItemById(i).click(), id);
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  await win.waitForSelector('.page:not([hidden]) h1');
  await win.setViewportSize({ width: 1180, height: 780 });
  await win.emulateMedia({ reducedMotion: 'reduce' });           // settled colours, not the middle of a fade
  // The computer's own voice, so read aloud has something to start with and stays open.
  await win.evaluate(() => { window.__nmrSpeech = { speak() {}, cancel() {}, getVoices: () => [] }; });
  const cdp = await win.context().newCDPSession(win);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-contrast', value: 'no-preference' }] });

  const look = (theme, surface, extra = {}) => win.evaluate(async ([t, s, x]) => {
    await window.reader.setSettings({ theme: t, surface: s, ...x });
  }, [theme, surface, extra]).then(() => win.waitForFunction(([t, s]) => document.documentElement.dataset.theme === t && document.documentElement.dataset.surface === s, [theme, surface]));

  /**
   * Measure every control matching `groups` ({ name: selector }) that can be seen where the window is now. Returns the ones
   * that fall short, as text, with how many of each group were measured in `.counts`.
   */
  async function measure(groups) {
    const tagged = await win.evaluate((groups) => {
      document.querySelectorAll('[data-m]').forEach((e) => e.removeAttribute('data-m'));
      const out = {};
      let n = 0;
      for (const [name, selector] of Object.entries(groups)) {
        out[name] = 0;
        for (const el of document.querySelectorAll(selector)) {
          const r = el.getBoundingClientRect();
          if (el.disabled || r.width < 6 || r.height < 6 || r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          // Not scrolled out of sight: something inside a scrolling box (a long dialog) that's past its edge is clipped, not
          // painted, and the window behind it is what a measurement would land on. It's measured when it's scrolled into view.
          let clipped = false;
          for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
            if (getComputedStyle(a).overflowY === 'visible') continue;
            const ar = a.getBoundingClientRect();     // what it clips to is inside its border, which isn't a surface the text sits on
            const top = ar.top + a.clientTop, left = ar.left + a.clientLeft;
            if (r.top < top - 0.5 || r.bottom > top + a.clientHeight + 0.5 || r.left < left - 0.5 || r.right > left + a.clientWidth + 0.5) { clipped = true; break; }
          }
          if (clipped) continue;
          el.setAttribute('data-m', `${name}|${n++}`);
          out[name]++;
        }
      }
      return out;
    }, groups);
    // Hide the text and the icons, so what's left under them is the surface itself.
    await win.evaluate(() => {
      const style = document.createElement('style');
      style.id = 'm-hide';
      style.textContent = '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }'
        + ' svg, svg * { stroke: transparent !important; fill: transparent !important; } ::placeholder { color: transparent !important; }';
      document.head.append(style);
    });
    await win.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const shot = (await win.screenshot()).toString('base64');
    const failures = await win.evaluate(async (shot) => {
      document.getElementById('m-hide')?.remove();
      const bytes = Uint8Array.from(atob(shot), (c) => c.charCodeAt(0));     // not fetch(): the page's security policy rules out data: addresses
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const g = canvas.getContext('2d', { willReadFrequently: true });
      g.drawImage(bitmap, 0, 0);
      const scale = bitmap.width / innerWidth;
      const rgba = (css) => {                                   // any CSS colour, as [r, g, b, a]
        const c = new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });
        c.clearRect(0, 0, 1, 1); c.fillStyle = css; c.fillRect(0, 0, 1, 1);
        const d = c.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      };
      const lum = ([r, g2, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g2) + 0.0722 * f(b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const failures = [];
      for (const el of document.querySelectorAll('[data-m]')) {
        const [name] = el.getAttribute('data-m').split('|');
        const cs = getComputedStyle(el);
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || (el.matches('select, input') && true) || (el.children.length > 0 && el.textContent.trim().length > 0);
        // The colour that's really painted: icons by their stroke, text by its colour, through every level of opacity above.
        const icon = !hasText && el.querySelector('svg');
        let fg = rgba(icon ? getComputedStyle(icon).stroke : cs.color);
        let alpha = fg[3];
        for (let e = el; e; e = e.parentElement) alpha *= Number(getComputedStyle(e).opacity);
        const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
        const need = icon || size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
        // Where the words (or the icon) are: the boxes of their text, not the whole control, which can hold a menu or a rim.
        const boxes = [];
        if (icon || el.matches('select, input')) boxes.push(el.getBoundingClientRect());
        else {
          const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          for (let n = walk.nextNode(); n; n = walk.nextNode()) {
            if (!n.textContent.trim() || n.parentElement.closest('select, option')) continue;
            const range = document.createRange();
            range.selectNodeContents(n);
            boxes.push(...range.getClientRects());
          }
          if (!boxes.length) boxes.push(el.getBoundingClientRect());
        }
        const r = el.getBoundingClientRect();
        // Stay inside the control's rim: a rounded corner has a light edge, which isn't what the text sits on.
        const radius = Math.max(...['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].map((c) => { const v = cs[`border${c}Radius`]; return v.endsWith('%') ? (parseFloat(v) / 100) * Math.min(r.width, r.height) : parseFloat(v) || 0; }));
        const inset = icon || el.matches('select, input') ? 3 + 0.3 * Math.min(radius, Math.min(r.width, r.height) / 2) : 0;
        let worst = Infinity, at = null;
        for (const box of boxes) {
          const x0 = Math.max(0, Math.round((box.left + inset) * scale)), y0 = Math.max(0, Math.round((box.top + inset) * scale));
          const w = Math.max(1, Math.round((box.width - 2 * inset) * scale)), h = Math.max(1, Math.round((box.height - 2 * inset) * scale));
          const px = g.getImageData(x0, y0, w, h).data;
          for (let i = 0; i < px.length; i += 4 * Math.max(1, Math.floor(px.length / 4 / 600))) {     // up to ~600 samples per box
            const bg = [px[i], px[i + 1], px[i + 2]];
            const shown = [0, 1, 2].map((k) => alpha * fg[k] + (1 - alpha) * bg[k]);
            const c = ratio(shown, bg);
            if (c < worst) { worst = c; at = bg; }
          }
        }
        if (worst < need) failures.push(`${name} ${el.id ? `#${el.id}` : el.className.toString().split(' ')[0]} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 18)}" ${worst.toFixed(2)}:1 needs ${need}:1 (text ${cs.color}, worst background rgb(${at})) `);
      }
      return failures;
    }, shot);
    return Object.assign(failures, { counts: tagged });
  }

  /** Measure a place that's one view, and make sure every group was really looked at (a measurement of nothing proves nothing). */
  async function readable(groups) {
    const failures = await measure(groups);
    for (const [name, count] of Object.entries(failures.counts)) assert.ok(count > 0, `nothing matched for "${name}" (${groups[name]}): the test would be looking at nothing`);
    return [...failures];
  }

  /**
   * Measure a place that scrolls (a long dialog), from its top to its bottom in overlapping steps, so each control is looked at
   * where a person would see it, over the finish and not over whatever is outside the box. Each group must be seen at some stop.
   */
  async function readableScrolling(groups, scroller) {
    const seen = Object.fromEntries(Object.keys(groups).map((k) => [k, 0]));
    const bad = new Set();
    const room = await win.$eval(scroller, (e) => ({ max: e.scrollHeight - e.clientHeight, step: Math.max(40, Math.floor(e.clientHeight * 0.5)) }));
    for (let top = 0; ; top += room.step) {
      const at = Math.min(top, room.max);
      await win.$eval(scroller, (e, y) => { e.scrollTop = y; }, at);
      await win.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const failures = await measure(groups);
      failures.forEach((f) => bad.add(f));
      for (const [name, count] of Object.entries(failures.counts)) seen[name] += count;
      if (at >= room.max) break;
    }
    for (const [name, count] of Object.entries(seen)) assert.ok(count > 0, `nothing matched for "${name}" (${groups[name]}) anywhere in ${scroller}: the test would be looking at nothing`);
    await win.$eval(scroller, (e) => { e.scrollTop = 0; });
    return [...bad];
  }

  const MAIN = {
    'toolbar buttons': '.toolbar .tb-btn',
    'document title': '.tb-title-name, .tb-title-meta',
    'tabs': '.tab',
    'sidebar tabs': '.side-tabs button',
    'outline': '.toc-item',
    'sidebar foot': '.side-foot',
  };
  const BAR = { 'read-aloud buttons': '#speak-bar .tb-btn', 'read-aloud menus': '#speak-bar select', 'read-aloud status': '#speak-status' };
  const PREFS = { 'preferences list': '.prefs-nav button', 'preferences labels': '.prefs-pane:not([hidden]) .field', 'preferences hints': '.prefs-pane:not([hidden]) .hint-text', 'preferences menus': '.prefs-pane:not([hidden]) select' };
  const POP = { 'theme menu labels': '#theme-menu .pop-label', 'theme menu switches': '#theme-menu .seg button' };

  /** Open each place the finish shows, measure it, and close it again. */
  async function measureEverything(where) {
    const bad = [];
    bad.push(...await readable(MAIN));
    await win.click('#btn-theme');
    await win.waitForSelector('#theme-menu:not([hidden])');
    bad.push(...await readable(POP));
    await win.keyboard.press('Escape');
    await win.evaluate(() => { document.getElementById('theme-menu').hidden = true; });
    await menu('read-aloud');
    await win.waitForSelector('#speak-bar:not([hidden])');
    bad.push(...await readable(BAR));
    await win.click('#speak-stop');
    await menu('preferences');
    await win.waitForSelector('#prefs-dlg[open]');
    await win.click('.prefs-nav [data-pane=voices]');
    bad.push(...await readableScrolling(PREFS, '#prefs-dlg'));
    await win.click('#prefs-done');
    await win.waitForSelector('#prefs-dlg', { state: 'hidden' });
    assert.deepEqual(bad, [], `text that can't be read well on the Metallic look, ${where}:\n  ${bad.join('\n  ')}`);
  }

  await step('Metallic is a choice beside Solid and Glass, on the theme button, in Preferences and in the View menu', async () => {
    await win.click('#btn-theme');
    assert.deepEqual(await win.$$eval('#theme-menu [data-key="surface"] button', (b) => b.map((x) => x.dataset.value)), ['solid', 'metallic', 'glass']);
    await win.click('#theme-menu [data-key="surface"] [data-value="metallic"]');
    await win.waitForFunction(() => document.documentElement.dataset.surface === 'metallic');
    assert.equal(await win.evaluate(() => window.reader.init().then((r) => r.settings.surface)), 'metallic', 'the choice is remembered');
    await win.keyboard.press('Escape');
    await menu('preferences');
    await win.waitForSelector('#prefs-dlg[open]');
    await win.click('.prefs-nav [data-pane=appearance]');
    assert.equal(await win.$eval('#pref-surface', (s) => s.value), 'metallic');
    assert.deepEqual(await win.$$eval('#pref-surface option', (o) => o.map((x) => x.textContent)), ['Solid', 'Metallic', 'Glass']);
    await win.click('#prefs-done');
    await win.waitForSelector('#prefs-dlg', { state: 'hidden' });
    const items = await app.evaluate(({ Menu }) => {
      const out = [];
      const walk = (m) => m.items.forEach((i) => { if (i.label === 'Metallic') out.push({ checked: i.checked, type: i.type }); if (i.submenu) walk(i.submenu); });
      walk(Menu.getApplicationMenu());
      return out;
    });
    assert.deepEqual(items, [{ checked: true, type: 'radio' }], 'the View → Look menu has it, ticked');
  });

  await step('the finish is there: gradients and raised edges on the toolbar, tabs, sidebar, dialogs and the read-aloud bar', async () => {
    await look('light', 'metallic');
    // The finish is on a part when its sheen is made there (--m-sheen-bar or --m-sheen-panel in metallic.css).
    const has = (selector) => win.evaluate((s) => { const cs = getComputedStyle(document.querySelector(s)); return { image: cs.backgroundImage, shadow: cs.boxShadow, sheen: (cs.getPropertyValue('--m-sheen-bar') + cs.getPropertyValue('--m-sheen-panel')).trim() }; }, selector);
    for (const selector of ['.toolbar', '.tabstrip', '#btn-theme', '.tab.active', '.sidebar', '#theme-menu', '#find-bar']) {
      const now = await has(selector);
      assert.ok(now.sheen && now.image.includes('linear-gradient'), `${selector} has the Metallic sheen`);
      assert.notEqual(now.shadow, 'none', `${selector} has raised edges`);
    }
    await menu('read-aloud');
    await win.waitForSelector('#speak-bar:not([hidden])');
    assert.ok((await has('#speak-bar')).image.includes('linear-gradient'));
    await win.click('#speak-stop');
    // The page and the editor stay flat: text sits on a plain surface.
    const page = await win.evaluate(() => getComputedStyle(document.querySelector('.page:not([hidden])')).backgroundImage);
    assert.equal(page, 'none', 'the page is flat');
    // And Solid is untouched.
    await look('light', 'solid');
    assert.equal((await has('.toolbar')).sheen, '', 'Solid has none of the Metallic layers');
    await look('light', 'metallic');
  });

  await step('High Contrast, forced colours and a request for more contrast all keep it flat', async () => {
    const flat = () => win.evaluate(() => ['.toolbar', '.tabstrip', '.sidebar', '#btn-theme', '.tab.active'].filter((s) => getComputedStyle(document.querySelector(s)).getPropertyValue('--m-sheen-bar').trim() !== '' || getComputedStyle(document.querySelector(s)).getPropertyValue('--m-sheen-panel').trim() !== ''));
    assert.ok((await flat()).length > 0, 'it is on to start with');
    await look('contrast', 'metallic');
    assert.deepEqual(await flat(), [], 'High Contrast is flat');
    await look('light', 'metallic');
    await win.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    assert.deepEqual(await flat(), [], 'forced colours are flat');
    await win.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-contrast', value: 'more' }] });
    assert.deepEqual(await flat(), [], 'a request for more contrast is flat');
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-contrast', value: 'no-preference' }] });
    assert.ok((await flat()).length > 0, 'and it comes back');
  });

  await step('the measuring itself works: a finish with too bright a highlight is caught', async () => {
    await look('dark', 'metallic');
    await win.evaluate(() => {
      const s = document.createElement('style');
      s.id = 'm-bad';
      s.textContent = ':root:root:root:root[data-surface="metallic"] :is(.toolbar, .tabstrip, .tab) { --m-top: #fff; --m-top-2: #fff; --m-low: #fff; --m-band: #fff; }';   // :root repeated, to outweigh the finish's own
      document.head.append(s);
    });
    const caught = await readable({ 'toolbar buttons': '.toolbar .tb-btn:not(.tb-primary)', 'tabs': '.tab' });
    assert.ok(caught.length > 0, 'white layers over a dark theme must show up as unreadable');
    await win.evaluate(() => document.getElementById('m-bad').remove());
    assert.deepEqual(await readable({ 'toolbar buttons': '.toolbar .tb-btn:not(.tb-primary)', 'tabs': '.tab' }), [], 'and take them away, it passes again');
  });

  for (const theme of THEMES) {
    await step(`${theme}: every part of the Metallic finish can be read`, async () => {
      await look(theme, 'metallic');
      await measureEverything(`in the ${theme} theme`);
    });
  }

  await step('colours you choose in Customize Theme are readable on it too', async () => {
    for (const [name, brand] of [['a deep panel', { accent: '#c2255c', panel: '#1b1b3a', background: '#0d0d1f' }], ['a pale panel', { accent: '#2f54c9', panel: '#f6ecc4', background: '#e9d9a0' }]]) {
      await look('light', 'metallic', { brand });
      await measureEverything(`with ${name}`);
    }
    await look('light', 'metallic', { brand: { accent: '', panel: '', background: '' } });
  });

  assert.deepEqual(errors, [], `errors in the page: ${errors.join(' | ')}`);
  await app.close();
  console.log('metallic e2e: all passed');
})().catch((e) => { console.error('metallic e2e FAILED:', e); process.exit(1); });
