// =============================================================
//  ENEMIGOS, DIRECTOR DE OLEADAS, EVENTOS Y JEFES
// =============================================================

// ---------- Dificultad ----------
// Es continua: cada zona empieza un poco MÁS difícil de lo que terminó la anterior
// (nunca se reinicia). 'p' = progreso: 0 al empezar la zona 1, 1 al llegar su jefe,
// 1 al empezar la zona 2, etc.
function difficulty(run) {
  const z = run.zoneIndex, zt = run.zoneTime;
  // los primeros 20 s de cada zona las oleadas crecen poco a poco
  const ramp = Math.min(1, 0.45 + zt / 20);
  if (ZONES[z].endless) {
    const p = 4 + zt / ZONE_BOSS_TIME;
    return {
      hp: (1 + p + 0.35 * p * p + 1) * (1 + zt / 400),
      dmg: 1 + 0.45 * p + 0.3,
      rate: (1.2 + 4.2 * p) * ramp,
      maxAlive: Math.min(380, 250 + zt * 0.4),
    };
  }
  const p = z + Math.min(1, zt / ZONE_BOSS_TIME);
  return {
    hp: 1 + p + 0.35 * p * p + 0.25 * z,   // vida de los enemigos (x)
    dmg: 1 + 0.45 * p + 0.1 * z,           // daño de los enemigos (x)
    rate: (1.2 + 4.2 * p) * ramp,          // enemigos nuevos por segundo
    maxAlive: 110 + 35 * z,                // máximo a la vez
  };
}

function spawnEnemy(run, type, x, y, opts = {}) {
  const def = ENEMIES[type];
  const d = difficulty(run);
  const elite = !!opts.elite;
  const e = {
    id: run.nextId++, type, def,
    x, y, r: def.r * (elite ? 1.5 : 1),
    hp: 0, maxHp: 0,
    speed: def.speed * (elite ? 0.9 : 1) * (opts.speedMul || 1),
    dmg: Math.round(def.dmg * d.dmg * (elite ? 1.5 : 1)),
    xp: def.xp * (elite ? 10 : 1),
    scale: def.scale * (elite ? 1.5 : 1),
    sprite: def.sprite, pal: def.pal, key: type,
    ai: opts.ai || def.ai, fly: def.fly, alpha: def.alpha || 1,
    elite, boss: false, shadow: ZONES[run.zoneIndex].endless,
    kx: 0, ky: 0, flash: 0, slowT: 0, freezeT: 0, hits: {},
    t: Math.random() * 10, state: 'walk', stateT: Math.random() * 2, shotT: 1 + Math.random() * 2,
    thornT: 0, dead: false, flip: false, z: 0,
  };
  e.maxHp = e.hp = Math.round(def.hp * d.hp * (elite ? 10 : 1));
  if (opts.vx !== undefined) { e.vx = opts.vx; e.vy = opts.vy; e.life = opts.life || 8; }
  if (opts.roomElite) e.roomElite = opts.roomElite;
  if (opts.noChest) e.noChest = true;
  run.enemies.push(e);
  return e;
}

// Busca un punto fuera de la pantalla, alrededor del jugador
// Nunca aparece dentro de la pantalla: si el punto cae fuera del mapa
// (cerca del borde) se descarta y se prueba otra dirección.
function spawnPoint(run, minDist = 560, spread = 90) {
  const P = run.player, edge = MAP_BORDER + 20;
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = minDist + Math.random() * spread;
    const x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
    if (x < edge || y < edge || x > run.world.w - edge || y > run.world.h - edge) continue;
    if (!pointBlocked(run.world, x, y, 16)) return { x, y };
  }
  return null;
}

function zoneEnemyTypes(run) {
  const zone = ZONES[run.zoneIndex];
  return zone.enemies.filter(e => run.zoneTime >= e[2]);
}

function pickEnemyType(run) {
  const list = zoneEnemyTypes(run);
  const total = list.reduce((a, e) => a + e[1], 0);
  let r = Math.random() * total;
  for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; }
  return list[0][0];
}

