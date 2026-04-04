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

const W = canvas.width  = 800;
const H = canvas.height = 400;

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
  loadImg(`Monkey_0${i < 10 ? '0' + i : i}.png`, `m${i}`);
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
let bgX1, bgX2;
let muted = Storage.isMuted();

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

  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    jumpQueued = true;
    if (state === 'gameover') startGame();
    if (state === 'start')    startGame();
  }
  if (e.code === 'KeyR') {
    if (state === 'gameover' || state === 'playing') startGame();
  }
  if (e.code === 'KeyM') toggleMute();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  jumpQueued = true;
  if (state === 'gameover' || state === 'start') startGame();
}, { passive: false });

muteBtn && muteBtn.addEventListener('click', toggleMute);

function toggleMute() {
  muted = !muted;
  Storage.setMuted(muted);
  if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
}

function playSound(name, ...args) {
  if (!muted && Audio[name]) Audio[name](...args);
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

  bgX1 = 0; bgX2 = W;
  MONKEY.y         = GROUND_Y - MONKEY_H;
  MONKEY.vy        = 0;
  MONKEY.frame     = 0;
  MONKEY.frameTimer = 0;
  MONKEY.onGround  = true;
}

function startGame() {
  initGame();
  state = 'playing';
  updateHUD();
}

// ---- HUD UPDATE (DOM) --------------------------------------
function updateHUD() {
  if (scoreEl) scoreEl.textContent = score;
  if (highEl)  highEl.textContent  = Storage.getHighScore();
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
  const interval = Math.max(38, 88 - Math.floor(score / 5) * 4);
  if (framesPassed % interval !== 0) return;
  const bunch  = Math.random() > 0.52;
  const yRange = bunch ? [200, 265] : [210, 280];
  foods.push({
    x:    W + 20,
    y:    yRange[0] + Math.random() * (yRange[1] - yRange[0]),
    w:    bunch ? 58 : 42,
    h:    bunch ? 58 : 42,
    bunch,
    bob:  Math.random() * Math.PI * 2, // bobbing phase
    life: 320
  });
}

function spawnObstacle() {
  const interval = Math.max(100, 270 - Math.floor(score / 10) * 13);
  if (framesPassed % interval !== 0) return;
  // Occasionally spawn a double stone at high levels
  const count = (currentLevel >= 4 && Math.random() < 0.2) ? 2 : 1;
  for (let i = 0; i < count; i++) {
    obstacles.push({
      x:    W + 20 + i * 70,
      y:    GROUND_Y - 52,
      w:    46,
      h:    52,
      life: 320,
      wobble: 0
    });
  }
}

