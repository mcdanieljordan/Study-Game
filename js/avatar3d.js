// Sida's blocky 3D avatar and her growing Block World (three.js, vendored — no network).
import * as THREE from '../vendor/three.module.min.js';
import { itemById } from './catalog.js';

export const canGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
const lam = new Map();
const M = (c, o = {}) => { const k = c + JSON.stringify(o); if (!lam.has(k)) lam.set(k, new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o })); return lam.get(k); };
function box(w, h, d, c, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c) : c); m.position.set(x, y, z); parent && parent.add(m); return m; }

// ---------------- character ----------------
function faceTexture(skin, mood) {
  const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d');
  x.fillStyle = skin; x.fillRect(0, 0, 8, 8);
  x.fillStyle = '#fff'; x.fillRect(1, 3, 2, 1); x.fillRect(5, 3, 2, 1);
  x.fillStyle = '#1b1b2f'; x.fillRect(2, 3, 1, 1); x.fillRect(5, 3, 1, 1); x.fillRect(1, 2, 2, 1); x.fillRect(5, 2, 2, 1);
  if (mood === 'happy') { x.fillRect(2, 5, 1, 1); x.fillRect(3, 6, 2, 1); x.fillRect(5, 5, 1, 1); x.fillStyle = '#ff8fa3'; x.fillRect(1, 5, 1, 1); x.fillRect(6, 5, 1, 1); }
  else if (mood === 'hug') { x.fillRect(3, 5, 2, 1); x.fillStyle = '#ff8fa3'; x.fillRect(1, 4, 1, 1); x.fillRect(6, 4, 1, 1); }
  else { x.fillRect(3, 5, 2, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; return t;
}
export function buildChar(look, mood = 'idle') {
  const g = new THREE.Group(), it = id => itemById('sida', id) || {};
  const skin = it(look.skin).c || '#e8b98e', top = it(look.top).c || '#2fbf5b', bot = it(look.bottom).c || '#2a3f7a', hairV = it(look.hair).v || 'short', headV = it(look.head).v, back = it(look.back), aura = it(look.aura);
  const hairC = ['#4a2c1d', '#6e4329'].includes(skin) ? '#16100c' : '#3b2a20';
  box(.5, 1.5, .5, bot, -.25, .75, 0, g); box(.5, 1.5, .5, bot, .25, .75, 0, g); box(.52, .22, .6, '#23232e', -.25, .11, .04, g); box(.52, .22, .6, '#23232e', .25, .11, .04, g);
  box(1, 1.5, .5, top, 0, 2.25, 0, g);
  const arm = sx => { const a = new THREE.Group(); a.position.set(sx * .75, 3, 0); box(.5, .9, .5, top, 0, -.45, 0, a); box(.5, .6, .5, skin, 0, -1.2, 0, a); g.add(a); return a; };
  const armL = arm(-1), armR = arm(1);
  const head = new THREE.Group(); head.position.set(0, 3.5, 0); g.add(head);
  const faceMat = new THREE.MeshLambertMaterial({ map: faceTexture(skin, mood) }), sk = M(skin);
  const hm = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [sk, sk, sk, sk, faceMat, sk]); head.add(hm);
  const hc = M(hairC);
  if (hairV !== 'none') {
    box(1.06, .28, 1.06, hc, 0, .5, 0, head); box(1.06, .6, .2, hc, 0, .25, -.43, head);
    if (hairV === 'spiky') [-.35, 0, .35].forEach((x, i) => box(.25, .35 + (i === 1 ? .15 : 0), .25, hc, x, .78, 0, head));
    if (hairV === 'long') { box(1.06, 1.3, .2, hc, 0, -.1, -.43, head); box(.18, .9, .5, hc, -.5, .05, -.12, head); box(.18, .9, .5, hc, .5, .05, -.12, head); }
    if (hairV === 'bun') box(.45, .45, .45, hc, 0, .9, -.1, head);
    if (hairV === 'mohawk') { for (let z = -.4; z <= .4; z += .2) box(.2, .5 + .1 * Math.cos(z * 4), .2, M('#ff4fa0'), 0, .72, z, head); }
  }
  if (headV === 'phones') { box(1.3, .12, .14, '#2b2b36', 0, .6, 0, head); box(.22, .45, .45, '#ff4fa0', -.62, .0, 0, head); box(.22, .45, .45, '#ff4fa0', .62, .0, 0, head); }
  if (headV === 'cap') { box(1.1, .35, 1.1, '#d94040', 0, .55, 0, head); box(1.0, .08, .55, '#a82a2a', 0, .4, .75, head); }
  if (headV === 'hardhat') { box(1.12, .4, 1.12, '#ffd23a', 0, .58, 0, head); box(.25, .12, 1.12, '#e8b800', 0, .82, 0, head); box(1.4, .08, 1.4, '#ffd23a', 0, .38, 0, head); }
  if (headV === 'goggles') { box(1.1, .12, 1.1, '#3a3a4a', 0, .12, 0, head); box(.38, .3, .12, M('#7fe9ff', { emissive: '#1d8aa6' }), -.27, .12, .54, head); box(.38, .3, .12, M('#7fe9ff', { emissive: '#1d8aa6' }), .27, .12, .54, head); }
  if (headV === 'visor') box(1.1, .26, .16, M('#4aa3ff', { transparent: true, opacity: .75 }), 0, .1, .55, head);
  if (headV === 'crown') { box(1.08, .22, 1.08, '#ffd54a', 0, .62, 0, head); [[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4], [0, 0]].forEach(([x, z]) => box(.2, .3, .2, '#ffd54a', x, .85, z, head)); }
  if (headV === 'halo') { const t = new THREE.Mesh(new THREE.TorusGeometry(.55, .06, 8, 24), M('#ffe066', { emissive: '#d6a800' })); t.rotation.x = Math.PI / 2; t.position.y = 1.1; head.add(t); head.userData.halo = t; }
  if (back.v === 'cape') box(.95, 1.9, .08, back.c, 0, 2.1, -.32, g);
  if (back.v === 'pack') box(.8, 1, .35, back.c, 0, 2.3, -.42, g);
  if (back.v === 'wings') { [-1, 1].forEach(s => { const w = box(.12, 1.5, .8, back.c, s * .3, 2.6, -.4, g); w.rotation.z = s * .5; w.rotation.y = s * .4; }); }
  g.userData = { armL, armR, head, aura: aura.v ? { v: aura.v, c: aura.c, parts: [] } : null };
  if (g.userData.aura) for (let i = 0; i < 7; i++) { const m = box(.16, .16, .16, M(aura.c, { emissive: aura.c }), 0, 0, 0, g); g.userData.aura.parts.push({ m, a: i / 7 * Math.PI * 2, r: 1.3 + (i % 3) * .2, h: 1 + i * .45 }); }
  return g;
}

// ---------------- stage (live, draggable) ----------------
function mkRenderer(w, h, extra = {}) { const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, ...extra }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.setSize(w, h, false); return r; }
function lights(scene) { scene.add(new THREE.AmbientLight(0xffffff, .85)); const d = new THREE.DirectionalLight(0xffffff, .8); d.position.set(4, 8, 6); scene.add(d); }

