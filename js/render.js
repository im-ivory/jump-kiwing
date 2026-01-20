// render.js
// 이 파일은 "캔버스에 그리는 역할(렌더링)"만 담당해.
// update.js가 state/world 값을 갱신하면,
// render.js는 그 값들을 읽어서 매 프레임 화면을 다시 그림.
//
// 그리는 순서(레이어):
// 1) 배경(하늘 그라데이션 + 언덕 3겹)
// 2) 땅(지면 + 상단 라인 + 줄무늬)
// 3) 장애물
// 4) 플레이어(스프라이트 or 대체 도형)

import { ctx, state, world } from "./state.js";

// ==============================
// 1) 플레이어 스프라이트 로드
// ==============================

// 이미지 객체 생성
const playerSprite = new Image();

// 이미지 경로 지정(서버 기준 상대 경로)
// index.html이 있는 위치 기준이 아니라, "현재 문서의 URL 기준"으로 해석됨.
// (지금은 /assets/flying_kiwing.png 같은 구조라고 가정)
playerSprite.src = "assets/flying_kiwing.png";

// 이미지가 로드 완료됐는지 여부
// 로드 전에는 drawPlayer에서 대체 도형으로 그려줌
let playerSpriteReady = false;

// 이미지 로드가 끝나면 ready 플래그를 true로 바꿈
playerSprite.onload = () => {
  playerSpriteReady = true;
};

// ==============================
// 1-1) 장애물 스프라이트 로드
// ==============================
const obstacleSprite = new Image();
obstacleSprite.src = "assets/tree.png";
let obstacleSpriteReady = false;
obstacleSprite.onload = () => {
  obstacleSpriteReady = true;
};

// ==============================
// 2) 도형 유틸: 둥근 사각형 경로 만들기
// ==============================
// drawRoundedRect는 "그리지는 않고" 경로(path)만 만들어.
// 호출한 쪽에서 ctx.fill() 또는 ctx.stroke()를 해야 실제로 그려짐.
function drawRoundedRect(x, y, width, height, radius) {
  // radius가 너무 커져서 모양이 깨지지 않도록
  // width/2, height/2를 넘지 않게 제한
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();

  // 시작점(왼쪽 위에서 r만큼 오른쪽)
  ctx.moveTo(x + r, y);

  // arcTo로 각 모서리를 둥글게 연결
  ctx.arcTo(x + width, y, x + width, y + height, r); // 오른쪽 위
  ctx.arcTo(x + width, y + height, x, y + height, r); // 오른쪽 아래
  ctx.arcTo(x, y + height, x, y, r); // 왼쪽 아래
  ctx.arcTo(x, y, x + width, y, r); // 왼쪽 위

  ctx.closePath();
}

// ==============================
// 2-1) 선인장 장애물 그리기
// ==============================
function drawCactus(x, y, width, height, fillColor) {
  if (obstacleSpriteReady) {
    const aspect = obstacleSprite.width / obstacleSprite.height;
    const scale = 2;
    let drawWidth = width;
    let drawHeight = width / aspect;

    if (drawHeight > height) {
      drawHeight = height;
      drawWidth = height * aspect;
    }

    drawWidth *= scale;
    drawHeight *= scale;

    const dx = x + width / 2 - drawWidth / 2;
    const dy = y + height - drawHeight;
    ctx.drawImage(obstacleSprite, dx, dy, drawWidth, drawHeight);
    return;
  }

  ctx.save();
  ctx.fillStyle = fillColor;
  drawRoundedRect(x, y, width, height, Math.min(10, width * 0.2));
  ctx.fill();
  ctx.restore();
}

