// ============================================================
//  sketch.js  –  Monkey Game  |  Enhanced Edition
//  Controls:  SPACE / ↑ = Jump  |  R = Restart  |  M = Mute
// ============================================================

// ---- DOM ELEMENTS ------------------------------------------
const canvas     = document.getElementById('gameCanvas');
const ctx        = canvas.getContext('2d');
const wrapper    = document.getElementById('canvas-wrapper');
const scoreEl    = document.getElementById('val-score');
const highEl     = document.getElementById('val-high');
const levelEl    = document.getElementById('val-level');
const toast      = document.getElementById('milestone-toast');
const levelBadge = document.getElementById('level-badge');
const muteBtn    = document.getElementById('mute-btn');

const W = 800;
const H = 400;
let SC = 1;
function resize() {
  const fs = !!document.fullscreenElement;
  const maxW = fs ? Math.min(window.innerWidth, window.innerHeight * 2)
                  : Math.min(window.innerWidth - 16, (window.innerHeight - 190) * 2, 1600);
  const cssW = Math.max(320, Math.floor(maxW || 800));
  canvas.style.width = cssW + 'px'; canvas.style.height = (cssW / 2) + 'px';
  SC = cssW / W * Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * SC); canvas.height = Math.round(H * SC);
}
window.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', resize);
resize();
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else if (wrapper.requestFullscreen) wrapper.requestFullscreen();
}

// ---- ASSET LOADING -----------------------------------------
const IMGS = {};
const MONKEY_FRAMES = 10;
let assetsLoaded = 0;
const TOTAL_ASSETS = MONKEY_FRAMES + 4; // monkeys + bg + banana + bananas + stone

function loadImg(src, key) {
  const img = new Image();
  img.onload  = () => { assetsLoaded++; };
  img.onerror = () => { assetsLoaded++; }; // don't block on missing
  img.src = src;
  IMGS[key] = img;
}

loadImg('jungle2.jpg', 'bg');
loadImg('Banana.png',  'banana');
loadImg('Bananas.png', 'bananas');
loadImg('stone.png',   'stone');
for (let i = 1; i <= MONKEY_FRAMES; i++) {
  loadImg(`Monkey_${String(i).padStart(2, '0')}.png`, `m${i}`);
}

// ---- PARTICLE SYSTEM ---------------------------------------
const particles = new ParticleSystem();

// ---- GAME STATE --------------------------------------------
let state = 'loading'; // loading | start | playing | gameover
let score, lives, speed, framesPassed, hitCooldown, shakeDuration;
let isNewHighScore = false;
let currentLevel = 1;
let lastLevel = 1;
let floats = [];
let bgScroll = 0, nextFood = 40, nextObs = 110, nextMilestone = 25;
let hitStop = 0, flash = 0, landSquash = 0;
let ducking = false, duckTimer = 0, jumps = 0, spin = 0;
let combo = 0, comboTimer = 0, comboPop = 0, banner = 0, bannerTxt = '';
let shield = false, magnet = 0, x2 = 0, nextPower = 500, powerups = [];
const boxH = () => ducking ? 40 : MONKEY_H;
const boxY = () => MONKEY.y + (MONKEY_H - boxH());
let muted = Save.isMuted();

// Monkey
const MONKEY = { x: 110, y: 0, vy: 0, frame: 0, frameTimer: 0, onGround: true };
const GROUND_Y   = 320;
const MONKEY_W   = 58;
const MONKEY_H   = 68;
const MONKEY_HIT_SHRINK = 6; // collision box inset

// Entity pools
let foods = [];
let obstacles = [];

// ---- INPUT -------------------------------------------------
const keys = {};
let jumpQueued = false;

document.addEventListener('keydown', e => {
  if (keys[e.code]) return;
  keys[e.code] = true;

  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    jumpQueued = true;
    if (state === 'gameover') startGame();
    if (state === 'start')    startGame();
    if (state === 'paused') { togglePause(); jumpQueued = false; }
  }
  if (e.code === 'KeyR') {
    if (state === 'gameover' || state === 'playing') startGame();
  }
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyF') toggleFullscreen();
  if (e.code === 'ArrowDown') e.preventDefault();
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

let touchY0 = 0;
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  touchY0 = e.touches[0].clientY;
  if (state === 'gameover' || state === 'start') startGame();
  if (state === 'paused') togglePause();
}, { passive: false });
canvas.addEventListener('touchend', e => {   // tap = jump, swipe down = duck
  e.preventDefault();
  if (e.changedTouches[0].clientY - touchY0 > 35) duckTimer = 30;
  else if (state === 'playing') jumpQueued = true;
}, { passive: false });
const fsBtn = document.getElementById('fs-btn');
fsBtn && fsBtn.addEventListener('click', toggleFullscreen);

