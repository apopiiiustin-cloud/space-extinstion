// Play-session recorder (frames + JPEG shots + export)

const REC_FRAME_MS = 100;
const REC_SHOT_MS = 1000;
const REC_MAX_FRAMES = 6000;
const REC_MAX_SHOTS = 45;
const REC_SHOT_W = 320;

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   W: number,
 *   H: number,
 *   recBtn: HTMLElement | null,
 *   recBadge: HTMLElement | null,
 *   getRunning: () => boolean,
 *   getPlayer: () => any,
 *   getKeys: () => Set<string>,
 *   getTouchFiring: () => boolean,
 *   getPhase: () => string,
 *   getLevel: () => number,
 *   getWave: () => number,
 *   getScore: () => number,
 *   getLives: () => number,
 *   getCombo: () => number,
 *   getCredits: () => number,
 *   getSpecialCd: () => number,
 *   getEnemies: () => any[],
 *   getBullets: () => any[],
 *   getBoss: () => any,
 *   getSelectedShipId: () => string,
 *   getStartLevel: () => number,
 *   showToast: (text: string) => void,
 *   sfx: (name: string) => void,
 * }} deps
 */
export function createRecorder(deps) {
  let recording = false;
  let recordArmed = false;
  let playSession = null;
  let lastRecFrameAt = 0;
  let lastRecShotAt = 0;
  let recShotCanvas = null;
  let recShotCtx = null;

  function updateRecUi() {
    if (deps.recBtn) {
      deps.recBtn.textContent = recording || recordArmed ? "REC ON" : "REC OFF";
      deps.recBtn.classList.toggle("recording", recording || recordArmed);
    }
    if (deps.recBadge) deps.recBadge.classList.toggle("hidden", !recording);
  }

  function createPlaySession() {
    return {
      version: 1,
      startedAt: Date.now(),
      endedAt: null,
      ship: deps.getSelectedShipId(),
      startLevel: deps.getStartLevel(),
      frames: [],
      shots: [],
      events: [],
    };
  }

  function pushRecEvent(type, data = {}) {
    if (!recording || !playSession) return;
    playSession.events.push({ t: performance.now(), type, ...data });
  }

  function startRecording(fromArm = false) {
    recording = true;
    recordArmed = false;
    playSession = createPlaySession();
    lastRecFrameAt = 0;
    lastRecShotAt = 0;
    window.__playSession = playSession;
    updateRecUi();
    deps.showToast(fromArm ? "REC ARMED → RECORDING" : "RECORDING");
    pushRecEvent("recStart");
  }

  function stopRecording() {
    if (!recording) {
      recordArmed = false;
      updateRecUi();
      return;
    }
    recording = false;
    if (playSession) {
      playSession.endedAt = Date.now();
      window.__playSession = playSession;
      try {
        const light = {
          ...playSession,
          shots: playSession.shots.map((s) => ({ t: s.t, w: s.w, h: s.h, file: s.file })),
        };
        localStorage.setItem(
          "spaceShuttles_lastSessionMeta",
          JSON.stringify({
            startedAt: playSession.startedAt,
            endedAt: playSession.endedAt,
            frames: playSession.frames.length,
            shots: playSession.shots.length,
            ship: playSession.ship,
            startLevel: playSession.startLevel,
          })
        );
        // keep meta only in LS; full session stays on window.__playSession
        void light;
      } catch (_) {}
    }
    updateRecUi();
    deps.showToast("REC STOPPED — EXPORT SESSION");
  }

  function toggleRecording() {
    if (recording) stopRecording();
    else if (!deps.getRunning()) {
      recordArmed = !recordArmed;
      updateRecUi();
      deps.showToast(recordArmed ? "REC ARMED (starts with mission)" : "REC OFF");
    } else {
      startRecording(false);
    }
    deps.sfx("ui");
  }

  function captureRecFrame(now) {
    const player = deps.getPlayer();
    if (!recording || !playSession || !player) return;
    if (now - lastRecFrameAt < REC_FRAME_MS) return;
    if (playSession.frames.length >= REC_MAX_FRAMES) return;
    lastRecFrameAt = now;
    const keyList = [];
    for (const k of deps.getKeys()) keyList.push(k);
    const boss = deps.getBoss();
    playSession.frames.push({
      t: Math.round(now),
      phase: deps.getPhase(),
      level: deps.getLevel(),
      wave: deps.getWave(),
      score: deps.getScore(),
      lives: deps.getLives(),
      combo: deps.getCombo(),
      credits: deps.getCredits(),
      x: Math.round(player.x),
      y: Math.round(player.y),
      keys: keyList.slice(0, 12),
      fire: !!(deps.getKeys().has(" ") || deps.getKeys().has("Space") || deps.getTouchFiring()),
      specialCd: Math.round(deps.getSpecialCd() * 10) / 10,
      enemies: deps.getEnemies().length,
      bullets: deps.getBullets().length,
      boss: boss
        ? {
            id: boss.id,
            hp: Math.round(boss.hp),
            maxHp: boss.maxHp,
            x: Math.round(boss.x),
            y: Math.round(boss.y),
            mode: boss.mode,
            phase2: !!boss.phase2,
          }
        : null,
    });
  }

  function captureRecShot(now) {
    if (!recording || !playSession) return;
    if (now - lastRecShotAt < REC_SHOT_MS) return;
    if (playSession.shots.length >= REC_MAX_SHOTS) return;
    lastRecShotAt = now;
    try {
      if (!recShotCanvas) {
        recShotCanvas = document.createElement("canvas");
        recShotCanvas.width = REC_SHOT_W;
        recShotCanvas.height = Math.round((deps.H / deps.W) * REC_SHOT_W);
        recShotCtx = recShotCanvas.getContext("2d");
        recShotCtx.imageSmoothingEnabled = false;
      }
      recShotCtx.clearRect(0, 0, recShotCanvas.width, recShotCanvas.height);
      recShotCtx.drawImage(deps.canvas, 0, 0, recShotCanvas.width, recShotCanvas.height);
      const dataUrl = recShotCanvas.toDataURL("image/jpeg", 0.55);
      const idx = playSession.shots.length + 1;
      const file = `play-shot-${playSession.startedAt}-${String(idx).padStart(3, "0")}.jpg`;
      playSession.shots.push({
        t: Math.round(now),
        w: recShotCanvas.width,
        h: recShotCanvas.height,
        file,
        dataUrl,
        phase: deps.getPhase(),
        level: deps.getLevel(),
        score: deps.getScore(),
      });
    } catch (err) {
      console.warn("rec shot failed", err);
    }
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportPlaySession() {
    if (recording) stopRecording();
    const session = playSession || window.__playSession;
    if (!session || (!session.frames.length && !session.shots.length)) {
      deps.showToast("NO SESSION TO EXPORT");
      return;
    }
    const stamp = session.startedAt || Date.now();
    const jsonBody = {
      version: session.version,
      startedAt: session.startedAt,
      endedAt: session.endedAt || Date.now(),
      ship: session.ship,
      startLevel: session.startLevel,
      frameCount: session.frames.length,
      shotCount: session.shots.length,
      events: session.events,
      frames: session.frames,
      shots: session.shots.map((s) => ({
        t: s.t,
        w: s.w,
        h: s.h,
        file: s.file,
        phase: s.phase,
        level: s.level,
        score: s.score,
      })),
    };
    downloadBlob(
      `play-session-${stamp}.json`,
      new Blob([JSON.stringify(jsonBody, null, 2)], { type: "application/json" })
    );
    session.shots.forEach((s, i) => {
      const bin = atob(s.dataUrl.split(",")[1] || "");
      const bytes = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      setTimeout(() => {
        downloadBlob(
          s.file || `play-shot-${stamp}-${String(i + 1).padStart(3, "0")}.jpg`,
          new Blob([bytes], { type: "image/jpeg" })
        );
      }, 120 * (i + 1));
    });
    deps.showToast(`EXPORTED ${session.frames.length}f / ${session.shots.length} shots`);
    deps.sfx("ui");
  }

  function tickPlayRecorder(now) {
    if (!recording) return;
    captureRecFrame(now);
    captureRecShot(now);
  }

  function maybeStartFromArm() {
    if (recordArmed || recording) startRecording(!!recordArmed);
  }

  return {
    updateRecUi,
    pushRecEvent,
    startRecording,
    stopRecording,
    toggleRecording,
    exportPlaySession,
    tickPlayRecorder,
    maybeStartFromArm,
    get recording() {
      return recording;
    },
    get recordArmed() {
      return recordArmed;
    },
  };
}
