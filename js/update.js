// update.js
import { state, world, tuning, ui, clamp, rand, endGame } from "./state.js";
import { consumeJumpQueued } from "./input.js";

function spawnObstacle() {
  const scale = tuning.obstacleScale;

  const width = Math.round(
    clamp(
      rand(world.width * 0.04, world.width * 0.07) * scale,
      30 * scale,
      60 * scale,
    ),
  );
  const height = Math.round(
    clamp(
      rand(world.height * 0.06, world.height * 0.12) * scale,
      40 * scale,
      92 * scale,
    ),
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

  const speedFactor = clamp(420 / state.speed, 0.6, 1.2);
  state.nextSpawn = rand(tuning.spawnMin, tuning.spawnMax) * speedFactor;
}

function updatePlayer(dt) {
  const jump = consumeJumpQueued();
  if (jump && state.player.onGround) {
    state.player.vy = -tuning.jumpVelocity;
    state.player.onGround = false;
  }

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
  state.obstacles = state.obstacles.filter((o) => o.x + o.width > -20);
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
    )
      return true;
  }
  return false;
}

export function update(dt) {
  state.time += dt;

  const targetSpeed = tuning.baseSpeed + state.time * tuning.speedRamp;
  state.speed = state.running ? targetSpeed : tuning.baseSpeed;

  const travel = (state.running ? state.speed : tuning.baseSpeed * 0.35) * dt;
  state.scroll += travel;

  if (!state.running) return;

  updatePlayer(dt);

  state.nextSpawn -= dt;
  if (state.nextSpawn <= 0) spawnObstacle();

  updateObstacles(dt);

  if (checkCollision()) {
    endGame();
    return;
  }

  state.score += state.speed * dt * 0.06;
  ui.score.textContent = String(Math.floor(state.score));
}
