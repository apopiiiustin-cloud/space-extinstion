import {
  MAX_LIVES,
  TOTAL_LEVELS,
  WAVES_PER_LEVEL,
  CHALLENGE_BOSS_EVERY,
  DROP_CHANCE,
  BUFF_DURATION,
  ABS_MAX_LIVES,
  SCORE_BY_KIND,
  ENEMY_NAMES,
  LEVEL_NEW_KIND,
  LEVEL_REWARDS,
  CLUSTER_TORPEDO_CD,
  DRONE_FIRE_CD,
  DRONE_SPECIAL_CD,
  SPECIAL_CD,
  COMBO_WINDOW,
  SAVE_KEY,
  SHIPS,
  GOD_SHIP,
  STACK_UPGRADES,
  SHOP_POOL,
  ACHIEVEMENTS,
  LEVELS,
  PICKUP_TYPES,
  PICKUP_COLORS,
  PICKUP_GLOW,
  PICKUP_LABELS,
} from "./js/data.js";
import { createAudio } from "./js/audio.js";
import { createRecorder } from "./js/recorder.js";

// --- bootstrap / DOM ---
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;
const overlay = document.getElementById("overlay");
const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const startBtn = document.getElementById("start-btn");
const challengeBtn = document.getElementById("challenge-btn");
const codePanelEl = document.getElementById("code-panel");
const codeInputEl = document.getElementById("code-input");
const codeSubmitBtn = document.getElementById("code-submit");
const codeCancelBtn = document.getElementById("code-cancel");
const metaPanelEl = document.getElementById("meta-panel");
const volumeSlider = document.getElementById("volume-slider");
const muteBtn = document.getElementById("mute-btn");
const joySizeSlider = document.getElementById("joy-size-slider");
const btnSizeSlider = document.getElementById("btn-size-slider");
const joySizeVal = document.getElementById("joy-size-val");
const btnSizeVal = document.getElementById("btn-size-val");
const swapSidesBtn = document.getElementById("swap-sides-btn");
const resetTouchBtn = document.getElementById("reset-touch-btn");
const menuTabsEl = document.querySelector(".menu-tabs");
const recBtn = document.getElementById("rec-btn");
const exportBtn = document.getElementById("export-btn");
const recBadge = document.getElementById("rec-badge");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const bestMenuEl = document.getElementById("best-menu");
const challengeBestEl = document.getElementById("challenge-best");
const levelEl = document.getElementById("level");
const waveEl = document.getElementById("wave");
const livesEl = document.getElementById("lives");
const comboEl = document.getElementById("combo");
const buffsEl = document.getElementById("buffs");
const shipSelectEl = document.getElementById("ship-select");
const levelSelectEl = document.getElementById("level-select");
const toastEl = document.getElementById("toast");
const touchUi = document.getElementById("touch-ui");
const joyBase = document.getElementById("joy-base");
const joyKnob = document.getElementById("joy-knob");
const touchFire = document.getElementById("touch-fire");
const touchSpecial = document.getElementById("touch-special");
const touchPause = document.getElementById("touch-pause");

// --- canvas ---
const W = canvas.width;
const H = canvas.height;

try {
  if (new URLSearchParams(window.location.search).get("god") === "1") SHIPS.push(GOD_SHIP);
} catch {
  /* ignore */
}

// --- runtime state ---
const keys = new Set();
let running = false;
let paused = false;
let lastTime = 0;
let score = 0;
let lives = 5;
let level = 1;
let wave = 1;
let phase = "fleet"; // fleet | waveBreak | warning | boss | levelClear | levelIntro | shop | won
let spawnTimer = 0;
let enemiesLeft = 0;
let warningTimer = 0;
let warningTotal = 2.6;
let waveBreakTimer = 0;
let waveBreakTotal = 2.0;
let levelClearTimer = 0;
let levelClearTotal = 3.4;
let levelIntroTimer = 0;
let levelIntroTotal = 2.6;
const WAVE_BREAK_DUR = 2.0;
const WARNING_DUR = 2.6;
const LEVEL_CLEAR_DUR = 3.4;
const LEVEL_INTRO_DUR = 2.6;
let time = 0;
let stars = [];
let nebulae = [];
let planet = null;
let scenery = [];
let theme = LEVELS[0].theme;
let bullets = [];
let enemies = [];
let particles = [];
let trails = [];
let pickups = [];
let hazards = [];
let boss = null;
let player;
let upgrades = {
  twin: false,
  triple: false,
  cluster: false,
  armor: false,
  drone: false,
  magnet: false,
  cooldownCut: false,
  bulletSpeed: false,
  scoreBoost: false,
};
let upgradeRanks = {
  twin: 0,
  cluster: 0,
  armor: 0,
  drone: 0,
  magnet: 0,
  cooldownCut: 0,
  bulletSpeed: 0,
  scoreBoost: 0,
};

function emptyUpgradeRanks() {
  return {
    twin: 0,
    cluster: 0,
    armor: 0,
    drone: 0,
    magnet: 0,
    cooldownCut: 0,
    bulletSpeed: 0,
    scoreBoost: 0,
  };
}

function stackRank(id) {
  return upgradeRanks[id] || 0;
}

function nextStackOffer(id) {
  const tiers = STACK_UPGRADES[id];
  if (!tiers) return null;
  const rank = stackRank(id);
  if (rank >= tiers.length) return null;
  const tier = tiers[rank];
  return {
    id,
    name: tier.name,
    desc: tier.desc,
    cost: tier.cost,
    stackRank: rank + 1,
    stacked: rank > 0,
  };
}

function armorPlateCount() {
  const r = Math.max(1, stackRank("armor") || (upgrades.armor ? 1 : 0));
  return r * 2 + selectedShip().armorBonus;
}

function clusterCooldown() {
  const r = stackRank("cluster");
  if (r >= 3) return 1.4;
  if (r >= 2) return 2;
  return CLUSTER_TORPEDO_CD;
}

function droneFireCd() {
  const r = stackRank("drone");
  if (r >= 3) return DRONE_FIRE_CD * 0.55;
  if (r >= 2) return DRONE_FIRE_CD * 0.7;
  return DRONE_FIRE_CD;
}

function droneSpecialCd() {
  const r = stackRank("drone");
  if (r >= 3) return DRONE_SPECIAL_CD * 0.55;
  if (r >= 2) return DRONE_SPECIAL_CD * 0.7;
  return DRONE_SPECIAL_CD;
}

function magnetPullMul() {
  const r = stackRank("magnet");
  if (r >= 2) return 3.2;
  if (r >= 1) return 2.2;
  return 1;
}

function specialCdMul() {
  const r = stackRank("cooldownCut");
  if (r >= 2) return 0.5;
  if (r >= 1 || upgrades.cooldownCut) return 0.7;
  return 1;
}

function bulletSpeedMul() {
  const r = stackRank("bulletSpeed");
  if (r >= 2) return 1.6;
  if (r >= 1 || upgrades.bulletSpeed) return 1.35;
  return 1;
}
let maxLives = MAX_LIVES;
let pendingShield = false;
let lastUpgrade = null;
let clusterTorpedoCd = 0;
let drones = [];
let selectedShipId = "ice";
let credits = 0;
let shopOffers = [];
let shopPicked = false;
let combo = 0;
let comboTimer = 0;
let maxCombo = 0;
let specialCd = 0;
let shake = { t: 0, mag: 0 };
let hitStop = 0;
let bossHitless = true;
let levelPickups = 0;
let waveEventTimer = 0;
let toasts = [];
let touchMove = { x: 0, y: 0 };
let touchFiring = false;
let touchSpecialHeld = false;
let save = loadSave();

// --- polish / challenge / meta state ---
let bossIntroTimer = 0;
let bossIntroTotal = 2.4;
let screenFlash = 0;
let focusHold = 0;
let nearMissCd = 0;
let nearMissRun = 0;
let eliteKillsRun = 0;
let waveTookDamage = false;
let perfectStreak = 0;
let challengeMode = false;
let challengeId = "";
let runStats = { nearMisses: 0, elites: 0, time: 0, damageTaken: 0 };
let endingMedals = [];
let cosmeticTrail = false;
let metaPanel = null;

// --- audio ---
const audio = createAudio({
  getMuted: () => !!save.muted,
  getVolume: () => Number(save.volume) || 0.7,
  getSelectedShipId: () => selectedShipId,
});
const { ensureAudio, suspendAudio, resumeAudio, applyVolume, duckMusic, tickDuck, stopMusic, sfx } = audio;
function musicModeForPhase() {
  if (phase === "boss" || phase === "bossIntro" || phase === "warning") return "boss";
  if (phase === "menu" || phase === "won" || !running) return "off";
  return "fleet";
}

function startMusic(mode) {
  audio.startMusic(mode, musicModeForPhase);
}

// --- save / progression helpers ---
function currentLevel() {
  return LEVELS[Math.max(0, Math.min(TOTAL_LEVELS, level) - 1)];
}

function challengeWaveConfig(w) {
  const n = Math.max(1, w | 0);
  const unlocked = Math.min(11, 2 + Math.floor((n - 1) / 2));
  const weights = Array(11).fill(0);
  for (let i = 0; i < unlocked; i++) {
    weights[i] = Math.max(0.08, 0.42 - i * 0.035);
  }
  // bias later waves toward tougher kinds
  if (n >= 8) weights[Math.min(10, unlocked - 1)] *= 1.4;
  if (n >= 14) weights[Math.min(10, unlocked - 1)] *= 1.3;
  return {
    count: Math.min(30, 7 + Math.floor(n * 0.9)),
    interval: Math.max(0.16, 0.52 - n * 0.014),
    speedMul: 1 + Math.min(1.6, n * 0.045),
    weights,
  };
}

function currentWaveConfig() {
  if (challengeMode) return challengeWaveConfig(wave);
  const lvl = currentLevel();
  return lvl.waves[Math.max(0, Math.min(WAVES_PER_LEVEL, wave) - 1)];
}

function challengeBossIndex(w = wave) {
  return Math.floor(Math.max(0, w - 1) / CHALLENGE_BOSS_EVERY) % TOTAL_LEVELS;
}

function isChallengeBossWave(w = wave) {
  return challengeMode && w > 0 && w % CHALLENGE_BOSS_EVERY === 0;
}

function syncChallengeTheme() {
  if (!challengeMode) return;
  const idx = challengeBossIndex(Math.max(1, wave));
  level = idx + 1;
  applyTheme(LEVELS[idx].theme);
  spawnHazardsForTheme();
}

function recordChallengeProgress() {
  if (!challengeMode) return;
  if (score > (save.bestChallenge || 0)) {
    save.bestChallenge = score;
    save.bestChallengeId = challengeId;
  }
  if (wave > (save.bestChallengeWave || 0)) {
    save.bestChallengeWave = wave;
  }
  if (wave >= 10) unlockAchievement("challengeWin");
}

function continueChallengeAfterBoss() {
  credits += 20;
  showToast(`MINI-BOSS DOWN · NEXT WAVE ${wave + 1}`);
  sfx("clear");
  recordChallengeProgress();
  persistSave();
  phase = "waveBreak";
  waveBreakTotal = WAVE_BREAK_DUR * 0.85;
  waveBreakTimer = waveBreakTotal;
  startMusic("fleet");
  updateHud();
}

function advanceChallengeFleetClear() {
  const bonus = waveTookDamage ? 80 + wave * 15 : 160 + wave * 35;
  score += bonus;
  if (!waveTookDamage) {
    perfectStreak += 1;
    credits += 15;
    showToast(`PERFECT WAVE ${wave} +${bonus}`);
  } else {
    perfectStreak = 0;
    showToast(`WAVE ${wave} CLEAR +${bonus}`);
  }
  sfx("clear");
  recordChallengeProgress();
  if (isChallengeBossWave(wave)) {
    phase = "warning";
    warningTotal = WARNING_DUR * 0.85;
    warningTimer = warningTotal;
    updateHud();
    return;
  }
  phase = "waveBreak";
  waveBreakTotal = WAVE_BREAK_DUR * 0.75;
  waveBreakTimer = waveBreakTotal;
  updateHud();
}

function pickWeightedKind(weights) {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 0;
}

function defaultTouchControls() {
  return {
    joySize: 148,
    btnSize: 68,
    swapSides: false,
  };
}

function defaultSave() {
  return {
    bestScore: 0,
    unlockedShips: ["ice"],
    achievements: {},
    muted: false,
    volume: 0.7,
    selectedShipId: "ice",
    maxClearedLevel: 0,
    selectedStartLevel: 1,
    bestChallenge: 0,
    bestChallengeId: "",
    bestChallengeWave: 0,
    seenBosses: [],
    seenShips: ["ice"],
    stats: { runs: 0, wins: 0, timePlayed: 0, favoriteShip: "ice", shipPlays: {} },
    cosmeticTrail: false,
    aegisUnlocked: false,
    touchControls: defaultTouchControls(),
  };
}

function normalizeTouchControls(raw) {
  const d = defaultTouchControls();
  const t = raw && typeof raw === "object" ? raw : {};
  return {
    joySize: Math.max(100, Math.min(180, Number(t.joySize) || d.joySize)),
    btnSize: Math.max(48, Math.min(96, Number(t.btnSize) || d.btnSize)),
    swapSides: !!t.swapSides,
  };
}

function applyTouchControls() {
  const t = normalizeTouchControls(save.touchControls);
  save.touchControls = t;
  const root = document.documentElement;
  root.style.setProperty("--joy-size", `${t.joySize}px`);
  root.style.setProperty("--btn-size", `${t.btnSize}px`);
  document.body.classList.toggle("touch-swap", t.swapSides);
  if (joySizeSlider) joySizeSlider.value = String(t.joySize);
  if (btnSizeSlider) btnSizeSlider.value = String(t.btnSize);
  if (joySizeVal) joySizeVal.textContent = String(t.joySize);
  if (btnSizeVal) btnSizeVal.textContent = String(t.btnSize);
  if (swapSidesBtn) swapSidesBtn.textContent = t.swapSides ? "SIDES: SWAPPED" : "SWAP SIDES";
}

function aegisQueryEnabled() {
  try {
    return new URLSearchParams(window.location.search).get("aegis") === "1";
  } catch {
    return false;
  }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const data = { ...defaultSave(), ...JSON.parse(raw) };
    // Query param must NOT stick into save — only explicit CODE redeem does.
    // One-time reset so leftover test unlocks hide Aegis again.
    if (data._aegisReset !== 3) {
      data.aegisUnlocked = false;
      if (Array.isArray(data.unlockedShips)) {
        data.unlockedShips = data.unlockedShips.filter((id) => id !== "aegis");
      }
      if (data.selectedShipId === "aegis") data.selectedShipId = "ice";
      data._aegisReset = 3;
    }
    data.aegisUnlocked = !!data.aegisUnlocked;
    const allowAegis = !!data.aegisUnlocked || aegisQueryEnabled();
    data.unlockedShips = (data.unlockedShips || [])
      .map((id) => (id === "scout" ? "ice" : id))
      .filter(
        (id, i, arr) =>
          arr.indexOf(id) === i &&
          id !== "god" &&
          (id !== "aegis" || allowAegis) &&
          SHIPS.some((s) => s.id === id)
      );
    if (!data.unlockedShips.includes("ice")) data.unlockedShips.unshift("ice");
    if (
      data.selectedShipId === "scout" ||
      data.selectedShipId === "god" ||
      (data.selectedShipId === "aegis" && !allowAegis) ||
      !SHIPS.some((s) => s.id === data.selectedShipId)
    ) {
      data.selectedShipId = "ice";
    }
    data.volume = Math.max(0, Math.min(1, Number(data.volume) || 0.7));
    data.touchControls = normalizeTouchControls(data.touchControls);
    data.bestChallenge = Number(data.bestChallenge) || 0;
    data.bestChallengeWave = Number(data.bestChallengeWave) || 0;
    data.achievements = data.achievements && typeof data.achievements === "object" ? data.achievements : {};
    data.stats = data.stats && typeof data.stats === "object"
      ? { runs: 0, wins: 0, timePlayed: 0, favoriteShip: "ice", shipPlays: {}, ...data.stats }
      : { runs: 0, wins: 0, timePlayed: 0, favoriteShip: "ice", shipPlays: {} };
    data.seenBosses = Array.isArray(data.seenBosses) ? data.seenBosses : [];
    data.seenShips = Array.isArray(data.seenShips) ? data.seenShips : ["ice"];
    if (!allowAegis) {
      data.seenShips = data.seenShips.filter((id) => id !== "aegis");
    }
    data.cosmeticTrail = !!data.cosmeticTrail;
    data.maxClearedLevel = Math.max(0, Math.min(TOTAL_LEVELS, Number(data.maxClearedLevel) || 0));
    data.selectedStartLevel = Math.max(1, Math.min(maxSelectableLevel(data), Number(data.selectedStartLevel) || 1));
    return data;
  } catch {
    return defaultSave();
  }
}

function maxSelectableLevel(s = save) {
  return Math.min(TOTAL_LEVELS, (s.maxClearedLevel || 0) + 1);
}

function isLevelUnlocked(n) {
  return n >= 1 && n <= maxSelectableLevel();
}

let persistTimer = 0;
function persistSave(immediate = false) {
  if (!immediate) {
    // debounce disk writes so kill-streaks don't freeze the tab
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => persistSave(true), 250);
    return;
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* ignore quota */
  }
}


// --- juice / HUD helpers ---
function trimFx() {
  const pCap = mobileLite ? 70 : 120;
  const tCap = mobileLite ? 45 : 80;
  const bSoft = mobileLite ? 140 : 200;
  const bKeep = mobileLite ? 110 : 180;
  if (particles.length > pCap) particles.splice(0, particles.length - pCap);
  if (trails.length > tCap) trails.splice(0, trails.length - tCap);
  if (bullets.length > bSoft) {
    const keep = [];
    for (let i = bullets.length - 1; i >= 0 && keep.length < bKeep; i--) keep.push(bullets[i]);
    bullets = keep.reverse();
  }
}

function addShake(mag, dur = 0.2) {
  shake.mag = Math.max(shake.mag, mag);
  shake.t = Math.max(shake.t, dur);
}

function addHitStop(t = 0.05) {
  hitStop = Math.max(hitStop, t);
}

function showToast(_text) {
  /* bottom toasts disabled for a cleaner mobile play view */
}


// --- play recorder ---
const recorder = createRecorder({
  canvas,
  W,
  H,
  recBtn,
  recBadge,
  getRunning: () => running,
  getPlayer: () => player,
  getKeys: () => keys,
  getTouchFiring: () => touchFiring,
  getPhase: () => phase,
  getLevel: () => level,
  getWave: () => wave,
  getScore: () => score,
  getLives: () => lives,
  getCombo: () => combo,
  getCredits: () => credits,
  getSpecialCd: () => specialCd,
  getEnemies: () => enemies,
  getBullets: () => bullets,
  getBoss: () => boss,
  getSelectedShipId: () => selectedShipId,
  getStartLevel: () => save.selectedStartLevel || 1,
  showToast,
  sfx,
});
const {
  updateRecUi,
  pushRecEvent,
  startRecording,
  stopRecording,
  toggleRecording,
  exportPlaySession,
  tickPlayRecorder,
  maybeStartFromArm,
} = recorder;

// --- ships / menu / shop ---
function unlockAchievement(id) {
  if (save.achievements[id]) return;
  const a = ACHIEVEMENTS[id];
  if (!a) return;
  save.achievements[id] = true;
  persistSave();
  showToast(`ACHIEVEMENT: ${a.name}`);
  sfx("achieve");
}

function selectedShip() {
  return SHIPS.find((s) => s.id === selectedShipId) || SHIPS[0];
}

function isTouchDevice() {
  return (
    document.body.classList.contains("touch-device") ||
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window
  );
}

const mobileLite = isTouchDevice();
const STAR_COUNT = mobileLite ? 80 : 160;
let hudBuffsCache = "";
let menuIdleFrame = 0;
let menuTab = "play";

function setMenuTab(id, opts = {}) {
  const tabId = ["play", "settings", "codex", "code"].includes(id) ? id : "play";
  menuTab = tabId;
  const tabs = menuTabsEl ? menuTabsEl.querySelectorAll("[role='tab']") : [];
  tabs.forEach((btn) => {
    const selected = btn.dataset.tab === tabId;
    btn.setAttribute("aria-selected", selected ? "true" : "false");
  });
  ["play", "settings", "codex", "code"].forEach((name) => {
    const panel = document.getElementById(`tab-${name}`);
    if (!panel) return;
    if (name === tabId) panel.removeAttribute("hidden");
    else panel.setAttribute("hidden", "");
  });
  if (tabId === "codex") renderMetaPanel();
  if (tabId === "code" && codeInputEl) {
    if (!opts.keepCode) codeInputEl.value = "";
    setTimeout(() => codeInputEl.focus(), 30);
  } else if (codeInputEl && !opts.keepCode) {
    codeInputEl.value = "";
  }
  if (!opts.silent) sfx("ui");
}

/** GOD CORE only with ?god=1 — hidden on phone, Vercel, and normal play. */
function godModeEnabled() {
  try {
    return new URLSearchParams(window.location.search).get("god") === "1";
  } catch {
    return false;
  }
}

const AEGIS_CODE = "Aegis321#";

/** AEGIS VEIL owner-only: CODE redeem or ?aegis=1 — invisible otherwise. */
function aegisEnabled() {
  return aegisQueryEnabled() || !!(save && save.aegisUnlocked);
}

