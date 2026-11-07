// Watak chibi 3D berjalan atas lantai gambar sebenar (IMG_9070, kaunter Karisma).
// Dirender dengan latar TELUS, kemudian digabung oleh promo-video/render.py
// (teks dinding dahulu, watak di atasnya -> watak lalu DI DEPAN tulisan).
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { mesh, toon, prog, easeInOut, clamp, lerp } from './lib/toon.js';
import { makeStaff, walkCycle, resetPose } from './lib/characters.js';

export const FPS = 30;
const W = 1080, H = 1920;

// ---------------------------------------------------------------------------
// Kalibrasi kamera ikut gambar asal IMG_9070 (1320x2619 piksel).
// Garis ufuk di tengah gambar (kamera tidak condong), fokus ~943px (lensa iPhone),
// tinggi kamera dikira dari nisbah dinding kaunter (~1.05m) => 1.52m.
// ---------------------------------------------------------------------------
const IMG_W = 1320, IMG_H = 2619, F = 943, CAM_H = 1.52;
const CX = IMG_W / 2, CY = IMG_H / 2;
const CROP = { x: 170, y: 806, w: 1020, h: 1813 };   // sama dengan 'crop' babak 1 dalam render.py
const S = W / CROP.w;

const camera = new THREE.PerspectiveCamera(
  THREE.MathUtils.radToDeg(2 * Math.atan(CY / F)), IMG_W / IMG_H, 0.05, 100);
camera.position.set(0, CAM_H, 0);
camera.lookAt(0, CAM_H, -1);
camera.setViewOffset(IMG_W * S, IMG_H * S, CROP.x * S, CROP.y * S, W, H);

// Titik lantai (y=0) dari koordinat piksel gambar asal
function floorPoint(u, v) {
  const z = F * CAM_H / (v - CY);
  return new THREE.Vector2((u - CX) * CAM_H / (v - CY), -z);
}
// Garis kaki dinding kaunter (diukur dari gambar)
const WA = floorPoint(1300, 1975);
const WB = floorPoint(450, 1690);
const WALL_DIR = WB.clone().sub(WA).normalize();                 // menjauh ke kiri
let WALL_N = new THREE.Vector2(-WALL_DIR.y, WALL_DIR.x);           // normal dinding
if (WALL_N.dot(WA.clone().negate()) < 0) WALL_N.negate();          // menghala ke kamera
const WALL_H = 1.05;

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
Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 20 });
scene.add(sun, sun.target);

// Lantai telus yang hanya terima bayang
const shadowMat = new THREE.ShadowMaterial({ opacity: 0.30 });
shadowMat.userData.outlineParameters = { visible: false };
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), shadowMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Bayang lembut di bawah kaki (supaya watak "berdiri" atas lantai)
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
const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), blobMat);
blob.rotation.x = -Math.PI / 2;
blob.position.y = 0.002;
scene.add(blob);

// ---------------------------------------------------------------------------
// Watak: staf Karisma (tudung biru, tag nama KARISMA) + kunci kereta
// ---------------------------------------------------------------------------
const CHAR_HEIGHT = 1.30;                       // tinggi maskot dalam meter
const chibi = makeStaff();
const SCALE = CHAR_HEIGHT / 2.18;
chibi.root.scale.setScalar(SCALE);
scene.add(chibi.root);

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
  const ring = mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 20), '#c9ced8');
  ring.position.y = 0.0;
  k.add(ring);
  return k;
}
const key = makeKey();
key.position.set(0, -0.04, 0.03);
chibi.armL.userData.hand.add(key);

// Laluan: selari dengan dinding, 0.45m di depan dinding, berjalan ke arah kamera.
const OFFSET = 0.45;
function pathPoint(s) {
  return WA.clone().addScaledVector(WALL_N, OFFSET).addScaledVector(WALL_DIR, s);
}
// ---------------------------------------------------------------------------
// Babak 1: jalan perlahan -> berhenti di depan tulisan (toleh, angkat kunci, lambai)
//          -> sambung jalan keluar ke kanan.
// ---------------------------------------------------------------------------
const S_START = 4.4;            // mula di luar bingkai kiri
const WALK = 0.8;               // kelajuan berjalan (m/s) - perlahan
const STOP_IN = [3.6, 4.1];     // mula perlahan -> berhenti
const STOP_OUT = [5.2, 5.6];    // mula jalan semula -> laju biasa
const FACE = Math.atan2(-WALL_DIR.x, -WALL_DIR.y); // menghadap arah jalan (ke kamera)

