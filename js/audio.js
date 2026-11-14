// Web Audio SFX + procedural music loops

/**
 * @param {{
 *   getMuted: () => boolean,
 *   getVolume: () => number,
 *   getSelectedShipId: () => string,
 * }} deps
 */
export function createAudio(deps) {
  let audioCtx = null;
  let masterGain = null;
  let sfxGainNode = null;
  let musicGainNode = null;
  let musicFilterNode = null;
  let musicNodes = null;
  let musicMode = "off"; // off | fleet | boss
  let musicDuckUntil = 0;
  let musicStep = 0;
  let musicNextNote = 0;
  let musicSchedId = 0;

  const sfxNext = Object.create(null);
  const SFX_GAP = {
    shoot: 0.05,
    hit: 0.04,
    explode: 0.06,
    pickup: 0.1,
    hurt: 0.12,
    warn: 0.25,
    upgrade: 0.2,
    ui: 0.08,
    special: 0.2,
    achieve: 0.25,
    near: 0.08,
    clear: 0.3,
    elite: 0.12,
  };

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      sfxGainNode = audioCtx.createGain();
      musicGainNode = audioCtx.createGain();
      musicFilterNode = audioCtx.createBiquadFilter();
      musicFilterNode.type = "lowpass";
      musicFilterNode.frequency.value = 1400;
      musicFilterNode.Q.value = 0.7;
      sfxGainNode.connect(masterGain);
      musicFilterNode.connect(musicGainNode);
      musicGainNode.connect(masterGain);
      masterGain.connect(audioCtx.destination);
      applyVolume();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function suspendAudio() {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === "running") audioCtx.suspend();
    } catch {
      /* ignore */
    }
  }

  function resumeAudio() {
    if (!audioCtx) return ensureAudio();
    try {
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch {
      /* ignore */
    }
    return audioCtx;
  }

  function applyVolume() {
    const muted = deps.getMuted();
    const vol = Math.max(0, Math.min(1, Number(deps.getVolume()) || 0.7));
    const v = muted ? 0 : vol;
    if (masterGain) masterGain.gain.value = v;
    if (sfxGainNode) sfxGainNode.gain.value = 0.75;
    if (musicGainNode && audioCtx) {
      const ducked = performance.now() / 1000 < musicDuckUntil;
      const target = ducked ? 0.28 : musicMode === "boss" ? 0.48 : 0.42;
      const now = audioCtx.currentTime;
      try {
        musicGainNode.gain.cancelScheduledValues(now);
        musicGainNode.gain.setTargetAtTime(target, now, 0.08);
      } catch {
        musicGainNode.gain.value = target;
      }
    }
    const slider = document.getElementById("volume-slider");
    if (slider && document.activeElement !== slider) slider.value = String(Math.round(vol * 100));
  }

  function duckMusic(sec = 0.6) {
    musicDuckUntil = performance.now() / 1000 + sec;
    applyVolume();
  }

  function tickDuck() {
    if (musicDuckUntil && performance.now() / 1000 > musicDuckUntil) {
      musicDuckUntil = 0;
      applyVolume();
    }
  }

  function midiToHz(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function stopMusic() {
    musicSchedId += 1;
    if (musicNodes) {
      for (const n of musicNodes) {
        try {
          if (typeof n.stop === "function") n.stop();
        } catch (_) {}
        try {
          n.disconnect();
        } catch (_) {}
      }
    }
    musicNodes = null;
    musicMode = "off";
    musicStep = 0;
    musicNextNote = 0;
  }

  function musicVoice(ac, when, freq, dur, type, peak, dest) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(dest);
    o.start(when);
    o.stop(when + dur + 0.03);
    o.onended = () => {
      try {
        o.disconnect();
        g.disconnect();
      } catch {
        /* ignore */
      }
    };
    return o;
  }

  function scheduleMusicBar(ac, id) {
    if (id !== musicSchedId || !musicNodes || deps.getMuted()) return;
    const dest = musicFilterNode || musicGainNode || ac.destination;
    const boss = musicMode === "boss";
    const bpm = boss ? 112 : 88;
    const stepSec = 60 / bpm / 4; // 16th notes
    const look = 0.35;
    const now = ac.currentTime;
    if (musicNextNote < now) musicNextNote = now + 0.02;

    // Fleet: A minor ambient · Boss: D minor drive
    const root = boss ? 50 : 57; // D3 / A3
    const bassPat = boss
      ? [0, null, 0, null, 3, null, 7, null, 0, null, 5, null, 3, null, 7, 10]
      : [0, null, null, 0, 7, null, null, 3, 0, null, 5, null, 7, null, 3, null];
    const arpPat = boss
      ? [12, 15, 19, 15, 12, 17, 19, 22, 12, 15, 19, 24, 22, 19, 17, 15]
      : [12, null, 15, null, 19, null, 15, null, 12, null, 17, null, 19, null, 24, null];
    const pad = boss ? [0, 3, 7, 10] : [0, 7, 12, 15];

    while (musicNextNote < now + look) {
      const step = musicStep % 16;
      const t = musicNextNote;

      if (step === 0 || step === 8) {
        if (musicFilterNode) {
          musicFilterNode.frequency.setTargetAtTime(boss ? 1800 : 1200, t, 0.05);
        }
        for (let i = 0; i < pad.length; i++) {
          musicVoice(
            ac,
            t,
            midiToHz(root + pad[i] - 12),
            stepSec * 7.5,
            "sine",
            boss ? 0.028 - i * 0.003 : 0.022 - i * 0.0025,
            dest
          );
        }
      }

      const b = bassPat[step];
      if (b != null) {
        musicVoice(ac, t, midiToHz(root + b - 12), stepSec * 1.6, boss ? "triangle" : "sine", boss ? 0.055 : 0.045, dest);
        if (boss && step % 4 === 0) {
          musicVoice(ac, t, midiToHz(root + b - 24), stepSec * 2.2, "triangle", 0.032, dest);
        }
      }

      const a = arpPat[step];
      if (a != null) {
        musicVoice(
          ac,
          t,
          midiToHz(root + a),
          stepSec * (boss ? 1.1 : 1.8),
          boss ? "triangle" : "sine",
          boss ? 0.038 : 0.028,
          dest
        );
      }

      // soft pulse click every quarter (very quiet, gives rhythm without harshness)
      if (step % 4 === 0) {
        musicVoice(ac, t, boss ? 180 : 140, 0.04, "sine", boss ? 0.02 : 0.014, dest);
      }

      musicStep += 1;
      musicNextNote += stepSec;
    }

    const delay = Math.max(40, (musicNextNote - ac.currentTime - 0.12) * 1000);
    setTimeout(() => scheduleMusicBar(ac, id), delay);
  }

  function startMusic(mode, resolveMode) {
    const want = mode || (typeof resolveMode === "function" ? resolveMode() : mode);
    if (!want || want === "off") {
      stopMusic();
      return;
    }
    if (musicMode === want && musicNodes) return;
    stopMusic();
    const ac = ensureAudio();
    if (!ac || deps.getMuted()) return;
    musicMode = want;
    musicNodes = [];
    musicStep = 0;
    musicNextNote = ac.currentTime + 0.05;
    const id = ++musicSchedId;
    // keep array truthy so stopMusic can cancel scheduler
    musicNodes.push({ disconnect() {}, stop() {} });
    if (musicFilterNode) {
      musicFilterNode.frequency.value = want === "boss" ? 1600 : 1100;
    }
    applyVolume();
    scheduleMusicBar(ac, id);
  }

  function playTone(freq, dur, type = "square", vol = 0.04, slide = 0) {
    if (deps.getMuted()) return;
    const ac = ensureAudio();
    if (!ac) return;
    try {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, ac.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ac.currentTime + dur);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.connect(g);
      g.connect(sfxGainNode || ac.destination);
      o.start();
      o.stop(ac.currentTime + dur + 0.02);
      o.onended = () => {
        try {
          o.disconnect();
          g.disconnect();
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* audio can fail under load */
    }
  }

  function sfx(name) {
    if (deps.getMuted()) return;
    const now = performance.now() / 1000;
    const gap = SFX_GAP[name] || 0.05;
    if (now < (sfxNext[name] || 0)) return;
    sfxNext[name] = now + gap;
    if (name === "shoot") {
      const shipId = deps.getSelectedShipId();
      const focusShip = shipId === "aegis" || shipId === "tide" || shipId === "apex";
      playTone(focusShip ? 520 : 660, 0.035, "square", focusShip ? 0.01 : 0.007, -220);
    } else if (name === "hit") playTone(180, 0.05, "triangle", 0.03, -80);
    else if (name === "explode") playTone(110, 0.12, "sawtooth", 0.04, -70);
    else if (name === "pickup") playTone(520, 0.08, "sine", 0.03, 260);
    else if (name === "hurt") playTone(90, 0.15, "sawtooth", 0.05, -50);
    else if (name === "warn") {
      playTone(200, 0.2, "square", 0.04, 120);
      playTone(140, 0.25, "sawtooth", 0.03, 80);
    } else if (name === "upgrade") playTone(440, 0.12, "sine", 0.04, 440);
    else if (name === "ui") playTone(360, 0.03, "triangle", 0.025);
    else if (name === "special") {
      duckMusic(0.8);
      playTone(280, 0.15, "sawtooth", 0.04, 200);
      playTone(420, 0.1, "square", 0.025, 160);
    } else if (name === "achieve") playTone(600, 0.1, "sine", 0.04, 300);
    else if (name === "near") playTone(880, 0.03, "sine", 0.015, 200);
    else if (name === "clear") {
      playTone(330, 0.12, "triangle", 0.035, 220);
      playTone(495, 0.16, "sine", 0.03, 180);
    } else if (name === "elite") playTone(160, 0.1, "sawtooth", 0.045, 90);
  }

  return {
    ensureAudio,
    suspendAudio,
    resumeAudio,
    applyVolume,
    duckMusic,
    tickDuck,
    stopMusic,
    startMusic,
    sfx,
    getMusicMode: () => musicMode,
  };
}
