// Loads content packs and turns items into questions. The research-backed rules live here:
//  • construct-response (typed / tile-built) is preferred as a skill is learned; recognition (MC) scaffolds novices
//  • multiple-choice distractors come from real misconceptions (the worksheet's own wrong spellings, etc.)
//  • practice order = what is due / weak first (spaced repetition), unseen items next
import { shuffle, rnd, rint, sample, uniq, esc } from './util.js';
import { makeQ, tallySVG, tableHTML, waterCycleSVG } from './gen.js';
import { strength, isDue } from './store.js';

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function loadPacks(profile) {
  const man = await (await fetch('content/manifest.json', { cache: 'no-cache' })).json(), out = [];
  for (const e of man.packs.filter(x => x.profile === profile)) {
    try { out.push(prepare(await (await fetch('content/' + e.file, { cache: 'no-cache' })).json())); }
    catch (err) { console.warn('pack failed', e.file, err); }
  }
  return out;
}

function prepare(p) {
  const groups = {}, all = [];
  for (const it of p.items) {
    let subs;
    if (it.t === 'terms') subs = it.pairs.map(([term, def]) => ({ t: 'term', base: `${it.id}:${slug(term)}`, term, def, skill: it.skill, pool: it.id }));
    else if (it.t === 'qas') subs = it.list.map((q, i) => ({ t: 'qa', base: `${it.id}:${q.id || i}`, ...q, skill: it.skill, visual: q.visual || it.visual }));
    else if (it.t === 'diagram') subs = it.list.map((d, i) => ({ t: 'qa', base: `${it.id}:${i}`, q: 'What is happening where the diagram glows?', a: d.a, w: it.choices.filter(c => c !== d.a), why: d.why, visual: '@watercycle:' + d.focus, skill: it.skill }));
    else subs = [{ ...it, base: it.id }];
    subs.forEach(s => { s.id = `${p.id}/${s.base}`; s.packId = p.id; if (s.t === 'word' && !s.skill) s.skill = s.w.charAt(0).toUpperCase() + s.w.slice(1); });
    groups[it.id] = subs; all.push(...subs);
  }
  p.groups = groups; p.all = all; p.byId = Object.fromEntries(all.map(i => [i.id, i]));
  p.words = all.filter(i => i.t === 'word');
  p.units.forEach(u => { u.packId = p.id; u.list = u.items.flatMap(g => groups[g] || []); });
  p.nodes = nodesOf(p);
  return p;
}

export function nodesOf(p) {
  const n = [];
  const add = (type, unit, title, icon) => n.push({ id: `${p.id}:${unit ? unit.id : 'x'}:${type}`, type, packId: p.id, unitId: unit?.id, title, icon, idx: n.length });
  p.units.forEach(u => {
    add('learn', u, `Learn · ${u.title}`, u.icon || '🌱');
    add('practice', u, `Practice · ${u.title}`, '🎯');
    add('challenge', u, `Challenge · ${u.title}`, '⚡');
    if (u.story) add('story', u, 'Silly story', '📖');
  });
  add('boss', null, 'Test Day Boss', '👑');
  return n;
}
export const nodeById = (packs, id) => { for (const p of packs) { const n = p.nodes.find(x => x.id === id); if (n) return { node: n, pack: p, unit: p.units.find(u => u.id === n.unitId) }; } return null; };

// ---------------- visuals ----------------
export function visualHTML(v) {
  if (!v) return '';
  if (typeof v === 'string') {
    if (v.startsWith('@watercycle:')) return waterCycleSVG(v.slice(12));
    if (v.startsWith('@tally:')) return tallySVG(+v.slice(7));
    return v;
  }
  if (v.freq) return `<div class="vis-title">${esc(v.title || '')}</div>` + tableHTML(['', 'Tallies', 'Number'], v.freq.map(([n, c]) => [esc(n), tallySVG(c), c]));
  return '';
}

// ---------------- progress helpers ----------------
export const unitItems = (pack, unitId) => pack.units.find(u => u.id === unitId)?.list || [];
export function readiness(P, pack) {
  const arr = pack.all.filter(i => i.t !== 'story' && i.t !== 'counts' || i.t === 'counts');
  if (!arr.length) return 0; return arr.reduce((a, i) => a + (strength(P, i.id) ?? 0), 0) / arr.length;
}
export function skillStats(P, packs) {
  const m = {};
  for (const pk of packs) for (const i of pk.all) {
    const s = strength(P, i.id); if (s == null) continue;
    const k = `${pk.id}|${i.skill || pk.title}`, e = m[k] || (m[k] = { pack: pk, skill: i.skill || pk.title, sum: 0, n: 0, items: [] });
    e.sum += s; e.n++; e.items.push(i);
  }
  return Object.values(m).map(e => ({ ...e, avg: e.sum / e.n })).sort((a, b) => a.avg - b.avg);
}
export function dueItems(P, packs, limit = 12) {
  const out = []; for (const pk of packs) for (const i of pk.all) if (P.items[i.id] && isDue(P, i.id)) out.push({ pack: pk, item: i, s: strength(P, i.id) });
  return out.sort((a, b) => a.s - b.s).slice(0, limit);
}

