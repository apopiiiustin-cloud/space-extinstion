// Shared static game data (no runtime state)

export const MAX_LIVES = 5;
export const TOTAL_LEVELS = 10;
export const WAVES_PER_LEVEL = 3;
export const CHALLENGE_BOSS_EVERY = 5;
export const DROP_CHANCE = 0.12;
export const BUFF_DURATION = 8;
export const ABS_MAX_LIVES = 7;

// kinds: 0 red, 1 yellow, 2 purple, 3 kamikaze, 4 teal sniper, 5 green splitter,
// 6 wraith, 7 hexer, 8 mortar, 9 leech, 10 prism
export const SCORE_BY_KIND = [100, 150, 150, 200, 180, 170, 220, 230, 240, 250, 280];
export const ENEMY_NAMES = [
  "SCOUT DRONE",
  "AIM WING",
  "CLUSTER BUG",
  "DIVE FANG",
  "SNIPER RAY",
  "SPLIT SEED",
  "PHASE WRAITH",
  "HEX BINDER",
  "MORTAR SHELL",
  "LEECH NODE",
  "PRISM LANCE",
];
// Signature foe introduced on each campaign level (1-indexed via level-1)
export const LEVEL_NEW_KIND = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Free reward after clearing levels 1–9 (before starting the next)
export const LEVEL_REWARDS = [
  { id: "twin", name: "TWIN CANNONS", desc: "Permanent dual shot" },
  { id: "cluster", name: "CLUSTER TORPEDO", desc: "Auto cluster shot every 3s" },
  { id: "armor", name: "PLATED HULL", desc: "Absorb 2 hits before losing a life" },
  { id: "drone", name: "TWIN NOVA DRONES", desc: "2 drones + periodic nova burst" },
  { id: "magnet", name: "LOOT MAGNET", desc: "Pickups pull in faster" },
  { id: "cooldownCut", name: "COOLANT CORE", desc: "Special recharges faster" },
  { id: "bulletSpeed", name: "OVERCHARGE", desc: "Player shots fly faster" },
  { id: "scoreBoost", name: "SCORE RELIC", desc: "+15% score permanently" },
  { id: "maxLife", name: "LIFE CAPSULE", desc: "Raise max lives by 1 (cap 7)" },
];
export const CLUSTER_TORPEDO_CD = 3;
export const DRONE_FIRE_CD = 1.2;
export const DRONE_SPECIAL_CD = 5;
export const SPECIAL_CD = 10;
export const COMBO_WINDOW = 1.5;
export const SAVE_KEY = "spaceShuttles_v1";
export const SHIPS = [
  { id: "ice", name: "ICE WARDEN", unlockLevel: 0, speed: 300, fireMul: 1, armorBonus: 1, hasSpecial: false, desc: "Starter hull, +1 armor plate" },
  { id: "rift", name: "RIFT RUNNER", unlockLevel: 1, speed: 360, fireMul: 0.88, armorBonus: 0, hasSpecial: true, desc: "Fast mover, quicker fire · pulse special" },
  { id: "ember", name: "EMBER FANG", unlockLevel: 2, speed: 310, fireMul: 1, armorBonus: 0, hasSpecial: true, desc: "Special: fire nova" },
  { id: "tide", name: "TIDE NEEDLE", unlockLevel: 3, speed: 330, fireMul: 1.1, armorBonus: 0, hasSpecial: true, desc: "Piercing special lance" },
  { id: "overmind", name: "OVERMIND HULL", unlockLevel: 5, speed: 300, fireMul: 0.95, armorBonus: 1, hasSpecial: true, desc: "Tank + stronger drones · shield pulse" },
  { id: "nova", name: "NOVA RAZOR", unlockLevel: 7, speed: 340, fireMul: 0.92, armorBonus: 0, hasSpecial: true, desc: "Late unlock: swift striker · fan special" },
  { id: "apex", name: "APEX PHANTOM", unlockLevel: 9, speed: 350, fireMul: 0.9, armorBonus: 1, hasSpecial: true, desc: "Final unlock: speed + armor · shield pulse" },
  {
    id: "aegis",
    name: "AEGIS VEIL",
    unlockLevel: 0,
    custom: true,
    speed: 365,
    fireMul: 0.98,
    armorBonus: 2,
    hasSpecial: true,
    desc: "Owner hull — veil clear + shield",
  },
];