function tryRedeemCode(raw) {
  const code = String(raw || "").trim();
  if (!code) {
    showToast("ENTER A CODE");
    sfx("ui");
    return false;
  }
  if (code === AEGIS_CODE) {
    save.aegisUnlocked = true;
    if (!save.unlockedShips.includes("aegis")) save.unlockedShips.push("aegis");
    if (!save.seenShips) save.seenShips = ["ice"];
    if (!save.seenShips.includes("aegis")) save.seenShips.push("aegis");
    selectedShipId = "aegis";
    save.selectedShipId = "aegis";
    persistSave(true);
    sanitizeSelectedShip();
    renderShipSelect();
    setMenuTab("play", { silent: true });
    showToast("AEGIS VEIL ONLINE");
    sfx("achieve");
    return true;
  }
  showToast("INVALID CODE");
  sfx("ui");
  if (codeInputEl) {
    codeInputEl.select();
    codeInputEl.focus();
  }
  return false;
}

function isPrivateShip(ship) {
  return !!(ship && (ship.debug || ship.custom));
}

function isPrivateShipAllowed(ship) {
  if (!ship) return false;
  if (ship.debug) return godModeEnabled();
  if (ship.custom) return aegisEnabled();
  return true;
}

function isDebugShipVisible(ship) {
  if (ship.debug) return godModeEnabled();
  if (ship.custom) return aegisEnabled();
  return true;
}

function isShipUnlocked(ship) {
  if (!isPrivateShipAllowed(ship)) return false;
  return save.unlockedShips.includes(ship.id) || ship.unlockLevel <= 0;
}

function sanitizeSelectedShip() {
  const ship = selectedShip();
  if (!isPrivateShipAllowed(ship) || (!isShipUnlocked(ship) && ship.id !== "ice")) {
    selectedShipId = "ice";
    save.selectedShipId = "ice";
  }
}

function publicShips() {
  return SHIPS.filter((s) => !isPrivateShip(s) || isPrivateShipAllowed(s));
}

function unlockShipForLevel(clearedLevel) {
  for (const ship of SHIPS) {
    if (ship.debug || ship.custom) continue;
    if (ship.unlockLevel === clearedLevel && !save.unlockedShips.includes(ship.id)) {
      save.unlockedShips.push(ship.id);
      showToast(`SHIP UNLOCKED: ${ship.name}`);
    }
  }
  const campaignShips = SHIPS.filter((s) => !s.debug && !s.custom && s.unlockLevel > 0);
  const unlockedCampaign = campaignShips.filter((s) => save.unlockedShips.includes(s.id)).length;
  if (unlockedCampaign >= campaignShips.length) unlockAchievement("allShips");
  persistSave();
}

function applyGodLoadout() {
  if (selectedShip().id !== "god") return;
  upgrades = {
    twin: true,
    triple: true,
    cluster: true,
    armor: true,
    drone: true,
    magnet: true,
    cooldownCut: true,
    bulletSpeed: true,
    scoreBoost: true,
  };
  upgradeRanks = {
    twin: 2,
    cluster: 3,
    armor: 3,
    drone: 3,
    magnet: 2,
    cooldownCut: 2,
    bulletSpeed: 2,
    scoreBoost: 1,
  };
  maxLives = Math.max(maxLives, 99);
  lives = Math.max(lives, 99);
  credits = Math.max(credits, 9999);
  clusterTorpedoCd = 0.2;
  specialCd = 0;
  drones = createDrones();
  if (player) {
    player.armor = armorPlateCount();
    player.maxArmor = player.armor;
    player.shield = true;
    player.rapidFire = Math.max(player.rapidFire || 0, 999);
    player.doubleShot = Math.max(player.doubleShot || 0, 999);
    player.fireMul = selectedShip().fireMul;
    player.speed = selectedShip().speed;
  }
  showToast("GOD CORE ONLINE");
  updateHud();
}

function renderShipSelect() {
  sanitizeSelectedShip();
  shipSelectEl.innerHTML = "";
  for (const ship of SHIPS) {
    if (!isDebugShipVisible(ship)) continue;
    const unlocked = isShipUnlocked(ship);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `ship-card${unlocked ? "" : " locked"}${selectedShipId === ship.id ? " selected" : ""}`;
    btn.innerHTML = `<div class="ship-name">${ship.name}</div><div class="ship-desc">${unlocked ? ship.desc : `Unlock: clear L${ship.unlockLevel}`}</div>`;
    if (unlocked) {
      btn.addEventListener("click", () => {
        selectedShipId = ship.id;
        save.selectedShipId = ship.id;
        persistSave();
        sfx("ui");
        renderShipSelect();
        syncTouchSpecialButton();
        updateHud();
      });
    }
    shipSelectEl.appendChild(btn);
  }
  syncTouchSpecialButton();
}

function renderLevelSelect() {
  if (!levelSelectEl) return;
  const selected = Math.max(1, Math.min(maxSelectableLevel(), save.selectedStartLevel || 1));
  save.selectedStartLevel = selected;
  levelSelectEl.innerHTML = "";
  LEVELS.forEach((lvl, i) => {
    const n = i + 1;
    const unlocked = isLevelUnlocked(n);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.role = "option";
    btn.setAttribute("aria-selected", selected === n ? "true" : "false");
    btn.className = `level-card${unlocked ? "" : " locked"}${selected === n ? " selected" : ""}`;
    btn.innerHTML = `<div class="level-num">LEVEL ${n}</div><div class="level-name">${lvl.name}</div><div class="level-boss">${unlocked ? lvl.boss.name : "LOCKED"}</div>`;
    if (unlocked) {
      btn.addEventListener("click", () => {
        save.selectedStartLevel = n;
        persistSave();
        sfx("ui");
        renderLevelSelect();
        applyTheme(LEVELS[n - 1].theme);
      });
    }
    levelSelectEl.appendChild(btn);
  });
  const selectedBtn = levelSelectEl.querySelector(".level-card.selected");
  if (selectedBtn) {
    selectedBtn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }
}

function grantProgressForStart(startLevel) {
  for (let cleared = 1; cleared < startLevel; cleared++) {
    const reward = LEVEL_REWARDS[cleared - 1];
    if (reward) {
      applyUpgrade(reward.id, { silent: true, fromReward: true });
    }
    for (const ship of SHIPS) {
      if (ship.debug || ship.custom) continue;
      if (ship.unlockLevel === cleared && !save.unlockedShips.includes(ship.id)) {
        save.unlockedShips.push(ship.id);
      }
    }
    credits += 40 + cleared * 15;
  }
  persistSave();
}

function refreshMenuScores() {
  bestEl.textContent = String(save.bestScore);
  bestMenuEl.textContent = String(save.bestScore);
  if (challengeBestEl) {
    const bw = save.bestChallengeWave || 0;
    const bs = save.bestChallenge || 0;
    challengeBestEl.textContent = bw ? `${bs} (W${bw})` : String(bs);
  }
  if (muteBtn) muteBtn.textContent = save.muted ? "UNMUTE" : "MUTE";
  applyVolume();
}

function renderMetaPanel() {
  if (!metaPanelEl) return;
  const ach = Object.values(ACHIEVEMENTS)
    .map((a) => {
      const ok = !!save.achievements[a.id];
      return `<div class="${ok ? "" : "locked"}">${ok ? "✓" : "·"} ${a.name} — ${a.desc}</div>`;
    })
    .join("");
  const bosses = LEVELS.map((l) => {
    const ok = (save.seenBosses || []).includes(l.boss.id);
    return `<div class="${ok ? "" : "locked"}">${ok ? "✓" : "·"} ${l.boss.name}${ok ? ` — ${l.boss.lore || ""}` : " — ???"}</div>`;
  }).join("");
  const ships = publicShips()
    .filter((s) => !s.debug)
    .map((s) => {
      const ok = (save.seenShips || []).includes(s.id) || isShipUnlocked(s);
      return `<div class="${ok ? "" : "locked"}">${ok ? "✓" : "·"} ${s.name}</div>`;
    })
    .join("");
  const st = save.stats || {};
  const stats = `<div>Runs ${st.runs || 0} · Wins ${st.wins || 0} · Time ${Math.floor((st.timePlayed || 0) / 60)}m</div>
    <div>Favorite ship: ${(SHIPS.find((s) => s.id === st.favoriteShip) || {}).name || "—"}</div>
    <div>Challenge best: ${save.bestChallenge || 0} · Wave ${save.bestChallengeWave || 0}</div>
    <div>Cosmetic trail: ${save.cosmeticTrail ? "UNLOCKED" : "clear L10"}</div>`;
  metaPanelEl.innerHTML = `<h3>ACHIEVEMENTS</h3>${ach}<h3>BOSS CODEX</h3>${bosses}<h3>SHIPS</h3>${ships}<h3>STATS</h3>${stats}`;
}

function applyUpgrade(id, opts = {}) {
  const offer = opts.offer || null;
  const silent = !!opts.silent;
  let meta =
    offer ||
    SHOP_POOL.find((p) => p.id === id) ||
    LEVEL_REWARDS.find((p) => p.id === id) ||
    nextStackOffer(id);

  if (id === "triple") id = "twin";

  if (STACK_UPGRADES[id]) {
    const tiers = STACK_UPGRADES[id];
    const cur = stackRank(id);
    const target = Math.min(tiers.length, offer?.stackRank || cur + 1 || 1);
    upgradeRanks[id] = Math.max(cur, target);
    upgrades[id] = true;
    if (id === "twin" && upgradeRanks.twin >= 2) upgrades.triple = true;
    if (id === "cluster") clusterTorpedoCd = Math.min(clusterTorpedoCd || 99, 0.4);
    if (id === "armor" && player) {
      player.armor = armorPlateCount();
      player.maxArmor = player.armor;
    }
    if (id === "drone") drones = createDrones();
    meta = meta || tiers[upgradeRanks[id] - 1];
    lastUpgrade = {
      id,
      name: meta.name || id,
      desc: meta.desc || "",
    };
  } else if (id === "life") {
    lives = Math.min(maxLives, lives + 1);
    lastUpgrade = meta;
  } else if (id === "maxLife") {
    maxLives = Math.min(ABS_MAX_LIVES, maxLives + 1);
    lives = Math.min(maxLives, lives + 1);
    lastUpgrade = meta;
  } else if (id === "repair" && player) {
    if (upgrades.armor) {
      player.armor = player.maxArmor || armorPlateCount();
    }
    lastUpgrade = meta;
  } else if (id === "rapidStart" && player) {
    player.rapidFire = BUFF_DURATION;
    lastUpgrade = meta;
  } else if (id === "shieldStart") {
    pendingShield = true;
    if (player) player.shield = true;
    lastUpgrade = meta;
  } else if (meta) {
    lastUpgrade = meta;
  }
  if (!silent) sfx("upgrade");
  updateHud();
}

function buildShopPool() {
  const pool = [];
  for (const id of Object.keys(STACK_UPGRADES)) {
    const next = nextStackOffer(id);
    if (next) pool.push(next);
  }
  for (const p of SHOP_POOL) {
    if (p.id === "repair" && !upgrades.armor) continue;
    pool.push({ ...p });
  }
  return pool;
}

function resolveFreeShopReward() {
  const free = LEVEL_REWARDS[level - 1];
  if (!free) return null;
  if (STACK_UPGRADES[free.id]) {
    const next = nextStackOffer(free.id);
    if (next) return { ...next, cost: 0, free: true };
    const fallback = nextStackOffer("magnet") || nextStackOffer("scoreBoost") || {
      id: "life",
      name: "+1 LIFE",
      desc: "Gain one life",
      cost: 0,
    };
    return { ...fallback, cost: 0, free: true };
  }
  return { ...free, cost: 0, free: true };
}

function openShop() {
  if (window.__challengeNoShop) {
    phase = "levelClear";
    levelClearTotal = LEVEL_CLEAR_DUR * 0.7;
    levelClearTimer = levelClearTotal;
    credits += 60;
    showToast("CHALLENGE: SHOP LOCKED — auto continue");
    updateHud();
    return;
  }
  const freeOffer = resolveFreeShopReward();
  const pool = buildShopPool().filter((p) => p.id !== freeOffer?.id || p.stackRank !== freeOffer?.stackRank);
  const picks = [];
  const copy = [...pool];
  while (picks.length < 2 && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    picks.push(copy.splice(i, 1)[0]);
  }
  shopOffers = [];
  if (freeOffer) shopOffers.push(freeOffer);
  for (const p of picks) shopOffers.push({ ...p, free: false });
  shopPicked = false;
  bullets = [];
  enemies = [];
  particles = [];
  trails = [];
  boss = null;
  phase = "shop";
  credits += 100 + level * 35;
  showToast("UPGRADE BAY — press 1/2/3 or click a card");
  updateHud();
}

function buyShopOffer(index) {
  if (shopPicked || phase !== "shop") return;
  const offer = shopOffers[index];
  if (!offer) return;
  if (!offer.free && credits < offer.cost) return;
  if (!offer.free) credits -= offer.cost;
  applyUpgrade(offer.id, { offer });
  shopPicked = true;
  phase = "levelClear";
  levelClearTotal = LEVEL_CLEAR_DUR;
  levelClearTimer = LEVEL_CLEAR_DUR;
  updateHud();
}

function skipShop() {
  if (phase !== "shop") return;
  const free = shopOffers.find((o) => o.free);
  if (free && !shopPicked) applyUpgrade(free.id, { offer: free });
  shopPicked = true;
  phase = "levelClear";
  levelClearTotal = LEVEL_CLEAR_DUR * 0.9;
  levelClearTimer = levelClearTotal;
  updateHud();
}

function easeInOutCubic(t) {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Fade in → hold → fade out for banner timers counting down. */
function bannerOpacity(timer, total, fadeIn = 0.22, fadeOut = 0.28) {
  if (total <= 0) return 0;
  const p = 1 - timer / total;
  if (p <= 0) return 0;
  if (p < fadeIn) return easeInOutCubic(p / fadeIn);
  if (p > 1 - fadeOut) return easeInOutCubic((1 - p) / fadeOut);
  return 1;
}

function shipHasSpecial(ship = selectedShip()) {
  return !!(ship && ship.hasSpecial);
}

function syncTouchSpecialButton() {
  if (!touchSpecial) return;
  const show = shipHasSpecial();
  touchSpecial.classList.toggle("hidden", !show);
  touchSpecial.setAttribute("aria-hidden", show ? "false" : "true");
  touchSpecial.disabled = !show;
}

function fireSpecial() {
  if (!player || specialCd > 0 || !running || paused) return;
  if (phase === "shop" || phase === "levelClear" || phase === "levelIntro") return;
  if (!shipHasSpecial()) return;
  specialCd = SPECIAL_CD * specialCdMul();
  sfx("special");
  addShake(6, 0.25);
  const ship = selectedShip().id;
  if (ship === "god") {
    specialCd = 2.5;
    player.shield = true;
    bullets = bullets.filter((b) => b.fromPlayer);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      firePlayerBullet(player.x, player.y, Math.cos(a) * 420, Math.sin(a) * 420, { size: 6, style: "allyShard" });
    }
    for (let i = -4; i <= 4; i++) {
      firePlayerBullet(player.x + i * 10, player.y - 18, i * 25, -780, { size: 5, style: "droneNova" });
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      enemies[i].hp -= 8;
      if (enemies[i].hp <= 0) destroyEnemy(i);
    }
    if (boss && !boss.entrant) {
      boss.hp -= 18;
      boss.flash = 0.15;
      if (boss.hp <= 0) onBossDefeated();
    }
    burst(player.x, player.y, ["#ffe566", "#ffffff", "#ff4d6d", "#3de0ff"], 40, 280);
    addShake(10, 0.35);
    updateHud();
  } else if (ship === "nova") {
    for (let i = -3; i <= 3; i++) {
      firePlayerBullet(player.x + i * 8, player.y - 16, i * 40, -620, { size: 4, style: "allyShard" });
    }
  } else if (ship === "ember") {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      firePlayerBullet(player.x, player.y, Math.cos(a) * 340, Math.sin(a) * 340, { size: 5, style: "allyShard" });
    }
  } else if (ship === "tide") {
    firePlayerBullet(player.x, player.y - 20, 0, -700, { size: 8, style: "droneNova" });
    firePlayerBullet(player.x - 10, player.y - 10, -20, -650, { size: 5, style: "drone" });
    firePlayerBullet(player.x + 10, player.y - 10, 20, -650, { size: 5, style: "drone" });
  } else if (ship === "rift") {
    bullets = bullets.filter((b) => {
      if (b.fromPlayer) return true;
      const near = Math.hypot(b.x - player.x, b.y - player.y) < 160;
      if (near) burst(b.x, b.y, ["#3de0ff", "#ffffff"], 4, 60);
      return !near;
    });
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (Math.hypot(enemies[i].x - player.x, enemies[i].y - player.y) < 150) {
        enemies[i].hp -= 2;
        if (enemies[i].hp <= 0) destroyEnemy(i);
      }
    }
    if (boss && !boss.entrant && Math.hypot(boss.x - player.x, boss.y - player.y) < 180) {
      boss.hp -= 4;
      boss.flash = 0.1;
      if (boss.hp <= 0) onBossDefeated();
    }
    burst(player.x, player.y, ["#3de0ff", "#7cf0ff", "#ffffff"], 28, 200);
  } else if (ship === "aegis") {
    // Defensive veil: wipe nearby shots, raise shield, then a patient counter-lance
    specialCd = SPECIAL_CD * 0.85 * specialCdMul();
    player.shield = true;
    bullets = bullets.filter((b) => {
      if (b.fromPlayer) return true;
      const near = Math.hypot(b.x - player.x, b.y - player.y) < 210;
      if (near) burst(b.x, b.y, ["#a8d4ff", "#e8f4ff", "#70a0ff"], 5, 70);
      return !near;
    });
    firePlayerBullet(player.x, player.y - 22, 0, -820, { size: 9, style: "droneNova" });
    firePlayerBullet(player.x - 14, player.y - 8, -18, -740, { size: 5, style: "allyShard" });
    firePlayerBullet(player.x + 14, player.y - 8, 18, -740, { size: 5, style: "allyShard" });
    burst(player.x, player.y, ["#c8d0e8", "#70a0ff", "#ffffff", "#40e8ff"], 32, 220);
    updateHud();
  } else if (ship === "overmind" || ship === "apex") {
    // shield pulse
    player.shield = true;
    bullets = bullets.filter((b) => b.fromPlayer || Math.hypot(b.x - player.x, b.y - player.y) > 120);
    burst(player.x, player.y, ["#8ec8ff", "#ffffff", "#3de0ff"], 24, 180);
    updateHud();
  }
}

function spawnHazardsForTheme() {
  hazards = [];
  const style = theme.style;
  if (style === "ember") {
    for (let i = 0; i < 3; i++) {
      hazards.push({
        kind: "meteor",
        x: 60 + Math.random() * (W - 120),
        y: -40 - Math.random() * 200,
        w: 18,
        h: 18,
        vy: 140 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 40,
      });
    }
  } else if (style === "toxic") {
    hazards.push({ kind: "edgeAcid", side: "left", w: 28 });
    hazards.push({ kind: "edgeAcid", side: "right", w: 28 });
  } else if (style === "solar") {
    for (let i = 0; i < 4; i++) {
      hazards.push({
        kind: "meteor",
        x: 60 + Math.random() * (W - 120),
        y: -40 - Math.random() * 220,
        w: 18,
        h: 18,
        vy: 150 + Math.random() * 90,
        vx: (Math.random() - 0.5) * 50,
      });
    }
  } else if (style === "omega" || style === "final") {
    hazards.push({ kind: "edgeAcid", side: "left", w: 22 });
    hazards.push({ kind: "edgeAcid", side: "right", w: 22 });
  } else if (style === "ash") {
    for (let i = 0; i < 5; i++) {
      hazards.push({
        kind: "meteor",
        x: 60 + Math.random() * (W - 120),
        y: -40 - Math.random() * 240,
        w: 16,
        h: 16,
        vy: 160 + Math.random() * 100,
        vx: (Math.random() - 0.5) * 55,
      });
    }
  }
}

function triggerWaveEvent() {
  if (enemies.length && Math.random() < 0.55) {
    const host = enemies[Math.floor(Math.random() * enemies.length)];
    host.carrier = true;
    host.hp += 1;
    showToast("CARRIER SIGHTED");
  }
}

function resetPlayer(keepBuffs = false) {
  const prev = player;
  const ship = selectedShip();
  const armorBase = upgrades.armor ? armorPlateCount() : ship.armorBonus;
  player = {
    x: W / 2,
    y: H - 70,
    w: 34,
    h: 40,
    speed: ship.speed,
    fireMul: ship.fireMul,
    cooldown: 0,
    invuln: 1.2,
    thrust: 0,
    doubleShot: keepBuffs && prev ? prev.doubleShot : 0,
    rapidFire: keepBuffs && prev ? prev.rapidFire : 0,
    shield: keepBuffs && prev ? prev.shield : false,
    armor: armorBase,
    maxArmor: armorBase,
    slowMul: 1,
    slowTimer: keepBuffs && prev ? prev.slowTimer : 0,
  };
}

function makePixelPlanet(seedColors) {
  const px = 3 + Math.floor(Math.random() * 3); // pixel size
  const r = 5 + Math.floor(Math.random() * 8); // radius in pixels
  const c0 = seedColors.c0;
  const c1 = seedColors.c1;
  const c2 = seedColors.c2;
  const cells = [];
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d > r + 0.2) continue;
      const shade = d / r;
      const lit = x * -0.55 + y * -0.45;
      let color = c1;
      if (shade > 0.85) color = c2;
      else if (lit > 0.4) color = c0;
      else if (lit < -0.35) color = c2;
      // crater / band dots
      if (Math.random() < 0.08) color = c2;
      if (Math.random() < 0.05) color = c0;
      cells.push({ x, y, color });
    }
  }
  const hasRing = Math.random() < 0.35;
  return {
    x: Math.random() * W,
    y: -40 - Math.random() * H * 0.5,
    px,
    r,
    cells,
    hasRing,
    ringColor: c0,
    vy: 8 + Math.random() * 18,
    vx: (Math.random() - 0.5) * 6,
    spin: Math.random() * Math.PI * 2,
  };
}