// ---------------- selecting what to ask ----------------
function pickEntries(P, items, count, { weak = true } = {}) {
  const entries = [];
  for (const it of items) { const reps = it.t === 'gen' ? (it.n || 2) : 1; for (let k = 0; k < reps; k++) entries.push({ it, k }); }
  const score = e => { const s = strength(P, e.it.id); return (s == null ? .55 : (weak ? 1 - s : .4)) + (isDue(P, e.it.id) ? .35 : 0) + Math.random() * .35 - e.k * .08; };
  return entries.map(e => ({ e, s: score(e) })).sort((a, b) => b.s - a.s).slice(0, count).map(x => x.e);
}

export function questionsForNode(P, pack, node, profileId) {
  const unit = pack.units.find(u => u.id === node.unitId), big = profileId === 'sida';
  const finish = (it, q, extra) => decorate(q, it, pack, extra);
  if (node.type === 'story') return { qs: [finish(pack.byId[`${pack.id}/${unit.story}`], storyQ(pack, pack.byId[`${pack.id}/${unit.story}`]))] };
  if (node.type === 'learn') {
    const list = unit.list.filter(i => i.t !== 'story');
    const pickSet = pickEntries(P, list, big ? 7 : 6, { weak: false });
    const pre = pickSet.slice(0, 3).map(e => decorate(buildQ(P, pack, e.it, 'mc', e.k), e.it, pack, { pre: true }));
    const qs = pickSet.map(e => decorate(buildQ(P, pack, e.it, 'mc', e.k), e.it, pack, {}));
    return { pre, cards: lessonCards(pack, unit), qs };
  }
  if (node.type === 'practice') return { qs: pickEntries(P, unit.list.filter(i => i.t !== 'story'), big ? 10 : 8).map(e => decorate(buildQ(P, pack, e.it, 'auto', e.k), e.it, pack, {})) };
  if (node.type === 'challenge') return { qs: pickEntries(P, unit.list.filter(i => i.t !== 'story'), big ? 8 : 6).map(e => decorate(buildQ(P, pack, e.it, 'construct', e.k), e.it, pack, {})) };
  // boss: whole pack
  const pool = pack.all.filter(i => i.t !== 'story');
  return { qs: shuffle(pickEntries(P, pool, big ? 14 : 12)).map(e => decorate(buildQ(P, pack, e.it, 'auto', e.k), e.it, pack, {})) };
}
export function questionsForItems(P, entries, mode = 'auto') {   // entries: [{pack,item}]
  return entries.map(({ pack, item }) => decorate(buildQ(P, pack, item, mode, 0), item, pack, {}));
}
function decorate(q, it, pack, extra) { q.id = it.id; q.itemId = it.id; q.packId = pack.id; q.skill = it.skill || pack.title; q.vhtml = q.vhtml || visualHTML(q.visual || it.visual); return Object.assign(q, extra); }

function lessonCards(pack, unit) {
  if (unit.lesson) return unit.lesson.map(c => ({ title: c.title, html: c.html }));
  const words = unit.list.filter(i => i.t === 'word');
  if (words.length) return words.map(w => ({ title: w.w, say: w.w, emoji: w.emoji, html: `<div class="wordcard"><div class="syl">${esc(w.syl)}</div><p><b>${esc(w.pos)}</b> — ${esc(w.meaning)}</p><p class="sent">“${esc(w.sentence)}”</p>${w.plural && w.plural !== 'N/A' ? `<p class="plu">More than one: <b>${esc(w.plural)}</b></p>` : '<p class="plu">No plural (describing word)</p>'}</div>` }));
  const terms = unit.list.filter(i => i.t === 'term');
  return terms.map(t => ({ title: t.term, html: `<p class="deftxt">${esc(t.def)}</p>` }));
}

