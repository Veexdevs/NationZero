/* Tela: Legado — estatísticas, conquistas e identidade nacional */

import { ROLES, REGIMES, isAuthoritarian, dateLabel } from '../../engine/state.js';
import { esc, money } from '../dom.js';
import { statCard } from '../parts.js';
import { registerCommands } from '../registry.js';
import { toast } from '../dom.js';
import { iconOf } from '../icons.js';

const ACHIEVEMENTS = [
  { id: 'primeiro_golpe', icon: 'zap', name: 'Primeiro Golpe', desc: 'Execute um golpe de Estado.', test: (s) => (s.legacy.coups || 0) >= 1 },
  { id: 'ditador', icon: 'crown', name: 'Mão de Ferro', desc: 'Torne-se ditador.', test: (s) => s.role === 'ditador' },
  { id: 'monarca', icon: 'crown', name: 'Coroado', desc: 'Restaure a monarquia e assuma o trono.', test: (s) => s.role === 'monarca' },
  { id: 'noite', icon: 'sword', name: 'Noite Longa', desc: 'Execute 5 purgas.', test: (s) => (s.legacy.purges || 0) >= 5 },
  { id: 'legislador', icon: 'scroll-text', name: 'Legislador', desc: 'Aprove 20 leis.', test: (s) => (s.legacy.lawsPassed || 0) >= 20 },
  { id: 'rico', icon: 'coins', name: 'Cofres Cheios', desc: 'Acumule N$ 1.000 bi no tesouro.', test: (s) => s.stats.tesouro >= 1000 },
  { id: 'pacificador', icon: 'feather', name: 'Pacificador', desc: 'Alcance reputação 80.', test: (s) => s.stats.reputacao >= 80 },
  { id: 'paria', icon: 'ban', name: 'Pária Global', desc: 'Chegue a 60 de sanções.', test: (s) => s.stats.sancoes >= 60 },
  { id: 'nuclear', icon: 'radiation', name: 'Clube Atômico', desc: 'Construa uma ogiva nuclear.', test: (s) => s.stats.arsenalNuclear >= 1 },
  { id: 'conquistador', icon: 'swords', name: 'Conquistador', desc: 'Vença 3 guerras.', test: (s) => (s.legacy.wars || 0) >= 3 },
  { id: 'amado', icon: 'heart', name: 'Amado pelo Povo', desc: 'Aprovação acima de 85%.', test: (s) => s.stats.aprovacao >= 85 },
  { id: 'temido', icon: 'frown', name: 'Temor Absoluto', desc: 'Chegue a 80 de medo.', test: (s) => s.stats.medo >= 80 },
  { id: 'democrata', icon: 'vote', name: 'Democrata', desc: 'Seja presidente, mantenha a democracia e aprovação 60%.', test: (s) => s.role === 'presidente' && s.regime === 'democracia' && s.stats.aprovacao >= 60 },
  { id: 'eterno', icon: 'hourglass', name: 'Eterno', desc: 'Fique 10 anos no poder.', test: (s) => (s.legacy.daysInPower || 0) >= 3650 },
  { id: 'revolucionario', icon: 'flag', name: 'Revolucionário', desc: 'Exporte a revolução com sucesso.', test: (s) => !!s.flags.exportou_revolucao },
];