// ---------- Director: decide cuándo y qué aparece ----------
function updateDirector(run, dt) {
  const D = run.director, zone = ZONES[run.zoneIndex], P = run.player;
  const diff = difficulty(run);
  const bossAlive = D.boss && !D.boss.dead;

  // aparición continua
  let rate = diff.rate * (bossAlive ? 0.35 : 1);
  if (run.portal) rate *= 0.3;
  D.spawnAcc += rate * dt;
  while (D.spawnAcc >= 1) {
    D.spawnAcc -= 1;
    if (run.enemies.length >= diff.maxAlive) break;
    const p = spawnPoint(run);
    if (p) spawnEnemy(run, pickEnemyType(run), p.x, p.y);
  }

  // jefe de zona
  if (!zone.endless && !D.bossSpawned && run.zoneTime >= ZONE_BOSS_TIME) {
    D.bossSpawned = true;
    D.boss = spawnBoss(run, zone.boss, 1);
  }
  // en el abismo vuelven jefes cada vez más fuertes
  if (zone.endless && run.zoneTime >= D.nextEndlessBoss && !bossAlive) {
    D.nextEndlessBoss = run.zoneTime + 150;
    D.endlessCycle++;
    const ids = Object.keys(BOSSES);
    D.boss = spawnBoss(run, ids[Math.floor(Math.random() * ids.length)], 2.5 + D.endlessCycle * 1.2);
  }
  if (bossAlive || run.portal) return;

  // enemigos de élite
  D.nextElite -= dt;
  if (D.nextElite <= 0) {
    D.nextElite = 50 + Math.random() * 25;
    const p = spawnPoint(run, 480, 60);
    if (p) { spawnEnemy(run, pickEnemyType(run), p.x, p.y, { elite: true }); run.showBanner(t('eliteAppears'), 2); Sound.play('alarm'); }
  }

  // eventos especiales
  D.nextEvent -= dt;
  if (D.nextEvent <= 0) {
    D.nextEvent = 70 + Math.random() * 25;
    const evs = ['ring', 'stampede', 'fog'];
    const ev = evs[Math.floor(Math.random() * evs.length)];
    Sound.play('alarm');
    if (ev === 'ring') {
      run.showBanner(t('evRing'), 2.5);
      const type = zoneEnemyTypes(run)[0][0];
      const n = 22 + run.zoneIndex * 6;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        const x = P.x + Math.cos(a) * 330, y = P.y + Math.sin(a) * 330;
        if (!pointBlocked(run.world, x, y, 12)) spawnEnemy(run, type, x, y);
      }
    } else if (ev === 'stampede') {
      run.showBanner(t('evStampede'), 2.5);
      const types = zoneEnemyTypes(run).map(e => e[0]);
      const type = types.find(tp => ENEMIES[tp].ai === 'wavy' || ENEMIES[tp].ai === 'charge') || types[0];
      const side = Math.floor(Math.random() * 4);
      const n = 16 + run.zoneIndex * 4;
      for (let i = 0; i < n; i++) {
        const off = (i / (n - 1) - 0.5) * 520;
        let x, y, vx = 0, vy = 0;
        const sp = 260;
        if (side === 0) { x = P.x - 560; y = P.y + off; vx = sp; }
        else if (side === 1) { x = P.x + 560; y = P.y + off; vx = -sp; }
        else if (side === 2) { x = P.x + off * 1.6; y = P.y - 340; vy = sp; }
        else { x = P.x + off * 1.6; y = P.y + 340; vy = -sp; }
        x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60;
        spawnEnemy(run, type, x, y, { ai: 'straight', vx, vy, life: 6 });
      }
    } else {
      run.showBanner(t('evFog'), 2.5);
      run.fogT = 25;
    }
  }
}

