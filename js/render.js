// =============================================================
//  DIBUJO: todo lo que se ve en pantalla durante la partida
// =============================================================

// Orden de los pasos al caminar: izquierda, quieto, derecha, quieto
const STEP_CYCLE = [1, 0, 2, 0];

const Render = {
  ctx: null, patterns: {},

  init(canvas) {
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  },

  pattern(zone) {
    if (!this.patterns[zone.id]) this.patterns[zone.id] = this.ctx.createPattern(Sprites.ground(zone), 'repeat');
    return this.patterns[zone.id];
  },

  // ---------------------------------------------------------------
  //  Fotograma completo de la partida
  // ---------------------------------------------------------------
  draw(run) {
    const ctx = this.ctx, cam = run.cam;
    ctx.imageSmoothingEnabled = false;
    let sx = 0, sy = 0;
    if (run.shake > 0) { sx = (Math.random() - 0.5) * run.shake; sy = (Math.random() - 0.5) * run.shake; }
    ctx.save();
    ctx.translate(-Math.round(cam.x + sx), -Math.round(cam.y + sy));

    // suelo
    ctx.fillStyle = this.pattern(run.zone);
    ctx.fillRect(cam.x - 20, cam.y - 20, VIEW_W + 40, VIEW_H + 40);

    const inView = (x, y, m) => x > cam.x - m && x < cam.x + VIEW_W + m && y > cam.y - m && y < cam.y + VIEW_H + m;

    // suelo de las salas (más oscuro)
    for (const room of run.world.rooms) {
      if (!inView(room.x + room.w / 2, room.y + room.h / 2, room.w)) continue;
      ctx.fillStyle = 'rgba(10,8,16,0.25)';
      ctx.fillRect(room.inner.x, room.inner.y, room.inner.w, room.inner.h);
    }

    this.drawAreas(run);
    this.drawWeaponAuras(run);
    this.drawTelegraphs(run);
    if (run.portal) this.drawPortal(run.portal, run.time);
    this.drawPickups(run, inView);

    // muros (antes que los personajes: son bloques a ras de suelo)
    for (const room of run.world.rooms) {
      if (!inView(room.x + room.w / 2, room.y + room.h / 2, room.w)) continue;
      for (const tl of room.tiles) {
        if (tl.broken) continue;
        const img = Sprites.wall(run.zone, tl.cracked && room.state === 'hidden' ? 'cracked' : 'wall');
        ctx.drawImage(img, tl.x, tl.y);
        if (tl.flash > 0) { tl.flash -= 1 / 60; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(tl.x, tl.y, tl.w, tl.h); }
      }
    }

    // muro que rodea el mapa (solo se dibujan los bloques visibles)
    const wallImg = Sprites.wall(run.zone, 'wall'), W = run.world.w, H = run.world.h;
    const tx0 = Math.max(0, Math.floor(cam.x / TILE)), tx1 = Math.min(W / TILE - 1, Math.floor((cam.x + VIEW_W) / TILE));
    const ty0 = Math.max(0, Math.floor(cam.y / TILE)), ty1 = Math.min(H / TILE - 1, Math.floor((cam.y + VIEW_H) / TILE));
    for (let tx = tx0; tx <= tx1; tx++) {
      if (ty0 === 0) ctx.drawImage(wallImg, tx * TILE, 0);
      if (ty1 === H / TILE - 1) ctx.drawImage(wallImg, tx * TILE, H - TILE);
    }
    for (let ty = ty0; ty <= ty1; ty++) {
      if (tx0 === 0) ctx.drawImage(wallImg, 0, ty * TILE);
      if (tx1 === W / TILE - 1) ctx.drawImage(wallImg, W - TILE, ty * TILE);
    }

    // personajes y obstáculos ordenados por altura (los de abajo tapan a los de arriba)
    const list = [];
    for (const o of run.world.obstacles) if (inView(o.x, o.y, 80)) list.push({ y: o.y, o });
    for (const e of run.enemies) if (!e.dead && inView(e.x, e.y, 120)) list.push({ y: e.y, e });
    list.push({ y: run.player.y, p: true });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.o) this.drawObstacle(it.o);
      else if (it.e) this.drawEnemy(it.e, run);
      else if (!run.over) this.drawPlayer(run);
    }

    // techos de las salas ocultas
    for (const room of run.world.rooms) {
      if (room.roofAlpha <= 0 || !inView(room.x + room.w / 2, room.y + room.h / 2, room.w)) continue;
      ctx.globalAlpha = room.roofAlpha;
      const roof = Sprites.wall(run.zone, 'roof');
      for (let y = room.inner.y; y < room.inner.y + room.inner.h; y += TILE)
        for (let x = room.inner.x; x < room.inner.x + room.inner.w; x += TILE) ctx.drawImage(roof, x, y);
      ctx.globalAlpha = 1;
    }

    this.drawWeaponOrbs(run);
    this.drawProjectiles(run);
    this.drawShots(run);
    this.drawFx(run);

    for (const p of run.particles) {
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
    this.drawNumbers(run);
    ctx.restore();

    this.drawFog(run);
    this.drawHUD(run);
    if (run.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${run.fade})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  },

  shadow(x, y, w) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, w, w * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  drawObstacle(o) {
    const img = Sprites.get(o.sprite, o.pal, o.key);
    const h = img.height * 2;
    this.shadow(o.x, o.y + 4, o.r * 1.1);
    drawSprite(this.ctx, img, o.x, o.y + 6 - h / 2, 2, o.flip);
  },

  drawPlayer(run) {
    const ctx = this.ctx, P = run.player, ch = run.char;
    const tier = playerTier(run.level);
    // pasos: alterna pierna izquierda / quieto / derecha / quieto según lo que camina
    const step = P.moving ? STEP_CYCLE[Math.floor(P.walkT / 11) % 4] : 0;
    const img = Sprites.frame(ch.sprite, ch.tiers[tier], ch.id + tier, step);
    const bob = step ? 1 : 0; // el cuerpo sube 1 píxel al levantar una pierna
    const fx = fxLevel();
    // aura que crece con el nivel del héroe
    if (tier >= 2) {
      const col = tier === 3 ? '255,215,90' : '127,178,255';
      const pulse = 1 + Math.sin(run.time * 3) * 0.08;
      ctx.fillStyle = `rgba(${col},${0.12 * fx})`;
      ctx.beginPath(); ctx.arc(P.x, P.y, 24 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(${col},${0.35 * fx})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(P.x, P.y, 24 * pulse, 0, Math.PI * 2); ctx.stroke();
    }
    this.shadow(P.x, P.y + 9, 10);
    if (P.invuln > 0 && Math.floor(run.time * 20) % 2 === 0) ctx.globalAlpha = 0.5;
    const y = P.y - 8 - bob;
    drawSprite(ctx, img, P.x, y, 2, P.faceX < 0);
    if (P.flashT > 0) {
      ctx.globalAlpha = 0.7;
      drawSprite(ctx, Sprites.solid(ch.sprite, ch.tiers[tier], ch.id + tier, '#ffffff', step), P.x, y, 2, P.faceX < 0);
    }
    ctx.globalAlpha = 1;
    if (tier === 3) drawSprite(ctx, Sprites.get('crownSmall'), P.x, y - 18, 2, false);
  },

  drawEnemy(e, run) {
    const ctx = this.ctx;
    const s = e.scale;
    // animación según el tipo: los que caminan dan pasos, los slimes saltan
    // aplastándose y los voladores flotan (ellos sí vuelan)
    let step = 0, sx = 1, sy = 1, lift = 0;
    const anim = e.fly ? 'fly' : e.sprite === 'slime' ? 'hop' : 'walk';
    const stride = 4 * s;
    if (anim === 'walk') {
      step = STEP_CYCLE[Math.floor(e.animT / stride) % 4];
      if (step) lift = s * 0.5;
    } else if (anim === 'hop') {
      const ph = (e.animT / (stride * 4)) * Math.PI * 2;
      const sq = Math.sin(ph);
      sx = 1 + 0.1 * sq; sy = 1 - 0.1 * sq;
      lift = Math.max(0, -sq) * s * 1.5;
    } else {
      lift = 2 + Math.sin(run.time * 5 + e.id) * 2;
      if (e.sprite === 'bat' || e.sprite === 'gargoyle') sy = 1 + 0.15 * Math.sin(run.time * 22 + e.id); // aleteo
    }
    const img = Sprites.frame(e.sprite, e.pal, e.key, step);
    const h = img.height * s;
    let x = e.x, y = e.y - e.z - h * 0.2 - lift;
    if (e.state === 'wind') x += Math.sin(run.time * 60) * 2;
    this.shadow(e.x, e.y + h * 0.3, Math.max(8, img.width * s * 0.35));
    ctx.globalAlpha = e.alpha;
    const solid = color => Sprites.solid(e.sprite, e.pal, e.key, color, step);
    if (e.elite) {
      const gold = solid('#ffd75a');
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) drawSprite(ctx, gold, x + ox, y + oy, s, e.flip, sx, sy);
    }
    drawSprite(ctx, img, x, y, s, e.flip, sx, sy);
    if (e.shadow) { ctx.globalAlpha = e.alpha * 0.35; drawSprite(ctx, solid('#7a3fd0'), x, y, s, e.flip, sx, sy); }
    if (e.freezeT > 0) { ctx.globalAlpha = 0.5; drawSprite(ctx, solid('#9fe8ff'), x, y, s, e.flip, sx, sy); }
    if (e.flash > 0) { ctx.globalAlpha = 0.85; drawSprite(ctx, solid('#ffffff'), x, y, s, e.flip, sx, sy); }
    ctx.globalAlpha = 1;
    if (e.boss && e.bossDef.crown) drawSprite(ctx, Sprites.get('crown'), x, y - h * 0.5 - 4, Math.max(2, s * 0.5), false);
    if (e.state === 'wind') {
      ctx.fillStyle = '#ff5a5a';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', e.x, y - h / 2 - 4);
    }
  },

  drawPickups(run, inView) {
    const ctx = this.ctx;
    for (const p of run.pickups) {
      if (!inView(p.x, p.y, 30)) continue;
      const bob = Math.sin(p.t * 4) * 1.5;
      if (p.kind === 'gem') {
        const v = p.value;
        const variant = v < 3 ? null : v < 10 ? { c: '#9dff8a', b: '#3f9a3a' } : { c: '#ff8a9a', b: '#c0304a' };
        const img = Sprites.get('gem', variant, v < 3 ? 'b' : v < 10 ? 'g' : 'r');
        drawSprite(ctx, img, p.x, p.y + bob, 2, false);
      } else if (p.kind === 'coin') {
        drawSprite(ctx, Sprites.get('coin'), p.x, p.y + bob, 2, false);
      } else if (p.kind === 'food') {
        const h = HEALS[p.size] || HEALS.medium;
        if (p.size === 'large' && fxLevel() > 0.5) {
          ctx.fillStyle = `rgba(125,255,154,${0.12 + Math.sin(p.t * 3) * 0.05})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.fill();
        }
        this.shadow(p.x, p.y + 9, 7);
        drawSprite(ctx, Sprites.get(h.sprite), p.x, p.y + bob, 2, false);
      } else if (p.kind === 'chest') {
        if (!p.chestLocked && fxLevel() > 0.5) {
          ctx.fillStyle = `rgba(255,215,90,${0.12 + Math.sin(p.t * 3) * 0.06})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); ctx.fill();
        }
        this.shadow(p.x, p.y + 10, 14);
        drawSprite(ctx, Sprites.get('chest'), p.x, p.y, 2.4, false);
        if (p.chestLocked) {
          ctx.strokeStyle = '#8d939c'; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p.x - 16, p.y - 12); ctx.lineTo(p.x + 16, p.y + 12);
          ctx.moveTo(p.x + 16, p.y - 12); ctx.lineTo(p.x - 16, p.y + 12);
          ctx.stroke();
        }
      }
    }
  },

  drawPortal(portal, time) {
    const ctx = this.ctx, k = Math.min(1, portal.t);
    ctx.save();
    ctx.translate(portal.x, portal.y);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ['#b46cff', '#8fe6f2', '#f4f1ea'][i];
      ctx.lineWidth = 4 - i;
      ctx.beginPath();
      ctx.ellipse(0, 0, (30 - i * 7) * k, (40 - i * 9) * k, time * (1 + i * 0.7), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(180,108,255,${0.25 * k})`;
    ctx.beginPath(); ctx.ellipse(0, 0, 26 * k, 36 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  drawAreas(run) {
    const ctx = this.ctx;
    for (const a of run.areas) {
      if (a.kind === 'shock') {
        if (a.delay > 0) continue;
        const k = a.r / a.maxR;
        ctx.strokeStyle = a.color; ctx.globalAlpha = (1 - k) * 0.9;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(a.x, a.y, a.r, a.r * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      const fade = Math.min(1, a.life / 0.3, (a.max - a.life) / 0.15 + 0.2);
      if (a.kind === 'holy' || a.kind === 'fire') {
        const col = a.kind === 'fire' ? '#ff7a3a' : a.color;
        ctx.globalAlpha = 0.28 * fade;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(a.x, a.y, a.r, a.r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.6 * fade;
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.stroke();
        // destellos
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 4; i++) {
          const ang = run.time * 2 + i * 1.7, rr = a.r * (0.3 + 0.5 * ((i * 37) % 10) / 10);
          ctx.globalAlpha = 0.5 * fade * (0.5 + 0.5 * Math.sin(run.time * 6 + i));
          ctx.fillRect(Math.round(a.x + Math.cos(ang) * rr), Math.round(a.y + Math.sin(ang) * rr * 0.75), 2, 2);
        }
      } else if (a.kind === 'rain') {
        ctx.globalAlpha = 0.3 * fade;
        ctx.strokeStyle = a.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(a.x, a.y, a.r, a.r * 0.75, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.9 * fade;
        for (let i = 0; i < 9; i++) {
          const seed = i * 97.3;
          const px = a.x + Math.cos(seed) * a.r * ((i * 31 % 10) / 10) * 0.9;
          const ph = ((run.time * 3 + i * 0.37) % 1);
          const py = a.y + Math.sin(seed) * a.r * 0.6 * ((i * 17 % 10) / 10) - 40 + ph * 40;
          ctx.strokeStyle = '#8a5a3a';
          ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.lineTo(px, py); ctx.stroke();
          ctx.fillStyle = a.color; ctx.fillRect(px - 1, py, 3, 3);
        }
      }
      ctx.globalAlpha = 1;
    }
  },

  drawWeaponAuras(run) {
    const ctx = this.ctx, P = run.player;
    const w = run.getWeapon('aura');
    if (!w || !w.radius) return;
    const col = wColor(w), pulse = 1 + Math.sin(run.time * 4) * 0.03;
    ctx.globalAlpha = 0.1 + 0.06 * fxLevel();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(P.x, P.y, w.radius * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  },

  drawWeaponOrbs(run) {
    const ctx = this.ctx;
    const w = run.getWeapon('orbs');
    if (!w || !w.orbPos) return;
    const col = wColor(w);
    for (const o of w.orbPos) {
      if (fxLevel() > 0.5) {
        ctx.globalAlpha = 0.25; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(o.x, o.y, w.orbSize * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(o.x, o.y, w.orbSize, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(o.x - w.orbSize * 0.3, o.y - w.orbSize * 0.3, w.orbSize * 0.35, 0, Math.PI * 2); ctx.fill();
    }
  },

  drawProjectiles(run) {
    const ctx = this.ctx, glow = fxLevel() > 0.5;
    for (const p of run.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (glow && (p.kind === 'fireball' || p.kind === 'missile' || p.kind === 'wave')) {
        ctx.globalAlpha = 0.25; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, 0, p.r * 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.rotate(p.angle || 0);
      switch (p.kind) {
        case 'dagger':
          ctx.fillStyle = p.color; ctx.fillRect(-4, -2, 12, 4);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -1, 8, 1);
          ctx.fillStyle = '#8a5a3a'; ctx.fillRect(-9, -2, 5, 4);
          break;
        case 'arrow':
          ctx.fillStyle = '#8a5a3a'; ctx.fillRect(-12, -1, 16, 2);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(2, -4); ctx.lineTo(2, 4); ctx.fill();
          ctx.fillRect(-14, -3, 4, 2); ctx.fillRect(-14, 1, 4, 2);
          break;
        case 'fireball':
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.6;
          ctx.beginPath(); ctx.arc(-p.r * 0.9, 0, p.r * 0.7, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff6c8';
          ctx.beginPath(); ctx.arc(p.r * 0.2, 0, p.r * 0.45, 0, Math.PI * 2); ctx.fill();
          break;
        case 'missile':
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(0, -4); ctx.lineTo(-6, 0); ctx.lineTo(0, 4); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -1, 3, 2);
          break;
        case 'axe': {
          const s = p.size || 1;
          ctx.scale(s, s);
          ctx.fillStyle = '#8a5a3a'; ctx.fillRect(-1.5, -10, 3, 20);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.moveTo(1, -10); ctx.quadraticCurveTo(12, -6, 9, 2); ctx.lineTo(1, -2); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(7, -5, 2, 4);
          break;
        }
        case 'wave':
          ctx.strokeStyle = p.color; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(-6, 0, p.r, -1, 1); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(-6, 0, p.r, -0.7, 0.7); ctx.stroke();
          break;
      }
      ctx.restore();
    }
  },

  drawShots(run) {
    const ctx = this.ctx;
    for (const s of run.shots) {
      ctx.fillStyle = '#1a1423';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(Math.round(s.x - 1), Math.round(s.y - 1), 2, 2);
    }
  },

  drawTelegraphs(run) {
    const ctx = this.ctx;
    for (const tg of run.telegraphs) {
      const k = 1 - tg.t / tg.total; // 0 -> 1 mientras se llena
      const col = tg.color || '255,60,60';
      ctx.save();
      ctx.translate(tg.x, tg.y);
      ctx.fillStyle = `rgba(${col},0.16)`;
      ctx.strokeStyle = `rgba(${col},0.7)`;
      ctx.lineWidth = 2;
      if (tg.type === 'circle') {
        ctx.beginPath(); ctx.ellipse(0, 0, tg.r, tg.r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(${col},0.3)`;
        ctx.beginPath(); ctx.ellipse(0, 0, tg.r * k, tg.r * 0.8 * k, 0, 0, Math.PI * 2); ctx.fill();
      } else if (tg.type === 'line') {
        ctx.rotate(tg.ang);
        ctx.fillRect(0, -tg.w / 2, tg.len, tg.w); ctx.strokeRect(0, -tg.w / 2, tg.len, tg.w);
        ctx.fillStyle = `rgba(${col},0.3)`;
        ctx.fillRect(0, -tg.w / 2, tg.len * k, tg.w);
      } else if (tg.type === 'cone') {
        ctx.rotate(tg.ang);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, tg.r, -tg.arc / 2, tg.arc / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(${col},0.3)`;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, tg.r * k, -tg.arc / 2, tg.arc / 2); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  },

  drawFx(run) {
    const ctx = this.ctx, P = run.player;
    for (const f of run.fx) {
      const k = f.t / f.max;
      const x = f.follow ? P.x : f.x, y = f.follow ? P.y : f.y;
      ctx.save();
      if (f.kind === 'slash') {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = f.color; ctx.lineWidth = 12 * (1 - k * 0.6);
        const full = f.arc >= Math.PI * 2 - 0.01;
        const sweep = full ? Math.PI * 2 : f.arc;
        const start = full ? f.ang + k * 4 : f.ang - f.arc / 2;
        ctx.beginPath(); ctx.arc(x, y, f.r * (0.75 + 0.25 * k), start, start + sweep * Math.min(1, k * 3)); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, f.r * (0.75 + 0.25 * k), start, start + sweep * Math.min(1, k * 3)); ctx.stroke();
      } else if (f.kind === 'nova') {
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.strokeStyle = f.color; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(x, y, f.r * (0.3 + 0.7 * k), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = (1 - k) * 0.15;
        ctx.fillStyle = f.color; ctx.fill();
      } else if (f.kind === 'boom') {
        ctx.globalAlpha = (1 - k) * 0.5;
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(x, y, f.r * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 2; ctx.stroke();
      } else if (f.kind === 'bolt') {
        const rnd = seededRandom(Math.floor(f.seed));
        ctx.globalAlpha = 1 - k;
        const pts = [[x + (rnd() - 0.5) * 40, y - 320]];
        for (let i = 1; i < 8; i++) pts.push([x + (rnd() - 0.5) * 30, y - 320 + i * 40]);
        pts.push([x, y]);
        for (const [lw, col] of [[5, f.color], [2, '#ffffff']]) {
          ctx.strokeStyle = col; ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (const p of pts) ctx.lineTo(p[0], p[1]);
          ctx.stroke();
        }
        ctx.globalAlpha = (1 - k) * 0.4;
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(x, y, f.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  },

  drawNumbers(run) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1a1423';
    for (const n of run.numbers) {
      ctx.globalAlpha = Math.min(1, (1 - n.t / n.max) * 2);
      ctx.font = n.big ? 'bold 17px monospace' : 'bold 12px monospace';
      ctx.strokeText(n.text, n.x, n.y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.globalAlpha = 1;
  },

  drawFog(run) {
    const ctx = this.ctx, P = run.player;
    let k = 0;
    if (run.fogT > 0) k = Math.min(1, run.fogT / 2, (25 - run.fogT) / 2);
    const lowHp = run.player.hp / run.stats.maxHp < 0.3 && !run.over;
    if (k > 0) {
      const px = P.x - run.cam.x, py = P.y - run.cam.y;
      const g = ctx.createRadialGradient(px, py, 120, px, py, 320);
      g.addColorStop(0, `rgba(${run.zone.fog},0)`);
      g.addColorStop(1, `rgba(${run.zone.fog},${0.9 * k})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (lowHp) {
      const a = 0.18 + Math.sin(run.time * 5) * 0.06;
      const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 220, VIEW_W / 2, VIEW_H / 2, 560);
      g.addColorStop(0, 'rgba(160,0,0,0)');
      g.addColorStop(1, `rgba(160,0,0,${a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  },

  // ---------------------------------------------------------------
  //  Interfaz durante la partida
  // ---------------------------------------------------------------
  drawHUD(run) {
    const ctx = this.ctx, P = run.player, s = run.stats;
    ctx.textAlign = 'left';

    // barra de experiencia
    ctx.fillStyle = '#140f1f'; ctx.fillRect(0, 0, VIEW_W, 9);
    ctx.fillStyle = '#4f9cff'; ctx.fillRect(0, 0, VIEW_W * Math.min(1, run.xp / run.xpNext), 7);
    ctx.fillStyle = '#9fd0ff'; ctx.fillRect(0, 0, VIEW_W * Math.min(1, run.xp / run.xpNext), 2);

    // vida
    const hpK = Math.max(0, P.hp / s.maxHp);
    ctx.fillStyle = '#1a1423'; ctx.fillRect(10, 16, 204, 18);
    ctx.fillStyle = '#4a1420'; ctx.fillRect(12, 18, 200, 14);
    ctx.fillStyle = '#d1403f'; ctx.fillRect(12, 18, 200 * hpK, 14);
    ctx.fillStyle = '#ff8a7a'; ctx.fillRect(12, 18, 200 * hpK, 3);
    this.text(`${Math.ceil(Math.max(0, P.hp))} / ${s.maxHp}`, 112, 30, 12, '#ffffff', 'center');

    // armas y pasivas
    let x = 12;
    for (const w of run.weapons) { this.slot(UPGRADES[w.id].icon, x, 40, wColor(w), w.evo ? '★' : w.level); x += 30; }
    x = 12;
    for (const id in run.passives) { this.slot(UPGRADES[id].icon, x, 70, '#6c5a8e', run.passives[id]); x += 30; }
    x = 12;
    for (const id of run.relics) { this.slot(RELICS[id].icon, x, 100, '#ffd75a', ''); x += 30; }

    // tiempo y zona
    const mm = Math.floor(run.time / 60), ss = Math.floor(run.time % 60);
    this.text(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, VIEW_W / 2, 36, 24, '#ffffff', 'center');
    this.text(tr(run.zone.name), VIEW_W / 2, 54, 12, '#c9c0d8', 'center');
    if (!run.zone.endless && !run.director.bossSpawned) {
      const left = Math.max(0, ZONE_BOSS_TIME - run.zoneTime);
      ctx.fillStyle = '#2a2140'; ctx.fillRect(VIEW_W / 2 - 60, 60, 120, 4);
      ctx.fillStyle = '#d1403f'; ctx.fillRect(VIEW_W / 2 - 60, 60, 120 * (1 - left / ZONE_BOSS_TIME), 4);
    }

    // nivel, bajas y oro
    this.text(`${t('lv')} ${run.level}`, VIEW_W - 12, 30, 18, '#9fd0ff', 'right');
    this.text(`${t('kills')}: ${run.kills}`, VIEW_W - 12, 50, 13, '#ece6d6', 'right');
    drawSprite(ctx, Sprites.get('coin'), VIEW_W - 70, 64, 2, false);
    this.text(`${run.goldRun}`, VIEW_W - 12, 69, 13, '#f3d77a', 'right');

    // barra del jefe
    const boss = run.director.boss;
    if (boss && !boss.dead) {
      const bw = 460, bx = VIEW_W / 2 - bw / 2, by = VIEW_H - 34;
      this.text(tr(boss.bossDef.name), VIEW_W / 2, by - 6, 15, '#ffb0b0', 'center');
      ctx.fillStyle = '#1a1423'; ctx.fillRect(bx - 2, by - 2, bw + 4, 16);
      ctx.fillStyle = '#3a1020'; ctx.fillRect(bx, by, bw, 12);
      ctx.fillStyle = boss.phase2 ? '#ff4a6a' : '#c22a4a'; ctx.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), 12);
    }

    this.drawIndicators(run);

    // aviso grande en el centro
    if (run.banner) {
      const b = run.banner;
      const a = Math.min(1, b.t / 0.3, (b.max - b.t) / 0.5);
      ctx.globalAlpha = Math.max(0, a);
      this.text(b.text, VIEW_W / 2, 140, 28, '#f3d77a', 'center', true);
      if (b.sub) this.text(b.sub, VIEW_W / 2, 166, 16, '#ece6d6', 'center', true);
      ctx.globalAlpha = 1;
    }
  },

  // Flechas en el borde de la pantalla hacia el portal y los cofres
  drawIndicators(run) {
    const ctx = this.ctx, cam = run.cam;
    const targets = [];
    if (run.portal) targets.push({ x: run.portal.x, y: run.portal.y, color: '#b46cff' });
    for (const p of run.pickups) {
      if (p.kind === 'chest' && !p.chestLocked && !(p.room && p.room.state === 'hidden')) targets.push({ x: p.x, y: p.y, color: '#ffd75a' });
    }
    for (const tg of targets) {
      const sx = tg.x - cam.x, sy = tg.y - cam.y;
      if (sx > 0 && sx < VIEW_W && sy > 0 && sy < VIEW_H) continue;
      const cx = VIEW_W / 2, cy = VIEW_H / 2;
      const a = Math.atan2(sy - cy, sx - cx);
      const ex = Math.max(24, Math.min(VIEW_W - 24, cx + Math.cos(a) * 600));
      const ey = Math.max(24, Math.min(VIEW_H - 24, cy + Math.sin(a) * 600));
      ctx.save();
      ctx.translate(ex, ey); ctx.rotate(a);
      ctx.fillStyle = tg.color;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.fill();
      ctx.restore();
    }
  },

  slot(icon, x, y, color, label) {
    const ctx = this.ctx;
    ctx.fillStyle = '#1a1428'; ctx.fillRect(x, y, 26, 26);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, 24, 24);
    ctx.drawImage(Sprites.get(icon), x + 1, y + 1, 24, 24);
    if (label !== '') this.text(String(label), x + 25, y + 26, 10, '#ffffff', 'right');
  },

  text(str, x, y, size, color, align = 'left', shadow) {
    const ctx = this.ctx;
    ctx.font = `bold ${size}px 'Trebuchet MS', sans-serif`;
    ctx.textAlign = align;
    ctx.lineWidth = shadow ? 5 : 3;
    ctx.strokeStyle = '#120d1a';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  },

  // ---------------------------------------------------------------
  //  Fondo animado del menú
  // ---------------------------------------------------------------
  menuActors: null,
  drawMenu(time) {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    const zone = ZONES[0];
    ctx.save();
    ctx.translate(-Math.round(time * 20) % 96, 0);
    ctx.fillStyle = this.pattern(zone);
    ctx.fillRect(0, 0, VIEW_W + 96, VIEW_H);
    ctx.restore();
    if (!this.menuActors) {
      this.menuActors = [];
      const kinds = ['slime', 'bat', 'skeleton', 'ghost', 'spider', 'imp'];
      for (let i = 0; i < 14; i++) this.menuActors.push({ s: kinds[i % kinds.length], x: Math.random() * VIEW_W, y: 40 + Math.random() * (VIEW_H - 80), v: 20 + Math.random() * 30 });
      for (let i = 0; i < 10; i++) this.menuActors.push({ s: 'tree', x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, v: 20, tree: true });
      this.menuActors.sort((a, b) => a.y - b.y);
    }
    for (const a of this.menuActors) {
      const x = ((a.x - time * a.v) % (VIEW_W + 80) + VIEW_W + 80) % (VIEW_W + 80) - 40;
      if (a.tree) { drawSprite(ctx, Sprites.get(a.s, null, ''), x, a.y, 2, false); continue; }
      const flies = a.s === 'bat' || a.s === 'ghost';
      const step = flies || a.s === 'slime' ? 0 : STEP_CYCLE[Math.floor((time * a.v + a.y) / 8) % 4];
      const bob = flies ? Math.sin(time * 5 + a.y) * 2 : a.s === 'slime' ? -Math.max(0, Math.sin(time * 5 + a.y)) * 3 : (step ? -1 : 0);
      drawSprite(ctx, Sprites.frame(a.s, null, '', step), x, a.y + bob, 2, true);
    }
    ctx.fillStyle = 'rgba(8,6,14,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  },
};
