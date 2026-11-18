'use strict';
// Natural voices: shaping how they sound. Pure functions on sample arrays and voice-style data, so they run
// anywhere (the page, the worker, the tests) and need nothing downloaded.
//
//  - warm()         a gentle tone filter after speaking: a little more body, a softer top, light smoothing.
//  - mixStyles()    a new voice made by blending the style data of voices the model already ships.
//  - matchLoudness() the same loudness before and after, so a filtered clip isn't "better" just by being louder.

// ---------------------------------------------------------------------------- tone

/** A biquad filter (R. Bristow-Johnson's audio EQ cookbook). type: 'lowshelf' | 'highshelf' | 'peak'. */
function biquad(type, rate, freq, gainDb, q = 0.707) {
  const A = 10 ** (gainDb / 40);
  const w = (2 * Math.PI * freq) / rate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  const beta = 2 * Math.sqrt(A) * alpha;
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowshelf') {
    b0 = A * ((A + 1) - (A - 1) * cos + beta); b1 = 2 * A * ((A - 1) - (A + 1) * cos); b2 = A * ((A + 1) - (A - 1) * cos - beta);
    a0 = (A + 1) + (A - 1) * cos + beta; a1 = -2 * ((A - 1) + (A + 1) * cos); a2 = (A + 1) + (A - 1) * cos - beta;
  } else if (type === 'highshelf') {
    b0 = A * ((A + 1) + (A - 1) * cos + beta); b1 = -2 * A * ((A - 1) + (A + 1) * cos); b2 = A * ((A + 1) + (A - 1) * cos - beta);
    a0 = (A + 1) - (A - 1) * cos + beta; a1 = 2 * ((A - 1) - (A + 1) * cos); a2 = (A + 1) - (A - 1) * cos - beta;
  } else {
    b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A;
    a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function filter(samples, c) {
  const out = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  return out;
}

/** Gentle compression: quiet and loud words end up closer together. Soft knee, smooth attack and release. */
function smooth(samples, rate, { thresholdDb = -24, ratio = 2, attackMs = 8, releaseMs = 120 } = {}) {
  const out = new Float32Array(samples.length);
  const attack = Math.exp(-1 / ((attackMs / 1000) * rate));
  const release = Math.exp(-1 / ((releaseMs / 1000) * rate));
  let env = 0;
  for (let i = 0; i < samples.length; i++) {
    const level = Math.abs(samples[i]);
    env = level > env ? attack * env + (1 - attack) * level : release * env + (1 - release) * level;
    const db = 20 * Math.log10(Math.max(env, 1e-6));
    const over = db - thresholdDb;
    const reduction = over <= 0 ? 0 : over * (1 - 1 / ratio);
    out[i] = samples[i] * 10 ** (-reduction / 20);
  }
  return out;
}

const rms = (s) => { let t = 0; for (let i = 0; i < s.length; i++) t += s[i] * s[i]; return Math.sqrt(t / Math.max(1, s.length)); };
const peak = (s) => { let p = 0; for (let i = 0; i < s.length; i++) p = Math.max(p, Math.abs(s[i])); return p; };

/** Scale to a loudness (RMS, 0..1), never letting the loudest point pass `ceiling`. */
function matchLoudness(samples, target = 0.1, ceiling = 0.95) {
  const r = rms(samples);
  if (!r) return samples;
  const gain = Math.min(target / r, ceiling / Math.max(peak(samples), 1e-9));
  return samples.map((v) => v * gain);
}

/**
 * Make a voice sound warmer. `amount` runs from 0 (untouched) to 1 (clearly warm); about 0.5 is a gentle default.
 * More body in the low voice, a little presence so it isn't muffled, a softer top, and light smoothing.
 * Loudness stays what it was.
 */
function warm(samples, rate, amount = 0.5) {
  if (!(amount > 0) || !samples.length) return samples;
  const a = Math.min(1.5, amount);
  const before = rms(samples);
  let s = filter(samples, biquad('lowshelf', rate, 200, 3.5 * a));
  s = filter(s, biquad('peak', rate, 450, 1.5 * a, 0.8));
  s = filter(s, biquad('peak', rate, 3200, 1.0 * a, 0.9));
  s = filter(s, biquad('highshelf', rate, 7000, -3.5 * a));
  s = smooth(s, rate, { ratio: 1 + 1.2 * a });
  return matchLoudness(s, before);
}

// ---------------------------------------------------------------------------- voices

/**
 * Blend voice styles. `parts` is [[styleJson, weight], …]; the weights are used as given (they don't have to
 * add up to 1: a weight above 1 or below 0 pushes a voice further from, or past, the others). The result has
 * the same shape as a voice_styles/*.json file, so it goes wherever a voice file does.
 */
function mixStyles(parts) {
  if (!parts.length) throw new Error('Nothing to blend');
  const flat = (v) => Float32Array.from(v.data.flat(Infinity));
  const out = {};
  for (const key of ['style_ttl', 'style_dp']) {
    const first = parts[0][0][key];
    const data = new Float32Array(flat(first).length);
    for (const [json, weight] of parts) {
      const d = flat(json[key]);
      if (d.length !== data.length || json[key].dims.join() !== first.dims.join()) throw new Error('These voices don’t fit together');
      for (let i = 0; i < data.length; i++) data[i] += d[i] * weight;
    }
    out[key] = { ...first, data: Array.from(data) };
  }
  return out;
}

/** A repeatable stream of random numbers (so two clips can differ in one setting only). */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module.exports = { biquad, filter, smooth, rms, peak, matchLoudness, warm, mixStyles, seeded };