export function renderLegacy(app) {
  const st = app.state;
  const d = app.ui.deltas || {};
  const years = ((st.legacy.daysInPower || 0) / 365).toFixed(1);
  const role = ROLES[st.role] || ROLES.cidadao;
  const regime = REGIMES[st.regime] || REGIMES.democracia;
  const unlocked = ACHIEVEMENTS.filter((a) => { try { return a.test(st); } catch { return false; } });

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${iconOf('trophy', 15)} Legado</h2>
        <p class="screen-sub">O que você construiu — e como será lembrado.</p>
      </div>
      <span class="pill power">${unlocked.length}/${ACHIEVEMENTS.length} conquistas</span>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="flex between center wrap gap-14">
        <div class="flex gap-14 center">
          <div class="head-flag" style="width:60px;height:60px">${iconOf(st.meta.flag || 'landmark', 30)}</div>
          <div>
            <div style="font-size:20px;font-weight:800">${esc(st.meta.nationName)}</div>
            <div class="small muted">${esc(st.meta.motto || '')}</div>
            <div class="tiny dim">Capital ${esc(st.meta.capital)} · ${esc(st.meta.origin || '')} · ${esc(dateLabel(st))}</div>
          </div>
        </div>
        <div class="flex gap-14 wrap">
          <div class="right"><div class="tiny muted">LÍDER</div><div style="font-weight:700">${esc(st.meta.leaderName)}</div></div>
          <div class="right"><div class="tiny muted">CARGO</div><div style="font-weight:700">${iconOf(role.icon, 15)} ${esc(role.label)}</div></div>
          <div class="right"><div class="tiny muted">REGIME</div><div style="font-weight:700">${iconOf(regime.icon, 15)} ${esc(regime.label)}</div></div>
        </div>
      </div>
    </div>

    <div class="grid cols-4">
      <div class="stat"><div class="lbl">${iconOf('hourglass', 15)} No poder</div><div class="val">${years} <small>anos</small></div></div>
      <div class="stat"><div class="lbl">${iconOf('scroll-text', 15)} Leis aprovadas</div><div class="val">${st.legacy.lawsPassed || 0}</div></div>
      <div class="stat"><div class="lbl">${iconOf('zap', 15)} Golpes</div><div class="val">${st.legacy.coups || 0}</div></div>
      <div class="stat"><div class="lbl">${iconOf('sword', 15)} Purgas</div><div class="val">${st.legacy.purges || 0}</div></div>
      <div class="stat"><div class="lbl">${iconOf('swords', 15)} Guerras</div><div class="val">${st.legacy.wars || 0}</div></div>
      <div class="stat"><div class="lbl">${iconOf('radiation', 15)} Ogivas</div><div class="val">${st.stats.arsenalNuclear}</div></div>
      <div class="stat"><div class="lbl">${iconOf('users', 15)} População</div><div class="val">${st.stats.populacao.toFixed(0)} <small>mi</small></div></div>
      <div class="stat"><div class="lbl">${iconOf('coins', 15)} Tesouro</div><div class="val">${money(st.stats.tesouro)}</div></div>
    </div>

    <div class="section-title">Conquistas</div>
    <div class="grid cols-3">
      ${ACHIEVEMENTS.map((a) => {
        const has = unlocked.includes(a);
        return `
          <div class="law" style="${has ? 'border-color:rgba(245,197,66,.4);background:rgba(245,197,66,.05)' : 'opacity:.55'}">
            <div class="law-top">
              <span class="law-ico">${iconOf(has ? a.icon : 'lock', 15)}</span>
              <div><div class="law-name">${esc(a.name)}</div><div class="law-desc">${esc(a.desc)}</div></div>
            </div>
          </div>`;
      }).join('')}
    </div>

    <div class="section-title">Dados completos</div>
    <div class="grid cols-4">
      ${['aprovacao', 'estabilidade', 'liberdades', 'repressao', 'corrupcao', 'criminalidade', 'saude', 'educacao', 'infraestrutura', 'tecnologia', 'meioAmbiente', 'poder'].map((k) => statCard(k, st.stats[k], d[k])).join('')}
    </div>

    <div class="card mt-14">
      <div class="card-title">${iconOf('pencil', 15)} Identidade nacional</div>
      <div class="grid cols-2">
        <div class="field">
          <label>Nome do país</label>
          <input class="input" data-field="meta:nationName" maxlength="28" value="${esc(st.meta.nationName)}" />
        </div>
        <div class="field">
          <label>Capital</label>
          <input class="input" data-field="meta:capital" maxlength="24" value="${esc(st.meta.capital)}" />
        </div>
        <div class="field">
          <label>Nome do líder</label>
          <input class="input" data-field="meta:leaderName" maxlength="24" value="${esc(st.meta.leaderName)}" />
        </div>
        <div class="field">
          <label>Lema</label>
          <input class="input" data-field="meta:motto" maxlength="40" value="${esc(st.meta.motto || '')}" />
        </div>
      </div>
      <div class="field">
        <label>Emblema</label>
        <div class="chips">
          ${['landmark','bird','wheat','cog','waves','flame','flame','star','tree-deciduous','shield','sun','paw-print','paw-print','zap','flower-2','mountain'].map((f) => `
            <button class="chip ${st.meta.flag === f ? 'active' : ''}" data-cmd="leg:flag:${f}">${iconOf(f, 16)}</button>`).join('')}
        </div>
      </div>
      <p class="tiny dim">As mudanças são salvas automaticamente. Renomear o país não engana ninguém — mas é divertido.</p>
    </div>

    <div class="card mt-14">
      <div class="card-title">${iconOf('save', 15)} Save</div>
      <p class="small muted" style="line-height:1.6;margin-bottom:12px">
        O progresso é salvo automaticamente no seu dispositivo. Exporte um arquivo para continuar em outro aparelho.
      </p>
      <div class="flex gap-8 wrap">
        <button class="btn small" data-cmd="game:export">${iconOf('arrow-down', 15)} Exportar save</button>
        <button class="btn small" data-cmd="menu:settings">${iconOf('cog', 15)} Ajustes</button>
        <button class="btn small danger" data-cmd="game:newgame">${iconOf('refresh-cw', 15)} Nova nação</button>
      </div>
    </div>
  `;
}

registerCommands({
  leg(action, arg, el, ev, app) {
    if (action === 'flag') {
      app.state.meta.flag = arg;
      app.save();
      app.render();
      return;
    }
    if (action === 'export') {
      app.save(false);
      toast('Save salvo localmente', 'good', 'save');
    }
  },
});