function applyTheme(t) {
  theme = t;
  stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    z: 0.15 + Math.random() * 1.4,
    s: Math.random() < 0.85 ? 1 : 2,
    tw: Math.random() * Math.PI * 2,
  }));
  nebulae = [];
  planet = {
    x: W * t.planet.x,
    y: H * t.planet.y,
    c0: t.planet.c0,
    c1: t.planet.c1,
    c2: t.planet.c2,
  };
  // a few drifting pixel planets (theme colors + variants)
  scenery = [
    makePixelPlanet(t.planet),
    makePixelPlanet(t.planet),
    makePixelPlanet({
      c0: t.planet.c0,
      c1: t.planet.c2,
      c2: "#050508",
    }),
  ];
  if (Math.random() < 0.5) scenery.push(makePixelPlanet(t.planet));
}

function waveLabel() {
  if (challengeMode) {
    if (phase === "warning" || phase === "bossIntro") return "MINI";
    if (phase === "boss") return "MINI";
    return String(wave);
  }
  if (phase === "fleet" || phase === "waveBreak") return `${wave}/${WAVES_PER_LEVEL}`;
  if (phase === "warning" || phase === "bossIntro") return "ALERT";
  if (phase === "boss") return "BOSS";
  if (phase === "shop") return "SHOP";
  if (phase === "levelClear") return "CLEAR";
  if (phase === "levelIntro") return "NEXT";
  return "DONE";
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(save.bestScore);
  levelEl.textContent = challengeMode ? "∞" : String(level);
  waveEl.textContent = waveLabel();
  livesEl.textContent = String(lives);
  comboEl.textContent = String(combo);
  const chips = [];
  if (upgrades.triple || stackRank("twin") >= 2) chips.push('<span class="buff-chip">TRIPLE</span>');
  else if (upgrades.twin) chips.push('<span class="buff-chip">TWIN</span>');
  if (upgrades.cluster) {
    const r = stackRank("cluster");
    chips.push(`<span class="buff-chip">CLUSTER${r > 1 ? " " + "I".repeat(Math.min(3, r)) : ""}</span>`);
  }
  if (upgrades.armor && player) chips.push(`<span class="buff-chip shield">ARMOR ${player.armor}</span>`);
  if (upgrades.drone) {
    const r = stackRank("drone");
    chips.push(`<span class="buff-chip rapid">DRONES${r > 1 ? " Mk" + r : ""}</span>`);
  }
  if (upgrades.magnet) chips.push(`<span class="buff-chip">MAGNET${stackRank("magnet") > 1 ? "+" : ""}</span>`);
  if (upgrades.cooldownCut) chips.push(`<span class="buff-chip">COOLANT${stackRank("cooldownCut") > 1 ? "+" : ""}</span>`);
  if (upgrades.bulletSpeed) chips.push(`<span class="buff-chip">OVERCHARGE${stackRank("bulletSpeed") > 1 ? "+" : ""}</span>`);
  if (upgrades.scoreBoost) chips.push('<span class="buff-chip">SCORE+</span>');
  if (maxLives > MAX_LIVES) chips.push(`<span class="buff-chip">MAX ${maxLives}</span>`);
  if (player?.shield) chips.push('<span class="buff-chip shield">SHIELD</span>');
  if (player?.slowTimer > 0) chips.push('<span class="buff-chip">HEXED</span>');
  if (player?.doubleShot > 0) chips.push('<span class="buff-chip">x2</span>');
  if (player?.rapidFire > 0) chips.push('<span class="buff-chip rapid">RAPID</span>');
  if (shipHasSpecial()) {
    if (specialCd > 0) chips.push(`<span class="buff-chip">SPC ${Math.ceil(specialCd)}</span>`);
    else chips.push('<span class="buff-chip">SPC READY</span>');
  }
  if (credits > 0) chips.push(`<span class="buff-chip shield">CR ${credits}</span>`);
  const next = chips.join("");
  if (next !== hudBuffsCache) {
    hudBuffsCache = next;
    buffsEl.innerHTML = next;
  }
}

function showOverlay(title, subtitle, buttonText, opts = {}) {
  titleEl.textContent = title;
  subtitleEl.textContent = subtitle;
  startBtn.textContent = buttonText;
  startBtn.dataset.mode = opts.mode || "campaign";
  refreshMenuScores();
  renderLevelSelect();
  renderShipSelect();
  setMenuTab("play", { silent: true });
  overlay.classList.remove("hidden");
}

function beginWave(n) {
  wave = n;
  if (challengeMode) syncChallengeTheme();
  phase = "fleet";
  const cfg = currentWaveConfig();
  enemiesLeft = cfg.count;
  spawnTimer = 0.35;
  waveEventTimer = 4 + Math.random() * 3;
  waveTookDamage = false;
  startMusic("fleet");
  if (challengeMode && isChallengeBossWave(wave)) {
    showToast(`WAVE ${wave} · MINI-BOSS AFTER CLEAR`);
  }
  updateHud();
}

function beginLevel(n, opts = {}) {
  const instant = !!opts.instant;
  level = n;
  bullets = bullets.filter((b) => b.fromPlayer);
  enemies = [];
  pickups = [];
  particles = particles.filter((p) => p.life > 0.1);
  trails = [];
  boss = null;
  levelPickups = 0;
  applyTheme(currentLevel().theme);
  spawnHazardsForTheme();
  if (pendingShield && player) {
    player.shield = true;
    pendingShield = false;
  }
  const foe = LEVEL_NEW_KIND[Math.max(0, Math.min(LEVEL_NEW_KIND.length, n) - 1)];
  if (ENEMY_NAMES[foe]) showToast(`NEW FOE: ${ENEMY_NAMES[foe]}`);
  pushRecEvent("levelStart", { level: n, foe: ENEMY_NAMES[foe] || null });
  if (instant) {
    beginWave(1);
    return;
  }
  phase = "levelIntro";
  levelIntroTotal = LEVEL_INTRO_DUR;
  levelIntroTimer = LEVEL_INTRO_DUR;
  updateHud();
}

function todayChallengeId() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function challengeRulesFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  // Never assign private ships (Aegis/GOD) in public Daily Challenge
  const ships = SHIPS.filter((s) => !s.debug && !s.custom);
  const ship = ships[h % ships.length];
  return {
    lives: 3,
    shipId: ship.id,
    shipName: ship.name,
    noShop: true,
    label: `${ship.name} · ENDLESS · 3 LIVES · NO SHOP`,
  };
}

function startChallenge() {
  challengeMode = true;
  challengeId = todayChallengeId();
  const rules = challengeRulesFor(challengeId);
  selectedShipId = rules.shipId;
  window.__challengeNoShop = true;
  ensureAudio();
  sfx("ui");
  nearMissRun = 0;
  eliteKillsRun = 0;
  perfectStreak = 0;
  runStats = { nearMisses: 0, elites: 0, time: 0, damageTaken: 0 };
  cosmeticTrail = !!save.cosmeticTrail;
  score = 0;
  lives = rules.lives;
  maxLives = rules.lives;
  credits = 0;
  combo = 0;
  comboTimer = 0;
  maxCombo = 0;
  specialCd = 0;
  pendingShield = false;
  paused = false;
  bullets = [];
  enemies = [];
  particles = [];
  trails = [];
  pickups = [];
  hazards = [];
  boss = null;
  warningTimer = 0;
  waveBreakTimer = 0;
  levelClearTimer = 0;
  levelIntroTimer = 0;
  upgrades = {
    twin: false,
    triple: false,
    cluster: false,
    armor: false,
    drone: false,
    magnet: false,
    cooldownCut: false,
    bulletSpeed: false,
    scoreBoost: false,
  };
  upgradeRanks = emptyUpgradeRanks();
  lastUpgrade = null;
  clusterTorpedoCd = 0;
  drones = [];
  resetPlayer(false);
  resetPlayer(true);
  overlay.classList.add("hidden");
  running = true;
  lastTime = performance.now();
  maybeStartFromArm();
  level = 1;
  wave = 1;
  syncChallengeTheme();
  syncTouchSpecialButton();
  showToast(`DAILY ${challengeId}: ${rules.label}`);
  beginWave(1);
  updateHud();
}

function startGame() {
  ensureAudio();
  sfx("ui");
  nearMissRun = 0;
  eliteKillsRun = 0;
  perfectStreak = 0;
  runStats = { nearMisses: 0, elites: 0, time: 0, damageTaken: 0 };
  cosmeticTrail = !!save.cosmeticTrail;
  if (!challengeMode) window.__challengeNoShop = false;
  score = 0;
  lives = 5;
  maxLives = MAX_LIVES;
  credits = 0;
  combo = 0;
  comboTimer = 0;
  maxCombo = 0;
  specialCd = 0;
  pendingShield = false;
  paused = false;
  bullets = [];
  enemies = [];
  particles = [];
  trails = [];
  pickups = [];
  hazards = [];
  boss = null;
  warningTimer = 0;
  warningTotal = WARNING_DUR;
  waveBreakTimer = 0;
  waveBreakTotal = WAVE_BREAK_DUR;
  levelClearTimer = 0;
  levelClearTotal = LEVEL_CLEAR_DUR;
  levelIntroTimer = 0;
  levelIntroTotal = LEVEL_INTRO_DUR;
  upgrades = {
    twin: false,
    triple: false,
    cluster: false,
    armor: false,
    drone: false,
    magnet: false,
    cooldownCut: false,
    bulletSpeed: false,
    scoreBoost: false,
  };
  upgradeRanks = emptyUpgradeRanks();
  lastUpgrade = null;
  clusterTorpedoCd = 0;
  drones = [];
  selectedShipId = save.selectedShipId || "ice";
  sanitizeSelectedShip();
  if (!isShipUnlocked(selectedShip())) selectedShipId = "ice";
  const startLevel = Math.max(1, Math.min(maxSelectableLevel(), save.selectedStartLevel || 1));
  save.selectedStartLevel = startLevel;
  resetPlayer(false);
  grantProgressForStart(startLevel);
  resetPlayer(true);
  applyGodLoadout();
  overlay.classList.add("hidden");
  running = true;
  lastTime = performance.now();
  maybeStartFromArm();
  syncTouchSpecialButton();
  beginLevel(startLevel, { instant: false });
}

function endGame(won) {
  running = false;
  paused = false;
  stopMusic();
  pushRecEvent(won ? "win" : "lose", { score, level, maxCombo });
  if (recorder.recording) stopRecording();
  save.stats = save.stats || { runs: 0, wins: 0, timePlayed: 0, favoriteShip: "ice", shipPlays: {} };
  save.stats.runs += 1;
  save.stats.timePlayed += Math.floor(runStats.time || 0);
  const sid = selectedShipId || "ice";
  save.stats.shipPlays[sid] = (save.stats.shipPlays[sid] || 0) + 1;
  let fav = sid;
  let favN = 0;
  for (const [k, v] of Object.entries(save.stats.shipPlays)) {
    if (v > favN) { fav = k; favN = v; }
  }
  save.stats.favoriteShip = fav;
  if (!save.seenShips) save.seenShips = ["ice"];
  if (!save.seenShips.includes(sid)) save.seenShips.push(sid);
  if (score > save.bestScore) save.bestScore = score;
  endingMedals = [];
  if (challengeMode) {
    recordChallengeProgress();
    if (wave >= 10) endingMedals.push("WAVE 10+");
    if (wave >= 20) endingMedals.push("WAVE 20+");
    if (maxCombo >= 20) endingMedals.push("COMBO x20");
    if (eliteKillsRun >= 10) endingMedals.push("ELITE HUNTER");
    persistSave(true);
    refreshMenuScores();
    const medalLine = endingMedals.length ? ` Medals: ${endingMedals.join(" · ")}.` : "";
    showOverlay(
      "CORRIDOR ENDED",
      `Wave ${wave} · Score ${score} · Best wave ${save.bestChallengeWave || 0} · Best score ${save.bestChallenge || 0}.${medalLine}`,
      "RETRY CHALLENGE",
      { mode: "challenge" }
    );
    challengeMode = false;
    window.__challengeNoShop = false;
    return;
  }
  if (won) {
    save.stats.wins += 1;
    unlockShipForLevel(TOTAL_LEVELS);
    unlockAchievement("clear10");
    endingMedals.push("HORIZON CLEAR");
    if (maxCombo >= 20) endingMedals.push("COMBO x20");
    if (nearMissRun >= 50) endingMedals.push("NEEDLE THREAD");
    if (eliteKillsRun >= 10) endingMedals.push("ELITE HUNTER");
    save.cosmeticTrail = true;
    cosmeticTrail = true;
    endingMedals.push("TRAIL UNLOCKED");
    persistSave(true);
    refreshMenuScores();
    const medalLine = endingMedals.length ? ` Medals: ${endingMedals.join(" · ")}.` : "";
    showOverlay(
      "MISSION COMPLETE",
      `Score ${score} · Combo x${maxCombo} · Near-miss ${nearMissRun}.${medalLine}`,
      "PLAY AGAIN"
    );
  } else {
    persistSave(true);
    refreshMenuScores();
    showOverlay(
      "MISSION FAILED",
      `Score ${score}. Best ${save.bestScore}.`,
      "RETRY"
    );
  }
  challengeMode = false;
  window.__challengeNoShop = false;
}


// --- combat spawn / pickups ---
function spawnEnemy() {
  const cfg = currentWaveConfig();
  const kind = pickWeightedKind(cfg.weights);
  const lvl = challengeMode ? Math.max(0, Math.floor((wave - 1) / 2)) : Math.max(0, level - 1);
  let size;
  let speed;
  let hp;
  let hMul;
  let fireRate;

  if (kind === 0) {
    size = 28 + Math.random() * 6;
    speed = 55 + Math.random() * 25;
    hp = 1 + Math.floor(lvl * 0.6);
    hMul = 0.9;
    fireRate = 1.15 + Math.random() * 0.3;
  } else if (kind === 1) {
    size = 30 + Math.random() * 8;
    speed = 40 + Math.random() * 20;
    hp = 2 + Math.floor(lvl * 0.75);
    hMul = 1.05;
    fireRate = 1.45 + Math.random() * 0.3;
  } else if (kind === 2) {
    size = 30 + Math.random() * 6;
    speed = 50 + Math.random() * 25;
    hp = 2 + Math.floor(lvl * 0.65);
    hMul = 0.95;
    fireRate = 4 + Math.random() * 1;
  } else if (kind === 3) {
    size = 24 + Math.random() * 6;
    speed = 110 + Math.random() * 40;
    hp = 1 + Math.floor(lvl * 0.4);
    hMul = 1.15;
    fireRate = 999;
  } else if (kind === 4) {
    size = 26 + Math.random() * 5;
    speed = 45 + Math.random() * 20;
    hp = 2 + Math.floor(lvl * 0.7);
    hMul = 1.2;
    fireRate = 2.2 + Math.random() * 0.4;
  } else if (kind === 5) {
    size = 32 + Math.random() * 6;
    speed = 48 + Math.random() * 22;
    hp = 2 + Math.floor(lvl * 0.8);
    hMul = 0.85;
    fireRate = 1.6 + Math.random() * 0.35;
  } else if (kind === 6) {
    size = 28 + Math.random() * 5;
    speed = 70 + Math.random() * 25;
    hp = 2 + Math.floor(lvl * 0.7);
    hMul = 1.0;
    fireRate = 1.5 + Math.random() * 0.3;
  } else if (kind === 7) {
    size = 30 + Math.random() * 5;
    speed = 42 + Math.random() * 18;
    hp = 3 + Math.floor(lvl * 0.7);
    hMul = 1.05;
    fireRate = 2.0 + Math.random() * 0.35;
  } else if (kind === 8) {
    size = 34 + Math.random() * 6;
    speed = 38 + Math.random() * 16;
    hp = 3 + Math.floor(lvl * 0.85);
    hMul = 1.1;
    fireRate = 2.8 + Math.random() * 0.4;
  } else if (kind === 9) {
    size = 29 + Math.random() * 5;
    speed = 55 + Math.random() * 22;
    hp = 3 + Math.floor(lvl * 0.75);
    hMul = 0.95;
    fireRate = 1.7 + Math.random() * 0.3;
  } else {
    size = 31 + Math.random() * 5;
    speed = 60 + Math.random() * 24;
    hp = 3 + Math.floor(lvl * 0.9);
    hMul = 1.0;
    fireRate = 1.35 + Math.random() * 0.25;
  }

  const eliteChance = challengeMode
    ? 0.06 + Math.min(0.18, wave * 0.008)
    : level >= 3
      ? 0.12 + Math.min(0.08, level * 0.008)
      : 0.04;
  const elite = Math.random() < eliteChance;
  if (elite) {
    hp = Math.max(2, Math.ceil(hp * 2));
    size *= 1.15;
    speed *= 0.92;
  }
  enemies.push({
    x: 40 + Math.random() * (W - 80),
    y: -40,
    w: size,
    h: size * hMul,
    speed: speed * cfg.speedMul,
    hp,
    maxHp: hp,
    kind,
    elite: !!elite,
    phase: Math.random() * Math.PI * 2,
    shootCooldown: 0.5 + Math.random() * 0.7,
    fireRate: elite ? fireRate * 0.85 : fireRate,
    targetY: 55 + Math.random() * 70 + (kind === 3 ? 10 : Math.min(kind, 6) * 4),
    settled: false,
    diving: false,
    blinkCd: kind === 6 ? 1.2 + Math.random() : 0,
    cloaked: false,
  });
}

function enemyShootAtPlayer(e) {
  if (e.kind === 0) {
    fireEnemyBullet(e.x, e.y + e.h / 2, 0, 240, { breakable: true, style: "breakable" });
  } else if (e.kind === 1) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    fireEnemyBullet(e.x, e.y + e.h / 2, (dx / len) * 210, (dy / len) * 210, { style: "aimed" });
  } else if (e.kind === 2) {
    fireEnemyBullet(e.x, e.y + e.h / 2, 0, 180, {
      cluster: true,
      fuse: 0.75,
      size: 16,
      style: "cluster",
    });
  } else if (e.kind === 4) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    fireEnemyBullet(e.x, e.y + e.h / 2, (dx / len) * 380, (dy / len) * 380, {
      size: 5,
      style: "sniper",
    });
  } else if (e.kind === 5) {
    fireEnemyBullet(e.x - 12, e.y + e.h / 2, -55, 230, { style: "splitter", size: 6 });
    fireEnemyBullet(e.x + 12, e.y + e.h / 2, 55, 230, { style: "splitter", size: 6 });
  } else if (e.kind === 6) {
    fireEnemyBullet(e.x, e.y + e.h / 2, 0, 160, {
      style: "wraith",
      size: 7,
      waveAmp: 120,
      waveFreq: 7,
      wavePhase: e.phase,
    });
  } else if (e.kind === 7) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    fireEnemyBullet(e.x, e.y + e.h / 2, (dx / len) * 170, (dy / len) * 170, {
      style: "hex",
      size: 8,
      slowHit: true,
    });
  } else if (e.kind === 8) {
    fireEnemyBullet(e.x, e.y + e.h / 2, (player.x - e.x) * 0.15, 120, {
      cluster: true,
      fuse: 1.05,
      size: 18,
      style: "mortar",
    });
  } else if (e.kind === 9) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    fireEnemyBullet(e.x, e.y + e.h / 2, Math.cos(a) * 140, Math.sin(a) * 140, {
      style: "leech",
      size: 6,
    });
    for (const ally of enemies) {
      if (ally === e) continue;
      if (Math.hypot(ally.x - e.x, ally.y - e.y) < 110) ally.hp = Math.min(ally.hp + 1, 6);
    }
  } else if (e.kind === 10) {
    for (let i = -2; i <= 2; i++) {
      const a = Math.PI / 2 + i * 0.28;
      fireEnemyBullet(e.x, e.y + e.h / 2, Math.cos(a) * 320, Math.sin(a) * 320, {
        style: "prism",
        size: 4,
      });
    }
  }
}

function spawnPickup(x, y) {
  const type = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)];
  pickups.push({
    x,
    y,
    w: 22,
    h: 22,
    type,
    speed: 160,
    spin: Math.random() * Math.PI * 2,
  });
}

function applyPickup(type) {
  levelPickups += 1;
  if (type === "double") player.doubleShot = BUFF_DURATION;
  else if (type === "rapid") player.rapidFire = BUFF_DURATION;
  else if (type === "shield") player.shield = true;
  else if (type === "life") lives = Math.min(maxLives, lives + 1);
  burst(player.x, player.y, [PICKUP_COLORS[type], "#ffffff", "#9af0ff"], 14, 140);
  sfx("pickup");
  updateHud();
}


