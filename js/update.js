// update.js
// 이 파일은 "게임의 규칙(로직)"을 담당해.
// 매 프레임마다 main.js의 tick()이 update(dt)를 호출하고,
// update(dt)는 아래 순서로 state를 갱신해:
// 1) 시간/속도/스크롤(배경 이동량) 갱신
// 2) (게임이 running일 때만) 플레이어 물리 업데이트
// 3) 장애물 스폰 타이머 처리 + 장애물 이동
// 4) 충돌 체크 -> 충돌이면 endGame()
// 5) 점수 계산 + UI 점수 표시 업데이트

import { state, world, tuning, ui, clamp, rand, endGame } from "./state.js";
import { consumeJumpQueued } from "./input.js"; // 입력 모듈에 저장된 "점프 요청"을 가져와 소비

// ==============================
// 1) 장애물 생성(spawnObstacle)
// ==============================
// 스폰할 때마다:
// - 화면 크기에 비례해서 장애물 크기를 랜덤으로 정하고
// - 화면 오른쪽 바깥에서 시작하게 x를 잡고
// - 지면 위에 붙게 y를 잡고
// - 색상(hue)을 약간 랜덤으로 하고
// - state.obstacles 배열에 넣어둠
// - 다음 스폰까지의 시간(state.nextSpawn)을 새로 설정함
function spawnObstacle() {
  // 장애물 크기 전체 스케일(모바일이면 약간 작게 등)
  const scale = tuning.obstacleScale;

  // 장애물 너비: 화면 너비 기반 범위를 랜덤으로 뽑고 clamp로 최소/최대 제한
  const width = Math.round(
    clamp(
      rand(world.width * 0.04, world.width * 0.07) * scale, // 화면 비율 기반 랜덤
      30 * scale, // 너무 작지 않게
      60 * scale, // 너무 크지 않게
    ),
  );

  // 장애물 높이: 화면 높이 기반 범위를 랜덤으로 뽑고 clamp로 제한
  const height = Math.round(
    clamp(
      rand(world.height * 0.06, world.height * 0.12) * scale,
      40 * scale,
      92 * scale,
    ),
  );

  // 스폰 버퍼: 장애물이 화면 오른쪽에서 "여유"를 두고 나오게 함
  // 모바일은 손가락 입력/화면 좁음 때문에 조금 더 넉넉하게 주는 편
  const buffer = tuning.isMobile ? rand(80, 160) : rand(60, 140);

  // 장애물 시작 x: 화면 오른쪽 끝보다 더 오른쪽(화면 밖)에서 시작
  const x = world.width + width + buffer;

  // 장애물 y: 지면 위에 딱 붙도록(장애물의 바닥 = groundY)
  const y = world.groundY - height;

  // 색상을 약간 랜덤하게(비슷한 톤 안에서만 흔들림)
  const hue = rand(24, 32);

  // 장애물 데이터 객체를 state.obstacles 배열에 추가
  // render.js는 이 배열을 읽어 장애물을 그림
  state.obstacles.push({
    x,
    y,
    width,
    height,
    color: `hsl(${hue}deg 72% 54%)`,
  });

  // 속도가 빨라질수록 스폰 간격도 "체감상" 빨라지게 보정
  // state.speed가 커지면 420/state.speed가 작아지고, clamp로 0.6~1.2 사이 제한
  // 결과적으로 speedFactor가 작아져 nextSpawn이 줄어드는 방향
  const speedFactor = clamp(420 / state.speed, 0.6, 1.2);

  // 다음 장애물 생성까지 남은 시간(초)을 랜덤으로 설정(속도 보정 적용)
  state.nextSpawn = rand(tuning.spawnMin, tuning.spawnMax) * speedFactor;
}

// ==============================
// 2) 플레이어 물리 업데이트(updatePlayer)
// ==============================
// dt(초) 단위로 물리를 적분하는 방식:
// - 입력에서 jumpQueued를 가져와 점프를 시작할지 결정
// - 중력으로 vy를 증가시키고
// - vy로 y를 이동시키고
// - 바닥과 충돌하면 y/vy/onGround를 정리
function updatePlayer(dt) {
  // 입력 모듈에서 "점프 요청"을 가져옴(가져오면서 false로 초기화됨)
  const jump = consumeJumpQueued();

  // 점프 요청이 있고, 땅에 있을 때만 점프 시작 (2단 점프 방지)
  if (jump && state.player.onGround) {
    // 위로 순간 속도를 줌(좌표계에서 y가 아래로 증가하므로 위로는 음수)
    state.player.vy = -tuning.jumpVelocity;
    state.player.onGround = false;
  }

  // 중력 적용: vy = vy + g * dt
  state.player.vy += tuning.gravity * dt;

  // 위치 업데이트: y = y + vy * dt
  state.player.y += state.player.vy * dt;

  // 바닥 y 위치(플레이어는 top-left 기준이므로 height만큼 뺌)
  const floor = world.groundY - state.player.height;

  // 바닥 아래로 내려갔으면 바닥에 붙여주고 속도/상태 초기화
  if (state.player.y >= floor) {
    state.player.y = floor;
    state.player.vy = 0;
    state.player.onGround = true;
  }
}

