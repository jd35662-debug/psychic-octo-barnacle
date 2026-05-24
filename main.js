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
const info = document.getElementById('info');

function tryLock() {
  try {
    controls.lock();
  } catch (error) {
    console.error('Pointer lock request failed.', error);
    info.textContent = 'Explore mode failed. Click directly on the 3D scene and ensure the browser tab is focused.';
  }
}

lockBtn.addEventListener('click', () => {
  if (controls.isLocked) {
    controls.unlock();
    return;
  }
  tryLock();
});

renderer.domElement.addEventListener('click', () => {
  if (!controls.isLocked) tryLock();
});

controls.addEventListener('lock', () => {
  lockBtn.textContent = 'Exit Explore Mode';
  info.textContent = 'Explore mode active: WASD to move, mouse to look, ESC to unlock.';
});

controls.addEventListener('unlock', () => {
  lockBtn.textContent = 'Enter Explore Mode';
  info.textContent = 'Click "Enter Explore Mode" or click the scene to start exploring.';
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

const floorBase = new THREE.Mesh(
  new THREE.BoxGeometry(room.width, 0.2, room.length),
  new THREE.MeshStandardMaterial({ color: '#2f2c38', roughness: 0.95 })
);
floorBase.position.set(0, -0.12, 0);
floorBase.receiveShadow = true;
corridor.add(floorBase);

const leftWall = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, room.height, room.length),
  new THREE.MeshStandardMaterial({ color: '#4a386d', roughness: 0.92 })
);
leftWall.position.set(-room.width / 2, room.height / 2, 0);
corridor.add(leftWall);

const rightWall = leftWall.clone();
rightWall.position.x = room.width / 2;
corridor.add(rightWall);

const backWall = new THREE.Mesh(
  new THREE.BoxGeometry(room.width, room.height, 0.3),
  new THREE.MeshStandardMaterial({ color: '#4b3a70', roughness: 0.9 })
);
backWall.position.set(0, room.height / 2, -room.length / 2);
corridor.add(backWall);

const ceiling = new THREE.Mesh(
  new THREE.BoxGeometry(room.width, 0.3, room.length),
  new THREE.MeshStandardMaterial({ color: '#2c2838', roughness: 0.8 })
);
ceiling.position.set(0, room.height, 0);
corridor.add(ceiling);

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

const ceilingPanelMat = new THREE.MeshStandardMaterial({ color: '#f3f4f7', emissive: '#e5e7f2', emissiveIntensity: 0.35 });
for (let i = 0; i < 11; i++) {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1), ceilingPanelMat);
  panel.position.set(0, room.height - 0.22, 22 - i * 4.8);
  corridor.add(panel);
  const panelLight = new THREE.PointLight('#ffffff', 0.35, 14, 2);
  panelLight.position.set(panel.position.x, panel.position.y - 0.35, panel.position.z);
  corridor.add(panelLight);
}

const pedMat = new THREE.MeshStandardMaterial({ color: '#d7d7dd', roughness: 0.55 });
const statueSlots = [];
for (let i = 0; i < 6; i++) {
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 1.4, 32), pedMat);
  if (i === 0) {
    pedestal.position.set(0, 1.75, -26.5);
    pedestal.scale.setScalar(1.2);
  } else {
    const side = i % 2 === 0 ? -1 : 1;
    const lane = Math.ceil(i / 2);
    pedestal.position.set(side * (room.width / 2 - 1.6), 0.7, -6 - lane * 8.2);
  }
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  scene.add(pedestal);
  const holder = new THREE.Group();
  holder.position.set(pedestal.position.x, 1.5, pedestal.position.z);
  scene.add(holder);
  statueSlots.push({ holder, model: null });
}

const heroPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 1.8, 40), pedMat);
heroPedestal.position.set(0, 0.9, -26.5);
heroPedestal.castShadow = true;
heroPedestal.receiveShadow = true;
scene.add(heroPedestal);

const DEFAULT_PAINTING_SIZES = [
  { label: '8x10', w: 1.6, h: 2.0 },
  { label: '11x14', w: 1.9, h: 2.4 },
  { label: '16x20', w: 2.0, h: 2.5 },
  { label: '24x36', w: 2.2, h: 3.3 }
];