// --- boss ---
function spawnBoss() {
  const cfg = currentLevel().boss;
  const mini = challengeMode;
  const hpScale = mini ? 0.62 + Math.min(0.7, wave * 0.024) : 1.25;
  const bossHp = Math.round(cfg.hp * hpScale);
  const bossName = mini ? `MINI ${cfg.name}` : cfg.name;
  pushRecEvent("bossSpawn", { id: cfg.id, name: bossName, hp: bossHp, level, mini });
  boss = {
    x: W / 2,
    y: -100,
    targetY: mini ? 120 : 130,
    w: mini ? 185 : 220,
    h: mini ? 105 : 120,
    hp: bossHp,
    maxHp: bossHp,
    vx: 0,
    speed: cfg.speed * (mini ? 1.16 : 1),
    baseCooldown: cfg.cooldown * (mini ? 0.82 : 1),
    cooldown: cfg.cooldown * (mini ? 0.62 : 0.8),
    entrant: true,
    flash: 0,
    mode: cfg.modes[0],
    modeTimer: mini ? 1.9 : 2.8,
    diveTimer: 0,
    homeY: mini ? 100 : 110,
    id: cfg.id,
    name: bossName,
    modes: cfg.modes,
    silhouette: cfg.silhouette,
    colors: cfg.colors,
    spin: 0,
    rainT: 0,
    specialFlash: 0,
    phase2: false,
    phase2Announced: false,
    mini: !!mini,
  };
  bossHitless = true;
  if (cfg.id && !(save.seenBosses || []).includes(cfg.id)) {
    save.seenBosses = [...(save.seenBosses || []), cfg.id];
    persistSave();
  }
  phase = "bossIntro";
  bossIntroTotal = mini ? 1.6 : 2.4;
  bossIntroTimer = bossIntroTotal;
  startMusic("boss");
  duckMusic(1.2);
  sfx("warn");
  updateHud();
}

function bossHpRatio() {
  return boss ? boss.hp / boss.maxHp : 0;
}

function pickBossMode() {
  const allowed = boss.modes;
  const hp = bossHpRatio();
  if (boss.id === "overmind" && hp < 0.35 && allowed.includes("overmindRage")) {
    return Math.random() < 0.55 ? "overmindRage" : allowed[Math.floor(Math.random() * allowed.length)];
  }
  if (boss.id === "cinder" && hp < 0.4 && allowed.includes("chargeDive") && Math.random() < 0.4) {
    return "chargeDive";
  }
  return allowed[Math.floor(Math.random() * allowed.length)];
}

function bossDodgeThreat(dt) {
  let threat = 0;
  for (const b of bullets) {
    if (!b.fromPlayer) continue;
    const dy = boss.y - b.y;
    if (dy < 0 || dy > 180) continue;
    const dx = b.x - boss.x;
    if (Math.abs(dx) < 70) threat += dx < 0 ? 1 : -1;
  }
  if (threat !== 0) boss.vx += Math.sign(threat) * 380 * dt;
}

function aimAtPlayer(fromX, fromY) {
  const dx = player.x - fromX;
  const dy = player.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len, ang: Math.atan2(dy, dx) };
}

function fireBossIceLance() {
  const n = bossHpRatio() < 0.35 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const ox = (i - (n - 1) / 2) * 22;
    fireEnemyBullet(boss.x + ox, boss.y + boss.h / 2, ox * 0.35, 175, {
      breakable: true,
      style: "ice",
      size: 8,
    });
  }
}

function fireBossIceFan() {
  const count = bossHpRatio() < 0.35 ? 7 : 5;
  const mid = (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    fireEnemyBullet(boss.x, boss.y + boss.h / 2, (i - mid) * 48, 200, {
      breakable: true,
      style: "ice",
      size: 7,
    });
  }
}

function fireBossFrostRing() {
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + time;
    fireEnemyBullet(boss.x, boss.y + 10, Math.cos(a) * 160, Math.sin(a) * 160 + 40, {
      breakable: true,
      style: "frost",
      size: 7,
    });
  }
}

function fireBossWeaveSpiral() {
  boss.spin += 0.7;
  const arms = 3;
  for (let i = 0; i < arms; i++) {
    const a = boss.spin + (i / arms) * Math.PI * 2;
    fireEnemyBullet(boss.x, boss.y + boss.h / 2, Math.cos(a) * 190, Math.sin(a) * 190 + 70, {
      style: "void",
      size: 6,
    });
  }
}

function fireBossVoidPortals() {
  const aimL = aimAtPlayer(40, H * 0.35);
  const aimR = aimAtPlayer(W - 40, H * 0.35);
  fireEnemyBullet(40, H * 0.35, aimL.dx * 230, aimL.dy * 230, { style: "void", size: 7 });
  fireEnemyBullet(W - 40, H * 0.35, aimR.dx * 230, aimR.dy * 230, { style: "void", size: 7 });
  burst(40, H * 0.35, boss.colors, 8, 90);
  burst(W - 40, H * 0.35, boss.colors, 8, 90);
  if (bossHpRatio() < 0.4) {
    const aim = aimAtPlayer(boss.x, boss.y + boss.h / 2);
    fireEnemyBullet(boss.x, boss.y + boss.h / 2, aim.dx * 210, aim.dy * 210, { style: "void", size: 6 });
  }
}

function fireBossRiftCluster() {
  fireEnemyBullet(boss.x, boss.y + boss.h / 2, 0, 150, {
    cluster: true,
    fuse: 0.85,
    size: 16,
    style: "cluster",
  });
  if (bossHpRatio() < 0.35) {
    fireEnemyBullet(boss.x - 40, boss.y + 20, -40, 140, {
      cluster: true,
      fuse: 0.9,
      size: 14,
      style: "cluster",
    });
    fireEnemyBullet(boss.x + 40, boss.y + 20, 40, 140, {
      cluster: true,
      fuse: 0.9,
      size: 14,
      style: "cluster",
    });
  }
}

function fireBossFireRain() {
  const cols = bossHpRatio() < 0.35 ? 7 : 5;
  for (let i = 0; i < cols; i++) {
    const x = 50 + (i / (cols - 1)) * (W - 100) + Math.sin(time * 3 + i) * 18;
    fireEnemyBullet(x, -10, 0, 220 + (i % 2) * 30, { style: "ember", size: 6 });
  }
}

function fireBossEmberBurst() {
  const aim = aimAtPlayer(boss.x, boss.y + boss.h / 2);
  for (let i = -1; i <= 1; i++) {
    const a = aim.ang + i * 0.22;
    fireEnemyBullet(boss.x, boss.y + boss.h / 2, Math.cos(a) * 280, Math.sin(a) * 280, {
      style: "ember",
      size: 6,
    });
  }
  for (let i = -2; i <= 2; i++) {
    fireEnemyBullet(boss.x + i * 16, boss.y + boss.h / 2, i * 40, 260, { style: "ember", size: 5 });
  }
}

function fireBossChargeSpray() {
  for (let i = -2; i <= 2; i++) {
    fireEnemyBullet(boss.x + i * 14, boss.y + boss.h / 2, i * 70, 320, { style: "ember", size: 6 });
  }
}

function fireBossTwinLance() {
  const aim = aimAtPlayer(boss.x, boss.y + boss.h / 2);
  const ox = -aim.dy * 16;
  const oy = aim.dx * 16;
  fireEnemyBullet(boss.x + ox, boss.y + oy, aim.dx * 360, aim.dy * 360, { style: "sting", size: 5 });
  fireEnemyBullet(boss.x - ox, boss.y - oy, aim.dx * 360, aim.dy * 360, { style: "sting", size: 5 });
}

function fireBossWaveCrest() {
  const n = bossHpRatio() < 0.35 ? 6 : 4;
  for (let i = 0; i < n; i++) {
    const ox = (i - (n - 1) / 2) * 28;
    fireEnemyBullet(boss.x + ox, boss.y + boss.h / 2, ox * 0.2, 210, {
      style: "wave",
      size: 6,
      waveAmp: 90,
      waveFreq: 6 + i * 0.4,
      wavePhase: i * 0.8,
    });
  }
}

function fireBossStingSeek() {
  const n = bossHpRatio() < 0.35 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.45;
    fireEnemyBullet(boss.x, boss.y + boss.h / 2, Math.cos(a) * 150, Math.sin(a) * 150, {
      style: "sting",
      size: 7,
      homing: true,
      turnRate: 1.8,
    });
  }
}

function spawnBossMinion() {
  const kind = Math.random() < 0.5 ? 5 : 4;
  enemies.push({
    x: boss.x + (Math.random() < 0.5 ? -70 : 70),
    y: boss.y + 30,
    w: 26,
    h: 26,
    speed: 70,
    hp: 1 + Math.floor((level - 1) * 0.5),
    kind,
    phase: Math.random() * Math.PI * 2,
    shootCooldown: 1.2,
    fireRate: kind === 4 ? 2.4 : 1.8,
    targetY: 70 + Math.random() * 50,
    settled: false,
    diving: false,
    bossMinion: true,
  });
}

function fireBossToxicCross() {
  for (let i = -3; i <= 3; i++) {
    fireEnemyBullet(boss.x + i * 28, boss.y + boss.h / 2, 0, 240, { style: "toxic", size: 6 });
  }
  for (let i = 1; i <= 3; i++) {
    fireEnemyBullet(boss.x - 70, boss.y + 20 + i * 18, -40, 160 + i * 20, { style: "toxic", size: 5 });
    fireEnemyBullet(boss.x + 70, boss.y + 20 + i * 18, 40, 160 + i * 20, { style: "toxic", size: 5 });
  }
}

function fireBossToxicSpiral() {
  boss.spin += 0.55;
  for (let i = 0; i < 6; i++) {
    const a = boss.spin + (i / 6) * Math.PI * 2;
    fireEnemyBullet(boss.x, boss.y + 12, Math.cos(a) * 200, Math.sin(a) * 200 + 50, {
      style: "toxic",
      size: 6,
    });
  }
}

function fireBossOvermindRage() {
  fireBossToxicSpiral();
  const aim = aimAtPlayer(boss.x, boss.y + boss.h / 2);
  fireEnemyBullet(boss.x, boss.y + boss.h / 2, aim.dx * 300, aim.dy * 300, { style: "toxic", size: 8 });
  if (enemies.filter((e) => e.bossMinion).length < 3) spawnBossMinion();
}

function updateBossMovement(dt) {
  bossDodgeThreat(dt);
  const enraged = bossHpRatio() < 0.35;
  const chase = (player.x - boss.x) * (enraged ? 2.8 : 1.8);
  let maxSpeed = boss.speed * 0.85;

  if (boss.id === "glacier") {
    boss.vx += Math.sin(time * 1.3) * 420 * dt;
    boss.homeY = 125 + Math.sin(time * 1.1) * 16;
    maxSpeed = boss.speed * 0.7;
  } else if (boss.id === "void") {
    if (boss.mode === "voidPortals") {
      boss.vx += Math.sin(time * 3.2) * 560 * dt;
      boss.homeY = 120 + Math.sin(time * 2.4) * 24;
    } else {
      boss.vx += chase * 0.55 * dt;
      boss.homeY = 125 + Math.sin(time * 1.8) * 18;
    }
    maxSpeed = boss.speed * 1.05;
  } else if (boss.id === "cinder") {
    if (boss.mode === "chargeDive") {
      boss.vx += chase * 1.6 * dt;
      boss.diveTimer -= dt;
      boss.homeY = boss.diveTimer > 0.25 ? H * 0.48 : 128;
      maxSpeed = boss.speed * 1.25;
    } else if (boss.mode === "fireRain") {
      boss.vx += Math.sin(time * 2.0) * 380 * dt;
      boss.homeY = 115;
    } else {
      boss.vx += chase * dt;
      boss.homeY = 125 + Math.sin(time * 1.7) * 16;
    }
  } else if (boss.id === "aqua") {
    boss.vx += Math.sin(time * 2.2) * 520 * dt + chase * 0.35 * dt;
    boss.homeY = 122 + Math.sin(time * 2.8) * 22;
    maxSpeed = boss.speed * 1.1;
  } else if (boss.id === "overmind") {
    if (boss.mode === "overmindRage") {
      boss.vx += chase * 1.2 * dt;
      boss.homeY = 120 + Math.sin(time * 2.5) * 20;
      maxSpeed = boss.speed * 1.2;
    } else {
      boss.vx += chase * 0.7 * dt;
      boss.homeY = 128 + Math.sin(time * 1.4) * 12;
    }
  } else if (boss.id === "forge") {
    if (boss.mode === "chargeDive") {
      boss.vx += chase * 1.5 * dt;
      boss.diveTimer -= dt;
      boss.homeY = boss.diveTimer > 0.25 ? H * 0.46 : 120;
      maxSpeed = boss.speed * 1.2;
    } else {
      boss.vx += Math.sin(time * 1.9) * 400 * dt + chase * 0.45 * dt;
      boss.homeY = 122 + Math.sin(time * 1.5) * 14;
    }
  } else if (boss.id === "cascade") {
    if (boss.mode === "voidPortals") {
      boss.vx += Math.sin(time * 3.4) * 600 * dt;
      boss.homeY = 118 + Math.sin(time * 2.6) * 26;
    } else {
      boss.vx += chase * 0.8 * dt + Math.sin(time * 2.1) * 280 * dt;
      boss.homeY = 124 + Math.sin(time * 2.0) * 18;
    }
    maxSpeed = boss.speed * 1.08;
  } else if (boss.id === "omega") {
    boss.vx += chase * 0.9 * dt + Math.sin(time * 1.7) * 320 * dt;
    boss.homeY = 120 + Math.sin(time * 2.2) * 20;
    maxSpeed = boss.speed * 1.1;
  } else if (boss.id === "mirage") {
    if (boss.mode === "chargeDive") {
      boss.vx += chase * 1.55 * dt;
      boss.diveTimer -= dt;
      boss.homeY = boss.diveTimer > 0.25 ? H * 0.47 : 118;
      maxSpeed = boss.speed * 1.22;
    } else {
      boss.vx += Math.sin(time * 2.4) * 480 * dt + chase * 0.5 * dt;
      boss.homeY = 120 + Math.sin(time * 1.9) * 18;
    }
  } else if (boss.id === "horizon") {
    boss.vx += chase * 1.0 * dt + Math.sin(time * 2.0) * 360 * dt;
    boss.homeY = 118 + Math.sin(time * 2.5) * 22;
    maxSpeed = boss.speed * 1.15;
  } else {
    boss.vx += chase * dt;
    boss.homeY = 126 + Math.sin(time * 1.6) * 16;
  }

  boss.vx *= 0.92;
  boss.vx = Math.max(-maxSpeed, Math.min(maxSpeed, boss.vx));
  boss.x += boss.vx * dt;
  boss.x = Math.max(120, Math.min(W - 120, boss.x));
  boss.y += (boss.homeY - boss.y) * Math.min(1, dt * 3.5);
}

function fireBossAttack() {
  const enraged = bossHpRatio() < 0.35;
  const cd = boss.baseCooldown * (enraged ? 0.78 : 1);

  switch (boss.mode) {
    case "frostLance":
      fireBossIceLance();
      boss.cooldown = cd;
      break;
    case "iceFan":
      fireBossIceFan();
      boss.cooldown = cd + 0.1;
      break;
    case "frostRing":
      fireBossFrostRing();
      boss.cooldown = cd + 0.35;
      break;
    case "weaveSpiral":
      fireBossWeaveSpiral();
      boss.cooldown = cd * 0.85;
      break;
    case "voidPortals":
      fireBossVoidPortals();
      boss.cooldown = cd + 0.15;
      break;
    case "riftCluster":
      fireBossRiftCluster();
      boss.cooldown = cd + 0.45;
      break;
    case "fireRain":
      fireBossFireRain();
      boss.cooldown = cd * 0.9;
      break;
    case "chargeDive":
      fireBossChargeSpray();
      boss.cooldown = cd * 0.7;
      break;
    case "emberBurst":
      fireBossEmberBurst();
      boss.cooldown = cd + 0.1;
      break;
    case "twinLance":
      fireBossTwinLance();
      boss.cooldown = cd * 0.75;
      break;
    case "waveCrest":
      fireBossWaveCrest();
      boss.cooldown = cd + 0.15;
      break;
    case "stingSeek":
      fireBossStingSeek();
      boss.cooldown = cd + 0.4;
      break;
    case "summon":
      if (enemies.filter((e) => e.bossMinion).length < 4) {
        spawnBossMinion();
        if (enraged) spawnBossMinion();
      } else {
        fireBossToxicCross();
      }
      boss.cooldown = cd + 0.5;
      break;
    case "toxicCross":
      fireBossToxicCross();
      boss.cooldown = cd + 0.2;
      break;
    case "toxicSpiral":
      fireBossToxicSpiral();
      boss.cooldown = cd * 0.95;
      break;
    case "overmindRage":
      fireBossOvermindRage();
      boss.cooldown = cd * 0.85;
      break;
    default:
      fireBossTwinLance();
      boss.cooldown = cd;
  }
}

function updateBossAi(dt) {
  if (!boss.phase2 && bossHpRatio() < 0.5) {
    boss.phase2 = true;
    boss.phase2Announced = true;
    addHitStop(0.09);
    screenFlash = Math.max(screenFlash, 0.08);
    duckMusic(0.7);
    boss.specialFlash = 0.8;
    boss.modeTimer = 0.2;
    addShake(8, 0.3);
    sfx("warn");
    showToast("BOSS PHASE 2");
    // phase-2 exclusive burst
    if (boss.id === "glacier") fireBossFrostRing();
    else if (boss.id === "void") fireBossVoidPortals();
    else if (boss.id === "cinder") fireBossFireRain();
    else if (boss.id === "aqua") fireBossStingSeek();
    else if (boss.id === "forge") fireBossEmberBurst();
    else if (boss.id === "cascade") fireBossRiftCluster();
    else if (boss.id === "omega") fireBossOvermindRage();
    else if (boss.id === "mirage") fireBossFireRain();
    else if (boss.id === "horizon") fireBossOvermindRage();
    else fireBossOvermindRage();
  }

  boss.modeTimer -= dt;
  if (boss.modeTimer <= 0) {
    boss.mode = pickBossMode();
    boss.modeTimer =
      boss.mode === "chargeDive"
        ? 1.6
        : boss.mode === "overmindRage"
          ? 2.4
          : boss.mode === "summon"
            ? 2.0
            : 2.6 + Math.random() * 0.8;
    if (boss.phase2) boss.modeTimer *= 0.85;
    if (boss.mode === "chargeDive") boss.diveTimer = 0.95;
    boss.specialFlash = 0.35;
  }

  updateBossMovement(dt);
  boss.specialFlash = Math.max(0, boss.specialFlash - dt);

  boss.cooldown -= dt;
  if (boss.cooldown > 0) return;
  fireBossAttack();
  if (boss.phase2 && boss.cooldown <= 0.05 && Math.random() < 0.2) {
    if (boss.id === "glacier") fireBossIceLance();
    else if (boss.id === "aqua") fireBossTwinLance();
    else if (boss.id === "cinder") fireBossChargeSpray();
  }
}

function onBossDefeated() {
  pushRecEvent("bossDown", { level, score, id: boss?.id, mini: !!boss?.mini });
  const wasMini = challengeMode || !!boss?.mini;
  score += Math.floor((wasMini ? 500 + wave * 90 : 800 + level * 200) * (upgrades.scoreBoost ? 1.15 : 1));
  burst(boss.x, boss.y, [...boss.colors, "#ffffff"], 50, 280);
  sfx("explode");
  addShake(wasMini ? 9 : 12, wasMini ? 0.35 : 0.45);
  addHitStop(0.1);
  if (bossHitless) unlockAchievement("noHitBoss");
  boss = null;
  enemies = enemies.filter((e) => !e.bossMinion);
  bullets = bullets.filter((bb) => bb.fromPlayer);
  if (challengeMode) {
    // small recovery between corridor segments
    if (Math.random() < 0.55) spawnPickup(W * 0.5, H * 0.35);
    continueChallengeAfterBoss();
    return;
  }
  unlockShipForLevel(level);
  if (level > (save.maxClearedLevel || 0)) {
    save.maxClearedLevel = level;
    if (save.selectedStartLevel < Math.min(TOTAL_LEVELS, level + 1)) {
      save.selectedStartLevel = Math.min(TOTAL_LEVELS, level + 1);
    }
    persistSave();
  }
  if (level === 1) unlockAchievement("clear1");
  if (levelPickups === 0) unlockAchievement("noPickup");
  if (level >= TOTAL_LEVELS) {
    phase = "won";
    updateHud();
    endGame(true);
    return;
  }
  openShop();
}

function burst(x, y, colors, count = 12, speed = 160) {
  const room = Math.max(0, 120 - particles.length);
  const n = Math.min(count, room, 18);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * speed;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.25 + Math.random() * 0.35,
      max: 0.7,
      size: 1.5 + Math.random() * 2.5,
      color: colors[i % colors.length],
      glow: i < 4,
    });
  }
}

function spark(x, y, color) {
  particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 40,
    vy: -40 - Math.random() * 60,
    life: 0.2 + Math.random() * 0.2,
    max: 0.4,
    size: 1 + Math.random() * 2,
    color,
    glow: false,
  });
}

function rectsOverlap(a, b) {
  return (
    a.x - a.w / 2 < b.x + b.w / 2 &&
    a.x + a.w / 2 > b.x - b.w / 2 &&
    a.y - a.h / 2 < b.y + b.h / 2 &&
    a.y + a.h / 2 > b.y - b.h / 2
  );
}

function hurtPlayer() {
  if (player.invuln > 0) return;
  combo = 0;
  comboTimer = 0;
  if (phase === "boss" || phase === "bossIntro") bossHitless = false;
  waveTookDamage = true;
  perfectStreak = 0;
  runStats.damageTaken += 1;
  sfx("hurt");
  screenFlash = 0.12;
  addShake(10, 0.3);
  addHitStop(0.08);
  if (player.shield) {
    player.shield = false;
    player.invuln = 0.8;
    burst(player.x, player.y, ["#ffd166", "#ffffff", "#ffe8a3"], 20, 180);
    updateHud();
    return;
  }
  if (player.armor > 0) {
    player.armor -= 1;
    player.invuln = 0.9;
    burst(player.x, player.y, ["#9af0ff", "#ffffff", "#3de0ff"], 18, 160);
    updateHud();
    return;
  }
  lives -= 1;
  updateHud();
  burst(player.x, player.y, ["#ffd166", "#3de0ff", "#ffffff", "#ff4d6d"], 28, 220);
  if (lives <= 0) {
    endGame(false);
    return;
  }
  resetPlayer(true);
  updateHud();
}

