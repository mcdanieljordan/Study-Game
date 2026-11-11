// Ensley's unicorn (layered SVG) and her growing Unicorn Meadow.
import { itemById, WORLD } from './catalog.js';
let uid = 0;
export function unicornSVG(look, mood = 'idle', size = 100) {
  const g = (slot, dflt) => itemById('ensley', look[slot]) || itemById('ensley', dflt), id = 'u' + (uid++);
  const mane = g('mane', 'mane-pink'), horn = g('horn', 'horn-gold'), hat = (look.hat || 'hat-none').replace('hat-', ''), body = g('body', 'body-white'), aura = (look.aura || 'aura-none').replace('aura-', '');
  const mc = mane.c === 'rainbow' ? `url(#${id}m)` : mane.c, hc = horn.c === 'rainbow' ? `url(#${id}h)` : horn.c, bc = body.c;
  const happy = mood === 'happy', hug = mood === 'hug';
  const eye = happy ? `<path d="M113 90q9-12 18 0" fill="none" stroke="#3b1f5e" stroke-width="4" stroke-linecap="round"/>` : hug ? `<path d="M113 88q9 8 18 0" fill="none" stroke="#3b1f5e" stroke-width="4" stroke-linecap="round"/>` : `<ellipse cx="122" cy="88" rx="9" ry="11" fill="#3b1f5e"/><circle cx="125" cy="84" r="3.6" fill="#fff"/><circle cx="119" cy="93" r="1.8" fill="#fff"/><path d="M112 79l-5-4M117 76l-3-5" stroke="#3b1f5e" stroke-width="2.4" stroke-linecap="round"/>`;
  const mouth = happy ? `<path d="M146 122q9 12 19-2z" fill="#ff7a8a" stroke="#3b1f5e" stroke-width="2.4" stroke-linejoin="round"/>` : `<path d="M147 122q8 6 17-2" fill="none" stroke="#3b1f5e" stroke-width="3" stroke-linecap="round"/>`;
  const A = {
    bow: `<g><polygon points="62,60 40,48 42,72" fill="#ff5fa8"/><polygon points="62,60 84,48 82,72" fill="#ff5fa8"/><circle cx="62" cy="60" r="7" fill="#d93a86"/></g>`,
    flowers: `<g>${[[74, 54, '#ff7eb6'], [92, 44, '#ffc94a'], [112, 40, '#8f5cf2'], [132, 46, '#2fc99e'], [148, 56, '#ff7a5c']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="8" fill="${c}"/><circle cx="${x}" cy="${y}" r="3.2" fill="#fff6b0"/>`).join('')}</g>`,
    party: `<g><polygon points="84,52 98,6 118,52" fill="#ffb21f"/><path d="M89 40l24 0M92 28l16 0" stroke="#ff5fa8" stroke-width="4"/><circle cx="98" cy="6" r="5" fill="#ff5fa8"/></g>`,
    wizard: `<g><polygon points="76,56 100,-6 130,56" fill="#6a3fc4"/><ellipse cx="103" cy="56" rx="38" ry="8" fill="#523099"/><text x="96" y="38" font-size="16">⭐</text></g>`,
    crown: `<polygon points="78,56 82,30 96,44 110,24 124,44 138,30 142,56" fill="#ffc94a" stroke="#e08c00" stroke-width="2.5" stroke-linejoin="round"/>`,
    halo: `<ellipse cx="112" cy="24" rx="34" ry="9" fill="none" stroke="#ffd54a" stroke-width="6"/>`,
    scholar: `<g fill="none" stroke="#3b1f5e" stroke-width="4"><circle cx="122" cy="89" r="17" fill="rgba(180,225,255,.35)"/><path d="M105 86L86 80"/></g>`
  };
  const au = { sparkles: '✨', hearts: '💖', stars: '⭐', rainbow: '🌈' }[aura];
  return `<svg class="uni" viewBox="-6 -10 212 216" width="${size}" height="${size}" role="img" aria-label="Your unicorn">
  <defs><linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b9a"/><stop offset=".25" stop-color="#ffc94a"/><stop offset=".5" stop-color="#6fe3b8"/><stop offset=".75" stop-color="#63c5ff"/><stop offset="1" stop-color="#a97bff"/></linearGradient><linearGradient id="${id}h" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff6b9a"/><stop offset=".5" stop-color="#ffe066"/><stop offset="1" stop-color="#63c5ff"/></linearGradient></defs>
  ${au ? [[10, 20], [170, 30], [20, 150], [176, 140], [96, -4]].map(([x, y], i) => `<text x="${x}" y="${y}" font-size="${i % 2 ? 22 : 17}" class="tw tw${i % 3}">${au}</text>`).join('') : ''}
  <path d="M58 70Q14 104 34 178Q70 156 76 110Z" fill="${mc}"/>
  <path d="M66 200L80 120Q112 152 152 120L162 200Z" fill="${bc}" stroke="#d8c9ef" stroke-width="2"/>
  <ellipse cx="110" cy="95" rx="48" ry="42" fill="${bc}" stroke="#d8c9ef" stroke-width="2"/>
  <path d="M88 60L82 30L108 52Z" fill="${bc}" stroke="#d8c9ef" stroke-width="2" stroke-linejoin="round"/><path d="M89 54L86 40L99 52Z" fill="#ffb3d1"/>
  <path d="M114 54L128 4L140 58Z" fill="${hc}" stroke="#e0b200" stroke-width="2" stroke-linejoin="round"/><path d="M118 42l16 4M121 30l12 3M124 18l8 2" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>
  <ellipse cx="146" cy="112" rx="25" ry="20" fill="${bc}" stroke="#d8c9ef" stroke-width="2"/><circle cx="157" cy="106" r="2.6" fill="#b79ad6"/>
  ${eye}<circle cx="133" cy="106" r="${hug ? 9 : 7}" fill="#ff9ec4" opacity=".55"/>${mouth}
  <path d="M68 58Q56 28 90 22Q78 42 100 54Q82 56 68 58Z" fill="${mc}"/>
  ${A[hat] || ''}
  </svg>`;
}

// The meadow grows one wonderful thing for every 8 answers you build with.
export function meadowHTML(built = 0, highlight = -1) {
  const items = WORLD.ensley, glow = i => i === highlight ? ' new' : '';
  return `<div class="meadow"><div class="sun">☀️</div><div class="hill h1"></div><div class="hill h2"></div><div class="grass"></div>
  ${items.map((it, i) => i < built ? `<span class="mi${glow(i)} ${it.fly ? 'fly' : ''} ${it.drift ? 'drift' : ''} ${it.bob ? 'bobm' : ''} ${it.twinkle ? 'twk' : ''}" title="${it.title}" style="left:${it.x}%;top:${it.y}%;font-size:${it.s}rem">${it.emoji}</span>` : '').join('')}
  ${built === 0 ? '<div class="empty">Answer questions to grow your meadow! 🌱</div>' : ''}</div>`;
}
