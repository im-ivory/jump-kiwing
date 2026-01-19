// render.js
import { ctx, state, world } from "./state.js";

const playerSprite = new Image();
playerSprite.src = "assets/flying_kiwing.png";
let playerSpriteReady = false;
playerSprite.onload = () => {
  playerSpriteReady = true;
};

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

function drawObstacles() {
  for (const obstacle of state.obstacles) {
    ctx.fillStyle = obstacle.color;
    drawRoundedRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 8);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(obstacle.x + 6, obstacle.y + 6, obstacle.width * 0.4, 6);
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
    p.height * 0.24,
  );

  ctx.strokeStyle = "#ef6a4a";
  ctx.lineWidth = Math.max(3, p.width * 0.08);
  ctx.beginPath();
  ctx.moveTo(p.x + p.width * 0.1, y + p.height * 0.55);
  ctx.lineTo(p.x + p.width * 0.9, y + p.height * 0.6);
  ctx.stroke();
}

export function draw() {
  drawBackground();
  drawGround();
  drawObstacles();
  drawPlayer();
}
