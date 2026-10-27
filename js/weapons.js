// =============================================================
//  ARMAS: qué hace cada una en cada "forma" (tier 0 a 3) y al evolucionar
//  tier 0 = niveles 1-2, tier 1 = 3-4, tier 2 = 5-6, tier 3 = 7-8
// =============================================================

// Daño de un arma según su nivel (+22% por nivel, x1.6 al evolucionar)
function wDamage(w, base) { return base * (1 + 0.22 * (w.level - 1)) * (w.evo ? 1.6 : 1); }
function wColor(w) { return w.evo ? EVO_COLOR : TIER_COLORS[weaponTier(w.level)]; }

// Cuenta atrás de recarga: devuelve true cuando toca disparar
function wReady(run, w, dt, baseCd) {
  w.timer -= dt;
  if (w.timer > 0) return false;
  w.timer = baseCd * run.stats.cooldown;
  return true;
}

const WEAPON_LOGIC = {

  // ---------- ESPADA: tajo -> tajo amplio -> doble -> torbellino ----------
  sword(run, w, dt) {
    if (!wReady(run, w, dt, w.evo ? 0.85 : 1.0)) return;
    const P = run.player, tier = weaponTier(w.level), A = run.stats.area;
    const dmg = wDamage(w, 14), color = wColor(w);
    const shapes = [
      [{ off: 0, arc: 1.75, r: 72 }],
      [{ off: 0, arc: 2.6, r: 84 }],
      [{ off: 0, arc: 2.6, r: 90 }, { off: Math.PI, arc: 2.6, r: 90 }],
      [{ off: 0, arc: Math.PI * 2, r: 100 }],
    ];
    const list = w.evo ? [{ off: 0, arc: Math.PI * 2, r: 135 }] : shapes[tier];
    // apunta solo al enemigo más cercano; si no hay nadie, hacia donde miras
    const target = run.nearestEnemy(P.x, P.y, 170 * A);
    const aim = target ? Math.atan2(target.y - P.y, target.x - P.x) : P.face;
    for (const s of list) {
      const ang = aim + s.off, r = s.r * A;
      run.hitArc(P.x, P.y, r, ang, s.arc, dmg, { knock: 160 });
      run.addFx({ kind: 'slash', x: P.x, y: P.y, ang, arc: s.arc, r, color, max: 0.2, follow: true });
    }
    if (w.evo) {
      // Excalibur: además lanza 8 ondas de luz
      for (let i = 0; i < 8; i++) {
        const a = aim + i * Math.PI / 4;
        run.addProjectile({ kind: 'wave', x: P.x, y: P.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420,
          r: 14, dmg: dmg * 0.6, pierce: 99, life: 0.55, color, angle: a });
      }
    }
  },

  // ---------- MARTILLO: ondas expansivas ----------
  hammer(run, w, dt) {
    if (!wReady(run, w, dt, w.evo ? 2.2 : 2.6)) return;
    const P = run.player, tier = weaponTier(w.level), A = run.stats.area;
    const dmg = wDamage(w, 18), color = wColor(w);
    const maxR = (w.evo ? 260 : [110, 140, 160, 190][tier]) * A;
    const rings = w.evo ? 3 : (tier >= 2 ? 2 : 1);
    const stun = w.evo || tier >= 3;
    for (let i = 0; i < rings; i++) {
      run.areas.push({ kind: 'shock', x: P.x, y: P.y, r: 0, maxR, speed: maxR * 2.6, delay: i * 0.28,
        dmg, hit: new Set(), color, stun });
    }
    run.shakeScreen(2);
  },

  // ---------- BOLA DE FUEGO ----------
  fireball(run, w, dt) {
    if (!wReady(run, w, dt, w.evo ? 1.0 : 1.15)) return;
    const P = run.player, tier = weaponTier(w.level), A = run.stats.area;
    const count = (w.evo ? 4 : [1, 2, 2, 3][tier]) + run.stats.amount;
    const boomR = (w.evo ? 95 : [36, 44, 56, 64][tier]) * A;
    const dmg = wDamage(w, 16), color = wColor(w);
    const target = run.nearestEnemy(P.x, P.y, 480);
    const base = target ? Math.atan2(target.y - P.y, target.x - P.x) : P.face;
    const speed = 300 * run.stats.projSpeed;
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * 0.22;
      run.addProjectile({ kind: 'fireball', x: P.x, y: P.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        r: w.evo ? 13 : 8, dmg, pierce: 0, life: 1.8, color, angle: a,
        explode: { r: boomR, dmg: dmg * 0.7 }, burn: (w.evo || tier >= 3) ? { r: boomR * 0.7, dmg: dmg * 0.15, life: 2 } : null });
    }
  },

  // ---------- NOVA DE HIELO ----------
  frost(run, w, dt) {
    if (!wReady(run, w, dt, w.evo ? 2.4 : 3.2)) return;
    const P = run.player, tier = weaponTier(w.level), A = run.stats.area;
    const R = (w.evo ? 230 : [90, 112, 132, 152][tier]) * A;
    const dmg = wDamage(w, 10), color = wColor(w);
    const freeze = w.evo ? 1.4 : (tier >= 3 ? 0.8 : 0);
    run.damageArea(P.x, P.y, R, dmg, { slow: 1.6 + tier * 0.3, freeze });
    run.addFx({ kind: 'nova', x: P.x, y: P.y, r: R, color, max: 0.45 });
  },

  // ---------- MISIL ARCANO (persigue) ----------
  arcane(run, w, dt) {
    if (!wReady(run, w, dt, w.evo ? 1.2 : 1.6)) return;
    const P = run.player, tier = weaponTier(w.level);
    const count = (w.evo ? 8 : tier + 1) + run.stats.amount;
    const dmg = wDamage(w, 9), color = wColor(w);
    const pierce = w.evo ? 2 : (tier >= 3 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      run.addProjectile({ kind: 'missile', x: P.x, y: P.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160,
        r: 6, dmg, pierce, life: 3, color, homing: 6, speed: 270 * run.stats.projSpeed });
    }
  },

  // ---------- ARCO ----------
  bow(run, w, dt) {
    if (!wReady(run, w, dt, w.evo ? 0.6 : 0.9)) return;
    const P = run.player, tier = weaponTier(w.level);
    const count = (w.evo ? 5 : [1, 2, 3, 3][tier]) + run.stats.amount;
    const pierce = w.evo ? 99 : [0, 1, 1, 3][tier];
    const dmg = wDamage(w, 11), color = wColor(w);
    const target = run.nearestEnemy(P.x, P.y, 520);
    const base = target ? Math.atan2(target.y - P.y, target.x - P.x) : P.face;
    const speed = 520 * run.stats.projSpeed;
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * 0.14;
      run.addProjectile({ kind: 'arrow', x: P.x, y: P.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        r: 5, dmg, pierce, life: 1.2, color, angle: a, knock: 60 });
    }
  },

  // ---------- LLUVIA DE FLECHAS ----------
  rain(run, w, dt) {
    if (!wReady(run, w, dt, w.evo ? 2.4 : 3.0)) return;
    const tier = weaponTier(w.level), A = run.stats.area;
    const zones = (w.evo ? 5 : [1, 1, 2, 3][tier]) + Math.min(1, run.stats.amount);
    const r = (w.evo ? 100 : [60, 75, 75, 82][tier]) * A;
    const dmg = wDamage(w, 6), color = wColor(w);
    const targets = run.enemiesOnScreen().sort(() => Math.random() - 0.5);
    for (let i = 0; i < zones; i++) {
      const tg = targets[i];
      const x = tg ? tg.x : run.player.x + (Math.random() - 0.5) * 300;
      const y = tg ? tg.y : run.player.y + (Math.random() - 0.5) * 200;
      run.areas.push({ kind: 'rain', x, y, r, dmg, tick: 0.2, tickT: 0.1, life: 1.2, max: 1.2, color });
    }
  },

  // ---------- DAGAS (hacia donde te mueves) ----------
  knife(run, w, dt) {
    if (!wReady(run, w, dt, w.evo ? 0.22 : 0.8)) return;
    const P = run.player, tier = weaponTier(w.level);
    const count = (w.evo ? 3 : tier + 1) + run.stats.amount;
    const pierce = w.evo ? 3 : (tier >= 3 ? 2 : 0);
    const dmg = wDamage(w, 8), color = wColor(w);
    const speed = 440 * run.stats.projSpeed;
    for (let i = 0; i < count; i++) {
      const a = P.face + (i - (count - 1) / 2) * 0.16;
      run.addProjectile({ kind: 'dagger', x: P.x, y: P.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        r: 5, dmg, pierce, life: 0.9, color, angle: a });
    }
  },

  // ---------- HACHA (en arco, con gravedad) ----------
  axe(run, w, dt) {
    if (!wReady(run, w, dt, w.evo ? 1.6 : 2.0)) return;
    const P = run.player, tier = weaponTier(w.level);
    const count = (w.evo ? 5 : tier + 1) + run.stats.amount;
    const size = w.evo ? 2.2 : [1, 1, 1.35, 1.7][tier];
    const dmg = wDamage(w, 20), color = wColor(w);
    for (let i = 0; i < count; i++) {
      const vx = (i - (count - 1) / 2) * 70 + (Math.random() - 0.5) * 40;
      run.addProjectile({ kind: 'axe', x: P.x, y: P.y, vx, vy: -420 - Math.random() * 60,
        gravity: 760, r: 10 * size * run.stats.area, size, dmg, pierce: 99, life: 2.2, color, angle: 0, spin: 12 });
    }
  },

  // ---------- AGUA BENDITA ----------
  holywater(run, w, dt) {
    if (!wReady(run, w, dt, w.evo ? 2.6 : 3.0)) return;
    const P = run.player, tier = weaponTier(w.level), A = run.stats.area;
    const count = (w.evo ? 4 : [1, 2, 2, 3][tier]) + run.stats.amount;
    const r = (w.evo ? 82 : [42, 46, 58, 64][tier]) * A;
    const life = w.evo ? 4 : 2.5;
    const dmg = wDamage(w, 5), color = wColor(w);
    const targets = run.enemiesOnScreen().sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      const tg = targets[i];
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 120;
      const x = tg ? tg.x : P.x + Math.cos(a) * d, y = tg ? tg.y : P.y + Math.sin(a) * d;
      run.areas.push({ kind: 'holy', x, y, r, dmg, tick: 0.35, tickT: 0, life, max: life, color });
    }
  },

  // ---------- ORBES (siempre activos, giran alrededor) ----------
  orbs(run, w, dt) {
    const P = run.player, tier = weaponTier(w.level), A = run.stats.area;
    const count = (w.evo ? 6 : tier + 1) + run.stats.amount;
    const radius = (w.evo ? 115 : [70, 76, 84, 92][tier]) * A;
    const speed = w.evo ? 4.2 : (tier >= 3 ? 3.8 : 3);
    const dmg = wDamage(w, 9);
    w.angle = (w.angle || 0) + speed * dt;
    w.orbPos = [];
    w.orbSize = w.evo ? 11 : 7 + tier;
    for (let i = 0; i < count; i++) {
      const a = w.angle + i * Math.PI * 2 / count;
      const x = P.x + Math.cos(a) * radius, y = P.y + Math.sin(a) * radius;
      w.orbPos.push({ x, y });
      run.damageArea(x, y, w.orbSize + 4, dmg, { hitKey: 'orb', hitCd: 0.5, knock: 70, fromX: P.x, fromY: P.y, quiet: true });
    }
  },

  // ---------- RAYO ----------
  lightning(run, w, dt) {
    if (!wReady(run, w, dt, w.evo ? 1.2 : 2.2)) return;
    const tier = weaponTier(w.level), A = run.stats.area;
    const count = (w.evo ? 8 : tier + 1) + run.stats.amount;
    const r = (w.evo ? 55 : [30, 34, 40, 50][tier]) * A;
    const dmg = wDamage(w, 18), color = wColor(w);
    const targets = run.enemiesOnScreen().sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, targets.length); i++) {
      const e = targets[i];
      run.damageArea(e.x, e.y, r, dmg);
      run.addFx({ kind: 'bolt', x: e.x, y: e.y, r, color, max: 0.18, seed: Math.random() * 1000 });
    }
  },

  // ---------- AURA (siempre activa) ----------
  aura(run, w, dt) {
    const P = run.player, tier = weaponTier(w.level), A = run.stats.area;
    w.radius = (w.evo ? 140 : [55, 70, 85, 100][tier]) * A;
    w.timer -= dt;
    if (w.timer > 0) return;
    w.timer = 0.45;
    const dmg = wDamage(w, 4);
    run.damageArea(P.x, P.y, w.radius, dmg, {
      knock: tier >= 3 || w.evo ? 90 : 0, fromX: P.x, fromY: P.y,
      slow: w.evo ? 0.6 : 0, quiet: true,
    });
  },
};