function speedAt(t) {
  const down = 1 - easeInOut(prog(t, STOP_IN[0], STOP_IN[1]));
  const up = easeInOut(prog(t, STOP_OUT[0], STOP_OUT[1]));
  return WALK * Math.max(down, up);
}
// Jarak berjalan = kamiran kelajuan (dikira semula setiap frame -> deterministik)
function distAt(t) {
  const dt = 1 / 240;
  let d = 0;
  for (let x = 0; x < t; x += dt) d += speedAt(Math.min(x + dt / 2, t)) * Math.min(dt, t - x);
  return d;
}

window.renderFrame = function (frame) {
  const t = frame / FPS;
  const dist = distAt(t);
  const s = S_START - dist;
  const p = pathPoint(s);
  const moving = speedAt(t) / WALK;                       // 1 = berjalan, 0 = berhenti
  const stop = easeInOut(prog(t, 3.7, 4.2)) * (1 - easeInOut(prog(t, 5.1, 5.5)));

  resetPose(chibi);
  chibi.root.position.set(p.x, 0, p.y);
  const toCam = Math.atan2(-p.x, -p.y);
  chibi.root.rotation.y = lerp(FACE, toCam, 0.75 * stop);   // pusing ke kamera semasa berhenti
  walkCycle(chibi, dist * 7.5, moving);

  // Kepala toleh ke kamera
  const look = easeInOut(prog(t, 3.3, 3.9)) * (1 - easeInOut(prog(t, 5.6, 6.2)));
  chibi.head.rotation.y = (toCam - chibi.root.rotation.y) * 0.8 * look;
  chibi.head.rotation.z = Math.sin(t * 2.2) * 0.05 * stop;

  // Lambai (tangan kanan, menghadap kamera)
  const wave = easeInOut(prog(t, 4.1, 4.4)) * (1 - easeInOut(prog(t, 5.0, 5.3)));
  if (wave > 0) {
    chibi.armR.rotation.x = lerp(chibi.armR.rotation.x, 0, wave);
    chibi.armR.rotation.z = lerp(-0.18, -2.15 + Math.sin((t - 4.1) * 13) * 0.3, wave);
  }
  // Tangan kiri: pegang kunci; semasa berhenti angkat kunci ke depan untuk ditunjuk
  chibi.armL.rotation.x = lerp(chibi.armL.rotation.x - 0.35, -1.25, stop);
  chibi.armL.rotation.z = lerp(chibi.armL.rotation.z, 0.35, stop);
  // Badan sedikit "bob" gembira semasa berhenti
  chibi.rig.position.y += Math.abs(Math.sin(t * 6)) * 0.03 * stop;

  blob.position.set(p.x, 0.002, p.y);
  sun.position.set(p.x - 1.5, 5, p.y + 2.5);
  sun.target.position.set(p.x, 0, p.y);

  effect.render(scene, camera);
  return { t, s };
};

// Mod semakan: tunjuk dinding & grid lantai untuk padankan perspektif dengan gambar
window.debugGuides = function () {
  const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  mat.userData.outlineParameters = { visible: false };
  const len = 6;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, WALL_H), mat);
  const mid = WA.clone().addScaledVector(WALL_DIR, len / 2 - 0.6);
  wall.position.set(mid.x, WALL_H / 2, mid.y);
  wall.rotation.y = Math.atan2(WALL_N.x, WALL_N.y);
  scene.add(wall);
  const grid = new THREE.GridHelper(12, 24, 0x00ffff, 0x00ffff);
  grid.position.set(WA.x, 0.001, WA.y);
  grid.rotation.y = Math.atan2(WALL_DIR.x, WALL_DIR.y);
  scene.add(grid);
};

window.READY = true;
