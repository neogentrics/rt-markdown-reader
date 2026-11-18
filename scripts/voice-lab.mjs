// Voice lab: make short sample clips of the natural voices at different settings, so they can be compared by ear.
//   node scripts/voice-lab.mjs [--model ~/voice-lab/supertonic-3] [--out ~/voice-samples] [--only steps,speed,...]
// Needs the Supertonic 3 model already downloaded (the app downloads it; the folder is the one with onnx/ and
// voice_styles/ in it). Every clip of a comparison uses the same random seed and is brought to the same
// loudness, so the setting being tested is the only thing that differs.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { Supertonic, voiceStyle } = require('../src/main/supertonic.js');
const { VOICE_NAMES } = require('../src/main/voice-text.js');
const { warm, mixStyles, seeded, matchLoudness } = require('../src/main/voice-tone.js');
const { measure } = await import('./voice-measure.mjs');

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const home = os.homedir();
const modelDir = arg('model', path.join(home, 'voice-lab', 'supertonic-3'));
const outDir = arg('out', path.join(home, 'voice-samples'));
const only = arg('only', '') ? arg('only').split(',') : null;
const LOUDNESS = 0.1;

// ------------------------------------------------------------------ the sentences (all ours, none from anyone's book)
const SENTENCES = {
  A: { name: 'calm', text: 'The morning light came slowly through the window — and for a moment, the whole house felt calm and still.' },
  B: { name: 'lively', text: 'Oh, you made it! Come in, come in — I was just about to put the kettle on.' },
  C: { name: 'gentle', text: 'It wasn’t an easy decision, but when she finally said yes, everything felt lighter.' },
};
const SEED = { A: 1001, B: 1002, C: 1003 };

/** Text cleanup that keeps a dash as a spoken pause (the app turns "—" into a plain hyphen, which reads flat). */
const lively = (t) => t.replace(/\s*[—–]\s*/g, ', ').replace(/\s+-\s+/g, ', ').replace(/,\s*,/g, ',');

// ------------------------------------------------------------------ the engine
const ort = require(path.join(root, 'node_modules/onnxruntime-web'));
ort.env.wasm.wasmPaths = `${pathToFileURL(path.join(root, 'dist/voice')).href}/`;
ort.env.wasm.numThreads = Math.max(1, Math.min(4, os.availableParallelism?.() || 4));
const tts = await Supertonic.load(ort, path.join(modelDir, 'onnx'), (f) => fs.promises.readFile(f));

const json = new Map();
const styleJson = (id) => { if (!json.has(id)) json.set(id, JSON.parse(fs.readFileSync(path.join(modelDir, 'voice_styles', `${id}.json`), 'utf8'))); return json.get(id); };
const styles = new Map();
const styleOf = (id, spec) => { if (!styles.has(id)) styles.set(id, voiceStyle(ort, spec || styleJson(id))); return styles.get(id); };

const raw = new Map();     // render cache: the same settings are only made once
async function render({ text, sentence, voiceId, spec, steps = 8, speed = 1.05, clean = false }) {
  const key = JSON.stringify([text, sentence, voiceId, steps, speed, clean]);
  if (!raw.has(key)) {
    const said = clean ? lively(text) : text;
    const t = Date.now();
    raw.set(key, await tts.speak(said, { lang: 'en', style: styleOf(voiceId, spec), speed, steps, random: seeded(SEED[sentence]) }));
    process.stdout.write(`  made ${voiceId} ${sentence} steps=${steps} speed=${speed}${clean ? ' clean' : ''} in ${Date.now() - t} ms\n`);
  }
  return raw.get(key);
}

// ------------------------------------------------------------------ files
function wav16(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf;
}

const manifest = [];
const stats = [];
const voiceName = (id) => VOICE_NAMES[id] || id;

function save(group, file, samples, info) {
  const loud = matchLoudness(samples, LOUDNESS);
  fs.mkdirSync(path.join(outDir, group), { recursive: true });
  fs.writeFileSync(path.join(outDir, group, `${file}.wav`), wav16(loud, tts.sampleRate));
  const m = measure(loud, tts.sampleRate);
  manifest.push({ group, file: `${file}.wav`, ...info, seconds: Number((loud.length / tts.sampleRate).toFixed(2)) });
  stats.push({ group, file: `${file}.wav`, text: info.text, ...m, seconds: Number((loud.length / tts.sampleRate).toFixed(2)) });
}

