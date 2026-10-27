// =============================================================
//  PARTIDA: reglas del juego mientras juegas
// =============================================================

const VIEW_W = 960, VIEW_H = 540;
const GRID = 64; // tamaño de celda para buscar enemigos cercanos rápido

// Experiencia necesaria para pasar del nivel l al l+1
// Progresiva: los primeros niveles son rápidos y cada nivel cuesta bastante más que el anterior
function xpForLevel(l) { return Math.floor(3 + l * 3 + Math.pow(l, 2.15) * 0.28); }
// Aspecto del héroe según su nivel (cambia en los niveles 8, 16 y 25)
function playerTier(level) { return level >= 25 ? 3 : level >= 16 ? 2 : level >= 8 ? 1 : 0; }

function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function baseStats(ch) {
  return {
    maxHp: ch.hp, hpMul: 1, speed: ch.speed, speedMul: 1, armor: ch.armor, regen: 0,
    damage: 1, cooldown: 1, area: 1, amount: 0, magnet: 70, magnetMul: 1,
    xpMul: 1, goldMul: 1, crit: 0.03, projSpeed: 1, dodge: 0, thorns: 0, revives: 0,
  };
}

// Color de las partículas al morir cada tipo de enemigo
const DEATH_COLOR = { slime: '#86d457', bat: '#a65fd6', wolf: '#8d939c', goblin: '#86d457', zombie: '#7f9f6b',
  skeleton: '#e6dcc2', ghost: '#f4f1ea', spider: '#5a4f68', mummy: '#e6dcc2', cultist: '#a65fd6',
  knight: '#5d6670', imp: '#d1403f', gargoyle: '#8d939c' };

class Run {
  constructor(charId) {
    this.char = CHARACTERS[charId];
    this.time = 0; this.kills = 0; this.goldRun = 0;
    this.level = 1; this.xp = 0; this.xpNext = xpForLevel(1);
    this.weapons = []; this.passives = {}; this.relics = [];
    this.pending = []; this.modal = false; this.paused = false;
    this.over = false; this.overShown = false;
    this.nextId = 1; this.revivesUsed = 0; this.lastHealDrop = 0;
    this.player = { x: 0, y: 0, r: 10, face: 0, faceX: 1, hp: 1, invuln: 0, slowT: 0, flashT: 0, moving: false, walkT: 0 };
    this.numbers = []; this.particles = [];
    this.banner = null; this.shake = 0; this.fade = 1; this.fogT = 0;
    this.cam = { x: 0, y: 0 };
    this.grid = new Map();
    this.addWeapon(this.char.weapon, 1);
    this.recalcStats();
    this.player.hp = this.stats.maxHp;
    this.startZone(0);
  }

  // ---------------------------------------------------------------
  //  Zonas
  // ---------------------------------------------------------------
  startZone(i) {
    this.zoneIndex = i;
    this.zone = ZONES[i];
    this.world = createWorld(this.zone);
    this.zoneTime = 0;
    this.enemies = []; this.projectiles = []; this.areas = []; this.shots = [];
    this.pickups = []; this.telegraphs = []; this.fx = [];
    this.gemCount = 0;
    // la primera zona da más margen antes del primer evento y la primera élite
    const easy = i === 0;
    this.director = { spawnAcc: 0, nextEvent: easy ? 95 : 60, nextElite: easy ? 75 : 45, bossSpawned: false, boss: null, nextEndlessBoss: 120, endlessCycle: 0 };
    this.portal = null; this.fogT = 0;
    this.player.x = this.player.y = MAP_SIZE / 2;
    this.placeRoomLoot();
    this.updateCamera();
    Music.start(i);
    this.showBanner(t('enterZone', { n: i + 1, name: tr(this.zone.name) }), 3.5, this.zone.endless ? t('endless') : null);
  }

  placeRoomLoot() {
    for (const room of this.world.rooms) {
      const cx = room.inner.x + room.inner.w / 2, cy = room.inner.y + room.inner.h / 2;
      const chest = this.spawnPickup('chest', cx, cy, 0);
      chest.room = room;
      room.chest = chest;
      if (room.kind === 'challenge') chest.chestLocked = true;
      else {
        for (let k = 0; k < 6; k++) {
          const c = this.spawnPickup('coin', room.inner.x + 14 + Math.random() * (room.inner.w - 28),
            room.inner.y + 14 + Math.random() * (room.inner.h - 28), 2 + this.zoneIndex);
          c.room = room; c.vx = c.vy = 0;
        }
        const f = this.spawnHeal(cx + 40, cy, Math.random() < 0.5 ? 'medium' : 'large');
        f.room = room; f.vx = f.vy = 0;
      }
    }
  }

