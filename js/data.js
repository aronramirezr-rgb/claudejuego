// =============================================================
//  DATOS DEL JUEGO
//  Aquí se ajusta casi todo el equilibrio: vida, daño, velocidad,
//  qué enemigos salen en cada zona, precios de la tienda, etc.
// =============================================================

// Colores de rareza: el arma cambia de color al subir de nivel
const TIER_COLORS = ['#cfd5de', '#5aa9ff', '#b46cff', '#ffcc33'];
const EVO_COLOR = '#ff6fa8';
const WEAPON_MAX = 8;   // nivel máximo de un arma
const PASSIVE_MAX = 5;  // nivel máximo de una pasiva
const MAX_WEAPONS = 6, MAX_PASSIVES = 6;

// Nivel de arma -> "forma" (0 a 3). Cambia en los niveles 3, 5 y 7.
function weaponTier(level) { return Math.min(3, Math.floor((level - 1) / 2)); }

// ---------------------------------------------------------------
//  PERSONAJES
// ---------------------------------------------------------------
const CHARACTERS = {
  knight: {
    id: 'knight', sprite: 'knight', cost: 0,
    name: { es: 'Caballero', en: 'Knight' },
    desc: { es: 'Resistente y valiente. Combate cuerpo a cuerpo.', en: 'Tough and brave. Fights up close.' },
    hp: 120, speed: 150, armor: 1, weapon: 'sword',
    exclusives: ['sword', 'hammer', 'thorns', 'lionheart'],
    bonus: s => {},
    // la armadura cambia de color al subir de nivel (niveles 1, 8, 16, 25)
    tiers: [
      { x: '#8d96a1', X: '#555d68', v: '#8c2a2a' },
      { x: '#c3ccd6', X: '#7a8592', v: '#c0392b' },
      { x: '#7fb2ff', X: '#3c63b8', v: '#e8e4f0' },
      { x: '#ffd75a', X: '#c08a1e', v: '#7b2fd0' },
    ],
  },
  mage: {
    id: 'mage', sprite: 'mage', cost: 0,
    name: { es: 'Maga', en: 'Mage' },
    desc: { es: 'Frágil pero poderosa. Hechizos de área.', en: 'Fragile but powerful. Area spells.' },
    hp: 95, speed: 155, armor: 0, weapon: 'fireball',
    exclusives: ['fireball', 'frost', 'arcane', 'mana'],
    bonus: s => { s.cooldown *= 0.92; },
    tiers: [
      { x: '#6a4fa0', X: '#3e2c66' },
      { x: '#3f73c9', X: '#24467e' },
      { x: '#b0303e', X: '#6a1a24' },
      { x: '#f0ecff', X: '#c9a43a' },
    ],
  },
  archer: {
    id: 'archer', sprite: 'archer', cost: 400,
    name: { es: 'Arquero', en: 'Archer' },
    desc: { es: 'Rápido y certero. Golpes críticos.', en: 'Fast and precise. Critical hits.' },
    hp: 95, speed: 172, armor: 0, weapon: 'bow',
    exclusives: ['bow', 'rain', 'hawk', 'quiver'],
    bonus: s => { s.crit += 0.05; s.projSpeed += 0.1; },
    tiers: [
      { x: '#4f7a3a', X: '#2f4a22', v: '#5f8a45' },
      { x: '#3f8a5a', X: '#245236', v: '#2e6e48' },
      { x: '#2f6f8a', X: '#1d4456', v: '#d8d8e0' },
      { x: '#e0b040', X: '#8a6a20', v: '#f5f0e0' },
    ],
  },
};

// ---------------------------------------------------------------
//  MEJORAS: armas y pasivas
//  owner: null = común para todos; 'knight'/'mage'/'archer' = exclusiva
// ---------------------------------------------------------------
const UPGRADES = {};
function weapon(def) { def.type = 'weapon'; def.maxLevel = WEAPON_MAX; UPGRADES[def.id] = def; }
function passive(def) { def.type = 'passive'; def.maxLevel = def.maxLevel || PASSIVE_MAX; UPGRADES[def.id] = def; }

