const STORAGE_KEYS = {
  slot1: 'halo-of-dead-slot-1',
  slot2: 'halo-of-dead-slot-2',
  highScore: 'halo-of-dead-high-score',
  skin: 'halo-of-dead-skin',
};

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const PRESENCE_TTL = 4000;
const CHANNEL_NAME = 'halo-of-the-dead-coop';
const SHOOTING_PLANE = { x: 110, y: 110, width: 1060, height: 430 };

const SKINS = [
  {
    id: 'cathedral-default',
    name: 'Cathedral Midnight',
    type: 'reskin',
    description: 'Blue-violet angry faces on a moonlit shooting lane.',
    palette: {
      accent: '#73f0ff',
      glow: '#a855f7',
      floor: '#0f172a',
      face: '#8cf1ff',
      outline: '#e9d5ff',
      eyes: '#111827',
    },
    background: 'assets/bg_cathedral.svg',
    spawnBias: [0, 0, 0],
  },
  {
    id: 'inferno-blood',
    name: 'Inferno Bloodline',
    type: 'reskin',
    description: 'Orange-red angry faces with the same standard target lanes.',
    palette: {
      accent: '#ff8a5b',
      glow: '#ff3b3b',
      floor: '#1c0f0f',
      face: '#ff9b54',
      outline: '#ffe4d6',
      eyes: '#2b0d0d',
    },
    background: 'assets/bg_inferno.svg',
    spawnBias: [0, 0, 0],
  },
  {
    id: 'halo-rift',
    name: 'Halo Rift',
    type: 'spawnshift',
    description: 'Cyan-lilac faces that spawn higher and wider inside the plane.',
    palette: {
      accent: '#8cf1ff',
      glow: '#67e8f9',
      floor: '#101827',
      face: '#b7f7ff',
      outline: '#c4b5fd',
      eyes: '#0f172a',
    },
    background: 'assets/bg_celestial.svg',
    spawnBias: [-120, 0, 140],
  },
  {
    id: 'void-siege',
    name: 'Void Siege',
    type: 'spawnshift',
    description: 'Magenta faces that shift into aggressive left-right flanks.',
    palette: {
      accent: '#f973ff',
      glow: '#fb7185',
      floor: '#140b22',
      face: '#ff8cf5',
      outline: '#fce7f3',
      eyes: '#210f2d',
    },
    background: 'assets/bg_cathedral.svg',
    spawnBias: [180, -160, 90],
  },
];

const LEVELS = [
  {
    name: 'Cathedral Gate',
    waves: 3,
    spawnRate: 1350,
    enemyMix: ['demon', 'angel'],
    enemySpeed: 0.7,
    bossWave: 3,
    backgroundFallback: '#111827',
  },
  {
    name: 'Halo Ruins',
    waves: 4,
    spawnRate: 1080,
    enemyMix: ['angel', 'monster', 'demon'],
    enemySpeed: 0.9,
    bossWave: 4,
    backgroundFallback: '#0b1120',
  },
  {
    name: 'Inferno Atrium',
    waves: 5,
    spawnRate: 900,
    enemyMix: ['monster', 'demon', 'angel'],
    enemySpeed: 1.1,
    bossWave: 5,
    backgroundFallback: '#1c0f0f',
  },
];

const ENEMY_DEFS = {
  demon: { hp: 1, score: 120, speed: 1, radius: 42, attackPower: 8 },
  angel: { hp: 2, score: 180, speed: 1.12, radius: 48, attackPower: 10 },
  monster: { hp: 3, score: 320, speed: 0.9, radius: 58, attackPower: 16 },
};

const SPAWN_POINTS = [
  { x: 220, y: 200 },
  { x: 430, y: 175 },
  { x: 640, y: 225 },
  { x: 860, y: 185 },
  { x: 1040, y: 235 },
];

