// input.js
import { state, startGame, resetGame } from "./state.js";

let jumpQueued = false;

export function consumeJumpQueued() {
  const v = jumpQueued;
  jumpQueued = false;
  return v;
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

export function bindInput() {
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
}