// ---------------- building a question from an item ----------------
export function buildQ(P, pack, it, mode = 'auto', k = 0) {
  switch (it.t) {
    case 'word': return wordQ(P, pack, it, mode);
    case 'qa': return qaQ(it);
    case 'term': return termQ(pack, it);
    case 'seq': return { fmt: 'order', html: esc(it.title || 'Put these in order'), steps: it.steps, answer: it.steps.join('|'), why: it.why || '' };
    case 'counts': return { fmt: 'counts', html: `Make a frequency table.<br><b>${esc(it.title)}</b>`, data: it.data, cats: it.cats, colors: it.colors, answer: 'counts', why: 'Count each color — then check the numbers add up to ' + it.data.length + '.' };
    case 'story': return storyQ(pack, it);
    case 'gen': { const q = makeQ(it.gen, it.level || 1); if (q.opts && q.fmt === 'mc') q.opts = q.opts.slice(); return q; }
    default: return { fmt: 'mc', html: 'Unknown item', opts: ['ok'], answer: 'ok' };
  }
}
const mcFrom = (a, wrong) => ({ opts: [a, ...uniq(wrong).filter(x => x !== a).slice(0, 3)] });

function qaQ(it) {
  if (it.num !== undefined) {
    if (it.opts) return { fmt: 'mc', html: esc(it.q), opts: it.opts, answer: String(it.num), why: it.why, hint: it.hint };
    return { fmt: 'num', html: esc(it.q), answer: it.num, why: it.why, hint: it.hint };
  }
  return { fmt: 'mc', html: esc(it.q), answer: it.a, ...mcFrom(it.a, it.w || []), why: it.why, hint: it.hint, tall: it.a.length > 24 };
}
function termQ(pack, it) {
  const pool = pack.all.filter(x => x.t === 'term' && x.pool === it.pool && x.id !== it.id), other = pool.length >= 3 ? pool : pack.all.filter(x => x.t === 'term' && x.id !== it.id);
  if (Math.random() < .5) return { fmt: 'mc', html: `What does <b>${esc(it.term)}</b> mean?`, answer: it.def, ...mcFrom(it.def, sample(other, 3).map(x => x.def)), why: `${it.term}: ${it.def}`, tall: true };
  return { fmt: 'mc', html: `Which term matches this meaning?<br><i>“${esc(it.def)}”</i>`, answer: it.term, ...mcFrom(it.term, sample(other, 3).map(x => x.term)), why: `${it.term}: ${it.def}`, hint: 'Say each term in your head and match the idea.' };
}
function storyQ(pack, it) {
  const words = uniq([...it.text.matchAll(/\[\[(\w+)\]\]/g)].map(m => m[1]));
  return { fmt: 'story', html: `<b>${esc(it.title)}</b><br>Tap a blank, then tap the word that fits.`, text: it.text, words, ids: Object.fromEntries(words.map(w => [w, `${pack.id}/${w}`])), answer: 'story', why: 'You finished the story!' };
}

