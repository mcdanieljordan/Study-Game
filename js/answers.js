// Answer widgets. Each renderer draws into `host` and talks to the session through api.attempt(ok, resp),
// which answers 'correct' | 'retry' | 'reveal'. Renderers return { reveal() } so the session can show the answer gently.
// Wrong answers never use red or buzzers: wrong choices fade, correct letters stay green ("Wordle-style" help).
import { esc, shuffle, normText, $$ } from './util.js';
import { sfx } from './audio.js';
import { wiggle } from './fx.js';
import { tallySVG as svgTally } from './gen.js';

// ---------- checking ----------
export function parseNum(s) {
  s = String(s ?? '').trim().replace(/[−–]/g, '-').replace(/[$,%\s]/g, '');
  if (/^-?\d*\.?\d+\/-?\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return b ? a / b : NaN; }
  if (/^-?\d*\.?\d*$/.test(s) && /\d/.test(s)) return parseFloat(s);
  return NaN;
}
function linear(s) {
  s = String(s).toLowerCase().replace(/\s+/g, '').replace(/[−–]/g, '-'); if (!/^[0-9x+\-.*]+$/.test(s)) return null;
  const toks = s.match(/[+-]?[^+-]+/g); if (!toks) return null; let a = 0, b = 0;
  for (const t of toks) { const m = t.match(/^([+-]?)(\d*\.?\d*)\*?(x?)$/); if (!m || (m[2] === '' && m[3] === '')) return null; const sg = m[1] === '-' ? -1 : 1, n = m[2] === '' ? 1 : parseFloat(m[2]); if (m[3]) a += sg * n; else b += sg * n; }
  return [a, b];
}
export function checkText(q, resp) {
  if (q.check === 'linear') { const x = linear(resp), y = linear(q.answer); return !!(x && y && x[0] === y[0] && x[1] === y[1]); }
  return normText(resp) === normText(q.answer);
}
export function checkNum(q, resp) { const v = parseNum(resp), a = Number(q.answer); return Number.isFinite(v) && Math.abs(v - a) <= (q.tol ?? 1e-6); }

// ---------- multiple choice ----------
function mc(q, host, api) {
  const opts = (q.opts || []).map(o => typeof o === 'object' ? o : { v: o, html: esc(o) }), order = q.noShuffle ? opts : shuffle(opts);
  const long = q.tall || order.some(o => typeof o.v === 'string' && o.v.length > 24 && !o.html.startsWith('<svg'));
  host.innerHTML = `<div class="opts ${long ? 'one' : ''} ${q.big ? 'bigopt' : ''}">${order.map((o, i) => `<button class="opt" data-i="${i}">${o.html}</button>`).join('')}</div>`;
  const btns = $$('.opt', host); let locked = false;
  btns.forEach((b, i) => b.onclick = () => {
    if (locked || b.classList.contains('soft')) return;
    const ok = String(order[i].v) === String(q.answer); sfx.tap();
    const r = api.attempt(ok, String(order[i].v));
    if (ok) { b.classList.add('right'); locked = true; } else { b.classList.add('soft'); wiggle(b); }
  });
  return {
    reveal() { locked = true; btns.forEach((b, i) => { const c = String(order[i].v) === String(q.answer); b.classList.toggle('reveal', c); b.classList.toggle('soft', !c); }); },
    lock() { locked = true; }
  };
}

