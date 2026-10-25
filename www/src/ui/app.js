/*
 * NationZero — controlador principal.
 * Interface de tela cheia com mapa-múndi dinâmico.
 */

import { loadMap, getMap, findProvinceAt } from '../engine/worldmap.js';
import { dateLabel, ROLES, REGIMES } from '../engine/state.js';
import {
  newCampaign, advanceCampaign, saveCampaign, loadCampaign, hasCampaign, clearCampaign,
  exportCampaign, importCampaign, campaignSummary, playerRecruit, playerMove, playerDisband,
  playerDeclareWar, playerPeace, playerImproveRelations, playerBuild, playerAnnex,
  playerAlliance, playerBreakAlliance, playerSanction, playerTradeDeal, playerSpy,
  playerDemandTribute, syncStateFromWorld,
} from '../engine/campaign.js';
import { atWar, relation, nationPower } from '../engine/nations.js';
import { ORIGINS, DIFFICULTIES } from '../data/origins.js';
import { $, openModal, closeModal, toast, sfx, esc, money, download, readFile } from './dom.js';
import { icon } from './icons.js';
import { MapView, fmtMen } from './map.js';
import { renderMilitary, renderNations, renderInspector, renderHudChips, renderTicker } from './panels.js';
import { renderOverview } from './screens/overview.js';
import { renderLaws } from './screens/laws.js';
import { renderActions } from './screens/actions.js';
import { renderPower } from './screens/power.js';
import { renderEconomy } from './screens/economy.js';
import { renderPolitics } from './screens/politics.js';
import { renderChronicle } from './screens/chronicle.js';
import { renderLegacy } from './screens/legacy.js';
import { showEventModal, showElectionModal, showGameOver, showHelp, showSettings } from './modals.js';
import { registerCommands, getCommand } from './registry.js';

export const TABS = [
  { id: 'overview', label: 'Governo', icon: 'landmark', title: 'Governo', sub: 'Visão geral do Estado' },
  { id: 'laws', label: 'Leis', icon: 'scroll-text', title: 'Leis e decretos', sub: 'Mude as regras do país' },
  { id: 'actions', label: 'Ações', icon: 'zap', title: 'Ações', sub: 'Atos de governo e política' },
  { id: 'politics', label: 'Política', icon: 'vote', title: 'Política', sub: 'Partido, eleições e poder' },
  { id: 'power', label: 'Poder', icon: 'crown', title: 'Poder', sub: 'Golpe, repressão e regime' },
  { id: 'economy', label: 'Economia', icon: 'coins', title: 'Economia', sub: 'Impostos e orçamento' },
  { id: 'military', label: 'Militar', icon: 'shield', title: 'Forças armadas', sub: 'Exércitos, guerras e recrutas' },
  { id: 'nations', label: 'Nações', icon: 'globe-2', title: 'Relações internacionais', sub: 'Diplomacia com o mundo' },
  { id: 'chronicle', label: 'Crônica', icon: 'book-open', title: 'Crônica', sub: 'Tudo o que aconteceu' },
  { id: 'legacy', label: 'Legado', icon: 'trophy', title: 'Legado', sub: 'Conquistas e identidade' },
];

const SCREENS = {
  overview: renderOverview,
  laws: renderLaws,
  actions: renderActions,
  politics: renderPolitics,
  power: renderPower,
  economy: renderEconomy,
  military: renderMilitary,
  nations: renderNations,
  chronicle: renderChronicle,
  legacy: renderLegacy,
};

