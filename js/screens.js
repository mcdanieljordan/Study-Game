// Every screen: launcher, kid dashboard, pathway, play hub, checklist, closet, and the parent dashboard.
import { $, $$, esc, pct, today, daysUntil, shuffle, sample, uniq, avg, fmtDate, DAY, sleep } from './util.js';
import { PROFILES, P, save, levelOf, xpForLevel, strength, minutesToday, family, setFamily, newFamilyCode, syncInfo, syncProfile, pullAll, mergeInto, exportAll, importAll, resetProfile, pushNow } from './store.js';
import { sfx, setAudio } from './audio.js';
import { burstAt, burstEl, openOv, closeOv, say, setVoice, setFxTheme, banner, fireworks, floatText } from './fx.js';
import { ENV, BLOCKS_PER_BUILD, startRun } from './engine.js';
import { CATALOG, itemById, ensureAvatar, WORLD } from './catalog.js';
import { unicornSVG, meadowHTML } from './avatar2d.js';
import { createStage, createWorld, snapshotURL, canGL } from './avatar3d.js';
import { questionsForNode, questionsForItems, nodeById, readiness, skillStats, dueItems } from './content.js';
import { recommend, todaysQuest, nextNodeFor, isUnlocked, dueISO, dueLabel, weekAcc } from './reco.js';
import { GAMES, startGame } from './games.js';
import { offerBreak } from './breaks.js';

export const S = { profile: null, view: 'launcher', params: {}, packs: {}, three: [], parentOK: 0, tab: {}, pack: {} };
const packsOf = id => S.packs[id] || [];
const P_ = () => P(S.profile);
const th = id => PROFILES[id]?.theme || 'sparkle';

// ---------- shared bits ----------
export const ring = (v, size = 64, label = true) => `<svg class="ring2" viewBox="0 0 36 36" width="${size}" height="${size}"><circle class="rb" cx="18" cy="18" r="15.9155"/><circle class="rf" cx="18" cy="18" r="15.9155" stroke-dasharray="${Math.max(0, Math.min(100, v * 100)).toFixed(1)} 100" transform="rotate(-90 18 18)"/>${label ? `<text x="18" y="21.5" text-anchor="middle">${pct(v)}%</text>` : ''}</svg>`;
const bar = (v, cls = '') => `<div class="meter ${cls}"><i style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></i></div>`;
const strengthBadge = s => s == null ? ['🌱', 'New', 'new'] : s >= .8 ? ['🏆', 'Strong', 'strong'] : s >= .5 ? ['🌿', 'Growing', 'grow'] : ['💜', 'Practice', 'weak'];
export function avatarHTML(profile, mood = 'idle', size = 80, look) {
  const p = P(profile); ensureAvatar(p); const lk = look || p.avatar.equipped;
  if (profile === 'ensley') return unicornSVG(lk, mood, size);
  const url = snapshotURL(lk, mood, 'bust');
  return url ? `<img class="av3" src="${url}" width="${size}" height="${size}" alt="Your avatar">` : `<span class="avemoji" style="font-size:${size * .8}px">🧑‍🚀</span>`;
}
const destroy3d = () => { S.three.splice(0).forEach(t => { try { t.destroy(); } catch (e) { } }); };

// ---------- navigation ----------
export function go(view, params = {}) {
  destroy3d(); document.body.classList.remove('calm'); closeOv();
  S.view = view; S.params = params; if (params.packId) S.pack[S.profile] = params.packId;
  document.documentElement.dataset.theme = S.profile ? th(S.profile) : 'launcher'; setFxTheme(S.profile ? th(S.profile) : 'sparkle');
  if (S.profile) { setAudio({ theme: th(S.profile), sound: P_().settings.sound }); setVoice(P_().settings.voice); }
  const r = { launcher, home, path, play, checklist, me, parent, closet }[view] || home; r(); window.scrollTo(0, 0); $('#view').scrollTop = 0;
}
const NAV = [['home', '🏠', 'Home'], ['path', '🗺️', 'Path'], ['play', '🎮', 'Play'], ['checklist', '✅', 'Checklist'], ['me', '🎒', 'Me']];
function chrome(body, { nav = true } = {}) {
  const p = P_(), lv = levelOf(p.xp), name = PROFILES[S.profile].name;
  $('#view').innerHTML = `<header class="kidbar"><button class="avbtn" data-act="nav" data-v="home" aria-label="Home">${avatarHTML(S.profile, 'idle', 46)}</button><div class="who"><b>${esc(name)}</b><small>Level ${lv.level}</small></div><div class="xpw"><div class="xpbar"><i style="width:${lv.into / lv.need * 100}%"></i><span>${lv.into} / ${lv.need} XP</span></div></div><button class="round" data-act="switch" title="Switch player">👥</button></header><main class="screen">${body}</main>${nav ? `<nav class="bottomnav">${NAV.map(([v, i, t]) => `<button class="${S.view === v ? 'on' : ''}" data-act="nav" data-v="${v}"><span>${i}</span><small>${t}</small></button>`).join('')}</nav>` : ''}`;
}

// ---------- launcher ----------
function launcher() {
  S.profile = null; document.documentElement.dataset.theme = 'launcher';
  $('#view').innerHTML = `<main class="launch"><h1 class="logo">Study<span>Quest</span></h1><p class="tag">Pick who's playing</p><div class="lgrid">
    ${['ensley', 'sida'].map(id => { const p = P(id); ensureAvatar(p); const lv = levelOf(p.xp); return `<button class="lcard ${id}" data-act="pick" data-p="${id}"><div class="lav">${avatarHTML(id, 'idle', 130)}</div><b>${PROFILES[id].name}</b><small>${PROFILES[id].grade} · Level ${lv.level}</small></button>`; }).join('')}
    <button class="lcard parent" data-act="parent"><div class="lav big">🔒</div><b>Grown-ups</b><small>Progress & settings</small></button></div>
    <p class="fine">Saved on this device automatically. No sign-in, no ads, no tracking.</p></main>`;
}

