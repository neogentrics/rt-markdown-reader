// The Look setting (3.13): Solid, Metallic or Glass, and the Metallic stylesheet's promises that can be checked without a screen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { sanitize, DEFAULTS } = require('../src/main/settings.js');

test('the Look is Solid, Metallic or Glass, and anything else is ignored', () => {
  assert.equal(DEFAULTS.surface, 'solid');
  for (const look of ['solid', 'metallic', 'glass']) assert.equal(sanitize({ surface: look }).surface, look);
  assert.equal(sanitize({ surface: 'chrome' }).surface, 'solid', 'a look this version does not know falls back to Solid');
  assert.equal(sanitize({ surface: ['metallic'] }).surface, 'solid');
  assert.equal(sanitize(null).surface, 'solid');
});

test('the Look can be picked everywhere a theme can: the theme button, Preferences and the View menu', () => {
  const html = fs.readFileSync(new URL('../src/renderer/index.html', import.meta.url), 'utf8');
  assert.match(html, /<div class="seg" data-key="surface"><button data-value="solid">Solid<\/button><button data-value="metallic">Metallic<\/button><button data-value="glass">Glass<\/button>/);
  assert.match(html, /<select id="pref-surface"><option value="solid">Solid<\/option><option value="metallic">Metallic<\/option><option value="glass">Glass<\/option>/);
  assert.match(fs.readFileSync(new URL('../src/main/main.js', import.meta.url), 'utf8'), /radio\('Solid', 'surface', 'solid'\), radio\('Metallic', 'surface', 'metallic'\), radio\('Glass', 'surface', 'glass'\)/);
});

test('the Metallic stylesheet steps aside for High Contrast, forced colours and a request for more contrast, and never touches the page or the editor', () => {
  const css = fs.readFileSync(new URL('../src/renderer/styles/metallic.css', import.meta.url), 'utf8');
  assert.match(css, /@media screen and \(forced-colors: none\) and \(prefers-contrast: no-preference\)/, 'screen only, and not with forced colours or more contrast');
  assert.ok(!/!important/.test(css), 'no !important: it wins by specificity, so a theme or brand colour can still override it');
  // Every rule is for the Metallic look and not for High Contrast.
  const selectors = [...css.matchAll(/^\s*(:root\[data-surface="metallic"\][^{]*)\{/gm)].map((m) => m[1]);
  assert.ok(selectors.length >= 4);
  assert.ok(selectors.every((s) => s.includes(':not([data-theme="contrast"])')), 'every :root rule leaves out High Contrast');
  for (const flat of ['.page', '.markdown-body', '.editor', 'textarea.editor', '.desk']) assert.ok(!css.includes(`${flat} {`) && !css.includes(`${flat},`), `${flat} stays flat`);
  // Every layer is worked out from the lightness of the text on the surface, so one rule serves light and dark themes alike
  // (and Sepia, Blue and Red, whose toolbar is dark under a light page), and nothing is a fixed white or black.
  const layers = ['--m-top', '--m-top-2', '--m-band', '--m-low', '--m-edge', '--m-line-hi', '--m-line-lo', '--m-drop', '--m-well', '--m-lip'];
  for (const name of layers) {
    const line = css.split('\n').find((l) => l.trim().startsWith(`${name}:`));
    assert.ok(line, `${name} is declared`);
    assert.match(line, /oklch\(from var\(--m-ink\) [^/]+\/ clamp\(/, `${name} comes from the text's lightness, within limits`);
  }
  assert.match(css, /--m-ink: var\(--text-soft\)/, 'the toolbar and sidebar go by their own text');
  assert.match(css, /--m-ink: var\(--text\)/, 'dialogs and text boxes go by the page’s');
});
