/*
 * NationZero — controlador principal da interface.
 */

import {
  createState, saveState, loadState, clearSave, exportState, importState, dateLabel,
  isRuler, ROLES, REGIMES, factionAverage, monthlyRevenue, monthlySpending,
} from '../engine/state.js';
import { advanceTurn, forecast } from '../engine/simulation.js';
import { STATS } from '../engine/state.js';
import { ORIGINS, DIFFICULTIES } from '../data/origins.js';
import { $, openModal, closeModal, toast, sfx, esc, readFile, download } from './dom.js';
import { rolePill, regimePill, factionAvgLabel, seatsLabel, budgetChips } from './parts.js';
import { renderOverview } from './screens/overview.js';
import { renderLaws } from './screens/laws.js';
import { renderActions } from './screens/actions.js';
import { renderPower } from './screens/power.js';
import { renderEconomy } from './screens/economy.js';
import { renderPolitics } from './screens/politics.js';
import { renderWorld } from './screens/world.js';
import { renderChronicle } from './screens/chronicle.js';
import { renderLegacy } from './screens/legacy.js';
import { showEventModal, showElectionModal, showGameOver, showHelp, showSettings } from './modals.js';
import { registerCommands, getCommand } from './registry.js';

export const TABS = [
  { id: 'overview', label: 'Visão geral', icon: '🏛️', mobile: true },
  { id: 'laws', label: 'Leis', icon: '📜', mobile: true },
  { id: 'actions', label: 'Ações', icon: '⚡', mobile: true },
  { id: 'power', label: 'Poder', icon: '👑', mobile: true },
  { id: 'economy', label: 'Economia', icon: '💰', mobile: false },
  { id: 'politics', label: 'Política', icon: '🗳️', mobile: true },
  { id: 'world', label: 'Mundo', icon: '🌐', mobile: true },
  { id: 'chronicle', label: 'Crônica', icon: '📖', mobile: false },
  { id: 'legacy', label: 'Legado', icon: '🏆', mobile: false },
];