function fireEnemyBullet(x, y, vx, vy, opts = {}) {
  const size = opts.size || 7;
  bullets.push({
    x,
    y,
    w: size,
    h: opts.cluster ? size : Math.max(10, size + 3),
    vx,
    vy,
    speed: 0,
    fromPlayer: false,
    life: 0,
    enemy: true,
    cluster: !!opts.cluster,
    fuse: opts.fuse || 0,
    style: opts.style || "normal",
    breakable: !!opts.breakable,
    homing: !!opts.homing,
    turnRate: opts.turnRate || 0,
    waveAmp: opts.waveAmp || 0,
    waveFreq: opts.waveFreq || 0,
    wavePhase: opts.wavePhase || 0,
    slowHit: !!opts.slowHit,
  });
}

function firePlayerBullet(x, y, vx, vy, opts = {}) {
  const size = opts.size || 5;
  bullets.push({
    x,
    y,
    w: size,
    h: opts.cluster ? size : Math.max(12, size + 4),
    vx,
    vy,
    speed: 0,
    fromPlayer: true,
    life: 0,
    cluster: !!opts.cluster,
    fuse: opts.fuse || 0,
    style: opts.style || "normal",
  });
}

function splitClusterBullet(b) {
  if (b.fromPlayer) {
    burst(b.x, b.y, ["#3de0ff", "#7cf0ff", "#ffffff", "#9af0ff"], 16, 160);
    for (let i = 0; i < 5; i++) {
      const vx = (i - 2) * 55;
      firePlayerBullet(b.x, b.y, vx, -280 - Math.abs(i - 2) * 15, { size: 5, style: "allyShard" });
    }
    return;
  }
  if (b.style === "mortar") {
    burst(b.x, b.y, ["#ff8a3d", "#ffe566", "#ffffff", "#ff4d6d"], 18, 180);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      fireEnemyBullet(b.x, b.y, Math.cos(a) * 200, Math.sin(a) * 200, { size: 5, style: "ember" });
    }
    return;
  }
  burst(b.x, b.y, ["#b388ff", "#7c4dff", "#ffffff", "#d4b3ff"], 16, 160);
  for (let i = 0; i < 5; i++) {
    const vx = (i - 2) * 70;
    fireEnemyBullet(b.x, b.y, vx, 240 + Math.abs(i - 2) * 10, { size: 5, style: "shard" });
  }
}

function fireClusterTorpedo() {
  firePlayerBullet(player.x, player.y - player.h / 2, 0, -200, {
    cluster: true,
    fuse: 0.55,
    size: 14,
    style: "allyCluster",
  });
  spark(player.x, player.y - 12, "#7cf0ff");
  clusterTorpedoCd = clusterCooldown();
}

function createDrones() {
  const list = [
    { x: player.x - 40, y: player.y - 18, side: -1, cooldown: 0.3, specialCd: 1.5 },
    { x: player.x + 40, y: player.y - 18, side: 1, cooldown: 0.6, specialCd: 1.5 },
  ];
  if (stackRank("drone") >= 3) {
    list.push({ x: player.x, y: player.y - 36, side: 0, cooldown: 0.45, specialCd: 1.2 });
  }
  return list;
}

function nearestEnemyOrBoss(fromX, fromY) {
  let best = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - fromX, e.y - fromY);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  if (boss && !boss.entrant) {
    const d = Math.hypot(boss.x - fromX, boss.y - fromY);
    if (d < bestDist) best = boss;
  }
  return best;
}

function fireDroneNova(d) {
  d.specialCd = droneSpecialCd();
  const bolts = stackRank("drone") >= 3 ? 8 : 6;
  burst(d.x, d.y, ["#7ff0e0", "#3de0ff", "#ffffff"], 10, 120);
  for (let i = 0; i < bolts; i++) {
    const a = (i / bolts) * Math.PI * 2 + time;
    firePlayerBullet(d.x, d.y, Math.cos(a) * 300, Math.sin(a) * 300, {
      size: 5,
      style: "droneNova",
    });
  }
}

function firePlayerShot() {
  const y = player.y - player.h / 2;
  const triple = upgrades.triple || (upgrades.twin && player.doubleShot > 0);
  const twin = !triple && (upgrades.twin || player.doubleShot > 0);
  let bulletSpeed = -560 * bulletSpeedMul();
  // Aegis/Tide/Apex: big focus bolts (still respect twin / triple upgrades)
  const focused =
    selectedShip().id === "aegis" || selectedShip().id === "tide" || selectedShip().id === "apex";
  if (focused) bulletSpeed *= 1.35;
  const focusOpts = focused
    ? { size: triple ? 6 : twin ? 7 : 8, style: "focus" }
    : {};

  if (triple) {
    firePlayerBullet(player.x - 12, y, -30, bulletSpeed, focusOpts);
    firePlayerBullet(player.x, y, 0, bulletSpeed, focusOpts);
    firePlayerBullet(player.x + 12, y, 30, bulletSpeed, focusOpts);
    spark(player.x - 12, player.y - 8, focused ? "#ffffff" : "#9af0ff");
    spark(player.x, player.y - 10, focused ? "#c8f8ff" : "#c8f8ff");
    spark(player.x + 12, player.y - 8, focused ? "#ffffff" : "#9af0ff");
  } else if (twin) {
    firePlayerBullet(player.x - 10, y, 0, bulletSpeed, focusOpts);
    firePlayerBullet(player.x + 10, y, 0, bulletSpeed, focusOpts);
    spark(player.x - 10, player.y - 8, focused ? "#ffffff" : "#9af0ff");
    spark(player.x + 10, player.y - 8, focused ? "#ffffff" : "#9af0ff");
  } else if (focused) {
    firePlayerBullet(player.x, y, 0, bulletSpeed, { size: 8, style: "focus" });
    spark(player.x, player.y - 10, "#ffffff");
  } else {
    firePlayerBullet(player.x, y, 0, bulletSpeed);
    spark(player.x - 8, player.y - 8, "#9af0ff");
    spark(player.x + 8, player.y - 8, "#9af0ff");
  }

  const mul = (player.fireMul || 1) * (focused ? 1.15 : 1);
  player.cooldown = (player.rapidFire > 0 ? (focused ? 0.11 : 0.09) : focused ? 0.2 : 0.16) * mul;
  sfx("shoot");
}

function destroyEnemy(index) {
  const e = enemies[index];
  combo += 1;
  comboTimer = COMBO_WINDOW;
  if (combo > maxCombo) maxCombo = combo;
  if (combo === 1) unlockAchievement("firstBlood");
  if (combo >= 20) unlockAchievement("combo20");
  if (e.elite) {
    eliteKillsRun += 1;
    runStats.elites += 1;
    if (eliteKillsRun >= 10) unlockAchievement("eliteHunter");
    sfx("elite");
    addHitStop(0.07);
    addShake(6, 0.2);
    screenFlash = Math.max(screenFlash, 0.06);
    spawnPickup(e.x, e.y);
  }
  const mult = Math.min(3, 1 + combo * 0.1) * (upgrades.scoreBoost ? 1.15 : 1) * (e.elite ? 2 : 1);
  score += Math.floor((SCORE_BY_KIND[e.kind] || 100) * mult);
  const palette = [
    ["#ff4d6d", "#ff8fab", "#ffd166", "#ffffff"],
    ["#ffe566", "#ffd166", "#ffffff", "#fff2cc"],
    ["#b388ff", "#7c4dff", "#ffd166", "#ffffff"],
    ["#ff8a3d", "#ffd166", "#ffffff", "#ff4d6d"],
    ["#7ff0e0", "#2ec4b6", "#ffffff", "#b8fff4"],
    ["#b8ff6a", "#6adf3a", "#ffffff", "#e8ffb0"],
    ["#c89bff", "#9b6bff", "#ffffff", "#2a1048"],
    ["#70a0ff", "#3060ff", "#ffffff", "#b8d0ff"],
    ["#ff8a3d", "#ffd166", "#ffffff", "#ff4d6d"],
    ["#ff60a0", "#ff90c0", "#ffffff", "#ffd166"],
    ["#e8f0ff", "#70a0ff", "#ffffff", "#c8d0e8"],
  ];
  burst(e.x, e.y, palette[e.kind] || palette[0], 22, 200);
  sfx("explode");
  addShake(2.5, 0.08);
  if (e.carrier) {
    for (let n = 0; n < 2; n++) {
      enemies.push({
        x: e.x + (n ? 20 : -20),
        y: e.y,
        w: 22,
        h: 20,
        speed: 80,
        hp: 1 + Math.floor((level - 1) * 0.4),
        kind: 0,
        phase: Math.random() * Math.PI * 2,
        shootCooldown: 0.8,
        fireRate: 1.3,
        targetY: e.targetY + 20,
        settled: false,
        diving: false,
      });
    }
  }
  if (Math.random() < DROP_CHANCE) spawnPickup(e.x, e.y);
  enemies.splice(index, 1);
  updateHud();
}


// --- update loop ---
function update(dt) {
  time += dt;
  if (shake.t > 0) shake.t = Math.max(0, shake.t - dt);
  else shake.mag = 0;

  for (let i = toasts.length - 1; i >= 0; i--) {
    toasts[i].life -= dt;
    if (toasts[i].life <= 0) toasts.splice(i, 1);
  }
  if (!toasts.length) toastEl.classList.add("hidden");

  // keep starfield alive even in shop so the game never looks hard-frozen
  for (const star of stars) {
    star.y += star.z * 85 * dt;
    star.tw += dt * (1.5 + star.z);
    if (star.y > H) {
      star.y = 0;
      star.x = Math.random() * W;
    }
  }
  updateScenery(dt);

  if (phase === "shop") {
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const t of trails) t.life -= dt;
    trails = trails.filter((t) => t.life > 0);
    return;
  }

  let mx = touchMove.x;
  let my = touchMove.y;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) mx -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) mx += 1;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) my -= 1;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) my += 1;

  player.slowMul = 1;
  if (player.slowTimer > 0) {
    player.slowTimer = Math.max(0, player.slowTimer - dt);
    player.slowMul = 0.45;
  }
  for (const h of hazards) {
    if (h.kind === "slowzone") {
      if (Math.abs(player.x - h.x) < h.w / 2 && Math.abs(player.y - h.y) < h.h / 2) {
        player.slowMul = Math.min(player.slowMul, 0.55);
      }
    } else if (h.kind === "edgeAcid") {
      const onEdge = h.side === "left" ? player.x < h.w + 24 : player.x > W - h.w - 24;
      if (onEdge) hurtPlayer();
    } else if (h.kind === "meteor") {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      if (h.y > H + 40) {
        h.y = -30;
        h.x = 40 + Math.random() * (W - 80);
      }
      if (rectsOverlap(player, h)) hurtPlayer();
    }
  }

  const moving = mx || my;
  player.thrust += ((moving ? 1 : 0.35) - player.thrust) * Math.min(1, dt * 8);
  const spd = player.speed * player.slowMul;
  if (moving) {
    const len = Math.hypot(mx, my) || 1;
    player.x += (mx / len) * spd * dt;
    player.y += (my / len) * spd * dt;
  }
  player.x = Math.max(24, Math.min(W - 24, player.x));
  player.y = Math.max(40, Math.min(H - 30, player.y));
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  specialCd = Math.max(0, specialCd - dt);
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      combo = 0;
      updateHud();
    }
  }
  const hadDouble = player.doubleShot > 0;
  const hadRapid = player.rapidFire > 0;
  player.doubleShot = Math.max(0, player.doubleShot - dt);
  player.rapidFire = Math.max(0, player.rapidFire - dt);
  if ((hadDouble && player.doubleShot <= 0) || (hadRapid && player.rapidFire <= 0)) updateHud();

  if (particles.length < 100 && Math.random() < 0.22 * player.thrust) {
    const side = (Math.random() - 0.5) * 10;
    particles.push({
      x: player.x + side,
      y: player.y + player.h / 2 - 2,
      vx: side * 2,
      vy: 80 + Math.random() * 100 * player.thrust,
      life: 0.12 + Math.random() * 0.12,
      max: 0.3,
      size: 1.5 + Math.random() * 2 * player.thrust,
      color: Math.random() > 0.4 ? "#3de0ff" : "#7cf0ff",
      glow: false,
    });
  }

  runStats.time += dt;
  if (nearMissCd > 0) nearMissCd -= dt;
  if (screenFlash > 0) screenFlash = Math.max(0, screenFlash - dt);
  tickDuck();

  const canShoot =
    phase === "fleet" ||
    phase === "waveBreak" ||
    phase === "warning" ||
    phase === "bossIntro" ||
    phase === "boss";
  const firing = keys.has(" ") || keys.has("Space") || touchFiring;
  if (firing && canShoot) focusHold += dt;
  else focusHold = Math.max(0, focusHold - dt * 2);

  if (canShoot && firing && player.cooldown <= 0) {
    firePlayerShot();
  }
  if ((keys.has("q") || keys.has("Q") || touchSpecialHeld) && shipHasSpecial()) {
    if (specialCd <= 0) fireSpecial();
    touchSpecialHeld = false;
  }

  if (upgrades.cluster && phase !== "levelClear" && phase !== "levelIntro" && phase !== "shop") {
    clusterTorpedoCd -= dt;
    if (clusterTorpedoCd <= 0) fireClusterTorpedo();
  }

  if (upgrades.drone) {
    if (!drones.length) drones = createDrones();
    for (const d of drones) {
      const tx = player.x + d.side * 38;
      const ty = player.y - (d.side === 0 ? 40 : 26) + Math.sin(time * 3 + d.side) * 6;
      d.x += (tx - d.x) * Math.min(1, dt * 6);
      d.y += (ty - d.y) * Math.min(1, dt * 6);
      d.cooldown -= dt;
      d.specialCd -= dt;

      if (d.specialCd <= 0) fireDroneNova(d);

      if (d.cooldown <= 0) {
        const target = nearestEnemyOrBoss(d.x, d.y);
        if (target) {
          const dx = target.x - d.x;
          const dy = target.y - d.y;
          const len = Math.hypot(dx, dy) || 1;
          firePlayerBullet(d.x, d.y, (dx / len) * 420, (dy / len) * 420, {
            size: 4,
            style: "drone",
          });
        } else {
          firePlayerBullet(d.x, d.y, 0, -420, { size: 4, style: "drone" });
        }
        d.cooldown = droneFireCd();
      }
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if (b.cluster) {
      b.fuse -= dt;
      if (b.fuse <= 0) {
        bullets.splice(i, 1);
        splitClusterBullet(b);
        continue;
      }
    }
    if (b.homing && b.vx != null) {
      const desired = Math.atan2(player.y - b.y, player.x - b.x);
      const cur = Math.atan2(b.vy, b.vx);
      let diff = desired - cur;
      if (Number.isFinite(diff)) {
        if (diff > Math.PI) diff -= Math.PI * 2;
        else if (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.max(-b.turnRate * dt, Math.min(b.turnRate * dt, diff));
        const ang = cur + turn;
        const spd = Math.hypot(b.vx, b.vy) || 150;
        b.vx = Math.cos(ang) * spd;
        b.vy = Math.sin(ang) * spd;
      }
    }
    if (b.vx != null) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.waveAmp) {
        b.x += Math.sin(b.life * b.waveFreq + b.wavePhase) * b.waveAmp * dt;
      }
    } else {
      b.y += (b.fromPlayer ? -1 : 1) * b.speed * dt;
    }
    b.life += dt;
    if (trails.length < 80 && Math.floor(b.life * 25) % 2 === 0) {
    if (b.fromPlayer) {
        const trailColor =
          b.style === "allyCluster" || b.style === "allyShard"
            ? "#7cf0ff"
            : b.style === "drone" || b.style === "droneNova" || b.style === "focus"
              ? "#b8fff4"
              : combo >= 10
                ? "#ffe566"
                : "#3de0ff";
        const life = combo >= 10 ? 0.12 : 0.07;
        trails.push({
          x: Math.round(b.x / 3) * 3,
          y: Math.round((b.y + 4) / 3) * 3,
          life,
          max: life,
          size: combo >= 10 ? 3 : 2,
          color: trailColor,
        });
      } else if (b.style === "aimed" || b.style === "sniper" || b.style === "sting" || b.style === "ember") {
      trails.push({
        x: b.x,
          y: b.y,
          life: 0.08,
          max: 0.08,
          size: 2,
          color: b.style === "ember" ? "#ff8a3d" : "#ffd166",
      });
    }
  }
  }
  trimFx();
  bullets = bullets.filter((b) => b.y > -30 && b.y < H + 30 && b.x > -30 && b.x < W + 30);

  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const suck = len < 90 ? 1 + (1 - len / 90) * 2.4 : 1;
    p.suck = suck;
    const pull = p.speed * magnetPullMul() * suck;
    p.x += (dx / len) * pull * dt;
    p.y += (dy / len) * pull * dt;
    p.spin += dt * (4 + suck);
    if (len < 18 || rectsOverlap(player, p)) {
      applyPickup(p.type);
      pickups.splice(i, 1);
    }
  }

  if (phase === "fleet") {
    const cfg = currentWaveConfig();
    spawnTimer -= dt;
    waveEventTimer -= dt;
    if (waveEventTimer <= 0 && enemies.length >= 3) {
      triggerWaveEvent();
      waveEventTimer = 7 + Math.random() * 4;
    }
    if (enemiesLeft > 0 && spawnTimer <= 0) {
      spawnEnemy();
      enemiesLeft -= 1;
      spawnTimer = cfg.interval;
    }
    if (enemiesLeft <= 0 && enemies.length === 0) {
      if (challengeMode) {
        advanceChallengeFleetClear();
      } else if (!waveTookDamage) {
        perfectStreak += 1;
        const bonus = 150 + wave * 40;
        score += bonus;
        credits += 25;
        showToast(`PERFECT WAVE +${bonus}`);
        sfx("clear");
        if (wave < WAVES_PER_LEVEL) {
          phase = "waveBreak";
          waveBreakTotal = WAVE_BREAK_DUR;
          waveBreakTimer = WAVE_BREAK_DUR;
          updateHud();
        } else {
          phase = "warning";
          warningTotal = WARNING_DUR;
          warningTimer = WARNING_DUR;
          updateHud();
        }
      } else {
        perfectStreak = 0;
        if (wave < WAVES_PER_LEVEL) {
          phase = "waveBreak";
          waveBreakTotal = WAVE_BREAK_DUR;
          waveBreakTimer = WAVE_BREAK_DUR;
          updateHud();
        } else {
          phase = "warning";
          warningTotal = WARNING_DUR;
          warningTimer = WARNING_DUR;
          updateHud();
        }
      }
    }
  }

  if (phase === "waveBreak") {
    waveBreakTimer -= dt;
    if (waveBreakTimer <= 0) beginWave(wave + 1);
  }

  if (phase === "warning") {
    warningTimer -= dt;
    if (warningTimer <= 0) spawnBoss();
  }

  if (phase === "bossIntro") {
    bossIntroTimer -= dt;
    // Don't keys.delete Space/Enter — that interrupted held fire in Daily mini-bosses
    if (bossIntroTimer <= 0 || keys.has(" ") || keys.has("Space") || keys.has("Enter")) {
      phase = "boss";
      updateHud();
    }
  }

  if (phase === "levelClear") {
    levelClearTimer -= dt;
    if (levelClearTimer <= 0) beginLevel(level + 1);
  }

  if (phase === "levelIntro") {
    levelIntroTimer -= dt;
    if (levelIntroTimer <= 0) beginWave(1);
  }

  for (const e of enemies) {
    if (e.kind === 3 && e.diving) {
      const dx = player.x - e.x;
      e.x += Math.sign(dx) * Math.min(Math.abs(dx), e.speed * 1.4 * dt);
      e.y += e.speed * 1.8 * dt;
    } else if (!e.settled) {
      e.y += e.speed * 1.6 * dt;
      if (e.y >= e.targetY) {
        e.y = e.targetY;
        e.settled = true;
        if (e.kind === 3) e.diving = true;
      }
    } else {
      e.y = e.targetY + Math.sin(time * 1.8 + e.phase) * 6;
      if (e.kind === 0) e.x += Math.sin(time * 1.2 + e.phase) * e.speed * 0.55 * dt;
      else if (e.kind === 1) e.x += Math.sin(time * 0.9 + e.phase) * e.speed * 0.4 * dt;
      else if (e.kind === 2) e.x += Math.sin(time * 1.5 + e.phase) * e.speed * 0.7 * dt;
      else if (e.kind === 4) {
        const dx = player.x - e.x;
        e.x += Math.sign(dx) * Math.min(Math.abs(dx), e.speed * 0.55 * dt);
      } else if (e.kind === 5) e.x += Math.sin(time * 1.1 + e.phase) * e.speed * 0.5 * dt;
      else if (e.kind === 6) {
        e.blinkCd -= dt;
        e.cloaked = e.blinkCd < 0.35;
        if (e.blinkCd <= 0) {
          e.x = Math.max(40, Math.min(W - 40, e.x + (Math.random() < 0.5 ? -90 : 90)));
          e.blinkCd = 2.2 + Math.random() * 1.2;
          e.cloaked = false;
          burst(e.x, e.y, ["#9b6bff", "#ffffff", "#d4b3ff"], 10, 90);
        } else {
          e.x += Math.sin(time * 2.4 + e.phase) * e.speed * 0.8 * dt;
        }
      } else if (e.kind === 7) e.x += Math.sin(time * 0.8 + e.phase) * e.speed * 0.35 * dt;
      else if (e.kind === 8) e.x += Math.sin(time * 0.7 + e.phase) * e.speed * 0.3 * dt;
      else if (e.kind === 9) {
        const dx = player.x - e.x;
        e.x += Math.sign(dx) * Math.min(Math.abs(dx), e.speed * 0.45 * dt);
      } else if (e.kind === 10) e.x += Math.sin(time * 1.6 + e.phase) * e.speed * 0.65 * dt;

      if (e.kind !== 3) {
        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0) {
          enemyShootAtPlayer(e);
          e.shootCooldown = e.fireRate;
        }
      }
    }
    e.x = Math.max(24, Math.min(W - 24, e.x));

    if (particles.length < 100 && e.diving && Math.random() < 0.12) {
      const trailColors = [
        "#ff4d6d",
        "#ffd166",
        "#b388ff",
        "#ff8a3d",
        "#7ff0e0",
        "#b8ff6a",
        "#c89bff",
        "#70a0ff",
        "#ff9a4a",
        "#ff60a0",
        "#e8f0ff",
      ];
      particles.push({
        x: e.x + (Math.random() - 0.5) * 8,
        y: e.y - e.h / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: -50 - Math.random() * 30,
        life: 0.1 + Math.random() * 0.08,
        max: 0.2,
        size: 1.2 + Math.random(),
        color: trailColors[e.kind] || "#ff4d6d",
        glow: false,
      });
    }
  }

  // Player shots can destroy breakable red projectiles
  for (let i = bullets.length - 1; i >= 0; i--) {
    const enemyShot = bullets[i];
    if (enemyShot.fromPlayer || !enemyShot.breakable) continue;
    let shattered = false;
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (i === j) continue;
      const playerShot = bullets[j];
      if (!playerShot.fromPlayer) continue;
      if (rectsOverlap(enemyShot, playerShot)) {
        bullets.splice(Math.max(i, j), 1);
        bullets.splice(Math.min(i, j), 1);
        burst(enemyShot.x, enemyShot.y, ["#ff8fab", "#ffffff", "#3de0ff"], 10, 120);
        shattered = true;
        break;
      }
    }
    if (shattered) continue;
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.kind === 3 && e.y > H + 40) {
      enemies.splice(i, 1);
      continue;
    }
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (!b.fromPlayer) continue;
      if (rectsOverlap(e, b)) {
        bullets.splice(j, 1);
        e.hp -= 1;
        burst(b.x, b.y, ["#3de0ff", "#ffffff", "#7cf0ff"], 8, 100);
        if (e.hp <= 0) destroyEnemy(i);
        break;
      }
    }
  }

  if (boss) {
    boss.flash = Math.max(0, boss.flash - dt);
    if (boss.entrant) {
      boss.y += 70 * dt;
      if (boss.y >= boss.targetY) {
        boss.y = boss.targetY;
        boss.homeY = boss.targetY;
        boss.entrant = false;
        boss.mode = boss.modes[0];
        boss.modeTimer = 2.6;
      }
    } else {
      updateBossAi(dt);
    }

    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (!b.fromPlayer) continue;
      if (rectsOverlap(boss, b)) {
        bullets.splice(j, 1);
        boss.hp -= 1;
        boss.flash = 0.08;
        sfx("hit");
        addShake(2, 0.06);
        burst(b.x, b.y, ["#ffd166", "#ffffff", "#ff8a3d"], 10, 120);
        if (boss.hp <= 0) {
          onBossDefeated();
          if (!running) return;
          break;
        }
        updateHud();
      }
    }

    if (boss && !boss.entrant && rectsOverlap(player, boss)) {
      hurtPlayer();
      if (!running) return;
    }
  }

  for (let j = bullets.length - 1; j >= 0; j--) {
    const b = bullets[j];
    if (b.fromPlayer) continue;
    if (player && nearMissCd <= 0 && !rectsOverlap(player, b)) {
      const d = Math.hypot(b.x - player.x, b.y - player.y);
      if (d > 16 && d < 30) {
        nearMissCd = 0.12;
        nearMissRun += 1;
        runStats.nearMisses += 1;
        score += 15;
        spark(player.x, player.y, "#ffe566");
        sfx("near");
        if (nearMissRun >= 50) unlockAchievement("nearMiss50");
      }
    }
    if (rectsOverlap(player, b)) {
      if (b.slowHit) player.slowTimer = Math.max(player.slowTimer || 0, 2.4);
      bullets.splice(j, 1);
      hurtPlayer();
      if (!running) return;
    }
  }

  if (player.invuln <= 0) {
    const hitEnemies = enemies.filter((e) => rectsOverlap(player, e));
    if (hitEnemies.length) {
      enemies = enemies.filter((e) => !hitEnemies.includes(e));
      hurtPlayer();
      if (!running) return;
    }
  }

  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 20 * dt;
    p.life -= dt;
  }
  particles = particles.filter((p) => p.life > 0);
  for (const t of trails) t.life -= dt;
  trails = trails.filter((t) => t.life > 0);
}

