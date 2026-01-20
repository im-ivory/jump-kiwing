// main.js
// 이 파일은 "엔트리 포인트(시작점)" 역할이야.
// - 초기화 순서를 실행하고
// - 메인 루프(tick)를 requestAnimationFrame으로 계속 돌려서
//   매 프레임 update(상태 갱신) -> draw(그리기) 순서로 게임이 움직이게 함.

import { resize, resetGame, loadBestScore, startGame } from "./state.js"; // 화면/게임 상태 관련 초기화 함수들
import { bindInput } from "./input.js"; // 키/터치 입력 이벤트 등록
import { update } from "./update.js"; // 물리/스폰/충돌/점수 업데이트
import { draw } from "./render.js"; // 배경/땅/장애물/플레이어 렌더링

// 이전 프레임의 timestamp(밀리초)를 저장해서 dt(프레임 간 시간차)를 계산하기 위한 변수
let lastTime = 0;

// ==============================
// 메인 루프: tick()
// ==============================
// requestAnimationFrame이 매 프레임마다 timestamp를 넘겨주며 tick을 호출함.
// tick은 "이번 프레임에서 얼마나 시간이 흘렀는지(dt)"를 계산하고,
// update(dt)로 게임 상태를 갱신한 뒤 draw()로 화면에 그린다.
function tick(timestamp) {
  // 첫 프레임은 lastTime이 0이므로, dt 계산이 튀지 않게 lastTime을 현재로 맞춤
  if (!lastTime) lastTime = timestamp;

  // dt = (이번 프레임 시간 - 이전 프레임 시간) / 1000 => 초 단위로 변환
  // Math.min(..., 0.033)로 dt 상한을 걸어둠(약 33ms = 30fps).
  // 탭 전환/렉 등으로 프레임이 길게 멈췄을 때 dt가 커지면 물리가 폭주할 수 있어서 방지하는 안전장치.
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);

  // 다음 프레임 dt 계산을 위해 lastTime 갱신
  lastTime = timestamp;

  // 1) 게임 로직 업데이트(플레이어 중력/점프, 장애물 이동/스폰, 충돌, 점수 증가 등)
  update(dt);

  // 2) 현재 state/world 값을 바탕으로 캔버스에 그리기
  draw();

  // 다음 프레임에 tick을 다시 호출하도록 예약(브라우저가 적절한 타이밍에 호출)
  requestAnimationFrame(tick);
}

// ==============================
// 이벤트: 창 크기 변경 시 리사이즈 처리
// ==============================
// 창 크기가 변하면 캔버스/DPR/지면/플레이어 크기 등을 다시 계산해야
// 화면이 깨지지 않고 비율이 맞게 유지됨
window.addEventListener("resize", resize);

// ==============================
// 시작 시 초기화 순서
// ==============================

// 1) 로컬스토리지에 저장해둔 최고점(bestScore)을 불러와 state.bestScore에 세팅
loadBestScore();

// 2) 현재 화면 크기 기준으로 캔버스 크기/DPR/groundY/플레이어 크기 등을 계산
resize();

// 3) 게임 상태를 "시작 전"으로 초기화하고 오버레이(안내 화면) 표시
resetGame();

// 4) 키보드/터치 입력 이벤트 리스너를 등록(스페이스/터치로 점프 요청)
bindInput();

// 5) 메인 루프 시작: 이후부터 매 프레임 tick -> update/draw가 반복됨
requestAnimationFrame(tick);

const startBtn = document.getElementById("start-btn");
if (startBtn) {
  startBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // 혹시 overlay 클릭 이벤트가 있으면 방지
    startGame();
  });
}
