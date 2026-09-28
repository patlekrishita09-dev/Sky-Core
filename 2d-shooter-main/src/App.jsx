import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

// --- WEB AUDIO API ENGINE ---
let actx = null;
const getAudioContext = () => {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  return actx;
};

const playSound = (type) => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

  if (type === 'shoot') {
    // Laser pulse
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  } else if (type === 'hit') {
    // Cyber zap
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(400, now + 0.03);
    osc.frequency.setValueAtTime(800, now + 0.06);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.12);
    osc.start(now); osc.stop(now + 0.12);
  } else if (type === 'miss') {
    // Static glitch
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.25);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.25);
    osc.start(now); osc.stop(now + 0.25);
  } else if (type === 'round_start') {
    // Boot-up beep sequence
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(660, now + 0.1);
    osc.frequency.setValueAtTime(880, now + 0.2);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.35);
    osc.start(now); osc.stop(now + 0.35);
  } else if (type === 'laugh') {
    // Glitchy alarm
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.15);
    osc.frequency.setValueAtTime(480, now + 0.2);
    osc.frequency.linearRampToValueAtTime(180, now + 0.4);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    osc.start(now); osc.stop(now + 0.5);
  }
};

// --- SPRITES (pixel art, 3px/cell) ---
const CELL = 3;

// Cyber Runner — hooded hacker sprinting across rooftops
const CYBER_RUNNER = [
  "....CCC.....",
  "...CPPPC....",
  "...CPWPC....",
  "...CCCCC....",
  "..NNCCCNN...",
  ".NNNCCCNNN..",
  "..NN.C.NN...",
  "...N.C.N....",
  "..NNN.NNN...",
  "..N.....N..."
];

// Mech Guard — heavy armored robot enemy
const MECH_GUARD = [
  "..RRRRRRR...",
  ".RRYYYYYY R.",
  ".RRYYYYYRR..",
  ".RRRRRRRRR..",
  "RRRWWWWWRRR.",
  "RRRWWWWWRRR.",
  ".RRRRRRRR...",
  "..RRR.RRR...",
  ".RRRR.RRRR..",
  ".RR.....RR.."
];

// Recon Drone — sleek surveillance drone
const RECON_DRONE = [
  "..P......P..",
  ".P.PPPPPP.P.",
  "P..PCCCCP..P",
  "PPPPCYYCP PP",
  "...PPPPPP..."
];

// Agent — cyber detective mascot
const AGENT_SPRITE = [
  "......PPPP......",
  ".....PPPPPP.....",
  ".....PWWWWP.....",
  ".....PPPPPP.....",
  "...NNNNNNNNNN...",
  "..NNNCCNNCCNNN..",
  "..NNNNCCCCNNNN..",
  "...NNNNCCNNNN...",
  "....NNN..NNN....",
  "....NN....NN...."
];

const PALETTES = {
  runner:  { C: '#00ffe7', P: '#1a0a2e', W: '#ffffff', N: '#0d0d1a' },
  mech:    { R: '#ff2d78', Y: '#ffe600', W: '#ffffff', N: '#1a0020' },
  drone:   { P: '#b400ff', C: '#1a0030', Y: '#00ffe7', W: '#ffffff' },
  agent:   { P: '#00ffe7', W: '#ffffff', N: '#0a0a1e', C: '#ff2d78' },
};

const drawGrid = (ctx, x, y, grid, palette, flip = false, scale = 1) => {
  const H = grid.length, W = grid[0].length;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.translate(-(W * CELL * scale) / 2, -(H * CELL * scale) / 2);
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const ch = grid[r][c];
      if (ch !== '.') {
        ctx.fillStyle = palette[ch];
        ctx.fillRect(c * CELL * scale, r * CELL * scale, CELL * scale, CELL * scale);
      }
    }
  }
  ctx.restore();
};