const clipName = (s, voiceId, setting) => `${s}-${SENTENCES[s].name}__${voiceName(voiceId)}__${setting}`.replace(/[^\w+.-]+/g, '_');
const NOW = { steps: 8, speed: 1.05, clean: false, warmth: 0 };
const pad = (n) => String(n).padStart(2, '0');
const wanted = (g) => !only || only.includes(g);
const VOICE = 'F1';      // the tuning clips use one voice, so only the setting changes (Clara)

async function clip(group, voiceId, s, opts, setting, note, extra = {}) {
  const o = { ...NOW, ...opts };
  const samples = warm(await render({ text: SENTENCES[s].text, sentence: s, voiceId, spec: extra.spec, steps: o.steps, speed: o.speed, clean: o.clean }), tts.sampleRate, o.warmth);
  save(group, clipName(s, extra.label || voiceId, setting), samples, { s, voice: extra.label || voiceName(voiceId), setting, note, text: o.clean ? lively(SENTENCES[s].text) : SENTENCES[s].text });
}

// ------------------------------------------------------------------ 1. the experiments, one setting at a time
if (wanted('steps')) {
  console.log('1 steps');
  for (const s of ['A', 'B']) for (const steps of [3, 5, 8, 12, 16]) {
    await clip('1-steps', VOICE, s, { steps }, `steps-${pad(steps)}${steps === 8 ? '-NOW' : ''}`, `${steps} refinement steps${steps === 8 ? ' (what the app uses most of the time)' : steps === 5 ? ' (what it drops to for the first sentence and on slower computers)' : ''}`);
  }
}
if (wanted('speed')) {
  console.log('2 speed');
  for (const s of ['A', 'B']) for (const speed of [0.95, 1.05, 1.15, 1.25, 1.35]) {
    await clip('2-speed', VOICE, s, { speed }, `speed-${speed.toFixed(2)}${speed === 1.05 ? '-NOW' : ''}`, `speed ${speed.toFixed(2)}${speed === 1.05 ? ' (the app’s normal)' : ''}`);
  }
}
if (wanted('text')) {
  console.log('3 text');
  for (const s of ['A', 'B']) {
    await clip('3-text-cleanup', VOICE, s, { clean: false }, 'text-NOW-dash-becomes-hyphen', 'the text as the app prepares it now (a dash becomes a plain hyphen)');
    await clip('3-text-cleanup', VOICE, s, { clean: true }, 'text-dash-becomes-pause', 'a dash read as a pause (a comma)');
  }
}
if (wanted('tags')) {
  console.log('4 tags');
  const tagged = {
    A: { text: '<breath> The morning light came slowly through the window, and for a moment, the whole house felt calm and still. <sigh>', tag: 'breath at the start, sigh at the end' },
    B: { text: 'Oh, you made it! <laugh> Come in, come in, I was just about to put the kettle on.', tag: 'a laugh after the greeting' },
  };
  for (const s of ['A', 'B']) {
    await clip('4-expression-tags', VOICE, s, { clean: true }, 'tags-NONE-for-comparison', 'no tags (cleaned text), for comparison');
    const samples = await render({ text: tagged[s].text, sentence: s, voiceId: VOICE, steps: 8, speed: 1.05 });
    save('4-expression-tags', clipName(s, VOICE, 'tags-WITH'), samples, { s, voice: voiceName(VOICE), setting: 'with tags', note: `Supertonic’s own tags: ${tagged[s].tag}`, text: tagged[s].text });
  }
}
if (wanted('warmth')) {
  console.log('5 warmth');
  for (const s of ['A', 'B']) for (const w of [0, 0.35, 0.6, 0.9, 1.2]) {
    await clip('5-warmth-filter', VOICE, s, { warmth: w }, `warmth-${w.toFixed(2)}${w === 0 ? '-NOW-none' : ''}`, w === 0 ? 'no filter (what the app does now)' : `warmth filter ${w.toFixed(2)} (more body, softer top, light smoothing)`);
  }
}