// ----- Armas exclusivas del Caballero -----
weapon({ id: 'sword', owner: 'knight', icon: 'i_sword',
  name: { es: 'Espada', en: 'Sword' },
  desc: { es: 'Tajo hacia el enemigo más cercano que lo hace retroceder.', en: 'Slashes the nearest enemy, knocking it back.' },
  tiers: [{ es: 'Tajo frontal', en: 'Front slash' }, { es: 'Tajo amplio', en: 'Wide slash' },
          { es: 'Doble tajo: delante y detrás', en: 'Double slash: front and back' }, { es: 'Torbellino de acero', en: 'Steel whirlwind' }],
  evo: { with: 'lionheart', name: { es: 'Excalibur', en: 'Excalibur' },
         desc: { es: 'Un torbellino dorado que lanza ondas de luz.', en: 'A golden whirlwind that launches waves of light.' } } });
weapon({ id: 'hammer', owner: 'knight', icon: 'i_hammer',
  name: { es: 'Martillo sísmico', en: 'Seismic Hammer' },
  desc: { es: 'Golpea el suelo creando una onda expansiva.', en: 'Strikes the ground, creating a shockwave.' },
  tiers: [{ es: 'Onda pequeña', en: 'Small wave' }, { es: 'Onda amplia', en: 'Wide wave' },
          { es: 'Doble onda', en: 'Double wave' }, { es: 'Onda que aturde', en: 'Stunning wave' }],
  evo: { with: 'thorns', name: { es: 'Terremoto', en: 'Earthquake' },
         desc: { es: 'Tres ondas gigantes que aturden a todos.', en: 'Three giant waves that stun everything.' } } });
// ----- Armas exclusivas de la Maga -----
weapon({ id: 'fireball', owner: 'mage', icon: 'i_fireball',
  name: { es: 'Bola de fuego', en: 'Fireball' },
  desc: { es: 'Lanza fuego al enemigo más cercano; explota al impactar.', en: 'Hurls fire at the nearest enemy; explodes on impact.' },
  tiers: [{ es: 'Llama', en: 'Flame' }, { es: 'Fuego azul: dos bolas', en: 'Blue fire: two fireballs' },
          { es: 'Fuego arcano: explosión mayor', en: 'Arcane fire: bigger blast' }, { es: 'Fuego dorado: el suelo arde', en: 'Golden fire: the ground burns' }],
  evo: { with: 'mana', name: { es: 'Meteoro', en: 'Meteor' },
         desc: { es: 'Meteoros enormes que arrasan zonas enteras.', en: 'Huge meteors that flatten whole areas.' } } });
weapon({ id: 'frost', owner: 'mage', icon: 'i_frost',
  name: { es: 'Nova de hielo', en: 'Frost Nova' },
  desc: { es: 'Onda helada a tu alrededor que ralentiza.', en: 'An icy wave around you that slows enemies.' },
  tiers: [{ es: 'Escarcha', en: 'Frost' }, { es: 'Ventisca', en: 'Blizzard' },
          { es: 'Hielo profundo', en: 'Deep ice' }, { es: 'Congelación total', en: 'Total freeze' }],
  evo: { with: 'area', name: { es: 'Invierno eterno', en: 'Eternal Winter' },
         desc: { es: 'Una nova inmensa que congela todo a su paso.', en: 'An immense nova that freezes everything.' } } });
weapon({ id: 'arcane', owner: 'mage', icon: 'i_arcane',
  name: { es: 'Misil arcano', en: 'Arcane Missile' },
  desc: { es: 'Proyectiles mágicos que persiguen a los enemigos.', en: 'Magic bolts that chase enemies.' },
  tiers: [{ es: '1 misil', en: '1 missile' }, { es: '2 misiles', en: '2 missiles' },
          { es: '3 misiles', en: '3 missiles' }, { es: '4 misiles perforantes', en: '4 piercing missiles' }],
  evo: { with: 'amount', name: { es: 'Tormenta arcana', en: 'Arcane Storm' },
         desc: { es: 'Un enjambre de misiles imparables.', en: 'A swarm of unstoppable missiles.' } } });
// ----- Armas exclusivas del Arquero -----
weapon({ id: 'bow', owner: 'archer', icon: 'i_bow',
  name: { es: 'Arco', en: 'Bow' },
  desc: { es: 'Dispara flechas al enemigo más cercano.', en: 'Shoots arrows at the nearest enemy.' },
  tiers: [{ es: 'Flecha', en: 'Arrow' }, { es: 'Doble flecha', en: 'Double arrow' },
          { es: 'Abanico de 3 flechas', en: 'Fan of 3 arrows' }, { es: 'Flechas perforantes', en: 'Piercing arrows' }],
  evo: { with: 'hawk', name: { es: 'Arco del alba', en: 'Dawn Bow' },
         desc: { es: 'Flechas de luz que lo atraviesan todo.', en: 'Arrows of light that pierce everything.' } } });