// --- CYBERPUNK TAUNTS ---
const MISS_TAUNTS = [
  "FIREWALL TOO SLOW, RUNNER!",
  "YOUR AIM IS CORRUPTED DATA.",
  "RECALIBRATE YOUR OPTICS!",
  "404: TARGET NOT FOUND.",
  "TRY AGAIN, STREET RAT.",
  "THAT SHOT NEEDS A PATCH.",
  "EVEN A TOASTER AIMS BETTER.",
  "SIGNAL LOST. BRAIN OFFLINE?",
  "NULL POINTER EXCEPTION: AIM.",
  "UPGRADE YOUR FIRMWARE, KID.",
  "LAGGING BEHIND THE TARGET!",
  "SYSTEM ERROR: ACCURACY LOW.",
  "YOUR NEURAL LINK IS GLITCHING.",
  "NICE TRY. THE CORP IS LAUGHING."
];

const GAME_OVER_TAUNTS = [
  "FLATLINED. THE CORP WINS TONIGHT.",
  "JACKED OUT. GAME OVER, CHOOM.",
  "YOUR DATA HAS BEEN WIPED.",
  "THE MEGACORP THANKS YOU FOR PLAYING.",
  "MISSION FAILED. RESPAWN IN 3... 2...",
  "YOUR IMPLANTS COULDN'T SAVE YOU.",
  "DELETED FROM THE NET. RIP.",
  "THE STREET WASN'T READY FOR YOU.",
  "BLACKLISTED BY EVERY FIXER IN TOWN.",
  "EVEN THE AI FELT BAD FOR YOU."
];

// --- GAME LOGIC ENGINE ---
class GameEngine {
  constructor(canvas, updateReactState, onFlash) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.updateReactState = updateReactState;
    this.onFlash = onFlash;

    this.W = 800; this.H = 450;
    this.canvas.width = this.W; this.canvas.height = this.H;

    this.state = 'MENU';
    this.mode = 1;

    this.score = 0;
    this.hiScore = parseInt(localStorage.getItem('cyberpunk_hi')) || 0;
    this.round = 1;
    this.ammo = 5;
    this.maxAmmo = 5;

    this.targets = [];
    this.particles = [];
    this.floatingTexts = [];
    this.history = new Array(10).fill('empty');
    this.targetsSpawned = 0;
    this.shotsFired = 0;
    this.currentCombo = 0;
    this.gameOverTaunt = '';
    this.waveEndScheduled = false;

    this.mascot = { active: false, y: this.H, type: 'idle', timer: 0 };

    // Pre-compute stable stars (fix: no more per-frame Math.random)
    this.stars = Array.from({ length: 60 }, (_, i) => ({
      x: (Math.sin(i * 743) * 0.5 + 0.5) * this.W,
      y: (Math.cos(i * 312) * 0.5 + 0.5) * (this.H * 0.55),
      size: Math.random() > 0.85 ? 2 : 1,
      bright: Math.random() > 0.6,
    }));

    // Hologram ad positions
    this.holoAds = [
      { x: 120, y: 200, w: 60, h: 80, color: '#00ffe7', label: 'ZION//NET' },
      { x: 560, y: 180, w: 70, h: 90, color: '#ff2d78', label: 'CYBERTEK' },
      { x: 340, y: 220, w: 55, h: 70, color: '#b400ff', label: 'NETRUN' },
    ];

    // Neon sign flicker state
    this.flickerTimer = 0;
    this.flickerState = [true, true, true];

    // Rain drops
    this.rainDrops = Array.from({ length: 80 }, () => ({
      x: Math.random() * this.W,
      y: Math.random() * this.H,
      speed: 300 + Math.random() * 200,
      len: 8 + Math.random() * 12,
    }));

