// The learning session: pre-test → lesson cards → retrieval questions → celebration.
// Research rules enforced here: no timers, no point deductions, no buzzers; wrong answers get a calm hint and a retry;
// after a second miss the answer is revealed kindly and the item comes back later; two misses in a row → an easy win or a breather.
import { $, esc, rnd, shuffle, pct, sleep } from './util.js';
import { sfx } from './audio.js';
import { burstEl, burstAt, floatEl, banner, say, buzz, wiggle, levelComplete, lcButtons, lcUnlock, closeOv, openOv, fireworks, starRain, setFxTheme } from './fx.js';
import { P, save, srsUpdate, logAnswer, logSession, addXP, levelOf, strength } from './store.js';
import { mount } from './answers.js';
import { buildQ, visualHTML } from './content.js';
import { daysUntil } from './util.js';

export const ENV = {};                         // filled in by main.js (avatars, breaks, world, navigation)
export const setEnv = o => Object.assign(ENV, o);
let RUN = null;
export const running = () => !!RUN;
export const _run = () => RUN;
export const BLOCKS_PER_BUILD = 8;

const TONE = {
  ensley: {
    praise: ['Yes! Brilliant!', 'You got it!', 'Superstar!', 'Amazing!', 'Boom! Nailed it!', 'Wow, so smart!', 'Yes yes yes!', 'Unicorn power!', 'Sparkly work!', 'Perfect!', 'High five!'],
    gentle: ['Ooh, so close! Try again!', 'Good try! Your brain is growing!', 'That\'s okay! Let\'s peek together.', 'Mistakes help brains grow!', 'No worries — you\'ve got this!'],
    streak: { 3: 'Three in a row!', 5: 'Five in a row! Unstoppable!', 8: 'Eight in a row! Wow!', 10: 'TEN in a row! Legend!' },
    start: ['Let\'s do this! 💖', 'You\'ve got this!', 'Ready? Here we go!'], reveal: 'Here\'s the answer! We\'ll try again soon.', easy: 'Here\'s one you\'re great at! 💜', pre: 'Try first!',
    complete: ['You did it!', 'Amazing job!', 'Sparkle power!'], unit: 'XP'
  },
  sida: {
    praise: ['Correct.', 'Clean.', 'Nailed it.', 'Nice work.', 'Locked in.', 'Solid.', 'That\'s it.'],
    gentle: ['Not quite — check your steps.', 'Close. Look again.', 'Re-read it and try once more.', 'Almost. Use the hint if you need it.'],
    streak: { 3: '3-streak!', 5: '5 in a row — locked in.', 8: '8 straight. Dominating.', 10: '10 in a row. 🔥' },
    start: ['Let\'s build.', 'Focus up.', 'Ready when you are.'], reveal: 'Here\'s how it works — it comes back later.', easy: 'Warm-up: one you already know.', pre: 'Try first',
    complete: ['LEVEL CLEAR', 'NICE RUN', 'BUILD COMPLETE'], unit: 'XP'
  }
};
const tone = () => TONE[RUN.profile];

// ---------- starting a run ----------
export function startRun(cfg) {
  const p = P(cfg.profile); setFxTheme(cfg.profile === 'sida' ? 'block' : 'sparkle');
  const steps = [];
  if (cfg.pre?.length) { steps.push({ kind: 'preintro' }); cfg.pre.forEach(q => steps.push({ kind: 'q', q, pre: true })); }
  if (cfg.cards?.length) { cfg.cards.forEach((c, i) => steps.push({ kind: 'card', card: c, i, n: cfg.cards.length })); }
  cfg.qs.forEach(q => steps.push({ kind: 'q', q }));
  RUN = { ...cfg, p, steps, i: 0, xp: 0, first: 0, streak: 0, best: 0, wrongRun: 0, sinceBreak: 0, mistakes: [], mainTotal: cfg.qs.length, mainDone: 0, startXP: p.xp, startBlocks: p.world.blocks || 0, retried: new Set(), t0: Date.now(), tstart: Date.now(), builtNow: 0, leveled: false, handle: null, dead: false };
  step();
}
function step() {
  if (!RUN) return; const s = RUN.steps[RUN.i];
  if (!s) return finishRun();
  RUN.step = s;
  if (s.kind === 'preintro') return drawPreIntro();
  if (s.kind === 'card') return drawCard(s);
  return drawQ(s);
}
const next = () => { RUN.i++; step(); };

