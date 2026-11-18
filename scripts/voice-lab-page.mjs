// Builds the listening page (index.html) and a plain-text guide for the clips voice-lab.mjs made.
//   node scripts/voice-lab-page.mjs [--out ~/voice-samples]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const i = process.argv.indexOf('--out');
const out = i > 0 ? process.argv[i + 1] : path.join(os.homedir(), 'voice-samples');
const clips = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const stats = JSON.parse(fs.readFileSync(path.join(out, 'measurements.json'), 'utf8'));

const GROUPS = {
  '1-steps': ['1. Steps', 'How many times the voice is refined. More steps is slower to make. The app uses 8, but drops to 5 for the first sentence after you press play, and for good on a slower computer.'],
  '2-speed': ['2. Speed', 'Faster or slower. The app’s normal is 1.05 (times your speed setting).'],
  '3-text-cleanup': ['3. Text cleanup', 'The app turns a dash (—) into a plain hyphen. Here it becomes a spoken pause instead.'],
  '4-expression-tags': ['4. Expression tags', 'The voice model understands a few tags in the text, like a breath, a sigh or a laugh. The app doesn’t use them today.'],
  '5-warmth-filter': ['5. Warmth filter', 'A gentle filter after the voice is made: more body in the low voice, a softer top, and a little smoothing. Same recording each time; only the filter changes.'],
  '6-recipes': ['6. Recipes', 'The settings put together. NOW is what the app does today. These recipes are my guesses until you listen: tell me which is closest.'],
  '7-blended-voices': ['7. Blended voices', 'New voices made by mixing the ones the model already has. All use the WARM-LIVELY recipe. “single-voice” clips are the original voices at the same recipe, so you can compare.'],
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Voice samples</title>
<style>
:root { color-scheme: light dark; --bg:#fff; --fg:#1d1d1f; --mut:#666; --line:#ddd; --acc:#0a66c2; }
@media (prefers-color-scheme: dark) { :root { --bg:#18181a; --fg:#eee; --mut:#999; --line:#333; --acc:#6cb2ff; } }
body { font: 16px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--fg); max-width: 980px; margin: 0 auto; padding: 16px; }
h1 { margin: .2em 0; } h2 { margin-top: 2em; border-bottom: 1px solid var(--line); padding-bottom: 4px; } .mut { color: var(--mut); }
table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: middle; }
th { font-size: 13px; color: var(--mut); font-weight: 600; } audio { width: 260px; max-width: 100%; height: 36px; }
.now { font-weight: 700; } .num { font-variant-numeric: tabular-nums; white-space: nowrap; } .txt { font-size: 13px; color: var(--mut); }
@media (max-width: 700px) { audio { width: 180px; } .hide-s { display: none; } }
</style></head><body>
<h1>Voice samples</h1>
<p>Press play on a clip. Every clip in a comparison says the same sentence from the same starting point and is the same loudness, so the one thing that differs is the setting named on its row. Rows marked <b>NOW</b> are what the app sounds like today.</p>
<p class="mut"><b>Pitch moves</b> is how much the voice’s pitch wanders, in semitones: a flat, sad voice moves little, a lively one moves more. <b>Brightness</b> is how bright the sound is in Hz: lower sounds warmer. They’re rough hints; your ears decide.</p>`;
for (const [g, [title, blurb]] of Object.entries(GROUPS)) {
  const rows = clips.filter((c) => c.group === g);
  if (!rows.length) continue;
  html += `<h2>${esc(title)}</h2><p class="mut">${esc(blurb)}</p><table><tr><th>Sentence</th><th>Voice</th><th>Setting</th><th>Listen</th><th class="hide-s">Pitch moves</th><th class="hide-s">Brightness</th></tr>`;
  for (const c of rows) {
    const m = stats[`${c.group}/${c.file}`] || {};
    const now = /NOW/.test(c.file) ? ' class="now"' : '';
    html += `<tr><td>${esc(c.s)}</td><td>${esc(c.voice)}</td><td${now}>${esc(c.note)}<div class="txt">${esc(c.file)}</div></td>`
      + `<td><audio controls preload="none" src="${esc(c.group)}/${esc(c.file)}"></audio></td>`
      + `<td class="num hide-s">${m.pitchMoveSt ?? ''}</td><td class="num hide-s">${m.centroidHz ?? ''}</td></tr>`;
  }
  html += '</table>';
}
html += '</body></html>';
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log(`wrote ${path.join(out, 'index.html')} (${clips.length} clips)`);