// ---------- Movimiento y comportamiento de cada enemigo ----------
function updateEnemies(run, dt) {
  const P = run.player;
  for (const e of run.enemies) {
    if (e.dead) continue;
    const startX = e.x, startY = e.y;
    e.t += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.slowT = Math.max(0, e.slowT - dt);
    e.freezeT = Math.max(0, e.freezeT - dt);
    e.thornT = Math.max(0, e.thornT - dt);
    const dx = P.x - e.x, dy = P.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    let spd = e.speed * (e.slowT > 0 ? 0.5 : 1);
    if (e.freezeT > 0) spd = 0;
    let mx = 0, my = 0;

    if (e.boss) {
      updateBoss(run, e, dt, dist);
    } else if (e.ai === 'straight') {
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.life -= dt;
      if (e.life <= 0) { e.dead = true; e.silent = true; }
    } else if (e.ai === 'charge') {
      e.stateT -= dt;
      if (e.state === 'walk') {
        mx = dx / dist; my = dy / dist;
        if (dist < 240 && e.stateT <= 0) { e.state = 'wind'; e.stateT = 0.55; }
      } else if (e.state === 'wind') {
        if (e.stateT <= 0) { e.state = 'dash'; e.stateT = 0.5; e.dashA = Math.atan2(dy, dx); }
      } else if (e.state === 'dash') {
        mx = Math.cos(e.dashA) * 4.5; my = Math.sin(e.dashA) * 4.5;
        if (e.stateT <= 0) { e.state = 'walk'; e.stateT = 2.2; }
      }
    } else if (e.ai === 'ranged') {
      const sh = e.def.shot;
      if (dist > sh.range * 0.85) { mx = dx / dist; my = dy / dist; }
      else if (dist < sh.range * 0.5) { mx = -dx / dist * 0.6; my = -dy / dist * 0.6; }
      else { mx = -dy / dist * 0.3; my = dx / dist * 0.3; }
      e.shotT -= dt;
      if (e.shotT <= 0 && dist < sh.range + 60 && e.freezeT <= 0) {
        e.shotT = sh.cd * (0.8 + Math.random() * 0.4);
        const base = Math.atan2(dy, dx), n = sh.spread || 1;
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.25;
          run.shots.push({ x: e.x, y: e.y, vx: Math.cos(a) * sh.speed, vy: Math.sin(a) * sh.speed,
            r: sh.r, dmg: Math.round(sh.dmg * difficulty(run).dmg), life: 5, color: sh.color, homing: sh.homing ? 1.6 : 0, speed: sh.speed });
        }
      }
    } else if (e.ai === 'wavy') {
      const a = Math.atan2(dy, dx) + Math.sin(e.t * 3 + e.id) * 0.8;
      mx = Math.cos(a); my = Math.sin(a);
    } else {
      mx = dx / dist; my = dy / dist;
    }

    if (!e.boss) {
      e.x += (mx * spd + e.kx) * dt;
      e.y += (my * spd + e.ky) * dt;
      if (mx) e.flip = mx < 0;
    }
    const decay = Math.max(0, 1 - 9 * dt);
    e.kx *= decay; e.ky *= decay;

    // separación entre enemigos para que no se amontonen en un punto
    if (!e.boss) {
      run.queryEnemies(e.x, e.y, e.r, o => {
        if (o === e || o.boss) return;
        const ox = e.x - o.x, oy = e.y - o.y;
        const d = Math.hypot(ox, oy) || 0.01, min = e.r + o.r;
        if (d < min) { const push = (min - d) * 0.25; e.x += ox / d * push; e.y += oy / d * push; }
      });
    }
    if (!e.fly && e.ai !== 'straight') resolveCollision(run.world, e, e.r * 0.8);
    // la animación de pasos avanza según la distancia recorrida (quieto = no camina)
    e.animT = (e.animT || 0) + Math.min(20, Math.hypot(e.x - startX, e.y - startY));

    // daño por contacto
    if (dist < e.r + P.r && e.freezeT <= 0 && e.z < 20 && e.alpha > 0.4) {
      run.hurtPlayer(e.dmg);
      if (run.stats.thorns > 0 && e.thornT <= 0) { e.thornT = 0.5; run.damageEnemy(e, run.stats.thorns, { quiet: true }); }
    }

    // enemigos que se quedaron muy lejos reaparecen cerca
    if (!e.boss && !e.roomElite && e.ai !== 'straight' && dist > 1150) {
      const p = spawnPoint(run);
      if (p) { e.x = p.x; e.y = p.y; }
    }
  }
}

// =============================================================
//  JEFES: cada ataque se avisa antes con una marca roja en el suelo
// =============================================================
function spawnBoss(run, id, power) {
  const B = BOSSES[id];
  const P = run.player;
  let p = spawnPoint(run, 380, 40) || spawnPoint(run, 250, 300) ||
    { x: P.x < run.world.w / 2 ? P.x + 300 : P.x - 300, y: P.y };
  const e = {
    id: run.nextId++, type: id, def: B, bossDef: B, boss: true,
    x: p.x, y: p.y, r: B.r, scale: B.scale,
    maxHp: Math.round(B.hp * power), hp: Math.round(B.hp * power),
    speed: B.speed, dmg: Math.round(B.dmg * (power > 1 ? 1 + power * 0.25 : 1)), xp: B.xp * power,
    sprite: B.sprite, pal: B.pal, key: 'boss_' + id, alpha: 1, fly: true,
    kx: 0, ky: 0, flash: 0, slowT: 0, freezeT: 0, hits: {}, t: 0, z: 0,
    mode: 'idle', atkT: 2, atkIdx: 0, phase2: false, dead: false, flip: false, thornT: 0,
    shadow: ZONES[run.zoneIndex].endless,
  };
  run.enemies.push(e);
  run.showBanner(t('bossIncoming'), 3, tr(B.name));
  Sound.play('boss');
  run.shakeScreen(8);
  return e;
}