// ---------- kid home ----------
function packCard(pk) {
  const p = P_(), r = readiness(p, pk), iso = dueISO(p, pk), n = nextNodeFor(p, pk), d = iso ? daysUntil(iso) : null;
  return `<button class="pcard" style="--pc:${pk.color}" data-act="path" data-pack="${pk.id}"><div class="pic">${pk.icon}</div><div class="ptx"><b>${esc(pk.title)}</b><small>${esc(pk.subject)}${iso && d >= 0 ? ` · test ${dueLabel(iso)}` : ''}</small>${bar(r)}<small class="mut">${pct(r)}% ready${n ? ` · next: ${esc(n.title)}` : ' · all cleared! 🎉'}</small></div>${ring(r, 52)}</button>`;
}
function home() {
  const p = P_(), packs = packsOf(S.profile), e = S.profile === 'ensley', q = todaysQuest(S.profile, packs), recs = recommend(S.profile, packs, 'kid'), lv = levelOf(p.xp);
  const sk = skillStats(p, packs), strong = sk.filter(s => s.avg >= .75).slice(-3).reverse(), grow = sk.filter(s => s.avg < .75).slice(0, 3), built = p.world.built || 0, into = ((p.world.blocks || 0) % BLOCKS_PER_BUILD), mastered = Object.values(p.items).filter(i => i.box >= 4).length;
  const hero = e ? `<div class="hero-av">${unicornSVG(ensureAvatar(p) && p.avatar.equipped, 'idle', 150)}</div>` : `<div class="hero-av stage" id="stage3d"></div>`;
  chrome(`<section class="hero">${hero}<div class="hero-tx"><h1>${e ? `Hi ${PROFILES[S.profile].name}! ✨` : `Welcome back, ${PROFILES[S.profile].name}.`}</h1><p>${e ? 'Ready for a sparkly adventure?' : 'Pick up where you left off.'}</p><div class="chips"><span class="chip sun">⭐ ${p.stars} stars</span><span class="chip">🧠 ${mastered} mastered</span><span class="chip mint">Lv ${lv.level}</span></div></div></section>
  ${q ? `<button class="quest" data-act="${q.act}" ${Object.entries(q.args || {}).map(([k, v]) => `data-${k.toLowerCase()}="${esc(v)}"`).join(' ')}><span class="qi">${q.icon}</span><span class="qt"><small>${e ? "TODAY'S QUEST" : 'NEXT UP'}</small><b>${esc(q.title)}</b><em>${esc(q.sub)}</em></span><span class="qgo">▶</span></button>` : ''}
  <h2 class="sec">${e ? 'My adventures' : 'My pathways'}</h2><div class="pgrid">${packs.map(packCard).join('') || '<p class="mut">No content yet.</p>'}</div>
  ${recs.length ? `<h2 class="sec">${e ? 'Your brain coach says' : 'Coach'}</h2><div class="recs">${recs.map(r => `<${r.act ? 'button' : 'div'} class="rec ${r.level}" ${r.act ? `data-act="${r.act}" ${Object.entries(r.args || {}).map(([k, v]) => `data-${k.toLowerCase()}="${esc(v)}"`).join(' ')}` : ''}><span class="ri">${r.icon}</span><span><b>${esc(r.title)}</b><small>${esc(r.text)}</small></span></${r.act ? 'button' : 'div'}>`).join('')}</div>` : ''}
  <div class="two"><div class="card"><h3>${e ? '🌟 My super strengths' : '🏆 Strengths'}</h3>${strong.length ? strong.map(s => `<div class="srow"><span>${esc(s.skill)}</span>${bar(s.avg, 'g')}</div>`).join('') : '<p class="mut">Play a few rounds and your strengths will show up here!</p>'}</div><div class="card"><h3>${e ? '🌱 Growing' : '📈 Growing'}</h3>${grow.length ? grow.map(s => `<div class="srow"><span>${esc(s.skill)}</span>${bar(s.avg)}</div>`).join('') : '<p class="mut">Nothing yet.</p>'}</div></div>
  <h2 class="sec">${e ? 'My Unicorn Meadow' : 'My Block World'}</h2><button class="card worldcard" data-act="nav" data-v="me" aria-label="Open my world">${e ? meadowHTML(built) : '<div class="world3d" id="world3d"></div>'}<div class="wprog"><span>${built} of ${WORLD[S.profile].length} built</span>${bar(into / BLOCKS_PER_BUILD)}<small class="mut">${e ? 'Every answer is a seed 🌱' : 'Every answer is a block 🧱'} — ${BLOCKS_PER_BUILD - Math.floor(into)} more to the next ${e ? 'surprise' : 'build'}</small></div></button>
  <div class="row quick"><button class="btn soft" data-act="brk">🧠 Brain break</button><button class="btn soft" data-act="nav" data-v="play">🎮 Games</button><button class="btn soft" data-act="nav" data-v="checklist">✅ Checklist</button></div>`);
  requestAnimationFrame(() => { if (!e) { const st = $('#stage3d'); if (st) S.three.push(createStage(st, p.avatar.equipped)); const w = $('#world3d'); if (w) S.three.push(createWorld(w, built)); } });
}

