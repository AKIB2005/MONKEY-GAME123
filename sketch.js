/* MONKEY RUN: JUNGLE REBORN - canvas runner */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 960, H = 540, ground = 420;
const $ = id => document.getElementById(id);
const ui = { menu: $('menu-panel'), end: $('end-panel'), hud: $('game-hud'), loading: $('loading-panel'), progress: $('loading-progress'), modal: $('modal'), modalContent: $('modal-content') };
const images = {}, frames = 10;
let loaded = 0, state = 'loading', lastTime = 0, elapsed = 0, run = null;
const keys = new Set();
const particles = new ParticleSystem();

function loadAsset(key, src) {
  const image = new Image();
  image.onload = () => { loaded++; ui.progress.style.width = `${loaded / (frames + 4) * 100}%`; };
  image.onerror = () => { loaded++; };
  image.src = src; images[key] = image;
}
loadAsset('background', 'jungle2.jpg'); loadAsset('banana', 'Banana.png'); loadAsset('bunch', 'Bananas.png'); loadAsset('stone', 'stone.png');
for (let i = 1; i <= frames; i++) loadAsset(`monkey${i}`, `Monkey_${String(i).padStart(2, '0')}.png`);

function freshRun() {
  return { score: 0, distance: 0, bananas: 0, speed: 315, time: 0, spawn: 0, nextSpawn: 1, obstacleSpawn: 2, lives: 3, multiplier: 1, player: { x: 170, y: ground - 84, vy: 0, jumps: 0, slide: 0, frame: 0, frameClock: 0, hit: 0, shield: 0 }, foods: [], obstacles: [], powerups: [], floaters: [], shake: 0, theme: 'day' };
}
function setScreen(screen) {
  ui.menu.hidden = screen !== 'menu'; ui.end.hidden = screen !== 'end'; ui.hud.hidden = screen !== 'playing'; $('touch-controls').hidden = screen !== 'playing';
}
function startRun() { run = freshRun(); state = 'playing'; setScreen('playing'); lastTime = performance.now(); AudioFX.click(); updateHud(); }
function endRun() {
  state = 'gameover'; const result = Storage.saveRun(run.score, Math.floor(run.distance), run.bananas);
  $('end-kicker').textContent = result.high ? 'NEW HIGH SCORE' : 'RUN COMPLETE'; $('end-title').textContent = result.high ? 'The canopy remembers.' : 'The jungle wins.';
  $('result-score').textContent = run.score; $('result-distance').textContent = `${Math.floor(run.distance)}m`; $('result-bananas').textContent = run.bananas;
  setScreen('end'); AudioFX.over();
}
function updateMenuStats() { const data = Storage.get(); $('menu-high-score').textContent = data.highScore; $('menu-distance').textContent = `${data.bestDistance}m`; $('menu-bananas').textContent = data.bananas; }
function updateHud() {
  if (!run) return;
  $('hud-score').textContent = run.score; $('hud-distance').textContent = `${Math.floor(run.distance)}m`; $('hud-bananas').textContent = run.bananas;
  const powers = [];
  if (run.player.shield > 0) powers.push(`<span class="power-chip">SHIELD ${Math.ceil(run.player.shield)}s</span>`);
  if (run.multiplier > 1) powers.push(`<span class="power-chip">x${run.multiplier} SCORE</span>`);
  $('power-list').innerHTML = powers.join('');
}
function jump() {
  if (state !== 'playing') return;
  const p = run.player;
  if (p.jumps < 2) { p.vy = -690; p.jumps++; p.slide = 0; AudioFX.jump(); }
}
function slide() { if (state === 'playing' && run.player.y >= ground - 100) { run.player.slide = .55; AudioFX.slide(); } }
function rect(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function playerBox() {
  const p = run.player; return { x: p.x - 34, y: p.y + (p.slide ? 42 : 7), w: 61, h: p.slide ? 43 : 73 };
}
function spawn() {
  const r = run, x = W + 80;
  if (r.time >= r.nextSpawn) {
    const type = Math.random() < .18 ? 'gold' : Math.random() < .25 ? 'bunch' : 'banana';
    const height = 190 + Math.random() * 130;
    r.foods.push({ type, x, y: height, w: type === 'bunch' ? 50 : 34, h: type === 'bunch' ? 50 : 34, bob: Math.random() * 6.28 });
    r.nextSpawn = r.time + Math.max(.65, 1.15 - r.distance / 2600) + Math.random() * .65;
  }
  if (r.time >= r.obstacleSpawn) {
    const roll = Math.random(), type = roll < .2 ? 'hanging' : roll < .42 ? 'spikes' : 'rock';
    r.obstacles.push({ type, x, y: type === 'hanging' ? 160 + Math.random() * 45 : ground - (type === 'spikes' ? 22 : 52), w: type === 'hanging' ? 52 : 56, h: type === 'hanging' ? 112 : type === 'spikes' ? 22 : 52, wobble: Math.random() * 6.28 });
    if (r.distance > 450 && Math.random() < .18) r.powerups.push({ type: Math.random() < .5 ? 'shield' : 'magnet', x: x + 120, y: 210 + Math.random() * 120, w: 32, h: 32, bob: 0 });
    r.obstacleSpawn = r.time + Math.max(1.05, 2.15 - r.distance / 1800) + Math.random() * .85;
  }
}
function update(dt) {
  const r = run, p = r.player; elapsed += dt; r.time += dt; r.speed = Math.min(570, 315 + r.distance * .12);
  r.distance += r.speed * dt / 26; p.hit = Math.max(0, p.hit - dt); p.shield = Math.max(0, p.shield - dt); p.slide = Math.max(0, p.slide - dt);
  p.vy += 1900 * dt; p.y += p.vy * dt;
  if (p.y >= ground - (p.slide ? 62 : 84)) { p.y = ground - (p.slide ? 62 : 84); p.vy = 0; p.jumps = 0; }
  p.frameClock += dt; if (p.frameClock > (p.slide ? .07 : .1)) { p.frame = (p.frame + 1) % frames; p.frameClock = 0; }
  spawn();
  for (let i = r.foods.length - 1; i >= 0; i--) {
    const f = r.foods[i]; f.x -= r.speed * dt; f.bob += dt * 3;
    const box = { x: f.x - f.w / 2, y: f.y + Math.sin(f.bob) * 7 - f.h / 2, w: f.w, h: f.h };
    const magnet = r.multiplier > 1 && r.magnet > 0;
    if (magnet && box.x < p.x + 220) f.x += (p.x - f.x) * dt * 4;
    if (rect(playerBox(), box)) { const points = f.type === 'gold' ? 25 : f.type === 'bunch' ? 8 : 2; r.score += points * r.multiplier; r.bananas += f.type === 'bunch' ? 3 : 1; r.floaters.push({ x: f.x, y: box.y, text: `+${points * r.multiplier}`, life: 1, color: f.type === 'gold' ? '#fff1a3' : '#ffd45a' }); particles.burst(f.x, box.y, { count: 10, colors: ['#ffd45a', '#fff1a3', '#9be879'] }); AudioFX.banana(); r.foods.splice(i, 1); continue; }
    if (f.x < -80) r.foods.splice(i, 1);
  }
  for (let i = r.powerups.length - 1; i >= 0; i--) {
    const power = r.powerups[i]; power.x -= r.speed * dt; power.bob += dt * 4;
    if (rect(playerBox(), { x: power.x - 16, y: power.y + Math.sin(power.bob) * 7 - 16, w: 32, h: 32 })) { if (power.type === 'shield') p.shield = 8; else { r.magnet = 8; r.multiplier = 2; } AudioFX.power(); particles.starBurst(power.x, power.y); r.powerups.splice(i, 1); }
    else if (power.x < -50) r.powerups.splice(i, 1);
  }
  r.magnet = Math.max(0, (r.magnet || 0) - dt); if (!r.magnet && r.multiplier === 2) r.multiplier = 1;
  for (let i = r.obstacles.length - 1; i >= 0; i--) {
    const o = r.obstacles[i]; o.x -= r.speed * dt; o.wobble += dt * 3;
    const box = { x: o.x - o.w / 2, y: o.y, w: o.w, h: o.h };
    if (p.hit <= 0 && rect(playerBox(), box)) {
      if (p.shield > 0) { p.shield = 0; p.hit = .6; particles.dustKick(o.x, o.y); AudioFX.power(); }
      else { r.lives--; p.hit = 1.2; r.shake = .3; particles.dustKick(o.x, o.y); AudioFX.hit(); if (!r.lives) { endRun(); return; } }
      r.obstacles.splice(i, 1); continue;
    }
    if (o.x < -80) r.obstacles.splice(i, 1);
  }
  r.floaters.forEach(f => { f.y -= 35 * dt; f.life -= dt; }); r.floaters = r.floaters.filter(f => f.life > 0); r.shake = Math.max(0, r.shake - dt); particles.update();
  updateHud();
}
function theme() { const d = run ? run.distance : 0; return d > 1400 ? 'night' : d > 650 ? 'sunset' : 'day'; }
function drawBackground() {
  const t = theme(), colors = t === 'night' ? ['#091b2b', '#123346'] : t === 'sunset' ? ['#473021', '#a95635'] : ['#103a29', '#4b9460'];
  const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, colors[0]); grad.addColorStop(1, colors[1]); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  if (images.background.complete) { ctx.globalAlpha = t === 'day' ? .18 : .08; ctx.drawImage(images.background, 0, 0, W, H); ctx.globalAlpha = 1; }
  const shift = ((run ? run.distance : 0) * .7) % 220;
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = layer === 0 ? 'rgba(9,43,29,.55)' : layer === 1 ? 'rgba(7,31,23,.72)' : 'rgba(4,20,14,.9)';
    for (let x = -220 - shift / (layer + 1); x < W + 240; x += 170 + layer * 28) {
      const top = 120 + layer * 48 + Math.sin(x * .03) * 20; ctx.beginPath(); ctx.moveTo(x, ground); ctx.lineTo(x + 32, top); ctx.lineTo(x + 74, top + 55); ctx.lineTo(x + 100, top - 8); ctx.lineTo(x + 142, ground); ctx.fill();
      ctx.fillStyle = 'rgba(38,112,62,.45)'; ctx.beginPath(); ctx.arc(x + 48, top + 20, 54, 0, 7); ctx.arc(x + 95, top + 38, 42, 0, 7); ctx.fill();
    }
  }
  ctx.fillStyle = t === 'night' ? 'rgba(167,213,255,.25)' : 'rgba(255,232,153,.3)'; ctx.beginPath(); ctx.arc(790, 92, 42, 0, 7); ctx.fill();
  for (let i = 0; i < 10; i++) { const x = (i * 117 - (run ? run.distance : 0) * .35) % (W + 80); ctx.strokeStyle = 'rgba(126,213,122,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x - 20, 80, x + 12, 160); ctx.stroke(); }
}
function drawGround() {
  const grad = ctx.createLinearGradient(0, ground, 0, H); grad.addColorStop(0, '#294e2a'); grad.addColorStop(1, '#0b2117'); ctx.fillStyle = grad; ctx.fillRect(0, ground, W, H - ground);
  ctx.fillStyle = '#5e9d4f'; ctx.fillRect(0, ground, W, 5);
  for (let x = -(((run ? run.distance : 0) * 2) % 100); x < W; x += 100) { ctx.fillStyle = '#3e6e3c'; ctx.beginPath(); ctx.ellipse(x, ground + 35 + (x % 3) * 8, 24, 5, -.2, 0, 7); ctx.fill(); }
}
function drawEntities() {
  const r = run;
  r.foods.forEach(f => { const y = f.y + Math.sin(f.bob) * 7; ctx.save(); ctx.shadowColor = f.type === 'gold' ? '#fff2a1' : '#ffd45a'; ctx.shadowBlur = 16; const img = images[f.type === 'bunch' ? 'bunch' : 'banana']; if (img.complete) ctx.drawImage(img, f.x - f.w / 2, y - f.h / 2, f.w, f.h); ctx.restore(); });
  r.powerups.forEach(p => { const y = p.y + Math.sin(p.bob) * 7; ctx.save(); ctx.shadowColor = p.type === 'shield' ? '#7ddcff' : '#ffd45a'; ctx.shadowBlur = 18; ctx.fillStyle = p.type === 'shield' ? '#7ddcff' : '#ffd45a'; ctx.beginPath(); ctx.arc(p.x, y, 15, 0, 7); ctx.fill(); ctx.fillStyle = '#123122'; ctx.font = 'bold 15px DM Sans'; ctx.textAlign = 'center'; ctx.fillText(p.type === 'shield' ? 'S' : 'M', p.x, y + 5); ctx.restore(); });
  r.obstacles.forEach(o => { ctx.save(); ctx.translate(o.x, o.y + o.h / 2); if (o.type === 'rock' && images.stone.complete) ctx.drawImage(images.stone, -o.w / 2, -o.h / 2, o.w, o.h); else { ctx.fillStyle = o.type === 'spikes' ? '#d2c49a' : '#5e351f'; ctx.beginPath(); if (o.type === 'spikes') { for (let x = -o.w / 2; x < o.w / 2; x += 14) { ctx.lineTo(x, o.h / 2); ctx.lineTo(x + 7, -o.h / 2); } } else { ctx.roundRect(-o.w / 2, -o.h / 2, o.w, o.h, 12); } ctx.fill(); } if (o.type === 'hanging') { ctx.strokeStyle = '#76bd67'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -o.h / 2); ctx.lineTo(0, -o.h); ctx.stroke(); } ctx.restore(); });
}
function drawPlayer() { const p = run.player; ctx.save(); if (p.hit > .6 && Math.floor(elapsed * 16) % 2) ctx.globalAlpha = .35; ctx.translate(p.x, p.y + (p.slide ? 20 : 0)); ctx.scale(p.slide ? 1.18 : 1, p.slide ? .72 : 1); const img = images[`monkey${p.frame + 1}`]; if (img.complete) ctx.drawImage(img, -42, -8, 84, 92); else { ctx.fillStyle = '#89522d'; ctx.beginPath(); ctx.arc(0, 30, 30, 0, 7); ctx.fill(); } if (p.shield > 0) { ctx.strokeStyle = 'rgba(125,220,255,.8)'; ctx.lineWidth = 3; ctx.shadowColor = '#7ddcff'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(0, 34, 52, 0, 7); ctx.stroke(); } ctx.restore(); }
function render() {
  ctx.save(); if (run && run.shake) ctx.translate((Math.random() - .5) * 12, (Math.random() - .5) * 8); drawBackground(); drawGround(); if (run) { drawEntities(); drawPlayer(); particles.draw(ctx); run.floaters.forEach(f => { ctx.globalAlpha = f.life; ctx.fillStyle = f.color; ctx.font = 'bold 22px Bangers'; ctx.textAlign = 'center'; ctx.fillText(f.text, f.x, f.y); }); ctx.fillStyle = 'rgba(4,18,11,.55)'; ctx.fillRect(18, 68, 122, 34); ctx.fillStyle = '#ff7460'; ctx.font = 'bold 14px DM Sans'; ctx.fillText('♥'.repeat(run.lives) + '♡'.repeat(3 - run.lives), 31, 91); if (state === 'paused') { ctx.fillStyle = 'rgba(3,12,8,.68)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.fillStyle = '#ffd45a'; ctx.font = '58px Bangers'; ctx.fillText('PAUSED', W / 2, 245); ctx.fillStyle = '#fff8df'; ctx.font = 'bold 16px DM Sans'; ctx.fillText('Press P or tap pause to continue', W / 2, 280); } } ctx.restore();
}
function loop(time) {
  const dt = Math.min(.035, (time - lastTime) / 1000 || 0); lastTime = time;
  if (state === 'loading') { if (loaded >= frames + 4) { state = 'menu'; ui.loading.classList.add('done'); updateMenuStats(); setScreen('menu'); } }
  else if (state === 'playing') update(dt);
  if (state !== 'menu' && state !== 'gameover') render(); requestAnimationFrame(loop);
}
function showModal(type) {
  const data = Storage.get();
  const content = type === 'how' ? `<h3>HOW TO PLAY</h3><p>Keep moving through the canopy. Jump twice to clear rocks and spikes. Slide beneath hanging trunks. Gold bananas are worth more, and power orbs turn the tide.</p><ul><li>SPACE / UP / TAP — jump</li><li>DOWN / SWIPE DOWN — slide</li><li>P — pause &nbsp; M — sound</li></ul>` : type === 'settings' ? `<h3>SETTINGS</h3><div class="setting-row">Sound <button class="toggle" id="modal-sound">${data.muted ? 'OFF' : 'ON'}</button></div><div class="setting-row">Progress <span>${data.achievements.length} achievements</span></div>` : `<h3>PROFILE</h3><p>Your expedition has collected <strong>${data.bananas}</strong> bananas and reached <strong>${data.bestDistance}m</strong>.</p><div class="setting-row">Night Runner <span>${data.unlocked.includes('night') ? 'UNLOCKED' : 'Score 500'}</span></div><div class="setting-row">Sunset Trail <span>${data.unlocked.includes('sunset') ? 'UNLOCKED' : 'Distance 1000m'}</span></div>`;
  ui.modalContent.innerHTML = content; ui.modal.hidden = false; AudioFX.click(); const sound = $('modal-sound'); if (sound) sound.onclick = () => { Storage.set('muted', !Storage.isMuted()); sound.textContent = Storage.isMuted() ? 'OFF' : 'ON'; };
}
document.addEventListener('keydown', e => { if (keys.has(e.code)) return; keys.add(e.code); if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (state === 'menu' || state === 'gameover') startRun(); else jump(); } if (e.code === 'ArrowDown') slide(); if (e.code === 'KeyP' && state === 'playing') state = 'paused'; else if (e.code === 'KeyP' && state === 'paused') state = 'playing'; if (e.code === 'KeyM') { Storage.set('muted', !Storage.isMuted()); } });
document.addEventListener('keyup', e => keys.delete(e.code));
$('play-button').onclick = startRun; $('retry-button').onclick = startRun; $('menu-button').onclick = () => { updateMenuStats(); setScreen('menu'); state = 'menu'; };
$('pause-button').onclick = () => { state = state === 'playing' ? 'paused' : 'playing'; };
$('sound-button').onclick = () => { Storage.set('muted', !Storage.isMuted()); $('sound-button').textContent = Storage.isMuted() ? 'MUTED' : 'SOUND'; AudioFX.click(); };
$('modal-close').onclick = () => { ui.modal.hidden = true; }; document.querySelectorAll('[data-panel]').forEach(button => button.onclick = () => showModal(button.dataset.panel));
document.querySelectorAll('[data-control]').forEach(button => { button.addEventListener('pointerdown', e => { e.preventDefault(); button.dataset.control === 'jump' ? jump() : slide(); }); });
canvas.addEventListener('pointerdown', () => { if (state === 'menu' || state === 'gameover') startRun(); else if (state === 'playing') jump(); });
updateMenuStats(); $('sound-button').textContent = Storage.isMuted() ? 'MUTED' : 'SOUND'; requestAnimationFrame(loop);
