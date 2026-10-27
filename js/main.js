// =============================================================
//  ARRANQUE, TECLADO Y BUCLE PRINCIPAL
// =============================================================

// ---------- Teclado ----------
const Input = {
  keys: new Set(),
  dx: 0, dy: 0,
  update() {
    const k = this.keys;
    this.dx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    this.dy = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
  },
};

// ---------- Estado general de la aplicación ----------
const App = {
  run: null,

  startRun(charId) {
    UI.clear();
    this.run = new Run(charId);
  },

  toMenu() {
    this.run = null;
    UI.mainMenu();
  },

  pause() {
    const r = this.run;
    if (!r || r.over || r.modal || r.paused) return;
    r.paused = true;
    UI.showPause(r);
  },

  resume() {
    if (!this.run) return;
    this.run.paused = false;
    UI.clear();
  },

  quitRun() {
    const r = this.run;
    if (!r || r.over) return;
    r.paused = false;
    r.modal = false;       // si había un menú de mejora abierto, se descarta
    r.pending = [];
    UI.clear();
    r.gameOver();
    r.overT = 0;
  },

  // ---------- Botón "Terminar partida" con confirmación ----------
  confirmOpen: false,
  wasPaused: false,

  askEndRun() {
    const r = this.run;
    if (!r || r.over || this.confirmOpen) return;
    this.confirmOpen = true;
    this.wasPaused = r.paused;
    r.paused = true; // el juego se detiene mientras decides
    document.getElementById('confirm-title').textContent = t('endRunTitle');
    document.getElementById('confirm-text').textContent = t('endRunText');
    document.getElementById('confirm-yes').textContent = t('endRunYes');
    document.getElementById('confirm-no').textContent = t('endRunNo');
    document.getElementById('confirm').hidden = false;
  },

  closeConfirm(endRun) {
    if (!this.confirmOpen) return;
    this.confirmOpen = false;
    document.getElementById('confirm').hidden = true;
    if (endRun) this.quitRun();
    else if (this.run) this.run.paused = this.wasPaused;
  },
};

const endBtn = document.getElementById('end-btn');
endBtn.addEventListener('click', () => { endBtn.blur(); Sound.play('select'); App.askEndRun(); });
document.getElementById('confirm-yes').addEventListener('click', () => { Sound.play('select'); App.closeConfirm(true); });
document.getElementById('confirm-no').addEventListener('click', () => { Sound.play('select'); App.closeConfirm(false); });

// El botón solo se ve durante una partida
function updateEndButton() {
  const show = !!App.run && !App.run.over;
  endBtn.style.display = show ? '' : 'none';
  const label = t('endRun');
  if (endBtn.textContent !== label) endBtn.textContent = label;
}

window.addEventListener('keydown', e => {
  Sound.init();
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (App.confirmOpen) {
    if (e.code === 'Escape') App.closeConfirm(false);
    e.preventDefault();
    return;
  }
  if (UI.keyHandler && !e.repeat && UI.keyHandler(e)) { e.preventDefault(); return; }
  Input.keys.add(e.code);
  if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat && App.run) App.pause();
});
window.addEventListener('keyup', e => Input.keys.delete(e.code));
window.addEventListener('pointerdown', () => Sound.init());
// si cambias de ventana, el juego se pausa solo
window.addEventListener('blur', () => { Input.keys.clear(); App.pause(); });

// ---------- Escalar el juego al tamaño de la ventana ----------
function fitToWindow() {
  const s = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  document.getElementById('wrap').style.setProperty('--s', s);
}
window.addEventListener('resize', fitToWindow);

// ---------- Bucle principal ----------
let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  Input.update();
  updateEndButton();
  if (App.run) {
    App.run.update(dt);
    Render.draw(App.run);
  } else {
    Render.drawMenu(now / 1000);
  }
  requestAnimationFrame(frame);
}

// ---------- ¡A jugar! ----------
fitToWindow();
Render.init(document.getElementById('game'));
UI.init();
UI.mainMenu();
requestAnimationFrame(frame);
