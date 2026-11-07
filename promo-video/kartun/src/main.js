// Watak chibi 3D berjalan atas lantai gambar sebenar, dirender dengan latar TELUS.
// Digabung oleh promo-video/render.py (gambar + tulisan dahulu, watak di atasnya).
//
// Pilih babak guna URL: src/index.html?babak=1  (atau 2)
// Nombor frame yang diberi kepada renderFrame() ialah frame GLOBAL video (30fps),
// sama seperti masa dalam SCENES di render.py.
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { mesh, prog, easeInOut, lerp } from './lib/toon.js';
import { makeStaff, makeCustomer, walkCycle, resetPose } from './lib/characters.js';

export const FPS = 30;
const W = 1080, H = 1920;
const BABAK = Number(new URLSearchParams(location.search).get('babak') || 1);

// ---------------------------------------------------------------------------
// Pemapar (latar telus), cahaya, lantai bayang
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('stage').appendChild(renderer.domElement);
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0042, defaultColor: [0.1, 0.09, 0.12] });

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xf4f7ff, 0x8a8f9c, 1.85));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 4;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.1, far: 25 });
scene.add(sun, sun.target);

const shadowMat = new THREE.ShadowMaterial({ opacity: 0.30 });
shadowMat.userData.outlineParameters = { visible: false };
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), shadowMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function blobTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false });
blobMat.userData.outlineParameters = { visible: false };
function makeBlob() {
  const b = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), blobMat);
  b.rotation.x = -Math.PI / 2;
  b.position.y = 0.002;
  scene.add(b);
  return b;
}

// ---------------------------------------------------------------------------
// Kamera dipadankan dengan gambar: titik utama di tengah gambar asal, kamera lurus
// (tidak condong), fokus F piksel, tinggi CAM_H meter. Crop sama dengan render.py.
// ---------------------------------------------------------------------------
function photoCamera({ imgW, imgH, F, camH, crop }) {
  const s = W / crop.w;
  const cam = new THREE.PerspectiveCamera(
    THREE.MathUtils.radToDeg(2 * Math.atan(imgH / 2 / F)), imgW / imgH, 0.05, 100);
  cam.position.set(0, camH, 0);
  cam.lookAt(0, camH, -1);
  cam.setViewOffset(imgW * s, imgH * s, crop.x * s, crop.y * s, W, H);
  // Titik lantai dari piksel gambar asal (u, v) -> (x, z) dunia
  const floorPoint = (u, v) => {
    const k = camH / (v - imgH / 2);
    return new THREE.Vector2((u - imgW / 2) * k, -F * k);
  };
  return { cam, floorPoint };
}

// ---------------------------------------------------------------------------
// Watak
// ---------------------------------------------------------------------------
const CHAR_HEIGHT = 1.30;                       // tinggi maskot (meter)
function placeChar(c, height = CHAR_HEIGHT) {
  c.root.scale.setScalar(height / 2.18);
  scene.add(c.root);
  c.blob = makeBlob();
  return c;
}
function makeKey() {
  const k = new THREE.Group();
  const fob = mesh(new THREE.BoxGeometry(0.09, 0.13, 0.04), '#2f6fd6');
  fob.position.y = -0.08;
  k.add(fob);
  const btn = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 12), '#ffd34d', { outline: false });
  btn.rotation.x = Math.PI / 2; btn.position.set(0, -0.06, 0.022);
  k.add(btn);
  const blade = mesh(new THREE.BoxGeometry(0.03, 0.12, 0.012), '#c9ced8');
  blade.position.y = -0.2;
  k.add(blade);
  k.add(mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 20), '#c9ced8'));
  return k;
}

// Kelajuan dengan mula/berhenti lembut; jarak = kamiran kelajuan (deterministik)
function makeWalk(segments) {
  // segments: [{ t0, t1, v }] -> berjalan pada kelajuan v antara t0..t1 (lembut di hujung)
  const speedAt = (t) => {
    let v = 0;
    for (const s of segments) {
      const k = Math.min(easeInOut(prog(t, s.t0, s.t0 + 0.4)), 1 - easeInOut(prog(t, s.t1 - 0.45, s.t1)));
      v = Math.max(v, s.v * k);
    }
    return v;
  };
  const distAt = (t) => {
    const dt = 1 / 240;
    let d = 0;
    for (let x = 0; x < t; x += dt) d += speedAt(Math.min(x + dt / 2, t)) * Math.min(dt, t - x);
    return d;
  };
  return { speedAt, distAt };
}

// Kedudukan sepanjang garis berbilang titik, ikut jarak d
function polyline(points) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const len = a.distanceTo(b);
    segs.push({ a, b, len, start: total });
    total += len;
  }
  const at = (d) => {
    d = Math.max(0, Math.min(total, d));
    const s = segs.find((x) => d <= x.start + x.len) || segs[segs.length - 1];
    return s.a.clone().lerp(s.b, s.len ? (d - s.start) / s.len : 0);
  };
  return { at, total };
}