muteBtn && muteBtn.addEventListener('click', toggleMute);

function toggleMute() {
  muted = !muted;
  Save.setMuted(muted);
  if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
}

function playSound(name, ...args) {
  if (!muted && SFX[name]) SFX[name](...args);
}

// ---- LEVEL SYSTEM ------------------------------------------
const LEVELS = [
  { minScore:  0, name: 'Jungle Baby',    speedBase: 5.0 },
  { minScore: 15, name: 'Treetop Racer',  speedBase: 6.0 },
  { minScore: 30, name: 'Banana Hunter',  speedBase: 7.2 },
  { minScore: 55, name: 'Stone Dodger',   speedBase: 8.5 },
  { minScore: 80, name: 'Vine Swinger',   speedBase: 9.8 },
  { minScore: 110, name: 'Jungle Master', speedBase: 11.5 },
];

function getLevelIndex(s) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (s >= LEVELS[i].minScore) idx = i;
  }
  return idx;
}

// ---- INIT / RESET ------------------------------------------
function initGame() {
  score        = 0;
  lives        = 3;
  speed        = 5;
  framesPassed = 0;
  hitCooldown  = 0;
  shakeDuration = 0;
  isNewHighScore = false;
  currentLevel = 1;
  lastLevel    = 1;
  floats       = [];
  foods        = [];
  obstacles    = [];
  particles.particles = [];

  bgScroll = 0; nextFood = 40; nextObs = 110; nextMilestone = 25;
  hitStop = 0; flash = 0; landSquash = 0; FX.reset();
  ducking = false; duckTimer = 0; jumps = 0; spin = 0; combo = 0; comboTimer = 0; comboPop = 0; banner = 0;
  shield = false; magnet = 0; x2 = 0; nextPower = 500; powerups = [];
  MONKEY.y         = GROUND_Y - MONKEY_H;
  MONKEY.vy        = 0;
  MONKEY.frame     = 0;
  MONKEY.frameTimer = 0;
  MONKEY.onGround  = true;
}

function startGame() {
  initGame();
  jumpQueued = false;
  state = 'playing';
  updateHUD();
}

// ---- HUD UPDATE (DOM) --------------------------------------
function updateHUD() {
  if (scoreEl) scoreEl.textContent = score;
  if (highEl)  highEl.textContent  = Save.getHighScore();
  if (levelEl) levelEl.textContent = currentLevel;
  levelBadge && (levelBadge.textContent = `LVL ${currentLevel}`);
}

// ---- TOAST -------------------------------------------------
let toastTimer = null;
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ---- COLLISION HELPERS -------------------------------------
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ---- FLOATING SCORE TEXTS (canvas-drawn) -------------------
function showFloat(txt, x, y, color = '#FFD700') {
  floats.push({ txt, x, y, life: 55, color });
}