export const app = {
  map: null,
  camp: null,
  mapView: null,
  pickerView: null,
  screen: 'menu',
  tab: 'overview',
  panelOpen: false,
  built: false,
  savedExists: false,
  get state() { return this.camp ? this.camp.state : null; },
  ui: {
    lawCat: 'economia',
    lawShow: 'todas',
    actionCat: 'politica',
    logFilter: 'all',
    deltas: {},
    queue: [],
    busy: false,
    nationId: null,
    armyId: null,
    recruitProv: null,
    moveMode: false,
    pickedIndex: null,
    setup: {
      nationName: '', leaderName: '', motto: 'Ordem, Pão e Futuro',
      origin: 'sindicalista', difficulty: 'normal',
    },
  },

  /* ------------------------------ ciclo ------------------------------ */

  async boot() {
    this.map = await loadMap();
    this.savedExists = hasCampaign();
    this.render();
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', () => this.mapView?.applyView());
  },

  render() {
    const root = document.getElementById('app');
    if (!root) return;
    if (this.screen === 'menu') {
      root.innerHTML = renderMenu(this);
      this.built = false;
    } else if (this.screen === 'picker') {
      root.innerHTML = renderPicker(this);
      this.buildPicker();
    } else if (this.screen === 'gameover') {
      root.innerHTML = renderGameOver(this);
      this.built = false;
    } else {
      if (!this.built) {
        root.innerHTML = renderShell(this);
        this.buildGame();
        this.built = true;
      }
      this.updateHud();
      this.updatePanel();
      this.updateInspector();
      this.updateTicker();
      if (this.camp?.state?.over) {
        this.screen = 'gameover';
        this.built = false;
        this.render();
        showGameOver(this);
      }
    }
  },

  /* ------------------------------ mapa ------------------------------- */

  buildPicker() {
    const host = document.getElementById('map-host');
    if (!host) return;
    const view = new MapView(host, this.map, { mode: 'picker' });
    view.build();
    view.paint(pickerWorld(this.map), {});
    view.onClick = (prov) => {
      if (!prov) return;
      this.ui.pickedIndex = prov.country;
      this.ui.setup.nationName = this.map.countries[prov.country].name;
      sfx('click');
      this.updatePickerSelection();
    };
    view.onHover = (pt) => hoverTooltip(this, host, pt, true);
    this.pickerView = view;
    this.updatePickerSelection();
  },

  updatePickerSelection() {
    const view = this.pickerView;
    if (!view) return;
    const picked = this.ui.pickedIndex;
    const w = pickerWorld(this.map);
    for (const prov of this.map.provinces) {
      const path = view.paths[prov.i];
      const mine = picked !== null && prov.country === picked;
      path.setAttribute('fill', mine ? '#19e08a' : picked === null ? '#3b4a52' : '#222d33');
      path.setAttribute('fill-opacity', mine ? '0.92' : '0.75');
    }
    const form = document.getElementById('picker-form');
    if (form) form.outerHTML = renderPickerForm(this);
  },

  buildGame() {
    const host = document.getElementById('map-host');
    if (!host) return;
    const view = new MapView(host, this.map, { mode: 'select' });
    view.build();
    view.paint(this.camp.world);
    view.onClick = (prov) => this.onProvinceClick(prov);
    view.onHover = (pt) => hoverTooltip(this, host, pt, false);
    this.mapView = view;
    this.bindSliders();
    this.bindSliderRecruit();
    const summary = campaignSummary(this.camp);
    view.centerOn(this.camp.map.provinces[summary.nation.capital]?.x || 1000,
      this.camp.map.provinces[summary.nation.capital]?.y || 500, 3.2);
  },

  onProvinceClick(prov) {
    if (!prov) {
      this.mapView.select(null);
      this.updateInspector();
      return;
    }
    // modo de movimento
    if (this.ui.moveMode && this.ui.armyId) {
      const res = playerMove(this.camp, this.ui.armyId, prov.i);
      if (!res.ok) {
        toast(res.reason || 'Movimento inválido', 'warn', 'ban');
        return;
      }
      if (res.battle) {
        toast(res.battle.won ? `Vitória em ${prov.name}!` : `Derrota em ${prov.name}`, res.battle.won ? 'good' : 'bad', res.battle.won ? 'trophy' : 'skull');
        sfx(res.battle.won ? 'good' : 'bad');
      } else {
        toast(`Exército marchou para ${prov.name}`, 'info', 'move');
        sfx('click');
      }
      this.ui.moveMode = false;
      this.ui.armyId = null;
      this.refresh();
      return;
    }
    this.mapView.select(prov.i);
    this.ui.recruitProv = prov.i;
    sfx('click');
    this.updateInspector();
  },

  refresh() {
    if (!this.camp) return;
    this.mapView?.paint(this.camp.world);
    this.updateHud();
    this.updatePanel();
    this.updateInspector();
    this.updateTicker();
    this.save();
  },

  updateHud() {
    const bar = document.getElementById('hud-chips');
    if (bar) bar.innerHTML = renderHudChips(this);
    const stats = document.getElementById('map-stats');
    if (stats) {
      const s = campaignSummary(this.camp);
      stats.innerHTML = `
        <div class="map-badge">${icon('flag', 13)} <b>${s.provCount}/${s.provinceTotal}</b> províncias · ${s.worldShare.toFixed(1)}% do mundo</div>
        <div class="map-badge">${icon('trophy', 13)} #${s.ranking} de ${s.alive} nações</div>
        ${s.atWar ? `<div class="map-badge" style="border-color:rgba(255,93,108,.45);color:#ff9aa4">${icon('swords', 13)} ${s.wars.length} guerra(s)</div>` : ''}
        ${this.ui.moveMode ? `<div class="map-badge" style="border-color:rgba(25,224,138,.5);color:var(--accent)">${icon('move', 13)} escolha o destino · Esc cancela</div>` : ''}`;
    }
    const brand = document.getElementById('hud-nation');
    if (brand) {
      const n = this.camp.world.nations[this.camp.world.player];
      brand.innerHTML = `
        <span class="nation-flag" style="background:${n.color}"></span>
        <span style="min-width:0">
          <span class="nation-name">${esc(n.name)}</span>
          <span class="nation-sub">${esc(this.camp.state.meta.leaderName)} · ${dateLabel(this.camp.state)}</span>
        </span>`;
    }
    const rail = document.getElementById('rail');
    if (rail) {
      rail.querySelectorAll('[data-tab]').forEach((b) => {
        b.classList.toggle('active', this.panelOpen && b.dataset.tab === this.tab);
      });
    }
    const tooltip = document.getElementById('tooltip');
    if (tooltip) tooltip.classList.remove('on');
  },

  updatePanel() {
    const panel = document.getElementById('panel');
    if (!panel) return;
    panel.classList.toggle('open', this.panelOpen);
    if (!this.panelOpen) return;
    const tab = TABS.find((t) => t.id === this.tab) || TABS[0];
    const screen = SCREENS[this.tab];
    let body = '';
    try {
      body = screen ? screen(this) : '';
    } catch (e) {
      console.error(e);
      body = `<div class="empty">${icon('triangle-alert', 22)}<span>Falha ao abrir este painel.</span></div>`;
    }
    panel.innerHTML = `
      <div class="panel-head">
        <span style="color:var(--accent)">${icon(tab.icon, 18)}</span>
        <div class="panel-title">${esc(tab.title)}<small>${esc(tab.sub)}</small></div>
        <button class="btn small ghost panel-close" data-cmd="panel:close">${icon('x', 15)}</button>
      </div>
      <div class="panel-body">${body}</div>`;
    this.bindSliders();
    this.bindSliderRecruit();
  },

  updateInspector() {
    const el = document.getElementById('inspector');
    if (!el) return;
    const has = this.mapView?.selected !== null && this.mapView?.selected !== undefined;
    el.classList.toggle('open', !!has);
    el.innerHTML = has ? renderInspector(this) : '';
  },

  updateTicker() {
    const el = document.getElementById('ticker');
    if (el) el.innerHTML = renderTicker(this);
  },

  /* ------------------------------ partida ---------------------------- */

  startCampaign() {
    const setup = this.ui.setup;
    const nationIdx = this.ui.pickedIndex;
    if (nationIdx === null || nationIdx === undefined) {
      toast('Escolha um país no mapa primeiro', 'warn', 'map');
      return;
    }
    const camp = newCampaign({
      nationIdx,
      leaderName: setup.leaderName || 'Você',
      nationName: setup.nationName || this.map.countries[nationIdx].name,
      motto: setup.motto,
      difficulty: setup.difficulty,
      origin: setup.origin,
    });
    this.camp = camp;
    this.screen = 'game';
    this.tab = 'overview';
    this.panelOpen = false;
    this.built = false;
    this.ui.armyId = null;
    this.save();
    this.render();
    sfx('epic');
    try {
      document.documentElement.requestFullscreen?.().catch(() => {});
      window.screen?.orientation?.lock?.('landscape')?.catch?.(() => {});
    } catch (e) { /* opcional */ }
    toast(`${camp.state.meta.nationName} está sob seu comando`, 'epic', 'flag');
  },

  continueGame() {
    const camp = loadCampaign();
    if (!camp) {
      toast('Nenhuma campanha salva', 'warn', 'save');
      return;
    }
    this.camp = camp;
    this.screen = 'game';
    this.built = false;
    this.tab = 'overview';
    this.render();
  },

  save(silent = true) {
    if (!this.camp) return;
    const ok = saveCampaign(this.camp);
    this.savedExists = ok;
    if (!silent) toast(ok ? 'Campanha salva' : 'Falha ao salvar', ok ? 'good' : 'bad', 'save');
  },

  openPanel(tab) {
    if (this.panelOpen && this.tab === tab) {
      this.panelOpen = false;
    } else {
      this.panelOpen = true;
      this.tab = tab;
    }
    sfx('click');
    this.updatePanel();
    this.updateHud();
  },

  /* ------------------------------ turno ------------------------------ */

  advance() {
    if (!this.camp || this.ui.busy) return;
    const { state } = this.camp;
    if (state.over) { showGameOver(this); return; }
    if (document.querySelector('.modal-backdrop')) return;

    const before = { stats: { ...state.stats }, factions: { ...state.factions } };
    const provBefore = this.camp.world.nations[this.camp.world.player].provCount;
    const report = advanceCampaign(this.camp);
    this.ui.deltas = {};
    for (const k of Object.keys(state.stats)) {
      const d = (state.stats[k] || 0) - (before.stats[k] || 0);
      if (Math.abs(d) > 0.005) this.ui.deltas[k] = d;
    }
    this.save();
    this.mapView?.paint(this.camp.world);
    this.updateHud();
    this.updatePanel();
    this.updateInspector();
    this.updateTicker();
    sfx('turn');

    const gained = this.camp.world.nations[this.camp.world.player].provCount - provBefore;
    const bal = report.budget?.balance || 0;
    toast(`${report.date} · ${bal >= 0 ? '+' : '−'}N$ ${Math.abs(bal).toFixed(0)} bi${gained ? ` · ${gained > 0 ? '+' : ''}${gained} províncias` : ''}`,
      gained >= 0 ? 'good' : 'bad', 'calendar');

    if (report.election) this.ui.queue.push({ type: 'election', data: report.election });
    for (const ev of report.events) this.ui.queue.push({ type: 'event', id: ev });
    if (state.over) this.ui.queue.push({ type: 'gameover' });
    this.pump();
  },

  pump() {
    if (this.ui.busy) return;
    const next = this.ui.queue.shift();
    if (!next) return;
    this.ui.busy = true;
    const done = () => {
      this.ui.busy = false;
      this.refresh();
      if (this.ui.queue.length) setTimeout(() => this.pump(), 180);
    };
    if (next.type === 'event') showEventModal(this, next.id, done);
    else if (next.type === 'election') showElectionModal(this, next.data, done);
    else if (next.type === 'gameover') { this.screen = 'gameover'; this.built = false; done(); showGameOver(this); }
    else done();
  },

  /* ------------------------------ inputs ----------------------------- */

  bindSliders() {
    const st = this.state;
    if (!st) return;
    document.querySelectorAll('[data-slider]').forEach((input) => {
      if (input._bound) return;
      input._bound = true;
      input.addEventListener('input', () => {
        const [kind, key] = input.dataset.slider.split(':');
        const val = Number(input.value);
        if (kind === 'tax') st.taxes[key] = val;
        else if (kind === 'spend') st.spending[key] = val;
        const out = input.parentElement.querySelector('.val');
        if (out) out.textContent = `${val}${key === 'tarifas' ? '%' : ''}`;
      });
      input.addEventListener('change', () => { this.save(); this.updatePanel(); });
    });
    document.querySelectorAll('[data-ideo]').forEach((input) => {
      if (input._bound) return;
      input._bound = true;
      input.addEventListener('input', () => { st.ideology[input.dataset.ideo] = Number(input.value); });
      input.addEventListener('change', () => this.save());
    });
    document.querySelectorAll('[data-field]').forEach((input) => {
      if (input._bound) return;
      input._bound = true;
      input.addEventListener('input', () => {
        const [obj, key] = input.dataset.field.split(':');
        if (obj === 'meta') st.meta[key] = input.value;
        else if (st[obj]) st[obj][key] = input.value;
      });
      input.addEventListener('change', () => this.save());
    });
  },

  bindSliderRecruit() {
    const range = document.getElementById('recruit-range');
    if (!range || range._bound) return;
    range._bound = true;
    const update = () => {
      const v = Number(range.value);
      const out = document.getElementById('recruit-val');
      const cost = document.getElementById('recruit-cost');
      if (out) out.textContent = v.toLocaleString('pt-BR');
      if (cost) cost.textContent = `custo N$ ${Math.round(v * 0.02)} bi`;
    };
    range.addEventListener('input', update);
    update();
  },
};

