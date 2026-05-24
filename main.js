import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.166.1/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.166.1/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1b1630');
scene.fog = new THREE.Fog('#1b1630', 10, 90);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 1.7, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, renderer.domElement);
const lockBtn = document.getElementById('lockBtn');
lockBtn.addEventListener('click', () => (controls.isLocked ? controls.unlock() : controls.lock()));

const keys = new Set();
addEventListener('keydown', e => keys.add(e.code));
addEventListener('keyup', e => keys.delete(e.code));

scene.add(new THREE.AmbientLight('#ffffff', 0.35));
const spot = new THREE.SpotLight('#ffffff', 1.2, 160, Math.PI / 5, 0.35, 1.2);
spot.position.set(0, 18, 10);
spot.castShadow = true;
scene.add(spot);

const room = { width: 16, length: 60, height: 8 };

const walls = new THREE.Mesh(
  new THREE.BoxGeometry(room.width, room.height, room.length),
  new THREE.MeshStandardMaterial({ color: '#3d2f69', side: THREE.BackSide, roughness: 0.95 })
);
walls.position.y = room.height / 2;
scene.add(walls);

const tileGroup = new THREE.Group();
scene.add(tileGroup);
const tileSize = 2;
const cols = Math.floor(room.width / tileSize);
const rows = Math.floor(room.length / tileSize);
const palette = ['#db2e64', '#f1cb20', '#4a95f8', '#53c55a', '#f18f24', '#7e62df'];
const tiles = [];
for (let z = 0; z < rows; z++) {
  for (let x = 0; x < cols; x++) {
    const mat = new THREE.MeshStandardMaterial({ color: palette[Math.floor(Math.random() * palette.length)], roughness: 0.8 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.08, tileSize), mat);
    mesh.position.set((x - cols / 2) * tileSize + tileSize / 2, 0, (z - rows / 2) * tileSize + tileSize / 2);
    mesh.receiveShadow = true;
    tileGroup.add(mesh);
    tiles.push(mesh);
  }
}

const pedMat = new THREE.MeshStandardMaterial({ color: '#d7d7dd', roughness: 0.55 });
const statueSlots = [];
for (let i = 0; i < 6; i++) {
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 1.4, 32), pedMat);
  pedestal.position.set((i - 2.5) * 2.3, 0.7, -22);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  scene.add(pedestal);
  const holder = new THREE.Group();
  holder.position.set(pedestal.position.x, 1.5, pedestal.position.z);
  scene.add(holder);
  statueSlots.push({ holder, model: null });
}

const paintingMeshes = [];
function addPainting(x, y, z, ry, texture = null) {
  const mat = new THREE.MeshStandardMaterial({ color: '#e6e0d0', map: texture });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 0.08), mat);
  frame.position.set(x, y, z);
  frame.rotation.y = ry;
  scene.add(frame);
  paintingMeshes.push(frame);
}
for (let i = -6; i <= 6; i += 2) {
  addPainting(-room.width / 2 + 0.05, 2.8, i * 3.6, Math.PI / 2);
  addPainting(room.width / 2 - 0.05, 2.8, i * 3.6, -Math.PI / 2);
}

const loader = new GLTFLoader();
const slotSelect = document.getElementById('slotSelect');
for (let i = 0; i < statueSlots.length; i++) {
  const o = document.createElement('option');
  o.value = i;
  o.textContent = `Slot ${i + 1}`;
  slotSelect.appendChild(o);
}

function placeStatueAt(slotIndex, file) {
  const url = URL.createObjectURL(file);
  loader.load(
    url,
    gltf => {
      const slot = statueSlots[slotIndex];
      if (slot.model) slot.holder.remove(slot.model);
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 2.2 / maxDim;
      model.scale.setScalar(scale);
      model.position.set(0, 0, 0);
      model.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      slot.holder.add(model);
      slot.model = model;
      URL.revokeObjectURL(url);
    },
    undefined,
    err => console.error('Could not load model', err)
  );
}

document.getElementById('statueInput').addEventListener('change', event => {
  const files = [...event.target.files];
  let slot = Number(slotSelect.value);
  files.forEach(file => {
    placeStatueAt(slot, file);
    slot = (slot + 1) % statueSlots.length;
  });
});

const textureLoader = new THREE.TextureLoader();
function applyPaintingImages(files) {
  files.slice(0, paintingMeshes.length).forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    textureLoader.load(url, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      paintingMeshes[idx].material.map = tex;
      paintingMeshes[idx].material.needsUpdate = true;
      URL.revokeObjectURL(url);
    });
  });
}

document.getElementById('paintingInput').addEventListener('change', event => {
  applyPaintingImages([...event.target.files]);
});

const clock = new THREE.Clock();
let colorTimer = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  colorTimer += dt;

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
    for (const tile of tiles) {
      if (Math.random() < 0.04) {
        tile.material.color.set(palette[Math.floor(Math.random() * palette.length)]);
      }
    }
  }

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