// ==============================
// 3) 언덕 레이어(패럴랙스) 그리기
// ==============================
// baseY: 언덕이 놓일 기준 y
// color: 언덕 색
// speedFactor: scroll에 곱할 패럴랙스 비율(작을수록 더 멀리 있는 느낌)
// height: 언덕 봉우리 높이
function drawHills(baseY, color, speedFactor, height) {
  // state.scroll(누적 이동량)을 speedFactor만큼 느리게 적용해서
  // 레이어마다 움직임이 다르게 보이게 함
  const offset = (state.scroll * speedFactor) % (world.width + 200);

  ctx.fillStyle = color;
  ctx.beginPath();

  // 왼쪽 밖에서 시작(스크롤에 따라 좌우 반복되게)
  ctx.moveTo(-offset, baseY);

  // 일정 간격(160px)마다 곡선 언덕을 반복해서 그림
  for (let x = -offset; x <= world.width + 200; x += 160) {
    // peak(봉우리) 높이를 sin으로 살짝 흔들어서 기계적인 반복 느낌을 줄임
    const peak = baseY - height * (0.6 + Math.sin((x + offset) * 0.01) * 0.2);

    // x+80 지점이 제어점(봉우리), x+160이 다음 바닥점
    ctx.quadraticCurveTo(x + 80, peak, x + 160, baseY);
  }

  // 아래쪽을 화면 끝까지 채워서 "언덕 덩어리"로 만들기
  ctx.lineTo(world.width + 200, world.height);
  ctx.lineTo(-200, world.height);

  ctx.closePath();
  ctx.fill();
}

// ==============================
// 4-1) 작은 구름 그리기
// ==============================
function drawCloud(x, y, size) {
  const w = size;
  const h = size * 0.6;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  // 둥근 상단 3개 원 + 아래 둥근 베이스
  ctx.ellipse(x - w * 0.18, y + h * 0.05, w * 0.28, h * 0.28, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.02, y - h * 0.18, w * 0.32, h * 0.34, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.28, y + h * 0.04, w * 0.26, h * 0.26, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.05, y + h * 0.2, w * 0.46, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ==============================
// 4) 배경 그리기(하늘 + 언덕)
// ==============================
// 하늘은 세로 그라데이션으로 깔고,
// 언덕을 3겹으로 깔아서 깊이감을 만듦(패럴랙스)
function drawBackground() {
  // 하늘 배경 그라데이션 생성
  const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, "#E0F9FF");
  gradient.addColorStop(0.55, "#E0F9FF");
  gradient.addColorStop(1, "#E0F9FF");

  // 캔버스 전체를 배경색으로 채움
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  // 작은 구름 2개
  drawCloud(world.width * 0.28, world.height * 0.18, 60);
  drawCloud(world.width * 0.72, world.height * 0.26, 40);

  // 언덕 3겹: 멀리(느리게) -> 가까이(빠르게)
  drawHills(world.groundY - 140, "#d7efb1", 0.15, 90);
  drawHills(world.groundY - 90, "#b6e28a", 0.3, 70);
  drawHills(world.groundY - 30, "#8fce61", 0.5, 50);
}

// ==============================
// 5) 땅(지면) 그리기
// ==============================
// 지면 색 + 상단 라인 + 움직이는 줄무늬로 "달리는 느낌"을 만듦
function drawGround() {
  // 땅 본체(groundY 아래를 전부 채움)
  ctx.fillStyle = "#F0FFAD";
  ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);

  // 땅 상단 라인(땅과 동일하게 맞춰 하늘 띠 제거)
  ctx.fillStyle = "#F0FFAD";
  ctx.fillRect(0, world.groundY - 6, world.width, 6);

  // 바닥 줄무늬(패럴랙스처럼 흐르게)
  const stripeGap = 40; // 줄무늬 간격
  const stripeWidth = 18; // 줄무늬 너비
  const stripeOffset = state.scroll * 0.5; // scroll에 비례해서 줄무늬가 이동

  ctx.fillStyle = "rgba(255, 255, 255, 0.26)";
  for (let x = -stripeGap; x < world.width + stripeGap; x += stripeGap) {
    // offset에 따라 줄무늬가 계속 흐르도록 mod 연산
    const drawX = (x - stripeOffset) % (stripeGap * 2);
    ctx.fillRect(drawX, world.groundY + 18, stripeWidth, 6);
  }
}

