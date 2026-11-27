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
  const layers = ['--m-top', '--m-top-2', '--m-band', '--m-low', '--m-btn-hi', '--m-btn-lo', '--m-brush-1', '--m-brush-2', '--m-brush-3', '--m-brush-4', '--m-brush-5',
    '--m-line-hi', '--m-line-lo', '--m-drop', '--m-deep', '--m-field-hi', '--m-field-lo', '--m-field-shade', '--m-well', '--m-lip'];
  for (const name of layers) {
    const line = css.split('\n').find((l) => l.trim().startsWith(`${name}:`));
    assert.ok(line, `${name} is declared`);
    assert.match(line, /oklch\(from var\(--m-ink\) [^/]+\/ clamp\(/, `${name} comes from the text's lightness, within limits`);
  }
  assert.match(css, /--m-ink: var\(--text-soft\)/, 'the toolbar and sidebar go by their own text');
  assert.match(css, /--m-ink: var\(--text\)/, 'dialogs and text boxes go by the page’s');
});

test('the Glass stylesheet steps aside in the same cases, and for less transparency, and puts no sheen on the page or the editor', () => {
  const css = fs.readFileSync(new URL('../src/renderer/styles/glass.css', import.meta.url), 'utf8');
  assert.match(css, /@media screen and \(prefers-reduced-transparency: no-preference\) and \(forced-colors: none\) and \(prefers-contrast: no-preference\)/);
  assert.ok(!/!important/.test(css));
  const selectors = [...css.matchAll(/^\s*(:root\[data-surface="glass"\][^{]*)\{/gm)].map((m) => m[1]);
  assert.ok(selectors.length >= 4);
  assert.ok(selectors.every((s) => s.includes(':not([data-theme="contrast"])')), 'every :root rule leaves out High Contrast');
  for (const flat of ['.markdown-body', '.editor', '.desk']) assert.ok(!css.includes(`${flat} {`) && !css.includes(`${flat},`), `${flat} is left alone`);
  const page = css.match(/^ {4}\.page \{[^}]*\}/m)[0];
  assert.ok(!/gradient|--g-/.test(page), 'the page is frosted, as before, with no sheen on it');
  for (const name of ['--g-hi', '--g-lo', '--g-pane-hi', '--g-line', '--g-drop', '--g-deep', '--g-field', '--g-well']) {
    const line = css.split('\n').find((l) => l.trim().startsWith(`${name}:`));
    assert.match(line || '', /oklch\(from var\(--g-ink\) [^/]+\/ clamp\(/, `${name} comes from the text's lightness, within limits`);
  }
  assert.match(fs.readFileSync(new URL('../src/renderer/styles/app.css', import.meta.url), 'utf8'), /@import '\.\/glass\.css';/);
});
