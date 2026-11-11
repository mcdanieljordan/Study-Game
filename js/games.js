// Learning mini-games — the game action IS the retrieval (intrinsic integration). No timers, no lives, no losing.
import { $, $$, esc, shuffle, sample, rnd, uniq } from './util.js';
import { sfx } from './audio.js';
import { burstEl, burstAt, floatEl, banner, say, wiggle, fireworks } from './fx.js';
import { P, save, srsUpdate, logAnswer, addXP } from './store.js';
import { ENV, BLOCKS_PER_BUILD } from './engine.js';

export const GAMES = {
  ensley: [
    { id: 'memory', icon: '🃏', name: 'Memory Match', sub: 'Find the matching pairs' },
    { id: 'spell', icon: '🫧', name: 'Bubble Spell', sub: 'Pop letters to spell words', needs: 'word' },
    { id: 'tf', icon: '⚡', name: 'True or Silly?', sub: 'Is it right? No clock!' }
  ],
  sida: [
    { id: 'memory', icon: '🃏', name: 'Pair Up', sub: 'Match terms and meanings' },
    { id: 'tf', icon: '⚡', name: 'Fact Check', sub: 'True or false? No clock.' }
  ]
};
function credit(profile, packId, id, ok1) {
  const p = P(profile); srsUpdate(p, id, { ok1, revealed: false, ms: 3000 }); logAnswer(p, { id, pk: packId, ok: ok1 ? 1 : 0, ms: 3000, fmt: 'game' });
  if (ok1) { addXP(p, 5); const b = Math.floor((p.world.blocks || 0) / BLOCKS_PER_BUILD); p.world.blocks = (p.world.blocks || 0) + .5; p.world.built = Math.floor(p.world.blocks / BLOCKS_PER_BUILD); if (p.world.built > b) { sfx.build(); banner('🧱 New build unlocked!'); } }
  save(profile);
}
const shell = (profile, title, body) => `<div class="topbar run"><button class="round" data-act="gameexit">✕</button><b class="ttl">${esc(title)}</b><span class="sp"></span><span class="chip sun">⭐ ${P(profile).xp}</span></div><div class="qwrap">${body}</div>`;
const allItems = (packs, f) => packs.flatMap(p => p.all.filter(f).map(i => ({ p, i })));

export function startGame(id, profile, packs, exit) {
  const view = $('#view'); view.dataset.exit = ''; window.__gameExit = exit;
  const g = { memory, spell, tf }[id]; g(profile, packs, view);
}
export const gameAct = { gameexit: () => window.__gameExit && window.__gameExit() };

function memory(profile, packs, view) {
  const pool = allItems(packs, i => (i.t === 'word' && i.meaning.length < 48) || (i.t === 'term' && i.def.length < 80));
  const pick = sample(pool, 6), pairs = pick.map(({ p, i }, k) => ({ k, id: i.id, pk: p.id, a: i.t === 'word' ? i.w : i.term, b: i.t === 'word' ? i.meaning : i.def }));
  if (pairs.length < 3) { view.innerHTML = shell(profile, 'Memory Match', '<div class="card center"><p class="lead">Learn a few words first, then come back!</p></div>'); return; }
  const cards = shuffle(pairs.flatMap(p => [{ k: p.k, t: p.a, side: 'a' }, { k: p.k, t: p.b, side: 'b' }]).map((c, i) => ({ ...c, i, up: false, done: false })));
  let open = [], busy = false, matched = 0; const missed = new Set();
  const draw = () => { view.innerHTML = shell(profile, 'Memory Match', `<p class="lead center">Flip two cards. Match each word with its meaning!</p><div class="mgrid">${cards.map(c => `<button class="mcard ${c.up || c.done ? 'up' : ''} ${c.done ? 'ok' : ''} ${c.side === 'b' ? 'long' : ''}" data-i="${c.i}"><span>${c.up || c.done ? esc(c.t) : '❓'}</span></button>`).join('')}</div>`); $$('.mcard', view).forEach(b => b.onclick = () => flip(+b.dataset.i)); };
  const flip = async i => {
    const c = cards[i]; if (busy || c.up || c.done) return; c.up = true; open.push(c); sfx.tap(); if (c.side === 'a' && profile === 'ensley') say(c.t); draw();
    if (open.length === 2) {
      busy = true; const [x, y] = open;
      if (x.k === y.k && x.side !== y.side) { x.done = y.done = true; matched++; sfx.correct(matched); const el = $$('.mcard', view)[i]; burstEl(el, { n: 40 }); const pr = pairs[x.k]; credit(profile, pr.pk, pr.id, !missed.has(x.k)); open = []; busy = false; draw(); if (matched === pairs.length) { await new Promise(r => setTimeout(r, 400)); sfx.fanfare(); fireworks(4); banner(profile === 'ensley' ? 'You found them all!' : 'Board cleared'); setTimeout(() => { view.innerHTML = shell(profile, 'Memory Match', `<div class="card center"><div class="big">🎉</div><h2>${profile === 'ensley' ? 'All matched!' : 'All pairs matched.'}</h2><div class="row"><button class="btn big mint" data-act="gameagain">Play again</button><button class="btn big soft" data-act="gameexit">Back</button></div></div>`); }, 1200); } }
      else { missed.add(x.k); missed.add(y.k); sfx.wrong(); await new Promise(r => setTimeout(r, 900)); x.up = y.up = false; open = []; busy = false; draw(); }
    }
  };
  gameAct.gameagain = () => memory(profile, packs, view);
  draw();
}