// Galaga-inspired pixel sprites (rows of palette chars)
const PIX = {
  ".": null,
  W: "#f4f6ff",
  A: "#c8d0e8",
  R: "#e01828",
  r: "#ff6060",
  O: "#ff7a20",
  o: "#ffb040",
  Y: "#ffe020",
  y: "#fff080",
  B: "#3060ff",
  b: "#70a0ff",
  C: "#40e8ff",
  P: "#a040ff",
  p: "#d080ff",
  G: "#28d028",
  g: "#80ff60",
  M: "#ff50a0",
  m: "#ff90c0",
  K: "#101018",
  N: "#303848",
  T: "#20c8b0",
  t: "#80ffe8",
};

// Unique player hulls (15 columns) — one silhouette + palette per ship
const SPRITE_SHIP_ICE = [
  "......C.C......",
  ".....CWCWC.....",
  "....CWWWWWC....",
  "...CWWWbWWWC...",
  "..CWWWbbbWWWC..",
  ".CWWWWWbWWWWWC.",
  "CWWWCWWWWWCWWWC",
  "CWWC.WWWWW.CWWC",
  "CWC..CWWWC..CWC",
  "CC....CCC....CC",
  "C.....C.C.....C",
  "......b.b......",
  "......B.B......",
];
const SPRITE_SHIP_RIFT = [
  ".......P.......",
  "......PpP......",
  ".....PpWpP.....",
  "....PpWWWpP....",
  "...PpWWpWWpP...",
  "..PpWWWWWWWpP..",
  ".PpWWPWWWPWWpP.",
  "PpWP.WWWWW.PWpP",
  "PpP..PWWWP..PpP",
  "PP....PPP....PP",
  "P......P......P",
  "......p.p......",
  "......P.P......",
];
const SPRITE_SHIP_EMBER = [
  "......Y.Y......",
  ".....YoYoY.....",
  "....YoRRRoY....",
  "...YoRYYYRoY...",
  "..YoRYYYYYoY...",
  ".YoRYYOOYYRoY..",
  "YoRYYOOOOYYRoY.",
  "YoRY.OOOO.YRoY.",
  "YoY..YoOY..YoY.",
  "YY....YY....YY.",
  "Y.....Y.Y.....Y",
  "......O.O......",
  "......R.R......",
];
const SPRITE_SHIP_TIDE = [
  ".......T.......",
  "......TtT......",
  ".....TtCtT.....",
  "....TtCCCtT....",
  "...TtCWWWCTt...",
  "..TtCWWWWWCTt..",
  ".TtTCWTTTWCTtT.",
  "TtTC.WWWWW.CTtT",
  "TtT..TWWWT..TtT",
  "TT....TTT....TT",
  "T......T......T",
  "......t.t......",
  "......C.C......",
];
const SPRITE_SHIP_OVERMIND = [
  "......G.G......",
  ".....GgGgG.....",
  "....GgWKWGg....",
  "...GgWgWgWgG...",
  "..GgWgWgWgWgG..",
  ".GgGWgWgWgWGgG.",
  "GgGGWgWgWgWGGGg",
  "GgGG.WWWWW.GGGg",
  "GgG..GgGgG..GgG",
  "GG....GGG....GG",
  "G.....G.G.....G",
  "......g.g......",
  "......G.G......",
];
const SPRITE_SHIP_NOVA = [
  "......W.W......",
  ".....WbYbW.....",
  "....WbYYYWb....",
  "...WbYCCCYWb...",
  "..WbYCCCCCYWb..",
  ".WbYYCWWCYYWb..",
  "WbYYYCWWCYYYWb.",
  "WbYY.WWWWW.YYWb",
  "WbW..WbYbW..WbW",
  "WW....WWW....WW",
  "W.....W.W.....W",
  "......Y.Y......",
  "......C.C......",
];
const SPRITE_SHIP_APEX = [
  "......A.A......",
  ".....AbAbA.....",
  "....AbWWWbA....",
  "...AbWbCbWbA...",
  "..AbWWCCCWWAb..",
  ".AbWWWCCCWWWbA.",
  "AbWWWbCCCbWWWAb",
  "AbWW.WWWWW.WWAb",
  "AbA..AbAbA..AbA",
  "AA....AAA....AA",
  "A.....A.A.....A",
  "......b.b......",
  "......B.B......",
];
const SPRITE_SHIP_GOD = [
  "......Y.Y......",
  ".....YWYWY.....",
  "....YWMRMWY....",
  "...YWMRCRMWY...",
  "..YWMRCCCRMWY..",
  ".YWMRCWWCRMWY..",
  "YWMRCWYWYWCRMWY",
  "YWMR.WWWWW.RMWY",
  "YWY..YWYWY..YWY",
  "YY....YYY....YY",
  "Y.....Y.Y.....Y",
  "......M.M......",
  "......R.R......",
];
const SPRITE_SHIP_AEGIS = [
  "......A.A......",
  ".....AbCbA.....",
  "....AbWCWbA....",
  "...AbWCCCWAb...",
  "..AbWWCCCWWAb..",
  ".AbAWWCWCWWAbA.",
  "AbAAWWWWWWAAbAb",
  "AbAA.WWWWW.AAbA",
  "AbA..AbCbA..AbA",
  "AA....AAA....AA",
  "A.....A.A.....A",
  "......b.b......",
  "......C.C......",
];
const SPRITE_PLAYER = SPRITE_SHIP_ICE;
const SHIP_SPRITES = {
  ice: SPRITE_SHIP_ICE,
  rift: SPRITE_SHIP_RIFT,
  ember: SPRITE_SHIP_EMBER,
  tide: SPRITE_SHIP_TIDE,
  overmind: SPRITE_SHIP_OVERMIND,
  nova: SPRITE_SHIP_NOVA,
  apex: SPRITE_SHIP_APEX,
  aegis: SPRITE_SHIP_AEGIS,
  god: SPRITE_SHIP_GOD,
};
const SHIP_FLAME = {
  ice: ["#3de0ff", "#70a0ff", "#b8f0ff"],
  rift: ["#a040ff", "#d080ff", "#f4f6ff"],
  ember: ["#ff7a20", "#ff4d6d", "#ffe566"],
  tide: ["#20c8b0", "#40e8ff", "#80ffe8"],
  overmind: ["#28d028", "#80ff60", "#ffe566"],
  nova: ["#ffe020", "#40e8ff", "#ffffff"],
  apex: ["#70a0ff", "#c8d0e8", "#ffffff"],
  aegis: ["#70a0ff", "#c8d0e8", "#40e8ff"],
  god: ["#ff50a0", "#ffe020", "#ffffff"],
};

const SPRITE_RED = [
  "..O....O..",
  ".OOO..OOO.",
  "OOOOOOOOOO",
  "OoOoOoOoOo",
  ".OOOOOOOO.",
  "..OoKKoO..",
  "...OOOO...",
  "....OO....",
];

const SPRITE_YELLOW = [
  "Y........Y",
  "YY......YY",
  ".YYK..KYY.",
  "..YYYYYY..",
  ".YyYYYYYy.",
  "YYYYYYYYYY",
  ".YY.KK.YY.",
  "..Y....Y..",
];

const SPRITE_PURPLE = [
  "..P....P..",
  ".PpP..PpP.",
  "PPPPPPPPPP",
  "PpWKWKWPpP",
  ".PPPPPPPP.",
  "..PpPPpP..",
  "...PPPP...",
  "....PP....",
];

const SPRITE_PINK = [
  "...M.M....",
  "..MmmMm...",
  ".MMMMMMMM.",
  "MmWKWKWMmM",
  ".MMMMMMMM.",
  "..MmMMmM..",
  "...MMMM...",
  "....MM....",
];

const SPRITE_TEAL = [
  "...T.T....",
  "..TtTtT...",
  ".TTTTTTTT.",
  "TtWKWKWtTt",
  ".TTTTTTTT.",
  "..TtTTtT..",
  "...TTTT...",
  "....TT....",
];

const SPRITE_GREEN = [
  "..G....G..",
  ".GgG..GgG.",
  "GGGGGGGGGG",
  "GgWKWKWgGg",
  ".GGGGGGGG.",
  "..GgWWgG..",
  "...GGGG...",
  "....GG....",
];

const SPRITE_WRAITH = [
  "..P..P....",
  ".PpPPpP...",
  "PpWKWKWpP.",
  ".PpPppPpP.",
  "..Pp..pP..",
  "...P..P...",
  "....PP....",
  "..........",
];
const SPRITE_HEXER = [
  "...BBBB...",
  "..BbWWbB..",
  ".BbBCCBbB.",
  "BbWKCKWbBb",
  ".BbBCCBbB.",
  "..BbWWbB..",
  "...BBBB...",
  "....BB....",
];
const SPRITE_MORTAR = [
  "..OO..OO..",
  ".OoOooOoO.",
  "OoRYYYRoOo",
  "OoYKWKYoOo",
  ".OoYYYYoO.",
  "..OoYYoO..",
  "...OOOO...",
  "....OO....",
];
const SPRITE_LEECH = [
  "..M....M..",
  ".MmM..MmM.",
  "MmMRRRMmM.",
  "MmWKWKWmMm",
  ".MmRRRMmM.",
  "..MmWWmM..",
  "...MMMM...",
  "....MM....",
];
const SPRITE_PRISM = [
  "...W..W...",
  "..WbCCbW..",
  ".WbBWWBbW.",
  "WbWKCKWbW.",
  ".WbBWWBbW.",
  "..WbCCbW..",
  "...WWWW...",
  "....WW....",
];

const SPRITE_DRONE = [
  "...B.B...",
  "..BbCbB..",
  ".BBBCBBB.",
  "BBWRRRWBB",
  ".BBBCBBB.",
  "..BbBbB..",
  "...B.B...",
];

// Distinct silhouettes per boss (18 columns)
// Glacier: ice crystal diamond
const SPRITE_BOSS_GLACIER = [
  "........CC........",
  ".......CWWC.......",
  "......CWbWbC......",
  ".....CWBBBBWC.....",
  "....CWBCTTTCBWC...",
  "...CWBCTTTTCBWC...",
  "..CWWBCCCCCCBWWC..",
  ".CWbB........BbWC.",
  "CWC............CWC",
  ".C..............C.",
];
// Void: weaver with side tendrils
const SPRITE_BOSS_VOID = [
  "P..............P..",
  ".Pp....PPPP....pP.",
  "..Pp..PpWWpP..pP..",
  "...PPpPKKKPpPP....",
  "....PpPWWWWPpP....",
  "...PPpPWWWWPpPP...",
  "..Pp..PpWWpP..pP..",
  ".Pp....PPPP....pP.",
  "P......P..P......P",
  "......P....P......",
];
// Cinder: angular fire prow + twin thrusters
const SPRITE_BOSS_CINDER = [
  "........YY........",
  ".......YoOY.......",
  "......YoRRoY......",
  ".....YoRYYRoY.....",
  "....OoRYKKYRoO....",
  "...OoRYYOOYYRoO...",
  "..OoRR......RRoO..",
  ".OoO..OOOOOO..OoO.",
  "OO....RY..YR....OO",
  "......O....O......",
];
// Aqua: wide stingray / manta
const SPRITE_BOSS_AQUA = [
  "T................T",
  ".Tt.....tt.....Tt.",
  "..TtT.TCTTCT.TtT..",
  "...TtTCWWWWCTtT...",
  "....TtCWTTTWCtT...",
  ".....TCWttttWCT...",
  "......TW....WT....",
  ".....T.T....T.T...",
  "....T..........T..",
  "...T............T.",
];
// Overmind: organic brain with many eyes
const SPRITE_BOSS_OVERMIND = [
  "....gG....Gg......",
  "...GgGgGGgGgG.....",
  "..GgWKWKWKWKWgG...",
  ".GgWgWgWgWgWgWgG..",
  "GgGGWgWgWgWgWGGGgG",
  ".GgGWgWgWgWgWGgG..",
  "..GgGKK..KKGgG....",
  "...GgG....GgG.....",
  "....GG....GG......",
  ".....G....G.......",
];
// Forge: blocky anvil / foundry
const SPRITE_BOSS_FORGE = [
  "..YYYYYYYYYYYYYY..",
  "..YoOOOOOOOOOOoY..",
  "...YoRYYYYYYRoY...",
  "....YoRKKKKRoY....",
  ".....YoRYYRoY.....",
  "......YoRRoY......",
  ".....OoYYYYOo.....",
  "....OoO....OoO....",
  "...OO........OO...",
  "..O............O..",
];
// Cascade: X / rift fracture
const SPRITE_BOSS_CASCADE = [
  "pp..............pp",
  ".pP............Pp.",
  "..pP...PPPP...Pp..",
  "...pP.PpWWpP.Pp...",
  "....pPpWWWWPpP....",
  "....pPpWWWWPpP....",
  "...pP.PpWWpP.Pp...",
  "..pP...PPPP...Pp..",
  ".pP............Pp.",
  "pp..............pp",
];
// Omega: ring gate with bright core
const SPRITE_BOSS_OMEGA = [
  "......WWWWWW......",
  "....WWBb..bBWW....",
  "...WBb......bBW...",
  "..WBb..NCCN..bBW..",
  ".WBb..NCWWCN..bBW.",
  ".WBb..NCWWCN..bBW.",
  "..WBb..NCCN..bBW..",
  "...WBb......bBW...",
  "....WWBb..bBWW....",
  "......WWWWWW......",
];
// Mirage: jagged asymmetric ash phantom
const SPRITE_BOSS_MIRAGE = [
  "....OO............",
  "...OoMMoO...OO....",
  "..OoMRRMoO.OoO....",
  ".OoMRYWYRMoOo.....",
  "OoMRYKYYKRMoO.....",
  ".OoMRYOOYRMoOoO...",
  "..OoMR..RMoO..Oo..",
  "...OoM..MoO....O..",
  "....OO..OO........",
  ".....O............",
];
// Horizon: winged crown capital ship
const SPRITE_BOSS_HORIZON = [
  "C......WWWW......C",
  ".CC...WBbBbW...CC.",
  "..CC.WBbNNBbW.CC..",
  "...CWBbNCCNbBWC...",
  "....WBbNCWCNBbW...",
  "...CWBbNWWWNBbWC..",
  "..CC.WBb....bBW.CC",
  ".CC...WW....WW...C",
  "CC.....W....W.....",
  "C.................",
];
const BOSS_SPRITES = {
  glacier: SPRITE_BOSS_GLACIER,
  void: SPRITE_BOSS_VOID,
  cinder: SPRITE_BOSS_CINDER,
  aqua: SPRITE_BOSS_AQUA,
  overmind: SPRITE_BOSS_OVERMIND,
  forge: SPRITE_BOSS_FORGE,
  cascade: SPRITE_BOSS_CASCADE,
  omega: SPRITE_BOSS_OMEGA,
  mirage: SPRITE_BOSS_MIRAGE,
  horizon: SPRITE_BOSS_HORIZON,
};
const SPRITE_BOSS = SPRITE_BOSS_OVERMIND;


// --- draw primitives / sprites ---
function px(n) {
  return Math.round(n);
}