// ---------- pathway ----------
function path() {
  const p = P_(), packs = packsOf(S.profile), e = S.profile === 'ensley', id = S.params.packId || S.pack[S.profile] || packs[0]?.id, pk = packs.find(x => x.id === id) || packs[0];
  if (!pk) return chrome('<p>No content yet.</p>');
  S.pack[S.profile] = pk.id; const r = readiness(p, pk), iso = dueISO(p, pk), due = dueItems(p, [pk], 40), nxt = nextNodeFor(p, pk);
  const tabs = packs.map(x => `<button class="ptab ${x.id === pk.id ? 'on' : ''}" style="--pc:${x.color}" data-act="path" data-pack="${x.id}"><span>${x.icon}</span><small>${esc(x.title.replace(/^EUS \d · /, ''))}</small></button>`).join('');
  let nodes = '', lastU = null;
  pk.nodes.forEach((n, i) => {
    const st = p.nodes[n.id], ok = isUnlocked(p, pk, n), cur = nxt && nxt.id === n.id, off = [0, 38, 70, 38, 0, -38, -70, -38][i % 8];
    if (n.unitId && n.unitId !== lastU) { lastU = n.unitId; const u = pk.units.find(x => x.id === n.unitId); nodes += `<div class="unithead"><span>${u.icon || ''}</span> ${esc(u.title)}</div>`; }
    if (n.type === 'boss') nodes += `<div class="unithead boss">👑 The big test</div>`;
    nodes += `<button class="node ${st?.done ? 'done' : ''} ${cur ? 'cur' : ''} ${ok ? '' : 'lock'} ${n.type}" style="--off:${off}px" ${ok ? `data-act="startnode" data-pack="${pk.id}" data-node="${n.id}"` : 'disabled'} aria-label="${esc(n.title)}"><span class="nb">${ok ? n.icon : '🔒'}</span><span class="nl">${esc(n.title.replace(/^(Learn|Practice|Challenge) · /, ''))}<small>${n.type === 'learn' ? 'learn' : n.type}</small></span><span class="nstars">${[1, 2, 3].map(k => `<i class="${(st?.stars || 0) >= k ? 'on' : ''}">★</i>`).join('')}</span></button>`;
  });
  chrome(`<div class="ptabs">${tabs}</div><section class="pbanner" style="--pc:${pk.color}"><div class="pic">${pk.icon}</div><div><h1>${esc(pk.title)}</h1><p>${esc(pk.test || pk.subject)}${iso ? ` · <b>${dueLabel(iso)}</b>` : ''}</p>${bar(r)}</div>${ring(r, 74)}</section>
  <div class="row quick"><button class="btn mint" data-act="review" data-pack="${pk.id}" ${due.length ? '' : ''}>🧠 Review${due.length ? ` (${Math.min(due.length, 10)} ready)` : ''}</button><button class="btn soft" data-act="mock" data-pack="${pk.id}">👑 Mock test</button></div>
  <div class="pathwrap">${nodes}</div>`);
}

// ---------- play hub ----------
function play() {
  const p = P_(), packs = packsOf(S.profile), e = S.profile === 'ensley', games = GAMES[S.profile], sk = skillStats(p, packs);
  const all = packs.flatMap(pk => pk.units.flatMap(u => [...new Set(u.list.map(i => i.skill || pk.title))].map(s => ({ pk, s }))));
  const have = new Map(sk.map(x => [x.pack.id + '|' + x.skill, x.avg]));
  chrome(`<h1 class="h1">${e ? 'Play!' : 'Play & practice'}</h1><h2 class="sec">${e ? 'Learning games' : 'Learning games'}</h2><div class="pgrid g3">${games.map(g => `<button class="tile" data-act="game" data-game="${g.id}"><span class="t2i">${g.icon}</span><b>${g.name}</b><small>${g.sub}</small></button>`).join('')}<button class="tile" data-act="brk"><span class="t2i">🧠</span><b>Brain break</b><small>${e ? 'Move, breathe or play' : 'Reset your focus'}</small></button></div>
  <h2 class="sec">Practice a skill</h2><div class="skills">${all.map(({ pk, s }) => { const v = have.get(pk.id + '|' + s), b = strengthBadge(v ?? null); return `<button class="skill ${b[2]}" data-act="skill" data-pack="${pk.id}" data-skill="${esc(s)}"><span class="sbadge">${b[0]}</span><span><b>${esc(s)}</b><small>${esc(pk.title.replace(/^EUS \d · /, ''))}</small></span>${bar(v ?? 0, v >= .8 ? 'g' : '')}</button>`; }).join('')}</div>`);
}

