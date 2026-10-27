// =============================================================
//  SONIDO: todos los efectos y la música se generan por código
//  con la Web Audio API (no hay archivos de audio).
//  Los volúmenes son suaves a propósito.
// =============================================================

const Sound = {
  ctx: null, sfxBus: null, musicBus: null, noiseBuf: null, last: {},

  // El navegador solo permite sonido tras una tecla o clic del jugador
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const comp = this.ctx.createDynamicsCompressor();
    comp.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(comp);
    this.musicBus = this.ctx.createGain(); this.musicBus.connect(comp);
    // ruido blanco reutilizable (golpes, explosiones)
    const len = Math.floor(this.ctx.sampleRate * 0.6);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    Music.resume();
  },

  applyVolumes() {
    if (!this.ctx) return;
    this.sfxBus.gain.value = Settings.sfx * 0.55;
    this.musicBus.gain.value = Settings.music * 0.9;
  },

  // Un tono simple con subida/bajada de volumen suave
  tone(freq, dur, o = {}) {
    const c = this.ctx; if (!c) return;
    const t0 = o.at !== undefined ? o.at : c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const g = c.createGain();
    const v = o.vol || 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(o.bus || this.sfxBus);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  },

  // Ruido filtrado (golpes, roturas, explosiones)
  noise(dur, o = {}) {
    const c = this.ctx; if (!c) return;
    const t0 = o.at !== undefined ? o.at : c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = o.filter || 'lowpass'; f.frequency.value = o.freq || 1200;
    const g = c.createGain();
    g.gain.setValueAtTime(o.vol || 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.03);
  },

  // Reproduce un efecto por nombre. Algunos tienen un límite de
  // repetición para que no se acumulen cuando hay muchos enemigos.
  play(name) {
    if (!this.ctx || Settings.sfx <= 0) return;
    const now = performance.now();
    const minGap = { hit: 55, gem: 40, coin: 60, boom: 90, shoot: 120, die: 50 }[name] || 0;
    if (now - (this.last[name] || 0) < minGap) return;
    this.last[name] = now;
    switch (name) {
      case 'hit':     this.tone(260, 0.05, { type: 'square', to: 140, vol: 0.035 }); break;
      case 'die':     this.noise(0.07, { freq: 900, vol: 0.05 }); break;
      case 'gem':     this.tone(990 + Math.random() * 120, 0.06, { to: 1500, vol: 0.04 }); break;
      case 'coin':    this.tone(1180, 0.05, { type: 'triangle', vol: 0.05 });
                      this.tone(1580, 0.08, { type: 'triangle', vol: 0.05, delay: 0.05 }); break;
      case 'hurt':    this.tone(180, 0.18, { type: 'sawtooth', to: 80, vol: 0.08 });
                      this.noise(0.12, { freq: 700, vol: 0.08 }); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.09, delay: i * 0.07 })); break;
      case 'chest':   [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.08, delay: i * 0.06 })); break;
      case 'evolve':  [262, 330, 392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.08, delay: i * 0.08 })); break;
      case 'select':  this.tone(660, 0.07, { type: 'triangle', vol: 0.07 }); break;
      case 'boom':    this.noise(0.22, { freq: 420, vol: 0.09 }); break;
      case 'break':   this.noise(0.35, { freq: 600, vol: 0.16 }); this.tone(120, 0.25, { type: 'square', to: 60, vol: 0.05 }); break;
      case 'boss':    this.tone(70, 1.1, { type: 'sawtooth', to: 45, vol: 0.12, attack: 0.15 });
                      this.tone(105, 1.1, { type: 'sawtooth', to: 66, vol: 0.07, attack: 0.15 }); break;
      case 'slam':    this.noise(0.3, { freq: 300, vol: 0.14 }); this.tone(90, 0.3, { to: 40, vol: 0.12 }); break;
      case 'portal':  this.tone(220, 0.8, { to: 880, vol: 0.08, attack: 0.2 }); break;
      case 'secret':  [523, 784, 1046].forEach((f, i) => this.tone(f, 0.3, { vol: 0.07, delay: i * 0.1 })); break;
      case 'alarm':   this.tone(440, 0.2, { type: 'square', vol: 0.04 }); this.tone(330, 0.3, { type: 'square', vol: 0.04, delay: 0.22 }); break;
      case 'heal':    this.tone(523, 0.15, { vol: 0.07 }); this.tone(784, 0.2, { vol: 0.07, delay: 0.08 }); break;
      case 'shoot':   this.tone(500, 0.08, { type: 'triangle', to: 300, vol: 0.025 }); break;
    }
  },
};

// -------------------------------------------------------------
//  MÚSICA: un bucle tranquilo distinto para cada zona
// -------------------------------------------------------------
const SONGS = [
  { bpm: 92,  root: 57, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 4], seed: 11 }, // Bosque
  { bpm: 80,  root: 50, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 3, 5, 4], seed: 23 }, // Cementerio
  { bpm: 86,  root: 52, scale: [0, 2, 3, 5, 7, 8, 11], prog: [0, 5, 0, 4], seed: 37 }, // Cripta
  { bpm: 100, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 6, 5, 4], seed: 41 }, // Castillo
  { bpm: 108, root: 48, scale: [0, 1, 3, 5, 6, 8, 10], prog: [0, 1, 5, 4], seed: 53 }, // Abismo
  { bpm: 72,  root: 55, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 3, 4], seed: 7 },  // Menú
];