function fillPx(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(px(x), px(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function pxDisc(x, y, r, color) {
  const R = Math.min(18, Math.max(1, Math.round(r)));
  const cx = px(x);
  const cy = px(y);
  ctx.fillStyle = color;
  for (let dy = -R; dy <= R; dy++) {
    const span = Math.floor(Math.sqrt(R * R - dy * dy));
    ctx.fillRect(cx - span, cy + dy, span * 2 + 1, 1);
  }
}

function pxRing(x, y, r, color) {
  const R = Math.max(2, Math.round(r));
  const cx = px(x);
  const cy = px(y);
  ctx.fillStyle = color;
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    ctx.fillRect(cx + Math.round(Math.cos(ang) * R) - 1, cy + Math.round(Math.sin(ang) * R) - 1, 2, 2);
  }
}

function pxDiamond(x, y, r, color) {
  const R = Math.max(1, Math.round(r));
  const cx = px(x);
  const cy = px(y);
  ctx.fillStyle = color;
  for (let dy = -R; dy <= R; dy++) {
    const span = R - Math.abs(dy);
    ctx.fillRect(cx - span, cy + dy, span * 2 + 1, 1);
  }
}

function drawGlow(x, y, r, color, alpha = 0.35) {
  const R = Math.max(2, Math.round(r * 0.45));
  ctx.globalAlpha = alpha;
  pxDisc(x, y, R, `rgba(${color}, 1)`);
  ctx.globalAlpha = alpha * 0.45;
  pxDisc(x, y, Math.max(1, Math.round(R * 0.45)), "#ffffff");
  ctx.globalAlpha = 1;
}

function drawPixelSprite(rows, scale, flipY = false) {
  const h = rows.length;
  const w = rows[0].length;
  const s = Math.max(1, Math.round(scale));
  const ox = Math.round((-w * s) / 2);
  const oy = Math.round((-h * s) / 2);
  for (let row = 0; row < h; row++) {
    const y = flipY ? h - 1 - row : row;
    for (let col = 0; col < w; col++) {
      const ch = rows[y][col];
      const color = PIX[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + col * s, oy + row * s, s, s);
    }
  }
}

function drawPlayerShip(x, y, w, h, thrust) {
  ctx.save();
  ctx.translate(px(x), px(y));
  const shipId = selectedShip().id;
  if (player.shield) {
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 6);
    pxRing(0, 0, 18, "#ffd166");
    pxRing(0, 0, 22, "#ffe8a3");
    ctx.globalAlpha = 1;
  }
  const flame = Math.max(2, Math.round(4 + thrust * 8 + Math.sin(time * 30) + (combo >= 10 ? 2 : 0)));
  const flames = SHIP_FLAME[shipId] || SHIP_FLAME.ice;
  if (cosmeticTrail || save.cosmeticTrail) {
    fillPx(-4, 16, 2, flame + 2, "#ffd166");
    fillPx(2, 16, 2, flame + 2, "#ffe8a3");
  }
  if (combo >= 10) {
    fillPx(-2, 18, 4, Math.round(flame * 0.8), flames[2] || "#ffffff");
  }
  fillPx(-3, 14, 2, flame, flames[0]);
  fillPx(1, 14, 2, flame, flames[0]);
  fillPx(-1, 14, 2, Math.round(flame * 0.7), flames[1]);
  if (shipId === "rift") {
    fillPx(-6, 10, 2, 3, flames[2]);
    fillPx(4, 10, 2, 3, flames[2]);
  } else if (shipId === "ember") {
    fillPx(-5, 12, 2, Math.round(flame * 0.6), flames[2]);
    fillPx(3, 12, 2, Math.round(flame * 0.6), flames[2]);
  } else if (shipId === "tide") {
    fillPx(-1, 16, 2, Math.round(flame * 0.5), flames[2]);
  } else if (shipId === "aegis") {
    fillPx(-7, 9, 2, 4, flames[2]);
    fillPx(5, 9, 2, 4, flames[2]);
    fillPx(-1, 16, 2, Math.round(flame * 0.45), flames[1]);
  } else if (shipId === "god") {
    fillPx(-5, 13, 2, flame, flames[2]);
    fillPx(3, 13, 2, flame, flames[2]);
  }
  drawPixelSprite(SHIP_SPRITES[shipId] || SPRITE_PLAYER, 3, false);
  ctx.restore();
}

function drawEnemyShip(e) {
  const { x, y, kind } = e;
  ctx.save();
  ctx.translate(px(x), px(y));
  if (e.elite) {
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(time * 8);
    pxRing(0, 0, 16, "#ffd166");
    pxRing(0, 0, 20, "#ff8a3d");
    ctx.globalAlpha = 1;
  }
  const sprites = [
    SPRITE_RED,
    SPRITE_YELLOW,
    SPRITE_PURPLE,
    SPRITE_PINK,
    SPRITE_TEAL,
    SPRITE_GREEN,
    SPRITE_WRAITH,
    SPRITE_HEXER,
    SPRITE_MORTAR,
    SPRITE_LEECH,
    SPRITE_PRISM,
  ];
  if (e.cloaked) ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 10);
  drawPixelSprite(sprites[kind] || SPRITE_RED, 3, false);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPickup(p) {
  const suck = Math.min(2.2, p.suck || 1);
  const x = px(p.x);
  const y = px(p.y);
  const bob = Math.round(Math.sin(time * 5 + p.spin) * 2);
  const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 7 + p.spin));
  const gy = y + bob;
  const tint = PICKUP_COLORS[p.type] || "#3de0ff";
  const glow = PICKUP_GLOW[p.type] || "61, 224, 255";

  ctx.save();
  if (suck > 1.05) {
    ctx.translate(x, gy);
    ctx.scale(1 / suck, 1 / suck);
    ctx.translate(-x, -gy);
  }
  ctx.globalAlpha = 0.22 * pulse * Math.min(1.4, suck);
  pxDisc(x, gy, Math.round(11 * (0.85 + suck * 0.15)), `rgba(${glow}, 1)`);
  ctx.globalAlpha = 1;

  if (p.type === "double") {
    // Twin needles — dual shot
    fillPx(x - 8, gy - 1, 16, 3, "#0a3048");
    fillPx(x - 7, gy - 7, 3, 12, "#2080b0");
    fillPx(x - 7, gy - 9, 3, 4, "#3de0ff");
    fillPx(x - 6, gy - 10, 1, 2, "#e8fbff");
    fillPx(x + 4, gy - 7, 3, 12, "#2080b0");
    fillPx(x + 4, gy - 9, 3, 4, "#3de0ff");
    fillPx(x + 5, gy - 10, 1, 2, "#e8fbff");
    fillPx(x - 2, gy + 2, 4, 2, "#70c0ff");
  } else if (p.type === "rapid") {
    // Lightning chevron — rapid fire
    fillPx(x - 2, gy - 10, 4, 3, "#ffe08a");
    fillPx(x - 1, gy - 7, 3, 3, "#ff8a3d");
    fillPx(x - 5, gy - 4, 8, 3, "#ffb040");
    fillPx(x - 1, gy - 1, 3, 3, "#ff8a3d");
    fillPx(x - 6, gy + 2, 9, 3, "#ff6030");
    fillPx(x, gy + 5, 3, 4, "#ff8a3d");
    fillPx(x + 1, gy - 8, 2, 2, "#fff2cc");
  } else if (p.type === "shield") {
    // Hex plate — shield
    pxRing(x, gy, 9, "#c89020");
    pxDiamond(x, gy, 8, "#ffd166");
    pxDiamond(x, gy, 5, "#ffe8a3");
    fillPx(x - 1, gy - 2, 2, 5, "#fff6d0");
    fillPx(x - 3, gy - 1, 6, 2, "#fff6d0");
    pxRing(x, gy, 10, `rgba(${glow}, ${0.35 + 0.25 * pulse})`);
  } else if (p.type === "life") {
    // Heart / cross — +1 life
    fillPx(x - 6, gy - 4, 4, 4, "#ff4d6d");
    fillPx(x + 2, gy - 4, 4, 4, "#ff4d6d");
    fillPx(x - 7, gy - 2, 14, 5, "#e01840");
    fillPx(x - 5, gy + 3, 10, 3, "#ff4d6d");
    fillPx(x - 3, gy + 6, 6, 2, "#ff8fab");
    fillPx(x - 1, gy + 8, 2, 2, "#ffb0c0");
    fillPx(x - 1, gy - 1, 2, 6, "#ffe0e8");
    fillPx(x - 3, gy + 1, 6, 2, "#ffe0e8");
  } else {
    pxDisc(x, gy, 6, tint);
    pxDisc(x, gy, 3, "#ffffff");
  }

  ctx.font = "9px Share Tech Mono, monospace";
  ctx.fillStyle = tint;
  ctx.textAlign = "center";
  ctx.globalAlpha = 0.9;
  ctx.fillText(PICKUP_LABELS[p.type] || p.type, x, gy + 18);
  ctx.restore();
}

function drawBoss() {
  if (!boss) return;
  const { x, y, flash, colors, name, id, specialFlash, mode } = boss;
  const c0 = flash > 0 ? "#ffffff" : colors?.[0] || "#ffe8a3";
  const c1 = colors?.[1] || "#ff4d6d";
  ctx.save();
  ctx.translate(px(x), px(y));
  const glowMap = {
    glacier: "120, 190, 255",
    void: "160, 90, 255",
    cinder: "255, 110, 50",
    aqua: "60, 220, 200",
    overmind: "140, 230, 70",
    forge: "255, 160, 40",
    cascade: "200, 100, 255",
    omega: "160, 190, 255",
    mirage: "255, 140, 80",
    horizon: "180, 210, 255",
  };
  const glow = glowMap[id] || "255, 120, 140";
  drawGlow(0, 0, 30, glow, 0.28 + (flash > 0 ? 0.2 : 0) + (specialFlash > 0 ? 0.12 : 0));

  // per-boss silhouette accents (behind hull)
  ctx.globalAlpha = 0.45;
  if (id === "glacier") {
    pxDiamond(0, -8, 22 + (Math.floor(time * 4) % 2), colors[0]);
    pxDiamond(0, -8, 12, colors[1]);
  } else if (id === "void") {
    for (let i = 0; i < 6; i++) {
      const a = time * 1.5 + (i / 6) * Math.PI * 2;
      pxDisc(Math.cos(a) * 34, Math.sin(a) * 18, 3, colors[1]);
    }
  } else if (id === "cinder") {
    fillPx(-28, 18, 8, 10 + Math.floor(time * 10) % 4, colors[0]);
    fillPx(20, 18, 8, 10 + Math.floor(time * 10 + 2) % 4, colors[0]);
    fillPx(-24, 22, 4, 6, "#ffe566");
    fillPx(24, 22, 4, 6, "#ffe566");
  } else if (id === "aqua") {
    fillPx(-48, -2, 28, 4, colors[1]);
    fillPx(20, -2, 28, 4, colors[1]);
    fillPx(-40, 4, 20, 3, colors[0]);
    fillPx(20, 4, 20, 3, colors[0]);
  } else if (id === "overmind") {
    pxRing(0, 0, 36 + (Math.floor(time * 5) % 3), colors[0]);
    pxDisc(-18, -10, 4, "#ffffff");
    pxDisc(18, -10, 4, "#ffffff");
    pxDisc(0, 8, 3, "#ffffff");
  } else if (id === "forge") {
    fillPx(-40, -6, 80, 10, colors[1]);
    fillPx(-20, 8, 40, 14, colors[0]);
  } else if (id === "cascade") {
    fillPx(-2, -36, 4, 72, colors[0]);
    fillPx(-36, -2, 72, 4, colors[1]);
  } else if (id === "omega") {
    pxRing(0, 0, 40, colors[0]);
    pxRing(0, 0, 48, colors[1]);
    pxDisc(0, 0, 6 + (Math.floor(time * 6) % 2), "#ffffff");
  } else if (id === "mirage") {
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time * 5);
    fillPx(18, -16, 22, 8, colors[0]);
    fillPx(-34, 10, 18, 6, colors[1]);
  } else if (id === "horizon") {
    fillPx(-56, -4, 24, 5, colors[0]);
    fillPx(32, -4, 24, 5, colors[0]);
    fillPx(-8, -28, 16, 8, colors[1]);
  }
  ctx.globalAlpha = 1;

  const sprite = BOSS_SPRITES[id] || SPRITE_BOSS;
  if (flash > 0) ctx.globalAlpha = 0.85 + Math.sin(time * 40) * 0.15;
  else ctx.globalAlpha = 1;
  drawPixelSprite(sprite, 8, false);
  ctx.globalAlpha = 1;

  if (mode === "chargeDive" || mode === "overmindRage" || specialFlash > 0) {
    ctx.globalAlpha = 0.4;
    pxRing(0, 0, 52 + (Math.floor(time * 8) % 3), colors[0]);
    pxRing(0, 0, 60, colors[1]);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  const pct = Math.max(0, boss.hp / boss.maxHp);
  const pctText = `${Math.ceil(pct * 100)}%`;
  const barW = 22;
  const pad = 10;
  const labelH = 28;
  const pctH = 32;
  const barX = W - barW - 12;
  const barY = pad + labelH;
  const barH = H - pad * 2 - labelH - pctH;
  fillPx(barX - 8, 0, barW + 20, H, "rgba(0,0,0,0.55)");
  fillPx(barX, barY, barW, barH, "#3a1520");
  const fillH = Math.round(barH * pct);
  // chunky HP segments
  const seg = 8;
  for (let y = barY + barH - fillH; y < barY + barH; y += seg) {
    const t = 1 - (y - barY) / barH;
    fillPx(barX, y, barW, Math.min(seg - 1, barY + barH - y), t > 0.55 ? c0 : c1);
  }
  ctx.strokeStyle = "#ffe8a3";
  ctx.lineWidth = 2;
  ctx.strokeRect(px(barX) + 0.5, px(barY) + 0.5, barW - 1, barH - 1);
  ctx.font = "10px Share Tech Mono, monospace";
  ctx.fillStyle = "#ffe8a3";
  ctx.textAlign = "center";
  ctx.fillText("BOSS", barX + barW / 2, pad + 14);
  ctx.font = "bold 13px Share Tech Mono, monospace";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(pctText, barX + barW / 2, barY + barH + 20);
  ctx.font = "11px Share Tech Mono, monospace";
  ctx.fillStyle = c0;
  ctx.fillText(name, W / 2, 28);
}

const SPRITE_BULLET_NORMAL = ["C", "C", "W", "C", "C", "b"];
const SPRITE_BULLET_FOCUS = ["bCb", "CWC", "CWC", "bCb", ".C."];
const SPRITE_BULLET_TWIN = [".C.", "CWC", "CWC", ".C."];
const SPRITE_BULLET_SHARD = [".C.", "CWC", ".C."];
const SPRITE_BULLET_CLUSTER = [".CWC.", "CWWWC", ".CWC."];
const SPRITE_BULLET_DRONE = [".t.", "tWt", ".t."];
const SPRITE_BULLET_NOVA = ["t.t", ".W.", "t.t", ".t."];

function drawBullet(b) {
  const x = px(b.x);
  const y = px(b.y);
  if (b.fromPlayer) {
    ctx.save();
    ctx.translate(x, y);
    if (b.style === "allyCluster" || b.cluster) {
      drawPixelSprite(SPRITE_BULLET_CLUSTER, 3, false);
    } else if (b.style === "allyShard") {
      drawPixelSprite(SPRITE_BULLET_SHARD, 3, false);
    } else if (b.style === "droneNova") {
      drawPixelSprite(SPRITE_BULLET_NOVA, 3, false);
    } else if (b.style === "drone") {
      drawPixelSprite(SPRITE_BULLET_DRONE, 3, false);
    } else if (b.style === "focus" || (b.w >= 7 && b.h >= 14)) {
      drawPixelSprite(SPRITE_BULLET_FOCUS, 3, false);
    } else if (b.w <= 4) {
      drawPixelSprite(SPRITE_BULLET_TWIN, 2, false);
  } else {
      drawPixelSprite(SPRITE_BULLET_NORMAL, 3, false);
    }
    ctx.restore();
    return;
  }
  if (b.style === "aimed") {
    pxDisc(x, y, 5, "#ffd166");
    fillPx(x - 1, y - 1, 2, 2, "#fff2cc");
    return;
  }
  if (b.style === "sniper" || b.style === "sting") {
    pxDisc(x, y, b.style === "sting" ? 4 : 3, "#7ff0e0");
    if (b.homing) pxRing(x, y, 7, "#b8fff4");
    return;
  }
  if (b.style === "wave") {
    fillPx(x - 5, y - 2, 10, 4, "#5eead4");
    fillPx(x - 3, y - 1, 6, 2, "#e8fffb");
    return;
  }
  if (b.style === "ice" || b.style === "frost") {
    pxDiamond(x, y, 5, b.style === "frost" ? "#c8e8ff" : "#8ec8ff");
    if (b.breakable) pxRing(x, y, 7, "#ffffff");
    return;
  }
  if (b.style === "void") {
    pxDisc(x, y, 5, "#9b6bff");
    pxDisc(x, y, 2, "#2a1048");
    return;
  }
  if (b.style === "ember") {
    pxDisc(x, y, 4, "#ff8a3d");
    fillPx(x - 1, y - 2, 2, 2, "#ffe08a");
    return;
  }
  if (b.style === "toxic") {
    pxDisc(x, y, 4, "#b8ff6a");
    return;
  }
  if (b.style === "mortar") {
    pxDisc(x, y, Math.max(7, Math.round(b.w / 2)), "#ff8a3d");
    pxDisc(x, y, 3, "#ffe566");
    return;
  }
  if (b.style === "cluster" || b.cluster) {
    pxDisc(x, y, Math.max(6, Math.round(b.w / 2)), "#7c4dff");
    pxDisc(x, y, 2, "#d4b3ff");
    return;
  }
  if (b.style === "shard") {
    pxDiamond(x, y, 3, "#b388ff");
    return;
  }
  if (b.style === "splitter") {
    pxDisc(x, y, 4, "#b8ff6a");
    return;
  }
  if (b.style === "wraith") {
    pxDisc(x, y, 5, "#c89bff");
    pxDisc(x, y, 2, "#2a1048");
    return;
  }
  if (b.style === "hex") {
    pxDiamond(x, y, 5, "#70a0ff");
    pxRing(x, y, 8, "#b8d0ff");
    return;
  }
  if (b.style === "leech") {
    pxDisc(x, y, 4, "#ff60a0");
    if (b.homing) pxRing(x, y, 7, "#ff90c0");
    return;
  }
  if (b.style === "prism") {
    fillPx(x - 1, y - 4, 2, 8, "#e8f0ff");
    fillPx(x - 2, y - 2, 4, 2, "#70a0ff");
    return;
  }
  if (b.style === "breakable" || b.breakable) {
    pxDisc(x, y, 5, "#ff8fab");
    pxRing(x, y, 7, "#ffffff");
    return;
  }
  pxDisc(x, y, 4, "#ff8fab");
}

function drawPixelPlanet(p) {
  const cell = p.px;
  if (p.hasRing) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = p.ringColor;
    for (let i = -p.r - 4; i <= p.r + 4; i++) {
      const y = Math.round(Math.sin(i * 0.35) * 2);
      ctx.fillRect(p.x + i * cell - cell / 2, p.y + y * cell, cell, cell);
    }
    ctx.globalAlpha = 1;
  }
  for (const c of p.cells) {
    ctx.fillStyle = c.color;
    ctx.fillRect(p.x + c.x * cell - cell / 2, p.y + c.y * cell - cell / 2, cell, cell);
  }
}

function updateScenery(dt) {
  for (const p of scenery) {
    if (!p.cells) continue;
    p.y += p.vy * dt;
    p.x += p.vx * dt + Math.sin(time * 0.3 + p.spin) * 0.05;
    if (p.y > H + 80) {
      p.y = -60 - Math.random() * 80;
      p.x = 40 + Math.random() * (W - 80);
      p.vy = 8 + Math.random() * 18;
    }
  }
}

function drawBackground() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);

  for (const star of stars) {
    const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(star.tw));
    ctx.globalAlpha = (0.5 + star.z * 0.5) * twinkle;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.s, star.s);
  }
  ctx.globalAlpha = 1;

  for (const p of scenery) {
    if (!p.cells) continue;
    ctx.globalAlpha = 0.9;
    drawPixelPlanet(p);
  }
  ctx.globalAlpha = 1;
}

function drawHazards() {
  for (const h of hazards) {
    if (h.kind === "slowzone") {
      const x0 = px(h.x - h.w / 2);
      const y0 = px(h.y - h.h / 2);
      const zw = Math.max(1, px(h.w));
      const zh = Math.max(1, px(h.h));
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = "#8ec8ff";
      ctx.fillRect(x0, y0, zw, zh);
      if (!mobileLite) {
        ctx.globalAlpha = 0.14;
        for (let y = y0; y < y0 + zh; y += 8) {
          for (let x = x0; x < x0 + zw; x += 8) {
            if ((x + y) % 16 === 0) fillPx(x, y, 3, 3, "#8ec8ff");
          }
        }
      }
      ctx.globalAlpha = 1;
    } else if (h.kind === "edgeAcid") {
      const x = h.side === "left" ? 0 : W - h.w;
      for (let i = 0; i < h.w; i += 4) {
        ctx.globalAlpha = h.side === "left" ? 0.28 * (1 - i / h.w) : 0.28 * (i / h.w);
        fillPx(x + i, 0, 4, H, "#78dc3c");
      }
      ctx.globalAlpha = 1;
    } else if (h.kind === "meteor") {
      pxDisc(h.x, h.y, 6, "#ff8a3d");
      fillPx(h.x - 1, h.y - 3, 2, 2, "#ffe08a");
      fillPx(h.x - 1, h.y + 6, 2, 4, "#ff4d20");
    }
  }
}