// ---------- checklist ----------
const TESTDAY = [['pencil', '✏️ Pack pencil, eraser & study guide'], ['sleep', '😴 Get a good night of sleep'], ['breakfast', '🥣 Eat breakfast'], ['read', '🔊 Read the word list / key ideas out loud once']];
function checklist() {
  const p = P_(), packs = packsOf(S.profile), e = S.profile === 'ensley', t = S.tab.check || 'skills', pk = packs.find(x => x.id === (S.pack[S.profile] || packs[0]?.id)) || packs[0], d = (p.plan[today()] ||= {});
  const pt = packs.map(x => `<button class="ptab ${x.id === pk.id ? 'on' : ''}" style="--pc:${x.color}" data-act="chkpack" data-pack="${x.id}"><span>${x.icon}</span><small>${esc(x.title.replace(/^EUS \d · /, ''))}</small></button>`).join('');
  let body = '';
  if (t === 'skills') {
    const skills = [...new Set(pk.all.map(i => i.skill || pk.title))], tick = k => p.checks[`${pk.id}|${k}`];
    body = `<p class="lead center">${e ? 'Tick each one when you can do it <u>without looking</u>. The app also checks what you\'ve proven!' : 'Self-rate each skill. The badge shows what your practice has proven.'}</p>` + skills.map(sn => { const items = pk.all.filter(i => (i.skill || pk.title) === sn), v = items.length ? items.reduce((a, i) => a + (strength(p, i.id) ?? 0), 0) / items.length : 0, seen = items.some(i => p.items[i.id]), b = strengthBadge(seen ? v : null); return `<div class="chk ${tick(sn) ? 'on' : ''}"><button class="bx" data-act="tick" data-k="${esc(pk.id + '|' + sn)}">${tick(sn) ? '✓' : ''}</button><span class="ct"><b>${esc(sn)}</b><small>${b[0]} ${b[1]}${seen ? ` · ${pct(v)}%` : ''}</small></span><button class="btn sm soft" data-act="skill" data-pack="${pk.id}" data-skill="${esc(sn)}">Practice</button></div>`; }).join('');
    const done = skills.filter(sn => tick(sn)).length; body += `<div class="meter big"><i style="width:${done / skills.length * 100}%"></i></div><p class="center"><b>${done}</b> of ${skills.length} ticked ${done === skills.length ? '🎉 You\'re ready!' : ''}</p>`;
  } else {
    const plan = [...packs.map(x => ({ k: 'p_' + x.id, l: `Do a round of ${x.title}`, auto: p.sessions.some(s => s.pk === x.id && new Date(s.t).toLocaleDateString('en-CA') === today() && s.done) })), { k: 'rev', l: '🧠 Do a smart review', auto: p.sessions.some(s => s.kind === 'review' && new Date(s.t).toLocaleDateString('en-CA') === today()) }, { k: 'brk', l: '🌬️ Take a brain break', auto: !!d.brk }, ...TESTDAY.map(([k, l]) => ({ k, l, manual: 1 }))];
    body = `<p class="lead center">${e ? 'Today\'s list — the practice ones check themselves! ✨' : 'Today\'s plan — practice items auto-check.'}</p>` + plan.map(x => { const on = x.manual ? d['m_' + x.k] : x.auto; return `<div class="chk ${on ? 'on' : ''}">${x.manual ? `<button class="bx" data-act="ptick" data-k="${x.k}">${on ? '✓' : ''}</button>` : `<span class="bx">${on ? '✓' : ''}</span>`}<span class="ct"><b>${x.l}</b></span></div>`; }).join('') + `<div class="meter big"><i style="width:${plan.filter(x => (x.manual ? d['m_' + x.k] : x.auto)).length / plan.length * 100}%"></i></div>`;
  }
  chrome(`<h1 class="h1">✅ Checklists</h1><div class="tabs"><button class="tab ${t === 'skills' ? 'on' : ''}" data-act="chktab" data-t="skills">Am I ready?</button><button class="tab ${t === 'plan' ? 'on' : ''}" data-act="chktab" data-t="plan">Today's plan</button></div>${t === 'skills' ? `<div class="ptabs">${pt}</div>` : ''}<div class="list">${body}</div>`);
}