// ---- DOM SCORE POPUP (extra flair for big points) ----------
function domPopup(txt, x, y) {
  const el = document.createElement('div');
  el.className = 'score-popup';
  el.textContent = txt;
  // convert canvas coords to wrapper coords
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / W;
  const scaleY = rect.height / H;
  el.style.left = (x * scaleX - 20) + 'px';
  el.style.top  = (y * scaleY - 10) + 'px';
  wrapper.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// ---- SPAWN -------------------------------------------------
function spawnFood() {
  if (--nextFood > 0) return;
  nextFood = Math.max(38, 88 - Math.floor(score / 5) * 4) * (0.8 + Math.random() * 0.5);
  const bunch = Math.random() > 0.52;
  const yRange = bunch ? [200, 265] : [210, 280];
  let y = yRange[0] + Math.random() * (yRange[1] - yRange[0]);
  if (obstacles.some(o => o.x > W - 90)) y = Math.min(y, 215); // keep food clear of stones
  foods.push({ x: W + 20, y, w: bunch ? 58 : 42, h: bunch ? 58 : 42, bunch, bob: Math.random() * Math.PI * 2, life: 320 });
}

function spawnObstacle() {
  if (--nextObs > 0) return;
  nextObs = Math.max(100, 270 - Math.floor(score / 10) * 13) * (0.85 + Math.random() * 0.4);
  if (currentLevel >= 2 && Math.random() < 0.3) {   // low-flying bird: duck under it!
    obstacles.push({ type: 'bird', x: W + 20, y: GROUND_Y - 82 + Math.random() * 6, w: 46, h: 28, life: 320, wobble: 0, ph: Math.random() * 6 });
    return;
  }
  const count = (currentLevel >= 4 && Math.random() < 0.2) ? 2 : 1;
  for (let i = 0; i < count; i++) {
    obstacles.push({ x: W + 20 + i * 70, y: GROUND_Y - 52, w: 46, h: 52, life: 320, wobble: 0 });
  }
}

// ---- MAIN UPDATE -------------------------------------------
function update() {
  if (hitStop > 0) { hitStop--; return; }
  framesPassed++;
  if (magnet > 0) magnet--;
  if (x2 > 0) x2--;
  if (banner > 0) banner--;
  if (comboTimer > 0 && --comboTimer === 0) combo = 0;
  comboPop *= 0.9;
  if (hitCooldown  > 0) hitCooldown--;
  if (shakeDuration > 0) shakeDuration--;

  // Speed formula: smooth curve per level
  const lvlIdx = getLevelIndex(score);
  const base   = LEVELS[lvlIdx].speedBase;
  const target = Math.min(base + (score - LEVELS[lvlIdx].minScore) * 0.03, 14);
  speed += (target - speed) * 0.05; // smooth ramp, no sudden drops

  // Level-up detection
  currentLevel = lvlIdx + 1;
  if (currentLevel > lastLevel) {
    lastLevel = currentLevel;
    showToast(`🏆 LEVEL ${currentLevel} — ${LEVELS[lvlIdx].name}!`);
    playSound('levelUp');
    particles.starBurst(W / 2, H / 2);
    FX.pulse = 1;
    banner = 100; bannerTxt = `LEVEL ${currentLevel}`;
    levelBadge && levelBadge.classList.remove('bump');
    requestAnimationFrame(() => levelBadge && levelBadge.classList.add('bump'));
  }

  // Scroll BG
  bgScroll += speed * 0.35; FX.update(speed);

  // Monkey physics: jump, double jump, duck, fast-fall
  const down = keys.ArrowDown || keys.KeyS;
  ducking = MONKEY.onGround && (down || duckTimer > 0);
  if (duckTimer > 0) duckTimer--;
  if (jumpQueued) {
    jumpQueued = false;
    if (MONKEY.onGround || jumps < 2) {
      const second = !MONKEY.onGround;
      MONKEY.vy = second ? -11.5 : -13.5;
      MONKEY.onGround = false; ducking = false; jumps++;
      playSound('jump');
      particles.burst(MONKEY.x, MONKEY.y + MONKEY_H, second
        ? { count: 12, colors: ['#fff', '#bfe8ff'], size: 3, speed: 3.2 }
        : { count: 6, colors: ['#a89268', '#cdb98a'], size: 4, speed: 2 });
    }
  }
  if (jumps >= 2 && !MONKEY.onGround) spin += 0.32;
  if (!MONKEY.onGround && down) MONKEY.vy += 0.9;
  const wasAir = !MONKEY.onGround;
  MONKEY.vy += 0.68;
  MONKEY.y  += MONKEY.vy;
  if (MONKEY.y >= GROUND_Y - MONKEY_H) {
    MONKEY.y        = GROUND_Y - MONKEY_H;
    MONKEY.vy       = 0;
    MONKEY.onGround = true; jumps = 0; spin = 0;
    if (wasAir) {
      landSquash = 1;
      particles.burst(MONKEY.x, GROUND_Y - 2, { count: 8, colors: ['#8d6e4a', '#b59a6b'], size: 4, speed: 2.5 });
    }
  }
  if (MONKEY.onGround && framesPassed % 7 === 0) {
    particles.burst(MONKEY.x - 20, GROUND_Y - 2, { count: 2, colors: ['#a89268', '#cdb98a'], size: 3, speed: 1.2 });
  }

  // Animate monkey frames
  MONKEY.frameTimer++;
  const animSpeed = MONKEY.onGround ? Math.max(2, 7 - Math.floor(speed / 2)) : 6;
  if (MONKEY.frameTimer >= animSpeed) {
    MONKEY.frameTimer = 0;
    MONKEY.frame = (MONKEY.frame + 1) % MONKEY_FRAMES;
  }

  // Spawn
  spawnFood();
  spawnObstacle();
  spawnPower();

  // Move & check food
  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    if (magnet > 0) {
      const dx = MONKEY.x - f.x, dy = MONKEY.y + MONKEY_H / 2 - f.y, d = Math.hypot(dx, dy);
      if (d < 260 && d > 1) { f.x += dx / d * 6; f.y += dy / d * 6; }
    }
    f.x   -= speed + 1.2;
    f.life--;
    f.bob += 0.07;
    if (f.life <= 0 || f.x < -80) { foods.splice(i, 1); continue; }

    const fy = f.y + Math.sin(f.bob) * 4; // bobbing
    if (rectsOverlap(
      MONKEY.x - MONKEY_W / 2, boxY(), MONKEY_W, boxH(),
      f.x - f.w / 2, fy - f.h / 2, f.w, f.h
    )) {
      combo++; comboTimer = 100; comboPop = 1;
      const mult = Math.min(4, 1 + Math.floor(combo / 5)) * (x2 > 0 ? 2 : 1);
      const pts = (f.bunch ? 5 : 2) * mult;
      score += pts;
      showFloat(`+${pts}`, f.x, fy - 20, f.bunch ? '#FF8F00' : '#FFD700');
      domPopup(`+${pts}`, f.x, fy - 20);
      particles.burst(f.x, fy, {
        count: f.bunch ? 16 : 9,
        colors: f.bunch ? ['#FF8F00','#FFD700','#fff'] : ['#FFD700','#FFF176'],
        size: f.bunch ? 7 : 5
      });
      f.bunch ? playSound('eatBunch') : playSound('eatBanana');

      // Milestone every 25 pts
      if (score >= nextMilestone) {
        nextMilestone = Math.floor(score / 25) * 25 + 25;
        showToast(`🎉 ${score} POINTS!`);
        playSound('milestone');
        particles.starBurst(MONKEY.x, MONKEY.y + MONKEY_H / 2);
      }

      updateHUD();
      foods.splice(i, 1);
    }
  }

  // Move & check obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x   -= speed + (o.type === 'bird' ? 3.5 : 2);
    o.life--;
    o.wobble = hitCooldown > 0 ? Math.sin(framesPassed * 0.3) * 3 : 0;
    if (o.life <= 0 || o.x < -80) { obstacles.splice(i, 1); continue; }

    if (hitCooldown === 0 && rectsOverlap(
      MONKEY.x - MONKEY_W / 2 + MONKEY_HIT_SHRINK, boxY() + MONKEY_HIT_SHRINK,
      MONKEY_W - MONKEY_HIT_SHRINK * 2, boxH() - MONKEY_HIT_SHRINK,
      o.x - o.w / 2, o.y, o.w, o.h
    )) {
      combo = 0;
      if (shield) {
        shield = false; hitCooldown = 45; playSound('milestone');
        particles.burst(MONKEY.x, MONKEY.y + 34, { count: 18, colors: ['#7fd4ff', '#fff'], size: 5, speed: 4 });
        showFloat('SHIELD!', MONKEY.x, MONKEY.y - 10, '#7fd4ff');
        obstacles.splice(i, 1);
        continue;
      }
      lives--;
      hitCooldown   = 90;
      shakeDuration = 20;
      hitStop = 5; flash = 1;
      particles.dustKick(o.x, o.y + o.h / 2);
      playSound('hitObstacle');
      obstacles.splice(i, 1);
      updateHUD();

      if (lives <= 0) {
        lives = 0;
        triggerGameOver();
        return;
      }
    }
  }

  // Power-ups
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.x -= speed + 1.2; p.bob += 0.08;
    if (p.x < -60) { powerups.splice(i, 1); continue; }
    if (rectsOverlap(MONKEY.x - MONKEY_W / 2, boxY(), MONKEY_W, boxH(), p.x - 18, p.y - 18, 36, 36)) {
      applyPower(p); powerups.splice(i, 1);
    }
  }

  // Particles
  particles.update();

  // Floating texts
  for (let i = floats.length - 1; i >= 0; i--) {
    floats[i].y    -= 1.6;
    floats[i].life--;
    if (floats[i].life <= 0) floats.splice(i, 1);
  }
}

