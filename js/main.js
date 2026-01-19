// main.js
import { resize, resetGame, loadBestScore } from "./state.js";
import { bindInput } from "./input.js";
import { update } from "./update.js";
import { draw } from "./render.js";

let lastTime = 0;

function tick(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(tick);
}

window.addEventListener("resize", resize);

loadBestScore();
resize();
resetGame();
bindInput();
requestAnimationFrame(tick);
