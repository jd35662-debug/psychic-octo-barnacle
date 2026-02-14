const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const messageEl = document.getElementById("message");
const inventoryEl = document.getElementById("inventory");
const itemTableBodyEl = document.querySelector("#item-table tbody");
const itemTableSectionEl = document.getElementById("item-table-section");
const modeSliderEl = document.getElementById("mode-slider");
const modeLabelEl = document.getElementById("mode-label");

const world = {
  width: canvas.width,
  height: canvas.height,
  walls: [
    { x: 0, y: 0, w: 800, h: 20 },
    { x: 0, y: 0, w: 20, h: 500 },
    { x: 780, y: 0, w: 20, h: 500 },
    { x: 0, y: 480, w: 800, h: 20 }
  ],
  bigDoor: { x: 270, y: 26, w: 260, h: 150, locked: true },
  smallDoor: { x: 690, y: 220, w: 46, h: 70 },
  classPads: [
    { name: "Warrior", color: "#d94848", x: 220, y: 180, w: 90, h: 90 },
    { name: "Mage", color: "#4f7ee8", x: 355, y: 180, w: 90, h: 90 },
    { name: "Rogue", color: "#4dc26b", x: 490, y: 180, w: 90, h: 90 }
  ]
};

const textures = {
  ground: "#24212f",
  path: "#37324a",
  wall: "#4f446f",
  grass: "#285142",
  bigDoorFrame: "#675794",
  bigDoorBody: "#21183b",
  smallDoor: "#8f6d3b",
  player: "#f1e28a",
  playerOutline: "#8f7724"
};

const player = {
  x: 90,
  y: 390,
  w: 24,
  h: 24,
  speed: 2.6,
  classColor: null,
  className: null
};

const gameState = {
  area: "courtyard"
};

const itemCatalog = [
  { id: "key-???", name: "Key ???", type: "Key", notes: "Unlocks the first room giant door.", alwaysGrey: true },
  { id: "key-a", name: "Key A", type: "Key", notes: "Generic key object." },
  { id: "key-b", name: "Key B", type: "Key", notes: "Generic key object." },
  { id: "key-c", name: "Key C", type: "Key", notes: "Generic key object." },
  { id: "quest-orb", name: "Quest Orb", type: "Quest", notes: "Ancient practice relic." },
  { id: "quest-seal", name: "Quest Seal", type: "Quest", notes: "Proof of training completion." },
  { id: "trail-map", name: "Training Grounds Map", type: "Quest", notes: "Points toward class pads." },
  { id: "bandage", name: "Bandage", type: "Supply", notes: "Basic comfort item." }
];

const inventory = ["key-???", "trail-map", "bandage"];

const keysDown = new Set();

function setMessage(text) {
  messageEl.textContent = text;
}

function itemById(id) {
  return itemCatalog.find((item) => item.id === id);
}

function hasItem(id) {
  return inventory.includes(id);
}

function removeItem(id) {
  const index = inventory.indexOf(id);
  if (index >= 0) {
    inventory.splice(index, 1);
    renderInventory();
  }
}

function renderInventory() {
  inventoryEl.innerHTML = "";
  for (const id of inventory) {
    const item = itemById(id);
    if (!item) continue;

    const li = document.createElement("li");
    li.textContent = `${item.name} (${item.type})`;
    if (item.alwaysGrey) {
      li.classList.add("key-unknown");
    }
    inventoryEl.appendChild(li);
  }
}

function renderItemTable() {
  itemTableBodyEl.innerHTML = "";
  for (const item of itemCatalog) {
    const row = document.createElement("tr");
    if (item.alwaysGrey) {
      row.classList.add("key-unknown");
    }

    row.innerHTML = `<td>${item.name}</td><td>${item.type}</td><td>${item.notes}</td>`;
    itemTableBodyEl.appendChild(row);
  }
}


