import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measure, centroid } from '../scripts/voice-measure.mjs';

const RATE = 44100;
const tone = (hz, seconds = 1, amp = 0.3) => Float32Array.from({ length: Math.round(RATE * seconds) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / RATE));
// A voice-like wobble: 200 Hz with its pitch moving by `depth` semitones.
const wobble = (depth) => { let phase = 0; return Float32Array.from({ length: RATE * 2 }, (_, i) => { const hz = 200 * 2 ** ((depth * Math.sin((2 * Math.PI * i * 3) / RATE)) / 12); phase += (2 * Math.PI * hz) / RATE; return 0.3 * Math.sin(phase) + 0.15 * Math.sin(2 * phase); }); };

test('the pitch of a steady tone is found', () => {
  assert.ok(Math.abs(measure(tone(180, 1.5), RATE).pitchHz - 180) < 4);
});
test('a voice whose pitch moves more is measured as moving more', () => {
  const flat = measure(wobble(0.2), RATE).pitchMoveSt, lively = measure(wobble(3), RATE).pitchMoveSt;
  assert.ok(lively > flat * 3, `flat ${flat}, lively ${lively}`);
});
test('a brighter sound has a higher centre than a darker one', () => {
  assert.ok(centroid(tone(3000), RATE) > centroid(tone(300), RATE) * 4);
});
test('silence measures as nothing', () => {
  assert.equal(measure(new Float32Array(RATE), RATE).pitchHz, 0);
});
