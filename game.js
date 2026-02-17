const scoreEl = document.getElementById("score");
const goalsEl = document.getElementById("goals");
const savesEl = document.getElementById("saves");
const shotsEl = document.getElementById("shots");
const aimText = document.getElementById("aimText");
const statusText = document.getElementById("statusText");
const keeperEl = document.getElementById("keeper");
const strikerEl = document.getElementById("striker");
const ballEl = document.getElementById("ball");
const goalEl = document.getElementById("goal");

const zoneMap = {
  Digit1: "leftTop",
  Digit2: "midTop",
  Digit3: "rightTop",
  Digit4: "leftBottom",
  Digit5: "midBottom",
  Digit6: "rightBottom",
  Numpad1: "leftTop",
  Numpad2: "midTop",
  Numpad3: "rightTop",
  Numpad4: "leftBottom",
  Numpad5: "midBottom",
  Numpad6: "rightBottom",
};

const zoneLabel = {
  leftTop: "左上",
  midTop: "中上",
  rightTop: "右上",
  leftBottom: "左下",
  midBottom: "中下",
  rightBottom: "右下",
};

const state = {
  selectedZone: "midBottom",
  score: 0,
  goals: 0,
  saves: 0,
  shots: 0,
  locked: false,
  isGameOver: false,
};

function updateBoard() {
  scoreEl.textContent = state.score;
  goalsEl.textContent = state.goals;
  savesEl.textContent = state.saves;
  shotsEl.textContent = state.shots;
  aimText.textContent = zoneLabel[state.selectedZone];
}

function setStatus(text) {
  statusText.textContent = text;
}

function resetCharacters() {
  keeperEl.style.transform = "translate(0, 0) scale(1)";
  strikerEl.style.transform = "translate(0, 0)";
}

function zoneTarget(zone) {
  const rect = goalEl.getBoundingClientRect();
  const ballRect = ballEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const startX = ballRect.left + ballRect.width / 2;
  const startY = ballRect.top + ballRect.height / 2;

  const xLookup = {
    leftTop: rect.left + rect.width * 0.16,
    midTop: rect.left + rect.width * 0.5,
    rightTop: rect.left + rect.width * 0.84,
    leftBottom: rect.left + rect.width * 0.16,
    midBottom: rect.left + rect.width * 0.5,
    rightBottom: rect.left + rect.width * 0.84,
  };

  const yLookup = {
    leftTop: rect.top + rect.height * 0.22,
    midTop: rect.top + rect.height * 0.2,
    rightTop: rect.top + rect.height * 0.22,
    leftBottom: rect.top + rect.height * 0.72,
    midBottom: rect.top + rect.height * 0.74,
    rightBottom: rect.top + rect.height * 0.72,
  };

  return {
    dx: xLookup[zone] - startX,
    dy: yLookup[zone] - startY,
    keeperDx: ((xLookup[zone] - centerX) / rect.width) * 300,
    keeperDy: yLookup[zone] < rect.top + rect.height * 0.45 ? -45 : 10,
  };
}

function chooseKeeperZone() {
  const zones = Object.keys(zoneLabel);
  return zones[Math.floor(Math.random() * zones.length)];
}

function moveKeeper(zone) {
  const target = zoneTarget(zone);
  keeperEl.style.transform = `translate(${target.keeperDx}px, ${target.keeperDy}px) scale(1.02)`;
}

function animateBallToZone(zone, onEnd) {
  const { dx, dy } = zoneTarget(zone);
  const duration = 720;
  const start = performance.now();
  const arcHeight = zone.includes("Top") ? 140 : 95;

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

function endRound(saved) {
  state.shots += 1;

  if (saved) {
    state.saves += 1;
    state.score -= 1;
    setStatus("被门将扑出了！-1 分");
  } else {
    state.goals += 1;
    state.score += 1;
    setStatus("进球！+1 分");
  }

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
      setStatus(`继续！当前瞄准 ${zoneLabel[state.selectedZone]}`);
    }

    state.locked = false;
  }, 420);
}

function shoot() {
  if (state.locked || state.isGameOver) {
    return;
  }

  state.locked = true;
  setStatus("助跑射门中...");

  const keeperZone = chooseKeeperZone();
  moveKeeper(keeperZone);

  animateBallToZone(state.selectedZone, () => {
    const exactSave = keeperZone === state.selectedZone;
    const neighborSave = keeperZone.includes("Top") === state.selectedZone.includes("Top") && Math.random() < 0.2;
    endRound(exactSave || neighborSave);
  });
}

function resetGame() {
  state.score = 0;
  state.goals = 0;
  state.saves = 0;
  state.shots = 0;
  state.selectedZone = "midBottom";
  state.locked = false;
  state.isGameOver = false;
  ballEl.style.transform = "translate(0, 0) scale(1)";
  resetCharacters();
  updateBoard();
  setStatus("新一局开始，请选择射门区域。");
}

document.addEventListener("keydown", (event) => {
  if (zoneMap[event.code]) {
    if (!state.locked && !state.isGameOver) {
      state.selectedZone = zoneMap[event.code];
      updateBoard();
      setStatus(`已瞄准 ${zoneLabel[state.selectedZone]}，按空格射门。`);
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
setStatus("请选择一个区域准备射门。");
