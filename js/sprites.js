// =============================================================
//  PIXEL ART DIBUJADO POR CÓDIGO
//  Cada sprite es una lista de filas de texto. Cada letra es un
//  color de la paleta y '.' es transparente. ¡Puedes editarlos!
// =============================================================

const PALETTE = {
  k: '#1a1423', // contorno oscuro
  w: '#f4f1ea', // blanco
  g: '#8d939c', G: '#565c66', // grises
  s: '#f1c9a5', S: '#c98e6b', // piel
  r: '#d1403f', R: '#8c2230', // rojos
  o: '#ee8a3a',               // naranja
  y: '#f5d34a', Y: '#b8892c', // dorados
  l: '#86d457', e: '#3f9a3a', E: '#245c2c', // verdes
  b: '#4f8fe0', B: '#2c4f9a', // azules
  c: '#8fe6f2',               // cian
  p: '#a65fd6', P: '#5d2f86', // morados
  n: '#8a5a3a', N: '#553521', // marrones
  m: '#e6dcc2', M: '#a89f86', // hueso / venda
  z: '#7f9f6b',               // piel de zombi
  x: '#9aa3ad', X: '#5d6670', v: '#b03a3a', // colores variables (armadura/capa)
};

const SPRITE_MAPS = {
  // ---------- Héroes ----------
  knight: [
    '......kkkk......',
    '.....kxxxxk.....',
    '....kxxxxxxk....',
    '....kxkkkkxk....',
    '....kxksskxk....',
    '....kxxxxxxk....',
    '.....kxxxxk.....',
    '...kkXxxxxXkk...',
    '..kvkxxyyxxkvk..',
    '..kvkxxxxxxkvk..',
    '..kvkXxxxxXkvk..',
    '..kvkkxxxxkkvk..',
    '...kkkXxxXkkk...',
    '.....kxkkxk.....',
    '.....kXk.kXk....',
    '.....kkk.kkk....',
  ],
  mage: [
    '.......kk.......',
    '......kxxk......',
    '.....kxxxxk.....',
    '....kxxyxxxk....',
    '...kkkkkkkkkk...',
    '....kssssssk....',
    '....kskssksk....',
    '....kssssssk....',
    '...kxkwwwwkxk...',
    '..kxxkwwwwkxxk..',
    '..ksxxxwwxxxsk..',
    '...kxxxyyxxxk...',
    '...kxxxxxxxxk...',
    '..kxxxxxxxxxxk..',
    '..kXXXXXXXXXXk..',
    '...kkkkkkkkkk...',
  ],
  archer: [
    '................',
    '.....kkkkk......',
    '....kvvvvvk.....',
    '...kvvvvvvvk....',
    '...kvkssssk.....',
    '....ksksskk.....',
    '....kssssk......',
    '...kkxxxxkk.....',
    '..knkxxxxkxk....',
    '..knkxyyxksk....',
    '..knkxxxxkk.....',
    '...kkXxxXk......',
    '....kxkkxk......',
    '....kXk.kXk.....',
    '....kNk.kNk.....',
    '....kkk.kkk.....',
  ],
  crownSmall: ['y.y.y', 'yyyyy'],
  crown: ['y...y...y', 'yy.yyy.yy', 'yyyyryyyy', 'YYYYYYYYY'],

  // ---------- Enemigos ----------
  slime: [
    '....kkkk....',
    '..kkllllkk..',
    '.kllwwllllk.',
    'kllwwllllllk',
    'kllkllllkllk',
    'kllkllllkllk',
    'kllllllllllk',
    'keelllllleek',
    '.keeeeeeeek.',
    '..kkkkkkkk..',
  ],
  bat: [
    'kk........kk',
    'kPk.k..k.kPk',
    'kPPkkkkkkPPk',
    'kPPPprrpPPPk',
    '.kPPppppPPk.',
    '..kk.pp.kk..',
    '....k..k....',
  ],
  wolf: [
    '............k.k.',
    '...........kgkgk',
    'k.........kgrggk',
    'kgkkkkkkkkgggggk',
    '.kgggggggggggkk.',
    '.kgggggggggggk..',
    '.kGgggggggggGk..',
    '..kGGk.kk.kGGk..',
    '..kGk......kGk..',
    '..kk.......kk...',
  ],
  goblin: [
    '....kkkk....',
    'k..kllllk..k',
    'lkkllllllkkl',
    '.klrllllrlk.',
    '..kllllllk..',
    '..kllkkllk..',
    '...kllllk...',
    '..knnnnnnk..',
    '.klnnYYnnlk.',
    '.klnnnnnnlk.',
    '..knnnnnnk..',
    '...kNkkNk...',
    '...kNk.kNk..',
    '...kkk.kkk..',
  ],
  zombie: [
    '...kkkkkk...',
    '..kzzzzzzk..',
    '..kzkzzkzk..',
    '..kzrzzrzk..',
    '..kzzzzzzk..',
    '...kzkkzk...',
    '..kkbbbbkk..',
    '.kzkbbbbkzzk',
    '.kzkbbbbk.kk',
    '..kkbbbbk...',
    '...kbbbbk...',
    '...kBBBBk...',
    '...kBkkBk...',
    '...kzk.kzk..',
    '...kkk.kkk..',
  ],
  skeleton: [
    '...kkkkkk...',
    '..kmmmmmmk..',
    '..kmkmmkmk..',
    '..kmmmmmmk..',
    '...kmkkmk...',
    '....kmmk....',
    '..kkmmmmkk..',
    '.kmkMmmMkmk.',
    '.kmkmmmmkmk.',
    '..kkMmmMkk..',
    '...kmmmmk...',
    '...kmkkmk...',
    '...kmk.kmk..',
    '...kmk.kmk..',
    '...kkk.kkk..',
  ],
  ghost: [
    '...kkkkkk...',
    '..kwwwwwwk..',
    '.kwwwwwwwwk.',
    '.kwkkwwkkwk.',
    '.kwkkwwkkwk.',
    '.kwwwwwwwwk.',
    '.kwwwkkwwwk.',
    '.kwwwwwwwwk.',
    '.kwwwwwwwwk.',
    '.kwwkwwwkwwk',
    '..kk.kkk.kk.',
  ],
  spider: [
    'k...kkkkkk...k',
    '.k.kPPPPPPk.k.',
    '..kPPPPPPPPk..',
    'kkkPrPPPPrPkkk',
    '..kPPPPPPPPk..',
    'kkkPPPPPPPPkkk',
    '.k.kPPPPPPk.k.',
    'k...kkkkkk...k',
  ],
  mummy: [
    '...kkkkkk...',
    '..kmMmmMmk..',
    '..kMmmmmMk..',
    '..kmymmymk..',
    '..kmmMMmmk..',
    '...kmmmmk...',
    '..kkMmmMkk..',
    '.kmkmMMmkmk.',
    '.kmkMmmMkmk.',
    '..kkmMMmkk..',
    '...kMmmMk...',
    '...kmMMmk...',
    '...kmk.kmk..',
    '...kMk.kMk..',
    '...kkk.kkk..',
  ],
  cultist: [
    '....kkkk....',
    '...kppppk...',
    '..kppppppk..',
    '..kpkkkkpk..',
    '..kpkrrkpk..',
    '..kpkkkkpk..',
    '..kppppppk..',
    '.kppPppPppk.',
    '.kpPppppPpk.',
    'kspPppppPpsk',
    '.kpPppppPpk.',
    '.kpPppppPpk.',
    '.kPPPPPPPPk.',
    '..kkkkkkkk..',
  ],
  gargoyle: [
    'kk..k....k..kk',
    'kGk.kgkkgk.kGk',
    'kGGkkggggkkGGk',
    'kGGGkrggrkGGGk',
    '.kGGkggggkGGk.',
    '..kkgGggGgkk..',
    '....kggggk....',
    '....kgGGgk....',
    '...kgk..kgk...',
    '...kk....kk...',
  ],
  imp: [
    'k........k',
    'kk.kkkk.kk',
    '.krrrrrrk.',
    '.kryrryrk.',
    '.krrrrrrk.',
    '..krkkrk..',
    '.kkrrrrkk.',
    'krkRrrRkrk',
    '...kRRk...',
    '...krrk..k',
    '..kk..kkk.',
  ],

  // ---------- Obstáculos ----------
  tree: [
    '.....kkkkkk.....',
    '...kkeeeeeekk...',
    '..keelleeeeeek..',
    '.keellleeeeeeek.',
    '.keelleeeeeEeek.',
    'keeeeeeeeeEEeeek',
    'keeleeeeeeeEeeek',
    'keeeeeeeeeeeeEEk',
    '.keEeeeeeeeeEEk.',
    '.kEEeeeEeeeEEEk.',
    '..kEEEEEEEEEEk..',
    '...kkkknnkkkk...',
    '......knNk......',
    '......knNk......',
    '......knNk......',
    '.....knnNNk.....',
    '.....kkkkkk.....',
  ],
  bush: [
    '...kkkkkk...',
    '.kkeelleekk.',
    'keelllleeeek',
    'keeleeeeeEek',
    'kEeeeeeeeEEk',
    '.kkkkkkkkkk.',
  ],
  tomb: [
    '..kkkkkk..',
    '.kggggggk.',
    'kgggGggggk',
    'kggGGGgggk',
    'kgggGggggk',
    'kgggGggggk',
    'kggggggggk',
    'kgGggggGgk',
    'kggggggggk',
    'kGGGGGGGGk',
    'kkkkkkkkkk',
  ],
  crystal: [
    '....kk....',
    '...kcck...',
    '..kcwcck..',
    '..kccbck..',
    '.kcwcbbck.',
    '.kccbbbck.',
    '.kcccbbck.',
    '..kccbck..',
    '..kccbck..',
    '...kcbk...',
    '...kkkk...',
  ],
  barrel: [
    '..kkkkkk..',
    '.knnnnnnk.',
    'kGGGGGGGGk',
    'knnNnnNnnk',
    'knnNnnNnnk',
    'kGGGGGGGGk',
    'knnNnnNnnk',
    'knnNnnNnnk',
    'kGGGGGGGGk',
    '.knnnnnnk.',
    '..kkkkkk..',
  ],
  pillar: (function () {
    const rows = ['kkkkkkkkkkkk', 'kmmmmmmmmmMk', 'kkkkkkkkkkkk'];
    for (let i = 0; i < 14; i++) rows.push(i % 5 === 2 ? '.kMmmmmmMMk.' : '.kmmMmmmMMk.');
    rows.push('kkkkkkkkkkkk', 'kmmmmmmmmmMk', 'kkkkkkkkkkkk');
    return rows;
  })(),

  // ---------- Objetos ----------
  gem: ['..kk..', '.kcck.', 'kcwcck', 'kccbck', 'kcbbck', '.kcbk.', '..kk..'],
  coin: ['.kkkk.', 'kyywyk', 'kyYyyk', 'kyYyyk', 'kyyyYk', '.kkkk.'],
  food: ['.kkkk.....', 'korrok....', 'korrrok...', 'kooorrokk.', '.kooookmmk', '..kkkkkmmk', '......kkk.'],
  apple: ['....nl..', '..kkkk..', '.krrrrk.', 'krwrrrrk', 'krrrrrrk', 'krrrrrRk', '.krrRRk.', '..kkkk..'],
  potion: [
    '....kk....',
    '...kNNk...',
    '...kwwk...',
    '..kkwwkk..',
    '.krrrrrrk.',
    'krwrrrrrrk',
    'krwrrrrrrk',
    'krrrrrrrRk',
    'krrrrrrRRk',
    '.krrrRRRk.',
    '..kkkkkk..',
  ],
  chest: [
    '.kkkkkkkkkkkk.',
    'knnnnnnnnnnnnk',
    'knnnnnnnnnnnnk',
    'kYYYYYkkYYYYYk',
    'kkkkkkyykkkkkk',
    'knnnnkyyknnnnk',
    'knnnnnkknnnnnk',
    'knNnnnnnnnnNnk',
    'kYYYYYYYYYYYYk',
    'kkkkkkkkkkkkkk',
  ],

  // ---------- Iconos de mejoras (8x8) ----------
  i_sword:     ['......kw', '.....kwg', '....kwg.', 'y..kwg..', '.ykwg...', '..yy....', '.n.yy...', 'n.......'],
  i_hammer:    ['.kkkkk..', 'kgggggk.', 'kgwgggk.', '.kknkk..', '...nk...', '...nk...', '...nk...', '...kk...'],
  i_fireball:  ['...yy...', '..yooy..', '.yoorro.', 'yoorrroy', 'yorrrroy', '.yorroy.', '..yooy..', '...yy...'],
  i_frost:     ['...c....', '.c.c.c..', '..ccc...', 'cccwccc.', '..ccc...', '.c.c.c..', '...c....', '........'],
  i_arcane:    ['....p...', '...pwp..', 'pppwwwpp', '.pwwwwp.', '..pwwp..', '.pp..pp.', 'p......p', '........'],
  i_bow:       ['..kn....', '.kn.w...', 'kn..w...', 'kn.gwyyy', 'kn..w...', '.kn.w...', '..kn....', '........'],
  i_rain:      ['.n..n..n', '.n..n..n', '.n..n..n', '.n..n..n', 'gwg.gwg.', '.g...g..', '........', 'eeeeeeee'],
  i_knife:     ['........', '......kw', '.....kwk', '....kwk.', '...kwk..', '.nkwk...', '..nk....', '.n.n....'],
  i_axe:       ['.kkk....', 'kgggk...', 'kgwggn..', 'kgggknn.', '.kkk.nn.', '.....nn.', '......nn', '.......n'],
  i_holywater: ['...kk...', '...ww...', '..kwwk..', '.kcwcck.', 'kcwwwcck', 'kccwccck', '.kcccck.', '..kkkk..'],
  i_orbs:      ['...cc...', '...cc...', '........', 'cc.yy.cc', 'cc.yy.cc', '........', '...cc...', '...cc...'],
  i_lightning: ['....yyk.', '...yyk..', '..yyk...', '.yyyyyk.', '...yyk..', '..yyk...', '.yyk....', '.yk.....'],
  i_aura:      ['..yyyy..', '.y....y.', 'y..ww..y', 'y.wwww.y', 'y.wwww.y', 'y..ww..y', '.y....y.', '..yyyy..'],
  i_vigor:     ['.rr..rr.', 'rwrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...', '........'],
  i_might:     ['...rr...', '..rrrr..', '.rrrrrr.', 'rr.rr.rr', '...rr...', '...rr...', '...rr...', '...rr...'],
  i_haste:     ['kkkkkkkk', '.kcccck.', '..kcck..', '...kk...', '..k..k..', '.k.cc.k.', 'kkkkkkkk', '........'],
  i_boots:     ['..kkk...', '..knnk..', '..knnk..', '..knnk..', '..knnnkk', '.knnnnnk', '.kNNNNNk', '..kkkkk.'],
  i_magnet:    ['ww....ww', 'ww....ww', 'rr....bb', 'rr....bb', 'rr....bb', '.rr..bb.', '..rrbb..', '........'],
  i_armor:     ['kkkkkkkk', 'kbbbbbbk', 'kbbwwbbk', 'kbwwwwbk', 'kbbwwbbk', '.kbbbbk.', '..kbbk..', '...kk...'],
  i_regen:     ['..kkkk..', '..klek..', 'kkklekkk', 'klllleek', 'keeeeeek', 'kkkleekk', '..klek..', '..kkkk..'],
  i_area:      ['p......p', '.p....p.', '..pppp..', '..p..p..', '..p..p..', '..pppp..', '.p....p.', 'p......p'],
  i_amount:    ['y...y...', '.y...y..', '..y...y.', '...y...y', '..y...y.', '.y...y..', 'y...y...', '........'],
  i_wisdom:    ['kkkkkkk.', 'kbbbbbkk', 'kbyybbkw', 'kbbbbbkw', 'kbyyybkw', 'kbbbbbkw', 'kkkkkkkw', '.wwwwwww'],
  i_thorns:    ['g.g..g.g', '.kkkkkk.', 'gkrrrrkg', '.krwwrk.', 'gkrrrrkg', '.krrrrk.', '..krrk..', 'g..kk..g'],
  i_lionheart: ['.yy..yy.', 'ywyyyyyy', 'yyyyyyyy', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '...yy...', '........'],
  i_mana:      ['...kk...', '...nn...', '..kwwk..', '.kppppk.', 'kpwppppk', 'kppppppk', '.kppppk.', '..kkkk..'],
  i_hawk:      ['........', '..kkkk..', '.kwwwwk.', 'kwwyywwk', 'kwykkywk', 'kwwyywwk', '.kwwwwk.', '..kkkk..'],
  i_quiver:    ['w.w.w...', 'n.n.n...', 'knnnnk..', 'kNnnNk..', 'knnnnk..', 'kNnnNk..', 'knnnnk..', '.kkkk...'],
  i_gold:      ['..kkkk..', '.kyyyyk.', 'kyywyyyk', 'kyYyyyyk', 'kyYyyyyk', 'kyyyyYyk', '.kyyyyk.', '..kkkk..'],
  i_heal:      ['.kkkk...', 'korrok..', 'korrrok.', 'kooorrok', '.kooookm', '..kkkkkm', '.......m', '........'],
  // reliquias
  r_phoenix:   ['o......o', 'oo.rr.oo', 'ooorrooo', '.oyrryo.', '..yrry..', '...rr...', '..o..o..', '.o....o.'],
  r_crown:     ['........', 'y..y..y.', 'yy.y.yy.', 'yyyyyyy.', 'yryyryy.', 'yyyyyyy.', 'YYYYYYY.', '........'],
  r_hourglass: ['YYYYYYYY', '.kyyyyk.', '..kyyk..', '...kk...', '..k..k..', '.kyyyyk.', 'YYYYYYYY', '........'],
  r_magnet:    ['ww....ww', 'ww....ww', 'pp....pp', 'pp....pp', 'pp....pp', '.pp..pp.', '..pppp..', '........'],
  r_chalice:   ['yyyyyyyy', 'yrrrrrry', '.yrrrry.', '..yyyy..', '...yy...', '...yy...', '..yyyy..', '.YYYYYY.'],
  r_clover:    ['.ll.ll..', 'lllllll.', '.lllll..', 'lllllll.', '.ll.ll..', '...e....', '....e...', '........'],
  r_cloak:     ['..kkkk..', '.kPPPPk.', '.kPkkPk.', 'kPPPPPPk', 'kPPPPPPk', 'kPPPPPPk', 'kPPPPPPk', 'kkkkkkkk'],
  r_grimoire:  ['kkkkkkk.', 'kRRRRRkk', 'kRyyyRkw', 'kRyryRkw', 'kRyyyRkw', 'kRRRRRkw', 'kkkkkkkw', '.wwwwwww'],
  r_dragon:    ['.pp..pp.', 'pwpppppp', 'pppprppp', 'ppprrrpp', '.pprrpp.', '..pppp..', '...pp...', '........'],
};