function triggerGameOver() {
  state = 'gameover'; banner = 0;
  isNewHighScore = Save.saveHighScore(score);
  updateHUD();
  playSound('gameOver');
}

// ---- RENDER ------------------------------------------------
function render() {
  ctx.setTransform(SC, 0, 0, SC, 0, 0);
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  if (FX.pulse > 0.01) { const z = 1 + FX.pulse * 0.03; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); }
  if (shakeDuration > 0) {
    ctx.translate(
      (Math.random() - 0.5) * 9,
      (Math.random() - 0.5) * 5
    );
  }

  drawBackground();
  FX.drawMid(ctx, W, GROUND_Y);
  drawGround();
  if (state === 'playing') FX.speedLines(ctx, W, GROUND_Y, speed, framesPassed);
  drawFood();
  drawPowerups();
  drawObstacles();
  drawMonkey();
  drawAuras();
  particles.draw(ctx);
  drawFloats();
  FX.drawNear(ctx, W, H, GROUND_Y, currentLevel, flash);
  drawHUDCanvas();
  drawPowerHUD();

  if (state === 'start')    drawStartScreen();
  if (state === 'gameover') drawGameOverScreen();
  if (state === 'loading')  drawLoadingScreen();
  if (state === 'paused')   drawPauseScreen();

  ctx.restore();
}

