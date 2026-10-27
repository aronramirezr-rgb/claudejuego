// =============================================================
//  MENÚS (HTML encima del juego)
// =============================================================

function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const UI = {
  root: null,
  keyHandler: null,
  selectedChar: 'knight',

  init() { this.root = document.getElementById('ui'); },

  clear() { this.root.innerHTML = ''; this.keyHandler = null; },

  // Muestra una pantalla y conecta los botones con data-act="..."
  show(html, actions, cls = '') {
    this.root.innerHTML = `<div class="screen ${cls}">${html}</div>`;
    this.keyHandler = null;
    this.root.querySelectorAll('[data-act]').forEach(el => {
      el.addEventListener('click', ev => {
        const [act, arg] = el.dataset.act.split(':');
        if (actions[act]) { ev.stopPropagation(); Sound.play('select'); actions[act](arg, el, ev); }
      });
    });
  },

  // ---------------------------------------------------------------
  //  Menú principal
  // ---------------------------------------------------------------
  mainMenu() {
    Music.start(5);
    this.show(`
      <h1>${t('title')}</h1>
      <div class="subtitle">${t('subtitle')}</div>
      <div class="col" style="margin-top:18px">
        <button class="btn gold" data-act="play">${t('play')}</button>
        <button class="btn" data-act="shop">${t('shop')}</button>
        <button class="btn" data-act="options">${t('options')}</button>
      </div>
      <div class="panel hint" style="margin-top:14px">
        <span class="gold-text">${t('gold')}: ${SaveData.gold}</span> &nbsp;·&nbsp;
        ${t('bestTime')}: ${fmtTime(SaveData.bestTime)} &nbsp;·&nbsp;
        ${t('bestZone')}: ${SaveData.bestZone}
      </div>
      <div class="hint">${t('controls')}</div>
    `, {
      play: () => this.charSelect(),
      shop: () => this.shop(),
      options: () => this.options(() => this.mainMenu()),
    }, 'clear');
    this.keyHandler = e => { if (e.code === 'Enter') { this.charSelect(); return true; } };
  },

  // ---------------------------------------------------------------
  //  Elegir héroe
  // ---------------------------------------------------------------
  charSelect() {
    const cards = Object.values(CHARACTERS).map(ch => {
      const locked = !SaveData.unlocked.includes(ch.id);
      const sel = this.selectedChar === ch.id;
      const excl = ch.exclusives.map(id => `<img src="${Sprites.icon(UPGRADES[id].icon, 4)}" title="${tr(UPGRADES[id].name)}">`).join('');
      return `
        <div class="card hero ${sel ? 'selected' : ''} ${locked ? 'locked' : ''}" data-act="pick:${ch.id}" style="--c:${sel ? '#f3d77a' : '#6c5a8e'}">
          <img src="${Sprites.icon(ch.sprite, 6, ch.tiers[0], ch.id + '0')}">
          <div class="name">${tr(ch.name)}</div>
          <div class="desc">${tr(ch.desc)}</div>
          <div class="stats">
            ${t('hp')}: <b>${ch.hp}</b> &nbsp; ${t('speed')}: <b>${ch.speed}</b> &nbsp; ${t('armor')}: <b>${ch.armor}</b><br>
            ${t('startWeapon')}: <b>${tr(UPGRADES[ch.weapon].name)}</b>
          </div>
          <div class="tag">${t('exclusives')}</div>
          <div class="excl">${excl}</div>
          ${locked ? `<button class="btn small gold" data-act="unlock:${ch.id}" ${SaveData.gold < ch.cost ? 'disabled' : ''}>${t('unlockFor', { cost: ch.cost })}</button>` : ''}
        </div>`;
    }).join('');
    const canStart = SaveData.unlocked.includes(this.selectedChar);
    this.show(`
      <h2>${t('chooseHero')}</h2>
      <div class="cards">${cards}</div>
      <div class="row">
        <button class="btn" data-act="back">${t('back')}</button>
        <button class="btn gold" data-act="start" ${canStart ? '' : 'disabled'}>${t('start')}</button>
      </div>
      <div class="hint"><span class="gold-text">${t('gold')}: ${SaveData.gold}</span></div>
    `, {
      // solo marca la tarjeta elegida, sin volver a dibujar la pantalla
      pick: (id, el) => {
        this.selectedChar = id;
        this.root.querySelectorAll('.hero').forEach(card => {
          card.classList.remove('selected');
          card.style.setProperty('--c', '#6c5a8e');
        });
        el.classList.add('selected');
        el.style.setProperty('--c', '#f3d77a');
        this.root.querySelector('[data-act=start]').disabled = !SaveData.unlocked.includes(id);
      },
      unlock: (id, el, ev) => {
        ev.stopPropagation();
        const ch = CHARACTERS[id];
        if (SaveData.gold >= ch.cost) {
          SaveData.gold -= ch.cost;
          SaveData.unlocked.push(id);
          saveGame();
          this.selectedChar = id;
          Sound.play('chest');
          this.charSelect();
        }
      },
      back: () => this.mainMenu(),
      start: () => App.startRun(this.selectedChar),
    });
    this.keyHandler = e => {
      if (e.code === 'Escape') { this.mainMenu(); return true; }
      if (e.code === 'Enter' && SaveData.unlocked.includes(this.selectedChar)) { App.startRun(this.selectedChar); return true; }
    };
  },

  // ---------------------------------------------------------------
  //  Tienda de mejoras permanentes
  // ---------------------------------------------------------------
  shop() {
    const items = META_UPGRADES.map(m => {
      const lv = SaveData.meta[m.id] || 0;
      const maxed = lv >= m.max;
      const cost = metaCost(m, lv);
      const pips = Array.from({ length: m.max }, (_, i) => `<div class="pip ${i < lv ? 'on' : ''}"></div>`).join('');
      return `
        <div class="panel shop-item">
          <img src="${Sprites.icon(m.icon, 5)}">
          <div class="info"><b>${tr(m.name)}</b><div>${tr(m.desc)}</div><div class="pips">${pips}</div></div>
          <button class="btn small ${maxed ? '' : 'gold'}" data-act="buy:${m.id}" ${maxed || SaveData.gold < cost ? 'disabled' : ''}>
            ${maxed ? t('maxed') : cost + ' ' + t('gold').toLowerCase()}
          </button>
        </div>`;
    }).join('');
    this.show(`
      <h2>${t('shop')}</h2>
      <div class="gold-text">${t('gold')}: ${SaveData.gold}</div>
      <div class="shop-grid">${items}</div>
      <div class="row">
        <button class="btn" data-act="back">${t('back')}</button>
        <button class="btn small" data-act="refund">${t('refund')}</button>
      </div>
    `, {
      buy: id => {
        const m = META_UPGRADES.find(x => x.id === id);
        const lv = SaveData.meta[id] || 0, cost = metaCost(m, lv);
        if (lv < m.max && SaveData.gold >= cost) {
          SaveData.gold -= cost;
          SaveData.meta[id] = lv + 1;
          saveGame();
          Sound.play('coin');
          this.shop();
        }
      },
      refund: () => {
        for (const m of META_UPGRADES) {
          const lv = SaveData.meta[m.id] || 0;
          for (let i = 0; i < lv; i++) SaveData.gold += metaCost(m, i);
        }
        SaveData.meta = {};
        saveGame();
        this.shop();
      },
      back: () => this.mainMenu(),
    });
    this.keyHandler = e => { if (e.code === 'Escape') { this.mainMenu(); return true; } };
  },

  // ---------------------------------------------------------------
  //  Opciones
  // ---------------------------------------------------------------
  options(onBack) {
    const seg = (key, values) => `<div class="seg">${values.map(([v, label]) =>
      `<button class="${Settings[key] === v ? 'on' : ''}" data-act="set:${key}=${v}">${label}</button>`).join('')}</div>`;
    this.show(`
      <h2>${t('options')}</h2>
      <div class="panel">
        <div class="opt">${t('language')} ${seg('lang', [['es', 'Español'], ['en', 'English']])}</div>
        <div class="opt">${t('music')} <input type="range" min="0" max="1" step="0.05" value="${Settings.music}" id="opt-music"></div>
        <div class="opt">${t('sfx')} <input type="range" min="0" max="1" step="0.05" value="${Settings.sfx}" id="opt-sfx"></div>
        <div class="opt">${t('fx')} ${seg('fx', [['low', t('low')], ['med', t('med')], ['high', t('high')]])}</div>
        <div class="opt">${t('shake')} <input type="checkbox" id="opt-shake" ${Settings.shake ? 'checked' : ''}></div>
        <div class="opt">${t('dmgNumbers')} <input type="checkbox" id="opt-dmg" ${Settings.dmgNumbers ? 'checked' : ''}></div>
      </div>
      <button class="btn" data-act="back">${t('back')}</button>
    `, {
      set: arg => {
        const [key, v] = arg.split('=');
        Settings[key] = v;
        saveSettings();
        this.options(onBack);
      },
      back: () => onBack(),
    });
    const bind = (id, fn) => this.root.querySelector(id).addEventListener('input', fn);
    bind('#opt-music', e => { Settings.music = +e.target.value; Sound.applyVolumes(); saveSettings(); });
    bind('#opt-sfx', e => { Settings.sfx = +e.target.value; Sound.applyVolumes(); saveSettings(); Sound.play('gem'); });
    bind('#opt-shake', e => { Settings.shake = e.target.checked; saveSettings(); });
    bind('#opt-dmg', e => { Settings.dmgNumbers = e.target.checked; saveSettings(); });
    this.keyHandler = e => { if (e.code === 'Escape') { onBack(); return true; } };
  },

  // ---------------------------------------------------------------
  //  Tarjetas de mejora
  // ---------------------------------------------------------------
  cardInfo(run, id, levels) {
    if (id === 'heal') return { icon: 'i_heal', name: t('heal'), desc: t('healDesc'), color: '#7dff9a', tag: '', lvl: '' };
    if (id === 'gold') return { icon: 'i_gold', name: t('goldBag'), desc: t('goldBagDesc'), color: '#f3d77a', tag: '', lvl: '' };
    const def = UPGRADES[id];
    const excl = def.owner ? ' · ' + t('exclusive') : '';
    if (def.type === 'weapon') {
      const w = run.getWeapon(id);
      const cur = w ? w.level : 0, next = Math.min(WEAPON_MAX, cur + levels);
      const tier = weaponTier(next);
      let desc = tr(def.desc);
      if (w) desc = weaponTier(next) > weaponTier(cur) ? `<b>${t('newForm')}</b>${tr(def.tiers[tier])}` : t('moreDamage');
      desc += `<br><span style="color:#ff9ac4;font-size:11px">★ ${tr(def.evo.name)} = ${tr(def.name)} ${WEAPON_MAX} + ${tr(UPGRADES[def.evo.with].name)}</span>`;
      return { icon: def.icon, name: tr(def.name), desc, color: TIER_COLORS[tier], tag: t('weapon') + excl,
               lvl: w ? t('lvUp', { a: cur, b: next }) : `<span class="new">${t('newItem')}</span>` + (levels > 1 ? ' ' + t('lvUp', { a: 0, b: next }) : '') };
    }
    const cur = run.passives[id] || 0, next = Math.min(def.maxLevel, cur + levels);
    const color = TIER_COLORS[Math.max(0, Math.min(3, Math.floor(next * 0.75 - 0.5)))];
    return { icon: def.icon, name: tr(def.name), desc: tr(def.desc), color, tag: t('passive') + excl,
             lvl: cur ? t('lvUp', { a: cur, b: next }) : `<span class="new">${t('newItem')}</span>` + (levels > 1 ? ' ' + t('lvUp', { a: 0, b: next }) : '') };
  },

  cardHtml(info, i, act) {
    return `
      <div class="card" data-act="${act}" style="--c:${info.color}; animation-delay:${i * 0.05}s">
        <div class="key">${i + 1}</div>
        <img src="${Sprites.icon(info.icon, 8)}">
        <div class="name">${info.name}</div>
        <div class="tag">${info.tag}</div>
        <div class="lvl">${info.lvl}</div>
        <div class="desc">${info.desc}</div>
      </div>`;
  },

  choiceScreen(title, subtitle, cards, onPick) {
    this.show(`
      <h2>${title}</h2>
      <div class="subtitle">${subtitle}</div>
      <div class="cards">${cards.join('')}</div>
    `, { pick: idx => onPick(+idx) });
    this.keyHandler = e => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= cards.length) { Sound.play('select'); onPick(n - 1); return true; }
    };
  },

  showLevelUp(run, ids) {
    const cards = ids.map((id, i) => this.cardHtml(this.cardInfo(run, id, 1), i, 'pick:' + i));
    this.choiceScreen(t('levelUp'), t('chooseOne'), cards, i => { run.applyUpgrade(ids[i], 1); run.closeModal(); });
  },

  showChest(run, ids) {
    const cards = ids.map((id, i) => this.cardHtml(this.cardInfo(run, id, 2), i, 'pick:' + i));
    this.choiceScreen(t('chest'), t('chestChoose'), cards, i => { run.applyUpgrade(ids[i], 2); run.closeModal(); });
  },

  showRelics(run, ids) {
    const cards = ids.map((id, i) => {
      const r = RELICS[id];
      return this.cardHtml({ icon: r.icon, name: tr(r.name), desc: tr(r.desc), color: '#ffcc33', tag: t('relics'), lvl: '' }, i, 'pick:' + i);
    });
    this.choiceScreen(t('relicTitle'), t('relicChoose'), cards, i => { run.pickRelic(ids[i]); run.closeModal(); });
  },

  showEvolution(run, w) {
    const def = UPGRADES[w.id];
    const card = this.cardHtml({ icon: def.icon, name: tr(def.evo.name), desc: tr(def.evo.desc), color: EVO_COLOR, tag: t('weapon'), lvl: '★' }, 0, 'ok');
    this.show(`
      <div class="evo-title">${t('evolution')}</div>
      <div class="subtitle">${t('evolves', { a: tr(def.name), b: tr(def.evo.name) })}</div>
      <div class="cards">${card}</div>
      <button class="btn gold" data-act="ok">${t('resume')}</button>
    `, { ok: () => run.closeModal() });
    this.keyHandler = e => { if (['Enter', 'Space', 'Digit1'].includes(e.code)) { run.closeModal(); return true; } };
  },

  // ---------------------------------------------------------------
  //  Pausa y fin de partida
  // ---------------------------------------------------------------
  buildHtml(run) {
    const slot = (icon, color, label) => `<div class="slot" style="--c:${color}"><img src="${Sprites.icon(icon, 5)}"><span>${label}</span></div>`;
    const ws = run.weapons.map(w => slot(UPGRADES[w.id].icon, wColor(w), (w.evo ? tr(UPGRADES[w.id].evo.name) : t('lv') + ' ' + w.level))).join('');
    const ps = Object.keys(run.passives).map(id => slot(UPGRADES[id].icon, '#6c5a8e', t('lv') + ' ' + run.passives[id])).join('');
    const rs = run.relics.map(id => slot(RELICS[id].icon, '#ffcc33', '')).join('');
    return `<div class="build">${ws}</div><div class="build">${ps}</div>${rs ? `<div class="build">${rs}</div>` : ''}`;
  },

  showPause(run) {
    this.show(`
      <h2>${t('paused')}</h2>
      <div class="panel col">
        <h3>${t('build')}</h3>
        ${this.buildHtml(run)}
      </div>
      <div class="col">
        <button class="btn gold" data-act="resume">${t('resume')}</button>
        <button class="btn" data-act="options">${t('options')}</button>
        <button class="btn" data-act="quit">${t('quit')}</button>
      </div>
    `, {
      resume: () => App.resume(),
      options: () => this.options(() => this.showPause(run)),
      quit: () => App.quitRun(),
    });
    this.keyHandler = e => { if (e.code === 'Escape' || e.code === 'KeyP') { App.resume(); return true; } };
  },

  showGameOver(run) {
    const rec = (run.records.time || run.records.zone) ? `<div class="record">${t('newRecord')}</div>` : '';
    this.show(`
      <h2>${t('gameOver')}</h2>
      ${rec}
      <div class="panel big-stats">
        ${t('time')}: <b>${fmtTime(run.time)}</b><br>
        ${t('reachedZone')}: <b>${run.zoneIndex + 1} · ${tr(run.zone.name)}</b><br>
        ${t('maxLevel')}: <b>${run.level}</b> &nbsp;·&nbsp; ${t('kills')}: <b>${run.kills}</b><br>
        <span class="gold-text">${t('goldEarned')}: +${run.goldRun}</span>
      </div>
      <div class="panel col">${this.buildHtml(run)}</div>
      <div class="row">
        <button class="btn gold" data-act="retry">${t('retry')}</button>
        <button class="btn" data-act="menu">${t('menu')}</button>
      </div>
    `, {
      retry: () => App.startRun(run.char.id),
      menu: () => App.toMenu(),
    });
    this.keyHandler = e => { if (e.code === 'Enter') { App.startRun(run.char.id); return true; } };
  },
};