const Sprites = {
  cache: {},

  // Convierte un mapa de texto en una imagen (1 píxel por letra)
  build(map, pal) {
    const h = map.length;
    const w = Math.max(...map.map(r => r.length));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      const row = map[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const col = (pal && pal[ch]) || PALETTE[ch];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    return c;
  },

  // Sprite con caché. 'pal' cambia colores, 'key' identifica la variante.
  get(name, pal, key) {
    const k = name + '|' + (key || '');
    if (!this.cache[k]) this.cache[k] = this.build(SPRITE_MAPS[name], pal);
    return this.cache[k];
  },

  // Fotograma de caminar: 0 = quieto, 1 = levanta la pierna izquierda,
  // 2 = levanta la derecha. Se crea subiendo 1 píxel la mitad de las filas de abajo.
  frame(name, pal, key, step) {
    if (!step) return this.get(name, pal, key);
    const k = name + '|' + (key || '') + '|step' + step;
    if (!this.cache[k]) {
      const base = this.get(name, pal, key);
      const w = base.width, h = base.height;
      const legs = Math.max(2, Math.round(h * 0.22)), top = h - legs, half = Math.floor(w / 2);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.drawImage(base, 0, 0, w, top, 0, 0, w, top);                                        // cuerpo
      x.drawImage(base, 0, top, half, legs, 0, top - (step === 1 ? 1 : 0), half, legs);      // pierna izquierda
      x.drawImage(base, half, top, w - half, legs, half, top - (step === 2 ? 1 : 0), w - half, legs); // derecha
      this.cache[k] = c;
    }
    return this.cache[k];
  },

  // Silueta de un solo color (destello al recibir daño, contorno de élite)
  solid(name, pal, key, color, step = 0) {
    const k = name + '|' + (key || '') + '|solid' + color + '|' + step;
    if (!this.cache[k]) {
      const base = this.frame(name, pal, key, step);
      const c = document.createElement('canvas');
      c.width = base.width; c.height = base.height;
      const x = c.getContext('2d');
      x.drawImage(base, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = color;
      x.fillRect(0, 0, c.width, c.height);
      this.cache[k] = c;
    }
    return this.cache[k];
  },

  // Imagen ampliada para usar en los menús (HTML)
  icon(name, scale = 6, pal, key) {
    const k = name + '|' + (key || '') + '|icon' + scale;
    if (!this.cache[k]) {
      const base = this.get(name, pal, key);
      const c = document.createElement('canvas');
      c.width = base.width * scale; c.height = base.height * scale;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.drawImage(base, 0, 0, c.width, c.height);
      this.cache[k] = c.toDataURL();
    }
    return this.cache[k];
  },

  // Suelo de cada zona (un mosaico que se repite)
  ground(zone) {
    const k = 'ground|' + zone.id;
    if (this.cache[k]) return this.cache[k];
    const g = zone.ground, P = 2, S = 48;
    const c = document.createElement('canvas');
    c.width = c.height = S * P;
    const x = c.getContext('2d');
    const rnd = seededRandom(zone.id.length * 97 + 13);
    x.fillStyle = g.base; x.fillRect(0, 0, S * P, S * P);
    if (g.type === 'stone') {
      // baldosas de piedra
      for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 3; tx++) {
        const off = (ty % 2) * 8;
        x.fillStyle = rnd() < 0.5 ? g.d1 : g.base;
        x.fillRect(((tx * 16 + off) % S) * P, ty * 16 * P, 16 * P, 16 * P);
        x.fillStyle = g.d2;
        x.fillRect(((tx * 16 + off) % S) * P, ty * 16 * P, 16 * P, P);
        x.fillRect(((tx * 16 + off) % S) * P, ty * 16 * P, P, 16 * P);
      }
      for (let i = 0; i < 30; i++) {
        x.fillStyle = rnd() < 0.5 ? g.d1 : g.d2;
        x.fillRect(Math.floor(rnd() * S) * P, Math.floor(rnd() * S) * P, P, P);
      }
    } else {
      // hierba / tierra con motas
      for (let i = 0; i < 140; i++) {
        x.fillStyle = rnd() < 0.5 ? g.d1 : g.d2;
        const px = Math.floor(rnd() * S), py = Math.floor(rnd() * S);
        x.fillRect(px * P, py * P, P, P * (rnd() < 0.4 ? 2 : 1));
      }
    }
    // pequeños detalles (flores, huesos, runas...)
    (g.detail || []).forEach(col => {
      for (let i = 0; i < 2; i++) {
        const px = Math.floor(rnd() * (S - 2)), py = Math.floor(rnd() * (S - 2));
        x.fillStyle = col;
        x.fillRect(px * P, py * P, P, P);
        x.fillRect((px + 1) * P, (py + 1) * P, P, P);
      }
    });
    this.cache[k] = c;
    return c;
  },

  // Bloque de muro (normal, agrietado o techo de una sala oculta)
  wall(zone, kind) {
    const k = 'wall|' + zone.id + '|' + kind;
    if (this.cache[k]) return this.cache[k];
    const w = zone.wall, P = 2, S = 20;
    const c = document.createElement('canvas');
    c.width = c.height = S * P;
    const x = c.getContext('2d');
    const px = (a, b, cw, ch, col) => { x.fillStyle = col; x.fillRect(a * P, b * P, cw * P, ch * P); };
    if (kind === 'roof') {
      px(0, 0, S, S, w.dark);
      for (let r = 0; r < 4; r++) px(0, r * 5 + 4, S, 1, w.base);
      px(0, 0, S, 1, w.light);
    } else {
      px(0, 0, S, S, w.base);
      // ladrillos
      for (let r = 0; r < 4; r++) {
        px(0, r * 5, S, 1, w.dark);
        const off = (r % 2) * 5;
        for (let b = off; b < S; b += 10) px(b, r * 5, 1, 5, w.dark);
        px(0, r * 5 + 1, S, 1, w.light);
      }
      px(0, S - 1, S, 1, '#1a1423');
      if (kind === 'cracked') {
        // grietas discretas: hay que fijarse para verlas
        const crack = [[9, 2], [10, 3], [10, 4], [9, 5], [10, 6], [11, 7], [11, 8], [10, 9], [12, 10], [13, 11], [12, 12], [9, 10], [8, 11], [11, 13], [11, 14], [12, 15]];
        crack.forEach(([a, b]) => px(a, b, 1, 1, '#1a1423'));
      }
    }
    this.cache[k] = c;
    return c;
  },
};

// Dibuja una imagen centrada en (x, y), ampliada 'scale' veces.
// sx/sy permiten aplastar o estirar (los pies se quedan en su sitio).
function drawSprite(ctx, img, x, y, scale, flip, sx = 1, sy = 1) {
  const w = img.width * scale * sx, h = img.height * scale * sy;
  y += (img.height * scale - h) / 2;
  if (flip) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(img, Math.round(-w / 2), Math.round(-h / 2), w, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  }
}