    this.timeoutIds = [];
    this.lastTime = performance.now();
    this.reqId = requestAnimationFrame((t) => this.loop(t));
  }

  _setTimeout(fn, ms) {
    const id = setTimeout(fn, ms);
    this.timeoutIds.push(id);
    return id;
  }

  startGame(mode) {
    this.mode = mode;
    this.score = 0;
    this.round = 1;
    this.currentCombo = 0;
    this.gameOverTaunt = '';
    this.waveEndScheduled = false;

    if (this.mode === 1) this.maxAmmo = 5;
    else if (this.mode === 2) this.maxAmmo = 4;
    else this.maxAmmo = 3;

    this.startRound();
  }

  startRound() {
    this.history = new Array(10).fill('empty');
    this.targetsSpawned = 0;
    this.targets = [];
    this.particles = [];
    this.floatingTexts = [];
    this.waveEndScheduled = false;
    this.state = 'ROUND_START';
    this.syncState();
    playSound('round_start');

    this._setTimeout(() => {
      if (this.state === 'ROUND_START') {
        this.state = 'PLAYING';
        this.spawnWave();
      }
    }, 1500);
  }

  spawnWave() {
    this.ammo = this.maxAmmo;
    this.targets = [];
    this.waveEndScheduled = false;

    let count = 1;
    if (this.mode === 2) count = 2;
    if (this.mode === 3) count = 2;

    for (let i = 0; i < count; i++) {
      if (this.mode === 3 && i === 1) {
        this.targets.push(this.createDrone());
      } else {
        this.targets.push(this.createRunner());
      }
    }
    this.targetsSpawned += count;
    this.syncState();
  }

  createRunner() {
    let speedMult = 0.5 + this.round * 0.05;
    if (this.mode === 2) speedMult = 0.8 + this.round * 0.05;
    if (this.mode === 3) speedMult = 1.2 + this.round * 0.1;

    const dir = Math.random() > 0.5 ? 1 : -1;
    const startY = 140 + Math.random() * 110;

    return {
      type: 'runner',
      x: dir === 1 ? -80 : this.W + 80,
      y: startY,
      baseY: startY,
      vx: (140 + Math.random() * 40) * speedMult * dir,
      amplitude: 130 + Math.random() * 50,
      phase: Math.random() * Math.PI,
      phaseSpeed: (2.0 + Math.random()) * speedMult,
      dead: false,
      escaped: false,
      escapeTimer: 0,
      speedGlitched: false,
      freezeTimer: 0,
      freezeCount: 0,
      maxTime: this.mode === 1 ? 5.0 : Math.max(1.5, 4.0 - this.round * 0.2),
    };
  }

  createDrone() {
    let speedMult = 1.0 + this.round * 0.1;
    const dir = Math.random() > 0.5 ? 1 : -1;
    return {
      type: 'drone',
      x: dir === 1 ? -40 : this.W + 40,
      y: this.H * 0.5 + (Math.random() * 120 - 60),
      vx: (160 + Math.random() * 60) * speedMult * dir,
      vy: (-20 - Math.random() * 30) * speedMult,
      scale: 2.5,
      dead: false,
      escaped: false,
      escapeTimer: 0,
      speedGlitched: false,
      freezeTimer: 0,
      freezeCount: 0,
      maxTime: Math.max(1.5, 3.5 - this.round * 0.15),
    };
  }

  shoot(x, y) {
    if (this.state !== 'PLAYING') return;
    if (this.ammo <= 0) return;

    this.ammo--;
    this.shotsFired++;
    playSound('shoot');

    if (this.onFlash) this.onFlash();

    let hitAnything = false;
    let radiusMult = 1.0;
    if (this.mode === 1) radiusMult = 1.5;
    if (this.mode === 3) radiusMult = 0.8;

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      if (t.dead || t.escaped) continue;

      const baseRadius = t.type === 'drone' ? 24 * t.scale : 32;
      const radius = baseRadius * radiusMult;
      const dist = Math.hypot(t.x - x, t.y - y);

      if (dist < radius) {
        t.dead = true;
        hitAnything = true;
        this.currentCombo++;
        playSound('hit');

        const basePts = (t.type === 'drone' ? 1000 : 500) + this.round * 100;
        const comboMult = this.currentCombo > 1 ? this.currentCombo : 1;
        const totalPts = basePts * comboMult;

        this.score += totalPts;
        if (this.score > this.hiScore) {
          this.hiScore = this.score;
          localStorage.setItem('cyberpunk_hi', this.hiScore);
        }

        this.floatingTexts.push({
          x: t.x, y: t.y - 30,
          text: `+${totalPts}`,
          color: '#00ffe7',
          life: 1.2,
          isTaunt: false,
        });
        if (this.currentCombo > 1) {
          this.floatingTexts.push({
            x: t.x, y: t.y - 54,
            text: `${this.currentCombo}X CHAIN!`,
            color: '#ff2d78',
            life: 1.5,
            isTaunt: false,
          });
        }

        this.spawnExplosion(t.x, t.y, t.type === 'drone' ? '#b400ff' : '#00ffe7');

        const idx = this.targetsSpawned - this.targets.length + i;
        if (idx < 10) this.history[idx] = 'hit';
        break;
      }
    }

    if (!hitAnything) {
      playSound('miss');
      this.currentCombo = 0;
      this.floatingTexts = this.floatingTexts.filter(ft => !ft.isTaunt);
      const taunt = MISS_TAUNTS[Math.floor(Math.random() * MISS_TAUNTS.length)];
      this.floatingTexts.push({
        x: this.W / 2, y: this.H / 3,
        text: taunt,
        color: '#ff2d78',
        life: 2.5,
        isTaunt: true,
      });
    }

    this.checkWaveEnd();
    this.syncState();
  }

  checkWaveEnd() {
    const allEscaped = this.targets.every(t => t.escaped || t.dead);
    if (!this.waveEndScheduled && allEscaped) {
      this.waveEndScheduled = true;
      this._setTimeout(() => this.endWave(), 600);
    }
  }

  endWave() {
    if (this.state !== 'PLAYING') return;

    const caughtCount = this.targets.filter(t => t.dead).length;

    if (this.targets.some(t => t.escaped && !t.dead)) {
      this.currentCombo = 0;
      this.targets.forEach((t, i) => {
        if (t.escaped && !t.dead) {
          const idx = this.targetsSpawned - this.targets.length + i;
          if (idx < 10) this.history[idx] = 'miss';
        }
      });
    }

    this.state = 'END_ANIM';
    this.mascot.active = true;
    this.mascot.y = this.H;
    this.mascot.timer = 0;
    this.mascot.type = caughtCount > 0 ? 'stand' : 'taunt';

    if (caughtCount === 0) playSound('laugh');
    this.syncState();
  }

  spawnExplosion(x, y, color) {
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 380,
        vy: (Math.random() - 0.5) * 380,
        life: 1.0,
        color: Math.random() > 0.4 ? color : '#ffffff',
      });
    }
  }

  loop(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(dt);
    this.draw();
    this.reqId = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // Update rain
    this.rainDrops.forEach(r => {
      r.y += r.speed * dt;
      if (r.y > this.H) { r.y = -r.len; r.x = Math.random() * this.W; }
    });

    // Flicker hologram signs
    this.flickerTimer += dt;
    if (this.flickerTimer > 0.12) {
      this.flickerTimer = 0;
      this.flickerState = this.flickerState.map(() => Math.random() > 0.15);
    }

    if (this.state === 'PLAYING') {
      let activeCount = 0;

      this.targets.forEach(t => {
        if (t.dead) { t.y += 500 * dt; return; }
        if (t.escaped) return;

        t.escapeTimer += dt;
        if (t.escapeTimer > t.maxTime || t.x < -150 || t.x > this.W + 150 || t.y < -150) {
          t.escaped = true;
          this.checkWaveEnd();
        }

        if (t.freezeTimer > 0) {
          t.freezeTimer -= dt;
          activeCount++;
          return;
        } else if (t.freezeCount < 1 && t.escapeTimer > 2.0) {
          t.freezeTimer = 0.6;
          t.freezeCount++;
          activeCount++;
          return;
        } else if (t.freezeCount < 2 && t.escapeTimer > 3.5) {
          t.freezeTimer = 0.6;
          t.freezeCount++;
          activeCount++;
          return;
        }

        if (!t.speedGlitched && t.escapeTimer > 1.2) {
          t.vx *= 1.8;
          if (t.type === 'drone') t.vy *= 1.5;
          t.speedGlitched = true;
        }

        if (t.type === 'runner') {
          t.x += t.vx * dt;
          t.phase += t.phaseSpeed * dt;
          t.y = t.baseY + Math.sin(t.phase) * t.amplitude;
        } else if (t.type === 'drone') {
          t.x += t.vx * dt;
          t.y += t.vy * dt;
          t.scale = Math.max(0.5, t.scale - 0.4 * dt);
        }
        activeCount++;
      });

      if (this.ammo === 0 && activeCount > 0) {
        this.targets.forEach(t => { if (!t.dead) t.escapeTimer += dt * 5; });
      }
    }

    if (this.state === 'END_ANIM') {
      this.mascot.timer += dt;
      if (this.mascot.timer < 0.5) this.mascot.y -= 160 * dt;
      else if (this.mascot.timer > 2.0) this.mascot.y += 160 * dt;

      if (this.mascot.timer > 2.5) {
        this.mascot.active = false;
        if (this.targetsSpawned >= 10) this.checkRoundClear();
        else { this.state = 'PLAYING'; this.spawnWave(); }
      }
    }

    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1.6;
    });
    this.particles = this.particles.filter(p => p.life > 0);

    this.floatingTexts.forEach(ft => {
      ft.y -= (ft.isTaunt ? 4 : 40) * dt;
      ft.life -= dt;
    });
    this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
  }

  checkRoundClear() {
    const hits = this.history.filter(h => h === 'hit').length;
    let required = 5 + Math.floor(this.round / 2);
    if (this.mode === 1) required -= 1;
    required = Math.min(required, 10);

    if (hits >= required) {
      this.round++;
      this.startRound();
    } else {
      this.state = 'GAME_OVER';
      this.gameOverTaunt = GAME_OVER_TAUNTS[Math.floor(Math.random() * GAME_OVER_TAUNTS.length)];
      this.syncState();
    }
  }

  draw() {
    const ctx = this.ctx;

    // ── Sky gradient ──────────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, this.H);
    sky.addColorStop(0, '#020408');
    sky.addColorStop(0.5, '#0a0418');
    sky.addColorStop(1, '#12002a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.W, this.H);

    // ── Stars ─────────────────────────────────────────────────────────
    this.stars.forEach(s => {
      ctx.fillStyle = s.bright ? '#00ffe7' : '#6688aa';
      ctx.globalAlpha = s.bright ? 0.9 : 0.4;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1.0;

    // ── Distant neon fog glow ─────────────────────────────────────────
    const fogGrad = ctx.createLinearGradient(0, this.H * 0.3, 0, this.H * 0.65);
    fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
    fogGrad.addColorStop(0.5, 'rgba(180,0,255,0.06)');
    fogGrad.addColorStop(1, 'rgba(0,255,231,0.08)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, this.H * 0.3, this.W, this.H * 0.35);

    // ── Hologram billboards ───────────────────────────────────────────
    this.holoAds.forEach((ad, i) => {
      if (!this.flickerState[i]) return;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = ad.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(ad.x, ad.y, ad.w, ad.h);
      // scanlines inside billboard
      for (let ly = ad.y + 4; ly < ad.y + ad.h; ly += 6) {
        ctx.fillStyle = ad.color + '22';
        ctx.fillRect(ad.x + 2, ly, ad.w - 4, 2);
      }
      ctx.fillStyle = ad.color;
      ctx.font = 'bold 7px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ad.label, ad.x + ad.w / 2, ad.y + ad.h / 2 + 3);
      ctx.globalAlpha = 1;
      ctx.restore();
    });

    // ── Rain ──────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(0,255,231,0.18)';
    ctx.lineWidth = 1;
    this.rainDrops.forEach(r => {
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 2, r.y + r.len);
      ctx.stroke();
    });

    // ── Back buildings (dark silhouettes) ─────────────────────────────
    const backBldgs = [
      { x: 0,   w: 60,  h: 260 }, { x: 70,  w: 80,  h: 310 },
      { x: 165, w: 50,  h: 240 }, { x: 230, w: 90,  h: 360 },
      { x: 340, w: 70,  h: 290 }, { x: 425, w: 100, h: 340 },
      { x: 540, w: 65,  h: 270 }, { x: 620, w: 85,  h: 320 },
      { x: 715, w: 90,  h: 280 },
    ];
    backBldgs.forEach(b => {
      ctx.fillStyle = '#050010';
      ctx.fillRect(b.x, this.H - b.h, b.w, b.h);
      // Neon window lights
      for (let wy = this.H - b.h + 10; wy < this.H - 60; wy += 14) {
        for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 12) {
          if ((wx * 3 + wy * 7) % 5 > 1) {
            const wc = (wx + wy) % 3 === 0 ? '#ff2d78' : (wx + wy) % 3 === 1 ? '#00ffe7' : '#ffe600';
            ctx.fillStyle = wc + '99';
            ctx.fillRect(wx, wy, 5, 6);
          }
        }
      }
      // Rooftop neon bar
      const barColor = b.w > 75 ? '#ff2d78' : '#00ffe7';
      ctx.fillStyle = barColor;
      ctx.fillRect(b.x, this.H - b.h, b.w, 2);
      ctx.shadowColor = barColor;
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x, this.H - b.h, b.w, 1);
      ctx.shadowBlur = 0;
    });

    // ── Targets ───────────────────────────────────────────────────────
    this.targets.forEach(t => {
      if (t.escaped && !t.dead) return;

      if (t.type === 'runner') {
        // Grappling hook wire
        ctx.strokeStyle = 'rgba(0,255,231,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(t.x + t.vx * 0.3, -200);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
        if (!t.dead) {
          // Neon glow halo
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#00ffe7';
          ctx.beginPath();
          ctx.arc(t.x, t.y, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
          drawGrid(ctx, t.x, t.y, CYBER_RUNNER, PALETTES.runner, t.vx > 0, 1.8);
        }
      } else if (t.type === 'drone') {
        if (!t.dead) {
          // Purple engine glow
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = '#b400ff';
          ctx.beginPath();
          ctx.arc(t.x, t.y, 28 * t.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
          drawGrid(ctx, t.x, t.y, RECON_DRONE, PALETTES.drone, false, t.scale);
        }
      }
    });

    // ── Particles ─────────────────────────────────────────────────────
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    // ── Foreground street / ground ────────────────────────────────────
    ctx.fillStyle = '#08001a';
    ctx.fillRect(0, this.H - 75, this.W, 75);

    // Neon ground reflection
    const reflGrad = ctx.createLinearGradient(0, this.H - 75, 0, this.H);
    reflGrad.addColorStop(0, 'rgba(0,255,231,0.08)');
    reflGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = reflGrad;
    ctx.fillRect(0, this.H - 75, this.W, 75);

    // Road line
    ctx.fillStyle = '#00ffe730';
    ctx.fillRect(0, this.H - 75, this.W, 1);

    // Front buildings
    const frontBldgs = [
      { x: 30,  w: 90,  h: 160 }, { x: 140, w: 110, h: 210 },
      { x: 270, w: 95,  h: 175 }, { x: 395, w: 130, h: 230 },
      { x: 550, w: 90,  h: 165 }, { x: 665, w: 80,  h: 195 },
    ];
    frontBldgs.forEach(b => {
      ctx.fillStyle = '#06001a';
      ctx.fillRect(b.x, this.H - b.h, b.w, b.h);

      // Neon window details
      for (let wy = this.H - b.h + 12; wy < this.H - 78; wy += 16) {
        for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 16) {
          if ((wx * wy) % 7 > 2) {
            const wc = (wx + wy) % 2 === 0 ? '#00ffe7' : '#ff2d78';
            ctx.fillStyle = wc + 'aa';
            ctx.fillRect(wx, wy, 5, 8);
          }
        }
      }

      // Rooftop neon trim
      const trimColor = b.h > 190 ? '#b400ff' : '#ff2d78';
      ctx.shadowColor = trimColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = trimColor;
      ctx.fillRect(b.x, this.H - b.h, b.w, 2);
      ctx.shadowBlur = 0;
    });

    // ── Mascot (cyber agent) ──────────────────────────────────────────
    if (this.mascot.active) {
      const mY = Math.max(this.mascot.y, this.H - 125);
      const bob = this.mascot.type === 'taunt'
        ? Math.sin(this.mascot.timer * 18) * 4
        : 0;
      // Cyan glow behind mascot
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#00ffe7';
      ctx.beginPath();
      ctx.arc(this.W / 2, mY, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      drawGrid(ctx, this.W / 2, mY + bob, AGENT_SPRITE, PALETTES.agent, false, 2.5);
    }

    // ── Floating texts (scores & taunts) ──────────────────────────────
    ctx.textAlign = 'center';
    this.floatingTexts.forEach(ft => {
      ctx.font = ft.isTaunt
        ? 'bold 14px "Share Tech Mono", monospace'
        : '13px "Share Tech Mono", monospace';
      ctx.globalAlpha = Math.max(0, Math.min(1, ft.life * 1.5));

      const textWidth = ctx.measureText(ft.text).width;
      const drawX = Math.max(
        textWidth / 2 + 20,
        Math.min(this.W - textWidth / 2 - 20, ft.x)
      );

      if (ft.isTaunt) {
        ctx.fillStyle = 'rgba(2,4,8,0.92)';
        ctx.fillRect(drawX - textWidth / 2 - 18, ft.y - 22, textWidth + 36, 32);
        ctx.strokeStyle = '#ff2d78';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(drawX - textWidth / 2 - 18, ft.y - 22, textWidth + 36, 32);
      }

      ctx.fillStyle = ft.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, drawX, ft.y);
      ctx.fillText(ft.text, drawX, ft.y);
    });
    ctx.globalAlpha = 1.0;
  }

  syncState() {
    if (this.updateReactState) {
      this.updateReactState({
        state: this.state,
        score: this.score,
        hiScore: this.hiScore,
        round: this.round,
        ammo: this.ammo,
        maxAmmo: this.maxAmmo,
        history: [...this.history],
        mode: this.mode,
        gameOverTaunt: this.gameOverTaunt,
      });
    }
  }

  destroy() {
    cancelAnimationFrame(this.reqId);
    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];
  }
}