  nextZone() {
    const heal = this.stats.maxHp * 0.3;
    Sound.play('portal');
    this.startZone(this.zoneIndex + 1);
    this.player.hp = Math.min(this.stats.maxHp, this.player.hp + heal);
    this.fade = 1;
  }

  // ---------------------------------------------------------------
  //  Estadísticas, armas y mejoras
  // ---------------------------------------------------------------
  recalcStats() {
    const s = baseStats(this.char);
    this.char.bonus(s);
    for (const m of META_UPGRADES) { const l = SaveData.meta[m.id] || 0; if (l) m.apply(s, l); }
    for (const id in this.passives) UPGRADES[id].apply(s, this.passives[id]);
    for (const id of this.relics) RELICS[id].apply(s);
    s.maxHp = Math.round(s.maxHp * s.hpMul);
    s.speed *= s.speedMul;
    s.magnet *= s.magnetMul;
    s.cooldown = Math.max(0.3, s.cooldown);
    s.crit = Math.min(0.8, s.crit);
    s.dodge = Math.min(0.5, s.dodge);
    const old = this.stats;
    this.stats = s;
    if (old && s.maxHp > old.maxHp) this.player.hp += s.maxHp - old.maxHp;
    this.player.hp = Math.min(this.player.hp, s.maxHp);
  }

  getWeapon(id) { return this.weapons.find(w => w.id === id); }
  addWeapon(id, level) { this.weapons.push({ id, level: level || 1, timer: 0.3, evo: false }); }

  // Elige 'n' mejoras al azar entre las 20 disponibles para este héroe
  upgradeOptions(n) {
    const ids = Object.keys(UPGRADES).filter(id => !UPGRADES[id].owner || UPGRADES[id].owner === this.char.id);
    const wCount = this.weapons.length, pCount = Object.keys(this.passives).length;
    const pool = [];
    for (const id of ids) {
      const def = UPGRADES[id];
      if (def.type === 'weapon') {
        const w = this.getWeapon(id);
        if (w) { if (w.level < WEAPON_MAX) pool.push({ id, wt: 3 }); }
        else if (wCount < MAX_WEAPONS) pool.push({ id, wt: def.owner ? 2.2 : 1.4 });
      } else {
        const lv = this.passives[id] || 0;
        // la pasiva que hace evolucionar un arma al máximo sale más a menudo
        const evoHint = this.weapons.some(w => w.level >= WEAPON_MAX && !w.evo && UPGRADES[w.id].evo.with === id) ? 2.5 : 1;
        if (lv) { if (lv < def.maxLevel) pool.push({ id, wt: 2.2 }); }
        else if (pCount < MAX_PASSIVES) pool.push({ id, wt: (def.owner ? 2 : 1.2) * evoHint });
      }
    }
    const out = [];
    while (out.length < n && pool.length) {
      const total = pool.reduce((a, p) => a + p.wt, 0);
      let r = Math.random() * total, idx = 0;
      for (; idx < pool.length - 1; idx++) { r -= pool[idx].wt; if (r <= 0) break; }
      out.push(pool[idx].id);
      pool.splice(idx, 1);
    }
    for (const filler of ['heal', 'gold']) if (out.length < n) out.push(filler);
    return out;
  }

  applyUpgrade(id, levels = 1) {
    if (id === 'heal') { this.player.hp = Math.min(this.stats.maxHp, this.player.hp + this.stats.maxHp * 0.3); Sound.play('heal'); return; }
    if (id === 'gold') { this.addGold(25, true); Sound.play('coin'); return; }
    const def = UPGRADES[id];
    if (def.type === 'weapon') {
      const w = this.getWeapon(id);
      if (w) w.level = Math.min(WEAPON_MAX, w.level + levels);
      else this.addWeapon(id, Math.min(WEAPON_MAX, levels));
    } else {
      this.passives[id] = Math.min(def.maxLevel, (this.passives[id] || 0) + levels);
    }
    this.recalcStats();
  }

  // ¿Hay un arma lista para evolucionar? (nivel máximo + su pasiva)
  findEvolution() {
    return this.weapons.find(w => !w.evo && w.level >= WEAPON_MAX && this.passives[UPGRADES[w.id].evo.with]);
  }

  relicOptions() {
    const free = Object.keys(RELICS).filter(id => !this.relics.includes(id));
    free.sort(() => Math.random() - 0.5);
    return free.slice(0, 3);
  }

