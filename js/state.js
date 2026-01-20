// state.js
// 이 파일은 "게임의 공유 데이터 + 화면/리사이즈 세팅 + 오버레이/UI 헬퍼 + 게임 시작/종료/리셋"을 한 곳에 모아둔 모듈이야.
// 다른 파일(main/update/render/input)에서 import 해서 같은 state/world/tuning을 함께 사용하게 해줌.

// ==============================
// 1) Canvas / Context (그리기용)
// ==============================

// HTML의 <canvas id="game"> 엘리먼트를 가져옴
export const canvas = document.getElementById("game");

// 캔버스에 그림을 그리기 위한 2D 컨텍스트(붓 같은 역할)
export const ctx = canvas.getContext("2d");

// ==============================
// 2) UI DOM 참조 (점수/오버레이)
// ==============================

// 점수 텍스트, 오버레이 패널 등 "화면 위 HTML 요소"를 미리 잡아둠
// 매번 document.getElementById(...)를 반복 호출하지 않아도 됨(성능/가독성)
export const ui = {
  score: document.getElementById("score"),
  overlay: document.getElementById("overlay"),
  overline: document.getElementById("overlay-overline"),
  title: document.getElementById("overlay-title"),
  subtitle: document.getElementById("overlay-subtitle"),
  scoreline: document.getElementById("overlay-score"),
  illustration: document.getElementById("overlay-illustration"),
  gameover: document.getElementById("overlay-gameover"),
  rankingList: document.getElementById("overlay-ranking-list"),
  scoreValue: document.getElementById("overlay-score-value"),
  bestValue: document.getElementById("overlay-best-value"),
  rankValue: document.getElementById("overlay-rank-value"),
  startButton: document.getElementById("start-btn"),
};

// ==============================
// 3) 기본 게임 튜닝값(기준값)
// ==============================

// "게임 난이도/물리"의 기본값(PC 기준)
// - baseSpeed: 기본 달리기 속도(px/s)
// - speedRamp: 시간에 따른 속도 증가량(난이도 상승)
// - gravity: 중력 가속도(px/s^2)
// - jumpVelocity: 점프 초기 속도(px/s)
// - spawnMin/Max: 장애물 생성 간격 범위(초)
export const baseConfig = {
  baseSpeed: 350,
  speedRamp: 11,
  gravity: 2600,
  jumpVelocity: 980,
  spawnMin: 0.95,
  spawnMax: 1.7,
};

// ==============================
// 4) 실제 적용되는 튜닝값(tuning)
// ==============================

// baseConfig를 복사한 뒤, 모바일/화면 조건에 따라 값이 변하는 설정을 담는 객체
// applyTuning()이 이 값을 매번 덮어써서(업데이트) "현재 환경에 맞는 값"을 유지함
export const tuning = {
  ...baseConfig, // baseConfig의 속성들을 복사해서 시작
  isMobile: false, // 모바일 판정 결과
  playerScale: 1.3, // 플레이어 스케일(화면 크기에 곱해짐)
  obstacleScale: 1, // 장애물 스케일
  groundRatio: 0.78, // 화면 높이 대비 지면 y 위치 비율
};

// ==============================
// 5) 게임 상태(state): 매 프레임 바뀌는 값들
// ==============================

// 게임 진행 상태와 "월드 안에 존재하는 객체들(플레이어, 장애물)"의 현재값을 저장
// update.js가 주로 수정하고, render.js가 주로 읽어서 화면에 그림
export const state = {
  running: false, // 게임이 진행 중인지(오버레이 닫힌 상태)
  gameOver: false, // 게임오버 상태인지
  time: 0, // running 동안 누적 시간(초)
  scroll: 0, // 배경 패럴랙스용 누적 이동량(px)
  speed: baseConfig.baseSpeed, // 현재 속도(px/s) (시간에 따라 증가)
  score: 0, // 현재 점수(누적)
  bestScore: 0, // 최고 점수(로컬스토리지에서 불러오고 저장)
  nextSpawn: 1.1, // 다음 장애물 생성까지 남은 시간(초)
  obstacles: [], // 장애물 목록 [{x,y,width,height,color}, ...]
  player: {
    x: 140, // 플레이어 x(왼쪽 기준 위치)
    y: 0, // 플레이어 y(상단 기준 위치)
    width: 44, // 렌더/충돌용 너비
    height: 56, // 렌더/충돌용 높이
    vy: 0, // 수직 속도(px/s) (점프/중력에서 사용)
    onGround: true, // 땅에 붙어있는지(2단 점프 방지)
  },
};

