// Rough measurements of a spoken clip, to go with listening: how high the voice is, how much its pitch moves
// (a flat voice moves little), and how bright it is. They are hints, not a verdict: ears decide.

/** In-place radix-2 FFT of (re, im); length must be a power of two. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/** The "centre of mass" of the spectrum, in Hz, over the louder frames. Lower sounds warmer, higher sounds brighter. */
export function centroid(samples, rate, size = 2048) {
  const hann = Float32Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size));
  let weighted = 0, total = 0;
  for (let at = 0; at + size <= samples.length; at += size / 2) {
    const re = new Float64Array(size), im = new Float64Array(size);
    let energy = 0;
    for (let i = 0; i < size; i++) { re[i] = samples[at + i] * hann[i]; energy += re[i] * re[i]; }
    if (energy / size < 1e-5) continue;                       // a pause
    fft(re, im);
    for (let k = 1; k < size / 2; k++) { const m = Math.hypot(re[k], im[k]); weighted += m * ((k * rate) / size); total += m; }
  }
  return total ? weighted / total : 0;
}

/** The pitch (Hz) of each voiced stretch, by autocorrelation. */
export function pitchTrack(samples, rate, { min = 70, max = 420 } = {}) {
  const frame = Math.round(rate * 0.04), hop = Math.round(rate * 0.01);
  const lo = Math.floor(rate / max), hi = Math.ceil(rate / min);
  const out = [];
  for (let at = 0; at + frame + hi < samples.length; at += hop) {
    let e0 = 0;
    for (let i = 0; i < frame; i++) e0 += samples[at + i] * samples[at + i];
    if (e0 / frame < 2e-4) continue;                          // too quiet to be voiced
    let best = 0, bestLag = 0;
    for (let lag = lo; lag <= hi; lag++) {
      let c = 0, e1 = 0;
      for (let i = 0; i < frame; i++) { c += samples[at + i] * samples[at + i + lag]; e1 += samples[at + i + lag] * samples[at + i + lag]; }
      const r = c / Math.sqrt(e0 * e1 + 1e-12);
      if (r > best) { best = r; bestLag = lag; }
    }
    if (best > 0.55) out.push(rate / bestLag);
  }
  // Drop single-frame jumps (an octave slip) with a 5-frame median.
  return out.map((_, i) => { const w = out.slice(Math.max(0, i - 2), i + 3).sort((a, b) => a - b); return w[w.length >> 1]; });
}

const semitones = (hz, ref) => 12 * Math.log2(hz / ref);

export function measure(samples, rate) {
  const f0 = pitchTrack(samples, rate);
  const out = { centroidHz: Math.round(centroid(samples, rate)), voicedShare: Number((f0.length / Math.max(1, samples.length / (rate * 0.01))).toFixed(2)) };
  if (f0.length < 10) return { ...out, pitchHz: 0, pitchMoveSt: 0, pitchRangeSt: 0 };
  const mean = f0.reduce((a, b) => a + b, 0) / f0.length;
  const st = f0.map((v) => semitones(v, mean)).sort((a, b) => a - b);
  const sd = Math.sqrt(st.reduce((a, b) => a + b * b, 0) / st.length);
  return {
    ...out,
    pitchHz: Math.round(mean),
    pitchMoveSt: Number(sd.toFixed(2)),                                         // how much the pitch wanders, in semitones
    pitchRangeSt: Number((st[Math.floor(st.length * 0.95)] - st[Math.floor(st.length * 0.05)]).toFixed(2)),
  };
}