/* =================================================================== */
/* Telas                                                               */
/* =================================================================== */

function renderMenu(app) {
  return `
    <div class="menu">
      <div class="menu-inner">
        <img class="menu-logo" src="./assets/logo.png" alt="NationZero" />
        <p class="menu-tag">Um planeta inteiro para conquistar. Escolha um país e escreva a história.</p>
        <div class="menu-buttons">
          <button class="btn primary" data-cmd="menu:new">${icon('map', 16)} Nova campanha</button>
          ${app.savedExists ? `<button class="btn" data-cmd="menu:continue">${icon('play', 16)} Continuar</button>` : ''}
          <button class="btn" data-cmd="menu:import">${icon('upload', 16)} Importar save</button>
          <button class="btn ghost" data-cmd="menu:help">${icon('circle-help', 16)} Como jogar</button>
          <button class="btn ghost" data-cmd="menu:settings">${icon('settings', 16)} Ajustes</button>
        </div>
        <p class="menu-foot">
          ${icon('landmark', 12)} Funde um partido · ${icon('vote', 12)} ganhe eleições · ${icon('scroll-text', 12)} escreva leis<br />
          ${icon('crown', 12)} dê um golpe · ${icon('skull', 12)} vire ditador · ${icon('swords', 12)} conquiste o mapa
        </p>
        <input type="file" id="import-file" accept="application/json" hidden />
      </div>
      <div class="rotate-hint">${icon('smartphone', 14)} Vire o aparelho na horizontal</div>
    </div>`;
}