// ---------- screens ----------
const runbar = () => {
  const mains = RUN.steps.filter(x => x.kind === 'q' && !x.pre), doneMain = RUN.steps.slice(0, RUN.i).filter(x => x.kind === 'q' && !x.pre).length;
  return `<div class="topbar run"><button class="round" data-act="runexit" aria-label="Exit">✕</button><div class="pips">${mains.map((_, k) => `<span class="pip ${k < doneMain ? 'on' : ''} ${k === doneMain && RUN.step.kind === 'q' && !RUN.step.pre ? 'now' : ''}"></span>`).join('')}</div><span class="chip sun">⭐ ${RUN.p.xp}</span></div>`;
};
const mascot = (mood = 'idle') => `<div class="mascot ${mood}" id="mas">${ENV.avatarHTML(RUN.profile, mood, RUN.profile === 'sida' ? 84 : 92)}</div>`;
const view = h => { $('#view').innerHTML = h; $('#view').scrollTop = 0; };
export const runAct = {
  next: () => next(),
  runexit: () => exitMenu(),
  speakcard: () => { const s = RUN.step; if (s.card?.say) say(s.card.say); }
};

function drawPreIntro() {
  view(`${runbar()}<div class="qwrap"><div class="card center"><div class="big">🔮</div><h2>${esc(tone().pre)}</h2><p class="lead">Take a guess before we learn it! Wrong guesses are <b>great</b> — they wake your brain up. <b>No points are lost.</b></p><button class="btn big pulse" data-act="next">Let's try! ➜</button></div></div>`);
  sfx.whoosh();
}
function drawCard(s) {
  const c = s.card;
  view(`${runbar()}<div class="qwrap"><div class="card lessoncard"><div class="chips"><span class="chip">📘 Lesson ${s.i + 1} of ${s.n}</span></div>${c.emoji ? `<div class="qemoji">${c.emoji}</div>` : ''}<h2 class="ctitle2">${esc(c.title)}</h2>${c.say ? `<button class="btn soft sm" data-act="speakcard">🔊 Hear it</button>` : ''}<div class="lessonhtml">${c.html}</div><div class="center"><button class="btn big mint" data-act="next">${s.i + 1 === s.n ? 'I\'m ready! ➜' : 'Next ➜'}</button></div></div></div>`);
  if (c.say) setTimeout(() => say(c.say), 250); sfx.tap();
}

function drawQ(s) {
  const q = s.q; RUN.cur = q; RUN.tries = 0; RUN.done = false; RUN.t0q = Date.now();
  view(`${runbar()}<div class="qwrap">
    <div class="mrow">${mascot('idle')}<div class="bubble" id="bub">${s.pre ? 'Just guess — it\'s okay to be wrong! 🔮' : esc(rnd(tone().start))}</div></div>
    <div class="card q"><div class="chips"><span class="chip">${esc(q.skill || '')}</span>${s.pre ? '<span class="chip sun">Try first</span>' : ''}${s.easy ? '<span class="chip mint">warm-up</span>' : ''}</div>
      ${q.vhtml ? `<div class="visual">${q.vhtml}</div>` : ''}${q.emoji ? `<div class="qemoji">${q.emoji}</div>` : ''}
      <div class="qtxt">${q.html}</div>
      ${q.say ? `<button class="btn soft sm speak" data-act="hear">🔊 Hear it</button>` : ''}
      <div id="ans"></div><div id="fb"></div><div id="nx" class="center"></div></div></div>`);
  RUN.handle = mount(q, $('#ans'), { profile: RUN.profile, attempt });
  if (q.say && !s.pre !== undefined) setTimeout(() => { if (RUN?.cur === q) say(q.say); }, 350);
  window.scrollTo(0, 0);
}
runAct.hear = () => { const q = RUN.cur; say(q.say || q.html.replace(/<[^>]+>/g, ' ')); };