export function createStage(container, look, mood = 'idle') {
  if (!canGL) { container.innerHTML = '<div class="nogl">🧑‍🚀</div>'; return { setLook() { }, celebrate() { }, destroy() { } }; }
  const w = container.clientWidth || 300, h = container.clientHeight || 360, r = mkRenderer(w, h), scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, w / h, .1, 100);
  cam.position.set(0, 3.1, 11); cam.lookAt(0, 2.1, 0); lights(scene); container.innerHTML = ''; container.appendChild(r.domElement); r.domElement.style.cssText = 'width:100%;height:100%;touch-action:none';
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, .25, 6), M('#24465c')); floor.position.y = -.13; scene.add(floor); const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, .1, 6), M('#5dff7a')); rim.position.y = -.3; scene.add(rim);
  let ch, yaw = .5, drag = false, lx = 0, t0 = performance.now(), jump = 0, alive = true, spin = 0;
  const set = (lk, md) => { if (ch) scene.remove(ch); ch = buildChar(lk, md); scene.add(ch); };
  set(look, mood);
  const down = e => { drag = true; lx = e.clientX; r.domElement.setPointerCapture(e.pointerId); }, move = e => { if (drag) { yaw += (e.clientX - lx) * .012; lx = e.clientX; } }, up = () => { drag = false; };
  r.domElement.addEventListener('pointerdown', down); r.domElement.addEventListener('pointermove', move); r.domElement.addEventListener('pointerup', up);
  const loop = () => {
    if (!alive) return; const t = (performance.now() - t0) / 1000; if (!container.isConnected) return stop();
    const u = ch.userData; if (!drag && !jump) yaw += .004;
    ch.rotation.y = yaw + spin; ch.position.y = Math.sin(t * 2) * .05 + (jump ? Math.abs(Math.sin(jump * Math.PI)) * 1.3 : 0);
    u.armL.rotation.x = Math.sin(t * 2) * .12 + (jump ? -2.6 : 0); u.armR.rotation.x = -Math.sin(t * 2) * .12 + (jump ? -2.6 : 0);
    if (u.head.userData.halo) u.head.userData.halo.position.y = 1.1 + Math.sin(t * 3) * .06;
    if (u.aura) u.aura.parts.forEach((p, i) => { p.m.position.set(Math.cos(t * 1.4 + p.a) * p.r, ((t * .6 + i * .4) % 4.2), Math.sin(t * 1.4 + p.a) * p.r); p.m.rotation.y = t; });
    if (jump) { jump += .018; spin += .16; if (jump >= 1) { jump = 0; spin = 0; } }
    r.render(scene, cam); requestAnimationFrame(loop);
  };
  const stop = () => { alive = false; r.dispose(); };
  requestAnimationFrame(loop);
  return { setLook: set, celebrate() { jump = .001; }, destroy: stop };
}

