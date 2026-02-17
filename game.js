const scoreEl = document.getElementById("score");
const goalsEl = document.getElementById("goals");
const savesEl = document.getElementById("saves");
const shotsEl = document.getElementById("shots");
const aimText = document.getElementById("aimText");
const powerTextEl = document.getElementById("powerText");
const statusText = document.getElementById("statusText");
const keeperEl = document.getElementById("keeper");
const strikerEl = document.getElementById("striker");
const ballEl = document.getElementById("ball");
const goalEl = document.getElementById("goal");
const aimRingEl = document.getElementById("aimRing");
const miniGoalEl = document.getElementById("miniGoal");
const powerFillEl = document.getElementById("powerFill");
const powerPointerEl = document.getElementById("powerPointer");

const laneLabel = {
  "-1": "上",
  0: "中",
  1: "下",
};

const state = {
  score: 0,
  goals: 0,
  saves: 0,
  shots: 0,
  locked: false,
  isGameOver: false,
  laneOffset: 0,
  swayPhase: 0,
  swaySpeed: 0.0026,
  powerPhase: 0,
  powerSpeed: 0.0044,
  powerRatio: 0.5,
  lastTime: 0,
  ringVisible: true,
  shotHistory: [],
};

function updateBoard() {
  scoreEl.textContent = state.score;
  goalsEl.textContent = state.goals;
  savesEl.textContent = state.saves;
  shotsEl.textContent = state.shots;
  aimText.textContent = laneLabel[state.laneOffset];
  powerTextEl.textContent = `${Math.round(state.powerRatio * 100)}%`;
}

function setStatus(text) {
  statusText.textContent = text;
}

function resetCharacters() {
  keeperEl.style.transform = "translate(0, 0) scale(1)";
  strikerEl.style.transform = "translate(0, 0)";
}

function getAimPosition() {
  const rect = goalEl.getBoundingClientRect();
  const xRatio = 0.5 + Math.sin(state.swayPhase) * 0.58;
  const yRatio = 0.5 + state.laneOffset / 3;

  return {
    x: rect.left + rect.width * xRatio,
    y: rect.top + rect.height * yRatio,
    xRatio,
    yRatio,
  };
}

function renderPowerMeter() {
  const percent = Math.max(0, Math.min(1, state.powerRatio)) * 100;
  powerFillEl.style.width = `${percent}%`;
  powerPointerEl.style.left = `${percent}%`;
}

function renderAimRing() {
  if (!state.ringVisible) {
    aimRingEl.classList.add("hidden");
    return;
  }

  const goalRect = goalEl.getBoundingClientRect();
  const aim = getAimPosition();
  aimRingEl.classList.remove("hidden");
  aimRingEl.style.left = `${(aim.x - goalRect.left).toFixed(2)}px`;
  aimRingEl.style.top = `${(aim.y - goalRect.top).toFixed(2)}px`;
}

function animateAim(now) {
  if (!state.lastTime) {
    state.lastTime = now;
  }

  const delta = now - state.lastTime;
  state.lastTime = now;

  if (!state.locked && !state.isGameOver) {
    state.swayPhase += delta * state.swaySpeed;
    state.powerPhase += delta * state.powerSpeed;
    state.powerRatio = 0.5 + Math.sin(state.powerPhase) * 0.5;
    renderAimRing();
    renderPowerMeter();
    updateBoard();
  }

  requestAnimationFrame(animateAim);
}

function classifyZone(xRatio, yRatio) {
  const horizontal = xRatio < 1 / 3 ? "left" : xRatio < 2 / 3 ? "mid" : "right";
  const vertical = yRatio < 1 / 3 ? "Top" : yRatio < 2 / 3 ? "Middle" : "Bottom";
  return `${horizontal}${vertical}`;
}

function chooseKeeperZone() {
  const zones = [
    "leftTop",
    "midTop",
    "rightTop",
    "leftMiddle",
    "midMiddle",
    "rightMiddle",
    "leftBottom",
    "midBottom",
    "rightBottom",
  ];
  return zones[Math.floor(Math.random() * zones.length)];
}

function moveKeeper(zone) {
  const xRatio = zone.startsWith("left") ? 0.16 : zone.startsWith("mid") ? 0.5 : 0.84;
  const yRatio = zone.endsWith("Top") ? 0.19 : zone.endsWith("Middle") ? 0.5 : 0.79;
  const keeperDx = (xRatio - 0.5) * 300;
  const keeperDy = yRatio < 0.35 ? -60 : yRatio > 0.7 ? 16 : -18;
  keeperEl.style.transform = `translate(${keeperDx}px, ${keeperDy}px) scale(1.02)`;
}

function animateBallToPoint(targetX, targetY, onEnd) {
  const ballRect = ballEl.getBoundingClientRect();
  const startX = ballRect.left + ballRect.width / 2;
  const startY = ballRect.top + ballRect.height / 2;
  const dx = targetX - startX;
  const dy = targetY - startY;
  const duration = 720;
  const start = performance.now();
  const arcHeight = targetY < goalEl.getBoundingClientRect().top + goalEl.clientHeight * 0.48 ? 140 : 95;

  ballEl.classList.add("kicking");
  strikerEl.style.transform = "translate(18px, -10px)";

  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const x = dx * p;
    const yLinear = dy * p;
    const arc = -4 * arcHeight * p * (1 - p);
    const y = yLinear + arc;
    const scale = 1 - p * 0.45;

    ballEl.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;

    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      onEnd();
    }
  }

  requestAnimationFrame(frame);
}