weapon({ id: 'rain', owner: 'archer', icon: 'i_rain',
  name: { es: 'Lluvia de flechas', en: 'Arrow Rain' },
  desc: { es: 'Hace llover flechas sobre un grupo de enemigos.', en: 'Rains arrows on a group of enemies.' },
  tiers: [{ es: 'Chubasco', en: 'Shower' }, { es: 'Aguacero', en: 'Downpour' },
          { es: 'Dos tormentas', en: 'Two storms' }, { es: 'Tres tormentas', en: 'Three storms' }],
  evo: { with: 'quiver', name: { es: 'Diluvio', en: 'Deluge' },
         desc: { es: 'Cinco tormentas de flechas gigantes.', en: 'Five giant arrow storms.' } } });
// ----- Armas comunes -----
weapon({ id: 'knife', owner: null, icon: 'i_knife',
  name: { es: 'Dagas', en: 'Daggers' },
  desc: { es: 'Lanza dagas hacia donde te mueves.', en: 'Throws daggers where you are moving.' },
  tiers: [{ es: '1 daga', en: '1 dagger' }, { es: '2 dagas', en: '2 daggers' },
          { es: 'Abanico de 3 dagas', en: 'Fan of 3 daggers' }, { es: '4 dagas perforantes', en: '4 piercing daggers' }],
  evo: { with: 'haste', name: { es: 'Mil dagas', en: 'Thousand Blades' },
         desc: { es: 'Un torrente imparable de dagas.', en: 'An unstoppable torrent of daggers.' } } });
weapon({ id: 'axe', owner: null, icon: 'i_axe',
  name: { es: 'Hacha', en: 'Axe' },
  desc: { es: 'Lanza hachas en arco que atraviesan enemigos.', en: 'Throws arcing axes that pass through enemies.' },
  tiers: [{ es: '1 hacha', en: '1 axe' }, { es: '2 hachas', en: '2 axes' },
          { es: '3 hachas grandes', en: '3 big axes' }, { es: '4 hachas gigantes', en: '4 giant axes' }],
  evo: { with: 'might', name: { es: 'Hacha del juicio', en: 'Axe of Judgment' },
         desc: { es: 'Hachas colosales que giran sin parar.', en: 'Colossal axes spinning endlessly.' } } });
weapon({ id: 'holywater', owner: null, icon: 'i_holywater',
  name: { es: 'Agua bendita', en: 'Holy Water' },
  desc: { es: 'Crea charcos sagrados que dañan sin parar.', en: 'Creates holy puddles that keep damaging.' },
  tiers: [{ es: 'Charco', en: 'Puddle' }, { es: '2 charcos', en: '2 puddles' },
          { es: 'Charcos grandes', en: 'Big puddles' }, { es: '3 charcos enormes', en: '3 huge puddles' }],
  evo: { with: 'magnet', name: { es: 'Fuente sagrada', en: 'Sacred Fountain' },
         desc: { es: 'Charcos enormes y duraderos.', en: 'Huge, long-lasting puddles.' } } });
weapon({ id: 'orbs', owner: null, icon: 'i_orbs',
  name: { es: 'Orbes guardianes', en: 'Guardian Orbs' },
  desc: { es: 'Orbes que giran a tu alrededor.', en: 'Orbs that circle around you.' },
  tiers: [{ es: '1 orbe', en: '1 orb' }, { es: '2 orbes', en: '2 orbs' },
          { es: '3 orbes', en: '3 orbs' }, { es: '4 orbes veloces', en: '4 fast orbs' }],
  evo: { with: 'armor', name: { es: 'Halo celestial', en: 'Celestial Halo' },
         desc: { es: 'Un anillo de seis soles protectores.', en: 'A ring of six protective suns.' } } });
weapon({ id: 'lightning', owner: null, icon: 'i_lightning',
  name: { es: 'Rayo', en: 'Lightning' },
  desc: { es: 'Caen rayos sobre enemigos al azar.', en: 'Lightning strikes random enemies.' },
  tiers: [{ es: '1 rayo', en: '1 bolt' }, { es: '2 rayos', en: '2 bolts' },
          { es: '3 rayos', en: '3 bolts' }, { es: '4 rayos potentes', en: '4 strong bolts' }],
  evo: { with: 'wisdom', name: { es: 'Tormenta eléctrica', en: 'Thunderstorm' },
         desc: { es: 'Una tormenta que no deja de golpear.', en: 'A storm that never stops striking.' } } });