function renderPicker(app) {
  return `
    <div class="picker">
      <div class="picker-bar">
        <img src="./assets/logo-mark.png" alt="" style="height:26px" />
        <b style="letter-spacing:2px;font-size:12px">NATION<span style="color:var(--accent)">ZERO</span></b>
        <span class="dim small">Escolha seu país no mapa</span>
        <span class="grow"></span>
        <button class="btn small ghost" data-cmd="picker:back">${icon('arrow-left', 14)} Voltar</button>
      </div>
      <div class="picker-stage">
        <div class="map-host" id="map-host"></div>
        ${renderPickerForm(app)}
        <div class="picker-hint">${icon('map-pin', 14)} Clique em qualquer país para assumi-lo</div>
        <div class="map-controls">
          <button class="btn" data-cmd="map:zoom-in">${icon('zoom-in', 16)}</button>
          <button class="btn" data-cmd="map:zoom-out">${icon('zoom-out', 16)}</button>
          <button class="btn" data-cmd="map:fit">${icon('maximize', 16)}</button>
        </div>
      </div>
    </div>`;
}

function renderPickerForm(app) {
  const setup = app.ui.setup;
  const picked = app.ui.pickedIndex;
  const country = picked !== null ? app.map.countries[picked] : null;
  return `
    <div class="picker-form" id="picker-form">
      ${country ? `
        <div class="row gap-8" style="margin-bottom:8px">
          <span class="swatch" style="width:14px;height:14px;border-radius:4px;background:#19e08a"></span>
          <div>
            <div style="font-weight:750">${esc(country.name)}</div>
            <div class="small dim">${esc(country.regionPt)} · ${country.provinces.length} províncias · ${(country.pop / 1e6).toFixed(1)} mi</div>
          </div>
        </div>
        <div class="grid cols-3" style="gap:6px;margin-bottom:10px">
          <div class="stat"><div class="lbl">Dev</div><div class="val">${country.dev}</div></div>
          <div class="stat"><div class="lbl">Área</div><div class="val">${Math.round(country.area / 1000)}k</div></div>
          <div class="stat"><div class="lbl">Províncias</div><div class="val">${country.provinces.length}</div></div>
        </div>
      ` : `<div class="small dim" style="margin-bottom:10px">Nenhum país selecionado.</div>`}

      <div class="field" style="margin-bottom:7px">
        <label>Seu nome</label>
        <input class="input" id="setup-leader" maxlength="24" placeholder="Seu nome" value="${esc(setup.leaderName)}" />
      </div>
      <div class="field" style="margin-bottom:7px">
        <label>Nome do país</label>
        <input class="input" id="setup-nation" maxlength="26" placeholder="${country ? esc(country.name) : 'NationZero'}" value="${esc(setup.nationName)}" />
      </div>
      <div class="field" style="margin-bottom:9px">
        <label>Lema</label>
        <input class="input" id="setup-motto" maxlength="40" value="${esc(setup.motto)}" />
      </div>

      <div class="card-title" style="margin-bottom:5px">${icon('sliders', 12)} Dificuldade</div>
      <div class="tabs" style="margin-bottom:9px">
        ${Object.entries(DIFFICULTIES).map(([k, d]) => `
          <button class="tab ${setup.difficulty === k ? 'active' : ''}" data-cmd="picker:diff:${k}">${esc(d.label)}</button>`).join('')}
      </div>

      <div class="card-title" style="margin-bottom:5px">${icon('user', 12)} Origem do líder</div>
      <div class="tabs" style="margin-bottom:11px">
        ${Object.entries(ORIGINS).map(([k, o]) => `
          <button class="tab ${setup.origin === k ? 'active' : ''}" data-cmd="picker:origin:${k}" title="${esc(o.desc || '')}">${esc(o.label)}</button>`).join('')}
      </div>

      <button class="btn primary" style="width:100%" data-cmd="picker:start" ${picked === null ? 'disabled' : ''}>
        ${icon('flag', 15)} Assumir o poder
      </button>
    </div>`;
}