export const app = {
  state: null,
  screen: 'menu',
  tab: 'overview',
  ui: {
    lawCat: 'economia',
    lawShow: 'todas',
    actionCat: 'politica',
    worldId: null,
    deltas: {},
    queue: [],
    busy: false,
    setup: {
      nationName: '', capital: '', leaderName: '', motto: '', flag: '🏛️',
      origin: 'sindicalista', difficulty: 'normal',
    },
  },

  /* ------------------------------ ciclo ------------------------------ */

  init() {
    const saved = loadState();
    this.savedExists = !!saved;
    this.render();
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.querySelector('.modal-backdrop')) closeModal();
    });
  },

  newGame(setup) {
    const diff = DIFFICULTIES[setup.difficulty] || DIFFICULTIES.normal;
    const origin = ORIGINS[setup.origin] || ORIGINS.sindicalista;
    const state = createState({
      nationName: setup.nationName || 'NationZero',
      capital: setup.capital || 'Aurora',
      leaderName: setup.leaderName || 'Você',
      motto: setup.motto || 'Ordem, Pão e Futuro',
    });
    state.meta.flag = setup.flag || '🏛️';
    state.meta.origin = origin.label;
    state.meta.difficulty = setup.difficulty;

    if (diff.treasury) state.stats.tesouro += diff.treasury;
    if (diff.estabilidade) state.stats.estabilidade += diff.estabilidade;
    if (diff.aprovacao) state.stats.aprovacao += diff.aprovacao;
    if (diff.agitacao) state.stats.agitacao += diff.agitacao;
    if (diff.divida) state.stats.divida += diff.divida;

    // aplica origem
    const eff = JSON.parse(JSON.stringify(origin.effect || {}));
    if (eff.treasury) state.stats.tesouro += eff.treasury;
    if (eff.stats) for (const [k, v] of Object.entries(eff.stats)) state.stats[k] = Math.max(0, Math.min(100, (state.stats[k] || 0) + v));
    if (eff.factions) for (const [k, v] of Object.entries(eff.factions)) state.factions[k] = Math.max(0, Math.min(100, state.factions[k] + v));

    state.log = [];
    state.log.push({
      turn: 0, date: 'Jan/2026', tone: 'epic', icon: '📜',
      text: `A República de ${state.meta.nationName} nasce sob o lema "${state.meta.motto}". Você é ${origin.label.toLowerCase()} e ninguém ainda sabe seu nome.`,
      id: 'start',
    });

    this.state = state;
    this.screen = 'game';
    this.tab = 'overview';
    this.ui.deltas = {};
    this.ui.queue = [];
    saveState(state);
    this.render();
    sfx('epic');
    toast(`Bem-vindo a ${state.meta.nationName}`, 'epic', '🏛️');
  },

  continueGame() {
    const saved = loadState();
    if (!saved) {
      toast('Nenhum save encontrado', 'warn', '💾');
      return;
    }
    this.state = saved;
    this.screen = saved.over ? 'gameover' : 'game';
    this.tab = 'overview';
    this.render();
    if (saved.over) showGameOver(app);
  },

  goto(tab) {
    this.tab = tab;
    sfx('click');
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  save(silent = true) {
    if (!this.state) return;
    saveState(this.state);
    if (!silent) toast('Jogo salvo', 'good', '💾');
  },

  snapshot() {
    const s = this.state;
    const snap = { stats: { ...s.stats }, factions: { ...s.factions } };
    return snap;
  },

  computeDeltas(before) {
    const d = {};
    for (const k of Object.keys(STATS)) {
      const delta = (this.state.stats[k] || 0) - (before.stats[k] || 0);
      if (Math.abs(delta) > 0.005) d[k] = delta;
    }
    this.ui.deltas = d;
  },

  /* ---------------------------- avançar mês ---------------------------- */

  advance() {
    if (!this.state || this.ui.busy) return;
    if (this.state.over) { showGameOver(app); return; }
    if (document.querySelector('.modal-backdrop')) return;

    const before = this.snapshot();
    const result = advanceTurn(this.state);
    this.computeDeltas(before);
    this.save();
    this.render();
    sfx('turn');

    const bal = result.budget?.balance || 0;
    toast(`${dateLabel(this.state)} — ${bal >= 0 ? '+' : '−'}N$ ${Math.abs(bal).toFixed(0)} bi no caixa`, bal >= 0 ? 'good' : 'warn', '📅');

    // fila de modais
    if (result.election) this.ui.queue.push({ type: 'election', data: result.election });
    for (const ev of result.events) this.ui.queue.push({ type: 'event', id: ev });
    if (this.state.over) this.ui.queue.push({ type: 'gameover' });
    this.pump();
  },

  pump() {
    if (this.ui.busy) return;
    const next = this.ui.queue.shift();
    if (!next) return;
    this.ui.busy = true;
    const done = () => {
      this.ui.busy = false;
      this.render();
      if (this.ui.queue.length) setTimeout(() => this.pump(), 160);
    };
    if (next.type === 'event') showEventModal(app, next.id, done);
    else if (next.type === 'election') showElectionModal(app, next.data, done);
    else if (next.type === 'gameover') { this.screen = 'gameover'; done(); showGameOver(app); }
    else done();
  },

  /* ------------------------------- render ------------------------------ */

  render() {
    const root = document.getElementById('app');
    if (!root) return;
    if (this.screen === 'menu') root.innerHTML = renderMenu(this);
    else if (this.screen === 'setup') root.innerHTML = renderSetup(this);
    else if (this.screen === 'gameover') root.innerHTML = renderGameOverScreen(this);
    else root.innerHTML = renderShell(this);
    if (this.screen === 'game') bindShellInputs(this);
  },
};

/* =================================================================== */
/* Menu                                                                 */
/* =================================================================== */

function renderMenu(app) {
  const has = !!loadState();
  return `
    <div class="menu">
      <div class="menu-glow"></div>
      <div class="menu-inner">
        <div class="menu-emblem">🏛️</div>
        <h1 class="menu-title">NATIONZERO</h1>
        <p class="menu-tag">Um país inteiro nas suas mãos. Faça o que quiser com ele.</p>
        <div class="menu-buttons">
          <button class="btn primary" data-cmd="menu:new">⚑ Fundar uma nação</button>
          ${has ? '<button class="btn" data-cmd="menu:continue">▶ Continuar</button>' : ''}
          <button class="btn" data-cmd="menu:help">📖 Como jogar</button>
          <button class="btn" data-cmd="menu:settings">⚙️ Ajustes</button>
        </div>
        <p class="menu-foot">
          Crie partido · ganhe eleições · escreva leis · mude a ideologia do país<br />
          dê golpe · vire ditador · enfrente o mundo · ou destrua tudo
        </p>
      </div>
    </div>`;
}

/* =================================================================== */
/* Setup                                                                */
/* =================================================================== */