  pickRelic(id) {
    this.relics.push(id);
    this.recalcStats();
    const r = RELICS[id];
    if (r.onPick) r.onPick(this);
    if (this.healFull) { this.player.hp = this.stats.maxHp; this.healFull = false; }
  }

  addXp(v) {
    this.xp += v * this.stats.xpMul;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      const oldTier = playerTier(this.level);
      this.level++;
      this.xpNext = xpForLevel(this.level);
      this.pending.push({ type: 'levelup' });
      if (playerTier(this.level) > oldTier) this.burst(this.player.x, this.player.y, '#ffd75a', 30, 160);
    }
  }

  addGold(v, raw) { this.goldRun += raw ? v : Math.max(1, Math.round(v * this.stats.goldMul)); }

  // Abre el siguiente menú pendiente (subir de nivel, cofre, reliquia)
  openPending() {
    const p = this.pending.shift();
    this.modal = true;
    if (p.type === 'levelup') {
      Sound.play('levelup');
      UI.showLevelUp(this, this.upgradeOptions(4));
    } else if (p.type === 'chest') {
      const w = this.findEvolution();
      if (w) { w.evo = true; Sound.play('evolve'); UI.showEvolution(this, w); }
      else { Sound.play('chest'); UI.showChest(this, this.upgradeOptions(4)); }
    } else if (p.type === 'relic') {
      const opts = this.relicOptions();
      if (opts.length) { Sound.play('chest'); UI.showRelics(this, opts); }
      else { this.modal = false; this.pending.unshift({ type: 'chest' }); }
    }
  }

  closeModal() {
    this.modal = false;
    UI.clear();
  }

  // ---------------------------------------------------------------
  //  Bucle de actualización
  // ---------------------------------------------------------------
  update(dt) {
    if (this.paused || this.modal) return;
    if (this.over) {
      this.updateEffects(dt);
      this.overT -= dt;
      if (this.overT <= 0 && !this.overShown) { this.overShown = true; UI.showGameOver(this); }
      return;
    }
    if (this.pending.length) { this.openPending(); return; }

    this.time += dt;
    this.zoneTime += dt;
    this.fade = Math.max(0, this.fade - dt * 1.5);

    this.updatePlayer(dt);
    this.buildGrid();
    for (const w of this.weapons) WEAPON_LOGIC[w.id](this, w, dt);
    updateDirector(this, dt);
    updateEnemies(this, dt);
    this.updateProjectiles(dt);
    this.updateAreas(dt);
    this.updateShots(dt);
    this.updateTelegraphs(dt);
    this.updatePickups(dt);
    this.updateRooms(dt);
    this.updatePortal(dt);
    this.updateEffects(dt);
    this.enemies = this.enemies.filter(e => !e.dead);
    this.updateCamera();
    // música frenética mientras haya un jefe (2) o una élite (1)
    const boss = this.director.boss;
    Music.setIntensity(boss && !boss.dead ? 2 : this.enemies.some(e => e.elite) ? 1 : 0);
  }

  updateCamera() {
    const P = this.player;
    this.cam.x = Math.max(0, Math.min(this.world.w - VIEW_W, P.x - VIEW_W / 2));
    this.cam.y = Math.max(0, Math.min(this.world.h - VIEW_H, P.y - VIEW_H / 2));
  }

  updatePlayer(dt) {
    const P = this.player, s = this.stats;
    let dx = Input.dx, dy = Input.dy;
    const len = Math.hypot(dx, dy);
    P.moving = len > 0;
    if (P.moving) {
      dx /= len; dy /= len;
      P.face = Math.atan2(dy, dx);
      if (dx) P.faceX = Math.sign(dx);
      const spd = s.speed * (P.slowT > 0 ? 0.55 : 1);
      P.x += dx * spd * dt; P.y += dy * spd * dt;
      P.walkT += spd * dt; // distancia caminada (para la animación de pasos)
    }
    resolveCollision(this.world, P, P.r);
    P.hp = Math.min(s.maxHp, P.hp + s.regen * dt);
    P.invuln = Math.max(0, P.invuln - dt);
    P.slowT = Math.max(0, P.slowT - dt);
    P.flashT = Math.max(0, P.flashT - dt);
  }

  hurtPlayer(dmg) {
    const P = this.player;
    if (P.invuln > 0 || this.over) return;
    if (Math.random() < this.stats.dodge) {
      P.invuln = 0.3;
      this.addNumber(P.x, P.y - 20, Settings.lang === 'es' ? 'esquiva' : 'dodge', '#9fd8ff');
      return;
    }
    const d = Math.max(1, Math.round(dmg - this.stats.armor));
    P.hp -= d;
    P.invuln = 0.7; P.flashT = 0.25;
    this.shakeScreen(5);
    Sound.play('hurt');
    this.addNumber(P.x, P.y - 20, d, '#ff5a5a');
    if (P.hp <= 0) {
      if (this.revivesUsed < this.stats.revives) {
        this.revivesUsed++;
        P.hp = this.stats.maxHp * 0.5;
        P.invuln = 2.5;
        this.showBanner(t('revived'), 2.5);
        Sound.play('evolve');
        this.burst(P.x, P.y, '#ff9a3a', 50, 260);
        for (const e of this.enemies) {
          const dist = Math.hypot(e.x - P.x, e.y - P.y);
          if (dist < 260 && !e.boss) { const a = Math.atan2(e.y - P.y, e.x - P.x); e.kx += Math.cos(a) * 900; e.ky += Math.sin(a) * 900; }
        }
      } else {
        this.gameOver();
      }
    }
  }

  gameOver() {
    this.over = true;
    this.overT = 1.4;
    this.player.hp = 0;
    const zoneReached = this.zoneIndex + 1;
    this.records = {
      time: this.time > SaveData.bestTime,
      zone: zoneReached > SaveData.bestZone,
    };
    SaveData.gold += this.goldRun;
    SaveData.bestTime = Math.max(SaveData.bestTime, this.time);
    SaveData.bestZone = Math.max(SaveData.bestZone, zoneReached);
    SaveData.bestKills = Math.max(SaveData.bestKills, this.kills);
    SaveData.bestLevel = Math.max(SaveData.bestLevel, this.level);
    saveGame();
    Music.stop();
    this.burst(this.player.x, this.player.y, '#d1403f', 40, 200);
  }

  // ---------------------------------------------------------------
  //  Búsqueda de enemigos (rejilla espacial)
  // ---------------------------------------------------------------
  buildGrid() {
    this.grid.clear();
    for (const e of this.enemies) {
      if (e.dead || e.boss) continue;
      const k = ((e.x / GRID) | 0) + ((e.y / GRID) | 0) * 1024;
      let cell = this.grid.get(k);
      if (!cell) { cell = []; this.grid.set(k, cell); }
      cell.push(e);
    }
  }

  // Llama a cb(enemigo) para cada enemigo que toca el círculo (x, y, r)
  queryEnemies(x, y, r, cb) {
    const pad = r + 40; // margen para enemigos grandes
    const x0 = Math.max(0, ((x - pad) / GRID) | 0), x1 = ((x + pad) / GRID) | 0;
    const y0 = Math.max(0, ((y - pad) / GRID) | 0), y1 = ((y + pad) / GRID) | 0;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const cell = this.grid.get(cx + cy * 1024);
      if (!cell) continue;
      for (const e of cell) {
        if (e.dead) continue;
        const dx = e.x - x, dy = e.y - y, rr = r + e.r;
        if (dx * dx + dy * dy <= rr * rr) cb(e);
      }
    }
    // los jefes son enormes y no están en la rejilla: los comprobamos aparte
    const boss = this.director.boss;
    if (boss && !boss.dead) {
      const dx = boss.x - x, dy = boss.y - y, rr = r + boss.r;
      if (dx * dx + dy * dy <= rr * rr) cb(boss);
    }
  }

  nearestEnemy(x, y, maxDist) {
    let best = null, bd = maxDist * maxDist;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  enemiesOnScreen() {
    const c = this.cam;
    return this.enemies.filter(e => !e.dead && e.x > c.x && e.x < c.x + VIEW_W && e.y > c.y && e.y < c.y + VIEW_H);
  }

  // ---------------------------------------------------------------
  //  Daño
  // ---------------------------------------------------------------
  damageEnemy(e, base, opts = {}) {
    if (e.dead) return;
    let dmg = base * this.stats.damage;
    const crit = Math.random() < this.stats.crit;
    if (crit) dmg *= 2;
    e.hp -= dmg;
    e.flash = 0.08;
    if (opts.knock && !e.boss) {
      const a = Math.atan2(e.y - (opts.fromY ?? this.player.y), e.x - (opts.fromX ?? this.player.x));
      const k = opts.knock * (e.elite ? 0.3 : 1);
      e.kx += Math.cos(a) * k; e.ky += Math.sin(a) * k;
    }
    if (opts.slow) e.slowT = Math.max(e.slowT, opts.slow);
    if (opts.freeze && !e.boss) e.freezeT = Math.max(e.freezeT, opts.freeze);
    this.addNumber(e.x, e.y - e.r * 1.2, dmg, crit ? '#ffd75a' : '#ffffff', crit);
    if (!opts.quiet) Sound.play('hit');
    if (e.hp <= 0) this.killEnemy(e);
  }

  // Daña a todos los enemigos dentro de un círculo
  damageArea(x, y, r, dmg, opts = {}) {
    this.queryEnemies(x, y, r, e => {
      if (segmentBlocked(this.world, x, y, e.x, e.y)) return; // un muro lo protege
      if (opts.hitKey) {
        const last = e.hits[opts.hitKey] ?? -99;
        if (this.time - last < opts.hitCd) return;
        e.hits[opts.hitKey] = this.time;
      }
      this.damageEnemy(e, dmg, { knock: opts.knock, fromX: opts.fromX ?? x, fromY: opts.fromY ?? y,
        slow: opts.slow, freeze: opts.freeze, quiet: opts.quiet });
    });
    this.hitWalls(x, y, r);
  }

  // Daña en un arco (espada, barridos)
  hitArc(x, y, r, ang, arc, dmg, opts = {}) {
    this.queryEnemies(x, y, r, e => {
      if (arc < Math.PI * 2 - 0.01) {
        const a = Math.atan2(e.y - y, e.x - x);
        if (Math.abs(angDiff(ang, a)) > arc / 2 + 0.15) return;
      }
      if (segmentBlocked(this.world, x, y, e.x, e.y)) return;
      this.damageEnemy(e, dmg, { knock: opts.knock, fromX: x, fromY: y });
    });
    this.hitWalls(x, y, r * 0.8);
  }

  // Los ataques pueden romper los muros agrietados de las salas secretas
  hitWalls(x, y, r) {
    for (const room of this.world.rooms) {
      if (room.state !== 'hidden') continue;
      const c = room.crack;
      const nx = Math.max(c.x, Math.min(x, c.x + c.w)), ny = Math.max(c.y, Math.min(y, c.y + c.h));
      if ((x - nx) ** 2 + (y - ny) ** 2 > r * r) continue;
      if (this.time - (c.lastHit || -9) < 0.15) return true;
      c.lastHit = this.time;
      c.hp -= 10;
      c.flash = 0.12;
      this.burst(c.x + c.w / 2, c.y + c.h / 2, this.zone.wall.light, 4);
      Sound.play('hit');
      if (c.hp <= 0) this.breakRoom(room);
      return true;
    }
    return false;
  }

  breakRoom(room) {
    room.crack.broken = true;
    room.state = 'open';
    this.burst(room.crack.x + TILE / 2, room.crack.y + TILE / 2, this.zone.wall.base, 22, 200);
    this.shakeScreen(4);
    Sound.play('break');
    Sound.play('secret');
    this.showBanner(t('secretFound'), 2.5);
  }

  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    // las zonas avanzadas dan algo más de experiencia (en el abismo crece poco a poco)
    const zoneMul = 1 + 0.3 * Math.min(this.zoneIndex, 4) + (this.zone.endless ? this.zoneTime / 400 : 0);
    const color = (e.pal && (e.pal.l || e.pal.p || e.pal.x || e.pal.P)) || DEATH_COLOR[e.sprite] || '#d8d0e8';
    this.burst(e.x, e.y, color, e.boss ? 60 : e.elite ? 20 : 6, e.boss ? 260 : 120);
    Sound.play('die');
    if (e.boss) { this.onBossDefeated(e); return; }
    this.dropGem(e.x, e.y, e.xp * zoneMul);
    if (Math.random() < 0.035) this.spawnPickup('coin', e.x, e.y, 1 + this.zoneIndex);
    // curas esporádicas: nunca dos seguidas en poco tiempo
    if (this.time - this.lastHealDrop > HEAL_MIN_GAP && Math.random() < HEAL_DROP_CHANCE) {
      this.lastHealDrop = this.time;
      this.spawnHeal(e.x, e.y, this.randomHealSize());
    }
    if (e.elite && Math.random() < 0.5) this.spawnHeal(e.x, e.y, 'medium');
    if (e.elite) {
      for (let i = 0; i < 6; i++) this.spawnPickup('coin', e.x, e.y, 2 + this.zoneIndex);
      if (!e.noChest) this.spawnPickup('chest', e.x, e.y, 0);
      this.shakeScreen(4);
    }
    if (e.roomElite) {
      const room = e.roomElite;
      room.state = 'done';
      room.chest.chestLocked = false;
      this.showBanner(t('challengeDone'), 2.5);
      Sound.play('secret');
    }
    if (e.def.split) {
      for (let i = 0; i < 2; i++) spawnEnemy(this, e.def.split, e.x + (i ? 8 : -8), e.y + (Math.random() - 0.5) * 8);
    }
  }

  onBossDefeated(e) {
    this.director.boss = null;
    this.shakeScreen(10);
    Sound.play('slam');
    for (let i = 0; i < 24; i++) this.spawnPickup('coin', e.x, e.y, 3 + this.zoneIndex * 2);
    for (let i = 0; i < 8; i++) this.dropGem(e.x, e.y, e.xp / 8);
    this.spawnHeal(e.x, e.y, 'large');
    this.shots = [];
    this.telegraphs = [];
    this.pending.push({ type: 'relic' });
    if (!this.zone.endless) {
      this.portal = { x: e.x, y: e.y, t: 0 };
      this.showBanner(t('portalOpen'), 3);
    }
  }

  // ---------------------------------------------------------------
  //  Objetos del suelo
  // ---------------------------------------------------------------
  spawnPickup(kind, x, y, value) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 80;
    const p = { kind, x, y, value, vx: Math.cos(a) * s, vy: Math.sin(a) * s, magnet: false, t: Math.random() * 6 };
    if (kind === 'chest') { p.vx = p.vy = 0; }
    this.pickups.push(p);
    return p;
  }

  spawnHeal(x, y, size) {
    const p = this.spawnPickup('food', x, y, 0);
    p.size = size;
    return p;
  }

  randomHealSize() {
    const total = Object.values(HEALS).reduce((a, h) => a + h.weight, 0);
    let r = Math.random() * total;
    for (const size in HEALS) { r -= HEALS[size].weight; if (r <= 0) return size; }
    return 'small';
  }

  dropGem(x, y, value) {
    if (this.gemCount >= 320) {
      // demasiadas gemas: sumamos el valor a una que ya existe
      const g = this.pickups.find(p => p.kind === 'gem' && !p.magnet);
      if (g) { g.value += value; return; }
    }
    this.gemCount++;
    this.spawnPickup('gem', x, y, value);
  }

  updatePickups(dt) {
    const P = this.player, mag = this.stats.magnet;
    for (const p of this.pickups) {
      if (p.dead) continue;
      p.t += dt;
      if (p.room && p.room.state === 'hidden') continue;
      const dx = P.x - p.x, dy = P.y - p.y, d = Math.hypot(dx, dy);
      if (p.kind === 'chest') {
        if (!p.chestLocked && d < 26) {
          p.dead = true;
          this.addGold(10 + this.zoneIndex * 10);
          this.pending.push({ type: 'chest' });
        }
        continue;
      }
      if (p.kind === 'food') {
        // las curas no las atrae el imán y solo se recogen si te falta vida,
        // así puedes guardarlas para cuando las necesites
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= Math.max(0, 1 - 6 * dt); p.vy *= Math.max(0, 1 - 6 * dt);
        if (d < 18 && P.hp < this.stats.maxHp) {
          p.dead = true;
          const amount = Math.round(this.stats.maxHp * HEALS[p.size].heal);
          P.hp = Math.min(this.stats.maxHp, P.hp + amount);
          Sound.play('heal');
          this.burst(P.x, P.y, '#7dff9a', p.size === 'large' ? 18 : 8, 90);
          this.addNumber(P.x, P.y - 24, '+' + amount, '#7dff9a', p.size === 'large');
        }
        continue;
      }
      if (p.magnet || d < mag) {
        p.magnet = true;
        p.mspeed = (p.mspeed || 120) + 1100 * dt;
        p.x += dx / (d || 1) * p.mspeed * dt;
        p.y += dy / (d || 1) * p.mspeed * dt;
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= Math.max(0, 1 - 6 * dt); p.vy *= Math.max(0, 1 - 6 * dt);
      }
      if (d < 16) {
        p.dead = true;
        if (p.kind === 'gem') { this.gemCount--; this.addXp(p.value); Sound.play('gem'); }
        else if (p.kind === 'coin') { this.addGold(p.value); Sound.play('coin'); }
      }
    }
    this.pickups = this.pickups.filter(p => !p.dead);
  }

  // ---------------------------------------------------------------
  //  Salas secretas y portal
  // ---------------------------------------------------------------
  updateRooms(dt) {
    const P = this.player;
    for (const room of this.world.rooms) {
      if (room.state !== 'hidden') room.roofAlpha = Math.max(0, room.roofAlpha - dt * 2);
      if (room.kind === 'challenge' && room.state === 'open' && pointInRect(P.x, P.y, room.inner)) {
        room.state = 'active';
        const cx = room.inner.x + room.inner.w / 2, cy = room.inner.y + room.inner.h / 2;
        const type = pickEnemyType(this);
        spawnEnemy(this, type, cx, cy - 30, { elite: true, roomElite: room, noChest: true });
        for (let i = 0; i < 6; i++) {
          spawnEnemy(this, pickEnemyType(this), room.inner.x + 20 + Math.random() * (room.inner.w - 40),
            room.inner.y + 20 + Math.random() * (room.inner.h - 40));
        }
        this.showBanner(t('challenge'), 2.5);
        Sound.play('alarm');
      }
    }
  }

  updatePortal(dt) {
    if (!this.portal) return;
    this.portal.t += dt;
    const P = this.player;
    if (this.portal.t > 1 && Math.hypot(P.x - this.portal.x, P.y - this.portal.y) < 34) this.nextZone();
  }

  // ---------------------------------------------------------------
  //  Proyectiles, áreas, disparos enemigos y avisos de jefes
  // ---------------------------------------------------------------
  addProjectile(p) { p.hit = new Set(); p.knock = p.knock || 0; this.projectiles.push(p); }

  explode(p) {
    this.damageArea(p.x, p.y, p.explode.r, p.explode.dmg, { quiet: true });
    this.addFx({ kind: 'boom', x: p.x, y: p.y, r: p.explode.r, color: p.color, max: 0.3 });
    Sound.play('boom');
    if (p.burn) this.areas.push({ kind: 'fire', x: p.x, y: p.y, r: p.burn.r, dmg: p.burn.dmg, tick: 0.3, tickT: 0.3, life: p.burn.life, max: p.burn.life, color: p.color });
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.homing) {
        if (!p.target || p.target.dead) p.target = this.nearestEnemy(p.x, p.y, 450);
        let a = Math.atan2(p.vy, p.vx);
        if (p.target) {
          const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
          const d = angDiff(a, want);
          a += Math.max(-p.homing * dt, Math.min(p.homing * dt, d));
        }
        const sp = Math.min(p.speed, Math.hypot(p.vx, p.vy) + 500 * dt);
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      }
      if (p.gravity) p.vy += p.gravity * dt;
      const prevX = p.x, prevY = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.spin) p.angle += p.spin * dt;
      else if (p.kind !== 'wave') p.angle = Math.atan2(p.vy, p.vx);

      // los muros detienen los proyectiles (y el agrietado recibe el golpe)
      if (wallAt(this.world, p.x, p.y)) {
        this.hitWalls(p.x, p.y, p.r);
        p.x = prevX; p.y = prevY; // la explosión ocurre por fuera del muro
        if (p.explode) this.explode(p);
        else this.burst(p.x, p.y, '#cfc6dd', 3, 60);
        p.dead = true;
        continue;
      }

      this.queryEnemies(p.x, p.y, p.r, e => {
        if (p.dead || p.hit.has(e.id)) return;
        p.hit.add(e.id);
        if (p.explode) { this.explode(p); p.dead = true; return; }
        this.damageEnemy(e, p.dmg, { knock: p.knock, fromX: p.x - p.vx * 0.05, fromY: p.y - p.vy * 0.05 });
        if (p.pierce-- <= 0) p.dead = true;
      });
      if (!p.dead && p.life <= 0) {
        if (p.explode) this.explode(p);
        p.dead = true;
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  updateAreas(dt) {
    for (const a of this.areas) {
      if (a.kind === 'shock') {
        if (a.delay > 0) { a.delay -= dt; a.x = this.player.x; a.y = this.player.y; continue; }
        a.r += a.speed * dt;
        this.queryEnemies(a.x, a.y, a.r, e => {
          if (a.hit.has(e.id) || segmentBlocked(this.world, a.x, a.y, e.x, e.y)) return;
          a.hit.add(e.id);
          this.damageEnemy(e, a.dmg, { knock: 140, fromX: a.x, fromY: a.y, freeze: a.stun ? 0.7 : 0, quiet: true });
        });
        this.hitWalls(a.x, a.y, a.r);
        if (a.r >= a.maxR) a.dead = true;
        continue;
      }
      a.life -= dt;
      a.tickT -= dt;
      if (a.tickT <= 0) {
        a.tickT += a.tick;
        this.damageArea(a.x, a.y, a.r, a.dmg, { slow: a.kind === 'holy' ? 0.4 : 0, quiet: true });
      }
      if (a.life <= 0) a.dead = true;
    }
    this.areas = this.areas.filter(a => !a.dead);
  }

  updateShots(dt) {
    const P = this.player;
    for (const s of this.shots) {
      s.life -= dt;
      if (s.homing) {
        let a = Math.atan2(s.vy, s.vx);
        const d = angDiff(a, Math.atan2(P.y - s.y, P.x - s.x));
        a += Math.max(-s.homing * dt, Math.min(s.homing * dt, d));
        s.vx = Math.cos(a) * s.speed; s.vy = Math.sin(a) * s.speed;
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (wallAt(this.world, s.x, s.y)) { s.dead = true; continue; } // los muros también te protegen
      if (Math.hypot(P.x - s.x, P.y - s.y) < s.r + P.r * 0.8) {
        this.hurtPlayer(s.dmg);
        if (s.slow) P.slowT = Math.max(P.slowT, s.slow);
        s.dead = true;
      }
      if (s.life <= 0) s.dead = true;
    }
    this.shots = this.shots.filter(s => !s.dead);
  }

  playerInTelegraph(tg) {
    const P = this.player;
    const dx = P.x - tg.x, dy = P.y - tg.y;
    if (tg.type === 'circle') return Math.hypot(dx, dy) < tg.r + P.r * 0.5;
    if (tg.type === 'cone') return Math.hypot(dx, dy) < tg.r && Math.abs(angDiff(tg.ang, Math.atan2(dy, dx))) < tg.arc / 2;
    if (tg.type === 'line') {
      const along = dx * Math.cos(tg.ang) + dy * Math.sin(tg.ang);
      const perp = Math.abs(-dx * Math.sin(tg.ang) + dy * Math.cos(tg.ang));
      return along > 0 && along < tg.len && perp < tg.w / 2 + P.r * 0.5;
    }
    return false;
  }

  updateTelegraphs(dt) {
    for (const tg of this.telegraphs) {
      tg.t -= dt;
      if (tg.t > 0) continue;
      tg.dead = true;
      if (tg.dmg > 0 && this.playerInTelegraph(tg)) this.hurtPlayer(tg.dmg);
      if (tg.dmg > 0 && tg.type === 'circle') {
        this.addFx({ kind: 'boom', x: tg.x, y: tg.y, r: tg.r, color: tg.meteor ? '#ff7a3a' : '#c9b8e8', max: 0.3 });
        this.burst(tg.x, tg.y, tg.meteor ? '#ff7a3a' : '#a89f86', 10, 150);
        this.shakeScreen(3);
        Sound.play('slam');
      }
      if (tg.onEnd) tg.onEnd();
    }
    this.telegraphs = this.telegraphs.filter(tg => !tg.dead);
  }

  // ---------------------------------------------------------------
  //  Efectos visuales
  // ---------------------------------------------------------------
  addFx(f) { f.t = 0; this.fx.push(f); }

  burst(x, y, color, n, speed = 120) {
    const count = Math.round(n * fxLevel());
    if (this.particles.length > 500) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      const life = 0.3 + Math.random() * 0.4;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: Math.random() < 0.3 ? 4 : 2 });
    }
  }

  addNumber(x, y, value, color, big) {
    if (!Settings.dmgNumbers && typeof value === 'number' && color !== '#ff5a5a') return;
    if (this.numbers.length > 70) this.numbers.shift();
    const text = typeof value === 'number' ? String(Math.max(1, Math.round(value))) : value;
    this.numbers.push({ x: x + (Math.random() - 0.5) * 10, y, text, color, t: 0, max: 0.7, big });
  }

  showBanner(text, dur, sub) { this.banner = { text, sub, t: 0, max: dur || 2.5 }; }

  shakeScreen(m) { if (Settings.shake) this.shake = Math.max(this.shake, m); }

  updateEffects(dt) {
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter(f => f.t < f.max);
    for (const p of this.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.max(0, 1 - 4 * dt); p.vy *= Math.max(0, 1 - 4 * dt);
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const n of this.numbers) { n.t += dt; n.y -= 30 * dt; }
    this.numbers = this.numbers.filter(n => n.t < n.max);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.max) this.banner = null; }
    this.shake = Math.max(0, this.shake - dt * 25);
    this.fogT = Math.max(0, this.fogT - dt);
  }
}
