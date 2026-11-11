// ============================================================
//  fx.js – parallax jungle, ambient life, lighting & polish
// ============================================================
const FX = (() => {
  const mod = (a, n) => ((a % n) + n) % n;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const trees  = Array.from({ length: 6 },  (_, i) => ({ x: i * 150, w: rnd(24, 44), ph: rnd(0, 6), len: rnd(110, 230), vx: rnd(-8, 8) }));
  const leaves = Array.from({ length: 16 }, () => ({ x: rnd(0, 800), y: rnd(0, 320), s: rnd(4, 8), v: rnd(0.5, 1.4), ph: rnd(0, 6) }));
  const tufts  = Array.from({ length: 26 }, (_, i) => ({ x: i * 32 + rnd(0, 14), h: rnd(8, 18) }));
  const tints  = [null, null, null, 'rgba(255,170,60,0.06)', 'rgba(255,120,40,0.10)', 'rgba(120,60,160,0.14)'];
  let t = 0, scroll = 0;
  const api = { pulse: 0 };

  api.reset  = () => { t = 0; scroll = 0; api.pulse = 0; };
  api.update = speed => {
    t++; scroll += speed;
    for (const l of leaves) {
      l.x -= speed * 0.9 + l.v;
      l.y += 0.5 + Math.sin(t * 0.04 + l.ph) * 0.4;
      if (l.x < -20 || l.y > 330) { l.x = 820; l.y = rnd(-10, 200); }
    }
  };

  // far layer: mirrored tiles so the seam is invisible
  api.drawBg = (ctx, img, sc, W, H) => {
    const k = Math.floor(sc / W), off = -(sc - k * W);
    const sh = img.naturalWidth / 2, sy = (img.naturalHeight - sh) * 0.4;
    for (let i = 0; i < 2; i++) {
      ctx.save();
      if ((k + i) & 1) { ctx.translate(off + i * W + W, 0); ctx.scale(-1, 1); }
      else ctx.translate(off + i * W, 0);
      ctx.drawImage(img, 0, sy, img.naturalWidth, sh, 0, 0, W + 1, H);
      ctx.restore();
    }
  };

  // middle layer: trunks, swaying vines, light shafts
  api.drawMid = (ctx, W, GY) => {
    for (const tr of trees) {
      const x = mod(tr.x - scroll * 0.55, W + 200) - 100;
      const g = ctx.createLinearGradient(0, 0, 0, GY);
      g.addColorStop(0, 'rgba(5,20,8,0.75)'); g.addColorStop(1, 'rgba(10,35,14,0.35)');
      ctx.fillStyle = g; ctx.fillRect(x, 0, tr.w, GY);
      const sw = Math.sin(t * 0.03 + tr.ph) * 12, vx = x + tr.w / 2 + tr.vx;
      ctx.strokeStyle = 'rgba(40,110,45,0.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(vx, 0);
      ctx.quadraticCurveTo(vx + sw * 0.5, tr.len * 0.5, vx + sw, tr.len); ctx.stroke();
      ctx.fillStyle = 'rgba(70,150,60,0.9)';
      ctx.beginPath(); ctx.ellipse(vx + sw, tr.len + 4, 6, 10, sw * 0.03, 0, 6.3); ctx.fill();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const bx = 150 + i * 280 + Math.sin(t * 0.008 + i * 2) * 40;
      const a = 0.05 + 0.025 * Math.sin(t * 0.02 + i);
      const g = ctx.createLinearGradient(bx, 0, bx - 90, GY);
      g.addColorStop(0, `rgba(255,240,170,${a})`); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(bx - 25, 0); ctx.lineTo(bx + 35, 0); ctx.lineTo(bx - 60, GY); ctx.lineTo(bx - 170, GY); ctx.fill();
    }
    ctx.restore();
  };

  const frond = (ctx, x, y, dir) => {
    ctx.fillStyle = 'rgba(8,28,10,0.88)';
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
      ctx.rotate(-(0.25 + i * 0.22) + Math.sin(t * 0.025 + i) * 0.06);
      ctx.beginPath(); ctx.ellipse(70, 0, 80, 11, 0, 0, 6.3); ctx.fill(); ctx.restore();
    }
  };

  // near layer: grass, falling leaves, foreground fronds, grading, hit flash
  api.drawNear = (ctx, W, H, GY, level, flash) => {
    ctx.strokeStyle = 'rgba(120,220,100,0.4)'; ctx.lineWidth = 2;
    for (const g of tufts) {
      const x = mod(g.x - scroll * 1.1, W + 40) - 20, sw = Math.sin(t * 0.08 + g.x) * 2;
      ctx.beginPath();
      ctx.moveTo(x, GY + 1); ctx.quadraticCurveTo(x + sw, GY - g.h * 0.6, x + sw * 2 + 3, GY - g.h);
      ctx.moveTo(x + 5, GY + 1); ctx.quadraticCurveTo(x + 5 - sw, GY - g.h * 0.5, x + 2 - sw * 2, GY - g.h * 0.8);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = 0; i < 10; i++) ctx.fillRect(mod(i * 90 - scroll * 1.1, W + 90) - 45, GY + 14 + (i % 3) * 18, 40, 2);
    ctx.fillStyle = 'rgba(120,190,70,0.8)';
    for (const l of leaves) {
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(t * 0.05 + l.ph);
      ctx.beginPath(); ctx.ellipse(0, 0, l.s, l.s * 0.45, 0, 0, 6.3); ctx.fill(); ctx.restore();
    }
    frond(ctx, -10, H + 10, 1); frond(ctx, W + 10, H + 10, -1);
    const tint = tints[level - 1];
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.65);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    if (flash > 0.02) { ctx.fillStyle = `rgba(255,30,30,${flash * 0.3})`; ctx.fillRect(0, 0, W, H); }
  };
  return api;
})();