// ---------- feedback ----------
function mood(kind, text) {
  const m = $('#mas'), b = $('#bub'); if (!m) return;
  m.className = 'mascot ' + kind; m.innerHTML = ENV.avatarHTML(RUN.profile, kind, RUN.profile === 'sida' ? 84 : 92);
  if (b) { b.textContent = text; b.className = 'bubble ' + (kind === 'hug' ? 'calmb' : ''); }
  document.body.classList.toggle('calm', kind === 'hug');
}
const fb = (cls, html) => { const f = $('#fb'); if (f) f.innerHTML = `<div class="fb ${cls}">${html}</div>`; };
function nextBtn(label) { const n = $('#nx'); if (n) { n.innerHTML = `<button class="btn big mint pulse" data-act="qnext">${label || 'Next ➜'}</button>`; n.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
runAct.qnext = () => { document.body.classList.remove('calm'); afterQ(); };

function attempt(ok, resp, extra = {}) {
  const q = RUN.cur, s = RUN.step;
  if (RUN.done) return 'correct';
  if (extra.per && RUN.tries === 0) RUN.firstPer = extra.per;
  // ----- pre-test: never penalised -----
  if (s.pre) {
    RUN.done = true;
    if (ok) { sfx.assisted(); mood('happy', 'Nice — you already knew that! 🎉'); fb('good', '✨ ' + (q.why || 'Correct!')); }
    else { RUN.handle.reveal(); sfx.learn(); mood('hug', 'Now you know! Your brain is ready to learn it. 🌱'); fb('calm', '💡 ' + (q.worked || q.why || '')); }
    logAnswer(RUN.p, { id: q.id, pk: RUN.packId, ok: ok ? 1 : 0, pre: 1, ms: Date.now() - RUN.t0q }); save(RUN.profile);
    nextBtn(); return ok ? 'correct' : 'reveal';
  }
  if (ok) { onCorrect(resp); return 'correct'; }
  RUN.tries++; RUN.streak = 0; RUN.wrongRun++;
  const maxWrong = q.fmt === 'mc' ? Math.min(2, (q.opts?.length || 3) - 1) : 2;
  sfx.wrong(); buzz(12);
  if (RUN.tries >= maxWrong) { onReveal(resp); return 'reveal'; }
  const g = rnd(tone().gentle); mood('hug', g + (RUN.profile === 'ensley' ? ' 💜' : '')); if (RUN.tries === 1 && RUN.profile === 'ensley') say(g, { calm: true });
  fb('calm', `💜 ${q.hint ? esc(q.hint) : 'Look closely — you can do it!'}${RUN.profile === 'ensley' ? ' Try again!' : ''}`);
  return 'retry';
}

function record(q, ok1, revealed, resp) {
  const p = RUN.p, ms = Date.now() - RUN.t0q;
  const testISO = RUN.pack?.due || p.settings?.due?.[RUN.packId] || null;
  if (q.fmt === 'story' && q.ids) {
    const per = RUN.firstPer || {};
    for (const [w, id] of Object.entries(q.ids)) { const good = (per[w] ? per[w].every(Boolean) : true) && RUN.tries === 0 ? true : (per[w] ? per[w].every(Boolean) : false); srsUpdate(p, id, { ok1: good, revealed, ms: ms / Object.keys(q.ids).length, testISO }); logAnswer(p, { id, pk: RUN.packId, ok: good ? 1 : 0, tr: RUN.tries, ms: 0, fmt: 'story' }); }
  } else {
    srsUpdate(p, q.id, { ok1, revealed, ms, testISO });
    logAnswer(p, { id: q.id, pk: RUN.packId, sk: q.skill, ok: ok1 ? 1 : 0, tr: RUN.tries, ms, fmt: q.fmt, ...(ok1 ? {} : { r: String(resp ?? '').slice(0, 40) }) });
  }
  RUN.mainDone++; RUN.sinceBreak++;
}
function addBlocks(n) {
  const w = RUN.p.world, before = Math.floor((w.blocks || 0) / BLOCKS_PER_BUILD); w.blocks = (w.blocks || 0) + n; const after = Math.floor(w.blocks / BLOCKS_PER_BUILD);
  w.built = after; if (after > before) { RUN.builtNow += after - before; const prof = RUN.profile; setTimeout(() => { sfx.build(); banner(prof === 'sida' ? '🧱 New build unlocked!' : '🌈 Something new grew in your meadow!'); }, 700); }
}
function gainXP(n) { const r = addXP(RUN.p, n); RUN.xp += n; if (r.leveled) RUN.leveled = true; return n; }

function onCorrect(resp) {
  const q = RUN.cur, first = RUN.tries === 0, retry = RUN.step.retry;
  RUN.streak++; RUN.best = Math.max(RUN.best, RUN.streak); RUN.wrongRun = 0; if (first) RUN.first++;
  let gain = first ? 10 + Math.min(RUN.streak, 5) : 4; if (retry) gain += 4; gainXP(gain); addBlocks(first ? 1 : .5);
  record(q, first, false, resp); RUN.done = true; RUN.handle.lock?.(); save(RUN.profile);
  const host = $('#ans'), line = retry ? (RUN.profile === 'ensley' ? 'You got it this time! Look how you grew! 🌱' : 'Got it this time. That\'s the growth.') : (tone().streak[RUN.streak] || rnd(tone().praise));
  (first ? sfx.correct : sfx.assisted)(RUN.streak); burstEl(host, { n: first ? 70 : 35, emoji: RUN.profile === 'ensley' ? ['⭐', '💖', '✨', '🦄'] : ['⭐', '💎', '🧱'] }); floatEl(`+${gain} XP`, host); buzz(30);
  mood('happy', line + (RUN.profile === 'ensley' ? ' 🎉' : '')); if (RUN.profile === 'ensley' || RUN.p.settings.voice) say(line.replace(/[🌱🎉]/g, ''));
  const sk = RUN.streak, sline = tone().streak[sk];
  if (sline) setTimeout(() => { sfx.levelUp(); banner(sline, `${sk} correct in a row`); burstAt(innerWidth / 2, innerHeight / 3, { n: 120, spread: 120, power: 50 }); }, 350);
  fb('good', `✨ ${q.worked && RUN.profile === 'sida' ? esc(q.worked) : esc(q.why || 'Correct!')}`);
  if (first && (RUN.p.xp % 7 === 0)) sparkleAvatar();
  nextBtn();
}
function sparkleAvatar() { const m = $('#mas'); if (m) { m.classList.add('spin'); setTimeout(() => m.classList.remove('spin'), 900); } }

function onReveal(resp) {
  const q = RUN.cur; RUN.done = true; RUN.handle.reveal(); gainXP(2); addBlocks(.25);
  record(q, false, true, resp); save(RUN.profile);
  RUN.mistakes.push({ html: q.html, v: q.vhtml, why: q.worked || q.why, ans: q.answer, id: q.id });
  sfx.learn(); mood('hug', tone().reveal); const host = $('#ans'); floatEl('+2 XP for trying', host); burstEl(host, { n: 18, spread: 50 });
  fb('calm', `💡 ${esc(q.worked || q.why || '')}${q.worked && q.why && RUN.profile === 'ensley' ? '' : ''}<br><small>We'll try this one again in a bit — you're building it!</small>`);
  // bring it back later (once)
  if (!RUN.retried.has(q.id)) { RUN.retried.add(q.id); const pack = ENV.packs(RUN.profile).find(p => p.id === RUN.packId), item = pack?.byId[q.id]; if (item) { const rq = buildQ(RUN.p, pack, item, 'mc', 0); rq.id = q.id; rq.itemId = q.id; rq.packId = RUN.packId; rq.skill = q.skill; rq.vhtml = rq.vhtml || visualHTML(rq.visual || item.visual); RUN.steps.push({ kind: 'q', q: rq, retry: true }); RUN.mainTotal++; } }
  nextBtn();
}

async function afterQ() {
  // calm check-in after two misses in a row: an easy win, plus an optional breather
  if (RUN.wrongRun >= 2) {
    RUN.wrongRun = 0; const pack = ENV.packs(RUN.profile).find(p => p.id === RUN.packId);
    const easy = pack?.all.filter(i => i.t !== 'story' && i.t !== 'counts' && (strength(RUN.p, i.id) ?? 0) >= .7 && !RUN.steps.some(x => x.q?.id === i.id));
    if (easy?.length) { const it = rnd(easy), eq = buildQ(RUN.p, pack, it, 'mc', 0); Object.assign(eq, { id: it.id, itemId: it.id, packId: pack.id, skill: it.skill || pack.title, vhtml: visualHTML(eq.visual || it.visual) }); RUN.steps.splice(RUN.i + 1, 0, { kind: 'q', q: eq, easy: true }); RUN.mainTotal++; }
    await calmOffer();
  } else if (RUN.sinceBreak >= (RUN.profile === 'sida' ? 9 : 6) && RUN.steps.slice(RUN.i + 1).filter(x => x.kind === 'q').length >= 2) {
    RUN.sinceBreak = 0; await ENV.offerBreak(RUN.profile);
  }
  if (!RUN) return; next();
}
function calmOffer() {
  return new Promise(res => {
    sfx.learn(); const e = RUN.profile === 'ensley';
    openOv(`<div class="sheet"><div class="mascot hug">${ENV.avatarHTML(RUN.profile, 'hug', 96)}</div><h2>${e ? 'You\'re doing great. 💜' : 'Tough one. That\'s how it sticks.'}</h2><p class="lead">${e ? 'Hard ones help your brain grow. A calm breath, or a quick win?' : 'Want a 30-second reset, or jump straight to an easy one?'}</p><div class="row"><button class="btn big" data-ov="breathe">🌬️ ${e ? 'Calm breath' : 'Reset'}</button><button class="btn big mint" data-ov="go">${e ? 'Show me an easy one!' : 'Easy one'}</button></div></div>`);
    $('#ov').onclick = async ev => { const b = ev.target.closest('[data-ov]'); if (!b) return; if (b.dataset.ov === 'breathe') { closeOv(); await ENV.breather(RUN.profile); res(); } else { closeOv(); res(); } };
  });
}
function exitMenu() {
  openOv(`<div class="sheet"><h2>Take a break?</h2><p class="lead">Your progress is saved after every answer.</p><div class="row"><button class="btn big mint" data-ov="stay">Keep going</button><button class="btn big soft" data-ov="path">← Back to the path</button><button class="btn big soft" data-ov="home">🏠 Home</button></div></div>`);
  $('#ov').onclick = ev => { const b = ev.target.closest('[data-ov]'); if (!b) return; closeOv(); document.body.classList.remove('calm'); if (b.dataset.ov === 'stay') return; const r = RUN; RUN = null; if (r.mainDone) logSession(r.p, { pk: r.packId, node: r.nodeId, kind: r.kind, q: r.mainDone, first: r.first, xp: r.xp, done: 0 }), save(r.profile); ENV.go(b.dataset.ov === 'home' ? 'home' : (r.back || 'home'), { packId: r.packId }); };
}

// ---------- the celebration ----------
async function finishRun() {
  const r = RUN, p = r.p, total = Math.max(1, r.mainTotal), acc = r.first / Math.max(1, r.mainDone || total);
  const stars = acc >= .9 ? 3 : acc >= .7 ? 2 : 1, perfect = acc >= .999 && r.mainDone >= 4;
  const bonus = 15 + stars * 10 + (perfect ? 20 : 0); gainXP(bonus);
  let firstTime = false, improved = false;
  if (r.nodeId) { const prev = p.nodes[r.nodeId]; firstTime = !prev; improved = !prev || stars > (prev.stars || 0); p.nodes[r.nodeId] = { stars: Math.max(stars, prev?.stars || 0), best: Math.max(acc, prev?.best || 0), done: true, t: Date.now(), n: (prev?.n || 0) + 1 }; if (firstTime) addBlocks(BLOCKS_PER_BUILD); }
  p.stars = Object.values(p.nodes).reduce((a, n) => a + (n.stars || 0), 0);
  logSession(p, { pk: r.packId, node: r.nodeId, kind: r.kind, q: r.mainDone, first: r.first, xp: r.xp, stars, ms: Date.now() - r.tstart, done: 1 });
  const granted = ENV.grantRewards(r.profile, { stars, firstTime, leveled: r.leveled, improved });
  save(r.profile); RUN = null; document.body.classList.remove('calm');
  const e = r.profile === 'ensley', lines = [
    e ? `You got <b>${r.first}</b> of ${r.mainDone} right on the first try! 🎉` : `First-try accuracy: <b>${pct(acc)}%</b> (${r.first}/${r.mainDone})`,
    r.best >= 3 ? `Best streak: <b>${r.best}</b> in a row 🔥` : '',
    r.leveled ? `<b class="lvl">LEVEL UP!</b> You're now level ${levelOf(p.xp).level}` : ''
  ].filter(Boolean);
  const title = perfect ? (e ? 'PERFECT!!!' : 'PERFECT RUN') : rnd(TONE[r.profile].complete);
  const ov = await levelComplete({ title, stars, xp: r.xp + bonus, accuracy: acc, lines, perfect, avatarHTML: `<div class="mascot happy">${ENV.avatarHTML(r.profile, 'happy', 120)}</div>` });
  const built = r.builtNow ? ENV.worldReveal(r.profile, p.world.built) : null;
  const unlockBits = [];
  if (built) { sfx.build(); unlockBits.push(`<div class="unl">${built.html}<div><small>${e ? 'NEW IN YOUR MEADOW' : 'NEW BUILD'}</small><b>${esc(built.title)}</b></div></div>`); }
  if (granted) { sfx.unlock(); unlockBits.push(`<div class="unl">🎁<div><small>REWARD</small><b>Pick 1 of 3 new ${e ? 'sparkly things' : 'items'}!</b></div></div>`); }
  if (unlockBits.length) { lcUnlock(unlockBits.join('')); await sleep(400); }
  const nodes = r.packNodes || [], idx = nodes.findIndex(n => n.id === r.nodeId), nxt = idx >= 0 ? nodes[idx + 1] : null;
  const mistakesHTML = !e && r.mistakes.length ? `<details class="rev"><summary>Review ${r.mistakes.length} to lock in</summary>${r.mistakes.map(m => `<div class="rv">${m.v || ''}<div>${m.html}</div><div class="ans">✓ ${esc(m.ans)}</div><small>${esc(m.why || '')}</small></div>`).join('')}</details>` : '';
  lcButtons(`${mistakesHTML}<div class="row">
    ${granted ? `<button class="btn big pulse" data-lc="pick">🎁 Pick reward</button>` : ''}
    ${nxt ? `<button class="btn big mint" data-lc="next">Next: ${esc(nxt.title)} ➜</button>` : `<button class="btn big mint" data-lc="path">${e ? 'See my path' : 'Back to the path'}</button>`}
    <button class="btn big soft" data-lc="brk">🧠 Brain break</button><button class="btn big soft" data-lc="home">🏠 Home</button></div>`);
  $('#ov').onclick = async ev => {
    const b = ev.target.closest('[data-lc]'); if (!b) return; const k = b.dataset.lc;
    if (k === 'pick') { await ENV.openPick(r.profile); lcButtons($('#lcb').innerHTML.replace(/<button class="btn big pulse"[^>]*>🎁 Pick reward<\/button>/, '')); return; }
    closeOv();
    if (k === 'next' && nxt) ENV.startNode(r.packId, nxt.id); else if (k === 'brk') { await ENV.offerBreak(r.profile, true); ENV.go('path', { packId: r.packId }); } else if (k === 'home') ENV.go('home'); else ENV.go(r.back || 'path', { packId: r.packId });
  };
}