// ---- MAIN UPDATE -------------------------------------------
function update() {
  framesPassed++;
  if (hitCooldown  > 0) hitCooldown--;
  if (shakeDuration > 0) shakeDuration--;

  // Speed formula: smooth curve per level
  const lvlIdx = getLevelIndex(score);
  const base   = LEVELS[lvlIdx].speedBase;
  speed = Math.min(base + (score % 15) * 0.08, 14);

  // Level-up detection
  currentLevel = lvlIdx + 1;
  if (currentLevel > lastLevel) {
    lastLevel = currentLevel;
    showToast(`🏆 LEVEL ${currentLevel} — ${LEVELS[lvlIdx].name}!`);
    playSound('levelUp');
    particles.starBurst(W / 2, H / 2);
    levelBadge && levelBadge.classList.remove('bump');
    requestAnimationFrame(() => levelBadge && levelBadge.classList.add('bump'));
  }

  // Scroll BG
  bgX1 -= speed * 0.85;
  bgX2 -= speed * 0.85;
  if (bgX1 <= -W) bgX1 = bgX2 + W;
  if (bgX2 <= -W) bgX2 = bgX1 + W;

  // Monkey physics
  if (jumpQueued) {
    jumpQueued = false;
    if (MONKEY.onGround) {
      MONKEY.vy = -13.5;
      MONKEY.onGround = false;
      playSound('jump');
    }
  }
  MONKEY.vy += 0.68;
  MONKEY.y  += MONKEY.vy;
  if (MONKEY.y >= GROUND_Y - MONKEY_H) {
    MONKEY.y        = GROUND_Y - MONKEY_H;
    MONKEY.vy       = 0;
    MONKEY.onGround = true;
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

  // Move & check food
  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    f.x   -= speed + 1.2;
    f.life--;
    f.bob += 0.07;
    if (f.life <= 0 || f.x < -80) { foods.splice(i, 1); continue; }

    const fy = f.y + Math.sin(f.bob) * 4; // bobbing
    if (rectsOverlap(
      MONKEY.x - MONKEY_W / 2, MONKEY.y, MONKEY_W, MONKEY_H,
      f.x - f.w / 2, fy - f.h / 2, f.w, f.h
    )) {
      const pts = f.bunch ? 5 : 2;
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
      if (score % 25 === 0) {
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
    o.x   -= speed + 2;
    o.life--;
    o.wobble = hitCooldown > 0 ? Math.sin(framesPassed * 0.3) * 3 : 0;
    if (o.life <= 0 || o.x < -80) { obstacles.splice(i, 1); continue; }

    if (hitCooldown === 0 && rectsOverlap(
      MONKEY.x - MONKEY_W / 2 + MONKEY_HIT_SHRINK, MONKEY.y + MONKEY_HIT_SHRINK,
      MONKEY_W - MONKEY_HIT_SHRINK * 2, MONKEY_H - MONKEY_HIT_SHRINK,
      o.x - o.w / 2, o.y, o.w, o.h
    )) {
      lives--;
      hitCooldown   = 90;
      shakeDuration = 20;
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
  state = 'gameover';
  isNewHighScore = Storage.saveHighScore(score);
  updateHUD();
  playSound('gameOver');
}

// ---- RENDER ------------------------------------------------
function render() {
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  if (shakeDuration > 0) {
    ctx.translate(
      (Math.random() - 0.5) * 9,
      (Math.random() - 0.5) * 5
    );
  }

  drawBackground();
  drawGround();
  drawFood();
  drawObstacles();
  drawMonkey();
  particles.draw(ctx);
  drawFloats();
  drawHUDCanvas();

  if (state === 'start')    drawStartScreen();
  if (state === 'gameover') drawGameOverScreen();
  if (state === 'loading')  drawLoadingScreen();

  ctx.restore();
}

// ---- BACKGROUND --------------------------------------------
function drawBackground() {
  const bg = IMGS.bg;
  if (bg && bg.complete && bg.naturalWidth > 0) {
    ctx.drawImage(bg, bgX1, 0, W, H);
    ctx.drawImage(bg, bgX2, 0, W, H);
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
      ctx.drawImage(img, f.x - f.w / 2, fy - f.h / 2, f.w, f.h);
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
    ctx.save();
    ctx.translate(o.x + o.wobble, o.y + o.h / 2);
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
  const img = IMGS[`m${MONKEY.frame + 1}`];
  const mx  = MONKEY.x - MONKEY_W / 2;
  const my  = MONKEY.y;

  ctx.save();

  // Red tint flash on hit
  if (hitCooldown > 0 && Math.floor(framesPassed / 4) % 2 === 0) {
    ctx.filter = 'sepia(1) saturate(8) hue-rotate(-10deg) brightness(1.1)';
  }

  // Shadow under monkey
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur  = 10;

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, mx, my, MONKEY_W, MONKEY_H);
  } else {
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(MONKEY.x, my + MONKEY_H / 2, 20, 30, 0, 0, Math.PI * 2);
    ctx.fill();
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
  ctx.strokeText('MONKEY GAME', W / 2, 175);
  ctx.fillText('MONKEY GAME', W / 2, 175);

  ctx.font = '26px Nunito, Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText('🐒  Eat bananas. Dodge stones.', W / 2, 220);

  ctx.font = 'bold 22px Nunito, Arial';
  ctx.fillStyle = '#a0ff80';
  ctx.fillText('Press SPACE or Tap to Start', W / 2, 270);

  const hs = Storage.getHighScore();
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
    ctx.fillText(`Best: ${Storage.getHighScore()}`, W / 2, 242);
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
let lastTs = 0;
function loop(ts) {
  const dt = Math.min((ts - lastTs) / 16.67, 3);
  lastTs = ts;

  // Transition from loading to start
  if (state === 'loading' && assetsLoaded >= TOTAL_ASSETS) {
    state = 'start';
  }

  if (state === 'playing') update();
  render();

  requestAnimationFrame(loop);
}

// ---- BOOT --------------------------------------------------
initGame();
updateHUD();
if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
requestAnimationFrame(loop);
