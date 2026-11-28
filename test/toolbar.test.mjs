// The toolbar you control (3.14): what's saved, that nothing you hide is lost from the menus, and the names beside icons.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { TOOLS, IDS, MOVABLE, DEFAULT_TOOLBAR, orderOf, cleanToolbar } = require('../src/main/toolbar-tools.js');
const { sanitize } = require('../src/main/settings.js');
const html = fs.readFileSync(new URL('../src/renderer/index.html', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../src/main/main.js', import.meta.url), 'utf8');

test('toolbar: the saved settings are made safe, whatever the file says', () => {
  assert.deepEqual(sanitize({}).toolbar, DEFAULT_TOOLBAR);
  assert.deepEqual(sanitize({ toolbar: 'small' }).toolbar, DEFAULT_TOOLBAR);
  assert.deepEqual(cleanToolbar({ order: ['print', 'print', 'apps', 'edit', 'nonsense', 'find'], hidden: ['apps', 'edit', 'save', 7], small: 'yes', labels: true, extra: 1 }),
    { order: ['print', 'find'], hidden: ['apps', 'edit'], small: false, labels: true }, 'Edit and the apps button keep their places but can be hidden; Save can’t be hidden');
});

test('toolbar: your order is kept, and a button you’ve never placed arrives where it would by default', () => {
  assert.deepEqual(orderOf([]), MOVABLE);
  const mine = ['help', ...MOVABLE.filter((id) => id !== 'help' && id !== 'read')];        // saved before Read Aloud existed
  const order = orderOf(mine);
  assert.equal(order[0], 'help');
  assert.equal(order[order.indexOf('find') + 1], 'read', 'after Find, as by default');
  assert.deepEqual([...order].sort(), [...MOVABLE].sort(), 'every button once');
});

test('toolbar: every button is on the page in the default order, and what it does is also in the menus, so hiding loses nothing', () => {
  const places = TOOLS.map((t) => html.indexOf(`id="${t.button}"`));
  assert.ok(places.every((p) => p > 0));
  assert.deepEqual(places, [...places].sort((a, b) => a - b), 'the page starts in the list’s order');
  for (const tool of TOOLS) {
    if (tool.id === 'theme') { assert.match(main, /label: 'Theme', submenu:/); continue; }       // View → Theme
    assert.ok(main.includes(`cmd('${tool.command}',`) || main.includes(`id: '${tool.command}',`), `${tool.id} is in the menus as ${tool.command}`);
  }
  assert.ok(!IDS.includes('save'), 'Save always shows when there’s something to save');
});

test('toolbar: its words are translated, and each name beside an icon is part of the button’s spoken name in every language', () => {
  const spoken = (tool) => {
    if (tool.id === 'edit') return 'Edit';
    if (tool.id === 'apps') return 'Recon Towers apps: App Link is off';
    return new RegExp(`id="${tool.button}"[^>]*aria-label="([^"]+)"`).exec(html)[1].replace(/&amp;/g, '&');
  };
  const intro = /id="toolbar-h"[\s\S]*?<p class="hint-text">([^<]+)<\/p>/.exec(html)[1].replace(/&gt;/g, '>');
  const others = ['Customize Toolbar', 'Customize Toolbar…', intro, 'Small buttons', 'Show names beside icons', 'Reset Toolbar', 'More buttons', 'Up', 'Down', 'Move up', 'Move down', 'Read aloud (Ctrl+Shift+U)'];
  for (const code of ['en', 'es', 'fr', 'de']) {
    const dict = code === 'en' ? null : require(`../src/locales/${code}.json`);
    const say = (s) => (dict ? dict[s] : s);
    if (dict) assert.deepEqual([...TOOLS.map((t) => t.name), ...others, ...TOOLS.map(spoken)].filter((s) => !Object.hasOwn(dict, s)), [], `${code} is missing some`);
    for (const tool of TOOLS) {
      const [shown, name] = [say(tool.name), say(spoken(tool))].map((s) => s.toLocaleLowerCase(code));
      assert.ok(name.includes(shown), `${code}: “${name}” doesn’t contain “${shown}”`);
    }
    if (dict) for (const [shown, name] of [['Up', 'Move up'], ['Down', 'Move down']]) assert.ok(dict[name].toLocaleLowerCase(code).includes(dict[shown].toLocaleLowerCase(code)), `${code}: ${name}`);
  }
});

test('toolbar: it’s one of the preferences that travel between your computers', () => {
  assert.match(fs.readFileSync(new URL('../src/main/sync.js', import.meta.url), 'utf8'), /const SYNCED_SETTINGS = \[[^\]]*'toolbar'/);
});
