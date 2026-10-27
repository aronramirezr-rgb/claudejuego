// =============================================================
//  GUARDADO: opciones y progreso permanente (oro, mejoras, récords)
//  Se guarda en el navegador (localStorage).
// =============================================================

function loadStored(key, defaults) {
  const copy = JSON.parse(JSON.stringify(defaults));
  try {
    const raw = localStorage.getItem(key);
    if (raw) return Object.assign(copy, JSON.parse(raw));
  } catch (e) { /* si falla, usamos los valores por defecto */ }
  return copy;
}

function storeValue(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* sin guardado */ }
}

const DEFAULT_SETTINGS = {
  lang: (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en',
  music: 0.6,        // volumen de la música (0 a 1)
  sfx: 0.6,          // volumen de los efectos (0 a 1)
  fx: 'med',         // intensidad de efectos visuales: 'low' | 'med' | 'high'
  shake: true,       // vibración de pantalla
  dmgNumbers: true,  // mostrar números de daño
};

const DEFAULT_SAVE = {
  gold: 0,
  meta: {},                       // niveles comprados en la tienda { id: nivel }
  unlocked: ['knight', 'mage'],   // personajes disponibles
  bestTime: 0, bestZone: 0, bestKills: 0, bestLevel: 0,
};

let Settings = loadStored('reino_settings', DEFAULT_SETTINGS);
let SaveData = loadStored('reino_save', DEFAULT_SAVE);

function saveSettings() { storeValue('reino_settings', Settings); }
function saveGame() { storeValue('reino_save', SaveData); }

// Multiplicador de efectos visuales según la opción elegida
function fxLevel() { return { low: 0.35, med: 0.7, high: 1 }[Settings.fx] || 0.7; }
