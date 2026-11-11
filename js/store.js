// Persistence, spaced repetition (Leitner boxes, compressed toward the test date), XP and family sync.
// Privacy: everything lives in this browser's localStorage. Cloud sync is OPT-IN and only starts when a
// parent pastes a Family Code (see Parent area). No analytics, no ads, no third-party scripts.
import { DAY, avg, clamp, debounce, today } from './util.js';

export const PROFILES = {
  ensley: { id: 'ensley', name: 'Ensley', grade: '2nd grade', theme: 'sparkle', tag: 'Unicorn Meadow' },
  sida: { id: 'sida', name: 'Sida', grade: '6th grade', theme: 'block', tag: 'Block World' }
};
const KEY = id => `sq2:p:${id}`;
const FAM = 'sq2:family';
const SB = 'https://aiczpuoskwzqtzvoomll.supabase.co/rest/v1/rpc/';
const SBK = 'sb_publishable_wMVaIIC55i2IhcR4DKXweg_RZtJdUTY';   // public, write/read only via the family-code RPCs

const blank = id => ({
  v: 2, id, xp: 0, stars: 0, items: {}, nodes: {}, log: [], sessions: [], days: {}, checks: {}, plan: {},
  avatar: { owned: [], equipped: {}, picks: [] }, world: { built: 0 },
  settings: { sound: true, voice: id === 'ensley', music: false }, created: Date.now(), updatedAt: 0
});
const cache = {};
export function P(id) {
  if (cache[id]) return cache[id];
  let s; try { s = JSON.parse(localStorage.getItem(KEY(id)) || localStorage.getItem(KEY(id) + '.bak') || 'null'); } catch (e) { }
  cache[id] = Object.assign(blank(id), s || {});
  cache[id].settings = Object.assign(blank(id).settings, cache[id].settings);
  cache[id].avatar = Object.assign(blank(id).avatar, cache[id].avatar);
  return cache[id];
}
export function save(id) {
  const s = P(id); s.updatedAt = Date.now();
  try { const j = JSON.stringify(s); localStorage.setItem(KEY(id), j); localStorage.setItem(KEY(id) + '.bak', j); } catch (e) { }
  schedulePush(id);
}

// ---------- levels ----------
export const xpForLevel = l => 100 + 40 * (l - 1);                       // XP needed to go from level l to l+1
export function levelOf(xp) { let l = 1, r = xp; while (r >= xpForLevel(l)) { r -= xpForLevel(l); l++; } return { level: l, into: r, need: xpForLevel(l) }; }
export function addXP(p, n) { const b = levelOf(p.xp).level; p.xp += n; const a = levelOf(p.xp).level; return { leveled: a > b, level: a }; }

// ---------- spaced repetition ----------
const BOX_DAYS = [0, .25, 1, 2, 4, 7];
export function srsUpdate(p, id, { ok1, revealed, ms, testISO }) {
  const it = p.items[id] || (p.items[id] = { n: 0, f: 0, box: 0, r: [], ms: 0, last: 0, due: 0 });
  const now = Date.now();
  it.n++; if (ok1) it.f++;
  if (ok1) it.box = Math.min(5, it.box + 1); else if (revealed) it.box = Math.max(0, it.box - 1);   // helped-but-solved: box stays
  it.r = [...(it.r || []), ok1 ? 1 : 0].slice(-5);
  it.ms = Math.round(((it.ms || 0) * (it.n - 1) + ms) / it.n); it.last = now;
  let due = now + BOX_DAYS[it.box] * DAY;
  if (testISO) { const [y, m, d] = testISO.split('-').map(Number); const t = new Date(y, m - 1, d, 7).getTime(); if (t > now) due = Math.min(due, Math.max(now + 3600e3, t - 10 * 3600e3)); }
  it.due = due; return it;
}
export const strength = (p, id) => { const it = p.items[id]; if (!it || !it.n) return null; return .6 * avg(it.r) + .4 * (it.box / 5); };
export const isDue = (p, id) => { const it = p.items[id]; return it && it.due <= Date.now(); };
export const boxOf = (p, id) => (p.items[id] ? p.items[id].box : -1);

// ---------- logging ----------
export function logAnswer(p, entry) {
  const now = Date.now();
  p.log.push({ t: now, ...entry });
  if (p.log.length > 2600) p.log = p.log.slice(-2200);
  const d = p.days[today()] || (p.days[today()] = { q: 0, ok: 0, ms: 0, xp: 0 });
  d.q++; if (entry.ok) d.ok++; d.ms += Math.min(entry.ms || 0, 90000);
}
export function logSession(p, s) { p.sessions.push({ t: Date.now(), ...s }); if (p.sessions.length > 400) p.sessions = p.sessions.slice(-300); }
export const minutesToday = p => Math.round(((p.days[today()] || {}).ms || 0) / 60000);