weapon({ id: 'aura', owner: null, icon: 'i_aura',
  name: { es: 'Aura sagrada', en: 'Holy Aura' },
  desc: { es: 'Un aura que daña a los enemigos cercanos.', en: 'An aura that damages nearby enemies.' },
  tiers: [{ es: 'Aura débil', en: 'Faint aura' }, { es: 'Aura amplia', en: 'Wide aura' },
          { es: 'Aura brillante', en: 'Bright aura' }, { es: 'Aura que repele', en: 'Repelling aura' }],
  evo: { with: 'vigor', name: { es: 'Sol interior', en: 'Inner Sun' },
         desc: { es: 'Un sol que quema y ralentiza a todos.', en: 'A sun that burns and slows everyone.' } } });

// ----- Pasivas comunes -----
passive({ id: 'vigor', owner: null, icon: 'i_vigor', name: { es: 'Vigor', en: 'Vigor' },
  desc: { es: '+15% de vida máxima.', en: '+15% max health.' }, apply: (s, l) => { s.hpMul += 0.15 * l; } });
passive({ id: 'might', owner: null, icon: 'i_might', name: { es: 'Fuerza', en: 'Might' },
  desc: { es: '+10% de daño.', en: '+10% damage.' }, apply: (s, l) => { s.damage += 0.1 * l; } });
passive({ id: 'haste', owner: null, icon: 'i_haste', name: { es: 'Celeridad', en: 'Haste' },
  desc: { es: 'Las armas se recargan un 7% más rápido.', en: 'Weapons recharge 7% faster.' }, apply: (s, l) => { s.cooldown *= Math.pow(0.93, l); } });
passive({ id: 'boots', owner: null, icon: 'i_boots', name: { es: 'Botas aladas', en: 'Winged Boots' },
  desc: { es: '+8% de velocidad.', en: '+8% move speed.' }, apply: (s, l) => { s.speedMul += 0.08 * l; } });
passive({ id: 'magnet', owner: null, icon: 'i_magnet', name: { es: 'Imán', en: 'Magnet' },
  desc: { es: '+30% de radio para recoger objetos.', en: '+30% pickup radius.' }, apply: (s, l) => { s.magnetMul += 0.3 * l; } });
passive({ id: 'armor', owner: null, icon: 'i_armor', name: { es: 'Armadura', en: 'Armor' },
  desc: { es: 'Recibes 1 punto menos de daño.', en: 'Take 1 less damage.' }, apply: (s, l) => { s.armor += l; } });
passive({ id: 'regen', owner: null, icon: 'i_regen', name: { es: 'Regeneración', en: 'Regeneration' },
  desc: { es: 'Recuperas 0,3 de vida por segundo.', en: 'Recover 0.3 health per second.' }, apply: (s, l) => { s.regen += 0.3 * l; } });
passive({ id: 'area', owner: null, icon: 'i_area', name: { es: 'Amplitud', en: 'Amplitude' },
  desc: { es: '+10% de tamaño de los ataques.', en: '+10% attack size.' }, apply: (s, l) => { s.area += 0.1 * l; } });
passive({ id: 'amount', owner: null, icon: 'i_amount', name: { es: 'Duplicador', en: 'Duplicator' }, maxLevel: 2,
  desc: { es: '+1 proyectil en las armas.', en: '+1 projectile for weapons.' }, apply: (s, l) => { s.amount += l; } });
passive({ id: 'wisdom', owner: null, icon: 'i_wisdom', name: { es: 'Sabiduría', en: 'Wisdom' },
  desc: { es: '+10% de experiencia.', en: '+10% experience.' }, apply: (s, l) => { s.xpMul += 0.1 * l; } });
// ----- Pasivas exclusivas -----
passive({ id: 'thorns', owner: 'knight', icon: 'i_thorns', name: { es: 'Escudo de espinas', en: 'Thorn Shield' },
  desc: { es: '+0,5 armadura y devuelve 8 de daño a quien te toque.', en: '+0.5 armor and deals 8 damage to attackers.' },
  apply: (s, l) => { s.armor += 0.5 * l; s.thorns += 8 * l; } });
passive({ id: 'lionheart', owner: 'knight', icon: 'i_lionheart', name: { es: 'Corazón de león', en: 'Lionheart' },
  desc: { es: '+12% de vida y +5% de daño.', en: '+12% health and +5% damage.' },
  apply: (s, l) => { s.hpMul += 0.12 * l; s.damage += 0.05 * l; } });
