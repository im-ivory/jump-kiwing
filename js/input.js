// input.js
// 이 파일은 "사용자 입력(키보드/마우스/터치)"을 처리하는 전용 모듈이야.
// 핵심 개념:
// - 입력이 들어오면 즉시 플레이어를 점프시키지 않고
// - "점프 요청(jumpQueued = true)"만 기록해 둔 뒤
// - 실제 점프 처리는 다음 프레임의 updatePlayer()에서 하도록 분리함
//   → 프레임 동기화 + 물리 계산 안정성 확보

import { state, startGame, resetGame } from "./state.js";

// "이번 프레임에 점프를 해야 하는지"를 기억하는 플래그
// true가 되면 update.js 쪽에서 consumeJumpQueued()로 가져가 처리함
let jumpQueued = false;

// ==============================
// consumeJumpQueued()
// ==============================
// update.js에서 호출되는 함수.
// - 현재 jumpQueued 값을 반환하고
// - 즉시 false로 초기화해서 "한 번의 입력 = 한 번의 점프"가 되게 함
export function consumeJumpQueued() {
  const v = jumpQueued; // 현재 점프 요청 상태 저장
  jumpQueued = false; // 소비했으므로 초기화
  return v; // update 쪽으로 전달
}

// ==============================
// requestJump()
// ==============================
// 실제로 "점프 입력이 들어왔을 때" 호출되는 내부 함수
// - 게임 상태에 따라 시작/리셋 처리
// - 그리고 jumpQueued를 true로 설정
function requestJump() {
  // 게임 시작/리셋은 버튼에서만 처리하고,
  // 플레이 중일 때만 점프 입력을 받음
  if (!state.running) return;

  // 실제 점프는 update 단계에서 처리하도록 "요청"만 저장
  jumpQueued = true;
}

// ==============================
// bindInput()
// ==============================
// main.js에서 한 번 호출되어
// 키보드/마우스/터치 이벤트 리스너를 등록함
export function bindInput() {
  // 키보드 입력 처리 (스페이스바)
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault(); // 스페이스 누를 때 페이지 스크롤되는 것 방지
      requestJump(); // 점프 요청
    }
  });

  // 포인터 입력 처리 (마우스 클릭, 터치, 펜 등)
  window.addEventListener("pointerdown", (event) => {
    // 마우스 왼쪽 버튼이거나, 터치/펜 등 마우스가 아닌 포인터인 경우만 처리
    if (event.button === 0 || event.pointerType !== "mouse") {
      requestJump(); // 점프 요청
    }
  });
}
