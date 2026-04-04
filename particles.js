// ============================================================
//  particles.js  –  lightweight canvas particle system
// ============================================================

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // Burst of sparkles at (x, y) — used when eating banana
  burst(x, y, { count = 10, colors = ['#FFD700', '#FFF176', '#FF8F00'], size = 5, speed = 3.5 } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.4;
      const spd   = speed * (0.6 + Math.random() * 0.8);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1.5,
        size: size * (0.5 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.025 + Math.random() * 0.02,
        type: 'circle'
      });
    }
  }

  // Dust kick when hitting a stone
  dustKick(x, y) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 1.2;
      const spd   = 1.5 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1,
        size: 4 + Math.random() * 7,
        color: `hsl(30, 50%, ${40 + Math.random() * 30}%)`,
        life: 1,
        decay: 0.03 + Math.random() * 0.03,
        type: 'circle'
      });
    }
  }

  // Star burst for milestone / level up
  starBurst(x, y) {
    const colors = ['#FFD700', '#FF6B35', '#fff', '#a0ff80'];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 2 + Math.random() * 5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 2,
        size: 3 + Math.random() * 5,
        color: colors[i % colors.length],
        life: 1,
        decay: 0.018 + Math.random() * 0.015,
        type: 'star'
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.12; // gravity
      p.vx *= 0.97; // drag
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);

      if (p.type === 'star') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        drawStar(ctx, p.x, p.y, 5, p.size, p.size * 0.45);
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fill();
}
