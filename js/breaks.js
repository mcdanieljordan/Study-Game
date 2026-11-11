// Brain breaks: movement, breathing, popping and a beat pad. Kids choose "1 of 3" so there is never a long menu.
// No scores, no losing — just reset the body and brain. (Breaks are soft-timed with a calm progress bar, never a ticking clock.)
import { sfx, startMusic, stopMusic } from './audio.js';
import { burstAt, burstEl, openOv, closeOv, say, fireworks, starRain, floatText } from './fx.js';
import { rnd, shuffle, sample, $, $$, today, esc } from './util.js';
import { P, save } from './store.js';

const NAMES = {
  ensley: { move: ['🦄', 'Unicorn Moves'], breathe: ['🌬️', 'Calm Breathing'], pop: ['🫧', 'Bubble Pop'], beat: ['🎹', 'Rainbow Beats'] },
  sida: { move: ['🏃', 'Parkour Moves'], breathe: ['🌀', 'Box Breathing'], pop: ['⛏️', 'Block Breaker'], beat: ['🎛️', 'Beat Pads'] }
};
const MOVES = {
  ensley: [['🦄', 'Gallop in place like a unicorn!'], ['🙆', 'Reach up high and touch the rainbow!'], ['🤸', 'Do 10 jumping jacks!'], ['👏', 'Clap the beats: gar‑den, sand‑wich!'], ['💃', 'Wiggle and shake it all out!'], ['🚶', 'March in place and say your favorite word!'], ['🌀', 'Spin slowly… then freeze!'], ['🙌', 'High‑five the sky 5 times!']],
  sida: [['🧎', '10 slow squats'], ['🙆', 'Reach both arms overhead and stretch tall'], ['🔄', 'Shoulder rolls — 5 forward, 5 back'], ['🦵', 'March in place, knees high — 20 steps'], ['🧘', 'Neck circles — slow, 3 each way'], ['💪', '10 wall push-ups'], ['🤸', '15 jumping jacks'], ['🫶', 'Shake out your hands and wrists']]
};
const wrap = (p, body, cls = '') => `<div class="sheet ${cls}">${body}</div>`;

export function offerBreak(profile, manual = false) {
  return new Promise(res => {
    const N = NAMES[profile], kinds = sample(Object.keys(N), 3), e = profile === 'ensley'; sfx.whoosh(); if (e) say('Brain break time!');
    openOv(wrap(profile, `<div class="big">🧠</div><h2>${manual ? 'Brain break' : (e ? 'Brain break time!' : 'Reset time')}</h2><p class="lead">${e ? 'Pick 1 of 3 to recharge your brain!' : 'Pick one to recharge.'}</p>
      <div class="row">${kinds.map(k => `<button class="btn big" data-k="${k}">${N[k][0]} ${N[k][1]}</button>`).join('')}</div>
      <button class="btn soft" data-k="skip">${manual ? '← Back' : 'Keep going'}</button>`));
    $('#ov').onclick = async ev => { const b = ev.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; if (k === 'skip') { closeOv(); return res(); } await run(profile, k); res(); };
  });
}
export const breather = profile => run(profile, 'breathe', 2);

