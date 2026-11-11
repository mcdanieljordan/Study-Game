// Avatar items & world builds. Design rules from the avatar research:
//  • "Pick 1 of 3" reward choices (no overwhelming shop, no currency, nothing to buy)
//  • rewards come from successful retrieval/learning only
//  • competence-priming items (scholar glasses, scientist goggles, architect hard hat) — the Proteus effect
import { sample, shuffle } from './util.js';

const I = (id, slot, name, o = {}) => ({ id, slot, name, ...o });
export const CATALOG = {
  ensley: {
    slots: [{ id: 'mane', name: 'Mane', icon: '💇' }, { id: 'horn', name: 'Horn', icon: '🦄' }, { id: 'hat', name: 'Hat', icon: '👑' }, { id: 'body', name: 'Coat', icon: '🎨' }, { id: 'aura', name: 'Magic', icon: '✨' }],
    items: [
      I('mane-pink', 'mane', 'Bubblegum', { c: '#ff7eb6', free: 1 }), I('mane-blue', 'mane', 'Ocean', { c: '#5cc8ff' }), I('mane-purple', 'mane', 'Grape', { c: '#a97bff' }), I('mane-gold', 'mane', 'Sunshine', { c: '#ffc94a' }), I('mane-rainbow', 'mane', 'Rainbow', { c: 'rainbow', rare: 1 }),
      I('horn-gold', 'horn', 'Golden', { c: '#ffd54a', free: 1 }), I('horn-silver', 'horn', 'Silver', { c: '#d7dde8' }), I('horn-crystal', 'horn', 'Crystal', { c: '#7fe9ff' }), I('horn-rainbow', 'horn', 'Rainbow', { c: 'rainbow', rare: 1 }),
      I('hat-none', 'hat', 'No hat', { free: 1 }), I('hat-bow', 'hat', 'Big bow', { icon: '🎀' }), I('hat-flowers', 'hat', 'Flower crown', { icon: '🌸' }), I('hat-party', 'hat', 'Party hat', { icon: '🎉' }), I('hat-scholar', 'hat', 'Scholar glasses', { icon: '🤓', skill: 1 }), I('hat-wizard', 'hat', 'Wizard hat', { icon: '🧙' }), I('hat-crown', 'hat', 'Royal crown', { icon: '👑', rare: 1 }), I('hat-halo', 'hat', 'Star halo', { icon: '😇', rare: 1 }),
      I('body-white', 'body', 'Cloud white', { c: '#ffffff', free: 1 }), I('body-lavender', 'body', 'Lavender', { c: '#eadcff' }), I('body-mint', 'body', 'Mint', { c: '#d4f7e8' }), I('body-peach', 'body', 'Peach', { c: '#ffe0d2' }), I('body-sky', 'body', 'Sky', { c: '#d4eeff' }),
      I('aura-none', 'aura', 'No magic', { free: 1 }), I('aura-sparkles', 'aura', 'Sparkles', { icon: '✨' }), I('aura-hearts', 'aura', 'Hearts', { icon: '💖' }), I('aura-stars', 'aura', 'Stars', { icon: '⭐' }), I('aura-rainbow', 'aura', 'Rainbow ring', { icon: '🌈', rare: 1 })
    ]
  },
  sida: {
    slots: [{ id: 'skin', name: 'Skin', icon: '🧑' }, { id: 'hair', name: 'Hair', icon: '💇' }, { id: 'top', name: 'Top', icon: '👕' }, { id: 'bottom', name: 'Pants', icon: '👖' }, { id: 'head', name: 'Head', icon: '🎧' }, { id: 'back', name: 'Back', icon: '🧣' }, { id: 'aura', name: 'Aura', icon: '✨' }],
    items: [
      ...['#f6d3b3', '#e8b98e', '#c68b5e', '#9a6340', '#6e4329', '#4a2c1d'].map((c, i) => I('skin-' + i, 'skin', 'Tone ' + (i + 1), { c, free: 1 })),
      I('hair-short', 'hair', 'Short', { v: 'short', free: 1 }), I('hair-spiky', 'hair', 'Spiky', { v: 'spiky' }), I('hair-long', 'hair', 'Long', { v: 'long' }), I('hair-bun', 'hair', 'Top bun', { v: 'bun' }), I('hair-mohawk', 'hair', 'Mohawk', { v: 'mohawk', rare: 1 }), I('hair-none', 'hair', 'Bald', { v: 'none', free: 1 }),
      I('top-green', 'top', 'Emerald', { c: '#2fbf5b', free: 1 }), I('top-blue', 'top', 'Cobalt', { c: '#2f7be0' }), I('top-red', 'top', 'Redstone', { c: '#d94040' }), I('top-purple', 'top', 'Amethyst', { c: '#8a4fd6' }), I('top-black', 'top', 'Obsidian', { c: '#262633' }), I('top-orange', 'top', 'Copper', { c: '#e8822b' }), I('top-gold', 'top', 'Champion gold', { c: '#e8c13a', rare: 1 }),
      I('bot-navy', 'bottom', 'Navy', { c: '#2a3f7a', free: 1 }), I('bot-grey', 'bottom', 'Stone', { c: '#6b7280' }), I('bot-brown', 'bottom', 'Oak', { c: '#7a5130' }), I('bot-teal', 'bottom', 'Teal', { c: '#1f8f8a' }), I('bot-black', 'bottom', 'Shadow', { c: '#1b1b24' }),
      I('head-none', 'head', 'Nothing', { free: 1 }), I('head-phones', 'head', 'Headphones', { v: 'phones' }), I('head-cap', 'head', 'Cap', { v: 'cap' }), I('head-hardhat', 'head', 'Architect hard hat', { v: 'hardhat', skill: 1 }), I('head-goggles', 'head', 'Scientist goggles', { v: 'goggles', skill: 1 }), I('head-visor', 'head', 'Visor', { v: 'visor' }), I('head-crown', 'head', 'Crown', { v: 'crown', rare: 1 }), I('head-halo', 'head', 'Halo', { v: 'halo', rare: 1 }),
      I('back-none', 'back', 'Nothing', { free: 1 }), I('back-cape-red', 'back', 'Red cape', { v: 'cape', c: '#c0392b' }), I('back-cape-blue', 'back', 'Blue cape', { v: 'cape', c: '#2563eb' }), I('back-pack', 'back', 'Backpack', { v: 'pack', c: '#8a5a2b' }), I('back-wings', 'back', 'Wings', { v: 'wings', c: '#e9f1ff', rare: 1 }),
      I('aura-none', 'aura', 'None', { free: 1 }), I('aura-spark', 'aura', 'Sparkle', { v: 'spark', c: '#ffd54a' }), I('aura-ember', 'aura', 'Ember', { v: 'ember', c: '#ff7a2f' }), I('aura-ice', 'aura', 'Frost', { v: 'ice', c: '#7fe0ff', rare: 1 })
    ]
  }
};
export const itemById = (profile, id) => CATALOG[profile].items.find(i => i.id === id);
export const DEFAULT_LOOK = { ensley: { mane: 'mane-pink', horn: 'horn-gold', hat: 'hat-none', body: 'body-white', aura: 'aura-none' }, sida: { skin: 'skin-1', hair: 'hair-short', top: 'top-green', bottom: 'bot-navy', head: 'head-none', back: 'back-none', aura: 'aura-none' } };

