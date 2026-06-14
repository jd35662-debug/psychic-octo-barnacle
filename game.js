const MISSION_SECONDS = 30 * 60;

const roomTypes = ["Bedroom", "Kitchen", "Hallway", "Bathroom", "Parlor", "Closet", "Indoor Backyard", "Unknown"];
const stabilities = ["Stable", "Distorted", "Contradictory", "Critical"];
const threats = ["Low", "Medium", "High", "Extreme"];
const commonItems = ["Kitchen knife", "Family photograph", "Child's toy", "House key", "Piece of wallpaper", "Unopened food container"];
const deepItems = ["Door handle that opens no doors", "Window showing another room", "Impossible floor tile", "Duplicate Foundation document", "Biological sample from non-Euclidean room", "Unknown object"];
const anomalies = [
  "a spherical bedroom with the bed bolted to the horizon",
  "a kitchen smaller inside than its refrigerator",
  "a hallway pretending to be a rainy suburban street",
  "a closet opening into a warehouse of doors",
  "an unfinished room with visible stars behind the drywall",
  "a second front door breathing quietly in its frame",
  "a room containing a smaller duplicate of itself",
  "stairs climbing down into the ceiling",
];
const radioMessages = [
  "Recover the sample and return.",
  "That room wasn't on the map.",
  "Don't enter the room with the second front door.",
  "If you see yourself, leave.",
  "Ignore any instructions coming from inside the house.",
  "That is not one of our extraction teams.",
];

const state = {
  x: 0,
  y: 0,
  depth: 0,
  sanity: 100,
  secondsLeft: MISSION_SECONDS,
  rooms: new Map(),
  report: [],
  inventory: new Set(),
  photos: 0,
  recoveryList: [],
  timerId: null,
  missionEnded: false,
};

const $ = (selector) => document.querySelector(selector);
const roomKey = (x, y) => `${x},${y}`;
const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];

function startMission() {
  state.recoveryList = shuffle([...commonItems, ...deepItems]).slice(0, 6);
  state.rooms.set(roomKey(0, 0), createRoom(0, 0));
  $("#briefing").classList.add("hidden");
  $("#game").classList.remove("hidden");
  state.timerId = setInterval(tick, 1000);
  logRadio("Tracking lock established. D-9341, proceed through the threshold.");
  render();
}

function createRoom(x, y) {
  const depth = Math.abs(x) + Math.abs(y);
  const strange = Math.min(depth / 12, 1);
  const id = String(state.rooms.size + 1).padStart(3, "0");
  const stabilityIndex = Math.min(stabilities.length - 1, Math.floor(strange * stabilities.length));
  const threatIndex = Math.min(threats.length - 1, Math.floor((strange + Math.random() * 0.35) * threats.length));
  const itemPool = depth > 4 ? [...commonItems, ...deepItems] : commonItems;
  return {
    id,
    x,
    y,
    depth,
    type: depth === 0 ? "Containment Chamber" : randomFrom(roomTypes),
    stability: depth === 0 ? "Anchored" : stabilities[stabilityIndex],
    threat: depth === 0 ? "Minimal" : threats[threatIndex],
    anomaly: depth === 0 ? "a normal suburban front door attached to a fragment of wall" : randomFrom(anomalies),
    item: Math.random() < 0.72 && depth > 0 ? randomFrom(itemPool) : null,
    photographed: false,
    collected: false,
  };
}

function move(dx, dy) {
  if (state.missionEnded) return;
  state.x += dx;
  state.y += dy;
  state.depth = Math.abs(state.x) + Math.abs(state.y);
  const key = roomKey(state.x, state.y);
  if (!state.rooms.has(key)) state.rooms.set(key, createRoom(state.x, state.y));
  state.sanity = Math.max(0, state.sanity - 2 - Math.floor(state.depth / 5));
  maybeRadio();
  maybeEndByThreat();
  render();
}

function photograph() {
  const room = currentRoom();
  if (room.photographed) return logRadio("Image already logged. Do not waste exposure.");
  room.photographed = true;
  state.photos += 1;
  state.sanity = Math.min(100, state.sanity + 4);
  addReport(`PHOTO-${state.photos}: ROOM-${room.id} documents ${room.anomaly}.`);
  render();
}

function collectSample() {
  const room = currentRoom();
  if (!room.item) return logRadio("No recoverable object detected from this position.");
  if (room.collected) return logRadio("Sample container already sealed.");
  room.collected = true;
  state.inventory.add(room.item);
  addReport(`SAMPLE: ${room.item} recovered from ROOM-${room.id}.`);
  render();
}