// ---------- me / world / closet ----------
function me() {
  const p = P_(), e = S.profile === 'ensley', built = p.world.built || 0, items = Object.values(p.items), mastered = items.filter(i => i.box >= 4).length, nodes = Object.values(p.nodes).filter(n => n.done).length, w = WORLD[S.profile];
  const acc = items.length ? items.reduce((a, i) => a + (i.n ? i.f / i.n : 0), 0) / items.length : 0;
  chrome(`<div class="me2"><section class="card meav">${e ? `<div class="bigav">${unicornSVG(ensureAvatar(p) && p.avatar.equipped, 'idle', 220)}</div>` : '<div class="stage tall" id="stage3d"></div>'}<div class="center"><button class="btn big" data-act="closet">${e ? '👗 Closet' : '🎽 Customize'}</button>${p.avatar.picks.length ? `<button class="btn big pulse" data-act="reward">🎁 Pick reward (${p.avatar.picks.length})</button>` : ''}</div></section>
  <section class="card"><h3>${e ? 'My stats' : 'Stats'}</h3><div class="stats"><div><b>${p.stars}</b><small>stars</small></div><div><b>${nodes}</b><small>levels cleared</small></div><div><b>${mastered}</b><small>mastered</small></div><div><b>${pct(acc)}%</b><small>first-try</small></div></div></section></div>
  <h2 class="sec">${e ? 'My Unicorn Meadow' : 'My Block World'} · ${built}/${w.length}</h2><section class="card worldfull">${e ? meadowHTML(built) : '<div class="world3d tall" id="world3d"></div>'}<div class="blist">${w.map((x, i) => `<span class="${i < built ? 'on' : ''}">${i < built ? (x.emoji || '🧱') : '🔒'} ${esc(x.title)}</span>`).join('')}</div></section>`);
  requestAnimationFrame(() => { if (!e) { const st = $('#stage3d'); if (st) S.three.push(createStage(st, p.avatar.equipped)); const wd = $('#world3d'); if (wd) S.three.push(createWorld(wd, built, S.params.newIdx ?? -1)); } });
}
function closet() {
  const p = P_(), e = S.profile === 'ensley', cat = CATALOG[S.profile]; ensureAvatar(p); const slot = S.tab.closet || cat.slots[0].id, eq = p.avatar.equipped, t0 = S.closetT0 ||= Date.now();
  const items = cat.items.filter(i => i.slot === slot), swatch = i => i.c && i.c !== 'rainbow' ? `<i class="sw" style="background:${i.c}"></i>` : `<i class="sw">${i.icon || (i.c === 'rainbow' ? '🌈' : '·')}</i>`;
  chrome(`<h1 class="h1">${e ? '👗 My Closet' : '🎽 Customize'}</h1><p class="lead center">${e ? 'Pick what you like — then go have fun!' : 'Quick tweak, then back to the game.'}</p><div class="closet"><div class="cprev">${e ? unicornSVG(eq, 'happy', 200) : '<div class="stage tall" id="stage3d"></div>'}<div class="bar soft"><i id="cbar" style="width:0%"></i></div><small class="mut" id="cmsg">Take your time — this is a short break!</small></div>
  <div><div class="slotbar">${cat.slots.map(s => `<button class="${s.id === slot ? 'on' : ''}" data-act="cslot" data-s="${s.id}"><span>${s.icon}</span><small>${s.name}</small></button>`).join('')}</div><div class="igrid">${items.map(i => { const own = p.avatar.owned.includes(i.id); return `<button class="item ${eq[slot] === i.id ? 'on' : ''} ${own ? '' : 'locked'}" ${own ? `data-act="equip" data-i="${i.id}"` : 'disabled'}>${swatch(i)}<b>${esc(i.name)}</b>${i.skill ? '<em>🎓 scholar</em>' : ''}${i.rare ? '<em>⭐ rare</em>' : ''}${own ? '' : '<small>🔒 earn by learning</small>'}</button>`; }).join('')}</div></div></div><div class="row"><button class="btn big mint" data-act="nav" data-v="home">Done — let's play!</button></div>`, { nav: false });
  requestAnimationFrame(() => { if (!e) { const st = $('#stage3d'); if (st) { const s = createStage(st, eq); S.three.push(s); S.stage = s; } } });
  const iv = setInterval(() => { const b = $('#cbar'); if (!b) return clearInterval(iv); const f = Math.min(1, (Date.now() - t0) / 90000); b.style.width = f * 100 + '%'; if (f >= 1) { const m = $('#cmsg'); if (m) m.textContent = e ? 'Time to play! 🦄' : 'Time to get back in the game.'; clearInterval(iv); } }, 500);
}
export function openPick(profile) {
  return new Promise(res => {
    const p = P(profile); ensureAvatar(p); const offer = p.avatar.picks[0]; if (!offer) return res(); const e = profile === 'ensley', ids = offer.slice(0, 3);
    sfx.unlock();
    const prev = id => { const it = itemById(profile, id), look = { ...p.avatar.equipped, [it.slot]: id }; return e ? unicornSVG(look, 'happy', 120) : `<img class="av3" width="130" height="130" src="${snapshotURL(look, 'happy', 'full')}" alt="">`; };
    openOv(`<div class="sheet wide pick"><h2>🎁 Pick 1 of 3!</h2><p class="lead">${e ? 'Choose your favorite — it\'s yours forever!' : 'Choose one. It\'s yours.'}</p><div class="trio">${ids.map(id => { const it = itemById(profile, id); return `<button class="pickcard ${it.rare ? 'rare' : ''}" data-i="${id}">${prev(id)}<b>${esc(it.name)}</b><small>${CATALOG[profile].slots.find(s => s.id === it.slot).name}${it.rare ? ' · ⭐ rare' : ''}${it.skill ? ' · 🎓 scholar' : ''}</small></button>`; }).join('')}</div></div>`, 'pickov');
    $('#ov').onclick = ev => { const b = ev.target.closest('.pickcard'); if (!b) return; const id = b.dataset.i, it = itemById(profile, id); p.avatar.owned.push(id); p.avatar.equipped[it.slot] = id; p.avatar.picks.shift(); save(profile); sfx.fanfare(); burstEl(b, { n: 100, spread: 100, power: 45 }); setTimeout(() => { closeOv(); res(id); }, 900); };
  });
}
export function worldReveal(profile, built) {
  const it = WORLD[profile][Math.min(built, WORLD[profile].length) - 1]; if (!it) return null;
  return { title: it.title, html: profile === 'ensley' ? `<span class="wr">${it.emoji}</span>` : '<span class="wr">🧱</span>' };
}

