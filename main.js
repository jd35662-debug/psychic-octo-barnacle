import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.166.1/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.166.1/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1b1630');
scene.fog = new THREE.Fog('#1b1630', 10, 90);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
// Spawn player at gallery entrance, facing inward.
camera.position.set(0, 1.7, 27);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, renderer.domElement);
const lockBtn = document.getElementById('lockBtn');
const info = document.getElementById('info');
const hud = document.getElementById('hud');

function showMenu() {
  if (controls.isLocked) controls.unlock();
  hud.classList.remove('hidden');
  info.textContent = 'Menu open. Configure slots, then Enter Explore Mode.';
}

function hideMenu() {
  hud.classList.add('hidden');
  info.textContent = 'Exploring. Press ESC to open menu.';
}

function tryLock() {
  try { controls.lock(); } catch (error) { console.error(error); }
}

lockBtn.addEventListener('click', () => (controls.isLocked ? controls.unlock() : tryLock()));
renderer.domElement.addEventListener('click', () => { if (!controls.isLocked && hud.classList.contains('hidden')) tryLock(); });

controls.addEventListener('lock', () => {
  lockBtn.textContent = 'Exit Explore Mode';
  hideMenu();
});
controls.addEventListener('unlock', () => {
  lockBtn.textContent = 'Enter Explore Mode';
  showMenu();
});

addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    if (controls.isLocked) {
      controls.unlock();
    } else {
      hud.classList.toggle('hidden');
      info.textContent = hud.classList.contains('hidden') ? 'Menu closed. Click scene to explore.' : 'Menu open. Configure slots, then Enter Explore Mode.';
    }
  }
});

const keys = new Set();
addEventListener('keydown', e => keys.add(e.code));
addEventListener('keyup', e => keys.delete(e.code));

scene.add(new THREE.AmbientLight('#ffffff', 0.35));
const spot = new THREE.SpotLight('#ffffff', 1.2, 160, Math.PI / 5, 0.35, 1.2);
spot.position.set(0, 18, 10);
spot.castShadow = true;
scene.add(spot);

const room = { width: 16, length: 60, height: 8 };
const corridor = new THREE.Group();
scene.add(corridor);

const mkMat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
const floorBase = new THREE.Mesh(new THREE.BoxGeometry(room.width, 0.2, room.length), mkMat('#2f2c38'));
floorBase.position.set(0, -0.12, 0);
floorBase.receiveShadow = true;
corridor.add(floorBase);

const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, room.height, room.length), mkMat('#4a386d'));
leftWall.position.set(-room.width / 2, room.height / 2, 0);
corridor.add(leftWall);
const rightWall = leftWall.clone(); rightWall.position.x = room.width / 2; corridor.add(rightWall);
const backWall = new THREE.Mesh(new THREE.BoxGeometry(room.width, room.height, 0.3), mkMat('#4b3a70'));
backWall.position.set(0, room.height / 2, -room.length / 2); corridor.add(backWall);
const ceiling = new THREE.Mesh(new THREE.BoxGeometry(room.width, 0.3, room.length), mkMat('#2c2838'));
ceiling.position.set(0, room.height, 0); corridor.add(ceiling);

const tileGroup = new THREE.Group(); scene.add(tileGroup);
const tileSize = 2; const cols = Math.floor(room.width / tileSize); const rows = Math.floor(room.length / tileSize);
const palette = ['#db2e64', '#f1cb20', '#4a95f8', '#53c55a', '#f18f24', '#7e62df'];
const tiles = [];
for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) {
  const mat = new THREE.MeshStandardMaterial({ color: palette[Math.floor(Math.random() * palette.length)], roughness: 0.8 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.08, tileSize), mat);
  mesh.position.set((x - cols / 2) * tileSize + tileSize / 2, 0, (z - rows / 2) * tileSize + tileSize / 2);
  mesh.receiveShadow = true; tileGroup.add(mesh); tiles.push(mesh);
}

const ceilingPanelMat = new THREE.MeshStandardMaterial({ color: '#f3f4f7', emissive: '#e5e7f2', emissiveIntensity: 0.35 });
for (let i = 0; i < 11; i++) {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1), ceilingPanelMat);
  panel.position.set(0, room.height - 0.22, 22 - i * 4.8); corridor.add(panel);
  const light = new THREE.PointLight('#ffffff', 0.35, 14, 2);
  light.position.set(0, room.height - 0.6, 22 - i * 4.8); corridor.add(light);
}