const dom = {
  canvas: document.getElementById('gameCanvas'),
  levelName: document.getElementById('levelName'),
  waveValue: document.getElementById('waveValue'),
  scoreValue: document.getElementById('scoreValue'),
  healthValue: document.getElementById('healthValue'),
  playerRole: document.getElementById('playerRole'),
  sessionState: document.getElementById('sessionState'),
  highScoreValue: document.getElementById('highScoreValue'),
  overlayCard: document.getElementById('overlayCard'),
  overlayTitle: document.getElementById('overlayTitle'),
  overlayText: document.getElementById('overlayText'),
  overlayButton: document.getElementById('overlayButton'),
  startButton: document.getElementById('startButton'),
  resetButton: document.getElementById('resetButton'),
  skinGrid: document.getElementById('skinGrid'),
  skinTypeLabel: document.getElementById('skinTypeLabel'),
};

const ctx = dom.canvas.getContext('2d');
const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;
const textureCache = new Map();

const state = {
  slot: null,
  isHost: false,
  gameStarted: false,
  gameOver: false,
  remoteConnected: false,
  score: 0,
  health: 100,
  highScore: Number(localStorage.getItem(STORAGE_KEYS.highScore) || 0),
  currentLevelIndex: 0,
  currentWave: 1,
  enemies: [],
  particles: [],
  cursors: {
    player1: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, firing: false, active: true },
    player2: { x: CANVAS_WIDTH / 2 + 80, y: CANVAS_HEIGHT / 2 + 40, firing: false, active: false },
  },
  selectedSkinId: localStorage.getItem(STORAGE_KEYS.skin) || SKINS[0].id,
  lastSpawnAt: 0,
  lastFrameAt: performance.now(),
  totalShots: 0,
  enemiesDefeated: 0,
  lastSnapshot: null,
  remoteInput: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, fireRequested: false },
  playerSlotKey: null,
};

function currentSkin() {
  return SKINS.find((skin) => skin.id === state.selectedSkinId) || SKINS[0];
}

function currentLevel() {
  return LEVELS[state.currentLevelIndex] || LEVELS[LEVELS.length - 1];
}

function loadImage(src) {
  if (textureCache.has(src)) return textureCache.get(src);
  const image = new Image();
  image.src = src;
  textureCache.set(src, image);
  return image;
}

function buildSkinButtons() {
  dom.skinGrid.innerHTML = '';
  for (const skin of SKINS) {
    const button = document.createElement('button');
    button.className = `skin-button${skin.id === state.selectedSkinId ? ' active' : ''}`;
    button.type = 'button';
    button.innerHTML = `${skin.name}<span>${skin.type === 'reskin' ? 'Type 1' : 'Type 2'} · ${skin.description}</span>`;
    button.addEventListener('click', () => {
      state.selectedSkinId = skin.id;
      localStorage.setItem(STORAGE_KEYS.skin, skin.id);
      buildSkinButtons();
      syncHud();
      if (state.isHost) {
        broadcast({ type: 'skin-selected', skinId: skin.id });
      }
    });
    dom.skinGrid.appendChild(button);
  }
}

function syncHud() {
  const level = currentLevel();
  const skin = currentSkin();
  dom.levelName.textContent = level.name;
  dom.waveValue.textContent = `${state.currentWave} / ${level.waves}`;
  dom.scoreValue.textContent = String(state.score);
  dom.healthValue.textContent = String(Math.max(0, Math.round(state.health)));
  dom.highScoreValue.textContent = String(state.highScore);
  dom.playerRole.textContent = state.slot === 'player2' ? 'Player 2' : 'Player 1';
  dom.sessionState.textContent = state.gameOver
    ? 'Run ended'
    : state.gameStarted
      ? state.isHost
        ? state.remoteConnected ? 'Co-op active' : 'Solo host'
        : 'Synced to host'
      : state.isHost ? 'Ready to host' : 'Ready to join';
  dom.skinTypeLabel.textContent = `${skin.type === 'reskin' ? 'Type 1 · Reskin' : 'Type 2 · Spawn Shift'} · ${skin.name}`;
}

function showOverlay(title, text, buttonLabel = 'Start Run', visible = true) {
  dom.overlayTitle.textContent = title;
  dom.overlayText.textContent = text;
  dom.overlayButton.textContent = buttonLabel;
  dom.overlayCard.classList.toggle('hidden', !visible);
}