function renderShell(app) {
  const tabs = TABS.map((t) => `
    <button class="rail-btn" data-cmd="nav:${t.id}" data-tab="${t.id}" title="${esc(t.title)}">
      ${icon(t.icon, 17)}<span>${esc(t.label)}</span>
    </button>`).join('');

  return `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <img src="./assets/logo-mark.png" alt="NationZero" />
          <span class="brand-name">NATION<span>ZERO</span></span>
        </div>
        <div class="nation-chip" id="hud-nation"></div>
        <div class="res-chips" id="hud-chips"></div>
        <div class="top-actions">
          <button class="btn primary turn" data-cmd="game:advance" title="Avançar um mês (espaço)">
            ${icon('play', 15)} Avançar mês
          </button>
          <button class="btn icon" data-cmd="game:save" title="Salvar">${icon('save', 16)}</button>
          <button class="btn icon" data-cmd="menu:main" title="Menu">${icon('menu', 16)}</button>
        </div>
      </header>

      <nav class="rail" id="rail">
        ${tabs}
        <div class="rail-sep"></div>
        <button class="rail-btn" data-cmd="menu:help" title="Como jogar">${icon('circle-help', 17)}<span>Ajuda</span></button>
        <button class="rail-btn" data-cmd="menu:settings" title="Ajustes">${icon('settings', 17)}<span>Ajustes</span></button>
      </nav>

      <section class="stage" id="stage">
        <div class="map-host" id="map-host"></div>
        <div class="map-stats" id="map-stats"></div>

        <div class="inspector" id="inspector"></div>
        <div class="panel" id="panel"></div>

        <div class="ticker" id="ticker"></div>
        <div class="scale-bar">${icon('move', 12)} <i></i> arraste para mover · role para zoom</div>

        <div class="map-controls">
          <button class="btn" data-cmd="map:zoom-in" title="Aproximar">${icon('zoom-in', 16)}</button>
          <button class="btn" data-cmd="map:zoom-out" title="Afastar">${icon('zoom-out', 16)}</button>
          <button class="btn" data-cmd="map:fit" title="Ver o mundo">${icon('globe-2', 16)}</button>
          <button class="btn" data-cmd="map:center" title="Ir para a capital">${icon('locate-fixed', 16)}</button>
          <button class="btn" data-cmd="ui:fullscreen" title="Tela cheia">${icon('maximize', 16)}</button>
        </div>

        <div class="tooltip" id="tooltip"></div>
      </section>
    </div>
    <input type="file" id="import-file" accept="application/json" hidden />`;
}

