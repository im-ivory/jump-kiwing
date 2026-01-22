const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const playerSprite = new Image();
playerSprite.src = "assets/flying_kiwing.png";
let playerSpriteReady = false;
playerSprite.onload = () => {
  playerSpriteReady = true;
};

const ui = {
  score: document.getElementById("score"),
  overlay: document.getElementById("overlay"),
  overline: document.getElementById("overlay-overline"),
  title: document.getElementById("overlay-title"),
  subtitle: document.getElementById("overlay-subtitle"),
  scoreline: document.getElementById("overlay-score"),
};

const baseConfig = {
  baseSpeed: 350,
  speedRamp: 11,
  maxSpeed: 600,
  gravity: 2600,
  jumpVelocity: 980,
  spawnMin: 1.1,
  spawnMax: 1.95,
};

const tuning = {
  ...baseConfig,
  isMobile: false,
  playerScale: 1.3,
  obstacleScale: 1,
  groundRatio: 0.78,
};

const state = {
  running: false,
  gameOver: false,
  time: 0,
  scroll: 0,
  speed: baseConfig.baseSpeed,
  score: 0,
  bestScore: 0,
  nextSpawn: 1.1,
  obstacles: [],
  player: {
    x: 140,
    y: 0,
    width: 44,
    height: 56,
    vy: 0,
    onGround: true,
  },
};

const world = {
  width: 0,
  height: 0,
  groundY: 0,
};

let lastTime = 0;
let jumpQueued = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function setOverlayContent({ overline, title, subtitle, scoreline }) {
  ui.overline.textContent = overline;
  ui.title.textContent = title;
  ui.subtitle.textContent = subtitle;
  ui.scoreline.textContent = scoreline || "";
}

function hideOverlay() {
  ui.overlay.classList.add("hidden");
}

function showOverlay() {
  ui.overlay.classList.remove("hidden");
}

function applyTuning() {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrowScreen = window.matchMedia("(max-width: 820px)").matches;
  const isMobile = coarsePointer || narrowScreen;

  Object.assign(tuning, baseConfig, {
    isMobile,
    playerScale: 2.5,
    obstacleScale: 1,
    groundRatio: 0.78,
  });

  if (isMobile) {
    Object.assign(tuning, {
      baseSpeed: 310,
      speedRamp: 8.8,
      maxSpeed: 540,
      gravity: 2300,
      jumpVelocity: 940,
      spawnMin: 1.05,
      spawnMax: 1.85,
      playerScale: 2,
      obstacleScale: 0.95,
      groundRatio: 0.8,
    });
  }
}

function resize() {
  applyTuning();
  const dpr = window.devicePixelRatio || 1;
  world.width = window.innerWidth;
  world.height = window.innerHeight;
  canvas.width = world.width * dpr;
  canvas.height = world.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  world.groundY = Math.round(world.height * tuning.groundRatio);
  const base = Math.min(world.width, world.height);
  const playerScale = tuning.playerScale;
  state.player.width = Math.round(
    clamp(base * 0.05 * playerScale, 36 * playerScale, 62 * playerScale)
  );
  state.player.height = Math.round(
    clamp(base * 0.07 * playerScale, 48 * playerScale, 82 * playerScale)
  );
  state.player.x = Math.round(world.width * (tuning.isMobile ? 0.16 : 0.18));
  if (!state.running) {
    state.player.y = world.groundY - state.player.height;
  } else {
    state.player.y = Math.min(
      state.player.y,
      world.groundY - state.player.height
    );
  }
}

function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.time = 0;
  state.scroll = 0;
  state.speed = tuning.baseSpeed;
  state.score = 0;
  state.nextSpawn = rand(tuning.spawnMin, tuning.spawnMax);
  state.obstacles = [];
  state.player.vy = 0;
  state.player.onGround = true;
  state.player.y = world.groundY - state.player.height;
  ui.score.textContent = "0";
  setOverlayContent({
    overline: "준비됐어?",
    title: "JUMP!",
    subtitle: "화면을 터치하거나 스페이스를 눌러 점프하세요!",
    scoreline: "",
  });
  showOverlay();
}

function startGame() {
  state.running = true;
  state.gameOver = false;
  hideOverlay();
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem("jump-kiwing-best", String(state.bestScore));
  }
  setOverlayContent({
    overline: "앗!",
    title: "GAME OVER",
    subtitle: "화면을 터치하거나 스페이스를 눌러 다시 시작하세요.",
    scoreline: `점수 ${Math.floor(state.score)}  |  최고 ${Math.floor(
      state.bestScore
    )}`,
  });
  showOverlay();
}

function requestJump() {
  if (!state.running && !state.gameOver) {
    startGame();
  } else if (state.gameOver) {
    resetGame();
    startGame();
  }
  jumpQueued = true;
}

function spawnObstacle() {
  const scale = tuning.obstacleScale;
  const width = Math.round(
    clamp(rand(world.width * 0.04, world.width * 0.07) * scale, 30 * scale, 60 * scale)
  );
  const height = Math.round(
    clamp(rand(world.height * 0.06, world.height * 0.12) * scale, 40 * scale, 92 * scale)
  );
  const buffer = tuning.isMobile ? rand(80, 160) : rand(60, 140);
  const x = world.width + width + buffer;
  const y = world.groundY - height;
  const hue = rand(24, 32);
  state.obstacles.push({
    x,
    y,
    width,
    height,
    color: `hsl(${hue}deg 72% 54%)`,
  });
  const speedFactor = clamp(420 / state.speed, 0.9, 1.2);
  state.nextSpawn = rand(tuning.spawnMin, tuning.spawnMax) * speedFactor;
}