const heading = (from, to) => Math.atan2(to.x - from.x, to.y - from.y); // rotation.y untuk hadap 'to'
function lerpAngle(a, b, k) {
  let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return a + d * k;
}

// ===========================================================================
// BABAK 1 - kaunter luar (IMG_9070). 0 - 9.0s global
// Staf jalan perlahan -> berhenti di depan tulisan (toleh, angkat kunci, lambai) -> keluar
// ===========================================================================
function babak1() {
  const { cam, floorPoint } = photoCamera({
    imgW: 1320, imgH: 2619, F: 943, camH: 1.52, crop: { x: 170, y: 806, w: 1020, h: 1813 } });
  const WA = floorPoint(1300, 1975);
  const WB = floorPoint(450, 1690);
  const WALL_DIR = WB.clone().sub(WA).normalize();
  const WALL_N = new THREE.Vector2(-WALL_DIR.y, WALL_DIR.x);
  if (WALL_N.dot(WA.clone().negate()) < 0) WALL_N.negate();
  const pathPoint = (s) => WA.clone().addScaledVector(WALL_N, 0.45).addScaledVector(WALL_DIR, s);

  const staff = placeChar(makeStaff());
  const key = makeKey();
  key.position.set(0, -0.04, 0.03);
  staff.armL.userData.hand.add(key);

  const S_START = 4.4, WALK = 0.8;
  const walk = makeWalk([{ t0: -1, t1: 4.1, v: WALK }, { t0: 5.2, t1: 99, v: WALK }]);
  const FACE = Math.atan2(-WALL_DIR.x, -WALL_DIR.y);

  function update(t) {
    const dist = walk.distAt(t);                        // laju penuh sejak t=0
    const p = pathPoint(S_START - dist);
    const moving = walk.speedAt(t) / WALK;
    const stop = easeInOut(prog(t, 3.7, 4.2)) * (1 - easeInOut(prog(t, 5.1, 5.5)));

    resetPose(staff);
    staff.root.position.set(p.x, 0, p.y);
    const toCam = Math.atan2(-p.x, -p.y);
    staff.root.rotation.y = lerp(FACE, toCam, 0.75 * stop);
    walkCycle(staff, dist * 7.5, moving);

    const look = easeInOut(prog(t, 3.3, 3.9)) * (1 - easeInOut(prog(t, 5.6, 6.2)));
    staff.head.rotation.y = (toCam - staff.root.rotation.y) * 0.8 * look;
    staff.head.rotation.z = Math.sin(t * 2.2) * 0.05 * stop;

    const wave = easeInOut(prog(t, 4.1, 4.4)) * (1 - easeInOut(prog(t, 5.0, 5.3)));
    if (wave > 0) {
      staff.armR.rotation.x = lerp(staff.armR.rotation.x, 0, wave);
      staff.armR.rotation.z = lerp(-0.18, -2.15 + Math.sin((t - 4.1) * 13) * 0.3, wave);
    }
    staff.armL.rotation.x = lerp(staff.armL.rotation.x - 0.35, -1.25, stop);
    staff.armL.rotation.z = lerp(staff.armL.rotation.z, 0.35, stop);
    staff.rig.position.y += Math.abs(Math.sin(t * 6)) * 0.03 * stop;

    staff.blob.position.set(p.x, 0.002, p.y);
    sun.position.set(p.x - 1.5, 5, p.y + 2.5);
    sun.target.position.set(p.x, 0, p.y);
  }
  return { cam, update, t0: 0 };
}

