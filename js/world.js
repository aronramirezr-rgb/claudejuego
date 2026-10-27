// =============================================================
//  MUNDO: mapa de cada zona, obstáculos y salas secretas
// =============================================================

const TILE = 40;          // tamaño de un bloque de muro (en píxeles del mundo)
const MAP_SIZE = 3200;    // el mapa de cada zona mide 3200 x 3200
const ROOMS_PER_ZONE = 4; // salas ocultas por zona
const OBSTACLES_PER_ZONE = 85;
const MAP_BORDER = TILE;  // muro que rodea el mapa: bloquea el paso, no hace daño

function createWorld(zone) {
  const rnd = Math.random;
  const world = { zone, w: MAP_SIZE, h: MAP_SIZE, obstacles: [], rooms: [] };
  const cx = MAP_SIZE / 2, cy = MAP_SIZE / 2;

  // --- Salas ocultas: la mitad de tesoro, la mitad de desafío ---
  const kinds = ['treasure', 'challenge', 'treasure', 'challenge'];
  for (let i = 0, tries = 0; i < ROOMS_PER_ZONE && tries < 400; tries++) {
    const cols = 7 + Math.floor(rnd() * 3), rows = 5 + Math.floor(rnd() * 3);
    const x = Math.floor((200 + rnd() * (MAP_SIZE - 400 - cols * TILE)) / TILE) * TILE;
    const y = Math.floor((200 + rnd() * (MAP_SIZE - 400 - rows * TILE)) / TILE) * TILE;
    const rect = { x, y, w: cols * TILE, h: rows * TILE };
    const mx = x + rect.w / 2, my = y + rect.h / 2;
    if (Math.hypot(mx - cx, my - cy) < 520) continue;                      // lejos del inicio
    if (world.rooms.some(r => rectsOverlap(rect, r, 260))) continue;       // separadas entre sí
    world.rooms.push(makeRoom(rect, cols, rows, kinds[i], cx, cy));
    i++;
  }

  // --- Obstáculos decorativos (árboles, tumbas, columnas...) ---
  const total = zone.obstacles.reduce((a, o) => a + o[2], 0);
  for (let i = 0, tries = 0; i < OBSTACLES_PER_ZONE && tries < 2000; tries++) {
    const x = 60 + rnd() * (MAP_SIZE - 120), y = 60 + rnd() * (MAP_SIZE - 120);
    if (Math.hypot(x - cx, y - cy) < 240) continue;
    if (world.rooms.some(r => pointInRect(x, y, r, 70))) continue;
    if (world.obstacles.some(o => Math.hypot(o.x - x, o.y - y) < 70)) continue;
    let pick = rnd() * total, def = zone.obstacles[0];
    for (const o of zone.obstacles) { pick -= o[2]; if (pick <= 0) { def = o; break; } }
    const [sprite, pal] = def;
    const r = { tree: 14, bush: 12, tomb: 10, pillar: 13, crystal: 10, barrel: 10 }[sprite] || 12;
    world.obstacles.push({ sprite, pal, key: zone.id + sprite + (pal ? 'p' : ''), x, y, r, flip: rnd() < 0.5 });
    i++;
  }
  return world;
}

function makeRoom(rect, cols, rows, kind, cx, cy) {
  const room = {
    x: rect.x, y: rect.y, w: rect.w, h: rect.h, kind,
    state: 'hidden',                // hidden -> open -> (active -> done)
    roofAlpha: 1,
    inner: { x: rect.x + TILE, y: rect.y + TILE, w: rect.w - TILE * 2, h: rect.h - TILE * 2 },
    tiles: [],
  };
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    if (c === 0 || r === 0 || c === cols - 1 || r === rows - 1) {
      room.tiles.push({ x: rect.x + c * TILE, y: rect.y + r * TILE, w: TILE, h: TILE, c, r, cracked: false, broken: false, hp: 0 });
    }
  }
  // El muro agrietado está en el lado que mira hacia el centro del mapa
  const mx = rect.x + rect.w / 2, my = rect.y + rect.h / 2;
  const dx = cx - mx, dy = cy - my;
  let candidates;
  if (Math.abs(dx) > Math.abs(dy)) candidates = room.tiles.filter(tl => tl.c === (dx > 0 ? cols - 1 : 0) && tl.r > 0 && tl.r < rows - 1);
  else candidates = room.tiles.filter(tl => tl.r === (dy > 0 ? rows - 1 : 0) && tl.c > 0 && tl.c < cols - 1);
  const crack = candidates[Math.floor(candidates.length / 2)];
  crack.cracked = true;
  crack.hp = 40;
  room.crack = crack;
  return room;
}