const paintingMeshes = [];
function createRandomPlaceholderTexture(sizeLabel) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const colorSet = ['#e63946', '#f4a261', '#f1fa8c', '#06d6a0', '#118ab2', '#7b2cbf', '#f72585', '#4cc9f0'];
  const randomColor = () => colorSet[Math.floor(Math.random() * colorSet.length)];

  ctx.fillStyle = randomColor();
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = randomColor();
    const shapeType = Math.floor(Math.random() * 3);
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const w = 80 + Math.random() * 400;
    const h = 80 + Math.random() * 400;

    if (shapeType === 0) {
      ctx.fillRect(x, y, w, h);
    } else if (shapeType === 1) {
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 180 + 40, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h * 0.3);
      ctx.lineTo(x + w * 0.4, y + h);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(14, canvas.height - 84, 290, 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(sizeLabel, 28, canvas.height - 44);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function addPainting(x, y, z, ry) {
  const size = DEFAULT_PAINTING_SIZES[Math.floor(Math.random() * DEFAULT_PAINTING_SIZES.length)];
  const mat = new THREE.MeshStandardMaterial({
    color: '#f5efe2',
    map: createRandomPlaceholderTexture(size.label),
    roughness: 0.88
  });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, 0.08), mat);
  frame.position.set(x, y + size.h / 3.2, z);
  frame.rotation.y = ry;
  scene.add(frame);
  paintingMeshes.push(frame);
}
for (let i = -6; i <= 6; i += 2) {
  addPainting(-room.width / 2 + 0.05, 1.8, i * 3.6, Math.PI / 2);
  addPainting(room.width / 2 - 0.05, 1.8, i * 3.6, -Math.PI / 2);
}



function createPlaceholderStatue(slotIndex) {
  const shapes = [
    () => new THREE.SphereGeometry(0.9, 28, 24),
    () => new THREE.BoxGeometry(1.3, 2.1, 1.1),
    () => new THREE.ConeGeometry(0.9, 2.2, 28),
    () => new THREE.TorusKnotGeometry(0.55, 0.2, 120, 16),
    () => new THREE.CylinderGeometry(0.65, 0.95, 2.0, 28),
    () => new THREE.DodecahedronGeometry(0.95, 0)
  ];

  const marbleTextureCanvas = document.createElement('canvas');
  marbleTextureCanvas.width = 512;
  marbleTextureCanvas.height = 512;
  const ctx = marbleTextureCanvas.getContext('2d');

  const base = new THREE.Color('#e9e4d8');
  ctx.fillStyle = `rgb(${Math.floor(base.r * 255)}, ${Math.floor(base.g * 255)}, ${Math.floor(base.b * 255)})`;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 90; i++) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${170 + Math.floor(Math.random() * 40)}, ${165 + Math.floor(Math.random() * 40)}, ${160 + Math.floor(Math.random() * 45)}, ${0.08 + Math.random() * 0.16})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.moveTo(x, y);
    for (let seg = 0; seg < 4; seg++) {
      ctx.bezierCurveTo(
        x + (Math.random() - 0.5) * 140,
        y + (Math.random() - 0.5) * 140,
        x + (Math.random() - 0.5) * 140,
        y + (Math.random() - 0.5) * 140,
        x + (Math.random() - 0.5) * 220,
        y + (Math.random() - 0.5) * 220
      );
    }
    ctx.stroke();
  }

  const marbleTexture = new THREE.CanvasTexture(marbleTextureCanvas);
  marbleTexture.colorSpace = THREE.SRGBColorSpace;
  marbleTexture.wrapS = marbleTexture.wrapT = THREE.RepeatWrapping;
  marbleTexture.repeat.set(1.2, 1.2);

  const material = new THREE.MeshStandardMaterial({
    color: '#ece7dc',
    map: marbleTexture,
    roughness: 0.55,
    metalness: 0.02
  });

  const geometry = shapes[slotIndex % shapes.length]();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const sculpture = new THREE.Group();
  sculpture.add(mesh);
  mesh.position.y = 0.95;

  if (geometry.type === 'TorusKnotGeometry') {
    mesh.position.y = 1.2;
    mesh.scale.setScalar(1.25);
  }

  return sculpture;
}

const loader = new GLTFLoader();
const slotSelect = document.getElementById('slotSelect');
for (let i = 0; i < statueSlots.length; i++) {
  const o = document.createElement('option');
  o.value = i;
  o.textContent = `Slot ${i + 1}`;
  slotSelect.appendChild(o);
}

for (let i = 0; i < statueSlots.length; i++) {
  const placeholder = createPlaceholderStatue(i);
  statueSlots[i].holder.add(placeholder);
  statueSlots[i].model = placeholder;
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