// ==============================
// 6) 월드 정보(world): 화면/지형 관련 고정값
// ==============================

// 현재 화면 크기, 지면 위치 같은 "환경값"
// resize()에서 계산해서 세팅함
export const world = {
  width: 0, // CSS 픽셀 기준 화면 너비
  height: 0, // CSS 픽셀 기준 화면 높이
  groundY: 0, // 지면 y 좌표(플레이어/장애물 바닥 기준)
};

// ==============================
// 7) 유틸 함수(수학)
// ==============================

// clamp: 값을 min~max 범위로 제한
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// rand: min~max 사이의 실수 난수 생성
export function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// ==============================
// 8) 오버레이(시작/게임오버 화면) 제어
// ==============================

// 오버레이 안의 문구를 한번에 바꾸는 함수
// resetGame(), endGame()에서 호출함
export function setOverlayContent({ overline, title, subtitle, scoreline }) {
  ui.overline.textContent = overline;
  ui.title.textContent = title;
  ui.subtitle.textContent = subtitle;
  ui.scoreline.textContent = scoreline || "";
}

function setOverlayMode(mode) {
  const isGameOver = mode === "gameover";
  ui.overlay.classList.toggle("is-gameover", isGameOver);

  ui.illustration.classList.toggle("is-hidden", isGameOver);
  ui.gameover.classList.toggle("is-hidden", !isGameOver);

  if (ui.startButton) {
    ui.startButton.textContent = isGameOver ? "RESTART" : "GAME START";
  }
}

function renderRanking({ currentScore, bestScore }) {
  ui.rankingList.textContent = "";

  const base = Math.max(bestScore, currentScore);
  const values = [
    base,
    Math.max(base - 75, 0),
    Math.max(base - 180, 0),
    Math.max(base - 250, 0),
    Math.max(base - 320, 0),
  ];

  values.forEach((value, index) => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    const score = document.createElement("span");
    const rank = `${index + 1}${["ST", "ND", "RD"][index] || "TH"}`;

    label.textContent = rank;
    score.textContent = String(value).padStart(5, "0");

    item.appendChild(label);
    item.appendChild(score);
    ui.rankingList.appendChild(item);
  });
}

// 오버레이 숨김(게임 시작 시)
export function hideOverlay() {
  ui.overlay.classList.add("hidden");
}

// 오버레이 표시(시작 대기/게임오버 시)
export function showOverlay() {
  ui.overlay.classList.remove("hidden");
}

// ==============================
// 9) 환경에 따른 튜닝 적용(모바일/PC 보정)
// ==============================