passive({ id: 'mana', owner: 'mage', icon: 'i_mana', name: { es: 'Maná', en: 'Mana' },
  desc: { es: 'Recarga un 6% más rápida y +5% de área.', en: '6% faster recharge and +5% area.' },
  apply: (s, l) => { s.cooldown *= Math.pow(0.94, l); s.area += 0.05 * l; } });
passive({ id: 'hawk', owner: 'archer', icon: 'i_hawk', name: { es: 'Ojo de halcón', en: 'Hawk Eye' },
  desc: { es: '+7% de probabilidad de golpe crítico (daño x2).', en: '+7% critical hit chance (x2 damage).' },
  apply: (s, l) => { s.crit += 0.07 * l; } });
passive({ id: 'quiver', owner: 'archer', icon: 'i_quiver', name: { es: 'Carcaj', en: 'Quiver' },
  desc: { es: '+12% de velocidad de proyectil y +6% de daño.', en: '+12% projectile speed and +6% damage.' },
  apply: (s, l) => { s.projSpeed += 0.12 * l; s.damage += 0.06 * l; } });

// ---------------------------------------------------------------
//  RELIQUIAS (las sueltan los jefes: eliges 1 de 3)
// ---------------------------------------------------------------
const RELICS = {
  phoenix:   { icon: 'r_phoenix', name: { es: 'Pluma de fénix', en: 'Phoenix Feather' },
               desc: { es: 'Revives una vez con la mitad de la vida.', en: 'Revive once with half health.' }, apply: s => { s.revives += 1; } },
  crown:     { icon: 'r_crown', name: { es: 'Corona del rey caído', en: 'Fallen King\'s Crown' },
               desc: { es: '+25% de daño.', en: '+25% damage.' }, apply: s => { s.damage += 0.25; } },
  hourglass: { icon: 'r_hourglass', name: { es: 'Reloj de arena', en: 'Hourglass' },
               desc: { es: 'Las armas se recargan un 15% más rápido.', en: 'Weapons recharge 15% faster.' }, apply: s => { s.cooldown *= 0.85; } },
  lodestone: { icon: 'r_magnet', name: { es: 'Imán ancestral', en: 'Ancient Lodestone' },
               desc: { es: 'Radio de recogida enorme y +10% de experiencia.', en: 'Huge pickup radius and +10% experience.' }, apply: s => { s.magnetMul += 1.5; s.xpMul += 0.1; } },
  chalice:   { icon: 'r_chalice', name: { es: 'Cáliz de la vida', en: 'Chalice of Life' },
               desc: { es: '+40% de vida máxima y te cura por completo.', en: '+40% max health and fully heals you.' }, apply: s => { s.hpMul += 0.4; }, onPick: g => { g.healFull = true; } },
  clover:    { icon: 'r_clover', name: { es: 'Trébol dorado', en: 'Golden Clover' },
               desc: { es: '+40% de oro y +20% de experiencia.', en: '+40% gold and +20% experience.' }, apply: s => { s.goldMul += 0.4; s.xpMul += 0.2; } },
  cloak:     { icon: 'r_cloak', name: { es: 'Capa de sombras', en: 'Shadow Cloak' },
               desc: { es: '+15% de velocidad y 12% de esquivar golpes.', en: '+15% speed and 12% dodge chance.' }, apply: s => { s.speedMul += 0.15; s.dodge += 0.12; } },
  grimoire:  { icon: 'r_grimoire', name: { es: 'Grimorio prohibido', en: 'Forbidden Grimoire' },
               desc: { es: '+1 proyectil en todas las armas.', en: '+1 projectile for all weapons.' }, apply: s => { s.amount += 1; } },
  dragon:    { icon: 'r_dragon', name: { es: 'Corazón de dragón', en: 'Dragon Heart' },
               desc: { es: '+1,5 de vida por segundo y +1 armadura.', en: '+1.5 health per second and +1 armor.' }, apply: s => { s.regen += 1.5; s.armor += 1; } },
};