// ---- BACKGROUND --------------------------------------------
function drawBackground() {
  const bg = IMGS.bg;
  if (bg && bg.complete && bg.naturalWidth > 0) {
    FX.drawBg(ctx, bg, bgScroll, W, H);
  } else {
    // Fallback gradient jungle
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   '#1a4a20');
    grad.addColorStop(0.6, '#2d6e35');
    grad.addColorStop(1,   '#1a3a1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---- GROUND ------------------------------------------------
function drawGround() {
  // Semi-transparent dark strip at bottom to define the ground plane
  const grad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // Ground line highlight
  ctx.strokeStyle = 'rgba(80,200,80,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(W, GROUND_Y);
  ctx.stroke();
}

// ---- FOOD --------------------------------------------------
function drawFood() {
  for (const f of foods) {
    const img = f.bunch ? IMGS.bananas : IMGS.banana;
    const fy  = f.y + Math.sin(f.bob) * 4;
    // Glow
    ctx.save();
    ctx.shadowColor = f.bunch ? '#FF8F00' : '#FFD700';
    ctx.shadowBlur  = 12;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.translate(f.x, fy);
      ctx.scale(0.85 + Math.cos(f.bob * 0.8) * 0.15, 1); // coin-like spin
      ctx.drawImage(img, -f.w / 2, -f.h / 2, f.w, f.h);
    } else {
      ctx.fillStyle = f.bunch ? '#FF8F00' : '#FFD700';
      ctx.beginPath();
      ctx.arc(f.x, fy, f.w / 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---- OBSTACLES ---------------------------------------------
function drawObstacles() {
  for (const o of obstacles) {
    if (o.type === 'bird') { drawBird(o); continue; }
    ctx.save();
    ctx.translate(o.x + o.wobble, o.y + o.h / 2);
    ctx.rotate(-o.x * 0.045); // rolling stone
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur  = 8;
    const img = IMGS.stone;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -o.w / 2, -o.h / 2, o.w, o.h);
    } else {
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(0, 0, o.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---- MONKEY ------------------------------------------------
function drawMonkey() {
  const img   = IMGS[`m${MONKEY.frame + 1}`];
  const feetY = MONKEY.y + MONKEY_H;
  const air   = !MONKEY.onGround;
  const lift  = Math.min(1, Math.max(0, (GROUND_Y - feetY) / 140));

  // ground shadow shrinks as the monkey rises
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.35 - lift * 0.2})`;
  ctx.beginPath();
  ctx.ellipse(MONKEY.x, GROUND_Y + 3, 26 * (1 - lift * 0.4), 6 * (1 - lift * 0.4), 0, 0, 7);
  ctx.fill();
  ctx.restore();

  // squash & stretch + tilt, anchored at the feet
  const sy = 1 + (air ? Math.min(Math.abs(MONKEY.vy) * 0.012, 0.16) : 0) - landSquash * 0.22 - (ducking ? 0.36 : 0);
  ctx.save();
  if (hitCooldown > 0 && Math.floor(framesPassed / 4) % 2 === 0) ctx.globalAlpha = 0.4; // hit blink
  ctx.translate(MONKEY.x, feetY);
  ctx.rotate(air ? MONKEY.vy * 0.018 : (ducking ? 0 : 0.05 + Math.sin(framesPassed * 0.35) * 0.02));
  if (spin) { ctx.translate(0, -MONKEY_H / 2); ctx.rotate(spin); ctx.translate(0, MONKEY_H / 2); } // double-jump flip
  ctx.scale(ducking ? 1.2 : 1 / sy, sy);
  if (img && img.complete && img.naturalWidth > 0) {
    const k = MONKEY_H / 300; // same scale for every frame: no per-frame stretching
    ctx.drawImage(img, -img.naturalWidth * k / 2, -img.naturalHeight * k, img.naturalWidth * k, img.naturalHeight * k);
  } else {
    ctx.fillStyle = '#8B5E3C';
    ctx.beginPath(); ctx.ellipse(0, -MONKEY_H / 2, MONKEY_W / 2, MONKEY_H / 2, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// ---- FLOATING TEXTS ----------------------------------------
function drawFloats() {
  for (const f of floats) {
    const alpha = Math.max(0, f.life / 55);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 22px Bangers, Arial';
    ctx.fillStyle   = f.color;
    ctx.strokeStyle = 'rgba(30,15,0,0.7)';
    ctx.lineWidth   = 3;
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillText(f.txt, f.x, f.y);
    ctx.restore();
  }
}

// ---- CANVAS HUD (in-game) ----------------------------------
function drawHUDCanvas() {
  // Lives hearts
  ctx.save();
  ctx.font      = '22px Arial';
  ctx.textAlign = 'right';
  const hearts  = Array.from({ length: 3 }, (_, i) => i < lives ? '♥' : '♡').join(' ');
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, W - 118, 8, 110, 32, 8); ctx.fill();
  ctx.fillStyle = lives > 1 ? '#FF5050' : '#ff1111';
  ctx.shadowColor = lives <= 1 ? '#ff1111' : 'transparent';
  ctx.shadowBlur  = lives <= 1 ? 10 : 0;
  ctx.fillText(hearts, W - 10, 30);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ---- START SCREEN ------------------------------------------
function drawStartScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  ctx.font = '72px Bangers, Arial';
  ctx.fillStyle   = '#FFD700';
  ctx.strokeStyle = '#7a4800';
  ctx.lineWidth   = 5;
  const by = 175 + Math.sin(performance.now() / 350) * 5;
  ctx.strokeText('MONKEY GAME', W / 2, by);
  ctx.fillText('MONKEY GAME', W / 2, by);

  ctx.font = '26px Nunito, Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText('🐒  Eat bananas. Dodge stones.', W / 2, 220);

  ctx.font = 'bold 22px Nunito, Arial';
  ctx.fillStyle = '#a0ff80';
  ctx.fillText('Press SPACE or Tap to Start', W / 2, 270);

  const hs = Save.getHighScore();
  if (hs > 0) {
    ctx.font = '18px Nunito, Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`🏆 Best: ${hs}`, W / 2, 310);
  }
}

// ---- GAME OVER SCREEN --------------------------------------
function drawGameOverScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);

  // Panel
  ctx.fillStyle   = 'rgba(15,8,0,0.95)';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth   = 3;
  roundRect(ctx, 210, 90, 380, 220, 18);
  ctx.fill(); ctx.stroke();

  ctx.textAlign = 'center';

  // GAME OVER text
  ctx.font        = 'bold 56px Bangers, Arial';
  ctx.fillStyle   = '#FF4444';
  ctx.strokeStyle = '#000';
  ctx.lineWidth   = 4;
  ctx.strokeText('GAME OVER', W / 2, 162);
  ctx.fillText('GAME OVER', W / 2, 162);

  // Score
  ctx.font      = 'bold 34px Bangers, Arial';
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#503000';
  ctx.lineWidth = 2.5;
  ctx.strokeText(`Score: ${score}`, W / 2, 210);
  ctx.fillText(`Score: ${score}`, W / 2, 210);

  // New high score badge
  if (isNewHighScore) {
    ctx.font = 'bold 20px Nunito, Arial';
    ctx.fillStyle = '#a0ff80';
    ctx.fillText('🎉 NEW HIGH SCORE!', W / 2, 242);
  } else {
    ctx.font = '18px Nunito, Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Best: ${Save.getHighScore()}`, W / 2, 242);
  }

  // Restart hint
  ctx.font      = '20px Nunito, Arial';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.strokeText('Press R or Tap to Play Again', W / 2, 284);
  ctx.fillText('Press R or Tap to Play Again', W / 2, 284);

  ctx.textAlign = 'left';
}

// ---- LOADING SCREEN ----------------------------------------
function drawLoadingScreen() {
  ctx.fillStyle = '#0d1f0f';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign   = 'center';
  ctx.font        = '28px Nunito, Arial';
  ctx.fillStyle   = '#FFD700';
  const pct = Math.round((assetsLoaded / TOTAL_ASSETS) * 100);
  ctx.fillText(`Loading... ${pct}%`, W / 2, H / 2);

  // Progress bar
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  roundRect(ctx, W / 2 - 150, H / 2 + 20, 300, 14, 7); ctx.fill();
  ctx.fillStyle = '#FFD700';
  roundRect(ctx, W / 2 - 150, H / 2 + 20, 300 * (assetsLoaded / TOTAL_ASSETS), 14, 7); ctx.fill();
  ctx.textAlign = 'left';
}

// ---- MAIN LOOP ---------------------------------------------
let lastTs = 0, acc = 0;
const STEP = 1000 / 60;
function loop(ts) {
  if (!lastTs) lastTs = ts;
  acc += Math.min(ts - lastTs, 100);
  lastTs = ts;

  // Transition from loading to start
  if (state === 'loading' && assetsLoaded >= TOTAL_ASSETS) {
    state = 'start';
  }

  while (acc >= STEP) {
    acc -= STEP;
    if (state === 'playing') update();
    else if (state === 'start') { bgScroll += 0.6; FX.update(1.5); } // living title screen
    flash *= 0.92; landSquash *= 0.82; FX.pulse *= 0.92;
  }
  render();

  requestAnimationFrame(loop);
}

// ---- PAUSE -------------------------------------------------
function togglePause() {
  if (state === 'playing') state = 'paused';
  else if (state === 'paused') { state = 'playing'; lastTs = 0; acc = 0; }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') state = 'paused'; });
window.addEventListener('blur', () => { if (state === 'playing') state = 'paused'; });
function drawPauseScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = '#FFD700'; ctx.font = "56px 'Bangers', cursive";
  ctx.fillText('PAUSED', W / 2, H / 2);
  ctx.fillStyle = '#fff'; ctx.font = "18px 'Nunito', sans-serif";
  ctx.fillText('Press P, Space or tap to resume', W / 2, H / 2 + 34);
}

// ---- POWER-UPS ---------------------------------------------
const PW = { shield: ['🛡️', '#7fd4ff', 'SHIELD!'], magnet: ['🧲', '#ff6b6b', 'MAGNET!'], x2: ['⭐', '#ffd54a', 'DOUBLE POINTS!'], heart: ['❤️', '#ff7aa8', '+1 LIFE!'] };
function spawnPower() {
  if (--nextPower > 0) return;
  nextPower = 500 + Math.random() * 400;
  let type = ['shield', 'magnet', 'x2', 'heart'][Math.random() * 4 | 0];
  if (type === 'heart' && lives >= 3) type = 'shield';
  powerups.push({ type, x: W + 20, y: 190 + Math.random() * 60, bob: 0 });
}
function applyPower(p) {
  if (p.type === 'shield') shield = true;
  if (p.type === 'magnet') magnet = 480;
  if (p.type === 'x2')     x2 = 600;
  if (p.type === 'heart')  lives = Math.min(3, lives + 1);
  showToast(PW[p.type][2]); playSound('levelUp');
  particles.burst(p.x, p.y, { count: 16, colors: [PW[p.type][1], '#fff'], size: 5, speed: 4 });
  updateHUD();
}
function drawPowerups() {
  ctx.save();
  for (const p of powerups) {
    const [icon, col] = PW[p.type], y = p.y + Math.sin(p.bob) * 6, r = 22 + Math.sin(p.bob * 2) * 2;
    const g = ctx.createRadialGradient(p.x, y, 3, p.x, y, r + 12);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.75; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, y, r + 12, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(icon, p.x, y + 1);
  }
  ctx.restore();
}
function drawAuras() {
  const cy = MONKEY.y + MONKEY_H / 2, t = framesPassed;
  ctx.save();
  if (shield) {
    ctx.strokeStyle = `rgba(127,212,255,${0.7 + Math.sin(t * 0.2) * 0.2})`; ctx.fillStyle = 'rgba(127,212,255,0.14)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(MONKEY.x, cy, 46 + Math.sin(t * 0.15) * 2, 0, 7); ctx.fill(); ctx.stroke();
  }
  if (magnet > 0) {
    ctx.strokeStyle = 'rgba(255,107,107,0.45)'; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(MONKEY.x, cy, 70 + Math.sin(t * 0.1) * 6, 0, 7); ctx.stroke();
  }
  ctx.restore();
}
function drawBird(o) {
  const fl = Math.sin(framesPassed * 0.35 + o.ph);
  ctx.save(); ctx.translate(o.x, o.y + o.h / 2 + fl * 3);
  ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 11, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(-17, -3, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.moveTo(-24, -3); ctx.lineTo(-33, 0); ctx.lineTo(-24, 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-19, -5, 2.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#922b21'; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(6, -24 * fl - 4, 18, -2); ctx.lineTo(8, 3); ctx.fill();
  ctx.restore();
}
function drawPowerHUD() {
  ctx.save(); ctx.textAlign = 'left'; ctx.font = '16px Arial';
  let x = 10;
  const pill = (icon, frac, col) => {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, x, 8, 92, 28, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(icon, x + 7, 28);
    ctx.fillStyle = col; ctx.fillRect(x + 32, 18, 52 * frac, 8); x += 100;
  };
  if (shield) pill('🛡️', 1, '#7fd4ff');
  if (magnet > 0) pill('🧲', magnet / 480, '#ff6b6b');
  if (x2 > 0) pill('⭐', x2 / 600, '#ffd54a');
  ctx.restore();
  if (combo >= 3) {
    const m = Math.min(4, 1 + Math.floor(combo / 5)), t2 = `COMBO ${combo}  x${m}`;
    ctx.save(); ctx.translate(W / 2, 34); const sc = 1 + comboPop * 0.25; ctx.scale(sc, sc);
    ctx.textAlign = 'center'; ctx.font = "26px 'Bangers', cursive"; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.fillStyle = m > 1 ? '#ff9f1a' : '#fff'; ctx.strokeText(t2, 0, 0); ctx.fillText(t2, 0, 0); ctx.restore();
  }
  if (banner > 0) {
    const p = banner / 100, e = p > 0.85 ? (1 - p) / 0.15 : p < 0.25 ? p / 0.25 : 1;
    ctx.save(); ctx.globalAlpha = e; ctx.translate(W / 2, 120); ctx.scale(0.8 + 0.2 * e, 0.8 + 0.2 * e);
    ctx.textAlign = 'center'; ctx.font = "68px 'Bangers', cursive"; ctx.lineWidth = 7; ctx.strokeStyle = '#5a3a00'; ctx.fillStyle = '#FFD700';
    ctx.strokeText(bannerTxt, 0, 0); ctx.fillText(bannerTxt, 0, 0); ctx.restore();
  }
}

// ---- BOOT --------------------------------------------------
initGame();
updateHUD();
if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
requestAnimationFrame(loop);