// ------------------------------------------------------------------ 2. recipes: the settings put together (these are guesses until someone listens)
const RECIPES = [
  ['NOW', { steps: 8, speed: 1.05, clean: false, warmth: 0 }, 'what the app does now'],
  ['WARM', { steps: 8, speed: 1.05, clean: true, warmth: 0.5 }, 'the same pace, with the dash fix and a gentle warmth filter'],
  ['WARM-LIVELY', { steps: 12, speed: 1.15, clean: true, warmth: 0.5 }, 'warm, a little quicker, 12 steps'],
  ['LIVELY', { steps: 12, speed: 1.25, clean: true, warmth: 0.35 }, 'quicker still, lighter filter'],
];
if (wanted('recipes')) {
  console.log('6 recipes');
  for (const voiceId of ['F1', 'M1']) for (const s of ['A', 'B', 'C']) for (const [name, o, note] of RECIPES) {
    await clip('6-recipes', voiceId, s, o, `recipe-${name}`, note);
  }
}

// ------------------------------------------------------------------ 3. blended voices, all at the WARM-LIVELY recipe
const BEST = RECIPES.find((r) => r[0] === 'WARM-LIVELY')[1];
const F = ['F1', 'F2', 'F3', 'F4', 'F5'], M = ['M1', 'M2', 'M3', 'M4', 'M5'];
const mean = (ids) => ids.map((id) => [styleJson(id), 1 / ids.length]);
const BLENDS = [
  ['Clara+Maya', [['F1', 0.5], ['F2', 0.5]]],
  ['Clara+Nora', [['F1', 0.5], ['F3', 0.5]]],
  ['Maya+Zoe', [['F2', 0.5], ['F5', 0.5]]],
  ['Nora+Sofia', [['F3', 0.5], ['F4', 0.5]]],
  ['Sofia+Zoe', [['F4', 0.5], ['F5', 0.5]]],
  ['Ethan+Leo', [['M1', 0.5], ['M2', 0.5]]],
  ['Ethan+Marcus', [['M1', 0.5], ['M3', 0.5]]],
  ['Leo+Owen', [['M2', 0.5], ['M4', 0.5]]],
  ['Marcus+Theo', [['M3', 0.5], ['M5', 0.5]]],
  ['Clara+Ethan (neutral)', [['F1', 0.5], ['M1', 0.5]]],
  ['Average of all women', null, mean(F)],
  ['Average of all men', null, mean(M)],
  ['Clara pushed further from the others', null, [[styleJson('F1'), 1.5], ...F.slice(1).map((id) => [styleJson(id), -0.125])]],
  ['Maya pushed further from the others', null, [[styleJson('F2'), 1.5], ...['F1', 'F3', 'F4', 'F5'].map((id) => [styleJson(id), -0.125])]],
];
if (wanted('blends')) {
  console.log('7 blends');
  for (const s of ['A', 'B']) {
    for (const id of [...F, ...M]) await clip('7-blended-voices', id, s, BEST, `single-voice`, `${voiceName(id)}, not blended (for comparison)`);
    for (const [label, parts, direct] of BLENDS) {
      const spec = mixStyles(direct || parts.map(([id, w]) => [styleJson(id), w]));
      const id = `blend:${label}`;
      await clip('7-blended-voices', id, s, BEST, 'BLEND', direct ? `a voice made from ${label.toLowerCase()}` : `${label} mixed half and half`, { spec, label });
    }
  }
}

// ------------------------------------------------------------------ the listening page and the numbers
fs.mkdirSync(outDir, { recursive: true });
const manifestFile = path.join(outDir, 'manifest.json');
let all = [];
try { all = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch { /* first run */ }
const merged = new Map(all.map((c) => [`${c.group}/${c.file}`, c]));
for (const c of manifest) merged.set(`${c.group}/${c.file}`, c);
fs.writeFileSync(manifestFile, JSON.stringify([...merged.values()].sort((a, b) => `${a.group}/${a.file}`.localeCompare(`${b.group}/${b.file}`)), null, 1));
let measures = {};
try { measures = JSON.parse(fs.readFileSync(path.join(outDir, 'measurements.json'), 'utf8')); } catch { /* first run */ }
for (const s of stats) measures[`${s.group}/${s.file}`] = s;
fs.writeFileSync(path.join(outDir, 'measurements.json'), JSON.stringify(measures, null, 1));
console.log(`done: ${manifest.length} clips written to ${outDir}`);