// ---------------------------------------------------------------
//  TIENDA: mejoras permanentes que se compran con oro
// ---------------------------------------------------------------
const META_UPGRADES = [
  { id: 'm_hp', icon: 'i_vigor', max: 5, cost: 60, name: { es: 'Vida máxima', en: 'Max health' },
    desc: { es: '+10 de vida por nivel', en: '+10 health per level' }, apply: (s, l) => { s.maxHp += 10 * l; } },
  { id: 'm_might', icon: 'i_might', max: 5, cost: 80, name: { es: 'Fuerza', en: 'Might' },
    desc: { es: '+5% de daño por nivel', en: '+5% damage per level' }, apply: (s, l) => { s.damage += 0.05 * l; } },
  { id: 'm_armor', icon: 'i_armor', max: 3, cost: 120, name: { es: 'Armadura', en: 'Armor' },
    desc: { es: '+1 de armadura por nivel', en: '+1 armor per level' }, apply: (s, l) => { s.armor += l; } },
  { id: 'm_speed', icon: 'i_boots', max: 3, cost: 70, name: { es: 'Velocidad', en: 'Speed' },
    desc: { es: '+5% de velocidad por nivel', en: '+5% speed per level' }, apply: (s, l) => { s.speedMul += 0.05 * l; } },
  { id: 'm_magnet', icon: 'i_magnet', max: 3, cost: 50, name: { es: 'Imán', en: 'Magnet' },
    desc: { es: '+15% de radio de recogida', en: '+15% pickup radius' }, apply: (s, l) => { s.magnetMul += 0.15 * l; } },
  { id: 'm_regen', icon: 'i_regen', max: 3, cost: 100, name: { es: 'Recuperación', en: 'Recovery' },
    desc: { es: '+0,2 de vida por segundo', en: '+0.2 health per second' }, apply: (s, l) => { s.regen += 0.2 * l; } },
  { id: 'm_cooldown', icon: 'i_haste', max: 5, cost: 100, name: { es: 'Recarga', en: 'Cooldown' },
    desc: { es: 'Armas un 3% más rápidas', en: 'Weapons 3% faster' }, apply: (s, l) => { s.cooldown *= Math.pow(0.97, l); } },
  { id: 'm_xp', icon: 'i_wisdom', max: 5, cost: 70, name: { es: 'Crecimiento', en: 'Growth' },
    desc: { es: '+6% de experiencia', en: '+6% experience' }, apply: (s, l) => { s.xpMul += 0.06 * l; } },
  { id: 'm_greed', icon: 'i_gold', max: 5, cost: 60, name: { es: 'Codicia', en: 'Greed' },
    desc: { es: '+10% de oro', en: '+10% gold' }, apply: (s, l) => { s.goldMul += 0.1 * l; } },
  { id: 'm_revive', icon: 'r_phoenix', max: 1, cost: 600, name: { es: 'Segunda vida', en: 'Second life' },
    desc: { es: 'Revives una vez por partida', en: 'Revive once per run' }, apply: (s, l) => { s.revives += l; } },
];
function metaCost(m, level) { return Math.round(m.cost * Math.pow(1.75, level)); }

// ---------------------------------------------------------------
//  CURAS (aparecen de vez en cuando; hay que pasar por encima)
//  heal = parte de la vida máxima que recupera
//  weight = probabilidad relativa cuando un enemigo suelta una cura
// ---------------------------------------------------------------
const HEALS = {
  small:  { sprite: 'apple',  heal: 0.15, weight: 65 }, // manzana
  medium: { sprite: 'food',   heal: 0.30, weight: 28 }, // pollo asado
  large:  { sprite: 'potion', heal: 0.60, weight: 7 },  // poción grande
};
const HEAL_DROP_CHANCE = 0.015; // probabilidad de que un enemigo suelte una cura
const HEAL_MIN_GAP = 18;        // segundos mínimos entre curas soltadas por enemigos