function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const Music = {
  song: null, songIndex: null, timer: null, step: 0, nextTime: 0,

  start(index) {
    this.stop();
    this.songIndex = index;
    const s = SONGS[index];
    const rnd = seededRandom(s.seed);
    // melodía de 64 pasos: notas sueltas con silencios
    const mel = [];
    for (let i = 0; i < 64; i++) {
      if (i % 4 === 0 && rnd() < 0.7) mel.push(Math.floor(rnd() * 7) + (rnd() < 0.3 ? 7 : 0));
      else if (i % 2 === 0 && rnd() < 0.18) mel.push(Math.floor(rnd() * 7));
      else mel.push(null);
    }
    this.song = Object.assign({ mel }, s);
    this.step = 0;
    this.intensity = this.wantedIntensity = 0;
    if (!Sound.ctx) return; // empezará cuando el jugador pulse algo
    this.nextTime = Sound.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.tick(), 50);
  },

  resume() { if (this.songIndex !== null && !this.timer) this.start(this.songIndex); },
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; },

  note(deg) {
    const sc = this.song.scale, n = sc.length;
    const oct = Math.floor(deg / n);
    const semi = sc[((deg % n) + n) % n] + 12 * oct;
    return 440 * Math.pow(2, (this.song.root + semi - 69) / 12);
  },

  // Intensidad: 0 = normal, 1 = hay una élite, 2 = hay un jefe.
  // Es la misma melodía de la zona, pero más rápida y con más ritmo.
  intensity: 0, wantedIntensity: 0,
  setIntensity(level) { this.wantedIntensity = level; },

  tick() {
    const c = Sound.ctx; if (!c || !this.song) return;
    while (this.nextTime < c.currentTime + 0.25) {
      // el cambio de intensidad espera al siguiente pulso para que suene natural
      if (this.step % 4 === 0) this.intensity = this.wantedIntensity;
      const speed = [1, 1.3, 1.45][this.intensity];
      const stepDur = 60 / (this.song.bpm * speed) / 4;
      this.playStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 64;
    }
  },

  playStep(s, at, d) {
    if (Settings.music <= 0) return;
    const bus = Sound.musicBus;
    const I = this.intensity;
    const chord = this.song.prog[Math.floor(s / 16)];
    const m = this.song.mel[s];

    if (I === 0) {
      // ----- normal: tranquila -----
      // bajo (una octava por encima de lo habitual para que se oiga en altavoces pequeños)
      if (s % 8 === 0) Sound.tone(this.note(chord), d * 7, { type: 'triangle', vol: 0.2, at, bus, attack: 0.02 });
      // arpegio suave
      if (s % 2 === 0) {
        const arp = [0, 2, 4, 2][(s / 2) % 4];
        Sound.tone(this.note(chord + arp) * 2, d * 1.8, { vol: 0.08, at, bus });
      }
      // melodía
      if (m !== null) Sound.tone(this.note(m) * 2, d * 3.5, { type: 'triangle', vol: 0.16, at, bus, attack: 0.02 });
      // percusión discreta
      if (s % 8 === 0) Sound.tone(95, 0.12, { to: 40, vol: 0.12, at, bus });
      if (s % 4 === 2) Sound.noise(0.03, { filter: 'highpass', freq: 6000, vol: 0.025, at, bus });
      return;
    }

    // ----- frenética: élite (1) o jefe (2) -----
    // bajo galopante: raíz y octava alternadas en cada corchea
    if (s % 2 === 0) {
      const oct = (s / 2) % 2 === 0 ? 1 : 2;
      Sound.tone(this.note(chord) * oct, d * 1.6, { type: 'triangle', vol: 0.18, at, bus });
    }
    // arpegio rápido en cada paso
    const arp = [0, 2, 4, 7, 4, 2, 0, 4][s % 8];
    Sound.tone(this.note(chord + arp) * 2, d * 0.9, { vol: 0.06, at, bus });
    // melodía más incisiva
    if (m !== null) Sound.tone(this.note(m) * 2, d * 2.5, { type: 'square', vol: 0.05, at, bus, attack: 0.01 });
    // batería: bombo en cada pulso, caja en el 2 y el 4, charles en cada corchea
    if (s % 4 === 0) Sound.tone(100, 0.12, { to: 40, vol: 0.14, at, bus });
    if (s % 8 === 4) Sound.noise(0.09, { freq: 2500, vol: 0.07, at, bus });
    if (s % 2 === 1) Sound.noise(0.025, { filter: 'highpass', freq: 7000, vol: 0.022, at, bus });
    if (I === 2) {
      // jefe: un pulso grave y amenazante al empezar cada compás
      if (s % 16 === 0) Sound.tone(this.note(chord) / 2, d * 14, { type: 'sawtooth', vol: 0.07, at, bus, attack: 0.05 });
      // y dobles golpes de bombo
      if (s % 8 === 7) Sound.tone(100, 0.1, { to: 40, vol: 0.1, at, bus });
    }
  },
};
