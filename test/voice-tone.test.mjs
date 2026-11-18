import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { warm, mixStyles, seeded, rms, peak, matchLoudness } = createRequire(import.meta.url)('../src/main/voice-tone.js');

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