function renderSetup(app) {
  const s = app.ui.setup;
  return `
    <div class="main" style="max-width:820px;margin:0 auto;padding-top:34px">
      <div class="screen-head">
        <div>
          <h2 class="screen-title">Fundar uma nação</h2>
          <p class="screen-sub">Defina a identidade do país e quem você é antes de chegar ao poder.</p>
        </div>
        <button class="btn small ghost" data-cmd="setup:back">← Voltar</button>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-title">🏳️ Identidade nacional</div>
        <div class="grid cols-2">
          <div class="field">
            <label>Nome do país</label>
            <input class="input" id="setup-nation" maxlength="28" placeholder="NationZero" value="${esc(s.nationName)}" />
          </div>
          <div class="field">
            <label>Capital</label>
            <input class="input" id="setup-capital" maxlength="24" placeholder="Aurora" value="${esc(s.capital)}" />
          </div>
          <div class="field">
            <label>Seu nome</label>
            <input class="input" id="setup-leader" maxlength="24" placeholder="Seu nome" value="${esc(s.leaderName)}" />
          </div>
          <div class="field">
            <label>Lema nacional</label>
            <input class="input" id="setup-motto" maxlength="40" placeholder="Ordem, Pão e Futuro" value="${esc(s.motto)}" />
          </div>
        </div>
        <div class="field">
          <label>Emblema</label>
          <div class="chips" id="setup-flags">
            ${['🏛️','🦅','🌾','⚙️','🌊','🔥','🐉','⭐','🌳','🛡️','☀️','🦁','🐺','⚡','🌹','🗿'].map((f) => `
              <button class="chip ${s.flag === f ? 'active' : ''}" data-cmd="setup:flag:${f}" style="font-size:17px">${f}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-title">👤 Sua origem</div>
        <div class="grid cols-3" id="setup-origins">
          ${Object.entries(ORIGINS).map(([k, o]) => `
            <button class="law ${s.origin === k ? 'active' : ''}" data-cmd="setup:origin:${k}" style="text-align:left">
              <div class="law-top">
                <span class="law-ico">${o.icon}</span>
                <div><div class="law-name">${esc(o.label)}</div><div class="law-desc">${esc(o.desc)}</div></div>
              </div>
            </button>`).join('')}
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-title">🎚️ Dificuldade</div>
        <div class="chips">
          ${Object.entries(DIFFICULTIES).map(([k, d]) => `
            <button class="chip ${s.difficulty === k ? 'active' : ''}" data-cmd="setup:difficulty:${k}">${d.icon} ${esc(d.label)}</button>`).join('')}
        </div>
        <p class="small muted mt-8">${esc(DIFFICULTIES[s.difficulty]?.desc || '')}</p>
      </div>

      <button class="btn primary" data-cmd="setup:start" style="margin-bottom:40px">Fundar ${esc(s.nationName || 'NationZero')} →</button>
    </div>`;
}

/* =================================================================== */
/* Shell do jogo                                                        */
/* =================================================================== */

function renderShell(app) {
  const st = app.state;
  const role = ROLES[st.role] || ROLES.cidadao;
  const regime = REGIMES[st.regime] || REGIMES.democracia;
  const fc = forecast(st);

  const screens = {
    overview: renderOverview,
    laws: renderLaws,
    actions: renderActions,
    power: renderPower,
    economy: renderEconomy,
    politics: renderPolitics,
    world: renderWorld,
    chronicle: renderChronicle,
    legacy: renderLegacy,
  };
  const content = (screens[app.tab] || renderOverview)(app);

  const navItems = TABS.map((t) => `
    <button class="nav-item ${app.tab === t.id ? 'active' : ''}" data-cmd="nav:${t.id}">
      <span class="ico">${t.icon}</span><span>${esc(t.label)}</span>
      ${t.id === 'actions' && st.pendingEvents.length ? '<span class="badge">!</span>' : ''}
    </button>`).join('');

  return `
    <div class="game">
      <aside class="side">
        <div class="side-brand">
          <span class="mark">🏛️</span>
          <span class="txt">NATION<span>ZERO</span></span>
        </div>
        ${navItems}
        <div class="side-foot">
          <div>${esc(st.meta.flag || '🏛️')} ${esc(st.meta.nationName)}</div>
          <div style="margin-top:4px">${esc(role.icon)} ${esc(role.label)} · ${esc(regime.icon)} ${esc(regime.label)}</div>
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
            <button class="btn tiny ghost" data-cmd="menu:settings" style="border:1px solid var(--line)">⚙️ Ajustes</button>
            <button class="btn tiny ghost" data-cmd="game:save" style="border:1px solid var(--line)">💾 Salvar</button>
          </div>
        </div>
      </aside>

      <header class="head">
        <div class="head-nation">
          <div class="head-flag">${esc(st.meta.flag || '🏛️')}</div>
          <div>
            <div class="head-name">${esc(st.meta.nationName)}</div>
            <div class="head-meta">
              <span>${esc(dateLabel(st))}</span>
              <span class="dim">·</span>
              <span>${esc(st.meta.leaderName)}</span>
            </div>
          </div>
        </div>
        <div class="head-spacer"></div>
        <div class="head-stats">
          <div class="hstat"><b>${money(st.stats.tesouro)}</b><span>Tesouro</span></div>
          <div class="hstat"><b style="color:${st.stats.aprovacao >= 50 ? 'var(--good)' : st.stats.aprovacao >= 30 ? 'var(--warn)' : 'var(--danger)'}">${Math.round(st.stats.aprovacao)}%</b><span>Aprovação</span></div>
          <div class="hstat"><b style="color:var(--accent-3)">${Math.round(st.stats.poder)}</b><span>Poder</span></div>
          <div class="hstat"><b style="color:#7fd8ff">${Math.round(st.stats.influencia)}</b><span>Influência</span></div>
        </div>
        <div class="flex gap-8 center" style="flex-wrap:wrap">
          ${rolePill(st)}
          ${regimePill(st)}
          ${fc.atWar ? '<span class="pill bad">⚔️ Em guerra</span>' : ''}
        </div>
      </header>

      <main class="main" id="screen-content">${content}</main>
    </div>

    <nav class="mobile-nav">
      ${TABS.filter((t) => t.mobile).map((t) => `
        <button class="${app.tab === t.id ? 'active' : ''}" data-cmd="nav:${t.id}">
          <span class="ico">${t.icon}</span><span>${esc(t.label)}</span>
        </button>`).join('')}
      <button class="${app.tab === 'chronicle' || app.tab === 'legacy' || app.tab === 'economy' ? 'active' : ''}" data-cmd="nav:chronicle">
        <span class="ico">📖</span><span>Crônica</span>
      </button>
    </nav>

    <button class="turn-btn" data-cmd="game:advance" title="Avançar um mês">
      ▶ Avançar mês <span class="kbd">␣</span>
    </button>`;
}

function renderGameOverScreen(app) {
  const st = app.state;
  const over = st?.over || { title: 'Fim', text: 'A história terminou.', icon: '🏁' };
  return `
    <div class="gameover">
      <div class="gameover-card">
        <div class="gameover-ico">${esc(over.icon || '🏁')}</div>
        <h1 class="gameover-title">${esc(over.title)}</h1>
        <p class="gameover-text">${esc(over.text)}</p>
        <div class="legacy-grid">
          <div class="legacy-item"><b>${st.legacy.daysInPower ? Math.floor(st.legacy.daysInPower / 365) : 0} anos</b><span>No poder</span></div>
          <div class="legacy-item"><b>${Object.keys(st.policies).length}</b><span>Leis em vigor</span></div>
          <div class="legacy-item"><b>${st.legacy.coups || 0}</b><span>Golpes</span></div>
          <div class="legacy-item"><b>${st.legacy.purges || 0}</b><span>Purgas</span></div>
          <div class="legacy-item"><b>${st.legacy.wars || 0}</b><span>Guerras</span></div>
          <div class="legacy-item"><b>${st.stats.arsenalNuclear}</b><span>Ogivas</span></div>
        </div>
        <div class="flex gap-10" style="flex-direction:column">
          <button class="btn primary" data-cmd="game:newgame">Fundar outra nação</button>
          <button class="btn ghost" data-cmd="menu:main">← Menu principal</button>
        </div>
      </div>
    </div>`;
}

/* =================================================================== */
/* Bindings de input não delegáveis                                     */
/* =================================================================== */

function bindShellInputs(app) {
  const st = app.state;
  if (!st) return;

  document.querySelectorAll('[data-slider]').forEach((input) => {
    input.addEventListener('input', () => {
      const [, kind, key] = input.dataset.slider.split(':');
      const val = Number(input.value);
      if (kind === 'tax') st.taxes[key] = val;
      else if (kind === 'spend') st.spending[key] = val;
      const out = input.parentElement.querySelector('.val');
      if (out) out.textContent = `${val}${key === 'tarifas' ? '%' : ''}`;
      const sum = input.closest('[data-budget-sum]');
      if (sum) {
        const id = sum.getAttribute('data-budget-sum');
        const el = document.getElementById(id);
        if (el) el.textContent = budgetSummaryText(st);
      }
    });
    input.addEventListener('change', () => { app.save(); app.render(); });
  });

  document.querySelectorAll('[data-ideo]').forEach((input) => {
    input.addEventListener('input', () => {
      st.ideology[input.dataset.ideo] = Number(input.value);
    });
    input.addEventListener('change', () => { app.save(); });
  });

  document.querySelectorAll('[data-field]').forEach((input) => {
    input.addEventListener('input', () => {
      const [obj, key] = input.dataset.field.split(':');
      if (obj === 'meta') st.meta[key] = input.value;
      else if (st[obj]) st[obj][key] = input.value;
    });
    input.addEventListener('change', () => app.save());
  });
}

export function budgetSummaryText(st) {
  const revenue = monthlyRevenue(st);
  const spending = monthlySpending(st);
  const bal = revenue - spending;
  return `${bal >= 0 ? '+' : '−'}N$ ${Math.abs(bal).toFixed(0)} bi/mês · receita ${revenue.toFixed(0)} · gasto ${spending.toFixed(0)}`;
}

/* =================================================================== */
/* Delegação de eventos                                                 */
/* =================================================================== */

function onDocumentClick(e) {
  const target = e.target.closest('[data-cmd]');
  if (target) {
    const cmd = target.getAttribute('data-cmd');
    if (cmd) {
      e.preventDefault();
      handleCommand(cmd, target, e);
      return;
    }
  }
  const backdrop = e.target.closest('[data-modal-backdrop]');
  if (backdrop && e.target === backdrop) closeModal();
  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) closeModal();
}

function handleCommand(cmd, el, event) {
  const parts = cmd.split(':');
  const ns = parts[0];
  const action = parts[1];
  const arg = parts.slice(2).join(':');
  const st = app.state;

  switch (ns) {
    case 'menu':
      if (action === 'new') { app.screen = 'setup'; app.render(); }
      if (action === 'continue') app.continueGame();
      if (action === 'help') showHelp(app);
      if (action === 'settings') showSettings(app);
      if (action === 'main') { app.screen = 'menu'; app.render(); }
      break;

    case 'setup':
      if (action === 'back') { app.screen = 'menu'; app.render(); }
      if (action === 'flag') { app.ui.setup.flag = arg; app.render(); }
      if (action === 'origin') { app.ui.setup.origin = arg; app.render(); }
      if (action === 'difficulty') { app.ui.setup.difficulty = arg; app.render(); }
      if (action === 'start') {
        app.ui.setup.nationName = document.getElementById('setup-nation')?.value || 'NationZero';
        app.ui.setup.capital = document.getElementById('setup-capital')?.value || 'Aurora';
        app.ui.setup.leaderName = document.getElementById('setup-leader')?.value || 'Você';
        app.ui.setup.motto = document.getElementById('setup-motto')?.value || 'Ordem, Pão e Futuro';
        app.newGame(app.ui.setup);
      }
      break;

    case 'nav':
      app.goto(action);
      break;

    case 'game':
      if (action === 'advance') { sfx('click'); app.advance(); }
      if (action === 'save') { app.save(false); }
      if (action === 'newgame') { clearSave(); app.screen = 'setup'; app.state = null; app.render(); }
      if (action === 'export') { download(`nationzero-${Date.now()}.json`, exportState(st)); }
      if (action === 'import') { document.getElementById('import-file')?.click(); }
      if (action === 'wipe') {
        if (confirm('Apagar o save atual? Isso não pode ser desfeito.')) {
          clearSave(); app.state = null; app.screen = 'menu'; app.render();
        }
      }
      break;

    default: {
      const fn = getCommand(ns);
      if (fn) fn(action, arg, el, event, app);
      break;
    }
  }
}

/* atalho de teclado */
document.addEventListener('keydown', (e) => {
  if (app.screen !== 'game') return;
  if (document.querySelector('.modal-backdrop')) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  if (e.code === 'Space' || e.key === 'Enter') {
    e.preventDefault();
    app.advance();
  }
});

/* util interno usado no header */
function money(v) {
  const neg = v < 0;
  return `${neg ? '−' : ''}N$ ${Math.abs(v).toFixed(0)}`;
}

app.init();

if (typeof window !== 'undefined') window.NZ = app;