// --- REACT APP ---
const App = () => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const flashRef = useRef(null);
  const lastMousePos = useRef({ x: 400, y: 225 });

  const [gameState, setGameState] = useState({
    state: 'MENU',
    score: 0,
    hiScore: parseInt(localStorage.getItem('cyberpunk_hi')) || 0,
    round: 1,
    ammo: 5,
    maxAmmo: 5,
    history: new Array(10).fill('empty'),
    mode: 1,
    gameOverTaunt: '',
  });

  const triggerFlash = useCallback(() => {
    if (flashRef.current) {
      flashRef.current.style.opacity = '0.35';
      setTimeout(() => {
        if (flashRef.current) flashRef.current.style.opacity = '0';
      }, 55);
    }
  }, []);

  const initEngine = useCallback(() => {
    if (engineRef.current) engineRef.current.destroy();
    if (!canvasRef.current) return;
    engineRef.current = new GameEngine(canvasRef.current, setGameState, triggerFlash);
    setGameState(prev => ({ ...prev, hiScore: engineRef.current.hiScore }));
  }, [triggerFlash]);

  useEffect(() => {
    initEngine();
    return () => { if (engineRef.current) engineRef.current.destroy(); };
  }, [initEngine]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const eng = engineRef.current;
      if (!eng) return;
      switch (e.key.toLowerCase()) {
        case '1': if (eng.state === 'MENU') eng.startGame(1); break;
        case '2': if (eng.state === 'MENU') eng.startGame(2); break;
        case '3': if (eng.state === 'MENU') eng.startGame(3); break;
        case 'r':
          if (eng.state === 'PLAYING' || eng.state === 'GAME_OVER' || eng.state === 'MENU') {
            eng.startGame(eng.mode);
          }
          break;
        case 'escape':
          if (eng.state !== 'MENU') {
            eng.destroy();
            eng.state = 'MENU';
            eng.syncState();
          }
          break;
        case ' ':
          if (eng.state === 'PLAYING') {
            eng.shoot(lastMousePos.current.x, lastMousePos.current.y);
          }
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCanvasPointer = (e) => {
    const eng = engineRef.current;
    if (!eng || eng.state !== 'PLAYING') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    lastMousePos.current = { x, y };
    eng.shoot(x, y);
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    lastMousePos.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const goToMenu = () => {
    const eng = engineRef.current;
    if (eng) { eng.destroy(); initEngine(); }
  };

  const modeNames = {
    1: 'PROTOCOL 1 // EASY',
    2: 'PROTOCOL 2 // MEDIUM',
    3: 'PROTOCOL 3 // HARD',
  };

  return (
    <div className="game-area">
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointer}
        onMouseMove={handleMouseMove}
        role="application"
        aria-label="Cyberpunk 2D Shooter Game"
        tabIndex={0}
      />
      <div className="crt-overlay" />
      <div className="rain-overlay" />
      <div ref={flashRef} className="flash" />

      {/* Top HUD */}
      {gameState.state !== 'MENU' && (
        <div className="hud-top">
          <div />
          <div>
            <button className="btn" onClick={() => engineRef.current?.startGame(engineRef.current.mode)}>
              RESTART [R]
            </button>
            <button className="btn" onClick={goToMenu}>
              MENU [ESC]
            </button>
          </div>
        </div>
      )}

      {/* MENU */}
      {gameState.state === 'MENU' && (
        <div className="overlay-screen">
          <h2 className="title">NEON HUNTER</h2>
          <p className="title-sub">// CYBERPUNK CITY PROTOCOL //</p>
          <p className="subtitle">
            AIM WITH CURSOR · CLICK OR SPACE TO FIRE<br />
            ELIMINATE RUNNERS &amp; DRONES BEFORE THEY ESCAPE
          </p>
          <div className="menu-opts">
            <div className="menu-opt" onClick={() => engineRef.current?.startGame(1)}>
              [ PROTOCOL 1 ] EASY &nbsp; (Press 1)
            </div>
            <div className="menu-opt" onClick={() => engineRef.current?.startGame(2)}>
              [ PROTOCOL 2 ] MEDIUM &nbsp;(Press 2)
            </div>
            <div className="menu-opt" onClick={() => engineRef.current?.startGame(3)}>
              [ PROTOCOL 3 ] HARD &nbsp;&nbsp;(Press 3)
            </div>
          </div>
        </div>
      )}

      {/* ROUND START */}
      {gameState.state === 'ROUND_START' && (
        <div className="overlay-screen" style={{ background: 'rgba(2,4,8,0.7)' }}>
          <p style={{ color: '#b400ff', fontSize: '1.2vmin', letterSpacing: '4px', marginBottom: '8px' }}>
            // INITIALIZING //
          </p>
          <h2 className="title" style={{ fontSize: '3.5vmin' }}>
            WAVE {gameState.round}
          </h2>
        </div>
      )}

      {/* GAME OVER */}
      {gameState.state === 'GAME_OVER' && (
        <div className="overlay-screen">
          <h2 className="title" style={{ color: '#ff2d78', textShadow: '0 0 20px #ff2d78, 0 0 50px rgba(255,45,120,0.4)' }}>
            FLATLINED
          </h2>
          <p style={{ fontSize: '1.4vmin', color: '#00ffe7', marginBottom: '12px' }}>
            SCORE: <span style={{ color: '#ffe600' }}>{gameState.score}</span>
          </p>
          <p style={{
            fontSize: '1.3vmin',
            color: '#ff2d78',
            marginBottom: '36px',
            maxWidth: '75%',
            lineHeight: '2',
            fontStyle: 'italic',
          }}>
            "{gameState.gameOverTaunt}"
          </p>
          <div className="menu-opt" onClick={() => engineRef.current?.startGame(gameState.mode)}>
            [ RETRY ] &nbsp; (R)
          </div>
          <div className="menu-opt" style={{ marginTop: '12px' }} onClick={goToMenu}>
            [ MAIN MENU ] &nbsp; (ESC)
          </div>
        </div>
      )}

      {/* Bottom HUD */}
      {gameState.state !== 'MENU' && (
        <div className="hud-bottom">
          <div className="hud-left">
            <div><span className="text-highlight">WAVE {gameState.round}</span></div>
            <div style={{ color: '#b400ff', fontSize: '1vmin' }}>{modeNames[gameState.mode]}</div>
          </div>

          <div className="hud-center">
            {gameState.history.map((res, i) => (
              <div key={i} className={`hit-box ${res === 'hit' ? 'hit' : res === 'miss' ? 'miss' : ''}`} />
            ))}
          </div>

          <div className="hud-right" style={{ textAlign: 'right' }}>
            <div>SCORE <span className="text-highlight">{gameState.score.toString().padStart(6, '0')}</span></div>
            <div style={{ fontSize: '1vmin', color: '#6ab0c8' }}>
              HI &nbsp;<span style={{ color: '#ffe600' }}>{gameState.hiScore.toString().padStart(6, '0')}</span>
            </div>
          </div>

          <div className="ammo-container">
            {Array.from({ length: gameState.maxAmmo }).map((_, i) => (
              <div key={i} className={`bullet-icon ${i >= gameState.ammo ? 'spent' : ''}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
