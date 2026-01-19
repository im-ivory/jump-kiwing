// state.js
export const canvas = document.getElementById("game");
export const ctx = canvas.getContext("2d");

export const ui = {
  score: document.getElementById("score"),
  overlay: document.getElementById("overlay"),
  overline: document.getElementById("overlay-overline"),
  title: document.getElementById("overlay-title"),
  subtitle: document.getElementById("overlay-subtitle"),
  scoreline: document.getElementById("overlay-score"),
};

export const baseConfig = {
  baseSpeed: 350,
  speedRamp: 11,
  gravity: 2600,
  jumpVelocity: 980,
  spawnMin: 0.95,
  spawnMax: 1.7,
};

export const tuning = {
  ...baseConfig,
  isMobile: false,
  playerScale: 1.3,
  obstacleScale: 1,
  groundRatio: 0.78,
};

export const state = {
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

export const world = {
  width: 0,
  height: 0,
  groundY: 0,
};

// utils
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
export function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// overlay helpers
export function setOverlayContent({ overline, title, subtitle, scoreline }) {
  ui.overline.textContent = overline;
  ui.title.textContent = title;
  ui.subtitle.textContent = subtitle;
  ui.scoreline.textContent = scoreline || "";
}
export function hideOverlay() {
  ui.overlay.classList.add("hidden");
}
export function showOverlay() {
  ui.overlay.classList.remove("hidden");
}

export function applyTuning() {
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
      gravity: 2300,
      jumpVelocity: 940,
      spawnMin: 0.9,
      spawnMax: 1.6,
      playerScale: 2,
      obstacleScale: 0.95,
      groundRatio: 0.8,
    });
  }
}

export function resize() {
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
    clamp(base * 0.05 * playerScale, 36 * playerScale, 62 * playerScale),
  );
  state.player.height = Math.round(
    clamp(base * 0.07 * playerScale, 48 * playerScale, 82 * playerScale),
  );

  state.player.x = Math.round(world.width * (tuning.isMobile ? 0.16 : 0.18));

  if (!state.running) {
    state.player.y = world.groundY - state.player.height;
  } else {
    state.player.y = Math.min(
      state.player.y,
      world.groundY - state.player.height,
    );
  }
}

export function resetGame() {
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

export function startGame() {
  state.running = true;
  state.gameOver = false;
  hideOverlay();
}

export function endGame() {
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
    scoreline: `점수 ${Math.floor(state.score)}  |  최고 ${Math.floor(state.bestScore)}`,
  });
  showOverlay();
}

export function loadBestScore() {
  const stored = Number(localStorage.getItem("jump-kiwing-best"));
  state.bestScore = Number.isFinite(stored) ? stored : 0;
}