// ---------------------------------------------------------------
//  ENEMIGOS
//  ai: chase (persigue), wavy (zigzag), charge (embiste), ranged (dispara)
// ---------------------------------------------------------------
const TOXIC = { l: '#c27be8', e: '#7a3fa8', w: '#f0d8ff' };
const ENEMIES = {
  slime:       { sprite: 'slime', hp: 10, speed: 52, dmg: 5, xp: 1, r: 10, scale: 2, ai: 'chase', split: 'slime_small' },
  slime_small: { sprite: 'slime', hp: 4, speed: 74, dmg: 4, xp: 1, r: 8, scale: 1.8, ai: 'chase' },
  bat:         { sprite: 'bat', hp: 6, speed: 100, dmg: 5, xp: 1, r: 9, scale: 2, ai: 'wavy', fly: true },
  wolf:        { sprite: 'wolf', hp: 20, speed: 66, dmg: 9, xp: 2, r: 12, scale: 2, ai: 'charge' },
  goblin:      { sprite: 'goblin', hp: 14, speed: 55, dmg: 6, xp: 2, r: 10, scale: 2, ai: 'ranged',
                 shot: { speed: 170, dmg: 7, cd: 2.8, range: 280, color: '#d9b25a', r: 4 } },
  zombie:      { sprite: 'zombie', hp: 34, speed: 36, dmg: 10, xp: 2, r: 11, scale: 2, ai: 'chase' },
  skeleton:    { sprite: 'skeleton', hp: 20, speed: 60, dmg: 8, xp: 2, r: 10, scale: 2, ai: 'chase' },
  ghost:       { sprite: 'ghost', hp: 16, speed: 66, dmg: 8, xp: 2, r: 10, scale: 2, ai: 'wavy', fly: true, alpha: 0.75 },
  skel_archer: { sprite: 'skeleton', pal: { m: '#c9d6e8', M: '#7e8fa8' }, hp: 20, speed: 52, dmg: 7, xp: 3, r: 10, scale: 2, ai: 'ranged',
                 shot: { speed: 200, dmg: 8, cd: 2.5, range: 300, color: '#e6dcc2', r: 4 } },
  spider:      { sprite: 'spider', pal: { P: '#3b3346', p: '#5a4f68' }, hp: 14, speed: 112, dmg: 7, xp: 2, r: 10, scale: 2, ai: 'chase' },
  mummy:       { sprite: 'mummy', hp: 60, speed: 38, dmg: 12, xp: 4, r: 11, scale: 2, ai: 'chase' },
  toxic_slime: { sprite: 'slime', pal: TOXIC, hp: 24, speed: 56, dmg: 8, xp: 3, r: 11, scale: 2.2, ai: 'chase', split: 'toxic_small' },
  toxic_small: { sprite: 'slime', pal: TOXIC, hp: 8, speed: 80, dmg: 5, xp: 1, r: 9, scale: 1.9, ai: 'chase' },
  cultist:     { sprite: 'cultist', hp: 30, speed: 48, dmg: 9, xp: 4, r: 10, scale: 2, ai: 'ranged',
                 shot: { speed: 140, dmg: 10, cd: 2.6, range: 300, color: '#c070ff', r: 6, homing: true } },
  darkknight:  { sprite: 'knight', pal: { x: '#3a3448', X: '#221d2c', v: '#7a1020', s: '#ff4040', y: '#cc2222' },
                 hp: 90, speed: 52, dmg: 16, xp: 6, r: 12, scale: 2, ai: 'charge' },
  imp:         { sprite: 'imp', hp: 22, speed: 120, dmg: 8, xp: 3, r: 9, scale: 2, ai: 'wavy' },
  gargoyle:    { sprite: 'gargoyle', hp: 40, speed: 104, dmg: 11, xp: 4, r: 12, scale: 2, ai: 'wavy', fly: true },
  darkmage:    { sprite: 'cultist', pal: { p: '#c23a3a', P: '#6e1420', r: '#ffd75a' }, hp: 40, speed: 46, dmg: 10, xp: 5, r: 10, scale: 2, ai: 'ranged',
                 shot: { speed: 220, dmg: 12, cd: 2.2, range: 320, color: '#ff5a3a', r: 5, spread: 3 } },
};

// ---------------------------------------------------------------
//  JEFES (cada uno tiene una secuencia de ataques que se repite)
// ---------------------------------------------------------------
const BOSSES = {
  king_slime: {
    name: { es: 'Rey Slime', en: 'Slime King' },
    sprite: 'slime', pal: { l: '#6fd4ff', e: '#2f7fc0', w: '#e8fbff' }, crown: true,
    scale: 6, r: 32, hp: 1400, speed: 55, dmg: 16, xp: 60, minion: 'slime',
    attacks: ['jump', 'summon', 'jump', 'chase'],
  },
  necromancer: {
    name: { es: 'Nigromante', en: 'Necromancer' },
    sprite: 'cultist', pal: { p: '#3d3d4a', P: '#1d1d26', r: '#7dff9a', s: '#c9d6e8' },
    scale: 4.5, r: 26, hp: 2600, speed: 45, dmg: 16, xp: 120, minion: 'skeleton',
    attacks: ['ring', 'summon', 'teleport', 'ring', 'spiral'],
  },
  spider_queen: {
    name: { es: 'Reina Araña', en: 'Spider Queen' },
    sprite: 'spider', pal: { P: '#5a1f2e', p: '#8c2f44', r: '#f5d34a' },
    scale: 5, r: 30, hp: 4200, speed: 70, dmg: 18, xp: 200, minion: 'spider',
    attacks: ['dash', 'web', 'summon', 'dash', 'web'],
  },
  dark_lord: {
    name: { es: 'Señor Oscuro', en: 'Dark Lord' },
    sprite: 'knight', pal: { x: '#2a2233', X: '#15101c', v: '#a01830', s: '#ff3030', y: '#ffd75a' }, crown: true,
    scale: 4.5, r: 28, hp: 6500, speed: 60, dmg: 22, xp: 300, minion: 'darkknight',
    attacks: ['sweep', 'spiral', 'dash', 'summon', 'meteors'],
  },
};