// ==============================
// 3) 장애물 이동(updateObstacles)
// ==============================
// 모든 장애물을 속도만큼 왼쪽으로 이동시키고,
// 완전히 화면 밖으로 나간 장애물은 배열에서 제거(성능/메모리 관리)
function updateObstacles(dt) {
  // 현재 speed(px/s)를 dt(초)만큼 곱해서 이번 프레임 이동량(px)을 계산
  for (const obstacle of state.obstacles) {
    obstacle.x -= state.speed * dt;
  }

  // x + width가 -20보다 크면 아직 화면 근처(조금 여유)라 유지
  // 완전히 멀리 나가면 제거
  state.obstacles = state.obstacles.filter((o) => o.x + o.width > -20);
}

// ==============================
// 4) 충돌 판정(checkCollision)
// ==============================
// AABB(축 정렬 사각형) 충돌 검사
// 플레이어 판정 박스를 pad만큼 줄여서(히트박스 축소) 억울한 충돌을 줄임
function checkCollision() {
  // 모바일은 화면이 작고 입력이 터치라서 조금 더 관대하게(패딩 작게)
  const pad = tuning.isMobile ? 6 : 12;

  // 플레이어 판정 박스(패딩 적용)
  const px = state.player.x + pad;
  const py = state.player.y + pad;
  const pw = state.player.width - pad * 2;
  const ph = state.player.height - pad * 2;

  // 모든 장애물과 AABB 교차 검사
  for (const obstacle of state.obstacles) {
    // 두 사각형이 겹치는 조건(겹치면 true)
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

// ==============================
// 5) 메인 업데이트 함수(update)
// ==============================
// main.js의 tick()에서 매 프레임 호출됨.
// dt는 "지난 프레임부터 흐른 시간(초)".
export function update(dt) {
  if (!state.running) return;
  // 누적 시간 증가(난이도 증가/애니메이션 등에 사용)
  state.time += dt;

  // 시간이 지날수록 속도를 올려 난이도 상승
  // targetSpeed는 "이번 시간에서 목표 속도"
  const targetSpeed = tuning.baseSpeed + state.time * tuning.speedRamp;

  // 게임이 running일 때만 점점 빨라지고,
  // 시작 전(오버레이)은 baseSpeed로 고정
  state.speed = state.running ? targetSpeed : tuning.baseSpeed;

  // 배경/땅 패럴랙스를 위한 스크롤 누적값
  // running일 때는 실제 속도로,
  // 시작 전에는 살짝만 움직이게 해서 "살아있는 배경" 느낌
  const travel = (state.running ? state.speed : tuning.baseSpeed * 0.35) * dt;
  state.scroll += travel;

  // 게임이 아직 시작되지 않았다면(오버레이 상태)
  // 배경만 움직이게 두고 나머지(점수/장애물/물리)는 멈춤
  if (!state.running) return;

  // 1) 플레이어 물리 업데이트(점프/중력/바닥 충돌)
  updatePlayer(dt);

  // 2) 장애물 스폰 타이머 감소
  state.nextSpawn -= dt;

  // 남은 시간이 0 이하가 되면 장애물 생성
  if (state.nextSpawn <= 0) spawnObstacle();

  // 3) 장애물 이동 + 화면 밖 제거
  updateObstacles(dt);

  // 4) 충돌 체크 -> 충돌이면 게임오버 처리
  if (checkCollision()) {
    endGame(); // state.running=false, overlay 표시, 최고점 저장 등
    return;
  }

  // 5) 점수 증가
  // 속도가 빠를수록 더 빨리 점수가 쌓이게(속도 기반)
  state.score += state.speed * dt * 0.06;

  // 화면 상단 UI 점수 텍스트 갱신(정수로 표시)
  ui.score.textContent = String(Math.floor(state.score));
}