function claimSlot() {
  const now = Date.now();
  const slot1 = JSON.parse(localStorage.getItem(STORAGE_KEYS.slot1) || 'null');
  const slot2 = JSON.parse(localStorage.getItem(STORAGE_KEYS.slot2) || 'null');
  const slot1Alive = slot1 && now - slot1.timestamp < PRESENCE_TTL;
  const slot2Alive = slot2 && now - slot2.timestamp < PRESENCE_TTL;

  if (!slot1Alive) {
    state.slot = 'player1';
    state.isHost = true;
    state.playerSlotKey = STORAGE_KEYS.slot1;
  } else if (!slot2Alive) {
    state.slot = 'player2';
    state.isHost = false;
    state.playerSlotKey = STORAGE_KEYS.slot2;
  } else {
    state.slot = 'spectator';
    state.isHost = false;
    state.playerSlotKey = null;
  }

  refreshPresence();
}

function refreshPresence() {
  if (!state.playerSlotKey) return;
  localStorage.setItem(state.playerSlotKey, JSON.stringify({ slot: state.slot, timestamp: Date.now() }));
}

function cleanupPresence() {
  if (state.playerSlotKey) {
    localStorage.removeItem(state.playerSlotKey);
  }
}

function resetRun() {
  state.gameStarted = false;
  state.gameOver = false;
  state.score = 0;
  state.health = 100;
  state.currentLevelIndex = 0;
  state.currentWave = 1;
  state.enemies = [];
  state.particles = [];
  state.lastSpawnAt = 0;
  state.totalShots = 0;
  state.enemiesDefeated = 0;
  state.remoteInput.fireRequested = false;
  showOverlay(
    'Ready for the next purge?',
    state.isHost ? 'Start the run and your co-op partner will sync in automatically.' : 'Waiting for Player 1 to begin the run.',
    'Start Run',
    !state.gameStarted,
  );
  syncHud();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeEnemy(kind, forceBoss = false) {
  const level = currentLevel();
  const skin = currentSkin();
  const def = ENEMY_DEFS[kind];
  const base = randomFrom(SPAWN_POINTS);
  const laneShift = randomFrom(skin.spawnBias);
  const radius = forceBoss ? def.radius + 18 : def.radius;
  const x = clamp(base.x + laneShift + (Math.random() * 100 - 50), SHOOTING_PLANE.x + radius, SHOOTING_PLANE.x + SHOOTING_PLANE.width - radius);
  const y = clamp(base.y + (Math.random() * 120 - 60), SHOOTING_PLANE.y + radius, SHOOTING_PLANE.y + SHOOTING_PLANE.height - radius);

  return {
    id: crypto.randomUUID(),
    kind,
    hp: forceBoss ? def.hp + 2 : def.hp,
    maxHp: forceBoss ? def.hp + 2 : def.hp,
    score: forceBoss ? def.score * 2 : def.score,
    radius,
    attackPower: forceBoss ? def.attackPower + 8 : def.attackPower,
    x,
    y,
    vx: (Math.random() > 0.5 ? 1 : -1) * (70 + Math.random() * 80) * level.enemySpeed * def.speed,
    vy: (Math.random() > 0.5 ? 1 : -1) * (45 + Math.random() * 55) * level.enemySpeed * def.speed,
    wobble: Math.random() * Math.PI * 2,
    attackTimer: forceBoss ? 11 : 8.5,
    boss: forceBoss,
  };
}

function spawnEnemy(forceBoss = false) {
  const mix = currentLevel().enemyMix;
  const kind = forceBoss ? 'monster' : randomFrom(mix);
  state.enemies.push(makeEnemy(kind, forceBoss));
}

function maybeSpawnEnemy(now) {
  if (!state.gameStarted || state.gameOver || !state.isHost) return;

  const level = currentLevel();
  const perWaveTarget = 4 + state.currentLevelIndex * 2 + state.currentWave * 2;
  if (state.enemiesDefeated >= perWaveTarget) {
    if (state.currentWave < level.waves) {
      state.currentWave += 1;
      state.enemiesDefeated = 0;
      state.lastSpawnAt = now;
      spawnEnemy(state.currentWave === level.bossWave);
      syncHud();
      return;
    }

    if (state.currentLevelIndex < LEVELS.length - 1) {
      state.currentLevelIndex += 1;
      state.currentWave = 1;
      state.enemiesDefeated = 0;
      state.lastSpawnAt = now;
      spawnEnemy(false);
      syncHud();
      return;
    }

    endRun(true);
    return;
  }

  const desiredEnemies = Math.min(4 + state.currentLevelIndex + state.currentWave, 9);
  if (state.enemies.length < desiredEnemies && now - state.lastSpawnAt > level.spawnRate) {
    spawnEnemy(state.currentWave === level.bossWave && Math.random() > 0.65);
    state.lastSpawnAt = now;
  }
}

function spawnParticles(x, y, amount, color) {
  for (let index = 0; index < amount; index += 1) {
    state.particles.push({
      x,
      y,
      life: 0.35 + Math.random() * 0.45,
      vx: (Math.random() - 0.5) * 280,
      vy: (Math.random() - 0.5) * 280,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}

function registerHighScore() {
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem(STORAGE_KEYS.highScore, String(state.highScore));
  }
}

function handleShot(playerKey) {
  if (!state.gameStarted || state.gameOver || !state.isHost) return;

  const cursor = state.cursors[playerKey];
  if (!cursor) return;

  state.totalShots += 1;
  let hit = false;

  for (const enemy of [...state.enemies].reverse()) {
    const distance = Math.hypot(cursor.x - enemy.x, cursor.y - enemy.y);
    if (distance <= enemy.radius) {
      enemy.hp -= 1;
      hit = true;
      spawnParticles(enemy.x, enemy.y, 10, currentSkin().palette.accent);

      if (enemy.hp <= 0) {
        state.score += enemy.score;
        state.enemiesDefeated += 1;
        state.enemies = state.enemies.filter((item) => item.id !== enemy.id);
        spawnParticles(enemy.x, enemy.y, 24, currentSkin().palette.glow);
      }
      break;
    }
  }

  if (!hit) {
    spawnParticles(cursor.x, cursor.y, 5, '#ffffff');
  }

  registerHighScore();
  syncHud();
}

function updateEnemies(dt) {
  const planeMinX = SHOOTING_PLANE.x;
  const planeMaxX = SHOOTING_PLANE.x + SHOOTING_PLANE.width;
  const planeMinY = SHOOTING_PLANE.y;
  const planeMaxY = SHOOTING_PLANE.y + SHOOTING_PLANE.height;

  for (const enemy of state.enemies) {
    enemy.x += enemy.vx * dt * 0.001;
    enemy.y += enemy.vy * dt * 0.001;
    enemy.y += Math.sin(performance.now() / 280 + enemy.wobble) * 0.35;
    enemy.attackTimer -= dt * 0.001;

    if (enemy.x - enemy.radius <= planeMinX || enemy.x + enemy.radius >= planeMaxX) {
      enemy.vx *= -1;
      enemy.x = clamp(enemy.x, planeMinX + enemy.radius, planeMaxX - enemy.radius);
    }

    if (enemy.y - enemy.radius <= planeMinY || enemy.y + enemy.radius >= planeMaxY) {
      enemy.vy *= -1;
      enemy.y = clamp(enemy.y, planeMinY + enemy.radius, planeMaxY - enemy.radius);
    }
  }

  const breached = state.enemies.filter((enemy) => enemy.attackTimer <= 0);
  if (breached.length > 0) {
    for (const enemy of breached) {
      state.health -= enemy.attackPower;
      spawnParticles(enemy.x, enemy.y, 20, '#ff6b6b');
    }
    state.enemies = state.enemies.filter((enemy) => enemy.attackTimer > 0);
    syncHud();
  }
}

function updateParticles(dt) {
  state.particles = state.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * dt * 0.001,
      y: particle.y + particle.vy * dt * 0.001,
      vy: particle.vy + 220 * dt * 0.001,
      life: particle.life - dt * 0.001,
    }))
    .filter((particle) => particle.life > 0);
}

