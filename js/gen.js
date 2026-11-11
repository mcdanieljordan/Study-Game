// Procedural question generators (infinite practice) + the little SVG figure helpers they use.
// Every generator returns a question object the engine can render:
//   { html, fmt:'num'|'mc'|'keys', answer, opts?, why, hint, tol?, check?, visual? }
import { rint as R, rnd, shuffle, uniq, sample, gcd, fracStr, nice, sum, avg } from './util.js';

const sg = n => n < 0 ? `(${n})` : `${n}`;
const mcQ = (html, correct, wrongs, x = {}) => {
  const w = uniq(wrongs.map(String)).filter(v => v !== String(correct)).slice(0, 3);
  let n = 1; while (w.length < 3) { const f = String(typeof correct === 'number' ? correct + n * (n % 2 ? 1 : -1) : correct + ' ' + n); if (f !== String(correct) && !w.includes(f)) w.push(f); n++; }
  return { fmt: 'mc', html, answer: String(correct), opts: [String(correct), ...w], ...x };
};
const numQ = (html, answer, x = {}) => ({ fmt: 'num', html, answer, ...x });
const near = (n, k = 3) => uniq([n + 1, n - 1, n + 2, n - 2, -n, n * 2, n + 10, n - 10].filter(v => v !== n)).slice(0, k);