function renderGameOver(app) {
  const st = app.state;
  const over = st?.over || { title: 'Fim', text: 'A história terminou.', icon: 'flag' };
  const n = app.camp?.world.nations[app.camp?.world.player];
  return `
    <div class="gameover">
      <div class="gameover-card">
        <div class="gameover-ico">${icon(over.icon || 'flag', 46)}</div>
        <h1 class="gameover-title">${esc(over.title)}</h1>
        <p class="gameover-text">${esc(over.text)}</p>
        <div class="legacy-grid">
          <div class="legacy-item"><b>${n?.provCount ?? 0}</b><span>Províncias</span></div>
          <div class="legacy-item"><b>${Math.floor((st?.legacy?.daysInPower || 0) / 365)}</b><span>Anos</span></div>
          <div class="legacy-item"><b>${Object.keys(st?.policies || {}).length}</b><span>Leis</span></div>
          <div class="legacy-item"><b>${st?.legacy?.coups || 0}</b><span>Golpes</span></div>
          <div class="legacy-item"><b>${st?.legacy?.wars || 0}</b><span>Guerras</span></div>
          <div class="legacy-item"><b>${st?.stats?.arsenalNuclear || 0}</b><span>Ogivas</span></div>
        </div>
        <div class="row gap-8" style="justify-content:center;flex-wrap:wrap">
          <button class="btn primary" data-cmd="game:newgame">${icon('map', 15)} Nova campanha</button>
          <button class="btn ghost" data-cmd="menu:main">${icon('arrow-left', 15)} Menu principal</button>
        </div>
      </div>
    </div>`;
}

/* =================================================================== */
/* Utilidades de mapa                                                  */
/* =================================================================== */

function pickerWorld(map) {
  return {
    player: -1,
    turn: 0,
    armies: [],
    owners: map.provinces.map((p) => p.country),
    nations: map.countries.map((c) => ({ i: c.i, name: c.name, color: '#3b4a52', alive: true, wars: [], capital: c.provinces[0] })),
  };
}

function hoverTooltip(app, host, pt, picker) {
  const tip = document.getElementById('tooltip');
  if (!tip) return;
  if (!pt) { tip.classList.remove('on'); return; }
  const prov = pointProvince(app.map, pt.x, pt.y);
  if (!prov) { tip.classList.remove('on'); return; }
  const map = app.map;
  const country = map.countries[prov.country];
  const rect = host.getBoundingClientRect();
  tip.style.left = `${(pt.px * rect.width)}px`;
  tip.style.top = `${(pt.py * rect.height)}px`;
  if (picker) {
    tip.innerHTML = `<b>${esc(country.name)}</b><small>${esc(country.regionPt)} · ${country.provinces.length} províncias</small>`;
  } else {
    const w = app.camp?.world;
    const owner = w ? w.nations[w.owners[prov.i]] : null;
    tip.innerHTML = `<b>${esc(prov.name)}</b><small>${esc(owner?.name || country.name)}${w ? ` · dev ${w.devs[prov.i]}` : ''}</small>`;
  }
  tip.classList.add('on');
}

function pointProvince(map, x, y) {
  return findProvinceAt(map, x, y);
}

/* =================================================================== */
/* Comandos                                                            */
/* =================================================================== */

function onDocumentClick(e) {
  const target = e.target.closest('[data-cmd]');
  if (target) {
    e.preventDefault();
    handleCommand(target.getAttribute('data-cmd'), target, e);
    return;
  }
  const backdrop = e.target.closest('[data-modal-backdrop]');
  if (backdrop && e.target === backdrop && backdrop.getAttribute('data-dismissible') !== '0') closeModal();
  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) closeModal();
}

