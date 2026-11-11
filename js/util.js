// Small helpers shared by every module. No dependencies.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const rnd = a => a[Math.random() * a.length | 0];
export const rint = (a, b) => a + (Math.random() * (b - a + 1) | 0);
export const sample = (a, n) => shuffle(a).slice(0, n);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const today = () => new Date().toLocaleDateString('en-CA');
export const DAY = 864e5;
export const uniq = a => [...new Set(a)];
export const sum = a => a.reduce((x, y) => x + y, 0);
export const avg = a => a.length ? sum(a) / a.length : 0;
export const pct = v => Math.round(v * 100);
export const fmtDate = d => new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
export const daysUntil = iso => { // calendar days from today to an ISO date (yyyy-mm-dd); negative if past
  const [y, m, d] = iso.split('-').map(Number), n = new Date(), a = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.round((new Date(y, m - 1, d) - a) / DAY);
};
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export const reduceFrac = (n, d) => { const g = gcd(n, d); if (d < 0) { n = -n; d = -d; } return [n / g, d / g]; };
export const fracStr = (n, d) => { [n, d] = reduceFrac(n, d); return d === 1 ? String(n) : `${n}/${d}`; };
export const nice = n => { n = Math.round(n * 1e6) / 1e6; return String(n); };
export const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
export function debounce(f, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; }
// Normalise typed text for comparison: lowercase, trim, collapse spaces, drop trailing punctuation.
export const normText = s => String(s ?? '').toLowerCase().trim().replace(/[.!?,;:]+$/g, '').replace(/\s+/g, ' ');