// ---------- parent ----------
const gateQ = () => { const a = 6 + (Math.random() * 7 | 0), b = 6 + (Math.random() * 6 | 0), c = 3 + (Math.random() * 20 | 0); return { q: `${a} × ${b} + ${c}`, a: a * b + c }; };
let GATE = null;
function parent() {
  S.profile = null; document.documentElement.dataset.theme = 'parent';
  if (Date.now() - S.parentOK > 15 * 60e3) { GATE = gateQ(); $('#view').innerHTML = `<main class="launch"><div class="card center gate"><div class="lav big">🔒</div><h2>Grown-ups only</h2><p class="lead">What is <b>${GATE.q}</b> ?</p><input id="gin" inputmode="numeric" autocomplete="off" class="gin"><div class="row"><button class="btn big" data-act="gate">Enter</button><button class="btn soft" data-act="nav" data-v="launcher">← Back</button></div><p class="fine">This keeps little fingers out of the settings.</p></main>`; return; }
  const who = S.tab.parentWho || 'overview', tab = S.tab.parent || 'overview';
  $('#view').innerHTML = `<header class="pbar"><button class="btn sm soft" data-act="nav" data-v="launcher">← Players</button><h1>📊 Grown-up dashboard</h1><span class="sp"></span><span class="chip ${syncInfo().status === 'ok' ? 'mint' : ''}">${family() ? '☁️ ' + ({ ok: 'Synced', syncing: 'Syncing…', error: 'Sync error', idle: 'Sync on' }[syncInfo().status]) : '💾 This device only'}</span></header>
  <div class="ptabs2">${[['overview', 'Overview'], ['ensley', 'Ensley'], ['sida', 'Sida'], ['tests', 'Tests'], ['sync', 'Sync & backup'], ['content', 'Content']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="ptab" data-t="${k}">${n}</button>`).join('')}</div><main class="parentmain">${parentBody(tab)}</main>`;
}
const sparkbars = (vals, labels, color) => { const mx = Math.max(1, ...vals), W = vals.length * 26 + 10; return `<svg class="sb" viewBox="0 0 ${W} 80" width="100%" height="80" preserveAspectRatio="none">${vals.map((v, i) => `<rect x="${6 + i * 26}" y="${64 - v / mx * 56}" width="18" height="${v / mx * 56}" rx="3" fill="${color}" opacity="${v ? 1 : .25}"><title>${labels[i]}: ${v}</title></rect><text x="${15 + i * 26}" y="77" text-anchor="middle" font-size="8" fill="currentColor">${labels[i].slice(-2)}</text>`).join('')}</svg>`; };
function parentBody(tab) {
  if (tab === 'overview') return ['ensley', 'sida'].map(id => parentSummary(id)).join('') + '<p class="mut center">Tip: tap a name above for full detail — missed questions, what they typed, and spaced-repetition status.</p>';
  if (tab === 'ensley' || tab === 'sida') return parentDetail(tab);
  if (tab === 'tests') return testsTab();
  if (tab === 'sync') return syncTab();
  return contentTab();
}
function parentSummary(id) {
  const p = P(id), packs = packsOf(id), recs = recommend(id, packs, 'parent'), lv = levelOf(p.xp), last = p.sessions.at(-1), d7 = weekAcc(p, 7), mins7 = [...Array(7)].map((_, i) => Math.round(((p.days[new Date(Date.now() - (6 - i) * DAY).toLocaleDateString('en-CA')] || {}).ms || 0) / 60000)).reduce((a, b) => a + b, 0);
  return `<section class="card psum"><div class="psh"><div class="pav">${avatarHTML(id, 'idle', 64)}</div><div><h2>${PROFILES[id].name} <small>${PROFILES[id].grade}</small></h2><p class="mut">Level ${lv.level} · ${p.stars}★ · ${minutesToday(p)} min today · ${mins7} min this week${last ? ` · last played ${fmtDate(last.t)}` : ' · not started yet'}</p></div></div>
  <div class="pgrid">${packs.map(pk => { const r = readiness(p, pk), iso = dueISO(p, pk); return `<div class="pcard static" style="--pc:${pk.color}"><div class="pic">${pk.icon}</div><div class="ptx"><b>${esc(pk.title)}</b><small>${iso ? `${esc(pk.test || '')} ${dueLabel(iso)}` : 'No test date set'}</small>${bar(r)}</div>${ring(r, 52)}</div>`; }).join('')}</div>
  ${recs.length ? `<h3>Recommendations</h3><ul class="reclist">${recs.slice(0, 5).map(r => `<li class="${r.level}">${r.icon} <b>${esc(r.title)}</b> — ${esc(r.text)}</li>`).join('')}</ul>` : '<p class="mut">Recommendations will appear after a few practice rounds.</p>'}${d7 != null ? `<p class="mut">First-try accuracy, last 7 days: <b>${pct(d7)}%</b></p>` : ''}</section>`;
}
function parentDetail(id) {
  const p = P(id), packs = packsOf(id), sk = skillStats(p, packs), log = p.log.filter(l => !l.pre);
  const byId = Object.fromEntries(packs.flatMap(pk => pk.all.map(i => [i.id, { i, pk }])));
  const missed = {}; log.forEach(l => { if (!l.ok && byId[l.id]) { const m = missed[l.id] ||= { n: 0, resp: [] }; m.n++; if (l.r) m.resp.push(l.r); } });
  const rows = Object.entries(missed).sort((a, b) => b[1].n - a[1].n).slice(0, 14), days = [...Array(14)].map((_, i) => new Date(Date.now() - (13 - i) * DAY).toLocaleDateString('en-CA')), dq = days.map(d => (p.days[d] || {}).q || 0), dm = days.map(d => Math.round(((p.days[d] || {}).ms || 0) / 60000));
  const label = i => i.t === 'word' ? i.w : i.t === 'term' ? i.term : i.t === 'gen' ? `${i.skill} (generated)` : (i.q || i.title || i.id);
  const due = dueItems(p, packs, 99);
  const boxes = [0, 1, 2, 3, 4, 5].map(b => Object.values(p.items).filter(i => i.box === b).length);
  return `<section class="card"><h2>${PROFILES[id].name} — detail</h2><div class="two"><div><h3>🏆 Strongest skills</h3>${sk.slice(-5).reverse().map(s => `<div class="srow"><span>${esc(s.skill)} <small class="mut">${esc(s.pack.title.replace(/^EUS \d · /, ''))}</small></span>${bar(s.avg, 'g')}<b>${pct(s.avg)}%</b></div>`).join('') || '<p class="mut">No data yet.</p>'}</div><div><h3>🌱 Needs practice</h3>${sk.slice(0, 6).map(s => `<div class="srow"><span>${esc(s.skill)} <small class="mut">${esc(s.pack.title.replace(/^EUS \d · /, ''))}</small></span>${bar(s.avg)}<b>${pct(s.avg)}%</b></div>`).join('') || '<p class="mut">No data yet.</p>'}</div></div></section>
  <section class="card"><h3>Most-missed questions <small class="mut">(and what was typed or chosen)</small></h3>${rows.length ? `<table class="dt"><thead><tr><th>Item</th><th>Misses</th><th>Answers given</th></tr></thead><tbody>${rows.map(([k, m]) => { const e = byId[k]; return `<tr><td>${esc(String(label(e.i)).replace(/<[^>]+>/g, '').slice(0, 70))}<br><small class="mut">${esc(e.pk.title)}</small></td><td>${m.n}</td><td>${esc([...new Set(m.resp)].slice(0, 4).join(', '))}</td></tr>`; }).join('')}</tbody></table>` : '<p class="mut">No misses recorded.</p>'}</section>
  <section class="card"><h3>Activity — last 14 days</h3><p class="mut">Questions per day</p>${sparkbars(dq, days, '#38b6f2')}<p class="mut">Minutes per day</p>${sparkbars(dm, days, '#2fc99e')}</section>
  <section class="card"><h3>Memory strength (spaced repetition)</h3><p class="mut">Box 0 = just learned · Box 5 = long-term. ${due.length} item(s) are due for review now.</p><div class="boxes">${boxes.map((n, i) => `<div><b>${n}</b><small>Box ${i}</small></div>`).join('')}</div></section>
  <section class="card"><h3>Settings</h3><label class="tg"><input type="checkbox" data-act="setting" data-p="${id}" data-s="sound" ${p.settings.sound ? 'checked' : ''}> Sound effects</label><label class="tg"><input type="checkbox" data-act="setting" data-p="${id}" data-s="voice" ${p.settings.voice ? 'checked' : ''}> Spoken praise / words</label><label class="tg"><input type="checkbox" data-act="setting" data-p="${id}" data-s="unlockAll" ${p.settings.unlockAll ? 'checked' : ''}> Unlock the whole path (skip ahead)</label><div class="row"><button class="btn sm soft" data-act="resetp" data-p="${id}">Reset ${PROFILES[id].name}'s progress…</button></div></section>`;
}
function testsTab() {
  return `<section class="card"><h2>Test dates</h2><p class="mut">Set a date and the app compresses review so everything is fresh <i>before</i> the test, and the coach counts down.</p>${['ensley', 'sida'].map(id => `<h3>${PROFILES[id].name}</h3>${packsOf(id).map(pk => { const iso = dueISO(P(id), pk); return `<div class="trow"><span>${pk.icon} <b>${esc(pk.title)}</b><small class="mut"> ${esc(pk.test || '')}</small></span><input type="date" value="${iso || ''}" data-act="due" data-p="${id}" data-pack="${pk.id}"><button class="btn sm soft" data-act="clrdue" data-p="${id}" data-pack="${pk.id}">clear</button></div>`; }).join('')}`).join('')}</section>`;
}
function syncTab() {
  const f = family(), si = syncInfo();
  return `<section class="card"><h2>☁️ Family sync <small class="mut">(optional)</small></h2><p>Without a family code, everything stays <b>on this device only</b>. With one, progress also backs up to your private database so you can see both kids from any device — no sign-in needed. No names are sent (just "ensley" / "sida" and learning data).</p>
  ${f ? `<p>Status: <b>${({ ok: 'Synced', syncing: 'Syncing…', error: 'Error: ' + esc(si.err), idle: 'On' })[si.status]}</b>${si.last ? ` · last ${new Date(si.last).toLocaleTimeString()}` : ''}</p><p class="mono">Your family code: <b>${esc(f)}</b></p><p class="mut">To use it on another iPad/phone: open this app there → Grown-ups → Sync → paste the code (or open the setup link).</p><div class="row"><button class="btn mint" data-act="syncnow">Sync now</button><button class="btn soft" data-act="copycode">Copy setup link</button><button class="btn soft" data-act="stopsync">Turn sync off</button></div>` : `<div class="row"><button class="btn mint" data-act="newfam">Create a family code</button></div><p>…or paste an existing code:</p><div class="row"><input id="famin" class="gin" placeholder="xxxxxx-xxxxxx-xxxxxx" autocomplete="off"><button class="btn" data-act="usefam">Use code</button></div>`}</section>
  <section class="card"><h2>💾 Backup</h2><p class="mut">Download everything as a file you can keep, or restore from one.</p><div class="row"><button class="btn soft" data-act="dl">Download backup</button><label class="btn soft filebtn">Restore from file<input type="file" accept="application/json" data-act="restore" hidden></label></div></section>
  <section class="card"><h2>🔐 Privacy</h2><ul class="reclist"><li>No accounts, no ads, no analytics, no third-party scripts or fonts.</li><li>Progress is stored in this browser (localStorage). If sync is on, learning data goes to a database only your family code can read.</li><li>Don't put real names, photos or school info in the repo — it's public.</li></ul></section>`;
}
function contentTab() {
  return `<section class="card"><h2>📚 Content library</h2><p class="mut">Everything the kids practice comes from packs in the <code>content/</code> folder. To add a new assignment or study guide: send me the photo/PDF and I'll add it to the pathway (see docs/ADDING_CONTENT.md).</p>${['ensley', 'sida'].map(id => `<h3>${PROFILES[id].name}</h3>${packsOf(id).map(pk => `<div class="trow"><span>${pk.icon} <b>${esc(pk.title)}</b><br><small class="mut">${pk.units.length} units · ${pk.all.length} items · ${esc(pk.source || '')}</small>${(pk.notes || []).map(n => `<br><small class="note">⚠️ ${esc(n)}</small>`).join('')}</span></div>`).join('')}`).join('')}</section>`;
}

