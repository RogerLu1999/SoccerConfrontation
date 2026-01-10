const goalsEl = document.getElementById("goals");
const savesEl = document.getElementById("saves");
const shotsEl = document.getElementById("shots");
const statusText = document.getElementById("statusText");
const aimText = document.getElementById("aimText");
const keeperEl = document.getElementById("keeper");
const ballEl = document.getElementById("ball");

const directions = ["left", "center", "right"];
const heights = ["low", "mid", "high"];
const aimState = {
  direction: "center",
  height: "mid",
};

const score = {
  goals: 0,
  saves: 0,
  shots: 0,
};

const history = [];
let isAnimating = false;

const aimOffsets = {
  left: -130,
  center: 0,
  right: 130,
};

const heightOffsets = {
  low: 50,
  mid: -10,
  high: -70,
};

const keeperOffsets = {
  left: -140,
  center: 0,
  right: 140,
};

function updateScoreboard() {
  goalsEl.textContent = score.goals;
  savesEl.textContent = score.saves;
  shotsEl.textContent = score.shots;
}

function updateAimText() {
  const prettyDirection = aimState.direction[0].toUpperCase() + aimState.direction.slice(1);
  const prettyHeight = aimState.height[0].toUpperCase() + aimState.height.slice(1);
  aimText.textContent = `${prettyDirection} / ${prettyHeight}`;
}

function updateStatus(message) {
  statusText.textContent = message;
}

function chooseKeeperDirection() {
  if (history.length === 0) {
    return directions[Math.floor(Math.random() * directions.length)];
  }

  const counts = history.reduce(
    (acc, entry) => {
      acc[entry.direction] += 1;
      return acc;
    },
    { left: 0, center: 0, right: 0 }
  );

  const total = counts.left + counts.center + counts.right;
  const bias = 0.15;
  const weights = directions.map((direction) => {
    const base = counts[direction] / total;
    return base + bias;
  });

  const sum = weights.reduce((acc, value) => acc + value, 0);
  const roll = Math.random() * sum;
  let cumulative = 0;
  for (let i = 0; i < directions.length; i += 1) {
    cumulative += weights[i];
    if (roll <= cumulative) {
      return directions[i];
    }
  }
  return "center";
}

function resetBall() {
  ballEl.classList.remove("kicking");
  ballEl.style.transform = "translate(-50%, 0)";
}

function resetKeeper() {
  keeperEl.style.transform = "translateX(-50%)";
}

function resolveShot(outcome) {
  score.shots += 1;
  if (outcome === "goal") {
    score.goals += 1;
    updateStatus("Goal! You beat the keeper.");
  } else {
    score.saves += 1;
    updateStatus("Saved! The keeper read you.");
  }
  updateScoreboard();
}

function animateShot(shotDirection, shotHeight, keeperDirection) {
  const targetX = aimOffsets[shotDirection];
  const targetY = heightOffsets[shotHeight];
  const keeperX = keeperOffsets[keeperDirection];

  ballEl.classList.add("kicking");
  keeperEl.style.transform = `translateX(calc(-50% + ${keeperX}px))`;

  requestAnimationFrame(() => {
    ballEl.style.transform = `translate(calc(-50% + ${targetX}px), ${targetY}px)`;
  });

  const saved = shotDirection === keeperDirection && Math.random() > 0.35;

  setTimeout(() => {
    resolveShot(saved ? "save" : "goal");
  }, 500);

  setTimeout(() => {
    resetBall();
    resetKeeper();
    isAnimating = false;
    updateStatus("Pick a direction for the next shot.");
  }, 1100);
}

function kick() {
  if (isAnimating) {
    return;
  }
  isAnimating = true;
  updateStatus("Shooting...");

  const keeperDirection = chooseKeeperDirection();
  const shotDirection = aimState.direction;
  const shotHeight = aimState.height;

  history.push({ direction: shotDirection, height: shotHeight });

  animateShot(shotDirection, shotHeight, keeperDirection);
}

function handleDirectionInput(direction) {
  if (isAnimating) {
    return;
  }
  aimState.direction = direction;
  updateAimText();
}

function handleHeightInput(height) {
  if (isAnimating) {
    return;
  }
  aimState.height = height;
  updateAimText();
}

function resetScore() {
  score.goals = 0;
  score.saves = 0;
  score.shots = 0;
  history.length = 0;
  updateScoreboard();
  updateStatus("Score reset. Aim and shoot!");
}

document.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "ArrowLeft":
      handleDirectionInput("left");
      break;
    case "ArrowRight":
      handleDirectionInput("right");
      break;
    case "ArrowUp":
      handleHeightInput("high");
      break;
    case "Space":
      event.preventDefault();
      kick();
      break;
    case "KeyR":
      resetScore();
      break;
    default:
      break;
  }
});

updateScoreboard();
updateAimText();