// ----- spelling-word question formats -----
function decoys(w, n) { return shuffle('aeioutrsnlmdphcbgkwy'.split('').filter(c => !w.includes(c))).slice(0, n); }
function sylOptions(it) {
  const parts = it.syl.toLowerCase().split('-'), w = it.w, cuts = []; let c = 0; for (let i = 0; i < parts.length - 1; i++) { c += parts[i].length; cuts.push(c); }
  const mk = cs => { let o = '', p = 0; for (const x of cs) { o += w.slice(p, x) + '-'; p = x; } return o + w.slice(p); }, ans = mk(cuts), out = [ans];
  if (!cuts.length) { return { answer: w, opts: [w, w.slice(0, 2) + '-' + w.slice(2), w.slice(0, 3) + '-' + w.slice(3), w[0] + '-' + w.slice(1)].filter(x => x.length) }; }
  [[-1, 0], [1, 0], [2, 0], [-2, 0]].forEach(([d]) => { const cs = cuts.slice(); cs[0] = clampCut(cs[0] + d, w.length); const o = mk(cs); if (!out.includes(o)) out.push(o); });
  if (cuts.length > 1) { const cs = cuts.slice(); cs[1] = clampCut(cs[1] + 1, w.length); const o = mk(cs); if (!out.includes(o)) out.push(o); }
  return { answer: ans, opts: out.slice(0, 4) };
}
const clampCut = (v, n) => Math.max(1, Math.min(n - 1, v));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function wordQ(P, pack, it, mode) {
  const w = it.w, s = strength(P, it.id), hard = (s ?? 0) > .55, others = pack.words.filter(x => x.id !== it.id);
  const kind = mode === 'mc' ? rnd(['meaning', 'which', 'pos', 'syl', 'plural', 'which'])
    : mode === 'construct' ? rnd(['keys', 'cloze-keys', 'keys', 'scramble'])
      : hard ? rnd(['keys', 'cloze-keys', 'cloze-tiles', 'which', 'syl', 'plural'])
        : rnd(['tiles', 'tiles', 'scramble', 'cloze-tiles', 'which', 'meaning', 'pos']);
  const base = { skill: 'Spelling', emoji: it.emoji };
  const tiles = (html, extra = {}) => ({ ...base, fmt: 'tiles', word: w, tiles: w.split('').concat(extra.scr ? [] : decoys(w, w.length > 7 ? 3 : 2)), html, answer: w, say: w, hint: `It starts with “${w[0]}”.`, why: `${cap(w)} · ${it.syl}`, ...extra });
  const keys = (html, extra = {}) => ({ ...base, fmt: 'keys', keys: 'alpha', word: w, html, answer: w, say: w, hint: `It starts with “${w[0]}”, and has ${w.length} letters.`, why: `${cap(w)} · ${it.syl}`, ...extra });
  const blank = () => { const re = new RegExp(w, 'i'); return re.test(it.sentence) ? esc(it.sentence).replace(re, '<span class="blank">_____</span>') : esc(it.sentence) + ' <span class="blank">_____</span>'; };
  switch (kind) {
    case 'tiles': return tiles('Listen. Build the word!');
    case 'scramble': return tiles('Unscramble the letters!', { scr: true, tiles: shuffle(w.split('')), hint: `It starts with “${w[0]}”. ${it.meaning}` });
    case 'cloze-tiles': return tiles(`Which word fits?<br><span class="sentence">${blank()}</span>`, { say: it.sentence.replace(new RegExp(w, 'i'), 'blank') });
    case 'keys': return keys('Listen. Type the word!');
    case 'cloze-keys': return keys(`Type the missing word.<br><span class="sentence">${blank()}</span>`, { say: it.sentence.replace(new RegExp(w, 'i'), 'blank') });
    case 'which': return { ...base, fmt: 'mc', html: 'Which is spelled correctly?', answer: w, opts: [w, ...it.miss.map(m => m.toLowerCase())].slice(0, 4), say: w, hint: 'Say it slowly. Which one looks right?', why: `${cap(w)} — ${it.syl}`, big: true };
    case 'meaning': return { ...base, fmt: 'mc', html: `What does <b>${w}</b> mean?`, answer: it.meaning, ...mcFrom(it.meaning, sample(others, 3).map(x => x.meaning)), say: w, hint: `Think of: “${it.sentence}”`, why: `${cap(w)}: ${it.meaning}`, tall: true };
    case 'pos': return { ...base, fmt: 'mc', html: `Is <b>${w}</b> a noun or an adjective?<br><small>“${esc(it.sentence)}”</small>`, answer: it.pos.includes('/') ? 'Both: adjective or noun' : it.pos, opts: it.pos.includes('/') ? ['Both: adjective or noun', 'Noun only', 'Verb', 'Adverb'] : uniq([it.pos, it.pos === 'Noun' ? 'Adjective' : 'Noun', 'Verb', 'Adverb']), hint: 'A noun names a person, place or thing. An adjective describes a noun.', why: `${cap(w)} is a ${it.pos.toLowerCase()}.` };
    case 'syl': { const so = sylOptions(it); return { ...base, fmt: 'mc', html: `Which shows the syllables of <b>${w}</b>?`, answer: so.answer, opts: so.opts, say: w, hint: 'Clap the beats as you say it.', why: `${cap(so.answer)} — ${it.syl.split('-').length} syllable${it.syl.includes('-') ? 's' : ''}` }; }
    default: { // plural
      if (it.plural === 'N/A') return { ...base, fmt: 'mc', html: `<b>${w}</b> is a describing word. Does it have a plural (like “${w}s”)?`, answer: 'No — adjectives have no plural', opts: ['No — adjectives have no plural', `Yes — ${w}s`, `Yes — ${w}es`, `Yes — ${w}ies`], hint: 'Adjectives describe nouns. They don\'t change for more than one.', why: `${cap(w)} stays the same.` };
      const o = uniq([it.plural, w + 's', w + 'es', w.replace(/y$/, 'ies')]); return { ...base, fmt: 'mc', html: `Which is the plural of <b>${w}</b>?`, answer: it.plural, opts: o.length < 4 ? [...o, w + 'ss'] : o, hint: 'If it hisses (s, sh, ch, x), add -es.', why: `One ${w}, two ${it.plural}.` };
    }
  }
}