// ==============================
// 6) 장애물 그리기
// ==============================
// update.js에서 만든 state.obstacles 배열을 순회하면서 사각형 장애물을 그림
function drawObstacles() {
  for (const obstacle of state.obstacles) {
    drawCactus(
      obstacle.x,
      obstacle.y,
      obstacle.width,
      obstacle.height,
      obstacle.color,
    );
  }
}

// ==============================
// 7) 플레이어 그리기(스프라이트 or 대체 도형)
// ==============================
// - state.player의 위치/크기를 기반으로 그림
// - bob(위아래 흔들림)으로 살아있는 느낌 추가
// - 스프라이트가 로드됐으면 이미지로 그림
// - 로드 전이면 임시 도형으로 그림
function drawPlayer() {
  const p = state.player;

  // 위아래로 살짝 흔들리는 값(시간에 따라 sin)
  // running일 땐 더 작게, 대기 중일 땐 더 크게 흔들리게 해서 "idle" 느낌
  const bob = Math.sin(state.time * 6) * (state.running ? 1.4 : 2.5);

  // 최종 y 좌표(물리 y + 흔들림)
  const y = p.y + bob;

  // ------------------------------
  // 7-1) 스프라이트로 그리기
  // ------------------------------
  if (playerSpriteReady) {
    // 이미지 원본 비율(가로/세로)
    const aspect = playerSprite.width / playerSprite.height;

    // 기본은 "플레이어 박스의 width"에 맞춰서 이미지 크기를 정함
    let drawWidth = p.width;
    let drawHeight = p.width / aspect;

    // 그렇게 했더니 세로가 너무 커서 박스를 넘치면,
    // 이번엔 "플레이어 박스의 height"에 맞춰서 다시 계산
    if (drawHeight > p.height) {
      drawHeight = p.height;
      drawWidth = p.height * aspect;
    }

    // 플레이어 박스 중앙에 이미지가 오도록 좌표를 조정
    const dx = p.x + (p.width - drawWidth) / 2;
    const dy = y + (p.height - drawHeight) / 2;

    // 캔버스에 이미지 그리기
    ctx.drawImage(playerSprite, dx, dy, drawWidth, drawHeight);
    return;
  }

  // ------------------------------
  // 7-2) 로드 전: 대체 도형으로 그리기
  // ------------------------------

  // 몸통(둥근 사각형)
  ctx.fillStyle = "#0f172a";
  drawRoundedRect(p.x, y, p.width, p.height, 12);
  ctx.fill();

  // 얼굴/배 같은 밝은 사각형(간단한 디테일)
  ctx.fillStyle = "#f7e5c7";
  ctx.fillRect(
    p.x + p.width * 0.52,
    y + p.height * 0.18,
    p.width * 0.32,
    p.height * 0.24,
  );

  // 주황색 라인(장식/표정 같은 느낌)
  ctx.strokeStyle = "#ef6a4a";
  ctx.lineWidth = Math.max(3, p.width * 0.08); // 크기에 비례해서 두께 조절
  ctx.beginPath();
  ctx.moveTo(p.x + p.width * 0.1, y + p.height * 0.55);
  ctx.lineTo(p.x + p.width * 0.9, y + p.height * 0.6);
  ctx.stroke();
}

// ==============================
// 8) 외부로 공개되는 draw()
// ==============================
// main.js에서 매 프레임 호출.
// "현재 state"를 기반으로 화면을 한 프레임 완성해서 그려줌.
export function draw() {
  drawBackground(); // 배경(하늘+언덕)
  drawGround(); // 땅(지면)
  drawObstacles(); // 장애물
  drawPlayer(); // 플레이어(가장 위 레이어)
}
