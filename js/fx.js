// Celebrations. Built on canvas-confetti (MIT, vendored in /vendor) plus our own staged "level complete" show.
import { sfx } from './audio.js';
import { sleep, rnd, esc } from './util.js';

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = () => window.confetti;
const PAL = {
  sparkle: ['#ff5fa8', '#ffb21f', '#2fc99e', '#38b6f2', '#8f5cf2', '#ffe066', '#ff7a5c'],
  block: ['#5dff7a', '#38d6ff', '#ffb84a', '#ff6b6b', '#b388ff', '#fff176', '#ffffff']
};
let theme = 'sparkle';
export const setFxTheme = t => { theme = t; };
const colors = () => PAL[theme];

// --- voice (speech synthesis; optional) ---
let VOICE = null, voiceOn = true;
export const setVoice = v => { voiceOn = v; if (!v) try { speechSynthesis.cancel(); } catch (e) { } };
function pickVoice() { const v = (window.speechSynthesis && speechSynthesis.getVoices()) || []; VOICE = v.find(x => /Samantha|Ava|Allison|Susan|Karen/i.test(x.name) && /en/i.test(x.lang)) || v.find(x => /en-US/i.test(x.lang)) || v.find(x => /^en/i.test(x.lang)) || null; }
if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
export function say(t, o = {}) {
  if (!voiceOn || !window.speechSynthesis) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); if (VOICE) u.voice = VOICE; u.rate = o.rate || (o.calm ? .85 : .95); u.pitch = o.pitch || (o.calm ? 1 : 1.15); speechSynthesis.speak(u); } catch (e) { }
}
export const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };

// --- bursts ---
export function burstAt(x, y, { n = 60, spread = 75, power = 38, emoji } = {}) {
  if (reduce() || !C()) return;
  const o = { particleCount: n, spread, startVelocity: power, origin: { x: x / innerWidth, y: y / innerHeight }, colors: colors(), ticks: 140, zIndex: 400, disableForReducedMotion: true };
  if (emoji) o.shapes = emoji.map(e => C().shapeFromText({ text: e, scalar: 2 })), o.scalar = 2;
  C()(o);
}
export function burstEl(el, opt) { const r = (el || document.body).getBoundingClientRect(); burstAt(r.left + r.width / 2, r.top + r.height / 2, opt); }
export function cannons(power = 1) {
  if (reduce() || !C()) return;
  const base = { particleCount: 90 * power, spread: 70, startVelocity: 60, colors: colors(), zIndex: 400, ticks: 220 };
  C()({ ...base, angle: 60, origin: { x: 0, y: .85 } }); C()({ ...base, angle: 120, origin: { x: 1, y: .85 } });
}
export async function fireworks(n = 6) {
  if (reduce() || !C()) return;
  for (let i = 0; i < n; i++) {
    const x = .15 + Math.random() * .7, y = .15 + Math.random() * .35;
    C()({ particleCount: 70, spread: 360, startVelocity: 28, gravity: .8, decay: .93, ticks: 90, origin: { x, y }, colors: colors(), zIndex: 400, scalar: 1.1 });
    sfx.boom(); await sleep(260 + Math.random() * 220);
  }
}
export function starRain(sec = 2.5, emoji = ['⭐', '✨']) {
  if (reduce() || !C()) return; const end = Date.now() + sec * 1000;
  const shapes = emoji.map(e => C().shapeFromText({ text: e, scalar: 2.5 }));
  (function f() { C()({ particleCount: 3, angle: 90, spread: 120, startVelocity: 12, gravity: .7, origin: { x: Math.random(), y: -.05 }, shapes, scalar: 2.5, zIndex: 400, ticks: 260 }); if (Date.now() < end) requestAnimationFrame(f); })();
}
export function floatText(text, x, y, cls = '') {
  const d = document.createElement('div'); d.className = 'float ' + cls; d.textContent = text; d.style.left = x + 'px'; d.style.top = y + 'px';
  document.body.appendChild(d); setTimeout(() => d.remove(), 1300);
}
export function floatEl(text, el, cls) { const r = el.getBoundingClientRect(); floatText(text, r.left + r.width / 2, r.top, cls); }
export function banner(text, sub = '') {
  const b = document.createElement('div'); b.className = 'banner'; b.innerHTML = `<b>${esc(text)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
  document.body.appendChild(b); setTimeout(() => b.classList.add('out'), 1500); setTimeout(() => b.remove(), 2000);
}
export function wiggle(el) { if (!el) return; el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); }

// --- the big one: staged "Level Complete" show. Resolves when the child taps continue. ---
export async function levelComplete({ title = 'Level Complete!', stars = 3, xp = 0, xpBefore = 0, accuracy = 1, lines = [], avatarHTML = '', unlocked = null, perfect = false }) {
  const ov = document.getElementById('ov');
  ov.className = 'on'; ov.dataset.k = 'lc';
  const letters = [...title].map((c, i) => `<span class="lcl" style="animation-delay:${i * .05}s">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
  ov.innerHTML = `<div class="lc"><div class="lc-glow"></div><div class="lc-title">${letters}</div>
    <div class="lc-av">${avatarHTML}</div>
    <div class="lc-stars">${[0, 1, 2].map(i => `<span class="lcs" data-i="${i}">★</span>`).join('')}</div>
    <div class="lc-xp"><span>+<b id="lcxp">0</b> XP</span></div>
    <div class="lc-lines">${lines.map(l => `<div>${l}</div>`).join('')}</div>
    <div class="lc-unlock" id="lcu"></div>
    <div class="lc-btns" id="lcb" style="opacity:0"></div></div>`;
  sfx.fanfare(); cannons(1.2);
  await sleep(500);
  for (let i = 0; i < 3; i++) {
    const el = ov.querySelector(`.lcs[data-i="${i}"]`);
    if (i < stars) { el.classList.add('on'); sfx.star(i); burstEl(el, { n: 40, spread: 90 }); buzz(20); }
    await sleep(430);
  }
  // count XP up with ticks
  const target = xp, step = Math.max(1, Math.round(target / 24)); let v = 0; const xe = ov.querySelector('#lcxp');
  while (v < target) { v = Math.min(target, v + step); xe.textContent = v; sfx.tick(); await sleep(35); }
  if (perfect) { starRain(3); sfx.levelUp(); } else if (stars >= 2) { fireworks(3); }
  await sleep(300);
  return ov;
}
export function lcButtons(html) { const b = document.getElementById('lcb'); if (b) { b.innerHTML = html; b.style.opacity = 1; setTimeout(() => b.scrollIntoView({ block: 'end', behavior: 'smooth' }), 150); } }
export function lcUnlock(html) { const u = document.getElementById('lcu'); if (u) { u.innerHTML = html; u.classList.add('show'); } }
export function closeOv() { const o = document.getElementById('ov'); o.className = ''; o.innerHTML = ''; o.dataset.k = ''; }
export function openOv(html, cls = '') { const o = document.getElementById('ov'); o.className = 'on ' + cls; o.innerHTML = html; o.dataset.k = ''; return o; }