// Dev-only: append only when URL has ?god=1 (never on normal laptop/phone/Vercel)
export const GOD_SHIP = {
  id: "god",
  name: "GOD CORE",
  unlockLevel: 0,
  debug: true,
  speed: 420,
  fireMul: 0.42,
  armorBonus: 20,
  hasSpecial: true,
  desc: "Dev ship: all upgrades, 99 lives, god special",
};
// Stackable gear: shop shows the NEXT tier if you already own the base
export const STACK_UPGRADES = {
  twin: [
    { name: "TWIN CANNONS", desc: "Permanent dual shot", cost: 0 },
    { name: "TRIPLE CANNON", desc: "Upgrade: permanent triple spread", cost: 140 },
  ],
  cluster: [
    { name: "CLUSTER TORPEDO", desc: "Auto cluster every 3s", cost: 120 },
    { name: "CLUSTER BARRAGE", desc: "Upgrade: cluster every 2s", cost: 145 },
    { name: "CLUSTER STORM", desc: "Upgrade: cluster every 1.4s", cost: 170 },
  ],
  armor: [
    { name: "PLATED HULL", desc: "Absorb 2 hits", cost: 120 },
    { name: "REINFORCED PLATING", desc: "Upgrade: +2 armor plates", cost: 140 },
    { name: "FORTRESS HULL", desc: "Upgrade: +2 armor plates", cost: 160 },
  ],
  drone: [
    { name: "TWIN NOVA DRONES", desc: "2 companion drones", cost: 150 },
    { name: "DRONE OVERCLOCK", desc: "Upgrade: faster fire & nova", cost: 165 },
    { name: "DRONE SWARM", desc: "Upgrade: 3rd drone + stronger nova", cost: 185 },
  ],
  magnet: [
    { name: "LOOT MAGNET", desc: "Pickups pull in faster", cost: 90 },
    { name: "DEEP MAGNET", desc: "Upgrade: stronger pickup pull", cost: 115 },
  ],
  cooldownCut: [
    { name: "COOLANT CORE", desc: "Special recharges faster", cost: 100 },
    { name: "COOLANT PRIME", desc: "Upgrade: special even faster", cost: 130 },
  ],
  bulletSpeed: [
    { name: "OVERCHARGE", desc: "Player shots fly faster", cost: 95 },
    { name: "HYPERCHARGE", desc: "Upgrade: shots much faster", cost: 125 },
  ],
  scoreBoost: [{ name: "SCORE RELIC", desc: "+15% score permanently", cost: 110 }],
};

export const SHOP_POOL = [
  { id: "life", name: "+1 LIFE", desc: "Gain one life", cost: 80 },
  { id: "repair", name: "ARMOR REPAIR", desc: "Refill armor plates", cost: 60 },
  { id: "rapidStart", name: "RAPID CHARGE", desc: "Start next level with rapid", cost: 70 },
  { id: "shieldStart", name: "SHIELD CHARGE", desc: "Start next level with shield", cost: 75 },
  { id: "maxLife", name: "LIFE CAPSULE", desc: "Raise max lives by 1 (cap 7)", cost: 130 },
];

export const ACHIEVEMENTS = {
  firstBlood: { id: "firstBlood", name: "FIRST BLOOD", desc: "Destroy your first enemy" },
  clear1: { id: "clear1", name: "ICE BREAKER", desc: "Clear level 1" },
  noHitBoss: { id: "noHitBoss", name: "GHOST PROTOCOL", desc: "Beat a boss without taking a hit" },
  noPickup: { id: "noPickup", name: "PURE SKILL", desc: "Clear a level with no pickups" },
  combo20: { id: "combo20", name: "CHAIN REACTION", desc: "Reach combo x20" },
  allShips: { id: "allShips", name: "FLEET MASTER", desc: "Unlock every ship" },
  clear10: { id: "clear10", name: "HORIZON WALKER", desc: "Clear Final Horizon" },
  nearMiss50: { id: "nearMiss50", name: "THREAD THE NEEDLE", desc: "Score 50 near-misses in a run" },
  eliteHunter: { id: "eliteHunter", name: "ELITE HUNTER", desc: "Destroy 10 elite foes in a run" },
  challengeWin: { id: "challengeWin", name: "DAILY PILOT", desc: "Reach wave 10 in Daily Challenge" },
};