// ---------- actions ----------
export const ACT = {
  pick: e => { S.profile = e.dataset.p; sfx.tap(); go('home'); },
  nav: e => { if (e.dataset.v === 'launcher') { S.profile = null; } go(e.dataset.v); },
  switch: () => go('launcher'),
  parent: () => go('parent'),
  reward: async () => { await openPick(S.profile); go(S.view, S.params); },
  gate: () => { const v = parseInt($('#gin').value, 10); if (v === GATE.a) { S.parentOK = Date.now(); go('parent'); } else { $('#gin').value = ''; $('#gin').placeholder = 'try again'; } },
  ptab: e => { S.tab.parent = e.dataset.t; parent(); },
  path: e => go('path', { packId: e.dataset.pack }),
  startnode: e => startNode(e.dataset.pack, e.dataset.node),
  review: e => startReview(e.dataset.pack),
  mock: e => { const pk = packsOf(S.profile).find(x => x.id === e.dataset.pack); startNode(pk.id, pk.nodes.at(-1).id); },
  skill: e => startSkill(e.dataset.pack, e.dataset.skill),
  game: e => startGame(e.dataset.game, S.profile, packsOf(S.profile), () => go('play')),
  brk: async () => { await offerBreak(S.profile, true); go(S.view, S.params); },
  chktab: e => { S.tab.check = e.dataset.t; checklist(); }, chkpack: e => { S.pack[S.profile] = e.dataset.pack; checklist(); },
  tick: e => { const p = P_(), k = e.dataset.k; p.checks[k] = !p.checks[k]; save(S.profile); if (p.checks[k]) { sfx.correct(2); burstEl(e, { n: 40 }); say(S.profile === 'ensley' ? 'Nice!' : ''); } checklist(); },
  ptick: e => { const d = (P_().plan[today()] ||= {}), k = 'm_' + e.dataset.k; d[k] = !d[k]; save(S.profile); if (d[k]) { sfx.correct(2); burstEl(e, { n: 40 }); } checklist(); },
  closet: () => { S.closetT0 = 0; go('closet'); }, cslot: e => { S.tab.closet = e.dataset.s; closet(); },
  equip: e => { const p = P_(), it = itemById(S.profile, e.dataset.i); p.avatar.equipped[it.slot] = it.id; save(S.profile); sfx.unlock(); if (S.profile === 'sida' && S.stage) { S.stage.setLook(p.avatar.equipped, 'happy'); S.stage.celebrate(); } closetKeep(); },
  setting: e => { const p = P(e.dataset.p), k = e.dataset.s; if (k === 'unlockAll') p.settings.unlockAll = e.checked; else p.settings[k] = e.checked; save(e.dataset.p); },
  resetp: async e => { const id = e.dataset.p; if (confirm(`Erase ALL of ${PROFILES[id].name}'s progress on this device?`) && confirm('Really erase? This cannot be undone.')) { resetProfile(id); parent(); } },
  due: e => { const p = P(e.dataset.p); (p.settings.due ||= {})[e.dataset.pack] = e.value || null; save(e.dataset.p); },
  clrdue: e => { const p = P(e.dataset.p); (p.settings.due ||= {})[e.dataset.pack] = ''; save(e.dataset.p); testsRerender(); },
  newfam: () => { setFamily(newFamilyCode()); Object.keys(PROFILES).forEach(pushNow); parent(); },
  usefam: async () => { const v = ($('#famin').value || '').trim().toLowerCase(); if (v.length < 20) return alert('That code looks too short.'); setFamily(v); const all = await pullAll(); Object.keys(PROFILES).forEach(id => { if (all[id]) { mergeInto(P(id), all[id].data); save(id); } }); parent(); },
  syncnow: async () => { for (const id of Object.keys(PROFILES)) await syncProfile(id); parent(); },
  stopsync: () => { if (confirm('Turn sync off on this device? (Your cloud copy stays.)')) { setFamily(''); parent(); } },
  copycode: async () => { const u = `${location.origin}${location.pathname}#family=${family()}`; try { await navigator.clipboard.writeText(u); alert('Setup link copied. Open it on the other device.'); } catch (e) { prompt('Copy this link:', u); } },
  dl: () => { const b = new Blob([exportAll()], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `study-quest-backup-${today()}.json`; a.click(); },
  restore: e => { const f = e.files[0]; if (!f) return; f.text().then(t => { try { importAll(t); alert('Restored!'); parent(); } catch (err) { alert('That file could not be read.'); } }); }
};
const testsRerender = () => parent();
const closetKeep = () => { const keep = S.stage; destroy3d(); closet(); void keep; };

// ---------- starting things ----------
export function startNode(packId, nodeId) {
  const pk = packsOf(S.profile).find(x => x.id === packId), n = pk.nodes.find(x => x.id === nodeId), p = P_(), e = S.profile === 'ensley';
  if (!isUnlocked(p, pk, n)) return; const set = questionsForNode(p, pk, n, S.profile);
  destroy3d(); startRun({ profile: S.profile, kind: 'node', packId, nodeId, pack: pk, packNodes: pk.nodes, title: n.title, back: 'path', pre: set.pre, cards: set.cards, qs: set.qs });
}
export function startReview(packId) {
  const p = P_(), packs = packId ? packsOf(S.profile).filter(x => x.id === packId) : packsOf(S.profile);
  let due = dueItems(p, packs, 10);
  if (due.length < 5) { const more = packs.flatMap(pk => pk.all.filter(i => i.t !== 'story' && p.items[i.id] && !due.some(d => d.item.id === i.id)).map(i => ({ pack: pk, item: i, s: strength(p, i.id) }))).sort((a, b) => a.s - b.s).slice(0, 8 - due.length); due = due.concat(more); }
  if (due.length < 3) { const fresh = packs.flatMap(pk => pk.all.filter(i => i.t !== 'story' && !p.items[i.id]).map(i => ({ pack: pk, item: i }))).slice(0, 6); due = due.concat(fresh); }
  if (!due.length) return banner('Nothing to review yet — do a lesson first!');
  const pk = due[0].pack; destroy3d(); startRun({ profile: S.profile, kind: 'review', packId: pk.id, pack: pk, packNodes: [], title: 'Smart review', back: 'home', qs: questionsForItems(p, due.slice(0, 10), 'auto') });
}
export function startSkill(packId, skill) {
  const pk = packsOf(S.profile).find(x => x.id === packId), p = P_(), items = pk.all.filter(i => i.t !== 'story' && (i.skill || pk.title) === skill);
  const entries = []; items.forEach(i => { const reps = i.t === 'gen' ? (i.n || 3) : 1; for (let k = 0; k < reps; k++) entries.push({ pack: pk, item: i }); });
  destroy3d(); startRun({ profile: S.profile, kind: 'skill', packId, pack: pk, packNodes: [], title: skill, back: 'play', qs: questionsForItems(p, shuffle(entries).slice(0, 8), 'auto') });
}
