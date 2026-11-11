// "Brain coach": turns tracked data into plain-language recommendations (kid-friendly and grown-up versions).
import { daysUntil, pct, today, DAY } from './util.js';
import { P, strength, minutesToday } from './store.js';
import { readiness, skillStats, dueItems } from './content.js';

export const dueISO = (p, pack) => p.settings?.due?.[pack.id] ?? pack.due ?? null;
export const dueLabel = (iso) => { if (!iso) return null; const d = daysUntil(iso); return d < 0 ? 'past' : d === 0 ? 'TODAY' : d === 1 ? 'tomorrow' : `in ${d} days`; };

export function weekAcc(p, days = 7, offset = 0) {
  const end = Date.now() - offset * DAY, start = end - days * DAY, l = p.log.filter(x => x.t > start && x.t <= end && !x.pre);
  return l.length ? l.filter(x => x.ok).length / l.length : null;
}
export function nextNodeFor(p, pack) {
  if (p.settings.unlockAll) return pack.nodes.find(n => !(p.nodes[n.id]?.done)) || null;
  return pack.nodes.find(n => !(p.nodes[n.id]?.done)) || null;
}
export const isUnlocked = (p, pack, node) => node.idx === 0 || p.settings.unlockAll || !!p.nodes[pack.nodes[node.idx - 1].id]?.done || !!p.nodes[node.id]?.done;

// Returns [{icon, title, text, act, args, level}]  level: 'urgent' | 'info' | 'good'
export function recommend(profile, packs, audience = 'kid') {
  const p = P(profile), out = [], kid = audience === 'kid', e = profile === 'ensley';
  const due = dueItems(p, packs, 50), mins = minutesToday(p);
  for (const pk of packs) {
    const iso = dueISO(p, pk); if (!iso) continue; const d = daysUntil(iso); if (d < 0 || d > 9) continue;
    const r = readiness(p, pk), n = nextNodeFor(p, pk);
    out.push({ icon: d <= 1 ? '🚨' : '📅', level: r < .6 ? 'urgent' : 'info', title: `${pk.test || pk.title} ${dueLabel(iso)}`, text: kid ? (r >= .8 ? `You're ${pct(r)}% ready — amazing! Keep it fresh with a quick review.` : `You're ${pct(r)}% ready. A little practice every day gets you there!`) : `Readiness ${pct(r)}%. ${r < .6 ? 'Needs more practice — aim for 2 short sessions a day.' : r < .8 ? 'On track — keep daily review going.' : 'Strong. A short review the night before is plenty.'}`, act: n ? 'startnode' : 'path', args: n ? { pack: pk.id, node: n.id } : { pack: pk.id } });
  }
  if (due.length >= 3) out.push({ icon: '🧠', level: 'info', title: `${due.length} things are ready to review`, text: kid ? 'Your brain is about to forget these — a quick review locks them in!' : 'These items have reached their spaced-repetition review time. A 5-minute review now saves hours later.', act: 'review', args: {} });
  const sk = skillStats(p, packs).filter(s => s.avg < .65).slice(0, 3);
  sk.forEach(s => out.push({ icon: '💜', level: 'info', title: kid ? `Practice: ${s.skill}` : `Needs practice: ${s.skill} (${s.pack.title})`, text: kid ? 'This one is growing — a few tries will make it stronger.' : `Average strength ${pct(s.avg)}% across ${s.n} items.`, act: 'skill', args: { pack: s.pack.id, skill: s.skill } }));
  const hi = skillStats(p, packs).filter(s => s.avg >= .8 && s.n >= 2).slice(-2);
  if (hi.length && kid) out.push({ icon: '🏆', level: 'good', title: `You're strong at ${hi[hi.length - 1].skill}!`, text: 'Nice work — that\'s a real strength.', act: null });
  const a1 = weekAcc(p, 3), a0 = weekAcc(p, 3, 3);
  if (a1 != null && a0 != null && a1 - a0 > .08) out.push({ icon: '📈', level: 'good', title: kid ? 'You are getting better!' : 'Accuracy trending up', text: kid ? `Your first-try answers went from ${pct(a0)}% to ${pct(a1)}%!` : `First-try accuracy ${pct(a0)}% → ${pct(a1)}% over the last 3 days.`, act: null });
  if (mins >= 30) out.push({ icon: '🌙', level: 'good', title: kid ? 'Great focus today!' : `${mins} minutes today`, text: kid ? 'Your brain worked hard. A break or a snack is a great idea.' : 'That is plenty for one day — rest helps memory consolidate.', act: null });
  else if (mins === 0 && kid) out.push({ icon: '✨', level: 'info', title: e ? 'Quick 5-minute quest?' : 'Quick 5-minute session?', text: 'Even a few questions help your memory stick.', act: 'review', args: {} });
  if (p.avatar.picks.length) out.push({ icon: '🎁', level: 'good', title: 'You have a reward to pick!', text: 'Pick 1 of 3.', act: 'reward', args: {} });
  return out.slice(0, kid ? 4 : 8);
}
export function todaysQuest(profile, packs) {
  const p = P(profile), due = dueItems(p, packs, 50);
  const urgent = packs.map(pk => ({ pk, iso: dueISO(p, pk) })).filter(x => x.iso && daysUntil(x.iso) >= 0 && daysUntil(x.iso) <= 4).sort((a, b) => daysUntil(a.iso) - daysUntil(b.iso))[0];
  if (due.length >= 4) return { icon: '🧠', title: 'Smart review', sub: `${Math.min(due.length, 10)} ready to lock in`, act: 'review', args: {} };
  const pk = urgent?.pk || packs.find(pk => nextNodeFor(p, pk)) || packs[0], n = pk && nextNodeFor(p, pk);
  if (pk && n) return { icon: n.icon, title: n.title, sub: pk.title, act: 'startnode', args: { pack: pk.id, node: n.id } };
  return pk ? { icon: '🎯', title: 'Practice anything', sub: 'Everything is cleared — keep it fresh!', act: 'review', args: {} } : null;
}