function bossShoot(run, e, angle, speed, opts = {}) {
  run.shots.push({ x: e.x, y: e.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    r: opts.r || 6, dmg: opts.dmg || Math.round(e.dmg * 0.6), life: 6, color: opts.color || '#ff6a6a',
    slow: opts.slow || 0, homing: 0, speed });
}

function bossRing(run, e, n, speed, offset = 0, opts) {
  for (let i = 0; i < n; i++) bossShoot(run, e, offset + i / n * Math.PI * 2, speed, opts);
}

function updateBoss(run, e, dt, dist) {
  const P = run.player;
  const toP = Math.atan2(P.y - e.y, P.x - e.x);
  if (!e.phase2 && e.hp < e.maxHp * 0.5) {
    e.phase2 = true;
    e.speed *= 1.25;
    run.shakeScreen(6);
    Sound.play('boss');
  }
  const p2 = e.phase2;
  e.flip = P.x < e.x;
  e.modeT = (e.modeT || 0) + dt;

  switch (e.mode) {
    case 'idle': {
      const spd = e.speed * 0.6 * (e.slowT > 0 ? 0.6 : 1);
      if (dist > 90) { e.x += Math.cos(toP) * spd * dt; e.y += Math.sin(toP) * spd * dt; }
      e.atkT -= dt;
      if (e.atkT <= 0) {
        const list = e.bossDef.attacks;
        startBossAttack(run, e, list[e.atkIdx % list.length], toP, p2);
        e.atkIdx++;
      }
      break;
    }
    case 'jump': {
      const k = Math.min(1, e.modeT / e.modeDur);
      e.x = e.from.x + (e.to.x - e.from.x) * k;
      e.y = e.from.y + (e.to.y - e.from.y) * k;
      e.z = Math.sin(k * Math.PI) * 90;
      if (k >= 1) {
        e.z = 0;
        run.shakeScreen(7);
        bossRing(run, e, p2 ? 12 : 8, 130, Math.random());
        endBossAttack(e, p2 ? 1.0 : 1.6);
      }
      break;
    }
    case 'chase': {
      e.x += Math.cos(toP) * e.speed * 1.7 * dt;
      e.y += Math.sin(toP) * e.speed * 1.7 * dt;
      if (e.modeT > 2.4) endBossAttack(e, 0.8);
      break;
    }
    case 'ring': {
      const shots = p2 ? 3 : 2;
      while (e.fired < shots && e.modeT >= e.fired * 0.5) {
        bossRing(run, e, 16, 140, e.fired * 0.2, { color: '#9dff8a' });
        e.fired++;
      }
      if (e.modeT > shots * 0.5) endBossAttack(e, 1.4);
      break;
    }
    case 'spiral': {
      e.emitT = (e.emitT || 0) - dt;
      while (e.emitT <= 0) {
        e.emitT += 0.09;
        e.spin = (e.spin || 0) + 0.33;
        const arms = p2 ? 3 : 2;
        for (let i = 0; i < arms; i++) bossShoot(run, e, e.spin + i * Math.PI * 2 / arms, 150, { color: e.type === 'dark_lord' ? '#ff5a3a' : '#9dff8a' });
      }
      if (e.modeT > 2.6) endBossAttack(e, 1.2);
      break;
    }
    case 'teleport': {
      e.alpha = Math.max(0.1, 1 - e.modeT / e.modeDur);
      if (e.modeT >= e.modeDur) {
        e.x = e.to.x; e.y = e.to.y; e.alpha = 1;
        bossRing(run, e, p2 ? 16 : 12, 150, 0, { color: '#9dff8a' });
        endBossAttack(e, 1.0);
      }
      break;
    }
    case 'dashwind': {
      if (e.modeT >= e.modeDur) { e.mode = 'dash'; e.modeT = 0; }
      break;
    }
    case 'dash': {
      const sp = 950;
      e.x += Math.cos(e.dashA) * sp * dt;
      e.y += Math.sin(e.dashA) * sp * dt;
      const b = MAP_BORDER + e.r;
      e.x = Math.max(b, Math.min(run.world.w - b, e.x));
      e.y = Math.max(b, Math.min(run.world.h - b, e.y));
      if (e.modeT >= e.dashLen / sp) {
        if (p2 && !e.dashedTwice) { e.dashedTwice = true; startBossAttack(run, e, 'dash', Math.atan2(P.y - e.y, P.x - e.x), p2); }
        else { e.dashedTwice = false; endBossAttack(e, 1.0); }
      }
      break;
    }
    case 'web': {
      const waves = 2;
      while (e.fired < waves && e.modeT >= e.fired * 0.6) {
        const n = p2 ? 7 : 5;
        for (let i = 0; i < n; i++) bossShoot(run, e, toP + (i - (n - 1) / 2) * 0.2, 210, { color: '#e8e8e8', slow: 2, r: 7 });
        e.fired++;
      }
      if (e.modeT > waves * 0.6) endBossAttack(e, 1.3);
      break;
    }
    case 'wait': {
      if (e.modeT >= e.modeDur) endBossAttack(e, e.after || 1.0);
      break;
    }
  }
}