// ---------- tiles (build a word) ----------
function tiles(q, host, api) {
  const w = q.word, st = { slots: Array(w.length).fill(null), lock: Array(w.length).fill(false), t: shuffle(q.tiles.map((c, i) => ({ c, u: false, k: i }))) }; let locked = false, tries = 0;
  const draw = () => {
    $$('.slot', host).length || (host.innerHTML = `<div class="slots" id="sl"></div><div class="tiles" id="tl"></div><div class="row"><button class="btn soft sm" id="clr">↩ Start over</button></div>`);
    host.querySelector('#sl').innerHTML = st.slots.map((s, i) => `<button class="slot ${s ? 'f' : ''} ${st.lock[i] ? 'lock' : ''}" data-i="${i}">${s ? esc(s.c) : ''}</button>`).join('');
    host.querySelector('#tl').innerHTML = st.t.map((t, i) => `<button class="tl ${t.u ? 'used' : ''}" data-i="${i}">${esc(t.c)}</button>`).join('');
    $$('.tl', host).forEach(b => b.onclick = () => put(+b.dataset.i)); $$('.slot', host).forEach(b => b.onclick = () => take(+b.dataset.i));
    host.querySelector('#clr').onclick = () => { if (locked) return; st.slots.forEach((s, i) => { if (s && !st.lock[i]) { s.u = false; st.slots[i] = null; } }); draw(); };
  };
  const put = i => { if (locked) return; const t = st.t[i]; if (t.u) return; const p = st.slots.findIndex(s => !s); if (p < 0) return; st.slots[p] = t; t.u = true; sfx.tap(); draw(); if (st.slots.every(Boolean)) setTimeout(check, 260); };
  const take = i => { if (locked || !st.slots[i] || st.lock[i]) return; st.slots[i].u = false; st.slots[i] = null; sfx.tap(); draw(); };
  const check = () => {
    const got = st.slots.map(s => s.c).join(''), ok = got === w; const r = api.attempt(ok, got);
    if (ok) { st.lock.fill(true); locked = true; draw(); return; }
    st.slots.forEach((s, i) => { if (s && s.c === w[i]) st.lock[i] = true; else if (s) { s.u = false; st.slots[i] = null; } });
    if (r !== 'reveal') { draw(); $$('.slot', host).forEach(s => { if (!s.classList.contains('lock')) wiggle(s); }); }
  };
  draw();
  return { reveal() { locked = true; st.t.forEach(t => t.u = false); st.slots = w.split('').map(c => ({ c })); st.lock.fill(true); st.slots.forEach(s => s.u = true); draw(); }, lock() { locked = true; } };
}

// ---------- on-screen keyboards (no iPad keyboard popping up and shifting the page) ----------
const ABC = ['abcdefghi', 'jklmnopqr', 'stuvwxyz'], QWERTY = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
function keypadHTML(kind, profile) {
  const btn = (k, c = '') => `<button class="key ${c}" data-k="${k}">${k === 'del' ? '⌫' : k === 'go' ? '✓' : esc(k)}</button>`;
  if (kind === 'alpha') { const rows = profile === 'ensley' ? ABC : QWERTY; return `<div class="kbd alpha">${rows.map((r, i) => `<div class="krow">${[...r].map(k => btn(k)).join('')}${i === rows.length - 1 ? btn('del', 'wide') : ''}</div>`).join('')}<div class="krow">${btn('go', 'go wide2')}</div></div>`; }
  const ex = kind === 'expr' ? ['7', '8', '9', 'x', '4', '5', '6', '+', '1', '2', '3', '-', '0', '.', 'del', 'go'] : ['7', '8', '9', '/', '4', '5', '6', '-', '1', '2', '3', '.', '0', 'del', 'go'];
  const cols = 4; return `<div class="kbd num">${ex.map((k, i) => btn(k, k === 'go' ? 'go' : k === 'del' ? 'del' : '')).join('')}</div>`;
}
function typed(q, host, api, kind) {
  const alpha = kind === 'alpha', ans = String(q.answer); let buf = '', locked = false, marks = null, tries = 0;
  host.innerHTML = `<div class="readout ${alpha ? 'ra' : 'rn'}" id="ro"></div>${keypadHTML(kind, api.profile)}`;
  const ro = host.querySelector('#ro');
  const draw = () => {
    if (alpha) { const n = Math.max(ans.length, buf.length); ro.innerHTML = Array.from({ length: n }, (_, i) => `<span class="rb ${marks && buf[i] ? marks[i] : ''} ${buf[i] ? 'f' : ''}">${esc(buf[i] || '')}</span>`).join(''); }
    else ro.innerHTML = `<span class="rv">${esc(buf) || '<i>type your answer</i>'}</span>`;
  };
  const submit = () => {
    if (locked || !buf) return;
    const ok = alpha || q.check ? checkText(q, buf) : checkNum(q, buf);
    if (!ok && alpha) { marks = [...buf].map((c, i) => ans[i] === c ? 'g' : ans.includes(c) ? 'y' : 'n'); }
    const r = api.attempt(ok, buf);
    if (ok) { locked = true; if (alpha) marks = [...buf].map(() => 'g'); draw(); return; }
    if (r !== 'reveal') { draw(); wiggle(ro); }
  };
  host.querySelector('.kbd').onclick = e => {
    const b = e.target.closest('.key'); if (!b || locked) return; const k = b.dataset.k; sfx.tap();
    if (k === 'del') { buf = buf.slice(0, -1); marks = null; } else if (k === 'go') return submit(); else if (buf.length < 24) { buf += k; marks = null; }
    draw();
  };
  draw();
  return { reveal() { locked = true; buf = alpha ? ans : String(q.shown ?? q.answer); marks = alpha ? [...buf].map(() => 'g') : null; draw(); ro.classList.add('rev'); }, lock() { locked = true; } };
}