// ===========================================================================
// BABAK 2 - pintu masuk "car rental" (IMG_9072). 8.65 - 15.2s global
// Staf bawa pelanggan masuk ke dalam ofis, menuju meja kaunter di dalam.
// Dinding depan kedai (selain bukaan pintu) melindungi watak bila mereka masuk ke dalam.
// ===========================================================================
function babak2() {
  const F = 1000, CAM_H = 1.5;
  const { cam, floorPoint } = photoCamera({
    imgW: 1284, imgH: 1614, F, camH: CAM_H, crop: { x: 0, y: 0, w: 908, h: 1614 } });

  // Dinding depan kedai: garis bawah pintu pada v=1295 piksel
  const wallZ = floorPoint(642, 1295).y;                    // negatif (depan kamera)
  const xAt = (u) => (u - 642) * (-wallZ) / F;              // x dunia pada satah dinding
  const doorL = xAt(405), doorR = xAt(840);                  // bingkai pintu (termasuk kaca)
  const doorTop = CAM_H - (495 - 807) * (-wallZ) / F;       // atas bingkai pintu

  // Penghalang tidak kelihatan: tulis kedalaman sahaja -> watak di belakangnya hilang
  const occMat = new THREE.MeshBasicMaterial({ colorWrite: false });
  occMat.userData.outlineParameters = { visible: false };
  const addOcc = (x0, x1, y0, y1) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), occMat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, wallZ);
    m.renderOrder = -1;
    scene.add(m);
  };
  addOcc(-20, doorL, -1, 10);          // dinding kiri pintu
  addOcc(doorR, 20, -1, 10);           // dinding kanan pintu
  addOcc(doorL, doorR, doorTop, 10);   // atas pintu

  const doorMid = new THREE.Vector2(xAt(612), wallZ);
  const desk = floorPoint(560, 1080);                       // depan meja kaunter dalam ofis

  const staff = placeChar(makeStaff());
  const key = makeKey();
  key.position.set(0, -0.04, 0.03);
  staff.armL.userData.hand.add(key);
  const cust = placeChar(makeCustomer(), 1.36);

  // Laluan: luar (dekat kamera) -> tengah pintu -> dalam ofis ke meja
  const staffPath = polyline([
    new THREE.Vector2(0.30, -2.35),
    new THREE.Vector2(doorMid.x + 0.02, wallZ + 0.35),
    new THREE.Vector2(doorMid.x - 0.02, wallZ - 0.35),
    new THREE.Vector2(desk.x + 0.12, desk.y + 0.25),
  ]);
  const custPath = polyline([
    new THREE.Vector2(0.62, -1.75),
    new THREE.Vector2(doorMid.x + 0.05, wallZ + 0.35),
    new THREE.Vector2(doorMid.x + 0.03, wallZ - 0.35),
    new THREE.Vector2(desk.x + 0.62, desk.y + 0.55),
  ]);
  const T0 = 8.65, V = 0.75;
  const staffWalk = makeWalk([{ t0: 0.1, t1: 0.1 + staffPath.total / V + 0.45, v: V }]);
  const custWalk = makeWalk([{ t0: 0.55, t1: 0.55 + custPath.total / V + 0.45, v: V }]);

  function pose(c, path, walk, tl, finalFace) {
    const d = walk.distAt(tl);
    const p = path.at(d);
    const ahead = path.at(d + 0.35);
    const moving = walk.speedAt(tl) / V;
    resetPose(c);
    c.root.position.set(p.x, 0, p.y);
    const hd = d >= path.total - 0.01 ? null : heading(p, ahead);
    c.root.rotation.y = hd === null ? finalFace : lerpAngle(finalFace, hd, Math.min(1, moving * 1.5));
    walkCycle(c, d * 7.5, moving);
    c.blob.position.set(p.x, 0.002, p.y);
    return { p, d, moving };
  }

  function update(t) {
    const tl = t - T0;
    // Arah akhir: staf & pelanggan berhadapan di meja
    const sEnd = staffPath.at(staffPath.total), cEnd = custPath.at(custPath.total);
    const s = pose(staff, staffPath, staffWalk, tl, heading(sEnd, cEnd));
    const c = pose(cust, custPath, custWalk, tl, heading(cEnd, sEnd));

    // Staf toleh ke belakang (ke pelanggan) & tunjuk ke pintu: "jom masuk"
    const lookBack = easeInOut(prog(tl, 0.3, 0.8)) * (1 - easeInOut(prog(tl, 1.9, 2.4)));
    staff.head.rotation.y = 1.15 * lookBack;
    const point = easeInOut(prog(tl, 0.4, 0.8)) * (1 - easeInOut(prog(tl, 1.8, 2.2)));
    if (point > 0) {
      staff.armR.rotation.x = lerp(staff.armR.rotation.x, -1.35, point);
      staff.armR.rotation.z = lerp(staff.armR.rotation.z, -0.25, point);
    }
    staff.armL.rotation.x -= 0.3;
    // Pelanggan dongak ke tulisan "HARGA BERPATUTAN"
    const up = easeInOut(prog(tl, 3.0, 3.4)) * (1 - easeInOut(prog(tl, 4.2, 4.6)));
    cust.head.rotation.x = -0.35 * up;
    // Di meja: staf hulur kunci, pelanggan angguk
    const give = easeInOut(prog(tl, 5.6, 6.0));
    staff.armL.rotation.x = lerp(staff.armL.rotation.x, -1.3, give);
    cust.head.rotation.x += Math.sin(Math.max(0, tl - 5.8) * 9) * 0.12 * give;

    const mid = s.p.clone().add(c.p).multiplyScalar(0.5);
    sun.position.set(mid.x - 1.2, 5, mid.y + 2.5);
    sun.target.position.set(mid.x, 0, mid.y);
  }
  return { cam, update, t0: T0 };
}

const B = BABAK === 2 ? babak2() : babak1();

window.renderFrame = function (frame) {
  const t = frame / FPS;
  B.update(t);
  effect.render(scene, B.cam);
  return t;
};

// Mod semakan: grid lantai untuk padankan perspektif dengan gambar
window.debugGuides = function () {
  const grid = new THREE.GridHelper(20, 40, 0x00ffff, 0x00ffff);
  grid.position.y = 0.001;
  scene.add(grid);
};

window.READY = true;
