// =============================================================
//  TEXTOS DEL JUEGO (español / inglés)
//  Para cambiar un texto de los menús, edítalo aquí.
//  Los nombres de armas, enemigos, etc. están en data.js.
// =============================================================

const TEXTS = {
  es: {
    title: 'Reino Sombrío',
    subtitle: 'Sobrevive. Hazte más fuerte. Desciende al abismo.',
    play: 'Jugar', shop: 'Tienda', options: 'Opciones', back: 'Volver',
    resume: 'Continuar', quit: 'Abandonar partida', menu: 'Menú principal', retry: 'Reintentar',
    chooseHero: 'Elige tu héroe', start: '¡Comenzar!', locked: 'Bloqueado',
    unlockFor: 'Desbloquear ({cost} oro)',
    gold: 'Oro', level: 'Nivel', lv: 'Nv', time: 'Tiempo', kills: 'Bajas', zone: 'Zona',
    hp: 'Vida', speed: 'Velocidad', armor: 'Armadura', startWeapon: 'Arma inicial',
    exclusives: 'Mejoras exclusivas',
    levelUp: '¡Subes de nivel!', chooseOne: 'Elige una mejora (teclas 1-4)',
    newItem: '¡Nuevo!', weapon: 'Arma', passive: 'Pasiva', exclusive: 'Exclusiva',
    lvUp: 'Nv {a} → {b}', newForm: 'Nueva forma: ', moreDamage: 'Más daño y potencia.',
    chest: '¡Cofre!', chestChoose: 'Elige una mejora rara (+2 niveles)',
    evolution: '¡EVOLUCIÓN!', evolves: '{a} evoluciona en {b}',
    relicTitle: 'Reliquia del jefe', relicChoose: 'Elige una reliquia (teclas 1-3)',
    heal: 'Pollo asado', healDesc: 'Recupera un 30% de vida.',
    goldBag: 'Bolsa de oro', goldBagDesc: '+25 de oro.',
    paused: 'Pausa', build: 'Tu equipo', relics: 'Reliquias',
    gameOver: 'Has caído', newRecord: '¡Nuevo récord!',
    goldEarned: 'Oro ganado', bestTime: 'Mejor tiempo', bestZone: 'Zona más lejana',
    reachedZone: 'Zona alcanzada', maxLevel: 'Nivel alcanzado',
    refund: 'Reembolsar todo', buy: 'Comprar', maxed: 'MÁX',
    language: 'Idioma', music: 'Música', sfx: 'Efectos de sonido', fx: 'Efectos visuales',
    low: 'Bajo', med: 'Medio', high: 'Alto',
    shake: 'Vibración de pantalla', dmgNumbers: 'Números de daño',
    controls: 'Mover: WASD / Flechas  ·  Pausa: Esc / P',
    bossIncoming: '¡Se acerca un jefe!', portalOpen: 'Se ha abierto un portal',
    enterZone: 'Zona {n}: {name}',
    evRing: '¡Te están rodeando!', evStampede: '¡Estampida!', evFog: 'Cae una niebla espesa...',
    eliteAppears: 'Un enemigo de élite aparece',
    secretFound: '¡Sala secreta!', challenge: '¡Desafío! Derrota a la élite',
    challengeDone: 'Desafío superado: el cofre se abre',
    revived: '¡Renaces de tus cenizas!',
    endless: 'El abismo no tiene fin...',
    endRun: '✖ Terminar partida', endRunTitle: '¿Terminar la partida?',
    endRunText: 'Conservarás el oro que hayas ganado.', endRunYes: 'Sí, terminar', endRunNo: 'Seguir jugando',
  },
  en: {
    title: 'Shadow Realm',
    subtitle: 'Survive. Grow stronger. Descend into the abyss.',
    play: 'Play', shop: 'Shop', options: 'Options', back: 'Back',
    resume: 'Resume', quit: 'Quit run', menu: 'Main menu', retry: 'Retry',
    chooseHero: 'Choose your hero', start: 'Start!', locked: 'Locked',
    unlockFor: 'Unlock ({cost} gold)',
    gold: 'Gold', level: 'Level', lv: 'Lv', time: 'Time', kills: 'Kills', zone: 'Zone',
    hp: 'Health', speed: 'Speed', armor: 'Armor', startWeapon: 'Starting weapon',
    exclusives: 'Exclusive upgrades',
    levelUp: 'Level up!', chooseOne: 'Choose an upgrade (keys 1-4)',
    newItem: 'New!', weapon: 'Weapon', passive: 'Passive', exclusive: 'Exclusive',
    lvUp: 'Lv {a} → {b}', newForm: 'New form: ', moreDamage: 'More damage and power.',
    chest: 'Chest!', chestChoose: 'Choose a rare upgrade (+2 levels)',
    evolution: 'EVOLUTION!', evolves: '{a} evolves into {b}',
    relicTitle: 'Boss relic', relicChoose: 'Choose a relic (keys 1-3)',
    heal: 'Roast chicken', healDesc: 'Restores 30% health.',
    goldBag: 'Bag of gold', goldBagDesc: '+25 gold.',
    paused: 'Paused', build: 'Your build', relics: 'Relics',
    gameOver: 'You have fallen', newRecord: 'New record!',
    goldEarned: 'Gold earned', bestTime: 'Best time', bestZone: 'Furthest zone',
    reachedZone: 'Zone reached', maxLevel: 'Level reached',
    refund: 'Refund all', buy: 'Buy', maxed: 'MAX',
    language: 'Language', music: 'Music', sfx: 'Sound effects', fx: 'Visual effects',
    low: 'Low', med: 'Medium', high: 'High',
    shake: 'Screen shake', dmgNumbers: 'Damage numbers',
    controls: 'Move: WASD / Arrows  ·  Pause: Esc / P',
    bossIncoming: 'A boss approaches!', portalOpen: 'A portal has opened',
    enterZone: 'Zone {n}: {name}',
    evRing: 'You are being surrounded!', evStampede: 'Stampede!', evFog: 'A thick fog rolls in...',
    eliteAppears: 'An elite enemy appears',
    secretFound: 'Secret room!', challenge: 'Challenge! Defeat the elite',
    challengeDone: 'Challenge complete: the chest unlocks',
    revived: 'You rise from the ashes!',
    endless: 'The abyss has no end...',
    endRun: '✖ End run', endRunTitle: 'End this run?',
    endRunText: 'You will keep the gold you earned.', endRunYes: 'Yes, end it', endRunNo: 'Keep playing',
  },
};

// t('clave', {variables}) devuelve el texto en el idioma actual
function t(key, vars) {
  const lang = (typeof Settings !== 'undefined' && Settings.lang) || 'es';
  let s = (TEXTS[lang] && TEXTS[lang][key]) || TEXTS.es[key] || key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}

// tr({es:'...', en:'...'}) elige el texto del idioma actual
function tr(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[Settings.lang] || obj.es;
}
