// Boot: load content packs, wire everything together, route clicks.
import { S, go, ACT, avatarHTML, worldReveal, openPick, startNode } from './screens.js';
import { ENV, setEnv, runAct, _run } from './engine.js';
import { gameAct } from './games.js';
import { offerBreak, breather } from './breaks.js';
import { loadPacks } from './content.js';
import { P, PROFILES, setFamily, family, pullAll, mergeInto, save } from './store.js';
import { grantRewards } from './catalog.js';
import { unlock } from './audio.js';
import { $ } from './util.js';

setEnv({
  packs: id => S.packs[id] || [], avatarHTML, offerBreak, breather, worldReveal, openPick, startNode, go,
  grantRewards: (pid, info) => grantRewards(P(pid), info)
});
const ALL = { ...ACT, ...runAct, ...gameAct };

function onAct(ev) {
  unlock(); const el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
  const isInput = el.tagName === 'INPUT'; if (isInput && ev.type === 'click' && el.type !== 'checkbox') return; if (isInput && el.type === 'checkbox' && ev.type === 'click') return;
  const f = ALL[el.dataset.act]; if (f) f(el, ev);
}
document.addEventListener('click', onAct);
document.addEventListener('change', e => { if (e.target.matches('input[data-act]')) onAct(e); });
document.addEventListener('touchend', unlock, { passive: true });
document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });
// Pressing Enter in the grown-up gate / family code boxes
document.addEventListener('keydown', e => { if (e.key === 'Enter') { if (e.target.id === 'gin') ACT.gate(); if (e.target.id === 'famin') ACT.usefam(); } });

async function boot() {
  const m = location.hash.match(/family=([a-z0-9-]{20,})/i);
  if (m) { setFamily(m[1].toLowerCase()); history.replaceState(null, '', location.pathname + location.search); }
  const [e, s] = await Promise.all([loadPacks('ensley'), loadPacks('sida')]); S.packs.ensley = e; S.packs.sida = s;
  $('#boot')?.remove(); go('launcher');
  if (family()) { const all = await pullAll(); Object.keys(PROFILES).forEach(id => { if (all[id]) { mergeInto(P(id), all[id].data); save(id); } }); if (S.view === 'launcher') go('launcher'); }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
}
boot().catch(err => { document.body.insertAdjacentHTML('beforeend', `<pre style="padding:1rem;color:#c00">Could not start: ${String(err)}</pre>`); console.error(err); });
window.__sq = { S, P, _run };   // handy for debugging in the console