// ---------------- SVG helpers ----------------
export function tallySVG(n, w = 14) {
  const groups = Math.floor(n / 5), rem = n % 5, gw = 44, total = groups + (rem ? 1 : 0);
  let s = `<svg class="tally" viewBox="0 0 ${Math.max(1, total) * gw} 34" width="${Math.max(1, total) * 34}" height="30" aria-label="${n} tally marks"><g stroke="currentColor" stroke-width="3.2" stroke-linecap="round">`;
  for (let g = 0; g < total; g++) { const k = g < groups ? 5 : rem, x0 = g * gw + 4; for (let i = 0; i < Math.min(k, 4); i++) s += `<line x1="${x0 + i * 8}" y1="4" x2="${x0 + i * 8}" y2="30"/>`; if (k === 5) s += `<line x1="${x0 - 2}" y1="26" x2="${x0 + 30}" y2="8"/>`; }
  return s + '</g></svg>';
}
const T = (x, y, t, o = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" ${o}>${t}</text>`;
export function shapeSVG(k, d) {
  const st = 'fill="rgba(93,255,122,.16)" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"', dash = 'stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3"';
  let b = '';
  if (k === 'rect') b = `<rect x="40" y="25" width="140" height="80" ${st}/>${T(110, 122, d.w)}${T(24, 70, d.h)}`;
  if (k === 'tri') b = `<polygon points="30,110 190,110 120,22" ${st}/><line x1="120" y1="22" x2="120" y2="110" ${dash}/>${T(110, 128, 'base ' + d.b)}${T(150, 66, 'h = ' + d.h)}`;
  if (k === 'para') b = `<polygon points="30,110 150,110 195,25 75,25" ${st}/><line x1="75" y1="25" x2="75" y2="110" ${dash}/>${T(90, 128, 'base ' + d.b)}${T(55, 72, 'h = ' + d.h)}`;
  if (k === 'trap') b = `<polygon points="30,110 190,110 150,25 70,25" ${st}/><line x1="150" y1="25" x2="150" y2="110" ${dash}/>${T(110, 128, 'b₂ = ' + d.b2)}${T(110, 17, 'b₁ = ' + d.b1)}${T(170, 72, 'h = ' + d.h)}`;
  if (k === 'circle') b = `<circle cx="110" cy="68" r="48" ${st}/><line x1="110" y1="68" x2="${d.dia ? 62 : 158}" y2="68" ${dash}/><circle cx="110" cy="68" r="3" fill="currentColor"/>${d.dia ? '' : T(136, 62, 'r = ' + d.r)}${d.dia ? T(86, 62, 'd = ' + d.d) : ''}`;
  if (k === 'L') b = `<polygon points="30,20 100,20 100,70 190,70 190,115 30,115" ${st}/>${T(65, 14, d.a)}${T(150, 62, d.b)}${T(110, 130, d.c)}${T(18, 70, d.e)}`;
  return `<svg class="fig" viewBox="0 0 220 140" width="260" height="165" role="img">${b}</svg>`;
}
export function numberlineSVG({ v, dir = '>', closed = false, lo, hi }) {
  lo = lo ?? v - 4; hi = hi ?? v + 4; const W = 260, x = n => 14 + (n - lo) / (hi - lo) * (W - 28); let s = `<svg class="nl" viewBox="0 0 ${W} 54" width="${W}" height="54"><line x1="6" y1="26" x2="${W - 6}" y2="26" stroke="currentColor" stroke-width="2.5"/>`;
  for (let n = lo; n <= hi; n++) s += `<line x1="${x(n)}" y1="21" x2="${x(n)}" y2="31" stroke="currentColor" stroke-width="2"/><text x="${x(n)}" y="46" text-anchor="middle" font-size="11" fill="currentColor">${n}</text>`;
  const right = dir === '>' || dir === '≥', ex = right ? W - 6 : 6;
  s += `<line x1="${x(v)}" y1="26" x2="${ex}" y2="26" stroke="#38d6ff" stroke-width="6" stroke-linecap="round"/><polygon points="${ex},26 ${ex + (right ? -9 : 9)},19 ${ex + (right ? -9 : 9)},33" fill="#38d6ff"/>`;
  s += `<circle cx="${x(v)}" cy="26" r="6.5" fill="${closed ? '#38d6ff' : '#0e1a24'}" stroke="#38d6ff" stroke-width="3"/></svg>`;
  return s;
}
export function dotplotSVG(data) {
  const lo = Math.min(...data), hi = Math.max(...data), W = Math.max(240, (hi - lo + 1) * 32 + 30), cnt = {}; data.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
  const mx = Math.max(...Object.values(cnt)), H = mx * 20 + 46, x = n => 20 + (n - lo) * 32; let s = `<svg class="dp" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><line x1="8" y1="${H - 26}" x2="${W - 8}" y2="${H - 26}" stroke="currentColor" stroke-width="2.5"/>`;
  for (let n = lo; n <= hi; n++) { s += `<line x1="${x(n)}" y1="${H - 30}" x2="${x(n)}" y2="${H - 22}" stroke="currentColor"/><text x="${x(n)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="currentColor">${n}</text>`; for (let i = 0; i < (cnt[n] || 0); i++) s += `<circle cx="${x(n)}" cy="${H - 38 - i * 20}" r="7.5" fill="#5dff7a" stroke="#0e1a24"/>`; }
  return s + '</svg>';
}
export function barSVG(cats, color = '#38d6ff') {
  const mx = Math.max(...cats.map(c => c[1])), W = cats.length * 64 + 30, H = 150; let s = `<svg class="bar" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><line x1="16" y1="118" x2="${W - 6}" y2="118" stroke="currentColor" stroke-width="2"/>`;
  cats.forEach(([n, v], i) => { const h = v / mx * 90, x = 26 + i * 64; s += `<rect x="${x}" y="${118 - h}" width="40" height="${h}" rx="4" fill="${color}"/><text x="${x + 20}" y="${112 - h}" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">${v}</text><text x="${x + 20}" y="136" text-anchor="middle" font-size="12" fill="currentColor">${n}</text>`; });
  return s + '</svg>';
}
export const tableHTML = (head, rows) => `<table class="dt"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

// ---------------- generators ----------------
export const GEN = {
  /* ===== EUS 1 integers ===== */
  'int-add': () => { const a = R(-14, 14), b = R(-14, 14); return numQ(`${a} + ${sg(b)} = ?`, a + b, { hint: 'Same signs: add and keep the sign. Different signs: subtract and keep the sign of the bigger absolute value.', worked: `${a} + ${sg(b)} = ${a + b}` }); },
  'int-sub': () => { const a = R(-12, 12), b = R(-12, 12); return numQ(`${a} − ${sg(b)} = ?`, a - b, { hint: 'Subtracting a number = adding its opposite. Subtract a negative = take away an absence.', worked: `${a} − ${sg(b)} = ${a} + ${sg(-b)} = ${a - b}` }); },
  'int-mul': () => { const a = R(-9, 9) || 4, b = R(-9, 9) || -3; return numQ(`${sg(a)} × ${sg(b)} = ?`, a * b, { hint: 'Same signs → positive. Different signs → negative.', worked: `${sg(a)} × ${sg(b)} = ${a * b}` }); },
  'int-div': () => { const b = R(-9, 9) || 3, q = R(-9, 9) || 4; return numQ(`${b * q} ÷ ${sg(b)} = ?`, q, { hint: 'Same signs → positive. Different signs → negative.', worked: `${b * q} ÷ ${sg(b)} = ${q}` }); },
  'int-abs': () => { const n = R(-20, 20) || 7; return numQ(`|${n}| = ?`, Math.abs(n), { hint: 'Absolute value = distance from zero. Distance is never negative.', worked: `${n} is ${Math.abs(n)} steps from 0.` }); },
  'int-opp': () => { const n = R(-15, 15) || 6; return numQ(`What is the opposite of ${n}?`, -n, { hint: 'Opposites sit the same distance from zero on opposite sides.', worked: `The opposite of ${n} is ${-n}.` }); },
  /* ===== EUS 2 rational numbers ===== */
  'rat-conv': () => {
    const B = [['1/10', .1, 10], ['1/8', .125, 12.5], ['1/5', .2, 20], ['1/4', .25, 25], ['3/8', .375, 37.5], ['2/5', .4, 40], ['1/2', .5, 50], ['3/5', .6, 60], ['3/4', .75, 75]], [f, d, p] = rnd(B), m = R(0, 2);
    if (m === 0) return numQ(`Write ${f} as a decimal.`, d, { hint: 'Divide the top by the bottom.', worked: `${f} = ${d}` });
    if (m === 1) return numQ(`Write ${d} as a percent. (just the number)`, p, { hint: 'Decimal → percent: multiply by 100.', worked: `${d} × 100 = ${p}%` });
    return mcQ(`Which fraction equals ${p}%?`, f, B.filter(b => b[0] !== f).map(b => b[0]), { hint: 'Percent → fraction: percent over 100, then simplify.', worked: `${p}% = ${p}/100 = ${f}` });
  },
  'rat-addfrac': (l = 1) => {
    const d1 = rnd([2, 3, 4, 5, 6, 8]), d2 = l > 1 ? rnd([2, 3, 4, 5, 6, 8]) : d1, n1 = R(1, d1 - 1), n2 = R(1, d2 - 1), sub = R(0, 1) && n1 * d2 > n2 * d1, N = sub ? n1 * d2 - n2 * d1 : n1 * d2 + n2 * d1;
    return numQ(`${n1}/${d1} ${sub ? '−' : '+'} ${n2}/${d2} = ?   (type like 3/4)`, N / (d1 * d2), { keys: 'frac', hint: 'Find a common denominator, then add or subtract the numerators and keep the denominator.', worked: `${n1}/${d1} ${sub ? '−' : '+'} ${n2}/${d2} = ${n1 * d2}/${d1 * d2} ${sub ? '−' : '+'} ${n2 * d1}/${d1 * d2} = ${fracStr(N, d1 * d2)}` });
  },
  'rat-mulfrac': () => { const a = R(1, 4), b = R(2, 5), c = R(1, 4), d = R(2, 6); return numQ(`${a}/${b} × ${c}/${d} = ?   (type like 3/4)`, a * c / (b * d), { keys: 'frac', hint: 'Multiply straight across: top × top, bottom × bottom. Then simplify.', worked: `${a * c}/${b * d} = ${fracStr(a * c, b * d)}` }); },
  'rat-divfrac': () => { const a = R(1, 4), b = R(2, 5), c = R(1, 4), d = R(2, 6); return numQ(`${a}/${b} ÷ ${c}/${d} = ?   (type like 3/4)`, (a * d) / (b * c), { keys: 'frac', hint: 'Keep, Change, Flip: keep the first, change ÷ to ×, flip the second.', worked: `${a}/${b} × ${d}/${c} = ${fracStr(a * d, b * c)}` }); },
  'rat-dec': () => { const m = R(0, 2), a = R(11, 99) / 10, b = R(11, 99) / 10; return m === 0 ? numQ(`${a} + ${b} = ?`, +(a + b).toFixed(2), { hint: 'Line up the decimal points.', worked: `${a} + ${b} = ${+(a + b).toFixed(2)}` }) : m === 1 ? numQ(`${Math.max(a, b)} − ${Math.min(a, b)} = ?`, +(Math.max(a, b) - Math.min(a, b)).toFixed(2), { hint: 'Line up the decimal points; bigger number on top.' }) : (() => { const k = R(2, 9); return numQ(`${a} × ${k} = ?`, +(a * k).toFixed(2), { hint: 'Multiply like whole numbers, then put the decimal point back (count the decimal places).', worked: `${a} × ${k} = ${+(a * k).toFixed(2)}` }); })(); },
  'rat-recip': () => { const a = R(1, 9), b = R(a + 1, 12); return mcQ(`What is the reciprocal of ${a}/${b}?`, `${b}/${a}`, [`${a}/${b}`, `-${a}/${b}`, `${b}/${b - a || 1}`], { hint: 'The reciprocal (multiplicative inverse) is the flipped fraction.', worked: `Flip ${a}/${b} → ${b}/${a}` }); },
  'rat-mixed': () => { const w = R(1, 5), d = R(2, 6), n = R(1, d - 1); return mcQ(`Write ${w * d + n}/${d} as a mixed number.`, `${w} ${n}/${d}`, [`${w + 1} ${n}/${d}`, `${w} ${d}/${n}`, `${w - 1 || 7} ${n}/${d}`], { hint: 'Divide: how many whole groups of the denominator fit? The remainder is the new numerator.', worked: `${w * d + n} ÷ ${d} = ${w} remainder ${n}` }); },
  /* ===== EUS 3 expressions ===== */
  'ex-gemdas': (l = 1) => {
    const a = R(2, 9), b = R(2, 9), c = R(2, 6), d = R(1, 9); let s, v;
    const T = [[`${a} + ${b} × ${c}`, a + b * c], [`${a} × (${b} + ${c})`, a * (b + c)], [`${a * c} ÷ ${c} + ${b}`, a + b], [`${a + b + c} − ${b} × ${c}`, a + b + c - b * c], [`${a} + ${b}² × ${c}`, a + b * b * c], [`(${a} + ${b})² − ${c}`, (a + b) ** 2 - c], [`${a} × (${b} + ${c}²) − ${d}`, a * (b + c * c) - d], [`${b * c} ÷ (${c} + ${b - c + c}) + ${a}²`, b * c / (c + b) + a * a]];
    [s, v] = l === 1 ? rnd(T.slice(0, 4)) : l === 2 ? rnd(T.slice(2, 6)) : rnd(T.slice(4, 7)); if (!Number.isInteger(v)) [s, v] = T[0];
    return numQ(`${s} = ?`, v, { hint: 'GEMDAS: Grouping, Exponents, Multiply/Divide (left to right), Add/Subtract (left to right).', worked: `Follow GEMDAS step by step → ${v}` });
  },
  'ex-like': () => {
    const a = R(2, 9), b = R(1, 8), c = R(1, 9), d = R(1, 7), s = R(0, 1) ? '+' : '−', X = a + c, K = s === '+' ? b + d : b - d;
    const ans = `${X}x${K >= 0 ? '+' : '-'}${Math.abs(K)}`;
    return { fmt: 'keys', keys: 'expr', check: 'linear', html: `Simplify by combining like terms:<br><b>${a}x + ${b} + ${c}x ${s} ${d}</b>`, answer: ans, hint: 'Only like terms combine: x-terms with x-terms, constants with constants.', worked: `(${a}x + ${c}x) + (${b} ${s} ${d}) = ${ans}` };
  },
  'ex-eval': () => { const a = R(2, 9), b = R(1, 9), x = R(2, 8); return numQ(`Evaluate <b>${a}x + ${b}</b> when x = ${x}`, a * x + b, { hint: 'Replace x with the number, then follow GEMDAS.', worked: `${a}(${x}) + ${b} = ${a * x} + ${b} = ${a * x + b}` }); },
  'ex-vocab': () => {
    const a = R(2, 9), b = R(1, 9), v = rnd(['x', 'n', 'y']), m = R(0, 2);
    const q = [[`In <b>${a}${v} + ${b}</b>, what is the coefficient?`, `${a}`, [`${b}`, v, `${a + b}`]], [`In <b>${a}${v} + ${b}</b>, what is the constant?`, `${b}`, [`${a}`, v, `${a * b}`]], [`In <b>${a}${v} + ${b}</b>, what is the variable?`, v, [`${a}`, `${b}`, `${a}${v}`]]][m];
    return mcQ(q[0], q[1], q[2], { html: q[0], hint: 'Coefficient = number multiplying the variable. Constant = number by itself.', worked: `Coefficient ${a}, variable ${v}, constant ${b}.` });
  },
  /* ===== equations ===== */
  'eq-1step': () => {
    const x = R(2, 12), a = R(2, 9), m = R(0, 3), t = [[`x + ${a} = ${x + a}`, `subtract ${a} from both sides`], [`x − ${a} = ${x - a}`, `add ${a} to both sides`], [`${a}x = ${a * x}`, `divide both sides by ${a}`], [`x ÷ ${a} = ${x}`.replace(`${x}`, `${x}`), '']][m];
    if (m === 3) return numQ(`Solve: x ÷ ${a} = ${x}`, x * a, { hint: 'The inverse of dividing is multiplying.', worked: `x = ${x} × ${a} = ${x * a}. Check: ${x * a} ÷ ${a} = ${x} ✓` });
    return numQ(`Solve: <b>${t[0]}</b>`, x, { hint: 'What is happening to x? Do the inverse to BOTH sides.', worked: `${t[0]} → ${t[1]} → x = ${x}. Check: plug ${x} back in ✓` });
  },
  'eq-2step': () => {
    const x = R(2, 10), a = R(2, 6), b = R(1, 12), m = R(0, 1);
    return m ? numQ(`Solve: <b>${a}x + ${b} = ${a * x + b}</b>`, x, { hint: 'Undo the addition first, then the multiplication.', worked: `${a}x = ${a * x}; x = ${x}. Check ✓` }) : numQ(`Solve: <b>${a}x − ${b} = ${a * x - b}</b>`, x, { hint: 'Undo the subtraction first (add), then divide.', worked: `${a}x = ${a * x}; x = ${x}. Check ✓` });
  },
  'eq-both': () => { const x = R(2, 9), c = R(1, 4), a = c + R(1, 4), b = R(1, 9), d = (a - c) * x + b; return numQ(`Solve: <b>${a}x + ${b} = ${c}x + ${d}</b>`, x, { hint: 'Get the variable on one side first: subtract the smaller x-term from both sides.', worked: `${a - c}x + ${b} = ${d}; ${a - c}x = ${d - b}; x = ${x}` }); },
  /* ===== inequalities ===== */
  'ineq-solve': () => {
    const neg = R(0, 1), a = neg ? -R(2, 5) : R(2, 5), x = R(1, 8), b = R(1, 9), sym = rnd(['<', '>']), rhs = a * x + b, flip = sym === '<' ? '>' : '<', ans = `x ${a < 0 ? flip : sym} ${x}`;
    const wrong = [`x ${a < 0 ? sym : flip} ${x}`, `x ${sym} ${x + 1}`, `x ${flip} ${x - 1}`];
    return mcQ(`Solve: <b>${a}x + ${b} ${sym === '<' ? '&lt;' : '&gt;'} ${rhs}</b>`, ans, wrong, { hint: a < 0 ? 'Dividing by a NEGATIVE number? Flip the inequality symbol!' : 'Do the same inverse operations as an equation.', worked: `${a}x ${sym} ${rhs - b}; ${a < 0 ? 'divide by a negative → flip → ' : ''}${ans}` });
  },
  'ineq-graph': () => {
    const v = R(-2, 4), dir = rnd(['>', '<', '≥', '≤']), closed = dir === '≥' || dir === '≤', right = dir === '>' || dir === '≥';
    const mk = (d, c) => ({ v: `${d}${c}`, html: numberlineSVG({ v, dir: d, closed: c }) }), ans = mk(dir, closed);
    const o = [ans, mk(dir, !closed), mk(right ? '<' : '>', closed), mk(right ? '<' : '>', !closed)];
    return { fmt: 'mc', html: `Which graph shows <b>x ${dir === '<' ? '&lt;' : dir === '>' ? '&gt;' : dir} ${v}</b>?`, answer: ans.v, opts: o, hint: 'Closed circle for ≥ or ≤ (the number is included). Open circle for > or <. The arrow points the way the values go.', worked: `x ${dir} ${v}: ${closed ? 'closed' : 'open'} circle at ${v}, arrow to the ${right ? 'right' : 'left'}.` };
  },
  'ineq-sym': () => { const s = rnd([['>', 'greater than'], ['<', 'less than'], ['≥', 'greater than or equal to'], ['≤', 'less than or equal to']]); return mcQ(`Which symbol means “${s[1]}”?`, s[0], ['>', '<', '≥', '≤'].filter(x => x !== s[0]), { hint: 'The line under the symbol means “or equal to”.' }); },
  /* ===== EUS 4 proportionality ===== */
  'pr-unit': () => { const r = R(2, 9), t = R(3, 9); const th = rnd([['blocks', 'minute'], ['coins', 'hour'], ['arrows', 'minute'], ['crops', 'day']]); return numQ(`A builder places <b>${r * t} ${th[0]}</b> in <b>${t} ${th[1]}s</b>. What is the unit rate (${th[0]} per ${th[1]})?`, r, { hint: 'Unit rate = a ratio with 1 in the denominator. Divide.', worked: `${r * t} ÷ ${t} = ${r} ${th[0]} per ${th[1]}` }); },
  'pr-prop': () => {
    const a = R(2, 6), b = R(2, 5), k = R(2, 6), c = b * k, T = rnd([['planks', 'tables'], ['iron ingots', 'swords'], ['seeds', 'rows'], ['gems', 'crowns']]);
    return numQ(`A recipe uses <b>${a} ${T[0]}</b> for every <b>${b} ${T[1]}</b>. How many ${T[0]} are needed for <b>${c} ${T[1]}</b>?`, a * k, { hint: `Unit template: ${T[0]} / ${T[1]}. Set up ${a}/${b} = x/${c} and cross-multiply.`, worked: `${a}/${b} = x/${c} → x = (${a} × ${c}) ÷ ${b} = ${a * k}. Scale factor ${k}.` });
  },
  'pr-scale': () => { const a = R(2, 6), b = R(3, 8), k = R(2, 5); return numQ(`${a} : ${b} = ? : ${b * k}`, a * k, { hint: 'What number multiplied the bottom? Multiply the top by the same scale factor.', worked: `Scale factor = ${b * k} ÷ ${b} = ${k}; ${a} × ${k} = ${a * k}` }); },
  'pr-compare': () => {
    const u1 = R(2, 6), u2 = u1 + rnd([-1, 1]) * R(1, 2) || u1 + 1, n1 = R(3, 6), n2 = R(3, 6), c1 = u1 * n1, c2 = u2 * n2, a = c1 / n1 < c2 / n2 ? 'Pack A' : 'Pack B';
    return mcQ(`Pack A: <b>${n1} gems for ${c1} coins</b>. Pack B: <b>${n2} gems for ${c2} coins</b>. Which is the better deal (cheaper per gem)?`, a, ['Pack A', 'Pack B', 'They are equal'].filter(v => v !== a), { hint: 'Compare coins per gem for each pack — unit rates make it fair.', worked: `A: ${c1}/${n1} = ${nice(c1 / n1)} per gem. B: ${c2}/${n2} = ${nice(c2 / n2)} per gem.` });
  },
  'pr-pct': () => { const old = rnd([20, 40, 50, 80, 100, 200]), p = rnd([10, 20, 25, 50]), up = R(0, 1), nw = up ? old * (1 + p / 100) : old * (1 - p / 100); return numQ(`A price changes from <b>${old}</b> to <b>${nw}</b>. What is the percent of change? (just the number, drop the minus if it fell and say so below)`.replace(' (just the number, drop the minus if it fell and say so below)', ' (use a minus sign if it decreased)'), up ? p : -p, { hint: '% of change = (new − old) ÷ old × 100.', worked: `(${nw} − ${old}) ÷ ${old} = ${nice((nw - old) / old)} → ${up ? p : -p}%` }); },
  'pr-int': () => { const P = rnd([200, 500, 1000, 1500]), r = rnd([2, 3, 4, 5]), t = R(2, 5); return numQ(`Simple interest: Principal <b>$${P}</b>, rate <b>${r}%</b>, time <b>${t} years</b>. How much interest is earned? (dollars)`, P * r / 100 * t, { hint: 'I = P · R · T, with R as a decimal.', worked: `I = ${P} × ${r / 100} × ${t} = $${P * r / 100 * t}` }); },
  /* ===== EUS 5 statistics ===== */
  'st-mean': () => { const m = R(5, 14), d = [R(1, 4), R(1, 4), R(0, 3)], data = shuffle([m - d[0], m - d[1], m + d[0], m + d[1], m + d[2] - d[2]]); return numQ(`Find the <b>mean</b>: ${data.join(', ')}`, avg(data), { hint: 'Mean = sum of all numbers ÷ how many numbers.', worked: `${data.join(' + ')} = ${sum(data)}; ÷ ${data.length} = ${nice(avg(data))}` }); },
  'st-median': () => { const n = rnd([5, 7, 6]), data = Array.from({ length: n }, () => R(2, 30)), s = [...data].sort((a, b) => a - b), med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; return numQ(`Find the <b>median</b>: ${data.join(', ')}`, med, { hint: 'Put the numbers in order first! Median = middle (or the average of the two middles).', worked: `Ordered: ${s.join(', ')} → median ${nice(med)}` }); },
  'st-mode': () => { const m = R(3, 20), others = sample(Array.from({ length: 30 }, (_, i) => i + 1).filter(v => v !== m), 4), data = shuffle([m, m, m, ...others]); return numQ(`Find the <b>mode</b>: ${data.join(', ')}`, m, { hint: 'Mode = the number that appears most often.', worked: `${m} appears the most (3 times).` }); },
  'st-range': () => { const data = Array.from({ length: 6 }, () => R(3, 40)); return numQ(`Find the <b>range</b>: ${data.join(', ')}`, Math.max(...data) - Math.min(...data), { hint: 'Range = biggest − smallest.', worked: `${Math.max(...data)} − ${Math.min(...data)} = ${Math.max(...data) - Math.min(...data)}` }); },
  'st-iqr': () => {
    const s = Array.from({ length: 8 }, () => R(2, 40)).sort((a, b) => a - b), med = a => a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2, q1 = med(s.slice(0, 4)), q3 = med(s.slice(4));
    return numQ(`Find the <b>interquartile range (IQR)</b>: ${shuffle(s).join(', ')}`, q3 - q1, { hint: 'Order the data, split it into a lower and upper half, find the median of each (Q1 and Q3). IQR = Q3 − Q1.', worked: `Ordered: ${s.join(', ')}. Q1 = ${q1}, Q3 = ${q3}, IQR = ${q3 - q1}` });
  },
  'st-outlier': () => { const base = R(10, 25), data = [base, base + 2, base + 3, base + 1, base + 4], out = base + rnd([25, 30, 40]); data.push(out); return mcQ(`Which value is the <b>outlier</b>? ${shuffle(data).join(', ')}`, out, data.filter(v => v !== out), { hint: 'An outlier is far away from the rest of the data.', worked: `${out} is far from the others.` }); },
  'st-dot': () => {
    const data = Array.from({ length: R(9, 12) }, () => R(2, 8)), cnt = {}; data.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
    const mode = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0], tie = Object.values(cnt).filter(c => c === cnt[mode]).length > 1;
    if (tie) return GEN['st-dot']();
    return { fmt: 'mc', visual: dotplotSVG(data), html: 'What is the <b>mode</b> of this dot plot?', answer: String(mode), opts: uniq([mode, ...sample([2, 3, 4, 5, 6, 7, 8].filter(v => v !== mode), 3)]).map(String), hint: 'The mode is the value with the tallest stack of dots.', worked: `${mode} has ${cnt[mode]} dots — the most.` };
  },
  'st-freq': () => {
    const cats = rnd([['Red', 'Blue', 'Green', 'Gold'], ['Pizza', 'Tacos', 'Pasta', 'Sushi'], ['Cats', 'Dogs', 'Fish', 'Birds']]), v = cats.map(() => R(2, 9)), i = R(0, 3), j = (i + 1 + R(0, 2)) % 4;
    return numQ(`${tableHTML(['Choice', 'Frequency'], cats.map((c, k) => [c, v[k]]))}How many MORE chose <b>${cats[i]}</b> than <b>${cats[j]}</b>? (if fewer, use a minus sign)`, v[i] - v[j], { hint: 'Read the frequency (how many) for each, then subtract.', worked: `${v[i]} − ${v[j]} = ${v[i] - v[j]}` });
  },
  'st-skew': () => { const right = R(0, 1); return mcQ(`A data set has a long “tail” of outliers on the ${right ? 'right' : 'left'} side. How is it skewed?`, right ? 'Right (positive) skew' : 'Left (negative) skew', ['Right (positive) skew', 'Left (negative) skew', 'No skew', 'It has no mode'].filter(x => x !== (right ? 'Right (positive) skew' : 'Left (negative) skew')), { hint: 'Skew is named for the side the tail points to.' }); },
  /* ===== EUS 6 geometry ===== */
  'ge-area': () => {
    const k = rnd(['rect', 'tri', 'para', 'trap', 'circle']);
    if (k === 'rect') { const w = R(3, 12), h = R(3, 9); return numQ(`Find the area (units²).`, w * h, { visual: shapeSVG('rect', { w, h }), hint: 'Area of a rectangle = base × height.', worked: `${w} × ${h} = ${w * h}` }); }
    if (k === 'tri') { const b = R(3, 7) * 2, h = R(3, 9); return numQ(`Find the area (units²).`, b * h / 2, { visual: shapeSVG('tri', { b, h }), hint: 'Triangle: A = ½ · b · h. The height is measured perpendicular to the base.', worked: `½ × ${b} × ${h} = ${b * h / 2}` }); }
    if (k === 'para') { const b = R(4, 12), h = R(3, 9); return numQ(`Find the area (units²).`, b * h, { visual: shapeSVG('para', { b, h }), hint: 'Parallelogram: A = b · h (use the perpendicular height, not the slanted side).', worked: `${b} × ${h} = ${b * h}` }); }
    if (k === 'trap') { const b1 = R(3, 7), b2 = b1 + R(2, 6), h = R(2, 4) * 2; return numQ(`Find the area (units²).`, (b1 + b2) * h / 2, { visual: shapeSVG('trap', { b1, b2, h }), hint: 'Trapezoid: A = ½ (b₁ + b₂) · h.', worked: `½ × (${b1} + ${b2}) × ${h} = ${(b1 + b2) * h / 2}` }); }
    const r = R(2, 9); return numQ(`Find the area of the circle. Use π = 3.14.`, +(3.14 * r * r).toFixed(2), { tol: .011, visual: shapeSVG('circle', { r }), hint: 'Circle: A = π r². Square the radius first!', worked: `3.14 × ${r}² = 3.14 × ${r * r} = ${(3.14 * r * r).toFixed(2)}` });
  },
  'ge-perim': () => { const w = R(3, 12), h = R(3, 9); return numQ(`Find the perimeter (units).`, 2 * (w + h), { visual: shapeSVG('rect', { w, h }), hint: 'Perimeter = distance AROUND = add all the sides.', worked: `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}` }); },
  'ge-circ': () => { const r = R(2, 10), dia = R(0, 1); return dia ? numQ(`A circle has diameter ${2 * r}. Find the circumference. Use π = 3.14.`, +(3.14 * 2 * r).toFixed(2), { tol: .011, visual: shapeSVG('circle', { d: 2 * r, dia: 1 }), hint: 'C = π × diameter.', worked: `3.14 × ${2 * r} = ${(3.14 * 2 * r).toFixed(2)}` }) : numQ(`A circle has radius ${r}. What is its diameter?`, 2 * r, { visual: shapeSVG('circle', { r }), hint: 'Diameter = 2 × radius.', worked: `2 × ${r} = ${2 * r}` }); },
  'ge-comp': () => { const a = R(6, 12), e = R(7, 12), b = R(3, a - 2), c = R(3, e - 2); /* L shape = big rect minus corner */ return numQ(`This L-shape is a ${a} × ${e} rectangle with a ${b} × ${c} corner cut out. Find its area.`, a * e - b * c, { hint: 'Composite shape: split into standard shapes (or subtract the missing piece).', worked: `${a} × ${e} = ${a * e}; ${b} × ${c} = ${b * c}; ${a * e} − ${b * c} = ${a * e - b * c}` }); },
  'ge-tri': () => { const a = R(30, 80), b = R(30, 90 - 10); return numQ(`Two angles of a triangle are ${a}° and ${b}°. What is the third angle?`, 180 - a - b, { hint: 'The interior angles of every triangle add up to 180°.', worked: `180 − ${a} − ${b} = ${180 - a - b}` }); },
  'ge-tri-ineq': () => { const ok = R(0, 1), a = R(3, 9), b = R(3, 9), c = ok ? R(Math.abs(a - b) + 1, a + b - 1) : a + b + R(1, 4); return mcQ(`Can sides <b>${a}, ${b}, ${c}</b> make a triangle?`, ok ? 'Yes' : 'No', [ok ? 'No' : 'Yes'], { hint: 'The two smaller sides added together must be bigger than the largest side.', worked: `${[a, b, c].sort((x, y) => x - y).slice(0, 2).join(' + ')} = ${[a, b, c].sort((x, y) => x - y).slice(0, 2).reduce((x, y) => x + y)} ${ok ? '>' : '≤'} ${Math.max(a, b, c)}` }); },
  /* ===== EUS 7 financial literacy ===== */
  'fi-pct': () => { const p = rnd([10, 20, 25, 30, 40, 50, 75]), n = rnd([40, 60, 80, 120, 200, 240]); return numQ(`What is <b>${p}%</b> of <b>${n}</b>?`, p * n / 100, { hint: 'Percent → decimal (÷100), then multiply.', worked: `${p / 100} × ${n} = ${p * n / 100}` }); },
  'fi-profit': () => { const inv = rnd([200, 400, 500, 800]), p = rnd([5, 10, 15, 20, 25]); return numQ(`Alex makes <b>$${inv * p / 100}</b> profit on a <b>$${inv}</b> investment. What is the % profit?`, p, { hint: 'Fraction form: profit/investment = x/100.', worked: `${inv * p / 100}/${inv} = x/100 → x = ${p}%` }); },
  'fi-register': () => {
    const start = R(100, 300), t = [['Deposit', R(20, 90)], ['Withdrawal', -R(10, 70)], ['Transfer in', R(10, 50)], ['Withdrawal', -R(10, 60)]]; let bal = start; t.forEach(x => bal += x[1]);
    return numQ(`Starting balance <b>$${start}</b>. Find the ending balance (dollars):${tableHTML(['Transaction', 'Amount'], t.map(x => [x[0], (x[1] > 0 ? '+' : '−') + '$' + Math.abs(x[1])]))}`, bal, { hint: 'Deposits and incoming transfers add (+). Withdrawals and outgoing transfers subtract (−).', worked: `${start} ${t.map(x => (x[1] > 0 ? '+ ' : '− ') + Math.abs(x[1])).join(' ')} = ${bal}` });
  },
  'fi-salary': () => { const a = R(30, 45) * 1000, d = R(8, 15) * 1000, cost = R(10, 30) * 1000, y = rnd([10, 20, 30]); return numQ(`Job A pays <b>$${a.toLocaleString()}</b>/year. Job B pays <b>$${(a + d).toLocaleString()}</b>/year but needs <b>$${cost.toLocaleString()}</b> of training. Over <b>${y} years</b>, how much MORE does Job B earn after paying for training? (dollars)`, d * y - cost, { hint: 'Subtract the salaries, multiply by the years, then subtract the training cost.', worked: `$${d.toLocaleString()} × ${y} = $${(d * y).toLocaleString()}; − $${cost.toLocaleString()} = $${(d * y - cost).toLocaleString()}` }); },
  'fi-budget': () => { const inc = rnd([1000, 1500, 2000, 2400]), cat = rnd([['rent', 30], ['food', 15], ['savings', 20], ['fun', 10]]); return numQ(`Monthly income is <b>$${inc}</b>. The budget puts <b>${cat[1]}%</b> toward <b>${cat[0]}</b>. How many dollars is that?`, inc * cat[1] / 100, { hint: 'Percent of a number: convert to a decimal and multiply.', worked: `${cat[1] / 100} × ${inc} = $${inc * cat[1] / 100}` }); },
  'fi-exp': () => { const F = ['rent', 'phone plan', 'car payment', 'insurance'], V = ['groceries', 'gaming gear', 'electric bill', 'snacks']; const fx = R(0, 1), w = fx ? rnd(F) : rnd(V); return mcQ(`Is <b>${w}</b> usually a fixed or a variable expense?`, fx ? 'Fixed' : 'Variable', [fx ? 'Variable' : 'Fixed'], { hint: 'Fixed = same every month. Variable = changes from month to month.' }); },
  /* ===== Ensley: data & graphs (grade 2-3) ===== */
  'tally-read': () => { const n = R(2, 19); return numQ(`How many tally marks?<br>`, n, { visual: tallySVG(n), hint: 'Each group with a slash is 5. Count by fives, then add the extras!', worked: `${Math.floor(n / 5)} group(s) of 5 = ${Math.floor(n / 5) * 5}, plus ${n % 5} more = ${n}` }); },
  'freq-read': () => {
    const sets = [['Red', 'Blue', 'Green', 'Yellow'], ['Apples', 'Bananas', 'Grapes', 'Pears'], ['Dogs', 'Cats', 'Fish', 'Birds'], ['Soccer', 'Art', 'Reading', 'Music']], cats = rnd(sets), v = cats.map(() => R(2, 9)), tot = sum(v), m = R(0, 3);
    const tbl = tableHTML(['Choice', 'Tallies', 'Number'], cats.map((c, k) => [c, tallySVG(v[k]), v[k]])), i = R(0, 3), j = (i + 1 + R(0, 2)) % 4;
    if (m === 0) return numQ(`${tbl}How many students were surveyed in all?`, tot, { hint: 'Add up all the numbers in the table.', worked: `${v.join(' + ')} = ${tot}` });
    if (m === 1) return numQ(`${tbl}How many chose <b>${cats[i]}</b> or <b>${cats[j]}</b>?`, v[i] + v[j], { hint: '“Or” means add those two rows together.', worked: `${v[i]} + ${v[j]} = ${v[i] + v[j]}` });
    if (m === 2) return numQ(`${tbl}How many did NOT choose <b>${cats[i]}</b>?`, tot - v[i], { hint: 'Add the other rows, or take the total minus that row.', worked: `${tot} − ${v[i]} = ${tot - v[i]}` });
    return numQ(`${tbl}How many MORE chose <b>${cats[i]}</b> than <b>${cats[j]}</b>? (if fewer, type 0)`, Math.max(0, v[i] - v[j]), { hint: 'Subtract the smaller number from the bigger number.', worked: `${Math.max(v[i], v[j])} − ${Math.min(v[i], v[j])} = ${Math.abs(v[i] - v[j])}` });
  }
};
export const makeQ = (id, level = 1) => { const g = GEN[id]; if (!g) throw new Error('unknown generator ' + id); const q = g(level); q.gen = id; return q; };

// Simple water-cycle picture; the part named by `focus` glows (evaporation, condensation, precipitation, runoff, transpiration, sun).
export function waterCycleSVG(focus) {
  const h = k => focus === k ? ' class="hl"' : '';
  const arrow = (d, c = '#ff9a3d') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`;
  return `<svg class="wc" viewBox="0 0 360 230" width="360" height="230" role="img" aria-label="Water cycle diagram">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe8ff"/><stop offset="1" stop-color="#eaf8ff"/></linearGradient></defs>
  <rect width="360" height="230" rx="14" fill="url(#sky)"/>
  <g${h('sun')}><circle cx="310" cy="42" r="21" fill="#ffd54a"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="${310 + 27 * Math.cos(a * Math.PI / 180)}" y1="${42 + 27 * Math.sin(a * Math.PI / 180)}" x2="${310 + 36 * Math.cos(a * Math.PI / 180)}" y2="${42 + 36 * Math.sin(a * Math.PI / 180)}" stroke="#ffb21f" stroke-width="4" stroke-linecap="round"/>`).join('')}</g>
  <polygon points="0,230 0,150 68,62 152,178 152,230" fill="#8d6e63"/><polygon points="68,62 48,92 62,86 74,98 88,84" fill="#fff"/>
  <rect x="150" y="172" width="210" height="58" fill="#38b6f2"/><path d="M150 176q15-9 30 0t30 0 30 0 30 0 30 0 30 0" fill="none" stroke="#fff" stroke-width="2.5" opacity=".7"/>
  <g><rect x="116" y="146" width="6" height="26" fill="#6d4c41"/><circle cx="119" cy="140" r="17" fill="#4caf50"/></g>
  <g${h('transpiration')}>${arrow('M112 124c-3-8 3-12 0-20', '#7ee08a')}${arrow('M126 126c-3-8 3-12 0-20', '#7ee08a')}</g>
  <g${h('evaporation')}>${arrow('M215 160c-6-10 6-16 0-28')}${arrow('M240 160c-6-10 6-16 0-28')}${arrow('M265 160c-6-10 6-16 0-28')}</g>
  <g><ellipse cx="190" cy="60" rx="38" ry="19" fill="#fff"/><ellipse cx="166" cy="68" rx="24" ry="14" fill="#fff"/><ellipse cx="214" cy="68" rx="26" ry="14" fill="#fff"/></g>
  <g${h('condensation')}>${arrow('M262 118c14-14 10-34-14-44', '#b388ff')}<polygon points="244,70 254,80 240,82" fill="#b388ff"/></g>
  <g${h('precipitation')}>${[[150, 90], [166, 104], [182, 90], [198, 104], [212, 90]].map(([x, y]) => `<path d="M${x} ${y}q-4 8 0 11 4-3 0-11z" fill="#2f80ed" stroke="#2f80ed" stroke-width="2"/>`).join('')}</g>
  <g${h('runoff')}><path d="M100 96q8 28 30 50t30 32" fill="none" stroke="#2f80ed" stroke-width="5" stroke-linecap="round"/><polygon points="160,178 148,176 154,166" fill="#2f80ed"/></g>
  </svg>`;
}
