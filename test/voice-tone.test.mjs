import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const tone = createRequire(import.meta.url)('../src/main/core/read-aloud/voice-tone.js');
const { warm, mixStyles, seeded, rms, peak, matchLoudness } = tone;

const RATE = 44100;
const sine = (hz, seconds = 0.5, amp = 0.2) => Float32Array.from({ length: Math.round(RATE * seconds) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / RATE));
// Energy of the middle of a clip, after the filter has settled.
const level = (s) => rms(s.subarray(Math.floor(s.length * 0.3), Math.floor(s.length * 0.9)));

// How much of one pitch is in a clip (Goertzel).
const power = (s, hz) => {
  const k = 2 * Math.cos((2 * Math.PI * hz) / RATE);
  let a = 0, b = 0;
  for (let i = 0; i < s.length; i++) { const c = s[i] + k * a - b; b = a; a = c; }
  return Math.sqrt(a * a + b * b - k * a * b) / s.length;
};

test('warming adds body to the low voice and softens the high end', () => {
  const low = sine(120), high = sine(9000);
  const both = low.map((v, i) => v + high[i]);
  const out = warm(both, RATE, 0.8);
  const settled = (s) => s.subarray(Math.floor(s.length * 0.3));
  const before = power(settled(both), 120) / power(settled(both), 9000);
  const after = power(settled(out), 120) / power(settled(out), 9000);
  assert.ok(after > before * 1.5, `low-to-high balance went from ${before.toFixed(1)} to ${after.toFixed(1)}`);
});

test('a warmed clip is no louder than the original, and never clips', () => {
  const clip = Float32Array.from({ length: RATE }, (_, i) => 0.3 * Math.sin(i / 30) * Math.sin(i / 4000));
  const out = warm(clip, RATE, 1);
  assert.ok(Math.abs(rms(out) - rms(clip)) / rms(clip) < 0.05 || peak(out) <= 0.951);
  assert.ok(peak(out) <= 0.951);
});

test('warmth of 0 leaves the sound exactly as it was', () => {
  const clip = sine(300);
  assert.equal(warm(clip, RATE, 0), clip);
});

test('loudness matching reaches the target without passing the ceiling', () => {
  const quiet = sine(200, 0.3, 0.01);
  assert.ok(Math.abs(rms(matchLoudness(quiet, 0.1)) - 0.1) < 0.005);
  const spiky = Float32Array.from([0.9, 0, 0, 0, 0, 0, 0, 0]);
  assert.ok(peak(matchLoudness(spiky, 0.5, 0.95)) <= 0.9501);
});

const style = (ttl, dp) => ({ style_ttl: { dims: [1, 2, 2], type: 'float32', data: [[ttl.slice(0, 2), ttl.slice(2)]] }, style_dp: { dims: [1, 2], type: 'float32', data: [dp] } });

test('blending voices averages their style data and keeps the file shape', () => {
  const a = style([0, 0, 0, 0], [0, 0]);
  const b = style([2, 4, 6, 8], [10, 20]);
  const mix = mixStyles([[a, 0.5], [b, 0.5]]);
  assert.deepEqual(mix.style_ttl.data, [1, 2, 3, 4]);
  assert.deepEqual(mix.style_dp.data, [5, 10]);
  assert.deepEqual(mix.style_ttl.dims, [1, 2, 2]);
  assert.equal(mix.style_ttl.type, 'float32');
});

test('a weight outside 0..1 pushes a voice further from the other', () => {
  const a = style([0, 0, 0, 0], [0, 0]), b = style([1, 1, 1, 1], [1, 1]);
  assert.deepEqual(mixStyles([[a, -0.5], [b, 1.5]]).style_dp.data, [1.5, 1.5]);
});

test('voices of different shapes are refused', () => {
  const a = style([0, 0, 0, 0], [0, 0]);
  const odd = { style_ttl: { dims: [1, 4], data: [[1, 2, 3, 4]] }, style_dp: { dims: [1, 2], data: [[1, 2]] } };
  assert.throws(() => mixStyles([[a, 0.5], [odd, 0.5]]), /don’t fit/);
});

test('seeded noise repeats, and differs between seeds', () => {
  const x = seeded(7), y = seeded(7), z = seeded(8);
  const a = [x(), x(), x()], b = [y(), y(), y()], c = [z(), z(), z()];
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(a.every((v) => v >= 0 && v < 1));
});