function handleCommand(cmd, el, e) {
  const [ns, action, ...rest] = cmd.split(':');
  const arg = rest.join(':');
  const app = window.NZ;
  const camp = app.camp;

  switch (ns) {
    case 'menu':
      if (action === 'new') { app.screen = 'picker'; app.ui.pickedIndex = null; app.ui.setup.nationName = ''; app.render(); }
      if (action === 'continue') app.continueGame();
      if (action === 'help') showHelp(app);
      if (action === 'settings') showSettings(app);
      if (action === 'import') document.getElementById('import-file')?.click();
      if (action === 'main') {
        app.panelOpen = false;
        app.screen = 'menu';
        app.built = false;
        app.render();
      }
      break;

    case 'picker':
      if (action === 'back') { app.screen = 'menu'; app.built = false; app.render(); }
      if (action === 'diff') { app.ui.setup.difficulty = arg; app.updatePickerSelection(); }
      if (action === 'origin') { app.ui.setup.origin = arg; app.updatePickerSelection(); }
      if (action === 'start') {
        app.ui.setup.leaderName = document.getElementById('setup-leader')?.value || 'Você';
        app.ui.setup.nationName = document.getElementById('setup-nation')?.value || '';
        app.ui.setup.motto = document.getElementById('setup-motto')?.value || 'Ordem, Pão e Futuro';
        app.startCampaign();
      }
      break;

    case 'nav':
      app.openPanel(action);
      break;

    case 'ui':
      if (action === 'fullscreen') toggleFullscreen();
      break;

    case 'panel':
      if (action === 'close') { app.panelOpen = false; app.updatePanel(); app.updateHud(); }
      break;

    case 'map':
      if (!camp) break;
      if (action === 'zoom-in') app.mapView.setZoom(app.mapView.zoom * 1.5);
      if (action === 'zoom-out') app.mapView.setZoom(app.mapView.zoom / 1.5);
      if (action === 'fit') app.mapView.fit();
      if (action === 'center') {
        const n = camp.world.nations[camp.world.player];
        const p = camp.map.provinces[n.capital];
        app.mapView.centerOn(p.x, p.y, 4);
      }
      app.mapView.paint(camp.world);
      app.mapView.drawSelection();
      break;

    case 'game':
      if (action === 'advance') { sfx('click'); app.advance(); }
      if (action === 'save') app.save(false);
      if (action === 'export') download(`nationzero-${Date.now()}.json`, exportCampaign(camp));
      if (action === 'import') document.getElementById('import-file')?.click();
      if (action === 'newgame') {
        if (!confirm('Começar uma nova campanha? O progresso atual será substituído.')) return;
        clearCampaign();
        app.camp = null;
        app.ui.pickedIndex = null;
        app.screen = 'picker';
        app.built = false;
        app.render();
      }
      break;

    case 'army':
      if (!camp) break;
      if (action === 'recruit') {
        const prov = app.ui.recruitProv ?? camp.world.nations[camp.world.player].capital;
        const range = document.getElementById('recruit-range');
        const men = range ? Number(range.value) : 3000;
        const res = playerRecruit(camp, prov, men);
        if (res.ok) {
          toast(`${men.toLocaleString('pt-BR')} recrutas em ${camp.map.provinces[prov].name}`, 'good', 'shield');
          sfx('good');
        } else {
          toast(res.reason, 'warn', 'ban');
        }
        app.refresh();
      }
      if (action === 'recruit-here') {
        const prov = app.mapView.selected;
        if (prov === null) { toast('Selecione uma província sua', 'warn', 'map-pin'); break; }
        const res = playerRecruit(camp, prov, 3000);
        toast(res.ok ? '3.000 recrutas mobilizados' : res.reason, res.ok ? 'good' : 'warn', res.ok ? 'shield' : 'ban');
        app.refresh();
      }
      if (action === 'focus') {
        app.ui.armyId = Number(arg);
        app.ui.moveMode = true;
        const army = camp.world.armies.find((a) => a.id === app.ui.armyId);
        if (army) app.mapView.centerOn(camp.map.provinces[army.prov].x, camp.map.provinces[army.prov].y, 4.5);
        toast('Escolha a província vizinha de destino', 'info', 'move');
        app.mapView.paint(camp.world);
      }
      if (action === 'focus-here') {
        const prov = app.mapView.selected;
        const army = camp.world.armies.find((a) => a.prov === prov && a.owner === camp.world.player);
        if (army) {
          app.ui.armyId = army.id;
          app.ui.moveMode = true;
          toast('Escolha a província vizinha de destino', 'info', 'move');
        } else {
          app.ui.armyId = null;
          toast('Nenhum exército seu nesta província', 'warn', 'shield');
        }
        app.refresh();
      }
      if (action === 'disband') {
        if (playerDisband(camp, Number(arg))) toast('Exército desmobilizado', 'info', 'users');
        app.refresh();
      }
      break;

    case 'prov': {
      if (!camp) break;
      const prov = app.mapView.selected;
      if (action === 'close') { app.mapView.select(null); app.updateInspector(); break; }
      if (prov === null) { toast('Selecione uma província', 'warn', 'map-pin'); break; }
      if (action === 'build') {
        const res = playerBuild(camp, prov, arg);
        toast(res.ok ? 'Construção concluída' : res.reason, res.ok ? 'good' : 'warn', res.ok ? 'hammer' : 'ban');
        if (res.ok) sfx('good');
        app.refresh();
      }
      if (action === 'annex') {
        const res = playerAnnex(camp, prov);
        toast(res.ok ? 'Província anexada' : res.reason, res.ok ? 'good' : 'warn', res.ok ? 'flag' : 'ban');
        app.refresh();
      }
      break;
    }

    case 'dip': {
      if (!camp) break;
      const world = camp.world;
      if (action === 'focus') {
        app.ui.nationId = Number(arg);
        app.openPanel('nations');
      }
      if (action === 'goto') {
        const n = world.nations[Number(arg)];
        const p = camp.map.provinces[n.capital];
        app.mapView.centerOn(p.x, p.y, 4.5);
        app.mapView.select(n.capital);
        app.updateInspector();
      }
      if (action === 'war') {
        playerDeclareWar(camp, Number(arg));
        toast(`Guerra declarada a ${world.nations[Number(arg)].name}`, 'bad', 'swords');
        sfx('bad');
        app.refresh();
      }
      if (action === 'peace') {
        playerPeace(camp, Number(arg));
        toast(`Paz com ${world.nations[Number(arg)].name}`, 'good', 'handshake');
        app.refresh();
      }
      if (action === 'improve') {
        const res = playerImproveRelations(camp, Number(arg));
        toast(res.ok ? 'Relações melhoradas' : res.reason, res.ok ? 'good' : 'warn', 'hand-heart');
        app.refresh();
      }
      if (action === 'ally') {
        const res = playerAlliance(camp, Number(arg));
        toast(res.ok ? 'Aliança firmada' : res.reason, res.ok ? 'good' : 'warn', 'shield-check');
        app.refresh();
      }
      if (action === 'break') {
        playerBreakAlliance(camp, Number(arg));
        toast('Aliança rompida', 'warn', 'unlink');
        app.refresh();
      }
      if (action === 'sanction') {
        const res = playerSanction(camp, Number(arg));
        toast(res.ok ? 'Sanções aplicadas' : res.reason, res.ok ? 'warn' : 'warn', 'ban');
        app.refresh();
      }
      if (action === 'trade') {
        const res = playerTradeDeal(camp, Number(arg));
        toast(res.ok ? 'Acordo comercial assinado' : res.reason, res.ok ? 'good' : 'warn', 'coins');
        app.refresh();
      }
      if (action === 'spy') {
        const [target, kind] = [Number(rest[0] || arg), rest[1] || 'sabotagem'];
        const res = playerSpy(camp, target, kind);
        toast(res.ok ? (res.success ? `Operação bem-sucedida: ${kind}` : 'Operação descoberta!') : res.reason,
          res.ok && res.success ? 'good' : 'bad', 'user-search');
        app.refresh();
      }
      if (action === 'tribute') {
        const res = playerDemandTribute(camp, Number(arg));
        toast(res.ok ? `Tributo recebido: N$ ${res.amount} bi` : res.reason, res.ok ? 'epic' : 'warn', 'coins');
        app.refresh();
      }
      break;
    }

    default: {
      const fn = getCommand(ns);
      if (fn) fn(action, arg, el, e, app);
      break;
    }
  }
}

