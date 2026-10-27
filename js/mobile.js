// =============================================================
//  VERSIÓN MÓVIL: palanca táctil, botón de pausa y ajustes
//  (solo se carga en movil.html; la versión de PC no cambia)
// =============================================================

(function () {
  // ---------- Textos adaptados al móvil ----------
  Object.assign(TEXTS.es, {
    chooseOne: 'Toca una mejora', relicChoose: 'Toca una reliquia',
    controls: 'Mover: palanca a la izquierda  ·  Pausa: botón ❚❚',
    rotate: 'Gira el móvil para jugar en horizontal',
  });
  Object.assign(TEXTS.en, {
    chooseOne: 'Tap an upgrade', relicChoose: 'Tap a relic',
    controls: 'Move: stick on the left  ·  Pause: ❚❚ button',
    rotate: 'Rotate your phone to play in landscape',
  });
  UI.mainMenu(); // vuelve a dibujar el menú con los textos del móvil

  const zone = document.getElementById('stick-zone');
  const stick = document.getElementById('stick');
  const knob = document.getElementById('stick-knob');
  const pauseBtn = document.getElementById('pause-btn');
  const rotateText = document.getElementById('rotate-text');

  // ---------- Palanca ----------
  const MAX = 44;     // cuánto se puede alejar el pomo del centro (px)
  const DEAD = 0.18;  // zona muerta: movimientos muy pequeños no cuentan
  const touch = { id: null, cx: 0, cy: 0, dx: 0, dy: 0 };

  function moveKnob(x, y) {
    let dx = x - touch.cx, dy = y - touch.cy;
    const len = Math.hypot(dx, dy);
    if (len > MAX) { dx = dx / len * MAX; dy = dy / len * MAX; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touch.dx = dx / MAX; touch.dy = dy / MAX;
  }

  function release() {
    touch.id = null; touch.dx = touch.dy = 0;
    stick.classList.remove('active');
    stick.style.left = stick.style.top = '';   // vuelve a su sitio de reposo
    knob.style.transform = '';
  }

  // La palanca aparece donde pones el pulgar (en la mitad izquierda)
  zone.addEventListener('pointerdown', e => {
    if (touch.id !== null) return;
    e.preventDefault();
    touch.id = e.pointerId;
    try { zone.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    touch.cx = e.clientX; touch.cy = e.clientY;
    stick.style.left = e.clientX + 'px';
    stick.style.top = e.clientY + 'px';
    stick.classList.add('active');
    moveKnob(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId === touch.id) moveKnob(e.clientX, e.clientY); });
  zone.addEventListener('pointerup', e => { if (e.pointerId === touch.id) release(); });
  zone.addEventListener('pointercancel', e => { if (e.pointerId === touch.id) release(); });

  // La palanca se suma al teclado (si hay uno conectado, también funciona)
  const keyboardUpdate = Input.update.bind(Input);
  Input.update = function () {
    keyboardUpdate();
    if (touch.id !== null && Math.hypot(touch.dx, touch.dy) > DEAD) {
      this.dx = touch.dx; this.dy = touch.dy;
    }
  };

  // ---------- Pausa ----------
  pauseBtn.addEventListener('click', () => { Sound.play('select'); App.pause(); });
  // si sales de la app o bloqueas el móvil, el juego se pausa
  document.addEventListener('visibilitychange', () => { if (document.hidden) { release(); App.pause(); } });

  // ---------- Mostrar la palanca solo mientras juegas ----------
  function watch() {
    const r = App.run;
    const playing = !!r && !r.over && !r.paused && !r.modal && !App.confirmOpen;
    document.body.classList.toggle('playing', playing);
    if (!playing && touch.id !== null) release();
    const msg = t('rotate');
    if (rotateText.textContent !== msg) rotateText.textContent = msg;
    requestAnimationFrame(watch);
  }
  watch();

  // ---------- Pantalla completa y horizontal al primer toque ----------
  document.addEventListener('pointerdown', () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req && !document.fullscreenElement) {
      Promise.resolve(req.call(el)).then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    }
  }, { once: true });

  // sin menú contextual ni zoom con gestos
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  window.addEventListener('resize', fitToWindow);
})();