// ---------- family sync (opt-in) ----------
export const family = () => localStorage.getItem(FAM) || '';
export const setFamily = c => { if (c) localStorage.setItem(FAM, c.trim()); else localStorage.removeItem(FAM); };
export function newFamilyCode() { const a = new Uint8Array(18); crypto.getRandomValues(a); return [...a].map(b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('').replace(/(.{6})/g, '$1-').slice(0, -1); }
const syncState = { status: family() ? 'idle' : 'off', last: 0, err: '' };
export const syncInfo = () => syncState;
async function rpc(fn, body) {
  const r = await fetch(SB + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SBK }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.text()).slice(0, 200));
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
const trimForSync = p => ({ ...p, log: p.log.slice(-1200), sessions: p.sessions.slice(-200) });
const pushers = {};
function schedulePush(id) { if (!family()) return; (pushers[id] ||= debounce(() => pushNow(id), 3500))(); }
export async function pushNow(id) {
  if (!family()) return false;
  try { syncState.status = 'syncing'; await rpc('sg_push', { p_family: family(), p_profile: id, p_data: trimForSync(P(id)) }); syncState.status = 'ok'; syncState.last = Date.now(); syncState.err = ''; return true; }
  catch (e) { syncState.status = 'error'; syncState.err = e.message; return false; }
}
export async function pullAll() {
  if (!family()) return {};
  try { syncState.status = 'syncing'; const r = await rpc('sg_pull', { p_family: family() }); syncState.status = 'ok'; syncState.last = Date.now(); return r || {}; }
  catch (e) { syncState.status = 'error'; syncState.err = e.message; return {}; }
}
// Merge a remote copy of a profile into the local one (per-item newest wins; nothing is ever lost).
export function mergeInto(local, remote) {
  if (!remote) return local;
  for (const [id, it] of Object.entries(remote.items || {})) if (!local.items[id] || (it.last || 0) > (local.items[id].last || 0)) local.items[id] = it;
  for (const [id, n] of Object.entries(remote.nodes || {})) { const l = local.nodes[id]; if (!l || (n.stars || 0) > (l.stars || 0) || ((n.stars || 0) === (l.stars || 0) && (n.t || 0) > (l.t || 0))) local.nodes[id] = n; }
  local.xp = Math.max(local.xp, remote.xp || 0); local.stars = Math.max(local.stars, remote.stars || 0);
  const seen = new Set(local.log.map(l => l.t + l.id)); for (const l of remote.log || []) if (!seen.has(l.t + l.id)) local.log.push(l);
  local.log.sort((a, b) => a.t - b.t); if (local.log.length > 2600) local.log = local.log.slice(-2200);
  const ss = new Set(local.sessions.map(s => s.t)); for (const s of remote.sessions || []) if (!ss.has(s.t)) local.sessions.push(s);
  local.sessions.sort((a, b) => a.t - b.t);
  for (const [d, v] of Object.entries(remote.days || {})) { const l = local.days[d]; if (!l || v.q > l.q) local.days[d] = v; }
  for (const [k, v] of Object.entries(remote.checks || {})) if (v) local.checks[k] = true;
  local.avatar.owned = [...new Set([...local.avatar.owned, ...(remote.avatar?.owned || [])])];
  if ((remote.updatedAt || 0) > (local.updatedAt || 0)) { local.avatar.equipped = remote.avatar?.equipped || local.avatar.equipped; local.avatar.picks = remote.avatar?.picks || local.avatar.picks; }
  local.world.built = Math.max(local.world.built || 0, remote.world?.built || 0);
  return local;
}
export async function syncProfile(id) {            // pull -> merge -> push
  const all = await pullAll(); if (all[id]) { mergeInto(P(id), all[id].data); save(id); } return pushNow(id);
}
export function exportAll() { return JSON.stringify({ exported: new Date().toISOString(), app: 'study-quest-v2', profiles: Object.fromEntries(Object.keys(PROFILES).map(id => [id, P(id)])) }, null, 1); }
export function importAll(json) { const o = JSON.parse(json); for (const [id, d] of Object.entries(o.profiles || {})) if (PROFILES[id]) { cache[id] = Object.assign(blank(id), d); save(id); } }
export function resetProfile(id) { delete cache[id]; try { localStorage.removeItem(KEY(id)); localStorage.removeItem(KEY(id) + '.bak'); } catch (e) { } return P(id); }