function toggleFullscreen() {
  try {
    const doc = document;
    if (!doc.fullscreenElement) {
      doc.documentElement.requestFullscreen?.().catch(() => {});
      window.screen?.orientation?.lock?.('landscape')?.catch?.(() => {});
    } else {
      doc.exitFullscreen?.().catch(() => {});
    }
  } catch (e) { /* opcional */ }
}

function onKeydown(e) {
  const app = window.NZ;
  if (!app || app.screen !== 'game') return;
  if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (document.querySelector('.modal-backdrop')) {
    if (e.key === 'Escape') closeModal();
    return;
  }
  if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); app.advance(); }
  if (e.key === 'Escape') {
    if (app.ui.moveMode) { app.ui.moveMode = false; app.ui.armyId = null; app.refresh(); }
    else if (app.panelOpen) { app.panelOpen = false; app.updatePanel(); app.updateHud(); }
    else if (app.mapView?.selected !== null) { app.mapView.select(null); app.updateInspector(); }
  }
  const v = app.mapView;
  if (!v) return;
  const step = 60 / v.zoom;
  if (e.key === 'ArrowLeft') { v.view.x -= step; v.applyView(); }
  if (e.key === 'ArrowRight') { v.view.x += step; v.applyView(); }
  if (e.key === 'ArrowUp') { v.view.y -= step; v.applyView(); }
  if (e.key === 'ArrowDown') { v.view.y += step; v.applyView(); }
  if (e.key === '+' || e.key === '=') v.setZoom(v.zoom * 1.3);
  if (e.key === '-' || e.key === '_') v.setZoom(v.zoom / 1.3);
}

/* importação de save */
document.addEventListener('change', async (e) => {
  const input = e.target.closest('#import-file');
  if (!input || !input.files?.length) return;
  try {
    const text = await readFile(input.files[0]);
    const camp = importCampaign(text);
    window.NZ.camp = camp;
    window.NZ.screen = 'game';
    window.NZ.built = false;
    window.NZ.render();
    toast('Campanha importada', 'good', 'upload');
  } catch (err) {
    toast('Arquivo inválido', 'bad', 'triangle-alert');
  }
  input.value = '';
});

window.NZ = app;
app.boot();

window.addEventListener('error', (e) => {
  console.error(e.error || e.message);
});

export { campaignSummary };