function updateHost(dt, now) {
  maybeSpawnEnemy(now);
  updateEnemies(dt);

  if (state.remoteInput.fireRequested) {
    handleShot('player2');
    state.remoteInput.fireRequested = false;
  }

  state.cursors.player1.firing = false;
  state.cursors.player2.firing = false;
  updateParticles(dt);

  if (state.health <= 0) {
    endRun(false);
    return;
  }

  broadcastSnapshot();
}

function endRun(victory) {
  state.gameStarted = false;
  state.gameOver = true;
  showOverlay(
    victory ? 'Sanctuary reclaimed!' : 'The angry faces broke through',
    victory ? `You survived all ${LEVELS.length} levels and posted ${state.score} points.` : `Your final score was ${state.score}. Try another skin and run it back.`,
    'Restart Run',
    true,
  );
  syncHud();
  broadcast({ type: 'run-ended', victory, score: state.score, highScore: state.highScore });
}

function broadcast(message) {
  if (!channel) return;
  channel.postMessage({ ...message, sender: state.slot, at: Date.now() });
}

function broadcastSnapshot() {
  if (!state.isHost) return;
  broadcast({
    type: 'snapshot',
    snapshot: {
      score: state.score,
      health: state.health,
      currentLevelIndex: state.currentLevelIndex,
      currentWave: state.currentWave,
      selectedSkinId: state.selectedSkinId,
      gameStarted: state.gameStarted,
      gameOver: state.gameOver,
      remoteConnected: state.remoteConnected,
      cursors: state.cursors,
      enemies: state.enemies,
      particles: state.particles,
      highScore: state.highScore,
    },
  });
}