// ---------------- little portraits for the header / question screen ----------------
let off, offScene, offCam; const snapCache = new Map();
export function snapshotURL(look, mood = 'idle', frame = 'bust') {
  if (!canGL) return '';
  const key = JSON.stringify(look) + mood + frame; if (snapCache.has(key)) return snapCache.get(key);
  if (!off) { off = mkRenderer(220, 220, { preserveDrawingBuffer: true }); off.setPixelRatio(1); off.setSize(220, 220, false); offScene = new THREE.Scene(); lights(offScene); offCam = new THREE.PerspectiveCamera(30, 1, .1, 100); }
  const ch = buildChar(look, mood); ch.rotation.y = .5; offScene.add(ch);
  if (frame === 'bust') { offCam.position.set(0, 3.9, 6.6); offCam.lookAt(0, 3.35, 0); } else { offCam.position.set(0, 3.1, 12); offCam.lookAt(0, 2.1, 0); }
  off.render(offScene, offCam); const url = off.domElement.toDataURL('image/png'); offScene.remove(ch);
  snapCache.set(key, url); if (snapCache.size > 120) snapCache.delete(snapCache.keys().next().value); return url;
}

// ---------------- Block World ----------------
const GRASS = ['#5fb85a', '#58ad53', '#67c262'];
const SPOTS = [[-4, -3], [2, -3], [-4, 2], [3, 3], [-1, -5], [0, 1], [5, -1], [5, 5], [-6, -1], [-2, 4], [-5, 5], [0, -1]];
function structure(id) {
  const g = new THREE.Group();
  if (id === 'oak') { box(1, 3, 1, '#7a5130', 0, 1.5, 0, g); box(3, 2, 3, '#3f9d49', 0, 3.5, 0, g); box(1.6, 1, 1.6, '#4cb55a', 0, 4.8, 0, g); }
  if (id === 'house') { box(4, 3, 4, '#c99a5b', 0, 1.5, 0, g); box(5, 1, 5, '#a8412e', 0, 3.5, 0, g); box(3, 1, 3, '#8f3524', 0, 4.4, 0, g); box(1, 1.8, .15, '#5b3a20', 0, .9, 2.05, g); box(.9, .9, .15, '#9fd8ff', 1.2, 1.7, 2.05, g); box(.9, .9, .15, '#9fd8ff', -1.2, 1.7, 2.05, g); }
  if (id === 'farm') { for (let i = 0; i < 4; i++) { box(5, .25, .8, '#5b3a22', 0, .12, -1.5 + i * 1, g); for (let j = 0; j < 5; j++) box(.4, .5 + (j % 2) * .2, .4, i % 2 ? '#e8c13a' : '#3aa655', -2 + j, .5, -1.5 + i, g); } }
  if (id === 'pond') { box(4, .15, 4, '#3d8be0', 0, .05, 0, g); for (let i = -2; i <= 2; i++) box(1, .18, 1, '#8a5a2b', i, .25, 0, g); box(.2, .6, .2, '#6b4421', -2.2, .5, .6, g); box(.2, .6, .2, '#6b4421', 2.2, .5, .6, g); }
  if (id === 'tower') { box(2, 6, 2, '#8d8d98', 0, 3, 0, g); box(3, .5, 3, '#6b6b76', 0, 6.2, 0, g); [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([x, z]) => box(.5, .6, .5, '#8d8d98', x, 6.7, z, g)); box(.4, .9, .15, '#2b2b36', 0, 4, 1.02, g); }
  if (id === 'camp') { box(1.6, .3, .3, '#6b4421', 0, .2, 0, g); box(.3, .3, 1.6, '#6b4421', 0, .2, 0, g); const f = box(.7, 1, .7, M('#ff8a1f', { emissive: '#ff5a00' }), 0, .7, 0, g); f.userData.flick = 1; box(.35, .6, .35, M('#ffd23a', { emissive: '#ffaa00' }), 0, 1.1, 0, g); const pl = new THREE.PointLight(0xff8a3f, 1.2, 7); pl.position.set(0, 1.2, 0); g.add(pl); [[-1.6, 1], [1.6, 1]].forEach(([x, z]) => box(.7, .5, .7, '#9a9aa6', x, .25, z, g)); }
  if (id === 'mill') { box(2, 4, 2, '#e8dcc0', 0, 2, 0, g); box(2.6, 1, 2.6, '#a8412e', 0, 4.4, 0, g); const bl = new THREE.Group(); bl.position.set(0, 3.4, 1.2); for (let i = 0; i < 4; i++) { const a = box(.35, 3.2, .1, '#f2f2f2', 0, 0, 0, bl); a.rotation.z = i * Math.PI / 2; a.translateY(1.6); } g.add(bl); g.userData.blades = bl; }
  if (id === 'light') { for (let i = 0; i < 5; i++) box(1.8 - i * .12, 1.1, 1.8 - i * .12, i % 2 ? '#d94040' : '#f4f4f4', 0, .55 + i * 1.1, 0, g); box(1.2, 1, 1.2, M('#fff3a0', { emissive: '#ffd23a' }), 0, 6, 0, g); box(1.8, .3, 1.8, '#444', 0, 6.65, 0, g); box(.8, .6, .8, '#d94040', 0, 7.1, 0, g); }
  if (id === 'gate') { [-2, 2].forEach(x => { box(2, 5, 2, '#8d8d98', x, 2.5, 0, g); [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]].forEach(([a, b]) => box(.4, .5, .4, '#8d8d98', x + a, 5.3, b, g)); }); box(6, 1.2, 1.6, '#7c7c88', 0, 4.4, 0, g); box(2, 3, .3, '#3a2a1c', 0, 1.5, 0, g); }
  if (id === 'lib') { box(5, 3, 4, '#7a5230', 0, 1.5, 0, g); box(5.4, .5, 4.4, '#5b3a22', 0, 3.2, 0, g); ['#d94040', '#2f7be0', '#e8c13a', '#2fbf5b', '#8a4fd6'].forEach((c, i) => box(.5, 1.2, .3, c, -1.8 + i * .9, 1.6, 2.05, g)); box(1, 1.8, .15, '#3a2a1c', 0, .9, 2.05, g); }
  if (id === 'portal') { for (let y = 0; y < 5; y++) { box(.7, 1, .7, '#2b1b4a', -1.4, .5 + y, 0, g); box(.7, 1, .7, '#2b1b4a', 1.4, .5 + y, 0, g); } box(3.5, .7, .7, '#2b1b4a', 0, 5.1, 0, g); box(.7, .7, .7, '#2b1b4a', 0, .35, 0, g); const p = box(2.1, 4, .2, M('#a64dff', { emissive: '#7a2bd9', transparent: true, opacity: .8 }), 0, 2.6, 0, g); p.userData.pulse = 1; }
  if (id === 'beacon') { box(3, .6, 3, '#e9e9f0', 0, .3, 0, g); box(2, .6, 2, '#2b2b36', 0, .9, 0, g); box(1, 1, 1, M('#6fffd0', { emissive: '#1fcf9a' }), 0, 1.7, 0, g); const beam = box(.5, 14, .5, M('#9ffff0', { emissive: '#4ff0d0', transparent: true, opacity: .45 }), 0, 9, 0, g); beam.userData.pulse = 1; }
  return g;
}
export function createWorld(container, built = 0, newIdx = -1) {
  if (!canGL) { container.innerHTML = '<div class="nogl">🏝️</div>'; return { destroy() { }, popIn() { } }; }
  const w = container.clientWidth || 400, h = container.clientHeight || 300, r = mkRenderer(w, h), scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, w / h, .1, 200);
  lights(scene); container.innerHTML = ''; container.appendChild(r.domElement); r.domElement.style.cssText = 'width:100%;height:100%;touch-action:none;border-radius:inherit';
  const S = 13, inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ flatShading: true }), S * S), c = new THREE.Color(), m4 = new THREE.Matrix4(); let n = 0;
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) { m4.setPosition(x - 6, 0, z - 6); inst.setMatrixAt(n, m4); inst.setColorAt(n++, c.set(GRASS[(x * 7 + z * 3) % 3])); }
  scene.add(inst); box(S, 1, S, '#7a5a3a', 0, -1, 0, scene); box(S - 2, 1, S - 2, '#6b6b72', 0, -2, 0, scene); box(S - 4, 1, S - 4, '#55555c', 0, -3, 0, scene);
  const sea = box(46, .2, 46, M('#2f80ed', { transparent: true, opacity: .8 }), 0, -1.4, 0, scene);
  const cl = [], mkCloud = (x, y, z) => { const g = new THREE.Group(); [[0, 0], [1.2, .2], [-1.2, .1], [.4, .5]].forEach(([a, b]) => box(2, .8, 1.6, '#ffffff', a, b, 0, g)); g.position.set(x, y, z); scene.add(g); cl.push(g); }; mkCloud(-14, 12, -6); mkCloud(10, 14, -12); mkCloud(2, 13, 8);
  const groups = [], pops = [];
  for (let i = 0; i < built && i < SPOTS.length; i++) { const g = structure(['oak', 'house', 'farm', 'pond', 'tower', 'camp', 'mill', 'light', 'gate', 'lib', 'portal', 'beacon'][i]); g.position.set(SPOTS[i][0], .5, SPOTS[i][1]); scene.add(g); groups.push(g); if (i === newIdx) { g.scale.setScalar(.01); pops.push({ g, t: 0 }); } }
  let yaw = .7, drag = false, lx = 0, alive = true, t0 = performance.now(); const R = 17;
  const d = e => { drag = true; lx = e.clientX; r.domElement.setPointerCapture(e.pointerId); }, mv = e => { if (drag) { yaw += (e.clientX - lx) * .01; lx = e.clientX; } }, u = () => { drag = false; };
  r.domElement.addEventListener('pointerdown', d); r.domElement.addEventListener('pointermove', mv); r.domElement.addEventListener('pointerup', u);
  const stop = () => { alive = false; r.dispose(); };
  const loop = () => {
    if (!alive) return; if (!container.isConnected) return stop(); const t = (performance.now() - t0) / 1000;
    if (!drag) yaw += .0025; cam.position.set(Math.cos(yaw) * R, 10.5, Math.sin(yaw) * R); cam.lookAt(0, 1.2, 0);
    groups.forEach(g => g.traverse(o => { if (o.userData.blades) o.userData.blades.rotation.z = t * 1.2; if (o.userData.flick) o.scale.y = 1 + Math.sin(t * 14) * .18; if (o.userData.pulse) o.material.opacity = .6 + Math.sin(t * 3) * .2; }));
    cl.forEach((c, i) => { c.position.x += .004 * (i + 1); if (c.position.x > 24) c.position.x = -24; });
    pops.forEach(p => { p.t += .025; const s = p.t < 1 ? 1 + Math.sin(p.t * Math.PI) * .3 - (1 - p.t) * 1 : 1; p.g.scale.setScalar(Math.max(.01, Math.min(1.25, s * Math.min(1, p.t * 1.6)))); });
    r.render(scene, cam); requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return { destroy: stop };
}