function renderMiniGoal() {
  miniGoalEl.innerHTML = "";

  state.shotHistory.forEach((shot) => {
    const dot = document.createElement("span");
    dot.className = `mini-shot ${shot.saved ? "miss" : "goal"}`;
    dot.style.left = `${Math.max(0, Math.min(1, shot.xRatio)) * 100}%`;
    dot.style.top = `${Math.max(0, Math.min(1, shot.yRatio)) * 100}%`;
    miniGoalEl.appendChild(dot);
  });
}

function rememberShot(xRatio, yRatio, saved) {
  state.shotHistory.push({ xRatio, yRatio, saved });
  if (state.shotHistory.length > 10) {
    state.shotHistory.shift();
  }
  renderMiniGoal();
}

function endRound(result, xRatio, yRatio, powerRatio) {
  state.shots += 1;

  if (result === "saved") {
    state.saves += 1;
    state.score -= 1;
    setStatus("被门将扑出了！-1 分");
  } else if (result === "miss") {
    state.score -= 1;
    setStatus("射偏了！-1 分");
  } else if (result === "powerGoal") {
    state.goals += 1;
    state.score += 1;
    setStatus("暴力抽射！门将判断对了也没扑住，+1 分");
  } else {
    state.goals += 1;
    state.score += 1;
    setStatus("进球！+1 分");
  }

  rememberShot(xRatio, yRatio, result !== "goal" && result !== "powerGoal");
  updateBoard();

  setTimeout(() => {
    ballEl.classList.remove("kicking");
    ballEl.style.transform = "translate(0, 0) scale(1)";
    resetCharacters();

    if (state.score >= 5) {
      state.isGameOver = true;
      setStatus("你赢了");
    } else if (state.score <= -5) {
      state.isGameOver = true;
      setStatus("你输了");
    } else {
      setStatus(`继续，调整高度后按空格射门。当前力度 ${Math.round(powerRatio * 100)}%`);
      state.ringVisible = true;
      renderAimRing();
    }

    state.locked = false;
  }, 420);
}

function shoot() {
  if (state.locked || state.isGameOver) {
    return;
  }

  state.locked = true;
  state.ringVisible = false;
  renderAimRing();

  const shotPower = state.powerRatio;
  setStatus(`已锁定圆圈，射门中... 力度 ${Math.round(shotPower * 100)}%`);

  const aim = getAimPosition();
  const keeperZone = chooseKeeperZone();
  moveKeeper(keeperZone);

  animateBallToPoint(aim.x, aim.y, () => {
    const isOutOfGoal = aim.xRatio < 0 || aim.xRatio > 1 || aim.yRatio < 0 || aim.yRatio > 1;
    if (isOutOfGoal) {
      endRound("miss", aim.xRatio, aim.yRatio, shotPower);
      return;
    }

    const shotZone = classifyZone(Math.max(0, Math.min(1, aim.xRatio)), Math.max(0, Math.min(1, aim.yRatio)));
    const exactSave = keeperZone === shotZone;
    const rowOf = (zone) => (zone.endsWith("Top") ? "Top" : zone.endsWith("Middle") ? "Middle" : "Bottom");
    const sameRow = rowOf(keeperZone) === rowOf(shotZone);
    const neighborSave = sameRow && Math.random() < 0.16;

    if (exactSave) {
      const powerBreakthroughChance = shotPower > 0.9 ? 0.38 : shotPower > 0.75 ? 0.2 : 0;
      endRound(Math.random() < powerBreakthroughChance ? "powerGoal" : "saved", aim.xRatio, aim.yRatio, shotPower);
      return;
    }

    endRound(neighborSave ? "saved" : "goal", aim.xRatio, aim.yRatio, shotPower);
  });
}

function resetGame() {
  state.score = 0;
  state.goals = 0;
  state.saves = 0;
  state.shots = 0;
  state.locked = false;
  state.isGameOver = false;
  state.laneOffset = 0;
  state.powerRatio = 0.5;
  state.shotHistory = [];
  state.ringVisible = true;
  ballEl.style.transform = "translate(0, 0) scale(1)";
  resetCharacters();
  renderMiniGoal();
  renderAimRing();
  renderPowerMeter();
  updateBoard();
  setStatus("新一局开始，按 ↑/↓ 调高度，盯住力度条，空格锁定射门。");
}

document.addEventListener("keydown", (event) => {
  if (event.code === "ArrowUp") {
    event.preventDefault();
    if (!state.locked && !state.isGameOver) {
      state.laneOffset = Math.max(-1, state.laneOffset - 1);
      updateBoard();
      renderAimRing();
      setStatus(`圆圈高度：${laneLabel[state.laneOffset]}，力度 ${Math.round(state.powerRatio * 100)}%，按空格射门。`);
    }
    return;
  }

  if (event.code === "ArrowDown") {
    event.preventDefault();
    if (!state.locked && !state.isGameOver) {
      state.laneOffset = Math.min(1, state.laneOffset + 1);
      updateBoard();
      renderAimRing();
      setStatus(`圆圈高度：${laneLabel[state.laneOffset]}，力度 ${Math.round(state.powerRatio * 100)}%，按空格射门。`);
    }
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    shoot();
    return;
  }

  if (event.code === "KeyR") {
    resetGame();
  }
});

updateBoard();
renderMiniGoal();
renderPowerMeter();
requestAnimationFrame(animateAim);
setStatus("按 ↑/↓ 调高度，观察力度摇摆器，空格锁定圆圈并射门。");