// ---------------------------------------------------------------
//  ZONAS
//  enemies: [tipo, peso (probabilidad), segundo de la zona en que empieza]
// ---------------------------------------------------------------
const ZONE_BOSS_TIME = 210; // segundos en cada zona hasta que llega el jefe

const ZONES = [
  { id: 'forest', name: { es: 'Bosque Susurrante', en: 'Whispering Forest' },
    ground: { type: 'grass', base: '#3d6b35', d1: '#355f2e', d2: '#4b843f', detail: ['#e8d86a', '#e07b9a', '#f4f1ea'] },
    wall: { base: '#7b7d85', dark: '#4d4f57', light: '#9c9ea7' },
    obstacles: [['tree', null, 0.7], ['bush', null, 0.3]],
    enemies: [['slime', 3, 0], ['bat', 3, 0], ['wolf', 2, 40], ['goblin', 2, 80]],
    boss: 'king_slime', fog: '200,220,200' },
  { id: 'graveyard', name: { es: 'Cementerio Olvidado', en: 'Forgotten Graveyard' },
    ground: { type: 'grass', base: '#3c4a3e', d1: '#334036', d2: '#48584a', detail: ['#e6dcc2', '#6d6f75'] },
    wall: { base: '#6d6a72', dark: '#45434b', light: '#8a8790' },
    obstacles: [['tomb', null, 0.6], ['tree', { e: '#6b5a4a', l: '#8a7a66', E: '#4a3c30' }, 0.4]],
    enemies: [['zombie', 3, 0], ['skeleton', 3, 0], ['ghost', 2, 40], ['skel_archer', 2, 80]],
    boss: 'necromancer', fog: '190,200,215' },
  { id: 'crypt', name: { es: 'Cripta Profunda', en: 'Deep Crypt' },
    ground: { type: 'stone', base: '#4a4552', d1: '#433e4a', d2: '#2f2b36', detail: ['#6a5f7a'] },
    wall: { base: '#5d5866', dark: '#3a3642', light: '#7a7584' },
    obstacles: [['pillar', null, 0.6], ['tomb', { g: '#7a7584', G: '#4a4552' }, 0.4]],
    enemies: [['spider', 3, 0], ['mummy', 2, 0], ['toxic_slime', 2, 40], ['cultist', 2, 80]],
    boss: 'spider_queen', fog: '150,130,170' },
  { id: 'castle', name: { es: 'Castillo del Señor Oscuro', en: 'Dark Lord\'s Castle' },
    ground: { type: 'stone', base: '#5a4a4a', d1: '#4f4040', d2: '#3a2e2e', detail: ['#8c2230'] },
    wall: { base: '#6e6460', dark: '#463e3b', light: '#8c827e' },
    obstacles: [['pillar', { m: '#9a8f8a', M: '#6e6460' }, 0.5], ['barrel', null, 0.5]],
    enemies: [['darkknight', 2, 0], ['imp', 3, 0], ['gargoyle', 2, 40], ['darkmage', 2, 80]],
    boss: 'dark_lord', fog: '170,120,120' },
  { id: 'abyss', name: { es: 'El Abismo', en: 'The Abyss' }, endless: true,
    ground: { type: 'grass', base: '#1e1828', d1: '#251d33', d2: '#2c2240', detail: ['#a65fd6', '#5d2f86'] },
    wall: { base: '#3a3048', dark: '#241d2e', light: '#4f4262' },
    obstacles: [['crystal', null, 0.6], ['crystal', { c: '#e08aff', b: '#7a3fa8' }, 0.4]],
    enemies: [['bat', 2, 0], ['ghost', 2, 0], ['wolf', 2, 0], ['spider', 2, 0], ['mummy', 2, 0], ['imp', 2, 0],
              ['skel_archer', 1, 0], ['cultist', 1, 0], ['darkknight', 2, 30], ['gargoyle', 2, 30], ['darkmage', 1, 60], ['toxic_slime', 2, 0]],
    boss: null, fog: '120,90,150' },
];