function startRun() {
  if (!state.isHost) {
    showOverlay('Waiting on Player 1', 'Only the host tab can begin the shared run.', 'Close', true);
    return;
  }

  resetRun();
  state.gameStarted = true;
  state.gameOver = false;
  showOverlay('', '', 'Start Run', false);
  spawnEnemy(false);
  syncHud();
  broadcast({ type: 'run-started', skinId: state.selectedSkinId });
}

function onPointerMove(event) {
  const rect = dom.canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

  if (state.slot === 'player2') {
    state.cursors.player2.x = x;
    state.cursors.player2.y = y;
    broadcast({ type: 'remote-pointer', x, y });
  } else {
    state.cursors.player1.x = x;
    state.cursors.player1.y = y;
  }
}

function onShoot() {
  if (state.slot === 'player2') {
    state.cursors.player2.firing = true;
    broadcast({ type: 'remote-shoot', x: state.cursors.player2.x, y: state.cursors.player2.y });
    return;
  }

  state.cursors.player1.firing = true;
  handleShot('player1');
}

function drawBackground() {
  const skin = currentSkin();
  ctx.fillStyle = currentLevel().backgroundFallback;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const bg = loadImage(skin.background);
  if (bg.complete) {
    ctx.drawImage(bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  const overlayGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  overlayGradient.addColorStop(0, `${skin.palette.accent}12`);
  overlayGradient.addColorStop(1, `${skin.palette.floor}b5`);
  ctx.fillStyle = overlayGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawShootingPlane() {
  const skin = currentSkin();
  ctx.save();
  ctx.fillStyle = 'rgba(7, 10, 18, 0.42)';
  ctx.fillRect(SHOOTING_PLANE.x, SHOOTING_PLANE.y, SHOOTING_PLANE.width, SHOOTING_PLANE.height);
  ctx.strokeStyle = skin.palette.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(SHOOTING_PLANE.x, SHOOTING_PLANE.y, SHOOTING_PLANE.width, SHOOTING_PLANE.height);

  for (let row = 1; row < 4; row += 1) {
    const y = SHOOTING_PLANE.y + (SHOOTING_PLANE.height / 4) * row;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(SHOOTING_PLANE.x, y);
    ctx.lineTo(SHOOTING_PLANE.x + SHOOTING_PLANE.width, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemyFace(enemy) {
  const skin = currentSkin();
  const radius = enemy.radius;
  const hpRatio = enemy.hp / enemy.maxHp;

  ctx.save();
  ctx.shadowColor = skin.palette.glow;
  ctx.shadowBlur = enemy.boss ? 28 : 18;

  ctx.fillStyle = skin.palette.face;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 5;
  ctx.strokeStyle = skin.palette.outline;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(enemy.x - radius * 0.28, enemy.y - radius * 0.28, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = skin.palette.eyes;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(enemy.x - radius * 0.44, enemy.y - radius * 0.18);
  ctx.lineTo(enemy.x - radius * 0.1, enemy.y - radius * 0.05);
  ctx.moveTo(enemy.x + radius * 0.44, enemy.y - radius * 0.18);
  ctx.lineTo(enemy.x + radius * 0.1, enemy.y - radius * 0.05);
  ctx.stroke();

  ctx.fillStyle = skin.palette.eyes;
  ctx.beginPath();
  ctx.arc(enemy.x - radius * 0.23, enemy.y + radius * 0.02, radius * 0.1, 0, Math.PI * 2);
  ctx.arc(enemy.x + radius * 0.23, enemy.y + radius * 0.02, radius * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y + radius * 0.34, radius * 0.34, Math.PI * 0.1, Math.PI * 0.9, true);
  ctx.stroke();

  const barWidth = radius * 1.45;
  const barY = enemy.y - radius - 18;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, 8);
  ctx.fillStyle = hpRatio > 0.5 ? '#34d399' : hpRatio > 0.25 ? '#fbbf24' : '#fb7185';
  ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * hpRatio, 8);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText(`${Math.ceil(enemy.attackTimer)}s`, enemy.x - 10, enemy.y + radius + 24);
  ctx.restore();
}

function drawEnemies() {
  const ordered = [...state.enemies].sort((left, right) => left.radius - right.radius);
  for (const enemy of ordered) {
    drawEnemyFace(enemy);
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCursors() {
  const crosshair = loadImage('assets/crosshair.svg');
  const drawCursor = (cursor, color, label) => {
    if (!cursor.active) return;
    const size = 58;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = cursor.firing ? 28 : 14;
    if (crosshair.complete) {
      ctx.drawImage(crosshair, cursor.x - size / 2, cursor.y - size / 2, size, size);
    } else {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(15,23,42,0.75)';
    ctx.fillRect(cursor.x + 18, cursor.y - 28, 70, 24);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(label, cursor.x + 24, cursor.y - 12);
    ctx.restore();
  };

  drawCursor(state.cursors.player1, '#73f0ff', 'P1');
  if (state.remoteConnected || state.slot === 'player2') {
    drawCursor({ ...state.cursors.player2, active: true }, '#f973ff', 'P2');
  }
}

function drawForeground() {
  const skin = currentSkin();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, CANVAS_HEIGHT - 145, CANVAS_WIDTH, 145);
  ctx.fillStyle = skin.palette.floor;
  ctx.fillRect(0, CANVAS_HEIGHT - 120, CANVAS_WIDTH, 120);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 26px Inter, sans-serif';
  ctx.fillText(currentLevel().name, 36, CANVAS_HEIGHT - 70);
  ctx.font = '16px Inter, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Wave ${state.currentWave} · Shots ${state.totalShots} · Skin ${currentSkin().name}`, 36, CANVAS_HEIGHT - 38);
  ctx.fillText('Shoot the angry-face targets inside the glowing lane.', SHOOTING_PLANE.x, SHOOTING_PLANE.y - 18);
}

function draw() {
  drawBackground();
  drawShootingPlane();
  drawEnemies();
  drawParticles();
  drawForeground();
  drawCursors();
}

function animate(now) {
  const dt = Math.min(32, now - state.lastFrameAt);
  state.lastFrameAt = now;

  if (state.isHost && state.gameStarted && !state.gameOver) {
    updateHost(dt, now);
  } else if (!state.isHost && state.lastSnapshot) {
    const snapshot = state.lastSnapshot;
    state.score = snapshot.score;
    state.health = snapshot.health;
    state.currentLevelIndex = snapshot.currentLevelIndex;
    state.currentWave = snapshot.currentWave;
    state.selectedSkinId = snapshot.selectedSkinId;
    state.gameStarted = snapshot.gameStarted;
    state.gameOver = snapshot.gameOver;
    state.remoteConnected = snapshot.remoteConnected;
    state.enemies = snapshot.enemies;
    state.particles = snapshot.particles;
    state.highScore = snapshot.highScore;
    state.cursors.player1 = snapshot.cursors.player1;
    state.cursors.player2 = { ...snapshot.cursors.player2, x: state.cursors.player2.x, y: state.cursors.player2.y, active: true };
    syncHud();
  }

  draw();
  requestAnimationFrame(animate);
}

function handleChannelMessage(event) {
  const { type, sender } = event.data || {};
  if (!type || sender === state.slot) return;

  if (type === 'remote-pointer' && state.isHost) {
    state.remoteConnected = true;
    state.cursors.player2 = { ...state.cursors.player2, x: event.data.x, y: event.data.y, active: true };
    syncHud();
  }

  if (type === 'remote-shoot' && state.isHost) {
    state.remoteConnected = true;
    state.cursors.player2 = { ...state.cursors.player2, x: event.data.x, y: event.data.y, firing: true, active: true };
    state.remoteInput = { x: event.data.x, y: event.data.y, fireRequested: true };
  }

  if (type === 'run-started' && !state.isHost) {
    state.selectedSkinId = event.data.skinId;
    showOverlay('', '', 'Start Run', false);
    syncHud();
  }

  if (type === 'run-ended' && !state.isHost) {
    state.highScore = event.data.highScore;
    showOverlay(
      event.data.victory ? 'Sanctuary reclaimed!' : 'The angry faces broke through',
      `Player 1 finished with ${event.data.score} points.`,
      'Restart Run',
      true,
    );
    syncHud();
  }

  if (type === 'skin-selected' && !state.isHost) {
    state.selectedSkinId = event.data.skinId;
    buildSkinButtons();
    syncHud();
  }

  if (type === 'snapshot' && !state.isHost) {
    state.lastSnapshot = event.data.snapshot;
  }
}

function bindEvents() {
  dom.canvas.addEventListener('mousemove', onPointerMove);
  dom.canvas.addEventListener('touchmove', (event) => {
    const touch = event.touches[0];
    if (touch) {
      onPointerMove(touch);
    }
  }, { passive: true });
  dom.canvas.addEventListener('click', onShoot);
  dom.startButton.addEventListener('click', startRun);
  dom.resetButton.addEventListener('click', () => {
    resetRun();
    if (state.isHost) {
      broadcast({ type: 'run-ended', victory: false, score: 0, highScore: state.highScore });
    }
  });
  dom.overlayButton.addEventListener('click', () => {
    if (state.gameOver || !state.gameStarted) {
      startRun();
    } else {
      showOverlay('', '', 'Start Run', false);
    }
  });

  if (channel) {
    channel.addEventListener('message', handleChannelMessage);
  }

  window.addEventListener('storage', () => {
    const now = Date.now();
    const slot1 = JSON.parse(localStorage.getItem(STORAGE_KEYS.slot1) || 'null');
    const slot2 = JSON.parse(localStorage.getItem(STORAGE_KEYS.slot2) || 'null');
    state.remoteConnected = !!(slot2 && now - slot2.timestamp < PRESENCE_TTL);
    if (!state.isHost && (!slot1 || now - slot1.timestamp > PRESENCE_TTL)) {
      claimSlot();
      syncHud();
    }
  });

  window.addEventListener('beforeunload', cleanupPresence);
}

function bootstrap() {
  claimSlot();
  buildSkinButtons();
  bindEvents();
  dom.highScoreValue.textContent = String(state.highScore);
  state.remoteConnected = !!JSON.parse(localStorage.getItem(STORAGE_KEYS.slot2) || 'null');
  syncHud();
  resetRun();
  showOverlay(
    'Aim for the halo',
    state.isHost
      ? 'Press Start Run to host the session. Targets now stay inside the glowing shooting plane.'
      : 'You are Player 2. Player 1 controls mission start and wave progression.',
    'Start Run',
    true,
  );
  setInterval(refreshPresence, PRESENCE_TTL / 2);
  requestAnimationFrame(animate);
}

bootstrap();