test('trimSilence: keeps head before the first sound and tail after the last, and never adds quiet', () => {
  const rate = 1000;
  const clip = new Float32Array(1300);
  for (let i = 400; i < 1000; i++) clip[i] = 0.3;
  assert.equal(tone.trimSilence(clip, rate, 0.1, 0.3).length, 100 + 600 + 300);
  assert.equal(tone.trimSilence(clip, rate, 0.1, 0.05).length, 100 + 600 + 50);
  assert.equal(tone.trimSilence(clip, rate, 1, 1), clip, 'asking for more quiet than there is returns the clip as it is');
  const quiet = new Float32Array(500);
  assert.equal(tone.trimSilence(quiet, rate), quiet, 'a clip with no sound is left alone');
  const tight = new Float32Array(100).fill(0.2);
  assert.equal(tone.trimSilence(tight, rate, 0.1, 0.3), tight);
});

test('reading settings: pace, quality, warmth and breathing are made safe, and a missing setting gets the default', () => {
  assert.deepEqual(tone.cleanReading(undefined), tone.DEFAULT_READING);
  assert.deepEqual(tone.cleanReading({ pace: '1.25', quality: 'best', warmth: 0, breathing: 'paragraphs' }), { pace: 1.25, quality: 'best', warmth: 0, breathing: 'paragraphs' });
  assert.deepEqual(tone.cleanReading({ pace: 3, quality: 'ultra', warmth: 9, breathing: 'always' }), tone.DEFAULT_READING, 'out-of-range values fall back');
  assert.equal(tone.cleanReading({ warmth: '1.2' }).warmth, 1.2);
  assert.equal(tone.cleanReading({ warmth: 1.07 }).warmth, tone.DEFAULT_READING.warmth, 'only the offered warmths');
  assert.ok(tone.PACES.includes(tone.DEFAULT_READING.pace) && tone.WARMTHS.includes(tone.DEFAULT_READING.warmth));
  assert.deepEqual(tone.QUALITY, { faster: 8, balanced: 12, best: 16 });
});

test('affordableSteps: a slow computer steps down through the levels, never below the quick five, never above what was asked', () => {
  // 0.1 is this VM: each step costs a tenth of the speech's length.
  assert.equal(tone.affordableSteps(16, 0.1), 5);
  assert.equal(tone.affordableSteps(16, 0.04), 16);       // 16 × 0.04 = 0.64 of real time
  assert.equal(tone.affordableSteps(16, 0.05), 12);       // 16 × 0.05 = 0.8 is too slow; 12 × 0.05 = 0.6 fits
  assert.equal(tone.affordableSteps(12, 0.07), 8);
  assert.equal(tone.affordableSteps(8, 0.01), 8, 'not more than was asked for');
  assert.equal(tone.affordableSteps(16, 0.5), 5, 'a very slow computer still gets the quick five');
  assert.equal(tone.affordableSteps(12, 0), 12, 'no measurement yet: what was asked for');
});

test('stepGovernor: goes by the middle of the last few sentences, so one slow one does not decide, and it can let steps back up', () => {
  const g = tone.stepGovernor(3);
  assert.equal(g.cap(16), 16, 'nothing measured yet');
  g.note(5000, 5, 5);                        // 0.2 per step: the first sentence, slow while the voice warms up
  assert.equal(g.cap(16), 5);
  g.note(2000, 5, 12);                       // 0.033 per step
  g.note(2200, 5, 12);
  assert.equal(g.cap(16), 16, 'the middle of the three is fast, so full quality');
  g.note(5000, 5, 12);                       // a busy moment: 0.083 per step
  g.note(5000, 5, 12);
  assert.equal(g.cap(16), 8, 'two slow in a row do bring it down');
  g.note(0, 5, 12); g.note(100, 0, 12); g.note(100, 5, 0);
  assert.equal(g.cap(16), 8, 'a measurement that makes no sense is ignored');
  g.reset();
  assert.equal(g.cap(12), 12);
});

test('mixStyles with the shipped blends: a half-and-half mix lies between its two voices, in the same shape', () => {
  const voice = (seed) => { const r = seeded(seed); return { style_ttl: { dims: [1, 2, 3], type: 'float32', data: [[[...Array(3)].map(() => r()), [...Array(3)].map(() => r())]] }, style_dp: { dims: [1, 1, 2], type: 'float32', data: [[[r(), r()]]] } }; };
  const a = voice(1), b = voice(2);
  const mix = mixStyles([[a, 0.5], [b, 0.5]]);
  assert.deepEqual(mix.style_ttl.dims, [1, 2, 3]);
  const flat = (v) => v.data.flat(Infinity);
  flat(mix.style_ttl).forEach((v, i) => assert.ok(Math.abs(v - (flat(a.style_ttl)[i] + flat(b.style_ttl)[i]) / 2) < 1e-6));
  assert.throws(() => mixStyles([[a, 0.5], [{ style_ttl: { dims: [1, 9], data: [new Array(9).fill(0)] }, style_dp: a.style_dp }, 0.5]]), /don’t fit/);
});