export function ensureAvatar(p) {
  const prof = p.id, cat = CATALOG[prof];
  for (const i of cat.items) if (i.free && !p.avatar.owned.includes(i.id)) p.avatar.owned.push(i.id);
  p.avatar.equipped = { ...DEFAULT_LOOK[prof], ...p.avatar.equipped };
  return p.avatar;
}
export function lockedItems(p) { return CATALOG[p.id].items.filter(i => !p.avatar.owned.includes(i.id)); }
export function offerThree(p) {                       // Pick 1 of 3: varied slots, never the same slot twice when avoidable
  const locked = shuffle(lockedItems(p)), out = [], used = new Set();
  for (const it of locked) { if (out.length >= 3) break; if (!used.has(it.slot)) { out.push(it.id); used.add(it.slot); } }
  for (const it of locked) { if (out.length >= 3) break; if (!out.includes(it.id)) out.push(it.id); }
  return out;
}
export function grantRewards(p, { stars, firstTime, leveled }) {
  ensureAvatar(p); let n = 0;
  if (firstTime && stars >= 2) n++;
  if (leveled) n++;
  const room = Math.max(0, 3 - p.avatar.picks.length); n = Math.min(n, room);
  for (let k = 0; k < n; k++) { const o = offerThree(p); if (o.length) p.avatar.picks.push(o); }
  return n;
}

// ---------- world builds (answers are the building blocks) ----------
export const WORLD = {
  ensley: [
    { id: 'flowers', title: 'Little flowers', emoji: '🌸', x: 12, y: 74, s: 2.2 }, { id: 'tree', title: 'A friendly tree', emoji: '🌳', x: 82, y: 56, s: 3.6 }, { id: 'butterfly', title: 'Butterflies', emoji: '🦋', x: 30, y: 46, s: 2, fly: 1 },
    { id: 'rainbow', title: 'A rainbow!', emoji: '🌈', x: 50, y: 26, s: 5.4 }, { id: 'cloud', title: 'Puffy cloud', emoji: '☁️', x: 16, y: 18, s: 3.4, drift: 1 }, { id: 'mush', title: 'Magic mushroom', emoji: '🍄', x: 66, y: 76, s: 2.6 },
    { id: 'bee', title: 'Buzzy bee', emoji: '🐝', x: 58, y: 46, s: 1.8, fly: 1 }, { id: 'fountain', title: 'Sparkle fountain', emoji: '⛲', x: 42, y: 70, s: 3.2 }, { id: 'sunflowers', title: 'Sunflower patch', emoji: '🌻', x: 88, y: 78, s: 2.6 },
    { id: 'castle', title: 'A tiny castle', emoji: '🏰', x: 30, y: 58, s: 4 }, { id: 'baby', title: 'Baby unicorn friend', emoji: '🦄', x: 54, y: 66, s: 3, bob: 1 }, { id: 'star', title: 'A wishing star', emoji: '🌟', x: 78, y: 14, s: 2.6, twinkle: 1 }
  ],
  sida: [
    { id: 'oak', title: 'Oak tree' }, { id: 'house', title: 'Cozy house' }, { id: 'farm', title: 'Crop farm' }, { id: 'pond', title: 'Pond & bridge' }, { id: 'tower', title: 'Watchtower' }, { id: 'camp', title: 'Campfire' },
    { id: 'mill', title: 'Windmill' }, { id: 'light', title: 'Lighthouse' }, { id: 'gate', title: 'Castle gate' }, { id: 'lib', title: 'Library' }, { id: 'portal', title: 'Portal' }, { id: 'beacon', title: 'Beacon of mastery' }
  ]
};