function drawShop() {
  if (phase !== "shop") return;
  ctx.fillStyle = "rgba(2, 6, 16, 0.72)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.font = "bold 26px Share Tech Mono, monospace";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("UPGRADE BAY", W / 2, 78);
  ctx.font = "14px Share Tech Mono, monospace";
  ctx.fillStyle = "rgba(200,230,255,0.9)";
  ctx.fillText(`Credits: ${credits}`, W / 2, 104);
  ctx.fillStyle = "#ffe8a3";
  const shopHint = mobileLite || document.body.classList.contains("touch-device")
    ? "Tap a card · Tap FREE to continue"
    : "CLICK a card  or  press 1 / 2 / 3   ·   Enter = free & continue";
  ctx.fillText(shopHint, W / 2, 128);
  const cardW = 200;
  const gap = 24;
  const total = shopOffers.length * cardW + (shopOffers.length - 1) * gap;
  const startX = W / 2 - total / 2;
  shopOffers.forEach((offer, i) => {
    const x = startX + i * (cardW + gap);
    const y = H / 2 - 70;
    const canBuy = offer.free || credits >= offer.cost;
    ctx.fillStyle = canBuy ? "rgba(10, 24, 48, 0.95)" : "rgba(20, 12, 18, 0.9)";
    ctx.strokeStyle = offer.free ? "#ffd166" : canBuy ? "#3de0ff" : "#66444a";
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, cardW, 180);
    ctx.strokeRect(x, y, cardW, 180);
    if (offer.stacked) {
      ctx.fillStyle = "rgba(255, 209, 102, 0.2)";
      ctx.fillRect(x + 10, y + 10, 78, 18);
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 10px Share Tech Mono, monospace";
      ctx.fillText("UPGRADE", x + 49, y + 23);
    }
    ctx.fillStyle = "#3de0ff";
    ctx.font = "bold 13px Share Tech Mono, monospace";
    ctx.fillText(`[${i + 1}] ${offer.name}`, x + cardW / 2, y + 42);
    ctx.fillStyle = "rgba(200,220,255,0.85)";
    ctx.font = "12px Share Tech Mono, monospace";
    const desc = offer.desc || "";
    ctx.fillText(desc.slice(0, 30), x + cardW / 2, y + 78);
    if (desc.length > 30) ctx.fillText(desc.slice(30, 60), x + cardW / 2, y + 96);
    ctx.fillStyle = offer.free ? "#ffd166" : "#7cf0ff";
    ctx.font = "bold 16px Share Tech Mono, monospace";
    ctx.fillText(offer.free ? "FREE" : `${offer.cost} CR`, x + cardW / 2, y + 140);
  });
}

function drawPause() {
  if (!paused || !running) return;
  ctx.fillStyle = "rgba(2, 6, 16, 0.65)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.font = "bold 34px Share Tech Mono, monospace";
  ctx.fillStyle = "#3de0ff";
  ctx.fillText("PAUSED", W / 2, H / 2 - 20);
  ctx.font = "14px Share Tech Mono, monospace";
  ctx.fillStyle = "rgba(200,220,255,0.9)";
  const pauseHint = mobileLite || document.body.classList.contains("touch-device")
    ? "Tap to resume · hold FIRE to shoot"
    : "P / Esc resume · M mute · R restart mission";
  ctx.fillText(pauseHint, W / 2, H / 2 + 18);
}

function drawTransitionVeil() {
  let a = 0;
  if (phase === "levelClear") {
    const p = 1 - levelClearTimer / Math.max(0.001, levelClearTotal);
    if (p > 0.62) a = easeInOutCubic((p - 0.62) / 0.38) * 0.88;
  } else if (phase === "levelIntro") {
    const p = 1 - levelIntroTimer / Math.max(0.001, levelIntroTotal);
    if (p < 0.4) a = (1 - easeInOutCubic(p / 0.4)) * 0.88;
    else if (p > 0.82) a = easeInOutCubic((p - 0.82) / 0.18) * 0.2;
  } else if (phase === "warning") {
    const p = 1 - warningTimer / Math.max(0.001, warningTotal);
    if (p < 0.2) a = (1 - easeInOutCubic(p / 0.2)) * 0.35;
    else if (p > 0.75) a = easeInOutCubic((p - 0.75) / 0.25) * 0.45;
  }
  if (a < 0.02) return;
  ctx.fillStyle = `rgba(2, 6, 18, ${a})`;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, H * 0.55);
  glow.addColorStop(0, `rgba(61, 224, 255, ${a * 0.12})`);
  glow.addColorStop(1, "rgba(2, 6, 18, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

function drawBannerPanel(alpha, tint = "rgba(61, 224, 255, 0.1)") {
  if (alpha < 0.02) return;
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = "rgba(4, 10, 24, 0.55)";
  ctx.fillRect(W * 0.12, H / 2 - 78, W * 0.76, 156);
  ctx.strokeStyle = tint;
  ctx.lineWidth = 2;
  ctx.strokeRect(W * 0.12 + 1, H / 2 - 77, W * 0.76 - 2, 154);
  ctx.restore();
}

function drawBossIntro() {
  if (phase !== "bossIntro" || !boss) return;
  const alpha = bannerOpacity(bossIntroTimer, bossIntroTotal, 0.15, 0.2);
  const cfg = currentLevel().boss;
  ctx.save();
  ctx.globalAlpha = alpha * 0.75;
  ctx.fillStyle = "rgba(2, 4, 12, 0.72)";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.font = "bold 14px Share Tech Mono, monospace";
  ctx.fillStyle = "#ff4d6d";
  ctx.fillText(challengeMode || boss.mini ? "MINI-BOSS SIGNATURE" : "THREAT SIGNATURE", W / 2, H / 2 - 70);
  ctx.font = "bold 32px Orbitron, sans-serif";
  ctx.fillStyle = cfg.colors?.[0] || "#ffd166";
  ctx.fillText(boss.name || cfg.name, W / 2, H / 2 - 20);
  ctx.font = "15px Share Tech Mono, monospace";
  ctx.fillStyle = "rgba(200,220,255,0.9)";
  ctx.fillText(cfg.lore || "Unknown anomaly.", W / 2, H / 2 + 18);
  ctx.font = "12px Share Tech Mono, monospace";
  ctx.fillStyle = "rgba(180,210,255,0.7)";
  ctx.fillText("Space / Enter to engage", W / 2, H / 2 + 52);
  ctx.restore();
}

function drawBanners() {
  if (phase === "warning") {
    const alpha = bannerOpacity(warningTimer, warningTotal, 0.18, 0.22);
    const slide = (1 - alpha) * 18;
    ctx.save();
    ctx.globalAlpha = alpha * (0.85 + 0.15 * Math.sin(time * 5));
    ctx.fillStyle = "rgba(255, 77, 109, 0.14)";
    ctx.fillRect(0, 0, W, H);
    drawBannerPanel(alpha, "rgba(255, 77, 109, 0.45)");
    ctx.globalAlpha = alpha;
    ctx.font = "bold 26px Share Tech Mono, monospace";
  ctx.fillStyle = "#ff4d6d";
  ctx.textAlign = "center";
    ctx.fillText(challengeMode ? "MINI-BOSS INCOMING" : "BOSS INCOMING", W / 2, H / 2 - 10 + slide);
    ctx.font = "14px Share Tech Mono, monospace";
    ctx.fillStyle = "rgba(255,220,180,0.9)";
    ctx.fillText(
      challengeMode ? `MINI ${currentLevel().boss.name}` : currentLevel().boss.name,
      W / 2,
      H / 2 + 22 + slide * 0.6
    );
  ctx.restore();
    return;
  }
  if (phase === "waveBreak") {
    const alpha = bannerOpacity(waveBreakTimer, waveBreakTotal, 0.2, 0.25);
    const slide = (1 - alpha) * 14;
    ctx.save();
    drawBannerPanel(alpha, "rgba(61, 224, 255, 0.4)");
    ctx.globalAlpha = alpha;
    ctx.font = "bold 28px Share Tech Mono, monospace";
    ctx.fillStyle = "#3de0ff";
    ctx.textAlign = "center";
    ctx.fillText(`WAVE ${wave + 1}`, W / 2, H / 2 + slide);
    ctx.font = "13px Share Tech Mono, monospace";
    ctx.fillStyle = "rgba(180, 210, 255, 0.85)";
    ctx.fillText("Stand by…", W / 2, H / 2 + 28 + slide * 0.5);
    ctx.restore();
    return;
  }
  if (phase === "levelClear") {
    const alpha = bannerOpacity(levelClearTimer, levelClearTotal, 0.16, 0.3);
    const slide = (1 - alpha) * 20;
    ctx.save();
    drawBannerPanel(alpha, "rgba(255, 209, 102, 0.45)");
    ctx.globalAlpha = alpha;
    ctx.font = "bold 28px Share Tech Mono, monospace";
    ctx.fillStyle = "#ffd166";
    ctx.textAlign = "center";
    ctx.fillText(`LEVEL ${level} CLEAR`, W / 2, H / 2 - 36 + slide);
    if (lastUpgrade) {
      ctx.font = "bold 18px Share Tech Mono, monospace";
      ctx.fillStyle = "#3de0ff";
      ctx.fillText(`UPGRADE: ${lastUpgrade.name}`, W / 2, H / 2 + slide * 0.5);
      ctx.font = "14px Share Tech Mono, monospace";
      ctx.fillStyle = "rgba(200, 230, 255, 0.9)";
      ctx.fillText(lastUpgrade.desc || "", W / 2, H / 2 + 26 + slide * 0.4);
    }
    ctx.font = "13px Share Tech Mono, monospace";
    ctx.fillStyle = "rgba(180, 210, 255, 0.85)";
    ctx.fillText(LEVELS[level] ? `Next: ${LEVELS[level].name}` : "Final stretch", W / 2, H / 2 + 54 + slide * 0.3);
    ctx.restore();
    return;
  }
  if (phase === "levelIntro") {
    const alpha = bannerOpacity(levelIntroTimer, levelIntroTotal, 0.2, 0.22);
    const slide = (1 - alpha) * -16;
    const lvl = currentLevel();
    ctx.save();
    drawBannerPanel(alpha, "rgba(61, 224, 255, 0.4)");
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.font = "bold 14px Share Tech Mono, monospace";
    ctx.fillStyle = "rgba(61, 224, 255, 0.9)";
    ctx.fillText(`SECTOR ${level}`, W / 2, H / 2 - 40 + slide);
    ctx.font = "bold 30px Share Tech Mono, monospace";
    ctx.fillStyle = "#e8fbff";
    ctx.fillText(lvl.name, W / 2, H / 2 + slide * 0.7);
    ctx.font = "13px Share Tech Mono, monospace";
    ctx.fillStyle = "rgba(180, 210, 255, 0.85)";
    ctx.fillText(`Boss ahead: ${lvl.boss.name}`, W / 2, H / 2 + 34 + slide * 0.4);
    ctx.restore();
  }
}


// --- frame draw ---
function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (shake.t > 0 && shake.mag > 0) {
    const mag = Math.round(shake.mag * (shake.t / 0.25));
    ctx.translate(((Math.random() * 2 - 1) | 0) * mag, ((Math.random() * 2 - 1) | 0) * mag);
  }
  ctx.clearRect(-20, -20, W + 40, H + 40);
  drawBackground();
  drawHazards();

  for (const t of trails) {
    const s = Math.max(1, Math.round(t.size * (t.life / t.max)));
    ctx.globalAlpha = Math.max(0, t.life / t.max) * 0.55;
    fillPx(t.x - s / 2, t.y - s / 2, s, s, t.color);
  }
  ctx.globalAlpha = 1;

  for (const b of bullets) drawBullet(b);
  for (const e of enemies) drawEnemyShip(e);
  for (const p of pickups) drawPickup(p);
  drawBoss();
  drawTransitionVeil();
  drawBossIntro();
  drawBanners();
  if (screenFlash > 0) {
    ctx.fillStyle = "rgba(255,255,255," + Math.min(0.45, screenFlash * 3) + ")";
    ctx.fillRect(0, 0, W, H);
  }

  if (player && (player.invuln <= 0 || Math.floor(player.invuln * 14) % 2 === 0)) {
    drawPlayerShip(player.x, player.y, player.w, player.h, player.thrust || 0.4);
  }

  if (upgrades.drone) {
    for (const d of drones) {
      const charging = d.specialCd < 0.8;
      if (charging) {
        ctx.globalAlpha = 0.5;
        pxRing(d.x, d.y + 4, 8 + (Math.floor(time * 10) % 3), "#78ff8c");
        ctx.globalAlpha = 1;
      }
      ctx.save();
      ctx.translate(px(d.x), px(d.y));
      drawPixelSprite(SPRITE_DRONE, 3, false);
      ctx.restore();
    }
  }

  for (const p of particles) {
    const a = Math.max(0, p.life / (p.max || 0.6));
    const s = Math.max(1, Math.round(p.size * a));
    ctx.globalAlpha = a;
    fillPx(p.x - s / 2, p.y - s / 2, s, s, p.color);
  }
  ctx.globalAlpha = 1;

  // light pixel vignette
  ctx.globalAlpha = 0.12;
  fillPx(0, 0, W, 18, "#000000");
  fillPx(0, H - 18, W, 18, "#000000");
  fillPx(0, 0, 14, H, "#000000");
  fillPx(W - 14, 0, 14, H, "#000000");
  ctx.globalAlpha = 1;
  drawShop();
  drawPause();
  ctx.restore();
}


// --- main loop / input ---
function loop(now) {
  let dt = Math.min(0.033, (now - lastTime) / 1000 || 0.016);
  lastTime = now;
  if (hitStop > 0) {
    hitStop -= dt;
    dt *= 0.15;
  }
  if (running && !paused) {
    try {
    update(dt);
    } catch (err) {
      console.error("update error", err);
    }
  } else {
    time += dt;
    const menuIdle = !running && !overlay.classList.contains("hidden");
    menuIdleFrame++;
    const skipStars = menuIdle && (menuIdleFrame & 1) === 1;
    if (!skipStars) {
      for (const star of stars) {
        star.y += star.z * 35 * dt * (menuIdle ? 2 : 1);
        star.tw += dt * (1.2 + star.z);
        if (star.y > H) {
          star.y = 0;
          star.x = Math.random() * W;
        }
      }
    }
  }
  try {
  draw();
  } catch (err) {
    console.error("draw error", err);
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } catch (_) {}
  }
  if (!mobileLite) tickPlayRecorder(now);
  requestAnimationFrame(loop);
}

function togglePause() {
  if (!running || phase === "shop") return;
  paused = !paused;
  if (!paused) lastTime = performance.now();
  sfx("ui");
}

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  if (e.key === "p" || e.key === "P" || e.key === "Escape") {
    e.preventDefault();
    togglePause();
  }
  if ((e.key === "m" || e.key === "M") && !e.repeat) {
    save.muted = !save.muted;
    persistSave();
    refreshMenuScores();
    if (save.muted) stopMusic();
    else startMusic(musicModeForPhase());
    sfx("ui");
  }
  if (e.key === "F9" && !e.repeat) {
    e.preventDefault();
    toggleRecording();
  }
  if (paused && (e.key === "r" || e.key === "R")) {
    paused = false;
    startGame();
  }
  if (phase === "shop") {
    if (e.key === "1") buyShopOffer(0);
    if (e.key === "2") buyShopOffer(1);
    if (e.key === "3") buyShopOffer(2);
    if (e.key === "Enter") skipShop();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key));

startBtn.addEventListener("click", () => {
  ensureAudio();
  if (startBtn.dataset.mode === "challenge") {
    startChallenge();
    return;
  }
  challengeMode = false;
  window.__challengeNoShop = false;
  startGame();
});
if (challengeBtn) {
  challengeBtn.addEventListener("click", () => {
    ensureAudio();
    startChallenge();
  });
}
if (menuTabsEl) {
  menuTabsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn || !menuTabsEl.contains(btn)) return;
    ensureAudio();
    setMenuTab(btn.dataset.tab);
  });
}
if (codeSubmitBtn) {
  codeSubmitBtn.addEventListener("click", () => {
    ensureAudio();
    tryRedeemCode(codeInputEl ? codeInputEl.value : "");
  });
}
if (codeCancelBtn) {
  codeCancelBtn.addEventListener("click", () => {
    if (codeInputEl) codeInputEl.value = "";
    sfx("ui");
  });
}
if (codeInputEl) {
  codeInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      tryRedeemCode(codeInputEl.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMenuTab("play");
    }
  });
}
if (volumeSlider) {
  volumeSlider.value = String(Math.round((Number(save.volume) || 0.7) * 100));
  volumeSlider.addEventListener("input", () => {
    save.volume = Math.max(0, Math.min(1, Number(volumeSlider.value) / 100));
    if (save.volume > 0) save.muted = false;
    applyVolume();
    persistSave();
  });
}
if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    save.muted = !save.muted;
    persistSave();
    refreshMenuScores();
    if (save.muted) stopMusic();
    else startMusic(musicModeForPhase());
    sfx("ui");
  });
}
if (joySizeSlider) {
  joySizeSlider.addEventListener("input", () => {
    save.touchControls = normalizeTouchControls({
      ...save.touchControls,
      joySize: Number(joySizeSlider.value),
    });
    applyTouchControls();
    persistSave();
  });
}
if (btnSizeSlider) {
  btnSizeSlider.addEventListener("input", () => {
    save.touchControls = normalizeTouchControls({
      ...save.touchControls,
      btnSize: Number(btnSizeSlider.value),
    });
    applyTouchControls();
    persistSave();
  });
}
if (swapSidesBtn) {
  swapSidesBtn.addEventListener("click", () => {
    save.touchControls = normalizeTouchControls({
      ...save.touchControls,
      swapSides: !save.touchControls?.swapSides,
    });
    applyTouchControls();
    persistSave();
    sfx("ui");
  });
}
if (resetTouchBtn) {
  resetTouchBtn.addEventListener("click", () => {
    save.touchControls = defaultTouchControls();
    applyTouchControls();
    persistSave();
    sfx("ui");
  });
}
if (recBtn) recBtn.addEventListener("click", () => toggleRecording());
if (exportBtn) exportBtn.addEventListener("click", () => exportPlaySession());
updateRecUi();

document.addEventListener("selectstart", (e) => {
  if (e.target && e.target.closest && e.target.closest("input, textarea")) return;
  e.preventDefault();
});
document.addEventListener("dragstart", (e) => e.preventDefault());

// Touch controls
const coarse = isTouchDevice();
if (coarse) {
  document.body.classList.add("touch-device");
  touchUi.classList.remove("hidden");
  touchUi.setAttribute("aria-hidden", "false");
}

// Mobile portrait: rotate prompt + auto-pause mid-game (no auto-resume)
const rotatePrompt = document.getElementById("rotate-prompt");
const portraitMq = window.matchMedia("(max-width: 900px) and (orientation: portrait)");

function isMobilePortrait() {
  return portraitMq.matches;
}

function syncRotatePrompt() {
  const block = isMobilePortrait();
  if (rotatePrompt) {
    rotatePrompt.setAttribute("aria-hidden", block ? "false" : "true");
  }
  if (block && running && !paused && phase !== "shop") {
    paused = true;
    sfx("ui");
  }
}

syncRotatePrompt();
if (typeof portraitMq.addEventListener === "function") {
  portraitMq.addEventListener("change", syncRotatePrompt);
} else if (typeof portraitMq.addListener === "function") {
  portraitMq.addListener(syncRotatePrompt);
}
window.addEventListener("orientationchange", () => {
  requestAnimationFrame(syncRotatePrompt);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (running && !paused && phase !== "shop") {
      paused = true;
    }
    suspendAudio();
  }
});

function joyHandler(clientX, clientY) {
  const rect = joyBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = (clientX - cx) / (rect.width / 2);
  let dy = (clientY - cy) / (rect.height / 2);
  const len = Math.hypot(dx, dy) || 1;
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  touchMove.x = dx;
  touchMove.y = dy;
  const travel = Math.max(18, rect.width * 0.25);
  joyKnob.style.transform = `translate(${dx * travel}px, ${dy * travel}px)`;
}

joyBase.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  ensureAudio();
  resumeAudio();
  joyBase.setPointerCapture(e.pointerId);
  joyHandler(e.clientX, e.clientY);
});
joyBase.addEventListener("pointermove", (e) => {
  if (joyBase.hasPointerCapture?.(e.pointerId) || e.buttons) joyHandler(e.clientX, e.clientY);
});
joyBase.addEventListener("pointerup", () => {
  touchMove.x = 0;
  touchMove.y = 0;
  joyKnob.style.transform = "translate(0,0)";
});
joyBase.addEventListener("pointercancel", () => {
  touchMove.x = 0;
  touchMove.y = 0;
  joyKnob.style.transform = "translate(0,0)";
});
touchFire.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  ensureAudio();
  resumeAudio();
  touchFire.setPointerCapture(e.pointerId);
  touchFiring = true;
});
touchFire.addEventListener("pointerup", () => {
  touchFiring = false;
});
touchFire.addEventListener("pointercancel", () => {
  touchFiring = false;
});
touchSpecial.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  ensureAudio();
  resumeAudio();
  touchSpecialHeld = true;
  fireSpecial();
});
if (touchPause) {
  touchPause.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    ensureAudio();
    resumeAudio();
    togglePause();
  });
}

function shopPickAt(clientX, clientY) {
  if (phase !== "shop") return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const mx = (clientX - rect.left) * scaleX;
  const my = (clientY - rect.top) * scaleY;
  const cardW = 200;
  const gap = 24;
  const total = shopOffers.length * cardW + (shopOffers.length - 1) * gap;
  const startX = W / 2 - total / 2;
  const y = H / 2 - 70;
  shopOffers.forEach((_, i) => {
    const x = startX + i * (cardW + gap);
    if (mx >= x && mx <= x + cardW && my >= y && my <= y + 180) buyShopOffer(i);
  });
}

canvas.addEventListener("pointerdown", (e) => {
  ensureAudio();
  resumeAudio();
  if (phase === "bossIntro") {
    e.preventDefault();
    bossIntroTimer = 0;
    return;
  }
  if (paused && running) {
    e.preventDefault();
    togglePause();
    return;
  }
  if (phase !== "shop") return;
  e.preventDefault();
  shopPickAt(e.clientX, e.clientY);
});

selectedShipId = save.selectedShipId || "ice";
sanitizeSelectedShip();
if (save.selectedShipId !== selectedShipId) {
  save.selectedShipId = selectedShipId;
  persistSave();
}
refreshMenuScores();
renderLevelSelect();
renderShipSelect();
applyTouchControls();
setMenuTab("play", { silent: true });
applyTheme(LEVELS[Math.max(0, (save.selectedStartLevel || 1) - 1)].theme);
resetPlayer(false);
lastTime = performance.now();
requestAnimationFrame(loop);
