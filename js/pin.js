// The grown-up PIN pad. First use asks the grown-up to create a PIN; after that it guards the Grown-ups area and every override.
import { openOv, closeOv, wiggle } from './fx.js';
import { sfx } from './audio.js';
import { hasPin, setPin, verifyPin } from './store.js';
import { $, esc } from './util.js';

let failed = 0, lockedUntil = 0, okUntil = 0;
export const parentSession = () => Date.now() < okUntil;
export const endParentSession = () => { okUntil = 0; };

export function requireParent(reason = 'Grown-up PIN', { create = false } = {}) {
  if (!create && parentSession()) return Promise.resolve(true);
  return new Promise(res => {
    const creating = create || !hasPin(); let buf = '', first = null;
    const msg = () => creating ? (first === null ? 'Create a 4–6 digit PIN' : 'Type it again to confirm') : 'Enter your PIN';
    const draw = (note = '') => {
      openOv(`<div class="sheet pinpad"><div class="big">🔒</div><h2>${esc(reason)}</h2><p class="lead">${esc(note || msg())}</p>
        <div class="dots">${Array.from({ length: 6 }, (_, i) => `<i class="${i < buf.length ? 'f' : ''}"></i>`).join('')}</div>
        <div class="kbd num">${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0', 'go'].map(k => `<button class="key ${k === 'go' ? 'go' : k === 'x' ? 'del' : ''}" data-k="${k}">${k === 'go' ? '✓' : k === 'x' ? '⌫' : k}</button>`).join('')}</div>
        <button class="btn soft sm" data-cancel="1">Cancel</button></div>`, 'pinov');
    };
    const done = ok => { closeOv(); res(ok); };
    draw();
    $('#ov').onclick = async ev => {
      if (ev.target.closest('[data-cancel]')) return done(false);
      const b = ev.target.closest('.key'); if (!b) return; const k = b.dataset.k; sfx.tap();
      if (k === 'x') buf = buf.slice(0, -1); else if (k === 'go') {
        if (buf.length < 4) return draw('At least 4 digits');
        if (creating) {
          if (first === null) { first = buf; buf = ''; return draw(); }
          if (first !== buf) { first = null; buf = ''; sfx.wrong(); return draw('Those did not match — start again'); }
          await setPin(buf); okUntil = Date.now() + 10 * 60e3; sfx.unlock(); return done(true);
        }
        if (Date.now() < lockedUntil) { buf = ''; return draw(`Too many tries — wait ${Math.ceil((lockedUntil - Date.now()) / 1000)}s`); }
        if (await verifyPin(buf)) { failed = 0; okUntil = Date.now() + 10 * 60e3; sfx.unlock(); return done(true); }
        failed++; buf = ''; sfx.wrong(); if (failed >= 5) { lockedUntil = Date.now() + 30e3; failed = 0; return draw('Too many tries — wait 30s'); } return draw('Not quite — try again');
      } else if (buf.length < 6) buf += k;
      draw();
    };
  });
}