// ---------- put in order ----------
function order(q, host, api) {
  const steps = q.steps, n = steps.length, st = { slots: Array(n).fill(null), lock: Array(n).fill(false), pool: shuffle(steps.map((s, i) => ({ s, i, u: false }))) }; let locked = false;
  const draw = () => {
    host.innerHTML = `<ol class="oslots">${st.slots.map((s, i) => `<li><button class="oslot ${s ? 'f' : ''} ${st.lock[i] ? 'lock' : ''}" data-i="${i}">${s ? esc(s.s) : `<i>step ${i + 1}</i>`}</button></li>`).join('')}</ol><div class="opool">${st.pool.map((p, i) => `<button class="opt ${p.u ? 'used' : ''}" data-i="${i}">${esc(p.s)}</button>`).join('')}</div>`;
    $$('.opool .opt', host).forEach(b => b.onclick = () => put(+b.dataset.i)); $$('.oslot', host).forEach(b => b.onclick = () => take(+b.dataset.i));
  };
  const put = i => { if (locked || st.pool[i].u) return; const p = st.slots.findIndex(s => !s); if (p < 0) return; st.slots[p] = st.pool[i]; st.pool[i].u = true; sfx.tap(); draw(); if (st.slots.every(Boolean)) setTimeout(check, 250); };
  const take = i => { if (locked || !st.slots[i] || st.lock[i]) return; st.slots[i].u = false; st.slots[i] = null; sfx.tap(); draw(); };
  const check = () => {
    const ok = st.slots.every((s, i) => s.i === i), r = api.attempt(ok, st.slots.map(s => s.s).join(' > '));
    if (ok) { st.lock.fill(true); locked = true; draw(); return; }
    st.slots.forEach((s, i) => { if (s.i === i) st.lock[i] = true; else { s.u = false; st.slots[i] = null; } });
    if (r !== 'reveal') { draw(); $$('.oslot', host).forEach(b => !b.classList.contains('lock') && wiggle(b)); }
  };
  draw();
  return { reveal() { locked = true; st.pool.forEach(p => p.u = true); st.slots = steps.map((s, i) => ({ s, i, u: true })); st.lock.fill(true); draw(); }, lock() { locked = true; } };
}

// ---------- build a frequency table (count the data yourself) ----------
function counts(q, host, api) {
  const truth = {}; q.cats.forEach(c => truth[c] = 0); q.data.forEach(([, c]) => truth[c]++);
  const st = { n: Object.fromEntries(q.cats.map(c => [c, 0])), seen: new Set() }; let locked = false, okRows = {};
  const draw = () => {
    host.innerHTML = `<div class="cdata">${q.data.map(([name, c], i) => `<button class="cchip ${st.seen.has(i) ? 'seen' : ''}" data-i="${i}"><i style="background:${q.colors[c]}"></i>${esc(name)}</button>`).join('')}</div>
    <div class="crows">${q.cats.map(c => `<div class="crow ${okRows[c] ? 'ok' : ''}"><span class="ctag" style="background:${q.colors[c]}">${esc(c)}</span><span class="ctally">${tally(st.n[c])}</span><button class="cbtn" data-c="${c}" data-d="-1">−</button><b class="cn">${st.n[c]}</b><button class="cbtn" data-c="${c}" data-d="1">+</button></div>`).join('')}</div>
    <div class="row"><button class="btn mint" id="chk">Check my table ✓</button></div>`;
    $$('.cchip', host).forEach(b => b.onclick = () => { if (locked) return; const i = +b.dataset.i; st.seen.has(i) ? st.seen.delete(i) : st.seen.add(i); sfx.tap(); draw(); });
    $$('.cbtn', host).forEach(b => b.onclick = () => { if (locked) return; const c = b.dataset.c; st.n[c] = Math.max(0, Math.min(30, st.n[c] + +b.dataset.d)); sfx.tap(); draw(); });
    host.querySelector('#chk').onclick = check;
  };
  const check = () => {
    if (locked) return; const ok = q.cats.every(c => st.n[c] === truth[c]); okRows = {}; q.cats.forEach(c => { if (st.n[c] === truth[c]) okRows[c] = true; });
    const r = api.attempt(ok, JSON.stringify(st.n));
    if (ok) { locked = true; draw(); return; }
    if (r !== 'reveal') { draw(); }
  };
  const tally = n => (n ? svgTally(n) : '');
  draw();
  return { reveal() { locked = true; q.cats.forEach(c => { st.n[c] = truth[c]; okRows[c] = true; }); draw(); }, lock() { locked = true; } };
}