function tick() {
  state.secondsLeft -= 1;
  if (state.secondsLeft === 0) {
    logRadio("Tracking lock lost. Navigation markers removed. Extraction canceled.");
    state.sanity = Math.max(0, state.sanity - 25);
  }
  if (state.secondsLeft < -90) endMission(false, "Reality collapse consumed the remaining telemetry.");
  renderTimer();
}

function maybeEndByThreat() {
  const room = currentRoom();
  if (room.depth > 0 && room.threat === "Extreme" && Math.random() < 0.08) {
    endMission(false, "D-9341 entered a malformed room that successfully became an Origin point.");
  }
}

function tryReturn() {
  const complete = state.recoveryList.every((item) => state.inventory.has(item));
  if (state.x === 0 && state.y === 0 && complete && state.secondsLeft > 0) {
    endMission(true, "Required samples received before tracking lock failure.");
  }
}

function endMission(success, reason) {
  if (state.missionEnded) return;
  state.missionEnded = true;
  clearInterval(state.timerId);
  $("#game").classList.add("hidden");
  const status = success ? "MISSION ACCEPTED" : "MISSION FAILURE";
  $("#debrief").innerHTML = `
    <p class="eyebrow">FOUNDATION DEBRIEF // D-9341</p>
    <h1>${status}</h1>
    <p>${reason}</p>
    <p>Rooms observed: ${state.rooms.size}. Samples recovered: ${state.inventory.size}/${state.recoveryList.length}. Photographs: ${state.photos}.</p>
    <button onclick="location.reload()">Deploy replacement D-Class</button>
  `;
  $("#debrief").classList.remove("hidden");
}

function render() {
  const room = currentRoom();
  addRoomReport(room);
  renderTimer();
  $("#sanityFill").style.width = `${state.sanity}%`;
  $("#depthFill").style.width = `${Math.min(100, state.depth * 8)}%`;
  $("#recoveryList").innerHTML = state.recoveryList.map((item) => `<li class="${state.inventory.has(item) ? "done" : ""}">□ ${item}</li>`).join("");
  $("#roomCard").innerHTML = `
    <p class="eyebrow">ROOM-${corrupt(room.id)} // ${corrupt(room.type)}</p>
    <h2>Classification: ${corrupt(room.type)}</h2>
    <p>Stability: ${corrupt(room.stability)} · Threat Level: ${corrupt(room.threat)}</p>
    <p>Observation: ${corrupt(room.anomaly)}</p>
    <p>Recoverable: ${room.item && !room.collected ? corrupt(room.item) : "none detected"}</p>
  `;
  $("#roomVisual").style.setProperty("--tilt", `${12 + state.depth * 2}deg`);
  $("#roomVisual").style.setProperty("--turn", `${-10 + state.x * 3}deg`);
  $("#roomVisual").style.setProperty("--spin", `${state.y * 8}deg`);
  $("#reportLog").innerHTML = state.report.slice(-12).map((entry) => `<li>${entry}</li>`).join("");
  tryReturn();
}

function renderTimer() {
  const abs = Math.abs(state.secondsLeft);
  const minutes = String(Math.floor(abs / 60)).padStart(2, "0");
  const seconds = String(abs % 60).padStart(2, "0");
  $("#timer").textContent = `${state.secondsLeft < 0 ? "+" : ""}${minutes}:${seconds}`;
}

function addRoomReport(room) {
  const entry = `ROOM-${room.id}: ${room.type}; stability ${room.stability}; threat ${room.threat}.`;
  if (!state.report.includes(entry)) addReport(entry);
}

function addReport(entry) {
  state.report.push(entry);
}

function logRadio(message) {
  $("#radioLog").textContent = `COMMAND: "${message}"`;
}

function maybeRadio() {
  if (Math.random() < 0.42) logRadio(corrupt(randomFrom(radioMessages)));
}

function corrupt(text) {
  if (state.sanity > 45 || Math.random() > 0.28) return text;
  return text.replace(/[aeiou]/gi, "□").replace(/room/gi, "origin");
}

function currentRoom() {
  return state.rooms.get(roomKey(state.x, state.y));
}

function shuffle(items) {
  return items.sort(() => Math.random() - 0.5);
}

$("#startButton").addEventListener("click", startMission);
document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "north") move(0, -1);
    if (action === "south") move(0, 1);
    if (action === "west") move(-1, 0);
    if (action === "east") move(1, 0);
    if (action === "photo") photograph();
    if (action === "sample") collectSample();
  });
});

window.addEventListener("keydown", (event) => {
  const keys = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
  if (keys[event.key]) move(...keys[event.key]);
});