function rectsOverlap(a, b, pad = 0) {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}
function pointInRect(x, y, r, pad = 0) {
  return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
}

// Empuja una entidad (círculo) fuera de muros, obstáculos y bordes del mapa
function resolveCollision(world, ent, radius) {
  const r = radius;
  for (const o of world.obstacles) {
    const dx = ent.x - o.x, dy = ent.y - o.y;
    if (Math.abs(dx) > r + o.r || Math.abs(dy) > r + o.r) continue;
    const d = Math.hypot(dx, dy), min = r + o.r;
    if (d < min && d > 0.001) { ent.x = o.x + dx / d * min; ent.y = o.y + dy / d * min; }
  }
  for (const room of world.rooms) {
    if (!pointInRect(ent.x, ent.y, room, r + 2)) continue;
    for (const tl of room.tiles) {
      if (tl.broken) continue;
      const nx = Math.max(tl.x, Math.min(ent.x, tl.x + tl.w));
      const ny = Math.max(tl.y, Math.min(ent.y, tl.y + tl.h));
      const dx = ent.x - nx, dy = ent.y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        ent.x = nx + dx / d * r; ent.y = ny + dy / d * r;
      } else {
        // el centro quedó dentro del bloque: salir por el lado más cercano
        const left = ent.x - tl.x, right = tl.x + tl.w - ent.x, top = ent.y - tl.y, bottom = tl.y + tl.h - ent.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) ent.x = tl.x - r; else if (m === right) ent.x = tl.x + tl.w + r;
        else if (m === top) ent.y = tl.y - r; else ent.y = tl.y + tl.h + r;
      }
    }
  }
  const b = MAP_BORDER + r;
  ent.x = Math.max(b, Math.min(world.w - b, ent.x));
  ent.y = Math.max(b, Math.min(world.h - b, ent.y));
}

// ¿Está bloqueado este punto? (para no hacer aparecer enemigos dentro de muros)
function pointBlocked(world, x, y, r) {
  const b = MAP_BORDER + r;
  if (x < b || y < b || x > world.w - b || y > world.h - b) return true;
  for (const room of world.rooms) if (room.state === 'hidden' && pointInRect(x, y, room, r)) return true;
  for (const room of world.rooms) {
    if (!pointInRect(x, y, room, r)) continue;
    for (const tl of room.tiles) if (!tl.broken && pointInRect(x, y, tl, r)) return true;
  }
  return false;
}

// ¿Hay un muro en este punto? (bloques de las salas o el muro del borde)
function wallAt(world, x, y) {
  if (x < MAP_BORDER || y < MAP_BORDER || x > world.w - MAP_BORDER || y > world.h - MAP_BORDER) return true;
  for (const room of world.rooms) {
    if (!pointInRect(x, y, room)) continue;
    for (const tl of room.tiles) if (!tl.broken && pointInRect(x, y, tl)) return true;
  }
  return false;
}

// ¿Un muro corta la línea entre dos puntos? (para que los ataques no atraviesen paredes)
function segmentBlocked(world, x1, y1, x2, y2) {
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2), minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  for (const room of world.rooms) {
    if (maxX < room.x || minX > room.x + room.w || maxY < room.y || minY > room.y + room.h) continue;
    for (const tl of room.tiles) {
      if (!tl.broken && segmentHitsRect(x1, y1, x2, y2, tl.x + 1, tl.y + 1, tl.w - 2, tl.h - 2)) return true;
    }
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy], q = [x1 - rx, rx + rw - x1, y1 - ry, ry + rh - y1];
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; continue; }
    const tt = q[i] / p[i];
    if (p[i] < 0) { if (tt > t1) return false; if (tt > t0) t0 = tt; }
    else { if (tt < t0) return false; if (tt < t1) t1 = tt; }
  }
  return true;
}

function roomContaining(world, x, y) {
  for (const room of world.rooms) if (pointInRect(x, y, room.inner)) return room;
  return null;
}