export const LEVELS = [
  {
    name: "Ice Nebula",
    theme: {
      style: "ice",
      top: "#030914",
      mid: "#071833",
      bot: "#0a2a4a",
      starHue: 205,
      nebulae: [
        { x: 0.2, y: 0.25, r: 190, c: "80, 160, 255", a: 0.1 },
        { x: 0.75, y: 0.5, r: 210, c: "40, 120, 220", a: 0.08 },
        { x: 0.45, y: 0.15, r: 140, c: "160, 220, 255", a: 0.07 },
      ],
      planet: { x: 0.82, y: 0.18, c0: "#8ec8ff", c1: "#2a5a9a", c2: "#0d2038" },
    },
    waves: [
      { count: 7, interval: 0.58, speedMul: 1.0, weights: [0.7, 0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { count: 8, interval: 0.52, speedMul: 1.03, weights: [0.6, 0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { count: 9, interval: 0.48, speedMul: 1.06, weights: [0.55, 0.45, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ],
    boss: {
      id: "glacier",
      lore: "Ice that remembers every hull it cracked.",
      name: "GLACIER-1",
      hp: 70,
      speed: 140,
      cooldown: 1.45,
      modes: ["frostLance", "iceFan", "frostRing"],
      silhouette: 0,
      colors: ["#8ec8ff", "#3de0ff", "#1a6f9a"],
    },
  },
  {
    name: "Violet Rift",
    theme: {
      style: "rift",
      top: "#0a0414",
      mid: "#1a0a2e",
      bot: "#2a1048",
      starHue: 280,
      nebulae: [
        { x: 0.25, y: 0.3, r: 200, c: "140, 60, 220", a: 0.11 },
        { x: 0.7, y: 0.55, r: 220, c: "90, 40, 180", a: 0.09 },
        { x: 0.5, y: 0.12, r: 150, c: "200, 120, 255", a: 0.07 },
      ],
      planet: { x: 0.15, y: 0.22, c0: "#d4b3ff", c1: "#6a3aad", c2: "#1a0a30" },
    },
    waves: [
      { count: 8, interval: 0.5, speedMul: 1.05, weights: [0.4, 0.35, 0.25, 0, 0, 0, 0, 0, 0, 0, 0] },
      { count: 9, interval: 0.45, speedMul: 1.08, weights: [0.35, 0.3, 0.35, 0, 0, 0, 0, 0, 0, 0, 0] },
      { count: 10, interval: 0.42, speedMul: 1.1, weights: [0.3, 0.3, 0.4, 0, 0, 0, 0, 0, 0, 0, 0] },
    ],
    boss: {
      id: "void",
      lore: "It stitches space shut around your ship.",
      name: "VOID WEAVER",
      hp: 90,
      speed: 155,
      cooldown: 1.35,
      modes: ["weaveSpiral", "voidPortals", "riftCluster"],
      silhouette: 1,
      colors: ["#d4b3ff", "#7c4dff", "#3a1a78"],
    },
  },
  {
    name: "Ember Fields",
    theme: {
      style: "ember",
      top: "#120505",
      mid: "#2a0e0a",
      bot: "#3a1810",
      starHue: 25,
      nebulae: [
        { x: 0.3, y: 0.28, r: 200, c: "255, 80, 40", a: 0.1 },
        { x: 0.72, y: 0.6, r: 230, c: "220, 100, 30", a: 0.09 },
        { x: 0.5, y: 0.18, r: 140, c: "255, 180, 60", a: 0.06 },
      ],
      planet: { x: 0.8, y: 0.2, c0: "#ffb070", c1: "#a04020", c2: "#301008" },
    },
    waves: [
      { count: 8, interval: 0.46, speedMul: 1.08, weights: [0.3, 0.25, 0.25, 0.2, 0, 0, 0, 0, 0, 0, 0] },
      { count: 9, interval: 0.42, speedMul: 1.12, weights: [0.25, 0.25, 0.25, 0.25, 0, 0, 0, 0, 0, 0, 0] },
      { count: 10, interval: 0.38, speedMul: 1.15, weights: [0.2, 0.2, 0.3, 0.3, 0, 0, 0, 0, 0, 0, 0] },
    ],
    boss: {
      id: "cinder",
      lore: "A furnace with a crown of ash.",
      name: "CINDER LORD",
      hp: 110,
      speed: 175,
      cooldown: 1.25,
      modes: ["fireRain", "chargeDive", "emberBurst"],
      silhouette: 2,
      colors: ["#ff8a3d", "#ff4d6d", "#a32010"],
    },
  },
  {
    name: "Cyan Drift",
    theme: {
      style: "cyan",
      top: "#021416",
      mid: "#063038",
      bot: "#0a4850",
      starHue: 175,
      nebulae: [
        { x: 0.22, y: 0.32, r: 200, c: "40, 220, 200", a: 0.1 },
        { x: 0.78, y: 0.5, r: 210, c: "20, 160, 180", a: 0.09 },
        { x: 0.48, y: 0.14, r: 150, c: "120, 255, 230", a: 0.07 },
      ],
      planet: { x: 0.18, y: 0.7, c0: "#7ff0e0", c1: "#1a7a70", c2: "#062828" },
    },
    waves: [
      { count: 9, interval: 0.42, speedMul: 1.12, weights: [0.2, 0.2, 0.2, 0.15, 0.25, 0, 0, 0, 0, 0, 0] },
      { count: 10, interval: 0.38, speedMul: 1.16, weights: [0.15, 0.2, 0.2, 0.15, 0.3, 0, 0, 0, 0, 0, 0] },
      { count: 11, interval: 0.35, speedMul: 1.2, weights: [0.15, 0.15, 0.2, 0.2, 0.3, 0, 0, 0, 0, 0, 0] },
    ],
    boss: {
      id: "aqua",
      lore: "Pressure and poison in the same sting.",
      name: "AQUA STING",
      hp: 130,
      speed: 185,
      cooldown: 1.2,
      modes: ["twinLance", "waveCrest", "stingSeek"],
      silhouette: 3,
      colors: ["#7ff0e0", "#2ec4b6", "#0a5a55"],
    },
  },
  {
    name: "Toxic Void",
    theme: {
      style: "toxic",
      top: "#040a02",
      mid: "#0e1a08",
      bot: "#142810",
      starHue: 110,
      nebulae: [
        { x: 0.28, y: 0.3, r: 210, c: "80, 220, 60", a: 0.1 },
        { x: 0.7, y: 0.58, r: 230, c: "40, 140, 40", a: 0.09 },
        { x: 0.5, y: 0.16, r: 160, c: "180, 255, 80", a: 0.07 },
      ],
      planet: { x: 0.84, y: 0.28, c0: "#b8ff6a", c1: "#3a8a20", c2: "#0c2008" },
    },
    waves: [
      { count: 10, interval: 0.38, speedMul: 1.18, weights: [0.12, 0.15, 0.18, 0.15, 0.2, 0.2, 0, 0, 0, 0, 0] },
      { count: 11, interval: 0.34, speedMul: 1.22, weights: [0.1, 0.12, 0.18, 0.18, 0.2, 0.22, 0, 0, 0, 0, 0] },
      { count: 12, interval: 0.3, speedMul: 1.26, weights: [0.1, 0.1, 0.15, 0.2, 0.2, 0.25, 0, 0, 0, 0, 0] },
    ],
    boss: {
      id: "overmind",
      lore: "A hive that thinks in lasers.",
      name: "OVERMIND X",
      hp: 160,
      speed: 195,
      cooldown: 1.1,
      modes: ["summon", "toxicCross", "toxicSpiral", "overmindRage"],
      silhouette: 4,
      colors: ["#b8ff6a", "#6adf3a", "#2a6a18"],
    },
  },
  {
    name: "Solar Forge",
    theme: {
      style: "solar",
      top: "#120805",
      mid: "#2a1408",
      bot: "#3a200c",
      starHue: 35,
      nebulae: [
        { x: 0.28, y: 0.28, r: 210, c: "255, 140, 40", a: 0.11 },
        { x: 0.72, y: 0.55, r: 230, c: "220, 80, 20", a: 0.09 },
        { x: 0.5, y: 0.14, r: 150, c: "255, 200, 80", a: 0.07 },
      ],
      planet: { x: 0.78, y: 0.2, c0: "#ffc070", c1: "#b04818", c2: "#301008" },
    },
    waves: [
      { count: 11, interval: 0.36, speedMul: 1.22, weights: [0.08, 0.1, 0.14, 0.14, 0.16, 0.16, 0.22, 0, 0, 0, 0] },
      { count: 12, interval: 0.32, speedMul: 1.26, weights: [0.06, 0.08, 0.12, 0.14, 0.16, 0.16, 0.28, 0, 0, 0, 0] },
      { count: 13, interval: 0.28, speedMul: 1.3, weights: [0.05, 0.08, 0.1, 0.12, 0.15, 0.15, 0.35, 0, 0, 0, 0] },
    ],
    boss: {
      id: "forge",
      lore: "Solar iron bent into will.",
      name: "HELIOS FORGE",
      hp: 180,
      speed: 205,
      cooldown: 1.05,
      modes: ["fireRain", "emberBurst", "chargeDive", "frostRing"],
      silhouette: 5,
      colors: ["#ffc070", "#ff6a20", "#8a2808"],
    },
  },
  {
    name: "Echo Fracture",
    theme: {
      style: "cascade",
      top: "#080612",
      mid: "#16102a",
      bot: "#241848",
      starHue: 265,
      nebulae: [
        { x: 0.24, y: 0.3, r: 210, c: "160, 80, 255", a: 0.11 },
        { x: 0.74, y: 0.52, r: 220, c: "80, 40, 180", a: 0.09 },
        { x: 0.48, y: 0.14, r: 150, c: "220, 140, 255", a: 0.07 },
      ],
      planet: { x: 0.16, y: 0.24, c0: "#e0b8ff", c1: "#7030b0", c2: "#180828" },
    },
    waves: [
      { count: 12, interval: 0.34, speedMul: 1.28, weights: [0.05, 0.06, 0.1, 0.12, 0.14, 0.14, 0.14, 0.25, 0, 0, 0] },
      { count: 13, interval: 0.3, speedMul: 1.32, weights: [0.04, 0.05, 0.08, 0.1, 0.12, 0.14, 0.14, 0.33, 0, 0, 0] },
      { count: 14, interval: 0.26, speedMul: 1.36, weights: [0.04, 0.04, 0.08, 0.1, 0.12, 0.12, 0.12, 0.38, 0, 0, 0] },
    ],
    boss: {
      id: "cascade",
      lore: "Echoes of timelines that failed.",
      name: "RIFT CASCADE",
      hp: 200,
      speed: 215,
      cooldown: 1.0,
      modes: ["weaveSpiral", "voidPortals", "riftCluster", "stingSeek", "summon"],
      silhouette: 6,
      colors: ["#e0b8ff", "#a050ff", "#401878"],
    },
  },
  {
    name: "Omega Gate",
    theme: {
      style: "omega",
      top: "#04060c",
      mid: "#0c1018",
      bot: "#141820",
      starHue: 210,
      nebulae: [
        { x: 0.3, y: 0.28, r: 220, c: "100, 140, 220", a: 0.1 },
        { x: 0.7, y: 0.55, r: 230, c: "180, 80, 120", a: 0.08 },
        { x: 0.5, y: 0.12, r: 160, c: "220, 220, 255", a: 0.06 },
      ],
      planet: { x: 0.82, y: 0.26, c0: "#d0d8ff", c1: "#4050a0", c2: "#0c1020" },
    },
    waves: [
      { count: 10, interval: 0.32, speedMul: 1.34, weights: [0.04, 0.05, 0.08, 0.1, 0.12, 0.12, 0.12, 0.12, 0.25, 0, 0] },
      { count: 11, interval: 0.28, speedMul: 1.38, weights: [0.03, 0.04, 0.06, 0.08, 0.1, 0.12, 0.12, 0.12, 0.33, 0, 0] },
      { count: 12, interval: 0.25, speedMul: 1.42, weights: [0.03, 0.03, 0.06, 0.08, 0.1, 0.1, 0.1, 0.12, 0.38, 0, 0] },
    ],
    boss: {
      id: "omega",
      lore: "The gate does not open. It judges.",
      name: "OMEGA GATEKEEPER",
      hp: 230,
      speed: 225,
      cooldown: 0.95,
      modes: ["toxicSpiral", "twinLance", "fireRain", "voidPortals", "overmindRage", "summon"],
      silhouette: 7,
      colors: ["#d0d8ff", "#70a0ff", "#203060"],
    },
  },
  {
    name: "Ash Mirage",
    theme: {
      style: "ash",
      top: "#0c0806",
      mid: "#1a120c",
      bot: "#281a10",
      starHue: 20,
      nebulae: [
        { x: 0.26, y: 0.3, r: 210, c: "180, 100, 60", a: 0.1 },
        { x: 0.72, y: 0.52, r: 230, c: "120, 60, 40", a: 0.09 },
        { x: 0.48, y: 0.14, r: 150, c: "220, 160, 100", a: 0.06 },
      ],
      planet: { x: 0.2, y: 0.22, c0: "#e0a070", c1: "#804020", c2: "#201008" },
    },
    waves: [
      { count: 11, interval: 0.3, speedMul: 1.4, weights: [0.03, 0.04, 0.06, 0.08, 0.1, 0.1, 0.1, 0.1, 0.12, 0.27, 0] },
      { count: 12, interval: 0.27, speedMul: 1.44, weights: [0.02, 0.03, 0.05, 0.07, 0.08, 0.1, 0.1, 0.1, 0.12, 0.33, 0] },
      { count: 13, interval: 0.24, speedMul: 1.48, weights: [0.02, 0.03, 0.04, 0.06, 0.08, 0.08, 0.1, 0.1, 0.11, 0.38, 0] },
    ],
    boss: {
      id: "mirage",
      lore: "An unknown threat rises.",
      name: "ASH MIRAGE",
      hp: 255,
      speed: 235,
      cooldown: 0.9,
      modes: ["fireRain", "emberBurst", "chargeDive", "stingSeek", "waveCrest"],
      silhouette: 8,
      colors: ["#e0a070", "#ff7040", "#602010"],
    },
  },
  {
    name: "Final Horizon",
    theme: {
      style: "final",
      top: "#02040a",
      mid: "#080c18",
      bot: "#101828",
      starHue: 195,
      nebulae: [
        { x: 0.28, y: 0.26, r: 230, c: "80, 160, 255", a: 0.1 },
        { x: 0.7, y: 0.55, r: 240, c: "200, 80, 180", a: 0.08 },
        { x: 0.5, y: 0.12, r: 170, c: "255, 255, 255", a: 0.05 },
      ],
      planet: { x: 0.78, y: 0.2, c0: "#f0f4ff", c1: "#6080c0", c2: "#101828" },
    },
    waves: [
      { count: 9, interval: 0.34, speedMul: 1.48, weights: [0.02, 0.03, 0.04, 0.06, 0.08, 0.08, 0.08, 0.1, 0.1, 0.12, 0.29] },
      { count: 10, interval: 0.3, speedMul: 1.52, weights: [0.02, 0.02, 0.04, 0.05, 0.06, 0.08, 0.08, 0.1, 0.1, 0.12, 0.33] },
      { count: 11, interval: 0.28, speedMul: 1.56, weights: [0.01, 0.02, 0.03, 0.05, 0.06, 0.06, 0.08, 0.08, 0.1, 0.12, 0.39] },
    ],
    boss: {
      id: "horizon",
      lore: "The last light before the map ends.",
      name: "HORIZON CROWN",
      hp: 280,
      speed: 245,
      cooldown: 0.85,
      modes: ["frostRing", "weaveSpiral", "toxicSpiral", "twinLance", "overmindRage", "summon", "riftCluster"],
      silhouette: 9,
      colors: ["#f0f4ff", "#80c0ff", "#304878"],
    },
  },
];

export const PICKUP_TYPES = ["double", "rapid", "shield", "life"];
export const PICKUP_COLORS = {
  double: "#3de0ff",
  rapid: "#ff8a3d",
  shield: "#ffd166",
  life: "#ff4d6d",
};
export const PICKUP_GLOW = {
  double: "61, 224, 255",
  rapid: "255, 138, 61",
  shield: "255, 209, 102",
  life: "255, 77, 109",
};
export const PICKUP_LABELS = {
  double: "x2",
  rapid: "RAPID",
  shield: "SHIELD",
  life: "+1",
};