// applyTuning은 "현재 기기/화면 조건"을 보고 tuning 값을 재설정해줌
// - pointer: coarse => 터치 기반(손가락/펜)일 확률 높음
// - max-width: 820px => 화면이 좁으면 모바일로 간주
export function applyTuning() {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrowScreen = window.matchMedia("(max-width: 820px)").matches;
  const isMobile = coarsePointer || narrowScreen;

  // 1) 먼저 tuning을 "기본값(baseConfig)"으로 되돌린 뒤(덮어쓰기)
  // 2) 공통 기본 보정값을 적용
  Object.assign(tuning, baseConfig, {
    isMobile,
    playerScale: 2.5,
    obstacleScale: 1,
    groundRatio: 0.78,
  });

  // 모바일이면 난이도를 살짝 낮추고(속도/중력/스폰 간격),
  // 플레이어/장애물 크기 등을 화면에 맞게 조정
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

// ==============================
// 10) resize(): 캔버스 크기/지면/플레이어 크기 재계산
// ==============================

// 창 크기 바뀌거나(리사이즈), 시작 시 한 번 호출해서
// - DPR(레티나) 대응 캔버스 해상도 세팅
// - world 크기/groundY 계산
// - 플레이어 크기/위치 재계산
export function resize() {
  // 현재 환경 기준으로 tuning 업데이트
  applyTuning();

  // DPR(디바이스 픽셀 비율)로 레티나 선명도 보정
  // canvas 실제 픽셀은 크게 잡고, ctx 변환으로 CSS 픽셀 단위처럼 그리게 만듦
  const dpr = window.devicePixelRatio || 1;

  // CSS 픽셀 기준 화면 크기
  world.width = window.innerWidth;
  world.height = window.innerHeight;

  // 실제 캔버스 픽셀 크기 = CSS 픽셀 * dpr
  canvas.width = world.width * dpr;
  canvas.height = world.height * dpr;

  // ctx 좌표계를 "CSS 픽셀 기준"으로 맞춰서 그리기 쉽게 함
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 지면 y 좌표(화면 높이에 비례)
  world.groundY = Math.round(world.height * tuning.groundRatio);

  // 플레이어 크기는 화면의 짧은 변(base)에 비례하도록 설계
  // clamp로 너무 작거나 너무 커지는 걸 방지
  const base = Math.min(world.width, world.height);
  const playerScale = tuning.playerScale;

  state.player.width = Math.round(
    clamp(base * 0.05 * playerScale, 36 * playerScale, 62 * playerScale),
  );
  state.player.height = Math.round(
    clamp(base * 0.07 * playerScale, 48 * playerScale, 82 * playerScale),
  );

  // 플레이어 x는 화면 비율로 고정(모바일은 조금 더 왼쪽)
  state.player.x = Math.round(world.width * (tuning.isMobile ? 0.16 : 0.18));

  // 게임이 멈춘 상태(시작 전/게임오버)면 플레이어를 바닥 위로 딱 붙여둠
  if (!state.running) {
    state.player.y = world.groundY - state.player.height;
  } else {
    // 진행 중일 때는 "바닥 아래로 파고들지 않게"만 보정(점프 중 위치 보존)
    state.player.y = Math.min(
      state.player.y,
      world.groundY - state.player.height,
    );
  }
}

// ==============================
// 11) resetGame(): 게임을 시작 전 상태로 초기화
// ==============================

// - 진행/게임오버 플래그 초기화
// - 시간, 스크롤, 점수 초기화
// - 장애물 초기화
// - 플레이어를 바닥에 두고 물리 초기화
// - 오버레이(시작 안내) 표시
export function resetGame() {
  state.running = false;
  state.gameOver = false;

  state.time = 0;
  state.scroll = 0;
  state.speed = tuning.baseSpeed;
  state.score = 0;

  // 다음 장애물 생성까지 랜덤 시간 부여
  state.nextSpawn = rand(tuning.spawnMin, tuning.spawnMax);
  state.obstacles = [];

  // 플레이어 물리값 초기화
  state.player.vy = 0;
  state.player.onGround = true;
  state.player.y = world.groundY - state.player.height;

  // UI 점수 표시 초기화
  ui.score.textContent = "0";

  // 시작 오버레이 문구 세팅 후 표시
  setOverlayContent({
    overline: "",
    title: "JUMP KIWING",
    subtitle: "화면을 터치하여 점프하세요!",
    scoreline: "",
  });
  setOverlayMode("start");
  showOverlay();
}

// ==============================
// 12) startGame(): 오버레이를 닫고 게임 진행 시작
// ==============================

export function startGame() {
  state.running = true; // update에서 실제 물리/스폰/점수 업데이트가 돌기 시작
  state.gameOver = false; // 게임오버 플래그 해제(안전)
  hideOverlay(); // 시작하면 오버레이 숨김
}

// ==============================
// 13) endGame(): 게임오버 처리
// ==============================

// - running을 멈추고(game update 중단)
// - 최고점 저장
// - 게임오버 오버레이 표시
export function endGame() {
  state.running = false;
  state.gameOver = true;

  // 현재 점수가 최고점보다 크면 업데이트하고 localStorage에 저장
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem("jump-kiwing-best", String(state.bestScore));
  }

  // 게임오버 오버레이 문구 세팅 후 표시
  setOverlayContent({
    overline: "",
    title: "GAME OVER",
    subtitle: "",
    scoreline: "",
  });
  ui.scoreValue.textContent = String(Math.floor(state.score)).padStart(5, "0");
  ui.bestValue.textContent = String(Math.floor(state.bestScore)).padStart(5, "0");
  ui.rankValue.textContent = "136TH";
  renderRanking({
    currentScore: Math.floor(state.score),
    bestScore: Math.floor(state.bestScore),
  });
  setOverlayMode("gameover");
  showOverlay();
}

// ==============================
// 14) loadBestScore(): 저장된 최고점 불러오기
// ==============================

// 게임 시작 시 1번 호출해서 bestScore를 초기화해둠
// localStorage에 없으면 0으로 처리
export function loadBestScore() {
  const stored = Number(localStorage.getItem("jump-kiwing-best"));
  state.bestScore = Number.isFinite(stored) ? stored : 0;
}