function updatePlayer(dt) {
  if (jumpQueued && state.player.onGround) {
    state.player.vy = -tuning.jumpVelocity;
    state.player.onGround = false;
  }
  jumpQueued = false;

  state.player.vy += tuning.gravity * dt;
  state.player.y += state.player.vy * dt;

  const floor = world.groundY - state.player.height;
  if (state.player.y >= floor) {
    state.player.y = floor;
    state.player.vy = 0;
    state.player.onGround = true;
  }
}

function updateObstacles(dt) {
  for (const obstacle of state.obstacles) {
    obstacle.x -= state.speed * dt;
  }
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20);
}

function checkCollision() {
  const pad = tuning.isMobile ? 6 : 12;
  const px = state.player.x + pad;
  const py = state.player.y + pad;
  const pw = state.player.width - pad * 2;
  const ph = state.player.height - pad * 2;

  for (const obstacle of state.obstacles) {
    if (
      px < obstacle.x + obstacle.width &&
      px + pw > obstacle.x &&
      py < obstacle.y + obstacle.height &&
      py + ph > obstacle.y
    ) {
      return true;
    }
  }
  return false;
}

function update(dt) {
  state.time += dt;
  const targetSpeed = Math.min(
    tuning.baseSpeed + state.time * tuning.speedRamp,
    tuning.maxSpeed
  );
  state.speed = state.running ? targetSpeed : tuning.baseSpeed;
  const travel = (state.running ? state.speed : tuning.baseSpeed * 0.35) * dt;
  state.scroll += travel;

  if (!state.running) {
    return;
  }

  updatePlayer(dt);
  state.nextSpawn -= dt;
  if (state.nextSpawn <= 0) {
    spawnObstacle();
  }
  updateObstacles(dt);
  if (checkCollision()) {
    endGame();
    return;
  }
  state.score += state.speed * dt * 0.06;
  ui.score.textContent = String(Math.floor(state.score));
}

function drawRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, "#cce8b4");
  gradient.addColorStop(0.55, "#e6f3c7");
  gradient.addColorStop(1, "#eaf6e1");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  drawHills(world.groundY - 140, "#d7efb1", 0.15, 90);
  drawHills(world.groundY - 90, "#b6e28a", 0.3, 70);
  drawHills(world.groundY - 30, "#8fce61", 0.5, 50);
}

function drawHills(baseY, color, speedFactor, height) {
  const offset = (state.scroll * speedFactor) % (world.width + 200);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-offset, baseY);
  for (let x = -offset; x <= world.width + 200; x += 160) {
    const peak = baseY - height * (0.6 + Math.sin((x + offset) * 0.01) * 0.2);
    ctx.quadraticCurveTo(x + 80, peak, x + 160, baseY);
  }
  ctx.lineTo(world.width + 200, world.height);
  ctx.lineTo(-200, world.height);
  ctx.closePath();
  ctx.fill();
}

function drawGround() {
  ctx.fillStyle = "#1b2217";
  ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);
  ctx.fillStyle = "#bfe79c";
  ctx.fillRect(0, world.groundY - 6, world.width, 6);

  const stripeGap = 40;
  const stripeWidth = 18;
  const stripeOffset = state.scroll * 0.5;
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  for (let x = -stripeGap; x < world.width + stripeGap; x += stripeGap) {
    const drawX = (x - stripeOffset) % (stripeGap * 2);
    ctx.fillRect(drawX, world.groundY + 18, stripeWidth, 6);
  }
}

function drawPlayer() {
  const p = state.player;
  const bob = Math.sin(state.time * 6) * (state.running ? 1.4 : 2.5);
  const y = p.y + bob;

  if (playerSpriteReady) {
    const aspect = playerSprite.width / playerSprite.height;
    let drawWidth = p.width;
    let drawHeight = p.width / aspect;
    if (drawHeight > p.height) {
      drawHeight = p.height;
      drawWidth = p.height * aspect;
    }
    const dx = p.x + (p.width - drawWidth) / 2;
    const dy = y + (p.height - drawHeight) / 2;
    ctx.drawImage(playerSprite, dx, dy, drawWidth, drawHeight);
    return;
  }

  ctx.fillStyle = "#0f172a";
  drawRoundedRect(p.x, y, p.width, p.height, 12);
  ctx.fill();

  ctx.fillStyle = "#f7e5c7";
  ctx.fillRect(
    p.x + p.width * 0.52,
    y + p.height * 0.18,
    p.width * 0.32,
    p.height * 0.24
  );

  ctx.strokeStyle = "#ef6a4a";
  ctx.lineWidth = Math.max(3, p.width * 0.08);
  ctx.beginPath();
  ctx.moveTo(p.x + p.width * 0.1, y + p.height * 0.55);
  ctx.lineTo(p.x + p.width * 0.9, y + p.height * 0.6);
  ctx.stroke();
}

function drawObstacles() {
  for (const obstacle of state.obstacles) {
    ctx.fillStyle = obstacle.color;
    drawRoundedRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 8);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(obstacle.x + 6, obstacle.y + 6, obstacle.width * 0.4, 6);
  }
}

function draw() {
  drawBackground();
  drawGround();
  drawObstacles();
  drawPlayer();
}

function tick(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
  }
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(tick);
}

function loadBestScore() {
  const stored = Number(localStorage.getItem("jump-kiwing-best"));
  state.bestScore = Number.isFinite(stored) ? stored : 0;
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    requestJump();
  }
});
window.addEventListener("pointerdown", (event) => {
  if (event.button === 0 || event.pointerType !== "mouse") {
    requestJump();
  }
});

loadBestScore();
resize();
resetGame();
requestAnimationFrame(tick);
