---
name: Make game cooler (desktop)
overview: Plan pe faze ca să facem Space Shuttles mai fain — audio, boss intros, ending, challenge runs, gameplay depth, juice și meta — fără focus pe telefon / PWA / touch.
todos:
  - id: phase-0-foundation
    content: "Faza 0: curățare debug fetch, deploy Vercel stabil, versiune/cache clară"
    status: pending
  - id: phase-1-audio
    content: "Faza 1: SFX pack, music loops, ducking, volume slider + mute persist"
    status: pending
  - id: phase-2-boss-ending
    content: "Faza 2: boss intros lore + ending L10 cu medalii/cosmetic"
    status: pending
  - id: phase-3-challenge
    content: "Faza 3: Challenge/Daily run local + bestChallenge în save"
    status: pending
  - id: phase-4-gameplay
    content: "Faza 4: elites, near-miss, perfect wave, secret bonus wave, hold-focus fire"
    status: pending
  - id: phase-5-juice
    content: "Faza 5: hit-stop, flash, trails combo, shake profilat, pickup suck"
    status: pending
  - id: phase-6-meta
    content: "Faza 6: achievements panel, codex boss/nave, statistici run"
    status: pending
isProject: false
---

# Plan: Space Shuttles — mai fain (desktop)

## Context
Jocul are deja 10 nivele, shop cu upgrade-uri stackabile, nave (inclusiv Aegis), bossi unici, pickups, combo, REC. Vrem adâncime și polish pe **desktop**, nu pe mobile.

## Out of scope (explicit)
- PWA / Add to Home Screen
- Touch polish / pause pe HUD mobil
- Optimizări dedicate doar telefon
- Multiplayer, conturi, leaderboard online
- +10 nivele noi fără gameplay nou

## Faza 0 — Fundație
- Scoate leftover `fetch` debug din [`game.js`](game.js)
- Deploy Vercel stabil (claim/login) pentru share pe browser
- Cache-bust / versiune clară în [`index.html`](index.html)

**Done:** run curat, fără spam pe `127.0.0.1`, link de play actualizat.

## Faza 1 — Audio (impact maxim)
1. SFX: hit, kill, pickup, hurt, shop buy, level clear, boss warn
2. Music: loop campanie + loop boss; mute pe `M` păstrat
3. Ducking: muzica coboară la boss / special
4. Volume slider în meniu, salvat în `localStorage`

**Fișiere:** [`game.js`](game.js), [`index.html`](index.html), [`style.css`](style.css), optional `assets/audio/`

**Done:** mute + volume persistă; boss sună diferit de fleet.

## Faza 2 — Boss intros + ending L10
1. Intro boss 1.5–2.5s: fade, nume, siluetă, o linie lore per `boss.id`
2. Skip cu Space / click
3. Ending Final Horizon: score, best combo, medalii (no-hit boss, no-pickup, full ships)
4. Unlock cosmetic (trail / tint) la clear L10

**Fișiere:** [`game.js`](game.js) (`spawnBoss`, `endGame`, `drawBanners`), lore pe `LEVELS[].boss`

**Done:** fiecare boss are intro; L10 nu se termină în overlay generic.

## Faza 3 — Challenge / Daily run
1. Buton **CHALLENGE** în meniu
2. Reguli rotative sau daily seed din dată (ex. start L5, 3 lives, no shop, ship locked)
3. `bestChallenge` separat în save
4. Ecran local „azi vs best” (fără server)

**Fișiere:** [`game.js`](game.js), [`index.html`](index.html)

**Done:** poți termina un challenge și vezi best salvat.

## Faza 4 — Gameplay depth
| Feature | Detaliu |
|---------|---------|
| Elite enemies | 10–15% pe wave mid/late; HP×2; glow; drop garantat |
| Near-miss | Glonț la 18–28px de navă → scor mic + spark; cap/sec |
| Perfect wave | Wave fără damage → banner + credits/scor |
| Secret bonus wave | După 2 perfect waves → val scurt, scor ×2 |
| Hold-focus fire | Hold Fire = beam îngust/tare (Tide/Aegis); tap = normal |

**Fișiere:** [`game.js`](game.js)

**Done:** elite + near-miss + perfect wave live.

## Faza 5 — Juice vizual
1. Hit-stop scurt la kill elite / boss chunk
2. Flash 1–2 frame la hurt / special
3. Trails mai lungi la combo ≥10
4. Shake profilat (mic hit, mare boss down)
5. Pickup collect „suck” animation

**Fișiere:** [`game.js`](game.js)

**Done:** combo mare se simte diferit de combo 1.

## Faza 6 — Meta / colecție
1. Achievements panel în meniu (locked/unlocked)
2. Codex: bossi + nave văzute (sprite + text)
3. Statistici: time played, bosses no-hit, favorite ship

**Fișiere:** [`game.js`](game.js) (save schema), [`index.html`](index.html), [`style.css`](style.css)

**Done:** progresie vizibilă între run-uri.

## Ordine recomandată
```
S1: Faza 0 + Faza 1 (audio)
S2: Faza 2 (intros + ending)
S3: Faza 4 (elite + near-miss + perfect wave)
S4: Faza 5 (juice) + Faza 3 (challenge)
S5: Faza 6 (codex / achievements)
```

## Definition of done (jocul e „mai fain”)
- [ ] Sună bine (SFX + muzică)
- [ ] Bossii au prezență (intro)
- [ ] L10 are final
- [ ] Există motiv de replay (challenge)
- [ ] Combate are micro-skill (near-miss / perfect wave)
- [ ] Progresie vizibilă (achievements / codex)

## Reguli pe implementare
- O fază pe rând; verifică pe desktop după fiecare
- Nu adăuga scope mobil în aceste faze
- Păstrează stilul pixel / Orbitron existent
