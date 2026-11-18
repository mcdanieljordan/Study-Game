// TEKS database integration (read-only). The standards (teks_items) and the TEKS-tagged, checked question bank (question_bank)
// live in the family's Supabase project and are public-read. Nothing about the children is sent — only code/grade filters.
// Results are cached in localStorage so a quiz that was fetched once also works offline.
import { shuffle, uniq, esc } from './util.js';

const BASE = 'https://aiczpuoskwzqtzvoomll.supabase.co/rest/v1/';
const KEY = 'sb_publishable_wMVaIIC55i2IhcR4DKXweg_RZtJdUTY';
const TTL = 12 * 3600e3;
export const GRADES = [['0', 'K'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8']];

async function get(path, { cache = true } = {}) {
  const ck = 'sq2:tk:' + path; let hit = null;
  try { hit = JSON.parse(localStorage.getItem(ck) || 'null'); } catch (e) { }
  if (cache && hit && Date.now() - hit.t < TTL) return hit.d;
  try {
    const r = await fetch(BASE + path, { headers: { apikey: KEY, Accept: 'application/json' } });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
    const d = await r.json(); try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), d })); } catch (e) { /* quota: fine */ }
    return d;
  } catch (e) { if (hit) return hit.d; throw e; }
}
const inList = a => `in.(${a.map(x => encodeURIComponent(x)).join(',')})`;
const OK = 'status=in.(checked,verified)';

export async function subjectsFor(grade) {
  const rows = await get(`question_bank?select=subject&grade_num=eq.${grade}&${OK}&limit=5000`);
  const n = {}; rows.forEach(r => n[r.subject] = (n[r.subject] || 0) + 1);
  return Object.entries(n).map(([subject, count]) => ({ subject, count })).sort((a, b) => b.count - a.count);
}
// Standards that have questions, grouped by their Knowledge-and-Skills strand: [{ ks, title, standards:[{code, text, n}] }]
export async function standardsFor(grade, subject) {
  const rows = await get(`question_bank?select=teks_code&grade_num=eq.${grade}&subject=eq.${encodeURIComponent(subject)}&${OK}&limit=5000`);
  const n = {}; rows.forEach(r => n[r.teks_code] = (n[r.teks_code] || 0) + 1);
  const codes = Object.keys(n).sort(); if (!codes.length) return [];
  const items = []; for (let i = 0; i < codes.length; i += 60) items.push(...await get(`teks_items?select=code,statement_text,parent_id,grade_course_title&code=${inList(codes.slice(i, i + 60))}`));
  const es = x => /[áéíóúñ¿]|matem|artes|grado|ciencias|estudios|educaci/i.test((x.grade_course_title || '') + ' ' + (x.statement_text || '').slice(0, 60));
  const english = items.filter(x => !es(x)), byCode = Object.fromEntries((english.length ? english : items).map(x => [x.code, x])), pids = uniq(Object.values(byCode).map(x => x.parent_id).filter(Boolean));
  const parents = pids.length ? await get(`teks_items?select=id,code,statement_text&id=${inList(pids)}`) : [], pById = Object.fromEntries(parents.map(x => [x.id, x]));
  const groups = {};
  for (const c of codes) {
    const it = byCode[c], par = it && pById[it.parent_id], gk = par ? par.code : c.split('.').slice(0, -1).join('.');
    (groups[gk] ||= { ks: gk, title: par ? clean(par.statement_text) : gk, standards: [] }).standards.push({ code: c, text: it ? clean(it.statement_text) : '', n: n[c] });
  }
  return Object.values(groups).sort((a, b) => a.ks.localeCompare(b.ks, undefined, { numeric: true }));
}
const clean = t => String(t || '').replace(/\s+/g, ' ').trim();
export const shortCode = c => c.replace(/^\d+\./, '').replace(/\.b\./, '.').replace(/\.$/, '');   // 111.4.b.2.A → 4.2.A

// Build a mini-quiz: n questions spread evenly across the chosen standards, as normal engine questions.
export async function buildQuiz(grade, codes, n = 10) {
  if (!codes.length) return [];
  const rows = []; for (let i = 0; i < codes.length; i += 25) rows.push(...await get(`question_bank?select=id,teks_code,prompt,choices,answer_idx,explanation,difficulty&teks_code=${inList(codes.slice(i, i + 25))}&grade_num=eq.${grade}&${OK}&limit=1000`));
  const by = {}; shuffle(rows).forEach(r => (by[r.teks_code] ||= []).push(r));
  const pool = Object.values(by), picked = []; let i = 0;
  while (picked.length < n && pool.some(a => a.length)) { const a = pool[i++ % pool.length]; if (a.length) picked.push(a.shift()); }
  return picked.map(toQuestion).filter(Boolean);
}
function toQuestion(r) {
  const ch = (Array.isArray(r.choices) ? r.choices : []).map(String);
  if (ch.length < 2 || new Set(ch).size !== ch.length || r.answer_idx == null || !ch[r.answer_idx]) return null;
  return { id: 'teks/' + r.id, fmt: 'mc', html: esc(r.prompt), opts: ch, answer: ch[r.answer_idx], why: r.explanation || '', teks: r.teks_code, skill: 'TEKS ' + shortCode(r.teks_code), tall: ch.some(c => c.length > 26), hint: 'Read it again slowly. Which choice makes the most sense?' };
}
// Statement text for codes we've already looked up (for the TEKS results table); falls back to the bare code.
export function cachedStatement(code) {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('sq2:tk:teks_items')) { const d = JSON.parse(localStorage.getItem(k)).d; const f = d.find(x => x.code === code); if (f) return clean(f.statement_text); } } catch (e) { }
  return '';
}
// Saved sets (named groups of standards) live on this device, with the grown-up's other settings.
export const loadSets = () => { try { return JSON.parse(localStorage.getItem('sq2:teksSets') || '[]'); } catch (e) { return []; } };
export const saveSets = s => { try { localStorage.setItem('sq2:teksSets', JSON.stringify(s)); } catch (e) { } };
