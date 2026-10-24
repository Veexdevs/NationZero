/* Tela: Ações */

import { ACTION_CATEGORIES, ACTIONS } from '../../data/actions.js';
import { availableActions, actionCost, performAction } from '../../engine/politics.js';
import { esc } from '../dom.js';
import { emptyState } from '../parts.js';
import { registerCommands } from '../registry.js';
import { toast, sfx } from '../dom.js';
import { showPartyModal, showSpeechModal, showCoupModal, showPurgeModal, showTargetModal, showPlebisciteModal } from '../modals.js';

const DIALOG_HANDLERS = {
  party_create: (app) => showPartyModal(app, () => app.render()),
  speech: (app) => showSpeechModal(app),
  coup: (app, id) => showCoupModal(app, id),
  purge: (app) => showPurgeModal(app),
  target: (app, id) => showTargetModal(app, id),
  plebiscite: (app) => showPlebisciteModal(app),
};

export function renderActions(app) {
  const st = app.state;
  const cat = app.ui.actionCat;
  const items = availableActions(st).filter((a) => a.action.cat === cat);
  const ready = availableActions(st).filter((a) => a.allowed).length;

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">⚡ Ações</h2>
        <p class="screen-sub">O que você faz com o poder. Golpes, purgas, espionagem, guerra, discursos e articulação política.</p>
      </div>
      <span class="pill info">${ready} disponíveis agora</span>
    </div>

    <div class="subtabs">
      ${Object.entries(ACTION_CATEGORIES).map(([k, c]) => `
        <button class="chip ${cat === k ? 'active' : ''}" data-cmd="act:cat:${k}" title="${esc(c.desc)}">${c.icon} ${esc(c.label)}</button>`).join('')}
    </div>

    ${items.length ? `
      <div class="grid cols-2">
        ${items.map(({ action, cooldown, allowed, afford }) => renderActionCard(st, action, cooldown, allowed, afford)).join('')}
      </div>` : emptyState('🗂️', 'Nenhuma ação nesta categoria para o seu cargo atual.')}
  `;
}

function renderActionCard(st, action, cooldown, allowed, afford) {
  const cost = actionCost(st, action);
  const costParts = [];
  if (cost.influencia) costParts.push(`🤝 ${cost.influencia}`);
  if (cost.poder) costParts.push(`⚡ ${cost.poder}`);
  if (cost.tesouro) costParts.push(`💰 ${cost.tesouro}`);
  if (cost.lealdadeMilitarMin) costParts.push(`🪖 lealdade ≥ ${cost.lealdadeMilitarMin}`);

  const reason = !allowed
    ? (cooldown > 0 ? `Recarrega em ${cooldown} mês(es)` : 'Requisitos não atendidos')
    : (!afford.ok ? afford.reason : '');

  const danger = ['golpe', 'assassinar', 'purgar', 'prender_oposicao', 'declarar_guerra', 'executar'].some((k) => action.id.includes(k));

  return `
    <div class="law ${allowed && afford.ok ? '' : 'dim-card'}">
      <div class="law-top">
        <span class="law-ico">${action.icon}</span>
        <div style="flex:1;min-width:0">
          <div class="law-name">${esc(action.name)}</div>
          <div class="law-desc" style="margin-top:3px">${esc(action.desc)}</div>
        </div>
      </div>
      <div class="law-foot">
        ${costParts.length ? `<span class="law-cost">${costParts.join(' · ')}</span>` : ''}
        <div style="flex:1"></div>
        ${allowed && afford.ok
          ? `<button class="btn tiny ${danger ? 'danger' : 'primary'}" data-cmd="act:run:${action.id}">Executar</button>`
          : `<span class="tiny" style="color:var(--warn)">${esc(reason)}</span>`}
      </div>
    </div>`;
}

registerCommands({
  act(action, arg) {
    const app = window.NZ;
    const st = app.state;
    if (action === 'cat') { app.ui.actionCat = arg; sfx('click'); app.render(); return; }

    if (action === 'run') {
      const a = ACTIONS.find((x) => x.id === arg);
      if (!a) return;
      if (a.dialog) {
        const handler = DIALOG_HANDLERS[a.dialog];
        if (handler) { sfx('click'); handler(app, arg); }
        return;
      }
      const res = performAction(st, arg);
      if (!res.ok) { toast(res.reason, 'warn', '⚠️'); sfx('bad'); return; }
      sfx('good');
      toast(`${a.icon} ${a.name}`, 'good', a.icon);
      app.save();
      app.render();
      if (st.over) { app.screen = 'gameover'; app.render(); }
    }
  },
});