function spell(profile, packs, view) {
  const words = sample(allItems(packs, i => i.t === 'word'), 4); let idx = 0;
  if (!words.length) { view.innerHTML = shell(profile, 'Bubble Spell', '<div class="card center"><p class="lead">No spelling words yet.</p></div>'); return; }
  const next = () => {
    if (idx >= words.length) { sfx.fanfare(); fireworks(3); view.innerHTML = shell(profile, 'Bubble Spell', `<div class="card center"><div class="big">🌈</div><h2>You popped every word!</h2><div class="row"><button class="btn big mint" data-act="gameagain">Play again</button><button class="btn big soft" data-act="gameexit">Back</button></div></div>`); return; }
    const { p, i } = words[idx], w = i.w; let pos = 0, hadMiss = false; say(w);
    const letters = shuffle(w.split('').concat(sample('aeioutrsnlmdp'.split('').filter(c => !w.includes(c)), 3)).map((c, k) => ({ c, k, x: 6 + (k * 83) % 78, y: 12 + (k * 47) % 66, used: false })));
    view.innerHTML = shell(profile, 'Bubble Spell', `<div class="card center"><div class="qemoji">${i.emoji || ''}</div><button class="btn soft sm" data-act="hearword">🔊 Hear the word</button><div class="slots" id="gs">${w.split('').map(() => '<span class="slot"></span>').join('')}</div><p class="lead">Pop the letters <b>in order</b>.</p><div class="bubblebox still" id="gb">${letters.map(l => `<button class="bub still" data-k="${l.k}" style="left:${l.x}%;top:${l.y}%;--delay:${(l.k % 5) * .3}s">${esc(l.c)}</button>`).join('')}</div></div>`);
    gameAct.hearword = () => say(w);
    $$('.bub', view).forEach(b => b.onclick = () => {
      const l = letters.find(x => x.k === +b.dataset.k); if (l.used) return;
      if (l.c === w[pos]) { l.used = true; b.classList.add('gone'); $$('#gs .slot', view)[pos].textContent = l.c; $$('#gs .slot', view)[pos].classList.add('lock'); pos++; sfx.pop(pos); burstEl(b, { n: 12, spread: 50, power: 22 });
        if (pos === w.length) { sfx.correct(3); burstEl($('#gs'), { n: 70 }); credit(profile, p.id, i.id, !hadMiss); floatEl(`+5 XP`, $('#gs')); setTimeout(() => { idx++; next(); }, 1100); } }
      else { hadMiss = true; wiggle(b); sfx.wrong(); }
    });
  };
  gameAct.gameagain = () => spell(profile, packs, view);
  next();
}

function tf(profile, packs, view) {
  const qa = allItems(packs, i => i.t === 'qa' && i.a && i.w?.length), tm = allItems(packs, i => i.t === 'term');
  const cards = sample([...qa, ...tm], 8).map(({ p, i }) => { const truth = Math.random() < .5;
    if (i.t === 'qa') return { p, i, truth, html: `<b>${esc(i.q)}</b><div class="claim">${esc(truth ? i.a : rnd(i.w))}</div>`, why: i.why };
    const others = packs.flatMap(pk => pk.all.filter(x => x.t === 'term' && x.id !== i.id)), o = others.length ? rnd(others) : i;
    return { p, i, truth: truth || o === i, html: `<b>${esc(i.term)}</b> means…<div class="claim">${esc(truth || o === i ? i.def : o.def)}</div>`, why: `${i.term}: ${i.def}` }; });
  let n = 0, right = 0;
  const show = () => {
    if (n >= cards.length) { sfx.fanfare(); fireworks(3); view.innerHTML = shell(profile, 'True or Silly?', `<div class="card center"><div class="big">⚡</div><h2>${right} of ${cards.length} right!</h2><div class="row"><button class="btn big mint" data-act="gameagain">Play again</button><button class="btn big soft" data-act="gameexit">Back</button></div></div>`); return; }
    const c = cards[n]; view.innerHTML = shell(profile, profile === 'ensley' ? 'True or Silly?' : 'Fact Check', `<div class="card center tfcard"><div class="chips"><span class="chip">${n + 1} / ${cards.length}</span></div><div class="qtxt">${c.html}</div><div class="row"><button class="btn big mint" data-v="1">✔ True</button><button class="btn big" data-v="0">✖ Silly / False</button></div><div id="fb"></div><div id="nx"></div></div>`);
    $$('[data-v]', view).forEach(b => b.onclick = () => { const ok = (b.dataset.v === '1') === c.truth; credit(profile, c.p.id, c.i.id, ok); if (ok) { right++; sfx.correct(right); burstEl(b, { n: 50 }); $('#fb').innerHTML = `<div class="fb good">✨ Yes! ${esc(c.why || '')}</div>`; } else { sfx.wrong(); $('#fb').innerHTML = `<div class="fb calm">💡 ${c.truth ? 'That one was TRUE.' : 'That one was not right.'} ${esc(c.why || '')}</div>`; }
      $$('[data-v]', view).forEach(x => x.disabled = true); $('#nx').innerHTML = '<button class="btn big mint pulse" data-act="tfnext">Next ➜</button>'; });
  };
  gameAct.tfnext = () => { n++; show(); }; gameAct.gameagain = () => tf(profile, packs, view);
  show();
}