function renderMode() {
  const modeValue = modeSliderEl.value;
  const isCustomers = modeValue === "1";
  modeLabelEl.textContent = isCustomers ? "Customers" : "Dev";
  itemTableSectionEl.classList.toggle("hidden", isCustomers);
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function blocked(nextPos) {
  if (gameState.area === "courtyard" && world.bigDoor.locked && intersects(nextPos, world.bigDoor)) {
    return true;
  }
  return world.walls.some((wall) => intersects(nextPos, wall));
}

function movePlayer() {
  let dx = 0;
  let dy = 0;

  if (keysDown.has("ArrowLeft") || keysDown.has("a")) dx -= player.speed;
  if (keysDown.has("ArrowRight") || keysDown.has("d")) dx += player.speed;
  if (keysDown.has("ArrowUp") || keysDown.has("w")) dy -= player.speed;
  if (keysDown.has("ArrowDown") || keysDown.has("s")) dy += player.speed;

  const nextX = { ...player, x: player.x + dx };
  if (!blocked(nextX)) player.x = nextX.x;

  const nextY = { ...player, y: player.y + dy };
  if (!blocked(nextY)) player.y = nextY.y;
}

function near(rect, padding = 8) {
  const proximity = {
    x: rect.x - padding,
    y: rect.y - padding,
    w: rect.w + padding * 2,
    h: rect.h + padding * 2
  };
  return intersects(player, proximity);
}

function enterTrainingGrounds() {
  gameState.area = "training";
  player.x = 390;
  player.y = 420;
  setMessage("Training grounds: stand on a class pad and press E.");
}

function tryInteract() {
  if (gameState.area === "courtyard") {
    if (near(world.bigDoor)) {
      if (world.bigDoor.locked) {
        if (hasItem("key-???")) {
          world.bigDoor.locked = false;
          removeItem("key-???");
          setMessage("Key ??? is accepted. The giant door unlocks.");
        } else {
          setMessage("The giant door requires Key ???.");
        }
      } else {
        setMessage("The giant door stands open.");
      }
      return;
    }

    if (near(world.smallDoor)) {
      enterTrainingGrounds();
      return;
    }

    setMessage("Nothing to interact with here.");
    return;
  }

  const selectedPad = world.classPads.find((pad) => intersects(player, pad));
  if (!selectedPad) {
    setMessage("Step onto a class pad first.");
    return;
  }

  player.className = selectedPad.name;
  player.classColor = selectedPad.color;
  setMessage(`Class selected: ${selectedPad.name}.`);
}

function drawCourtyard() {
  ctx.fillStyle = textures.ground;
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = textures.path;
  ctx.fillRect(305, 150, 190, 320);

  ctx.fillStyle = textures.grass;
  ctx.fillRect(35, 220, 210, 220);
  ctx.fillRect(560, 220, 205, 220);

  ctx.fillStyle = textures.bigDoorFrame;
  ctx.fillRect(world.bigDoor.x - 8, world.bigDoor.y - 8, world.bigDoor.w + 16, world.bigDoor.h + 16);
  ctx.fillStyle = world.bigDoor.locked ? textures.bigDoorBody : "#40335e";
  ctx.fillRect(world.bigDoor.x, world.bigDoor.y, world.bigDoor.w, world.bigDoor.h);

  ctx.fillStyle = textures.smallDoor;
  ctx.fillRect(world.smallDoor.x, world.smallDoor.y, world.smallDoor.w, world.smallDoor.h);
}

function drawTrainingGrounds() {
  ctx.fillStyle = "#181c2f";
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = "#2f355c";
  ctx.fillRect(80, 70, 640, 360);

  for (const pad of world.classPads) {
    ctx.fillStyle = pad.color;
    ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
  }

  ctx.fillStyle = "#887c9e";
  ctx.fillRect(370, 430, 60, 12);
}

function drawWorld() {
  if (gameState.area === "courtyard") {
    drawCourtyard();
  } else {
    drawTrainingGrounds();
  }

  for (const wall of world.walls) {
    ctx.fillStyle = textures.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }
}

function drawPlayer() {
  ctx.fillStyle = textures.playerOutline;
  ctx.fillRect(player.x - 2, player.y - 2, player.w + 4, player.h + 4);
  ctx.fillStyle = textures.player;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  if (player.classColor) {
    ctx.fillStyle = player.classColor;
    ctx.fillRect(player.x + 8, player.y - 10, 8, 8);
  }
}

function frame() {
  movePlayer();
  drawWorld();
  drawPlayer();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keysDown.add(key);
  if (key === "e") {
    tryInteract();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keysDown.delete(key);
});

modeSliderEl.addEventListener("input", renderMode);

renderItemTable();
renderInventory();
renderMode();
setMessage("Find the giant door and use Key ???, or take the small door to training.");
frame();
