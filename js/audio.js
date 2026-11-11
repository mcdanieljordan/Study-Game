// Synthesised sound — no audio files, no network. Two sound "themes":
//   sparkle = bell-like triangle/sine (Ensley)      block = chiptune square/pulse (Sida)
// Design rule from the research plan: wrong answers are SOFT and low — never a buzzer.
let AC, master, theme = 'sparkle', enabled = true, musicTimer = 0, musicOn = false;

export function setAudio(o) { if ('theme' in o) theme = o.theme; if ('sound' in o) enabled = o.sound; if (!enabled) stopMusic(); }
function ctx() {
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      const comp = AC.createDynamicsCompressor(); master = AC.createGain(); master.gain.value = .9;
      master.connect(comp); comp.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { return null; }
  return AC;
}
export function unlock() { ctx(); }
function tone(f, t0, d, type = 'sine', vol = .18, glide) {
  if (!enabled) return; const a = ctx(); if (!a) return; const t = a.currentTime + t0;
  const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + d);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05);
}
function noise(t0, d, vol = .12, cutoff = 800) {
  if (!enabled) return; const a = ctx(); if (!a) return; const t = a.currentTime + t0;
  const buf = a.createBuffer(1, a.sampleRate * d, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = cutoff; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
const N = n => 261.63 * Math.pow(2, n / 12);
const PENT = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const blk = () => theme === 'block';
const wave = () => blk() ? 'square' : 'triangle';
const lv = () => blk() ? .07 : .2;   // chiptune squares are loud — keep them lower

export const sfx = {
  tap() { tone(blk() ? 520 : 660, 0, .06, blk() ? 'square' : 'sine', blk() ? .05 : .08); },
  correct(streak = 1) {                       // rising arpeggio, climbs with the streak
    const b = Math.min(streak - 1, 6) * 2;
    [0, 2, 4, 7].forEach((k, i) => { tone(N(PENT[k] + b), i * .07, .32, wave(), lv()); if (!blk()) tone(N(PENT[k] + b + 12), i * .07, .28, 'sine', .07); });
    if (blk()) tone(N(PENT[5] + b), .3, .25, 'square', .06); else sparkle(.35, 5);
  },
  assisted() { [0, 4, 7].forEach((k, i) => tone(N(k + 7), i * .1, .35, 'sine', .12)); },
  wrong() { tone(392, 0, .3, 'sine', .09); tone(330, .16, .45, 'sine', .08); },   // soft, warm, low — never harsh
  learn() { [0, 4, 7].forEach((k, i) => tone(N(k + 7), i * .12, .4, 'sine', .11)); },
  star(i = 0) { tone(N(PENT[4 + i * 2]), 0, .5, blk() ? 'square' : 'triangle', blk() ? .08 : .22); tone(N(PENT[4 + i * 2] + 12), .02, .4, 'sine', .08); },
  coin() { tone(988, 0, .08, 'square', .07); tone(1319, .07, .35, 'square', .07); },
  build() { tone(110, 0, .25, 'sine', .25, 55); noise(0, .2, .18, 600); tone(N(12), .12, .2, 'square', .05); },
  levelUp() {
    [0, 4, 7, 12, 16, 19, 24].forEach((k, i) => { tone(N(k), i * .08, .5, wave(), lv()); tone(N(k + 12), i * .08 + .02, .4, 'sine', .07); });
    [0, 4, 7, 12].forEach(k => tone(N(k + 12), .7, 1.2, 'triangle', .14)); sparkle(.9, 14);
  },
  fanfare() {
    [[0, 0], [0, .14], [0, .28], [5, .42], [4, .62], [0, .82], [4, .96], [7, 1.1]].forEach(([k, t]) => tone(N(k + 12), t, .22, blk() ? 'square' : 'triangle', blk() ? .07 : .2));
    [0, 4, 7, 12].forEach(k => tone(N(k + 12), 1.2, 1.4, 'triangle', .14)); sparkle(1.2, 16);
  },
  unlock() { [7, 11, 14, 19].forEach((k, i) => tone(N(k + 12), i * .09, .35, 'sine', .14)); sparkle(.3, 6); },
  pop(i = 0) { tone(500 + i * 28, 0, .12, 'sine', .15, 1200 + i * 40); },
  tick() { tone(880, 0, .04, 'square', .035); },
  whoosh() { tone(200, 0, .5, 'sine', .06, 900); noise(0, .35, .05, 2000); },
  note(i = 0) { tone(N(PENT[i % 8]), 0, .7, blk() ? 'square' : 'triangle', blk() ? .07 : .22); if (!blk()) tone(N(PENT[i % 8] + 12), 0, .5, 'sine', .06); },
  boom() { tone(80, 0, .5, 'sine', .3, 40); noise(0, .4, .2, 500); }
};
function sparkle(len, n) { for (let i = 0; i < n; i++) tone(N(PENT[(Math.random() * PENT.length) | 0] + 24), Math.random() * len, .12, 'sine', .045); }

// Soft generative backing music for brain breaks. Off during learning (cognitive load).
export function startMusic() {
  if (!enabled || musicOn) return; musicOn = true; let i = 0;
  const seq = [0, 4, 7, 9, 7, 4, 2, 4, 0, 4, 7, 12, 9, 7, 4, 2];
  musicTimer = setInterval(() => {
    const k = seq[i++ % seq.length];
    tone(N(k), 0, .5, blk() ? 'square' : 'sine', blk() ? .03 : .06);
    if (i % 4 === 1) tone(N(k - 12), 0, 1.1, 'triangle', .05);
  }, 260);
}
export function stopMusic() { clearInterval(musicTimer); musicOn = false; }