const timers = []; const T = (f, ms, rep) => { const t = (rep ? setInterval : setTimeout)(f, ms); timers.push(t); return t; };
const clear = () => { timers.splice(0).forEach(t => { clearTimeout(t); clearInterval(t); }); stopMusic(); };
async function run(profile, kind, cycles) {
  await new Promise(res => {
    const done = msg => { clear(); const p = P(profile); const d = (p.plan[today()] ||= {}); d.brk = (d.brk || 0) + 1; save(profile); sfx.levelUp(); burstAt(innerWidth / 2, innerHeight / 2, { n: 100, spread: 120 }); if (profile === 'ensley') say('Brain recharged! Great job!');
      openOv(wrap(profile, `<div class="big">🧠⚡</div><h2>Brain recharged!</h2><p class="lead">${esc(msg || '')}</p><button class="btn big mint" data-d="1">Back to learning!</button>`)); $('#ov').onclick = ev => { if (ev.target.closest('[data-d]')) { closeOv(); res(); } }; };
    const skipBtn = `<button class="btn soft sm" data-skip="1">Done</button>`;
    const bindSkip = () => { $('#ov').onclick = ev => { if (ev.target.closest('[data-skip]')) done('Nice reset.'); }; };
    if (kind === 'move') moveBreak(profile, done, skipBtn, bindSkip);
    else if (kind === 'breathe') breatheBreak(profile, done, skipBtn, bindSkip, cycles || 3);
    else if (kind === 'pop') popBreak(profile, done, skipBtn, bindSkip);
    else beatBreak(profile, done, skipBtn, bindSkip);
  });
}
function moveBreak(profile, done, skipBtn, bindSkip) {
  const seq = sample(MOVES[profile], 5); let i = 0, t = 8; startMusic();
  const draw = () => { const [e, m] = seq[i]; openOv(wrap(profile, `<div class="chip mint">Move ${i + 1} of ${seq.length}</div><div class="big bounce">${e}</div><h2>${esc(m)}</h2><div class="bar"><i id="mb" style="width:0%"></i></div>${skipBtn}`, 'wide')); bindSkip(); if (profile === 'ensley') say(m); };
  draw(); sfx.whoosh();
  T(() => { t--; sfx.tick(); const b = $('#mb'); if (b) b.style.width = ((8 - t) / 8 * 100) + '%'; if (t <= 0) { i++; t = 8; if (i >= seq.length) return done('You moved your body!'); sfx.star(i % 3); burstAt(innerWidth / 2, innerHeight / 2, { n: 40 }); draw(); } }, 1000, true);
}
function breatheBreak(profile, done, skipBtn, bindSkip, cycles) {
  let c = 0; const box = profile === 'sida';
  openOv(wrap(profile, `<div class="chip">${box ? 'Box breathing: 4 in · 4 hold · 4 out · 4 hold' : 'Breathe with the circle'}</div><div class="ring" id="rg">${box ? '◻' : '🌸'}</div><h2 id="bw">Get ready…</h2>${skipBtn}`, 'wide calmbg')); bindSkip(); if (profile === 'ensley') say('Let\'s breathe together. Nice and slow.', { calm: true });
  const cycle = () => {
    if (c >= cycles) return done('You are calm and ready.');
    const rg = $('#rg'), bw = $('#bw'); if (!rg) return;
    const phases = box ? [['Breathe in…', 1.35, 4], ['Hold…', 1.35, 4], ['Breathe out…', .85, 4], ['Hold…', .85, 4]] : [['Breathe in… 🌸', 1.35, 4], ['Hold… ✨', 1.35, 2], ['Breathe out… 🌬️', .85, 6]];
    let at = 0; phases.forEach(([txt, sc, d]) => { T(() => { if (!$('#rg')) return; rg.style.setProperty('--t', d + 's'); rg.style.transform = `scale(${sc})`; bw.textContent = txt; if (/in|out/.test(txt)) sfx.note(c); }, at * 1000); at += d; });
    T(() => { c++; cycle(); }, at * 1000);
  };
  T(cycle, 1800);
}
function popBreak(profile, done, skipBtn, bindSkip) {
  let n = 0, left = 20; const e = profile === 'ensley'; startMusic();
  openOv(wrap(profile, `<div class="row between"><span class="chip mint">${e ? '🫧 Pop the bubbles!' : '⛏️ Break the blocks!'}</span><span class="chip sun">Popped <b id="pn">0</b></span><span class="bar mini"><i id="pt" style="width:100%"></i></span></div><div class="bubblebox" id="bbox"></div>${skipBtn}`, 'full')); bindSkip();
  const faces = e ? ['⭐', '💖', '🦄', '🌈', '✨', '🍭'] : ['🟩', '🟦', '🟨', '🟥', '🟪', '🟧'];
  const spawn = () => { const b = $('#bbox'); if (!b) return; const d = document.createElement('button'); d.className = 'bub ' + (e ? '' : 'sq'); d.style.left = Math.random() * (b.clientWidth - 80) + 'px'; d.style.setProperty('--d', (4 + Math.random() * 3) + 's'); d.style.setProperty('--bc', rnd(['#ffb3d9', '#b3e6ff', '#d9c2ff', '#fff0a8', '#b3f5dd'])); d.textContent = rnd(faces);
    d.addEventListener('pointerdown', ev => { ev.preventDefault(); n++; sfx.pop(n % 12); const r = d.getBoundingClientRect(); burstAt(r.left + r.width / 2, r.top + r.height / 2, { n: 14, spread: 60, power: 25 }); d.remove(); const c = $('#pn'); if (c) c.textContent = n; });
    b.appendChild(d); setTimeout(() => d.remove(), 7500); };
  T(spawn, 420, true); spawn();
  T(() => { left--; const b = $('#pt'); if (b) b.style.width = (left / 20 * 100) + '%'; if (left <= 0) done(`You ${e ? 'popped' : 'broke'} ${n}!`); }, 1000, true);
}
function beatBreak(profile, done, skipBtn, bindSkip) {
  let notes = 0; const e = profile === 'ensley', cols = e ? ['#ff5fa8', '#ff9a3d', '#ffc94a', '#2fc99e', '#38b6f2', '#8f5cf2', '#d95bd9', '#ff7a5c'] : ['#5dff7a', '#38d6ff', '#ffb84a', '#ff6b6b', '#b388ff', '#fff176', '#4dd0e1', '#ff8a65'];
  openOv(wrap(profile, `<div class="chip mint">${e ? '🎹 Make a rainbow song!' : '🎛️ Make a beat'}</div><p class="lead">Tap the pads. Make your own music.</p><div class="pads">${cols.map((c, i) => `<button class="pad" style="--pc:${c}" data-p="${i}">${['♪', '♫', '♪', '♬', '♪', '♫', '♪', '♬'][i]}</button>`).join('')}</div><span class="chip sun">Notes <b id="pn">0</b></span><button class="btn mint" data-fin="1">I made music! 🎵</button>`, 'wide'));
  $('#ov').onclick = ev => { const f = ev.target.closest('[data-fin]'); if (f) return done('You made music!'); const b = ev.target.closest('.pad'); if (!b) return; notes++; sfx.note(+b.dataset.p); burstEl(b, { n: 10, spread: 50, power: 22 }); $('#pn').textContent = notes; if (notes === 16) floatText(e ? 'A songwriter!' : 'Producer mode.', innerWidth / 2, innerHeight / 2); };
}