const pedMat = new THREE.MeshStandardMaterial({ color: '#d7d7dd', roughness: 0.55 });
const statueSlots = [];
for (let i = 0; i < 6; i++) {
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 1.4, 32), pedMat);
  if (i === 0) {
    pedestal.position.set(0, 1.75, -26.5); pedestal.scale.setScalar(1.2);
  } else {
    const side = i % 2 === 0 ? -1 : 1; const lane = Math.ceil(i / 2);
    pedestal.position.set(side * (room.width / 2 - 1.6), 0.7, -6 - lane * 8.2);
  }
  pedestal.castShadow = true; pedestal.receiveShadow = true; scene.add(pedestal);
  const holder = new THREE.Group(); holder.position.set(pedestal.position.x, 1.5, pedestal.position.z); scene.add(holder);
  statueSlots.push({ holder, model: null });
}
const heroPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 1.8, 40), pedMat);
heroPedestal.position.set(0, 0.9, -26.5); heroPedestal.castShadow = true; heroPedestal.receiveShadow = true; scene.add(heroPedestal);

const DEFAULT_PAINTING_SIZES = [{ label: '8x10', w: 1.6, h: 2.0 }, { label: '11x14', w: 1.9, h: 2.4 }, { label: '16x20', w: 2.0, h: 2.5 }, { label: '24x36', w: 2.2, h: 3.3 }];
const paintingMeshes = [];
function addPainting(x, y, z, ry) {
  const size = DEFAULT_PAINTING_SIZES[Math.floor(Math.random() * DEFAULT_PAINTING_SIZES.length)];
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88 }); // blank white default
  const frame = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, 0.08), mat);
  frame.position.set(x, y + size.h / 3.2, z); frame.rotation.y = ry; scene.add(frame); paintingMeshes.push(frame);
}
for (let i = -6; i <= 6; i += 2) {
  addPainting(-room.width / 2 + 0.05, 1.8, i * 3.6, Math.PI / 2);
  addPainting(room.width / 2 - 0.05, 1.8, i * 3.6, -Math.PI / 2);
}

const loader = new GLTFLoader();
const slotSelect = document.getElementById('slotSelect');
for (let i = 0; i < statueSlots.length; i++) {
  const o = document.createElement('option'); o.value = i; o.textContent = `Statue Slot ${i + 1}`; slotSelect.appendChild(o);
}

function clearStatueSlot(slotIndex) {
  const slot = statueSlots[slotIndex];
  if (slot.model) slot.holder.remove(slot.model);
  slot.model = null;
}

function placeStatueAt(slotIndex, file) {
  const url = URL.createObjectURL(file);
  loader.load(url, gltf => {
    const slot = statueSlots[slotIndex];
    if (slot.model) slot.holder.remove(slot.model);
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3(); box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    model.scale.setScalar(2.2 / maxDim);
    model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    slot.holder.add(model); slot.model = model; URL.revokeObjectURL(url);
  });
}

document.getElementById('statueInput').addEventListener('change', event => {
  const files = [...event.target.files]; let slot = Number(slotSelect.value);
  files.forEach(file => { placeStatueAt(slot, file); slot = (slot + 1) % statueSlots.length; });
});
document.getElementById('clearStatueBtn').addEventListener('click', () => clearStatueSlot(Number(slotSelect.value)));

const paintingSlotSelect = document.getElementById('paintingSlotSelect');
for (let i = 0; i < paintingMeshes.length; i++) {
  const o = document.createElement('option'); o.value = i; o.textContent = `Painting Slot ${i + 1}`; paintingSlotSelect.appendChild(o);
}

const textureLoader = new THREE.TextureLoader();
function clearPaintingSlot(idx) {
  paintingMeshes[idx].material.map = null;
  paintingMeshes[idx].material.color.set('#ffffff');
  paintingMeshes[idx].material.needsUpdate = true;
}
function applyPaintingImages(files) {
  let idx = Number(paintingSlotSelect.value);
  files.forEach(file => {
    if (idx >= paintingMeshes.length) return;
    const url = URL.createObjectURL(file);
    textureLoader.load(url, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      paintingMeshes[idx].material.map = tex;
      paintingMeshes[idx].material.needsUpdate = true;
      URL.revokeObjectURL(url);
    });
    idx += 1;
  });
}
document.getElementById('paintingInput').addEventListener('change', event => applyPaintingImages([...event.target.files]));
document.getElementById('clearPaintingBtn').addEventListener('click', () => clearPaintingSlot(Number(paintingSlotSelect.value)));

showMenu();
const clock = new THREE.Clock();
let colorTimer = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta(); colorTimer += dt;
  if (controls.isLocked) {
    const speed = 8 * dt;
    if (keys.has('KeyW')) controls.moveForward(speed);
    if (keys.has('KeyS')) controls.moveForward(-speed);
    if (keys.has('KeyA')) controls.moveRight(-speed);
    if (keys.has('KeyD')) controls.moveRight(speed);
    camera.position.y = 1.7;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -room.width / 2 + 0.7, room.width / 2 - 0.7);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -room.length / 2 + 0.7, room.length / 2 - 0.7);
  }
  if (colorTimer > 0.33) {
    colorTimer = 0;
    for (const tile of tiles) if (Math.random() < 0.04) tile.material.color.set(palette[Math.floor(Math.random() * palette.length)]);
  }
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