// ---------- silly story (tap blank, tap word) ----------
function story(q, host, api) {
  const parts = q.text.split(/\[\[(\w+)\]\]/), blanks = []; let html = '';
  parts.forEach((p, i) => { if (i % 2 === 0) html += esc(p); else { html += `<button class="sblank" data-b="${blanks.length}">▼</button>`; blanks.push({ w: p, v: null, lock: false }); } });
  const bank = shuffle(q.words.map(w => ({ w, u: false }))); let sel = 0, locked = false;
  const draw = () => {
    host.innerHTML = `<div class="story">${html}</div><div class="bank">${bank.map((b, i) => `<button class="opt sm ${b.u ? 'used' : ''}" data-i="${i}">${esc(b.w)}</button>`).join('')}</div><div class="row"><button class="btn mint" id="chk" ${blanks.every(b => b.v) ? '' : 'disabled'}>Check the story ✓</button></div>`;
    $$('.sblank', host).forEach(b => { const k = +b.dataset.b, bl = blanks[k]; b.textContent = bl.v ? bl.v : '▼'; b.classList.toggle('f', !!bl.v); b.classList.toggle('lock', bl.lock); b.classList.toggle('sel', k === sel && !bl.v); b.onclick = () => { if (locked || bl.lock) return; if (bl.v) { const bk = bank.find(x => x.w === bl.v && x.u); if (bk) bk.u = false; bl.v = null; } sel = k; sfx.tap(); draw(); }; });
    $$('.bank .opt', host).forEach(b => b.onclick = () => { if (locked) return; const bk = bank[+b.dataset.i]; if (bk.u) return; let k = blanks[sel] && !blanks[sel].v && !blanks[sel].lock ? sel : blanks.findIndex(x => !x.v && !x.lock); if (k < 0) return; blanks[k].v = bk.w; bk.u = true; sel = blanks.findIndex(x => !x.v && !x.lock); sfx.tap(); draw(); });
    host.querySelector('#chk').onclick = check;
  };
  const check = () => {
    const per = {}; blanks.forEach(b => { (per[b.w] ||= []).push(b.v === b.w); });
    const ok = blanks.every(b => b.v === b.w); const r = api.attempt(ok, 'story', { per });
    if (ok) { locked = true; blanks.forEach(b => b.lock = true); draw(); return; }
    blanks.forEach(b => { if (b.v === b.w) b.lock = true; else { const bk = bank.find(x => x.w === b.v && x.u); if (bk) bk.u = false; b.v = null; } });
    sel = blanks.findIndex(x => !x.v && !x.lock); draw();
  };
  draw();
  return { reveal() { locked = true; blanks.forEach(b => { b.v = b.w; b.lock = true; }); bank.forEach(x => x.u = true); draw(); }, lock() { locked = true; } };
}

export function mount(q, host, api) {
  switch (q.fmt) {
    case 'mc': return mc(q, host, api);
    case 'tiles': return tiles(q, host, api);
    case 'keys': return typed(q, host, api, q.keys === 'expr' ? 'expr' : 'alpha');
    case 'num': return typed(q, host, api, q.keys === 'expr' ? 'expr' : 'num');
    case 'order': return order(q, host, api);
    case 'counts': return counts(q, host, api);
    case 'story': return story(q, host, api);
    default: host.innerHTML = '<p>Unsupported question</p>'; return { reveal() { }, lock() { } };
  }
}
