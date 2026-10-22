/* =========================================================
   坦克大战 · TANK BATTLE
   A dependency-free HTML5 canvas arcade game.
   ========================================================= */
(() => {
  'use strict';

  // -------------------------------------------------------
  // Constants
  // -------------------------------------------------------
  const TILE = 48;
  const COLS = 13;
  const ROWS = 13;
  const W = COLS * TILE;
  const H = ROWS * TILE;
  const TAU = Math.PI * 2;

  const DIRS = [
    { x: 0, y: -1, angle: 0, name: 'up' },
    { x: 1, y: 0, angle: Math.PI / 2, name: 'right' },
    { x: 0, y: 1, angle: Math.PI, name: 'down' },
    { x: -1, y: 0, angle: -Math.PI / 2, name: 'left' }
  ];
  const DIR_INDEX = { up: 0, right: 1, down: 2, left: 3 };
  const DIR_NAMES = ['up', 'right', 'down', 'left'];

  const T = {
    EMPTY: 0,
    BRICK: 1,
    STEEL: 2,
    WATER: 3,
    TREES: 4,
    BASE: 5,
    RUBBLE: 6
  };

  const COLORS = {
    amber: '#ffb347',
    amberHot: '#ff7a2f',
    teal: '#4fe3d0',
    red: '#ff5c4d',
    gold: '#ffd37a',
    white: '#f4f8fc'
  };

  const TOTAL_LEVELS = 30;
  const LEVEL_NAMES = [
    '沙漠前哨', '荒原铁轨', '峡谷伏击', '破晓河谷', '废弃工厂',
    '钢铁回廊', '焦土阵地', '夜袭油库', '断桥防线', '沙暴隘口',
    '丛林沼泽', '雨林哨站', '泥沼陷阱', '隐秘弹药库', '河谷要塞',
    '极寒冻原', '冰封补给线', '白夜前线', '冻土迷宫', '冰原堡垒',
    '熔岩高地', '火山灰烬', '熔炉工厂', '岩浆裂谷', '赤色要塞',
    '天穹轨道', '轨道电梯', '星环基地', '最后屏障', '终焉核心'
  ];
  const SECTOR_NAMES = ['荒漠', '工厂', '雨林', '冻原', '火山', '天穹'];
  let LEVELS = [];

  const ENEMY_TYPES = {
    grunt: {
      label: '突击兵',
      hp: 1,
      speed: 63,
      score: 100,
      fireInterval: 1.55,
      body: '#e05b4d',
      light: '#ff9b88',
      dark: '#6b2822',
      track: '#38201c'
    },
    scout: {
      label: '疾风',
      hp: 1,
      speed: 96,
      score: 150,
      fireInterval: 1.75,
      body: '#f0ad3c',
      light: '#ffe18e',
      dark: '#7d4d10',
      track: '#3b2c15'
    },
    armor: {
      label: '重装',
      hp: 3,
      speed: 46,
      score: 300,
      fireInterval: 1.25,
      body: '#8e9bab',
      light: '#d8e1ea',
      dark: '#39434f',
      track: '#232b34'
    }
  };

  const PLAYER_PALETTE = {
    body: '#3fd8c5',
    light: '#a6fff2',
    dark: '#0b5c59',
    track: '#173f45'
  };

  const SPAWN_POINTS = [
    { col: 0, row: 0 },
    { col: 6, row: 0 },
    { col: 12, row: 0 }
  ];

  const PLAYER_SPAWNS = [
    { col: 4, row: 12 },
    { col: 8, row: 12 },
    { col: 4, row: 10 },
    { col: 8, row: 10 }
  ];

  // -------------------------------------------------------
  // DOM
  // -------------------------------------------------------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const overlay = document.getElementById('overlay');
  const banner = document.getElementById('banner');
  const bannerKicker = document.getElementById('bannerKicker');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerSub = document.getElementById('bannerSub');
  const scoreEl = document.getElementById('score');
  const hiscoreEl = document.getElementById('hiscore');
  const levelEl = document.getElementById('level');
  const remainingEl = document.getElementById('remaining');
  const hullEl = document.getElementById('hull');
  const livesEl = document.getElementById('lives');
  const buffsEl = document.getElementById('buffs');
  const missionEl = document.getElementById('missionText');
  const soundBtn = document.getElementById('soundBtn');
  const soundIcon = document.getElementById('soundIcon');

  const MENU_HTML = overlay.innerHTML;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // -------------------------------------------------------
  // Utilities
  // -------------------------------------------------------
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pad2 = (n) => String(n).padStart(2, '0');
  const pad6 = (n) => String(Math.max(0, Math.floor(n))).padStart(6, '0');
  const sign = (n) => (n < 0 ? -1 : n > 0 ? 1 : 0);

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function roundRectPath(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.lineTo(x + w - rr, y);
    c.quadraticCurveTo(x + w, y, x + w, y + rr);
    c.lineTo(x + w, y + h - rr);
    c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    c.lineTo(x + rr, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - rr);
    c.lineTo(x, y + rr);
    c.quadraticCurveTo(x, y, x + rr, y);
    c.closePath();
  }

  function loadHiScore() {
    try {
      const raw = Number(localStorage.getItem('tank-battle-hi'));
      return Number.isFinite(raw) && raw > 0 ? raw : 0;
    } catch (_) {
      return 0;
    }
  }

  function saveHiScore(score) {
    try {
      localStorage.setItem('tank-battle-hi', String(score));
    } catch (_) { /* private mode */ }
  }

  // -------------------------------------------------------
  // Campaign: 30 generated sectors
  // -------------------------------------------------------
  const PROGRESS_KEY = 'tank-battle-progress';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateLevelMap(index) {
    const rng = mulberry32((0x51ed2701 ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0);
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));

    const verticalLanes = [
      [0, 6, 12],
      [0, 4, 8, 12],
      [0, 5, 9, 12],
      [0, 3, 7, 11],
      [0, 2, 6, 10, 12]
    ][index % 5];
    const horizontalLanes = [
      [2, 6, 10],
      [1, 5, 9],
      [3, 6, 9],
      [2, 5, 8, 11]
    ][Math.floor(index / 5) % 4];
    const vset = new Set(verticalLanes);
    const hset = new Set(horizontalLanes);

    const keep = (r, c) =>
      r === 0 || r === 12 || vset.has(c) || hset.has(r) ||
      (r >= 10 && c >= 3 && c <= 9);

    const paint = (r, c, w, h, ch) => {
      for (let dr = 0; dr < h; dr++) {
        for (let dc = 0; dc < w; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 1 || rr > 9 || cc < 1 || cc > 5 || keep(rr, cc)) continue;
          grid[rr][cc] = ch;
          const mc = COLS - 1 - cc;
          if (!keep(rr, mc)) grid[rr][mc] = ch;
        }
      }
    };

    const density = 0.34 + Math.min(0.29, index * 0.01);
    for (let r = 3; r <= 9; r++) {
      for (let c = 1; c <= 5; c++) {
        if (keep(r, c) || grid[r][c] !== '.') continue;
        if (rng() > density) continue;

        const roll = rng();
        let ch = 'B';
        if (roll < 0.1 + index * 0.004) ch = 'S';
        else if (roll < 0.19 + index * 0.002 && index >= 5) ch = 'W';
        else if (roll < 0.29) ch = 'T';

        const shape = rng();
        if (shape < 0.38) paint(r, c, 1, 2, ch);
        else if (shape < 0.7) paint(r, c, 2, 1, ch);
        else if (shape < 0.9) paint(r, c, 2, 2, ch);
        else paint(r, c, 1, 1, ch);
      }
    }

    return grid.map((row) => row.join(''));
  }

  function buildLevels() {
    return Array.from({ length: TOTAL_LEVELS }, (_, index) => {
      const total = Math.min(26, 6 + Math.floor(index * 0.72));
      const armorChance = 0.1 + Math.min(0.32, index * 0.012);
      const pool = [];
      for (let i = 0; i < total; i++) {
        const roll = Math.random();
        if (roll < armorChance) pool.push('armor');
        else if (roll < armorChance + 0.25) pool.push('scout');
        else pool.push('grunt');
      }

      return {
        name: LEVEL_NAMES[index],
        subtitle: `${SECTOR_NAMES[Math.floor(index / 5)]} · 第 ${pad2(index + 1)} 战区`,
        total,
        maxActive: Math.min(8, 4 + Math.floor(index / 7)),
        spawnInterval: Math.max(1.15, 2.55 - index * 0.05),
        speedMul: 1 + index * 0.009,
        hpBonus: Math.floor(index / 6),
        fireRate: 1 + index * 0.016,
        bulletSpeed: 285 + index * 3.8,
        aggression: 0.03 + index * 0.001,
        powerupChance: 0.24 + index * 0.002,
        scoreMul: 1 + Math.floor(index / 5) * 0.12,
        pool,
        map: generateLevelMap(index)
      };
    });
  }

  LEVELS = buildLevels();

  function loadProgress() {
    let unlocked = 1;
    let cleared = [];
    try {
      const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
      if (raw && typeof raw === 'object') {
        unlocked = Math.max(1, Math.min(TOTAL_LEVELS, Number(raw.unlocked) || 1));
        if (Array.isArray(raw.cleared)) {
          cleared = [...new Set(raw.cleared
            .map((n) => Number(n))
            .filter((n) => Number.isInteger(n) && n >= 0 && n < TOTAL_LEVELS))];
          cleared.sort((a, b) => a - b);
        }
      }
    } catch (_) { /* private mode or corrupt value */ }
    for (const level of cleared) unlocked = Math.max(unlocked, Math.min(TOTAL_LEVELS, level + 2));
    return { unlocked, cleared };
  }

  const progress = loadProgress();

  function saveProgress() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (_) { /* private mode */ }
  }

  function unlockLevel(index) {
    const next = Math.min(TOTAL_LEVELS, index + 2);
    if (next > progress.unlocked) progress.unlocked = next;
    if (!progress.cleared.includes(index)) progress.cleared.push(index);
    progress.cleared.sort((a, b) => a - b);
    saveProgress();
  }

  // -------------------------------------------------------
  // Audio — all synthesized, no external files
  // -------------------------------------------------------
  const Sound = {
    ctx: null,
    master: null,
    noiseBuffer: null,
    muted: (() => {
      try { return localStorage.getItem('tank-battle-muted') === '1'; } catch (_) { return false; }
    })(),

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.34;
      this.master.connect(this.ctx.destination);

      const len = Math.floor(this.ctx.sampleRate * 0.9);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = 0.86 * last + 0.14 * white;
        data[i] = last;
      }
      this.noiseBuffer = buffer;
    },

    ensure() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    setMuted(muted) {
      this.muted = muted;
      if (this.master && this.ctx) {
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(muted ? 0 : 0.34, now, 0.02);
      }
      try { localStorage.setItem('tank-battle-muted', muted ? '1' : '0'); } catch (_) { /* ignore */ }
    },

    tone(freq, duration, type = 'square', volume = 0.12, slideTo = null, delay = 0) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.03);
    },

    noise(duration = 0.2, volume = 0.15, cutoff = 1200, type = 'lowpass', delay = 0) {
      if (!this.ctx || this.muted || !this.noiseBuffer) return;
      const t0 = this.ctx.currentTime + delay;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.setValueAtTime(cutoff, t0);
      filter.Q.value = 0.8;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.0002, volume), t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
      src.stop(t0 + duration + 0.02);
    },

    shoot(isPlayer) {
      if (isPlayer) {
        this.tone(220, 0.09, 'square', 0.09, 72);
        this.noise(0.05, 0.05, 2600, 'highpass');
      } else {
        this.tone(150, 0.08, 'sawtooth', 0.045, 60);
      }
    },

    brick() {
      this.noise(0.08, 0.1, 1500, 'bandpass');
      this.tone(140, 0.06, 'square', 0.04, 90);
    },

    steel() {
      this.tone(1280, 0.045, 'triangle', 0.055, 860);
      this.noise(0.035, 0.045, 3000, 'highpass');
    },

    explosion(big = false) {
      this.noise(big ? 0.65 : 0.36, big ? 0.32 : 0.2, big ? 700 : 1100, 'lowpass');
      this.tone(big ? 86 : 120, big ? 0.5 : 0.28, 'sine', big ? 0.2 : 0.12, 30);
    },

    armorHit() {
      this.noise(0.16, 0.16, 2200, 'bandpass');
      this.tone(320, 0.14, 'square', 0.09, 120);
      this.tone(760, 0.1, 'triangle', 0.05, 480, 0.02);
    },

    playerHit() {
      this.noise(0.55, 0.3, 800, 'lowpass');
      this.tone(180, 0.55, 'sawtooth', 0.16, 34);
    },

    shield() {
      this.tone(780, 0.1, 'sine', 0.09, 1180);
    },

    powerup() {
      this.tone(523.25, 0.1, 'square', 0.09, null, 0);
      this.tone(659.25, 0.1, 'square', 0.09, null, 0.08);
      this.tone(1046.5, 0.2, 'square', 0.09, null, 0.16);
    },

    baseAlarm() {
      this.noise(0.8, 0.3, 500, 'lowpass');
      this.tone(110, 0.8, 'sawtooth', 0.2, 28);
      this.tone(440, 0.5, 'square', 0.06, 70, 0.08);
    },

    levelClear() {
      [392, 523.25, 659.25, 783.99].forEach((f, i) => {
        this.tone(f, 0.22, 'square', 0.09, null, i * 0.11);
      });
    },

    victory() {
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        this.tone(f, 0.34, 'triangle', 0.11, null, i * 0.13);
      });
    },

    gameOver() {
      [330, 277, 220, 146].forEach((f, i) => {
        this.tone(f, 0.36, 'sawtooth', 0.11, f * 0.82, i * 0.17);
      });
    },

    start() {
      [220, 330, 440, 660].forEach((f, i) => {
        this.tone(f, 0.16, 'square', 0.08, null, i * 0.07);
      });
    },

    ui() {
      this.tone(660, 0.06, 'square', 0.05, 880);
    }
  };

  // -------------------------------------------------------
  // Game state
  // -------------------------------------------------------
  const G = {
    state: 'menu',
    time: 0,
    level: 0,
    score: 0,
    hi: loadHiScore(),
    lives: 3,
    map: [],
    player: null,
    tanks: [],
    bullets: [],
    particles: [],
    floaters: [],
    powerups: [],
    pending: [],
    queue: [],
    spawnTimer: 0,
    spawnIndex: 0,
    maxActive: 4,
    spawnInterval: 2.4,
    speedMul: 1,
    baseAlive: true,
    rapid: 0,
    multi: 0,
    freeze: 0,
    hpBonus: 0,
    fireRate: 1,
    bulletSpeed: 285,
    aggression: 0.035,
    powerupChance: 0.23,
    scoreMul: 1,
    respawnTimer: 0,
    introTimer: 0,
    overTimer: 0,
    overReason: '',
    ending: false,
    levelClearArmed: false,
    levelClearTimer: 0,
    shake: 0,
    flash: 0,
    flashColor: '#ffffff',
    stats: { kills: 0, shots: 0, hits: 0 },
    musicTimer: 0,
    musicStep: 0,
    hudSignature: ''
  };

  const input = {
    dirs: [],
    fire: false
  };

  // -------------------------------------------------------
  // Canvas sizing
  // -------------------------------------------------------
  function setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }
  setupCanvas();
  window.addEventListener('resize', setupCanvas);

  // -------------------------------------------------------
  // Map
  // -------------------------------------------------------
  function tileForChar(ch, row, col) {
    switch (ch) {
      case 'B': return { type: T.BRICK, hp: 2, variant: (row * 5 + col * 7) % 4 };
      case 'S': return { type: T.STEEL, hp: 99, variant: (row * 3 + col * 11) % 3 };
      case 'W': return { type: T.WATER, hp: 99, variant: (row * 7 + col * 3) % 4 };
      case 'T': return { type: T.TREES, hp: 99, variant: (row * 11 + col * 5) % 4 };
      default: return { type: T.EMPTY, hp: 0, variant: (row * 13 + col * 17) % 4 };
    }
  }

  function loadMap(rows) {
    G.map = rows.map((row, r) => {
      const clean = row.padEnd(COLS, '.').slice(0, COLS);
      return clean.split('').map((ch, c) => tileForChar(ch, r, c));
    });

    // Base at the bottom centre, with a brick fortress.
    for (const [c, r] of [[5, 11], [6, 11], [7, 11], [5, 12], [7, 12]]) {
      if (G.map[r] && G.map[r][c]) {
        G.map[r][c].type = T.BRICK;
        G.map[r][c].hp = 2;
      }
    }
    G.map[12][6] = { type: T.BASE, hp: 1, variant: 0 };
  }

  function tileAt(col, row) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
    return G.map[row][col];
  }

  function blocksTank(tile) {
    return tile.type === T.BRICK || tile.type === T.STEEL || tile.type === T.WATER ||
      tile.type === T.BASE || tile.type === T.RUBBLE;
  }

  function blocksBullet(tile) {
    return tile.type === T.BRICK || tile.type === T.STEEL || tile.type === T.BASE;
  }

  function rectBlocked(x, y, w, h) {
    if (x < 0 || y < 0 || x + w > W || y + h > H) return true;
    const c0 = Math.floor(x / TILE);
    const c1 = Math.floor((x + w - 0.001) / TILE);
    const r0 = Math.floor(y / TILE);
    const r1 = Math.floor((y + h - 0.001) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const tile = tileAt(c, r);
        if (!tile || blocksTank(tile)) return true;
      }
    }
    return false;
  }

  function allTanks() {
    const list = G.tanks.slice();
    if (G.player) list.push(G.player);
    return list;
  }

  function tankOverlap(t, x, y) {
    for (const other of allTanks()) {
      if (other === t || other.dead) continue;
      if (rectsOverlap(x, y, t.w, t.h, other.x, other.y, other.w, other.h)) return true;
    }
    return false;
  }

  function spawnClear(col, row) {
    const x = col * TILE + (TILE - 36) / 2;
    const y = row * TILE + (TILE - 36) / 2;
    if (rectBlocked(x, y, 36, 36)) return false;
    for (const t of allTanks()) {
      if (t.dead) continue;
      if (rectsOverlap(x, y, 36, 36, t.x, t.y, t.w, t.h)) return false;
    }
    return true;
  }

  // -------------------------------------------------------
  // Entity factories
  // -------------------------------------------------------
  function createPlayer(col = 4, row = 12) {
    return {
      x: col * TILE + (TILE - 36) / 2,
      y: row * TILE + (TILE - 36) / 2,
      w: 36,
      h: 36,
      dir: 0,
      isPlayer: true,
      dead: false,
      speed: 156,
      hp: 3,
      maxHp: 3,
      shield: 2.5,
      spawnTimer: 0.55,
      fireCd: 0,
      muzzle: 0,
      tread: 0,
      flash: 0,
      invuln: 0
    };
  }

  function createEnemy(type, col, row) {
    const def = ENEMY_TYPES[type] || ENEMY_TYPES.grunt;
    const hp = def.hp + (G.hpBonus || 0);
    return {
      x: col * TILE + (TILE - 36) / 2,
      y: row * TILE + (TILE - 36) / 2,
      w: 36,
      h: 36,
      dir: 2,
      isPlayer: false,
      type,
      def,
      dead: false,
      speed: def.speed * G.speedMul,
      hp,
      maxHp: hp,
      shield: 0,
      spawnTimer: 0.85,
      fireCd: rand(0.9, 1.8),
      fireInterval: Math.max(0.45, def.fireInterval / (G.fireRate || 1)),
      muzzle: 0,
      tread: 0,
      flash: 0,
      score: Math.round(def.score * (G.scoreMul || 1)),
      ai: {
        turn: rand(0.8, 1.7),
        stuck: 0
      }
    };
  }

  function spawnPlayer() {
    let chosen = null;
    for (const p of PLAYER_SPAWNS) {
      if (spawnClear(p.col, p.row)) { chosen = p; break; }
    }
    if (!chosen) chosen = PLAYER_SPAWNS[0];
    G.player = createPlayer(chosen.col, chosen.row);
    G.player.shield = 3;
    G.respawnTimer = 0;
    G.flash = 0.12;
    G.flashColor = '#4fe3d0';
  }

  // -------------------------------------------------------
  // Level lifecycle
  // -------------------------------------------------------
  function startGame(startLevel = null) {
    Sound.ensure();
    Sound.start();
    clearInput();
    const fallback = Math.min(TOTAL_LEVELS - 1, Math.max(0, progress.unlocked - 1));
    const index = Number.isInteger(startLevel) ? clamp(startLevel, 0, TOTAL_LEVELS - 1) : fallback;
    G.score = 0;
    G.lives = 3;
    G.stats = { kills: 0, shots: 0, hits: 0 };
    G.rapid = 0;
    G.multi = 0;
    G.freeze = 0;
    G.level = index;
    loadLevel(index);
  }

  function loadLevel(index) {
    const safeIndex = clamp(index, 0, LEVELS.length - 1);
    const cfg = LEVELS[safeIndex];
    G.level = safeIndex;
    G.speedMul = cfg.speedMul;
    G.maxActive = cfg.maxActive;
    G.spawnInterval = cfg.spawnInterval;
    G.hpBonus = cfg.hpBonus;
    G.fireRate = cfg.fireRate;
    G.bulletSpeed = cfg.bulletSpeed;
    G.aggression = cfg.aggression;
    G.powerupChance = cfg.powerupChance;
    G.scoreMul = cfg.scoreMul;
    G.baseAlive = true;
    G.ending = false;
    G.overTimer = 0;
    G.levelClearArmed = false;
    G.levelClearTimer = 0;
    G.respawnTimer = 0;
    G.rapid = 0;
    G.multi = 0;
    G.freeze = 0;
    G.shake = 0;
    G.flash = 0;
    G.particles = [];
    G.floaters = [];
    G.bullets = [];
    G.powerups = [];
    G.pending = [];
    G.tanks = [];

    loadMap(cfg.map);
    clearInput();

    G.player = createPlayer(4, 12);
    G.player.shield = 2.8;

    G.queue = cfg.pool.slice();
    G.spawnTimer = 1.1;
    G.spawnIndex = 0;
    G.introTimer = 1.9;
    G.state = 'intro';

    hideOverlay();
    showBanner(`MISSION ${pad2(safeIndex + 1)}`, cfg.name, cfg.subtitle);
    updateHud(true);
  }

  function nextLevel() {
    if (G.level >= LEVELS.length - 1) return;
    G.lives = Math.min(5, G.lives + 1);
    hideOverlay();
    loadLevel(G.level + 1);
  }

  function restartGame() {
    hideOverlay();
    startGame(G.level);
  }

  function goMenu() {
    Sound.ui();
    G.state = 'menu';
    G.score = 0;
    G.lives = 3;
    G.level = 0;
    G.stats = { kills: 0, shots: 0, hits: 0 };
    G.rapid = 0;
    G.multi = 0;
    G.freeze = 0;
    G.hpBonus = 0;
    G.fireRate = 1;
    G.bulletSpeed = 285;
    G.aggression = 0.035;
    G.powerupChance = 0.23;
    G.scoreMul = 1;
    G.ending = false;
    G.overTimer = 0;
    G.pending = [];
    G.queue = [];
    G.bullets = [];
    G.powerups = [];
    G.particles = [];
    G.floaters = [];
    G.baseAlive = true;
    loadMap(LEVELS[0].map);
    G.player = createPlayer(4, 12);
    G.player.shield = 0;
    G.tanks = [
      createEnemy('grunt', 0, 0),
      createEnemy('scout', 6, 0),
      createEnemy('armor', 12, 0)
    ];
    for (const t of G.tanks) {
      t.spawnTimer = 0;
      t.dir = 2;
      t.ai.turn = 99;
    }
    overlay.innerHTML = MENU_HTML;
    syncMenuMeta();
    showOverlay();
    updateHud(true);
  }

  // -------------------------------------------------------
  // Overlay & HUD
  // -------------------------------------------------------
  function showOverlay() {
    overlay.classList.remove('is-hidden');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function hideOverlay() {
    overlay.classList.add('is-hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function showBanner(kicker, title, sub) {
    bannerKicker.textContent = kicker;
    bannerTitle.textContent = title;
    bannerSub.textContent = sub;
    banner.classList.remove('is-showing');
    void banner.offsetWidth;
    banner.classList.add('is-showing');
  }

  function accuracy() {
    return G.stats.shots ? Math.round((G.stats.hits / G.stats.shots) * 100) : 0;
  }

  function summaryGrid() {
    return `
      <div class="result-grid">
        <div><span>LEVEL</span><b>${pad2(G.level + 1)}</b></div>
        <div><span>KILLS</span><b>${pad2(G.stats.kills)}</b></div>
        <div><span>ACCURACY</span><b>${accuracy()}%</b></div>
      </div>`;
  }

  function syncMenuMeta() {
    const meta = document.getElementById('menuProgress');
    if (meta) meta.textContent = `战役进度 ${pad2(progress.unlocked)} / ${TOTAL_LEVELS}`;
    const label = document.getElementById('startLabel');
    if (label) label.textContent = progress.unlocked > 1 ? `继续第 ${pad2(progress.unlocked)} 关` : '开始战斗';
  }

  function levelNodesHtml() {
    return LEVELS.map((cfg, index) => {
      const unlocked = index < progress.unlocked;
      const cleared = progress.cleared.includes(index);
      const current = index === progress.unlocked - 1;
      const classes = ['level-node'];
      if (cleared) classes.push('is-cleared');
      if (!unlocked) classes.push('is-locked');
      const status = cleared ? 'CLEAR' : !unlocked ? 'LOCK' : current ? 'NEXT' : 'OPEN';
      return `<button class="${classes.join(' ')}" type="button" data-action="level" data-level="${index}" ${unlocked ? '' : 'disabled'} aria-label="第 ${index + 1} 关 ${cfg.name}${unlocked ? '' : '，未解锁'}">
        <span class="level-node-index">${pad2(index + 1)}</span>
        <span class="level-node-name">${cfg.name}</span>
        <span class="level-node-meta">${status}</span>
      </button>`;
    }).join('');
  }

  function showLevelSelect() {
    G.state = 'menu';
    clearInput();
    showOverlay();
    overlay.innerHTML = `
      <div class="level-card">
        <p class="level-kicker">MISSION ARCHIVE</p>
        <h2 class="level-title">选择关卡</h2>
        <p class="level-progress">已解锁 ${pad2(progress.unlocked)} / ${TOTAL_LEVELS} · 已通关 ${pad2(progress.cleared.length)}</p>
        <div class="level-grid">${levelNodesHtml()}</div>
        <button class="btn btn--ghost" type="button" data-action="menu">返回主菜单</button>
      </div>`;
    updateHud(true);
  }

  function showPause() {
    showOverlay();
    overlay.innerHTML = `
      <div class="result-card">
        <p class="result-kicker">SYSTEM HOLD</p>
        <h2 class="result-title">战场暂停</h2>
        <p class="result-sub">引擎怠速中 · 按 P 或 ESC 继续</p>
        ${summaryGrid()}
        <button class="btn btn--primary" type="button" data-action="resume"><span>继续战斗</span><i>▶</i></button>
        <button class="btn btn--ghost" type="button" data-action="restart">重新开始</button>
        <button class="btn btn--ghost" type="button" data-action="levels"><span>选择关卡</span><i>▦</i></button>
        <button class="btn btn--ghost" type="button" data-action="menu">返回主菜单</button>
      </div>`;
  }

  function showLevelClear() {
    unlockLevel(G.level);
    const isLast = G.level >= LEVELS.length - 1;
    showOverlay();
    overlay.innerHTML = `
      <div class="result-card">
        <p class="result-kicker">SECTOR CLEARED</p>
        <h2 class="result-title is-good">第 ${G.level + 1} 关完成</h2>
        <p class="result-sub">${isLast ? '所有防线已突破' : '补给已投放：生命 +1 · 下一关已解锁'}</p>
        <div class="result-score"><span>SCORE</span><b>${pad6(G.score)}</b></div>
        ${summaryGrid()}
        <button class="btn btn--primary" type="button" data-action="${isLast ? 'victory' : 'next'}">
          <span>${isLast ? '完成战役' : `进入第 ${G.level + 2} 关`}</span><i>▶</i>
        </button>
        <button class="btn btn--ghost" type="button" data-action="levels"><span>选择关卡</span><i>▦</i></button>
        <button class="btn btn--ghost" type="button" data-action="menu">返回主菜单</button>
      </div>`;
  }

  function showGameOver() {
    G.state = 'gameover';
    G.ending = false;
    if (G.score > G.hi) {
      G.hi = G.score;
      saveHiScore(G.hi);
    }
    showOverlay();
    overlay.innerHTML = `
      <div class="result-card">
        <p class="result-kicker">SIGNAL LOST</p>
        <h2 class="result-title is-danger">${G.overReason === 'base' ? '基地陷落' : '全军覆没'}</h2>
        <p class="result-sub">${G.overReason === 'base' ? '鹰徽被摧毁，防线失守。' : '最后一辆坦克已被击毁。'}</p>
        <div class="result-score"><span>FINAL SCORE</span><b>${pad6(G.score)}</b></div>
        ${summaryGrid()}
        <button class="btn btn--primary" type="button" data-action="restart"><span>再战一次</span><i>▶</i></button>
        <button class="btn btn--ghost" type="button" data-action="levels"><span>选择关卡</span><i>▦</i></button>
        <button class="btn btn--ghost" type="button" data-action="menu">返回主菜单</button>
      </div>`;
    Sound.gameOver();
    updateHud(true);
  }

  function showVictory() {
    G.state = 'victory';
    G.ending = false;
    unlockLevel(TOTAL_LEVELS - 1);
    if (G.score > G.hi) {
      G.hi = G.score;
      saveHiScore(G.hi);
    }
    showOverlay();
    overlay.innerHTML = `
      <div class="result-card">
        <p class="result-kicker">CAMPAIGN COMPLETE</p>
        <h2 class="result-title is-good">全线肃清</h2>
        <p class="result-sub">30 个战区全部肃清，鹰徽依然飘扬。</p>
        <div class="result-score"><span>FINAL SCORE</span><b>${pad6(G.score)}</b></div>
        ${summaryGrid()}
        <button class="btn btn--primary" type="button" data-action="restart"><span>再战一次</span><i>▶</i></button>
        <button class="btn btn--ghost" type="button" data-action="levels"><span>选择关卡</span><i>▦</i></button>
        <button class="btn btn--ghost" type="button" data-action="menu">返回主菜单</button>
      </div>`;
    Sound.victory();
    updateHud(true);
  }

  function updateHud(force = false) {
    const remaining = G.state === 'menu' ? LEVELS[0].total : remainingEnemies();
    const livesText = G.lives > 0 ? '▮'.repeat(G.lives) : '—';
    const hull = G.player ? Math.max(0, G.player.hp) : 0;
    const maxHull = G.player ? G.player.maxHp : 3;
    const hullText = G.player ? '▰'.repeat(hull) + '▱'.repeat(Math.max(0, maxHull - hull)) : '—';
    const shield = G.player && G.player.shield > 0 ? Math.ceil(G.player.shield) : 0;
    const sig = [
      G.state, G.score, G.hi, G.level, G.lives, remaining, hull, maxHull,
      Math.ceil(G.rapid), Math.ceil(G.multi), Math.ceil(G.freeze), shield
    ].join('|');

    if (!force && sig === G.hudSignature) return;
    G.hudSignature = sig;

    scoreEl.textContent = pad6(G.score);
    hiscoreEl.textContent = pad6(Math.max(G.hi, G.score));
    levelEl.textContent = pad2(G.level + 1);
    remainingEl.textContent = pad2(Math.min(remaining, 99));
    if (hullEl) {
      hullEl.textContent = hullText;
      hullEl.classList.toggle('is-low', Boolean(G.player) && hull <= 1);
    }
    livesEl.textContent = livesText;

    const chips = [];
    if (G.multi > 0) chips.push(`<span class="chip chip--amber">MULTI 3x <i>${Math.ceil(G.multi)}s</i></span>`);
    if (G.rapid > 0) chips.push(`<span class="chip chip--amber">RAPID <i>${Math.ceil(G.rapid)}s</i></span>`);
    if (G.freeze > 0) chips.push(`<span class="chip">FREEZE <i>${Math.ceil(G.freeze)}s</i></span>`);
    if (shield > 0) chips.push(`<span class="chip">SHIELD <i>${shield}s</i></span>`);
    buffsEl.innerHTML = chips.join('');

    const missions = {
      menu: '任务 // 守住鹰徽',
      intro: '任务 // 进入战场',
      playing: '任务 // 清除敌军',
      paused: '任务 // 战场冻结',
      ending: '任务 // 信号中断',
      levelClear: '任务 // 区域肃清',
      gameover: '任务 // 防线失守',
      victory: '任务 // 战役完成'
    };
    missionEl.textContent = missions[G.state] || missions.menu;
  }

  function remainingEnemies() {
    let n = G.queue.length + G.pending.length;
    for (const t of G.tanks) if (!t.dead) n++;
    return n;
  }

  // -------------------------------------------------------
  // Input
  // -------------------------------------------------------
  function setDirection(name, pressed) {
    const i = input.dirs.indexOf(name);
    if (pressed) {
      if (i === -1) input.dirs.push(name);
    } else if (i !== -1) {
      input.dirs.splice(i, 1);
    }
  }

  function clearInput() {
    input.dirs.length = 0;
    input.fire = false;
  }

  function togglePause() {
    if (G.state === 'playing') {
      G.state = 'paused';
      clearInput();
      Sound.ui();
      showPause();
      updateHud(true);
    } else if (G.state === 'paused') {
      G.state = 'playing';
      Sound.ui();
      hideOverlay();
      updateHud(true);
    }
  }

  function toggleSound() {
    Sound.ensure();
    Sound.setMuted(!Sound.muted);
    soundIcon.textContent = Sound.muted ? '×' : '♪';
    soundBtn.classList.toggle('is-muted', Sound.muted);
    soundBtn.setAttribute('aria-label', Sound.muted ? '开启声音' : '关闭声音');
    if (!Sound.muted) Sound.ui();
  }

  const keyDirs = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };

  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if ((tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA') && (e.code === 'Space' || e.code === 'Enter')) {
      return;
    }

    if (keyDirs[e.code]) {
      e.preventDefault();
      setDirection(keyDirs[e.code], true);
    } else if (e.code === 'Space' || e.code === 'KeyJ') {
      e.preventDefault();
      input.fire = true;
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      if (G.state === 'playing' || G.state === 'paused') togglePause();
    } else if (e.code === 'KeyM') {
      toggleSound();
    } else if (e.code === 'Enter' && overlay.classList.contains('is-hidden') === false) {
      const primary = overlay.querySelector('.btn--primary');
      if (primary) primary.click();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (keyDirs[e.code]) setDirection(keyDirs[e.code], false);
    if (e.code === 'Space' || e.code === 'KeyJ') input.fire = false;
  });

  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'playing') togglePause();
  });
  document.addEventListener('pointerdown', () => Sound.ensure(), { once: true });

  overlay.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    Sound.ensure();
    Sound.ui();
    switch (button.dataset.action) {
      case 'start':
        startGame();
        break;
      case 'levels':
        showLevelSelect();
        break;
      case 'level':
        {
          const index = Number(button.dataset.level);
          if (Number.isInteger(index) && index < progress.unlocked) {
            hideOverlay();
            startGame(index);
          }
        }
        break;
      case 'resume':
        togglePause();
        break;
      case 'restart':
        restartGame();
        break;
      case 'next':
        nextLevel();
        break;
      case 'victory':
        showVictory();
        break;
      case 'menu':
        goMenu();
        break;
      default:
        break;
    }
  });

  // Touch
  const touchButtons = document.querySelectorAll('[data-dir]');
  for (const btn of touchButtons) {
    const name = btn.dataset.dir;
    const press = (event) => {
      event.preventDefault();
      btn.setPointerCapture?.(event.pointerId);
      btn.classList.add('is-pressed');
      setDirection(name, true);
    };
    const release = (event) => {
      event.preventDefault();
      btn.classList.remove('is-pressed');
      setDirection(name, false);
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  const fireBtn = document.getElementById('fireBtn');
  if (fireBtn) {
    const press = (event) => {
      event.preventDefault();
      fireBtn.setPointerCapture?.(event.pointerId);
      fireBtn.classList.add('is-pressed');
      input.fire = true;
    };
    const release = (event) => {
      event.preventDefault();
      fireBtn.classList.remove('is-pressed');
      input.fire = false;
    };
    fireBtn.addEventListener('pointerdown', press);
    fireBtn.addEventListener('pointerup', release);
    fireBtn.addEventListener('pointercancel', release);
    fireBtn.addEventListener('lostpointercapture', release);
    fireBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  soundBtn.addEventListener('click', toggleSound);
  soundIcon.textContent = Sound.muted ? '×' : '♪';
  soundBtn.classList.toggle('is-muted', Sound.muted);
  soundBtn.setAttribute('aria-label', Sound.muted ? '开启声音' : '关闭声音');

  // -------------------------------------------------------
  // Movement & collision
  // -------------------------------------------------------
  function alignTank(t, axis, dt) {
    const center = axis === 'x' ? t.x + t.w / 2 : t.y + t.h / 2;
    const lane = Math.round((center - TILE / 2) / TILE) * TILE + TILE / 2;
    const diff = lane - center;
    if (Math.abs(diff) < 0.05) return;
    const amount = Math.min(Math.abs(diff), 190 * dt) * sign(diff);
    const nx = t.x + (axis === 'x' ? amount : 0);
    const ny = t.y + (axis === 'y' ? amount : 0);
    if (!rectBlocked(nx, ny, t.w, t.h) && !tankOverlap(t, nx, ny)) {
      t.x = nx;
      t.y = ny;
    }
  }

  function moveTank(t, dirIndex, dt) {
    t.dir = dirIndex;
    const d = DIRS[dirIndex];
    if (dirIndex === 0 || dirIndex === 2) alignTank(t, 'x', dt);
    else alignTank(t, 'y', dt);

    const distance = t.speed * dt;
    const steps = Math.max(1, Math.ceil(distance / 3));
    const step = distance / steps;
    let moved = 0;
    for (let i = 0; i < steps; i++) {
      const nx = t.x + d.x * step;
      const ny = t.y + d.y * step;
      if (rectBlocked(nx, ny, t.w, t.h) || tankOverlap(t, nx, ny)) break;
      t.x = nx;
      t.y = ny;
      t.tread += step;
      moved += step;
    }
    return moved;
  }

  function canMoveDir(t, dirIndex, distance = 28) {
    const d = DIRS[dirIndex];
    const nx = t.x + d.x * distance;
    const ny = t.y + d.y * distance;
    return !rectBlocked(nx, ny, t.w, t.h) && !tankOverlap(t, nx, ny);
  }

  function chooseEnemyDir(t) {
    const baseTarget = { x: 6 * TILE + TILE / 2, y: 12 * TILE + TILE / 2 };
    let target = baseTarget;
    let px = 0;
    let py = 0;
    if (G.player && G.player.shield < 0.1) {
      px = G.player.x + G.player.w / 2 - (t.x + t.w / 2);
      py = G.player.y + G.player.h / 2 - (t.y + t.h / 2);
      const dist = Math.hypot(px, py);
      if (dist < 300 || Math.random() < 0.35 + G.aggression) target = { x: G.player.x + G.player.w / 2, y: G.player.y + G.player.h / 2 };
    } else if (G.player) {
      if (Math.random() < 0.55 + G.aggression) target = { x: G.player.x + G.player.w / 2, y: G.player.y + G.player.h / 2 };
    }

    const tx = target.x - (t.x + t.w / 2);
    const ty = target.y - (t.y + t.h / 2);
    const len = Math.hypot(tx, ty) || 1;
    const nx = tx / len;
    const ny = ty / len;
    const opposite = (t.dir + 2) % 4;

    let best = -Infinity;
    let bestDir = t.dir;
    for (let i = 0; i < 4; i++) {
      if (!canMoveDir(t, i, 30)) continue;
      let score = DIRS[i].x * nx + DIRS[i].y * ny;
      score *= 2.3;
      score += Math.random() * 1.7;
      if (i === t.dir) score += 0.35;
      if (i === opposite) score -= 0.25;
      if (score > best) {
        best = score;
        bestDir = i;
      }
    }

    if (best === -Infinity) {
      // 30px 探测全部被挡时，退一步找 10px 的窄通道；只有真的完全无路才掉头
      let narrow = -1;
      for (let i = 0; i < 4; i++) {
        if (canMoveDir(t, i, 10)) { narrow = i; break; }
      }
      bestDir = narrow !== -1 ? narrow : opposite;
    }
    t.dir = bestDir;
    t.ai.turn = rand(0.8, 1.8);
    t.ai.stuck = 0;
  }

  function enemyShouldFire(t) {
    if (!G.player) return Math.random() < 0.3;
    const px = G.player.x + G.player.w / 2;
    const py = G.player.y + G.player.h / 2;
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    const dx = px - cx;
    const dy = py - cy;
    if ((t.dir === 0 || t.dir === 2) && Math.abs(dx) < 30) return true;
    if ((t.dir === 1 || t.dir === 3) && Math.abs(dy) < 30) return true;
    if (Math.abs(dx) < 34 && Math.abs(dy) < 230) return true;
    if (Math.abs(dy) < 34 && Math.abs(dx) < 230) return true;
    return Math.random() < G.aggression;
  }

  // -------------------------------------------------------
  // Firing
  // -------------------------------------------------------
  function fireTank(t) {
    if (t.fireCd > 0 || t.spawnTimer > 0 || t.dead) return;
    if (t.isPlayer && G.ending) return;

    const spread = t.isPlayer && G.multi > 0 ? [-0.18, 0, 0.18] : [0];
    if (t.isPlayer) {
      const maxBullets = (G.rapid > 0 ? 3 : 2) * (G.multi > 0 ? 3 : 1);
      const active = G.bullets.reduce((n, b) => n + (b.owner === 'player' && b.alive ? 1 : 0), 0);
      if (active >= maxBullets) return;
    }

    const dir = DIRS[t.dir];
    const cx = t.x + t.w / 2 + dir.x * 24;
    const cy = t.y + t.h / 2 + dir.y * 24;
    const speed = t.isPlayer ? (G.rapid > 0 ? 510 : 430) : G.bulletSpeed;

    for (const offset of spread) {
      const cos = Math.cos(offset);
      const sin = Math.sin(offset);
      const dx = dir.x * cos - dir.y * sin;
      const dy = dir.x * sin + dir.y * cos;
      G.bullets.push({
        x: cx,
        y: cy,
        dx,
        dy,
        speed,
        owner: t.isPlayer ? 'player' : 'enemy',
        color: t.isPlayer ? COLORS.teal : (t.type === 'scout' ? COLORS.amber : COLORS.red),
        alive: true,
        life: 3,
        size: t.isPlayer ? 4 : 3.4
      });
      if (t.isPlayer) G.stats.shots++;
    }

    t.fireCd = t.isPlayer ? (G.rapid > 0 ? 0.145 : 0.31) : t.fireInterval * rand(0.9, 1.35);
    t.muzzle = 0.09;

    Sound.shoot(t.isPlayer);

    addMuzzleSmoke(cx - dir.x * 6, cy - dir.y * 6, dir, t.isPlayer ? COLORS.teal : COLORS.amber);
  }

  // -------------------------------------------------------
  // Damage & effects
  // -------------------------------------------------------
  function addMuzzleSmoke(x, y, dir, color) {
    for (let i = 0; i < 3; i++) {
      G.particles.push({
        kind: 'spark',
        x,
        y,
        vx: dir.x * rand(30, 90) + rand(-20, 20),
        vy: dir.y * rand(30, 90) + rand(-20, 20),
        life: rand(0.08, 0.18),
        maxLife: 0.18,
        size: rand(1, 2.4),
        color,
        gravity: 0
      });
    }
  }

  function spawnExplosion(x, y, scale = 1, color = '#ffb347') {
    const ring = {
      kind: 'ring',
      x, y,
      life: 0.34,
      maxLife: 0.34,
      size: 6 * scale,
      color,
      gravity: 0
    };
    G.particles.push(ring);

    const sparks = Math.round(13 * scale);
    for (let i = 0; i < sparks; i++) {
      const a = rand(0, TAU);
      const sp = rand(40, 210) * scale;
      G.particles.push({
        kind: 'spark',
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.2, 0.6),
        maxLife: 0.6,
        size: rand(1.2, 3.2) * scale,
        color: Math.random() < 0.35 ? '#fff1b8' : color,
        gravity: 30
      });
    }

    const smokes = Math.round(5 * scale);
    for (let i = 0; i < smokes; i++) {
      G.particles.push({
        kind: 'smoke',
        x: x + rand(-8, 8) * scale,
        y: y + rand(-8, 8) * scale,
        vx: rand(-20, 20),
        vy: rand(-34, -10),
        life: rand(0.55, 1.25),
        maxLife: 1.25,
        size: rand(8, 15) * scale,
        color: '#3b4653',
        gravity: -6
      });
    }

    for (let i = 0; i < Math.round(4 * scale); i++) {
      const a = rand(0, TAU);
      G.particles.push({
        kind: 'debris',
        x, y,
        vx: Math.cos(a) * rand(50, 150),
        vy: Math.sin(a) * rand(50, 150) - 30,
        life: rand(0.35, 0.7),
        maxLife: 0.7,
        size: rand(2, 4),
        color: '#7c8794',
        gravity: 260,
        rot: rand(0, TAU),
        vr: rand(-9, 9)
      });
    }
  }

  function spawnSpark(x, y, color = '#ffd37a', amount = 5) {
    for (let i = 0; i < amount; i++) {
      const a = rand(0, TAU);
      G.particles.push({
        kind: 'spark',
        x, y,
        vx: Math.cos(a) * rand(20, 100),
        vy: Math.sin(a) * rand(20, 100),
        life: rand(0.12, 0.32),
        maxLife: 0.32,
        size: rand(0.8, 2.1),
        color,
        gravity: 80
      });
    }
  }

  function damagePlayer() {
    if (!G.player || G.player.dead) return;
    if (G.player.shield > 0 || G.player.spawnTimer > 0 || G.player.invuln > 0) {
      spawnSpark(
        G.player.x + G.player.w / 2,
        G.player.y + G.player.h / 2,
        COLORS.teal, 8
      );
      Sound.shield();
      return;
    }

    const p = G.player;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;
    p.hp = Math.max(0, p.hp - 1);
    p.invuln = 0.75;
    p.flash = 0.16;

    if (p.hp > 0) {
      spawnSpark(px, py, '#ffd37a', 10);
      G.shake = Math.max(G.shake, 6);
      G.floaters.push({
        x: px, y: py - 10, text: '装甲 -1', color: '#ffd37a', life: 0.8, maxLife: 0.8
      });
      Sound.armorHit();
      updateHud(true);
      return;
    }

    G.player = null;
    G.lives = Math.max(0, G.lives - 1);
    spawnExplosion(px, py, 1.5, COLORS.teal);
    spawnExplosion(px, py, 0.8, '#ffffff');
    G.shake = Math.max(G.shake, 15);
    G.flash = 0.28;
    G.flashColor = COLORS.teal;
    Sound.playerHit();
    updateHud(true);

    if (G.lives <= 0) {
      G.state = 'ending';
      G.overTimer = 1.7;
      G.overReason = 'lives';
      G.ending = true;
    } else {
      G.respawnTimer = 1.35;
    }
  }

  function damageEnemy(enemy, bullet) {
    if (enemy.dead) return;
    if (enemy.spawnTimer > 0) {
      spawnSpark(bullet.x, bullet.y, COLORS.amber, 4);
      return;
    }
    G.stats.hits++;
    enemy.hp--;
    enemy.flash = 0.12;
    if (enemy.hp <= 0) {
      killEnemy(enemy);
    } else {
      spawnSpark(bullet.x, bullet.y, '#f4e3bd', 7);
      Sound.steel();
    }
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    G.score += enemy.score;
    G.stats.kills++;
    const x = enemy.x + enemy.w / 2;
    const y = enemy.y + enemy.h / 2;
    const big = enemy.type === 'armor';
    spawnExplosion(x, y, big ? 1.55 : 1.05, enemy.def.body);
    G.shake = Math.max(G.shake, big ? 11 : 6);
    G.flash = Math.max(G.flash, big ? 0.14 : 0.07);
    G.flashColor = enemy.def.body;
    Sound.explosion(big);
    G.floaters.push({
      x, y: y - 8, text: `+${enemy.score}`, color: '#ffd37a', life: 1.05, maxLife: 1.05
    });
    if (Math.random() < G.powerupChance) spawnPowerup(x, y);
    updateHud(true);
  }

  function destroyBase() {
    if (!G.baseAlive) return;
    G.baseAlive = false;
    G.map[12][6] = { type: T.RUBBLE, hp: 0, variant: 2 };
    G.shake = 24;
    G.flash = 0.5;
    G.flashColor = '#ff7a2f';
    spawnExplosion(6 * TILE + TILE / 2, 12 * TILE + TILE / 2, 2.3, COLORS.amberHot);
    spawnExplosion(6 * TILE + TILE / 2, 12 * TILE + TILE / 2, 1.4, '#ffffff');
    Sound.baseAlarm();
    G.state = 'ending';
    G.ending = true;
    G.overTimer = 2;
    G.overReason = 'base';
    updateHud(true);
  }

  function damageBrick(col, row, x, y) {
    const tile = tileAt(col, row);
    if (!tile || tile.type !== T.BRICK) return;
    tile.hp--;
    Sound.brick();
    if (tile.hp <= 0) {
      tile.type = T.EMPTY;
      spawnExplosion(col * TILE + TILE / 2, row * TILE + TILE / 2, 0.5, '#b96543');
      G.shake = Math.max(G.shake, 2);
    } else {
      spawnSpark(x, y, '#d98a5f', 5);
    }
  }

  function applyPowerup(powerup) {
    const label = {
      shield: '护盾 +8s',
      rapid: '急速射击 +10s',
      multi: '三连发 +12s',
      life: '生命 +1',
      bomb: '全屏轰炸',
      freeze: '时间冻结 +5s'
    }[powerup.type];

    switch (powerup.type) {
      case 'shield':
        if (G.player) G.player.shield = Math.max(G.player.shield, 8);
        break;
      case 'rapid':
        G.rapid = Math.max(G.rapid, 10);
        break;
      case 'multi':
        G.multi = Math.max(G.multi, 12);
        break;
      case 'life':
        G.lives = Math.min(5, G.lives + 1);
        break;
      case 'bomb': {
        const targets = G.tanks.filter((t) => !t.dead);
        for (const t of targets) killEnemy(t);
        G.shake = Math.max(G.shake, 18);
        G.flash = 0.32;
        G.flashColor = '#ffffff';
        break;
      }
      case 'freeze':
        G.freeze = Math.max(G.freeze, 5);
        break;
      default:
        break;
    }

    G.score += 50;
    G.floaters.push({
      x: powerup.x,
      y: powerup.y - 14,
      text: label,
      color: COLORS.teal,
      life: 1.35,
      maxLife: 1.35
    });
    Sound.powerup();
    spawnSpark(powerup.x, powerup.y, COLORS.teal, 14);
    updateHud(true);
  }

  function spawnPowerup(x, y) {
    const roll = Math.random();
    let type = 'shield';
    if (roll > 0.86) type = 'life';
    else if (roll > 0.72) type = 'bomb';
    else if (roll > 0.58) type = 'freeze';
    else if (roll > 0.43) type = 'rapid';
    else if (roll > 0.26) type = 'multi';
    G.powerups.push({
      x,
      y,
      type,
      life: 12,
      maxLife: 12,
      phase: rand(0, TAU)
    });
  }

  // -------------------------------------------------------
  // Update
  // -------------------------------------------------------
  function updatePlayer(dt) {
    if (!G.player) return;
    const p = G.player;
    p.fireCd = Math.max(0, p.fireCd - dt);
    p.muzzle = Math.max(0, p.muzzle - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.shield = Math.max(0, p.shield - dt);
    p.spawnTimer = Math.max(0, p.spawnTimer - dt);
    if (p.spawnTimer > 0) return;

    if (G.state !== 'playing' || G.ending) return;
    if (input.dirs.length) {
      const last = input.dirs[input.dirs.length - 1];
      moveTank(p, DIR_INDEX[last], dt);
    }
    if (input.fire) fireTank(p);
  }

  function updateEnemy(enemy, dt) {
    if (enemy.dead) return;
    enemy.muzzle = Math.max(0, enemy.muzzle - dt);
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.fireCd = Math.max(0, enemy.fireCd - dt);

    if (enemy.spawnTimer > 0) {
      enemy.spawnTimer = Math.max(0, enemy.spawnTimer - dt);
      return;
    }

    if (G.freeze > 0) return;

    enemy.ai.turn -= dt;
    if (enemy.ai.turn <= 0 || enemy.ai.stuck > 0.22) chooseEnemyDir(enemy);

    const expected = enemy.speed * dt;
    const moved = moveTank(enemy, enemy.dir, dt);
    if (moved < expected * 0.45) enemy.ai.stuck += dt;
    else enemy.ai.stuck = Math.max(0, enemy.ai.stuck - dt * 2);

    if (enemy.fireCd <= 0 && enemyShouldFire(enemy)) fireTank(enemy);
  }

  function updateSpawning(dt) {
    if (G.queue.length === 0 && G.pending.length === 0) return;
    G.spawnTimer -= dt;

    const active = G.tanks.filter((t) => !t.dead).length + G.pending.length;
    if (G.queue.length > 0 && active < G.maxActive && G.spawnTimer <= 0) {
      const point = SPAWN_POINTS[G.spawnIndex % SPAWN_POINTS.length];
      G.spawnIndex++;
      if (spawnClear(point.col, point.row)) {
        G.pending.push({
          col: point.col,
          row: point.row,
          timer: 0.9,
          type: G.queue.shift()
        });
        G.spawnTimer = G.spawnInterval;
      } else {
        G.spawnTimer = 0.45;
      }
    }

    for (let i = G.pending.length - 1; i >= 0; i--) {
      const p = G.pending[i];
      p.timer -= dt;
      if (p.timer > 0) continue;
      if (spawnClear(p.col, p.row)) {
        const enemy = createEnemy(p.type, p.col, p.row);
        G.tanks.push(enemy);
        spawnSpark(p.col * TILE + TILE / 2, p.row * TILE + TILE / 2, COLORS.amber, 10);
        G.pending.splice(i, 1);
        updateHud(true);
      } else {
        p.timer = 0.25;
      }
    }
  }

  function updateBullets(dt) {
    for (const b of G.bullets) {
      if (!b.alive) continue;
      b.life -= dt;
      if (b.life <= 0) { b.alive = false; continue; }

      let remain = b.speed * dt;
      while (remain > 0 && b.alive) {
        const step = Math.min(4, remain);
        remain -= step;
        b.x += b.dx * step;
        b.y += b.dy * step;

        if (b.x < -4 || b.y < -4 || b.x > W + 4 || b.y > H + 4) {
          b.alive = false;
          spawnSpark(clamp(b.x, 0, W), clamp(b.y, 0, H), '#ffd37a', 3);
          break;
        }

        const col = Math.floor(b.x / TILE);
        const row = Math.floor(b.y / TILE);
        const tile = tileAt(col, row);
        if (tile) {
          if (tile.type === T.BRICK) {
            damageBrick(col, row, b.x, b.y);
            b.alive = false;
            break;
          }
          if (tile.type === T.STEEL) {
            spawnSpark(b.x, b.y, '#e8f3ff', 6);
            Sound.steel();
            b.alive = false;
            break;
          }
          if (tile.type === T.BASE) {
            if (b.owner === 'enemy') {
              destroyBase();
            } else {
              spawnSpark(b.x, b.y, COLORS.amber, 4);
              Sound.steel();
            }
            b.alive = false;
            break;
          }
        }

        if (b.owner === 'player') {
          for (const enemy of G.tanks) {
            if (enemy.dead || enemy.spawnTimer > 0) continue;
            if (b.x > enemy.x && b.x < enemy.x + enemy.w && b.y > enemy.y && b.y < enemy.y + enemy.h) {
              damageEnemy(enemy, b);
              b.alive = false;
              break;
            }
          }
        } else if (G.player && G.player.spawnTimer <= 0) {
          const p = G.player;
          if (b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) {
            b.alive = false;
            damagePlayer();
          }
        }
      }
    }

    // Player shells can intercept enemy shells.
    for (let i = 0; i < G.bullets.length; i++) {
      const a = G.bullets[i];
      if (!a.alive || a.owner !== 'player') continue;
      for (let j = 0; j < G.bullets.length; j++) {
        const b = G.bullets[j];
        if (!b.alive || b.owner !== 'enemy') continue;
        if (Math.abs(a.x - b.x) < 9 && Math.abs(a.y - b.y) < 9) {
          a.alive = false;
          b.alive = false;
          spawnSpark((a.x + b.x) / 2, (a.y + b.y) / 2, '#ffffff', 7);
          break;
        }
      }
    }

    G.bullets = G.bullets.filter((b) => b.alive);
  }

  function updatePowerups(dt) {
    for (let i = G.powerups.length - 1; i >= 0; i--) {
      const p = G.powerups[i];
      p.life -= dt;
      if (p.life <= 0) {
        G.powerups.splice(i, 1);
        continue;
      }
      if (G.player) {
        const cx = G.player.x + G.player.w / 2;
        const cy = G.player.y + G.player.h / 2;
        if (Math.hypot(cx - p.x, cy - p.y) < 28) {
          applyPowerup(p);
          G.powerups.splice(i, 1);
        }
      }
    }
  }

  function updateParticles(dt) {
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        G.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      if (p.kind === 'smoke') {
        p.vx *= 0.985;
        p.size += 7 * dt;
      }
      if (p.kind === 'debris') p.rot += (p.vr || 0) * dt;
    }
  }

  function updateFloaters(dt) {
    for (let i = G.floaters.length - 1; i >= 0; i--) {
      const f = G.floaters[i];
      f.life -= dt;
      f.y -= 22 * dt;
      if (f.life <= 0) G.floaters.splice(i, 1);
    }
  }

  function updateEffects(dt) {
    G.shake = Math.max(0, G.shake - 34 * dt);
    G.flash = Math.max(0, G.flash - 1.8 * dt);
  }

  function updateMusic(dt) {
    if (Sound.muted || G.state !== 'playing') return;
    G.musicTimer -= dt;
    if (G.musicTimer > 0) return;
    G.musicTimer = 0.58;
    const seq = [55, 55, 65.41, 55, 73.42, 55, 49, 55];
    const freq = seq[G.musicStep % seq.length] * (1 + G.level * 0.08);
    Sound.tone(freq, 0.24, 'triangle', 0.028, freq * 0.96);
    if (G.musicStep % 2 === 0) Sound.noise(0.035, 0.012, 5200, 'highpass');
    G.musicStep++;
  }

  function updatePlaying(dt) {
    if (G.state !== 'playing' || G.ending) return;

    G.rapid = Math.max(0, G.rapid - dt);
    G.multi = Math.max(0, G.multi - dt);
    G.freeze = Math.max(0, G.freeze - dt);

    if (!G.player && G.respawnTimer > 0) {
      G.respawnTimer -= dt;
      if (G.respawnTimer <= 0) spawnPlayer();
    }

    updateSpawning(dt);
    updatePlayer(dt);
    for (const enemy of G.tanks) updateEnemy(enemy, dt);
    updateBullets(dt);
    updatePowerups(dt);
    G.tanks = G.tanks.filter((t) => !t.dead);

    if (G.state !== 'playing') return;

    if (remainingEnemies() === 0) {
      if (!G.levelClearArmed) {
        G.levelClearArmed = true;
        G.levelClearTimer = 1.25;
      } else {
        G.levelClearTimer -= dt;
        if (G.levelClearTimer <= 0) {
          G.state = 'levelClear';
          if (G.level >= LEVELS.length - 1) {
            showVictory();
          } else {
            showLevelClear();
            Sound.levelClear();
          }
        }
      }
    } else {
      G.levelClearArmed = false;
      G.levelClearTimer = 0;
    }
  }

  function update(dt) {
    G.time += dt;
    updateEffects(dt);
    updateParticles(dt);
    updateFloaters(dt);
    updateMusic(dt);

    if (G.state === 'paused' || G.state === 'menu') {
      updateHud();
      return;
    }

    if (G.state === 'intro') {
      G.introTimer -= dt;
      if (G.introTimer <= 0) {
        G.state = 'playing';
        G.spawnTimer = Math.min(G.spawnTimer, 0.4);
        G.flash = 0.08;
        G.flashColor = COLORS.teal;
      }
      updateHud();
      return;
    }

    if (G.state === 'playing') {
      updatePlaying(dt);
      updateHud();
      return;
    }

    if (G.state === 'ending') {
      G.overTimer -= dt;
      if (G.overTimer <= 0) showGameOver();
      updateHud();
      return;
    }

    updateHud();
  }

  // -------------------------------------------------------
  // Rendering helpers
  // -------------------------------------------------------
  const grain = (() => {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    const g = c.getContext('2d');
    const img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = Math.random() < 0.5 ? 14 : 5;
    }
    g.putImageData(img, 0, 0);
    return ctx.createPattern(c, 'repeat');
  })();

  function drawGround() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d1722');
    bg.addColorStop(0.55, '#0a121b');
    bg.addColorStop(1, '#080f17');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = 'rgba(112, 154, 180, 0.055)';
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * TILE + 0.5, 0);
      ctx.lineTo(i * TILE + 0.5, H);
      ctx.stroke();
    }
    for (let i = 1; i < ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * TILE + 0.5);
      ctx.lineTo(W, i * TILE + 0.5);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Faint diagonal hazard accents near the top corners.
    ctx.save();
    ctx.globalAlpha = 0.11;
    ctx.strokeStyle = COLORS.amber;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(8, 18 + i * 9);
      ctx.lineTo(18 + i * 9, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W - 8, 18 + i * 9);
      ctx.lineTo(W - 18 - i * 9, 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBrick(tile, x, y) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, TILE, TILE);
    ctx.clip();

    ctx.fillStyle = '#24110d';
    ctx.fillRect(x, y, TILE, TILE);

    const shades = ['#8c3a26', '#98432c', '#7c3220', '#a44a31'];
    const bw = 24;
    const bh = 12;
    for (let row = 0; row < 4; row++) {
      const offset = row % 2 ? -12 : 0;
      for (let bx = -24; bx < TILE + 24; bx += bw) {
        const px = x + bx + offset;
        const color = shades[(tile.variant + row * 3 + Math.floor(bx / bw) + 4) % shades.length];
        ctx.fillStyle = color;
        ctx.fillRect(px + 1, y + row * bh + 1, bw - 2, bh - 2);
        ctx.fillStyle = 'rgba(255, 195, 150, 0.14)';
        ctx.fillRect(px + 2, y + row * bh + 2, bw - 4, 1);
        ctx.fillStyle = 'rgba(30, 9, 4, 0.28)';
        ctx.fillRect(px + 2, y + row * bh + bh - 3, bw - 4, 1);
      }
    }

    if (tile.hp <= 1) {
      ctx.strokeStyle = 'rgba(22, 7, 4, 0.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 4);
      ctx.lineTo(x + 15, y + 17);
      ctx.lineTo(x + 11, y + 27);
      ctx.lineTo(x + 21, y + 35);
      ctx.moveTo(x + 30, y + 8);
      ctx.lineTo(x + 25, y + 19);
      ctx.lineTo(x + 33, y + 28);
      ctx.lineTo(x + 28, y + 40);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 200, 160, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 5);
      ctx.lineTo(x + 16, y + 18);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    ctx.restore();
  }

  function drawSteel(tile, x, y) {
    const g = ctx.createLinearGradient(x, y, x + TILE, y + TILE);
    g.addColorStop(0, '#9aa6b3');
    g.addColorStop(0.45, '#65717f');
    g.addColorStop(1, '#414c58');
    ctx.fillStyle = g;
    ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x + 3, y + 3, TILE - 6, 2);
    ctx.fillStyle = 'rgba(9, 15, 22, 0.4)';
    ctx.fillRect(x + 3, y + TILE - 5, TILE - 6, 2);

    ctx.strokeStyle = 'rgba(18, 25, 33, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);

    ctx.fillStyle = '#c6d1dc';
    for (const [bx, by] of [[9, 9], [TILE - 9, 9], [9, TILE - 9], [TILE - 9, TILE - 9]]) {
      ctx.beginPath();
      ctx.arc(x + bx, y + by, 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(20, 28, 36, 0.6)';
      ctx.beginPath();
      ctx.arc(x + bx + 0.7, y + by + 0.7, 1.15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#c6d1dc';
    }

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + TILE - 12);
    ctx.lineTo(x + TILE - 12, y + 8);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  }

  function drawWater(tile, x, y) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, TILE, TILE);
    ctx.clip();

    const g = ctx.createLinearGradient(x, y, x, y + TILE);
    g.addColorStop(0, '#0a2a3a');
    g.addColorStop(0.5, '#0e3d54');
    g.addColorStop(1, '#092637');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, TILE, TILE);

    const t = G.time;
    for (let i = 0; i < 4; i++) {
      const yy = y + 8 + i * 11;
      ctx.beginPath();
      for (let px = 0; px <= TILE; px += 3) {
        const wy = yy + Math.sin(t * 2.1 + (x + px) * 0.08 + i * 1.7) * 2.2;
        if (px === 0) ctx.moveTo(x + px, wy);
        else ctx.lineTo(x + px, wy);
      }
      ctx.strokeStyle = i % 2 ? 'rgba(93, 195, 210, 0.32)' : 'rgba(43, 139, 163, 0.42)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#c6f4ff';
    for (let i = 0; i < 3; i++) {
      const sx = x + 8 + ((tile.variant * 13 + i * 17) % 32);
      const sy = y + 11 + ((i * 13 + Math.floor(t * 12 + tile.variant * 5)) % 30);
      ctx.fillRect(sx, sy, 3, 1);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(6, 16, 24, 0.55)';
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  }

  function drawTrees(x, y, tile) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, TILE, TILE);
    ctx.clip();
    ctx.fillStyle = 'rgba(4, 12, 9, 0.32)';
    ctx.fillRect(x, y, TILE, TILE);

    const baseX = x + 8 + (tile.variant % 3) * 3;
    const baseY = y + 10 + (tile.variant % 2) * 4;
    const clusters = [
      [baseX, baseY, 11, '#1d4d31'],
      [baseX + 20, baseY + 3, 12, '#20583a'],
      [baseX + 8, baseY + 22, 12, '#17432b'],
      [baseX + 27, baseY + 22, 10, '#1a4a30'],
      [baseX + 17, baseY + 10, 15, '#276a43']
    ];
    for (const [cx, cy, r, color] of clusters) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(86, 160, 103, 0.34)';
    ctx.beginPath();
    ctx.arc(baseX + 5, baseY + 3, 5, 0, TAU);
    ctx.arc(baseX + 22, baseY + 15, 4, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(2, 8, 6, 0.3)';
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  }

  function drawEagle(cx, cy, scale = 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.shadowColor = 'rgba(255, 179, 71, 0.8)';
    ctx.shadowBlur = 13;

    ctx.fillStyle = '#ffd37a';
    // Wings
    ctx.beginPath();
    ctx.moveTo(-3, -2);
    ctx.lineTo(-17, -10);
    ctx.lineTo(-14, 1);
    ctx.lineTo(-19, 6);
    ctx.lineTo(-5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, -2);
    ctx.lineTo(17, -10);
    ctx.lineTo(14, 1);
    ctx.lineTo(19, 6);
    ctx.lineTo(5, 8);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 2, 4.6, 10, 0, 0, TAU);
    ctx.fill();

    // Tail
    ctx.beginPath();
    ctx.moveTo(-4, 9);
    ctx.lineTo(0, 15);
    ctx.lineTo(4, 9);
    ctx.closePath();
    ctx.fill();

    // Head + beak
    ctx.beginPath();
    ctx.arc(0, -10, 4.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff0bd';
    ctx.beginPath();
    ctx.moveTo(3, -12);
    ctx.lineTo(9, -10);
    ctx.lineTo(3, -8);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a1707';
    ctx.beginPath();
    ctx.arc(1, -11, 1.1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawBase(x, y) {
    ctx.save();
    if (!G.baseAlive) {
      ctx.fillStyle = '#171d24';
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = '#2a323c';
      for (const [dx, dy, s] of [[8, 27, 8], [21, 19, 7], [29, 32, 5], [13, 13, 4]]) {
        ctx.fillRect(x + dx, y + dy, s, s);
      }
      ctx.strokeStyle = 'rgba(255, 122, 47, 0.22)';
      ctx.strokeRect(x + 4.5, y + 4.5, TILE - 9, TILE - 9);
      ctx.restore();
      return;
    }

    const pulse = 0.5 + 0.5 * Math.sin(G.time * 3.1);
    ctx.fillStyle = 'rgba(255, 179, 71, 0.09)';
    ctx.beginPath();
    ctx.arc(x + TILE / 2, y + TILE / 2 + 2, 20 + pulse * 3, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#1b2530';
    roundRectPath(ctx, x + 4, y + 5, TILE - 8, TILE - 9, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.55)';
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, x + 4.5, y + 5.5, TILE - 9, TILE - 10, 4);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 179, 71, ${0.12 + pulse * 0.18})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + TILE / 2, y + TILE / 2, 19 + pulse * 2, 0, TAU);
    ctx.stroke();

    drawEagle(x + TILE / 2, y + TILE / 2 + 1, 0.92);

    ctx.font = '700 5px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 211, 122, 0.6)';
    ctx.fillText('BASE', x + TILE / 2, y + TILE - 5);
    ctx.restore();
  }

  function drawTiles() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = G.map[r][c];
        const x = c * TILE;
        const y = r * TILE;
        switch (tile.type) {
          case T.BRICK: drawBrick(tile, x, y); break;
          case T.STEEL: drawSteel(tile, x, y); break;
          case T.WATER: drawWater(tile, x, y); break;
          case T.BASE: drawBase(x, y); break;
          case T.RUBBLE: {
            ctx.fillStyle = '#0b1016';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#252d36';
            for (const [dx, dy, s] of [[7, 9, 9], [23, 14, 7], [13, 28, 10], [31, 30, 6]]) {
              ctx.fillRect(x + dx, y + dy, s, s);
            }
            break;
          }
          default:
            break;
        }
      }
    }
  }

  function drawTreesLayer() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = G.map[r][c];
        if (tile.type === T.TREES) drawTrees(c * TILE, r * TILE, tile);
      }
    }
  }

  function drawTreadMarks(t, pal) {
    ctx.fillStyle = pal.track;
    roundRectPath(ctx, -18, -18, 8, 36, 2);
    ctx.fill();
    roundRectPath(ctx, 10, -18, 8, 36, 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    const offset = ((t.tread % 6) + 6) % 6;
    for (let yy = -17 + offset; yy < 17; yy += 6) {
      ctx.fillRect(-17, yy, 6, 2);
      ctx.fillRect(11, yy, 6, 2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(-18, -18, 1.5, 36);
    ctx.fillRect(10, -18, 1.5, 36);
  }

  function drawTank(t) {
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    const pal = t.isPlayer ? PLAYER_PALETTE : t.def;
    const invulnBlink = t.isPlayer && t.invuln > 0 && Math.floor(G.time * 22) % 2 === 0;
    const flicker = (t.spawnTimer > 0 && Math.floor(G.time * 18) % 2 === 0) || invulnBlink;

    ctx.save();
    // Ground shadow
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(cx + 1, cy + 4, 19, 15, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.translate(cx, cy);

    if (t.isPlayer && t.shield > 0) {
      const pulse = 0.65 + Math.sin(G.time * 8) * 0.2;
      ctx.save();
      ctx.strokeStyle = `rgba(79, 227, 208, ${pulse})`;
      ctx.lineWidth = 1.7;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -G.time * 28;
      ctx.beginPath();
      ctx.arc(0, 0, 24.5, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    ctx.rotate(DIRS[t.dir].angle);
    if (flicker) ctx.globalAlpha = 0.36;

    drawTreadMarks(t, pal);

    // Hull
    const hull = ctx.createLinearGradient(-13, 0, 13, 0);
    hull.addColorStop(0, pal.dark);
    hull.addColorStop(0.24, pal.body);
    hull.addColorStop(0.52, pal.light);
    hull.addColorStop(0.76, pal.body);
    hull.addColorStop(1, pal.dark);
    ctx.fillStyle = hull;
    roundRectPath(ctx, -12.5, -16.5, 25, 33, 3.5);
    ctx.fill();

    // Front plate
    ctx.fillStyle = pal.light;
    ctx.globalAlpha *= 0.82;
    roundRectPath(ctx, -10.5, -16, 21, 5, 2);
    ctx.fill();
    ctx.globalAlpha = flicker ? 0.36 : 1;

    // Rear vents
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    for (let i = 0; i < 3; i++) ctx.fillRect(-7, 10 + i * 2.4, 14, 1);

    // Turret
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.arc(0, -1, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.arc(0, -1.5, 8.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = pal.light;
    ctx.beginPath();
    ctx.arc(-2.2, -4, 3.1, 0, TAU);
    ctx.fill();

    // Barrel
    ctx.fillStyle = pal.dark;
    roundRectPath(ctx, -2.7, -28, 5.4, 21, 1.7);
    ctx.fill();
    ctx.fillStyle = pal.body;
    roundRectPath(ctx, -1.6, -27.5, 2, 19.5, 1);
    ctx.fill();
    ctx.fillStyle = pal.dark;
    roundRectPath(ctx, -3.6, -29, 7.2, 4, 1);
    ctx.fill();

    // Player insignia
    if (t.isPlayer) {
      ctx.fillStyle = 'rgba(7, 52, 52, 0.75)';
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(-3.5, 7);
      ctx.lineTo(3.5, 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#eafffb';
      ctx.fillRect(-1, 3, 2, 2);
    } else if (t.type === 'armor') {
      ctx.fillStyle = 'rgba(20, 27, 34, 0.75)';
      ctx.fillRect(-4, 5, 8, 2);
    }

    if (t.muzzle > 0) {
      const a = t.muzzle / 0.09;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff3ba';
      ctx.beginPath();
      ctx.moveTo(0, -35);
      ctx.lineTo(4, -29);
      ctx.lineTo(1.5, -29);
      ctx.lineTo(5, -26);
      ctx.lineTo(-5, -26);
      ctx.lineTo(-1.5, -29);
      ctx.lineTo(-4, -29);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 179, 71, 0.7)';
      ctx.beginPath();
      ctx.arc(0, -30, 4, 0, TAU);
      ctx.fill();
    }

    ctx.restore();

    if (t.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = t.flash * 4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    if (t.hp < t.maxHp) {
      const pipW = 5;
      const total = t.maxHp * pipW + (t.maxHp - 1) * 2;
      const startX = cx - total / 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(startX - 2, cy - 29, total + 4, 5);
      for (let i = 0; i < t.maxHp; i++) {
        ctx.fillStyle = i < t.hp
          ? (t.isPlayer ? COLORS.teal : COLORS.amber)
          : 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(startX + i * (pipW + 2), cy - 27.5, pipW, 2);
      }
    }
  }

  function drawBullets() {
    ctx.save();
    for (const b of G.bullets) {
      if (!b.alive) continue;
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(b.x - b.dx * 16, b.y - b.dy * 16);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 11;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x - b.dx * 1.2, b.y - b.dy * 1.2, b.size * 0.42, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPowerupIcon(type, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#0a1517';
    ctx.fillStyle = '#071214';
    ctx.lineWidth = 1.5;
    switch (type) {
      case 'shield':
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(7, -4);
        ctx.lineTo(6, 3);
        ctx.lineTo(0, 8);
        ctx.lineTo(-6, 3);
        ctx.lineTo(-7, -4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#8ffcf1';
        ctx.stroke();
        break;
      case 'rapid':
        ctx.beginPath();
        ctx.moveTo(2, -9);
        ctx.lineTo(-5, 1);
        ctx.lineTo(-1, 1);
        ctx.lineTo(-2, 9);
        ctx.lineTo(6, -2);
        ctx.lineTo(1, -2);
        ctx.closePath();
        ctx.fillStyle = '#ffe28a';
        ctx.fill();
        break;
      case 'multi':
        ctx.fillStyle = '#9fffe7';
        for (let i = -1; i <= 1; i++) {
          const bx = i * 5;
          ctx.beginPath();
          ctx.moveTo(bx, -8);
          ctx.lineTo(bx + 2.3, -3);
          ctx.lineTo(bx - 2.3, -3);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(bx - 1.5, -1, 3, 8);
        }
        break;
      case 'life':
        ctx.fillStyle = '#ff7a72';
        ctx.beginPath();
        ctx.moveTo(0, 7);
        ctx.bezierCurveTo(-12, -2, -7, -10, 0, -4);
        ctx.bezierCurveTo(7, -10, 12, -2, 0, 7);
        ctx.fill();
        break;
      case 'bomb':
        ctx.fillStyle = '#ffca6b';
        ctx.beginPath();
        ctx.arc(0, 2, 6.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#38200a';
        ctx.fillRect(-1, -8, 2, 5);
        ctx.strokeStyle = '#ffca6b';
        ctx.beginPath();
        ctx.moveTo(1, -8);
        ctx.quadraticCurveTo(6, -12, 8, -8);
        ctx.stroke();
        break;
      case 'freeze':
        ctx.strokeStyle = '#a9f4ff';
        ctx.lineWidth = 1.8;
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI) / 3);
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          ctx.lineTo(8, 0);
          ctx.stroke();
          ctx.restore();
        }
        break;
      default:
        break;
    }
    ctx.restore();
  }

  function drawPowerups() {
    for (const p of G.powerups) {
      const bob = Math.sin(G.time * 3 + p.phase) * 2.5;
      const py = p.y + bob;
      const expiring = p.life < 3 && Math.floor(G.time * 7) % 2 === 0;
      ctx.save();
      ctx.globalAlpha = expiring ? 0.42 : 1;
      ctx.shadowColor = 'rgba(79, 227, 208, 0.65)';
      ctx.shadowBlur = 15;
      ctx.fillStyle = 'rgba(5, 15, 18, 0.9)';
      ctx.strokeStyle = 'rgba(79, 227, 208, 0.75)';
      ctx.lineWidth = 1.3;
      roundRectPath(ctx, p.x - 12, py - 12, 24, 24, 4);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      drawPowerupIcon(p.type, p.x, py);
      ctx.restore();
    }
  }

  function drawParticles() {
    ctx.save();
    for (const p of G.particles) {
      if (p.kind !== 'smoke') continue;
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1) * 0.34;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of G.particles) {
      if (p.kind === 'smoke') continue;
      const a = clamp(p.life / p.maxLife, 0, 1);
      if (p.kind === 'ring') {
        ctx.globalAlpha = a * 0.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (1 - a) * 32, 0, TAU);
        ctx.stroke();
      } else if (p.kind === 'spark') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, TAU);
        ctx.fill();
      } else if (p.kind === 'debris') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawPending() {
    for (const p of G.pending) {
      const x = p.col * TILE + TILE / 2;
      const y = p.row * TILE + TILE / 2;
      const pulse = 0.5 + 0.5 * Math.sin(G.time * 10);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(G.time * 2.2);
      ctx.strokeStyle = `rgba(255, 179, 71, ${0.45 + pulse * 0.45})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255, 179, 71, ${0.55 + pulse * 0.4})`;
      ctx.font = '700 18px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, 1);
      ctx.restore();
    }
  }

  function drawFloaters() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 10px Consolas, monospace';
    for (const f of G.floaters) {
      const a = clamp(f.life / f.maxLife, 0, 1);
      ctx.globalAlpha = Math.min(1, a * 1.4);
      ctx.fillStyle = f.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function drawArena() {
    drawGround();
    drawTiles();
    drawPowerups();
    drawBullets();

    // Player first, then enemies, so the player reads above the crowd.
    if (G.player) drawTank(G.player);
    for (const enemy of G.tanks) if (!enemy.dead) drawTank(enemy);

    drawTreesLayer();
    drawParticles();
    drawPending();
    drawFloaters();

    // Freeze tint
    if (G.freeze > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(72, 170, 210, 0.055)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.24;
      ctx.strokeStyle = '#a9f4ff';
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const fx = ((i * 89 + G.time * 18) % W);
        const fy = ((i * 137 + Math.sin(G.time + i) * 20) % H);
        ctx.beginPath();
        ctx.moveTo(fx - 3, fy);
        ctx.lineTo(fx + 3, fy);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawCanvasVignette() {
    const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.74);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(0.72, 'rgba(0, 0, 0, 0.13)');
    v.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);

    const top = ctx.createLinearGradient(0, 0, 0, 72);
    top.addColorStop(0, 'rgba(255, 255, 255, 0.035)');
    top.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 72);
  }

  function render() {
    ctx.setTransform(Math.min(window.devicePixelRatio || 1, 2), 0, 0, Math.min(window.devicePixelRatio || 1, 2), 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#070c12';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (G.shake > 0.25 && !reduceMotion) {
      ctx.translate(rand(-1, 1) * G.shake * 0.55, rand(-1, 1) * G.shake * 0.55);
    }
    drawArena();
    ctx.restore();

    drawCanvasVignette();

    if (G.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.55, G.flash);
      ctx.fillStyle = G.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  // -------------------------------------------------------
  // Loop
  // -------------------------------------------------------
  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // -------------------------------------------------------
  // Boot
  // -------------------------------------------------------
  function initMenuScene() {
    G.state = 'menu';
    G.score = 0;
    G.lives = 3;
    G.level = 0;
    G.baseAlive = true;
    G.ending = false;
    G.overTimer = 0;
    G.levelClearArmed = false;
    G.levelClearTimer = 0;
    G.rapid = 0;
    G.multi = 0;
    G.freeze = 0;
    G.hpBonus = 0;
    G.fireRate = 1;
    G.bulletSpeed = 285;
    G.aggression = 0.035;
    G.powerupChance = 0.23;
    G.scoreMul = 1;
    G.bullets = [];
    G.powerups = [];
    G.particles = [];
    G.floaters = [];
    G.pending = [];
    G.queue = [];
    loadMap(LEVELS[0].map);
    G.player = createPlayer(4, 12);
    G.player.shield = 0;
    G.tanks = [
      createEnemy('grunt', 0, 0),
      createEnemy('scout', 6, 0),
      createEnemy('armor', 12, 0)
    ];
    for (const t of G.tanks) {
      t.spawnTimer = 0;
      t.dir = 2;
      t.ai.turn = 99;
    }
    syncMenuMeta();
    updateHud(true);
  }

  // Small bridge for the native Android shell.
  window.TankBattle = {
    isPlaying: () => G.state === 'playing',
    pause: () => {
      if (G.state === 'playing') togglePause();
    },
    goMenu: () => {
      if (G.state !== 'menu') goMenu();
    },
    resumeAudio: () => Sound.ensure()
  };

  initMenuScene();
  requestAnimationFrame(frame);
})();