function endBossAttack(e, delay) { e.mode = 'idle'; e.atkT = delay; e.modeT = 0; }

function startBossAttack(run, e, name, toP, p2) {
  const P = run.player;
  e.modeT = 0; e.fired = 0;
  switch (name) {
    case 'jump': {
      const dur = p2 ? 0.8 : 1.05;
      e.mode = 'jump'; e.modeDur = dur;
      e.from = { x: e.x, y: e.y }; e.to = { x: P.x, y: P.y };
      run.telegraphs.push({ type: 'circle', x: P.x, y: P.y, r: 85, t: dur, total: dur, dmg: e.dmg * 1.3 });
      break;
    }
    case 'summon': {
      const n = p2 ? 8 : 6;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        const x = e.x + Math.cos(a) * (e.r + 40), y = e.y + Math.sin(a) * (e.r + 40);
        if (!pointBlocked(run.world, x, y, 10)) spawnEnemy(run, e.bossDef.minion, x, y);
        run.burst(x, y, '#b9a6d6', 6);
      }
      e.mode = 'wait'; e.modeDur = 0.6; e.after = 1.2;
      break;
    }
    case 'chase': e.mode = 'chase'; break;
    case 'ring': e.mode = 'ring'; break;
    case 'spiral': e.mode = 'spiral'; e.emitT = 0; break;
    case 'teleport': {
      const a = Math.random() * Math.PI * 2;
      let x = P.x + Math.cos(a) * 230, y = P.y + Math.sin(a) * 230;
      const m = MAP_BORDER + e.r + 10;
      x = Math.max(m, Math.min(run.world.w - m, x)); y = Math.max(m, Math.min(run.world.h - m, y));
      e.mode = 'teleport'; e.modeDur = 0.8; e.to = { x, y };
      run.telegraphs.push({ type: 'circle', x, y, r: e.r + 10, t: 0.8, total: 0.8, dmg: 0, color: '157,255,138' });
      break;
    }
    case 'dash': {
      const dur = p2 ? 0.6 : 0.85;
      e.mode = 'dashwind'; e.modeDur = dur; e.dashA = toP; e.dashLen = 620;
      run.telegraphs.push({ type: 'line', x: e.x, y: e.y, ang: toP, len: 620, w: e.r * 2, t: dur, total: dur, dmg: 0 });
      break;
    }
    case 'web': e.mode = 'web'; break;
    case 'sweep': {
      const dur = p2 ? 0.6 : 0.8;
      run.telegraphs.push({ type: 'cone', x: e.x, y: e.y, ang: toP, arc: 1.9, r: 210, t: dur, total: dur, dmg: e.dmg * 1.3,
        onEnd: () => run.addFx({ kind: 'slash', x: e.x, y: e.y, ang: toP, arc: 1.9, r: 210, color: '#ff4a4a', max: 0.25 }) });
      e.mode = 'wait'; e.modeDur = dur + 0.1; e.after = 0.9;
      break;
    }
    case 'meteors': {
      const n = p2 ? 9 : 6;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : 40 + Math.random() * 200;
        const dur = 1.0 + i * 0.12;
        run.telegraphs.push({ type: 'circle', x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, r: 58, t: dur, total: dur, dmg: e.dmg, meteor: true });
      }
      e.mode = 'wait'; e.modeDur = 1.2; e.after = 1.5;
      break;
    }
  }
}
